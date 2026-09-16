import Anthropic from '@anthropic-ai/sdk';

import {
  evaluateRecoveryEligibility,
  type RecoveryEligibility,
} from '@/shared/lib/auto-recovery';

import type {
  FixExecutorConfig,
  FixExecutorResult,
  FixResult,
  Incident,
  RuntimeError,
} from '../model/types';

import { createGitHubClient } from './github';
import { getRuntimeErrors } from './vercel-api';

const SYSTEM_PROMPT = `You are an automated error recovery agent for the MIXTI web application (Next.js 16 / React 19 / Tailwind CSS v4 / Supabase).

Your task: analyze a runtime error and determine if you can fix it.

Rules:
- Only fix code bugs. Do not fix expected behavior, external service failures, or infrastructure issues.
- Make minimal changes. Do not refactor surrounding code.
- Do not touch: database migrations, environment variables, authentication logic, payment logic, or security-critical code.
- If the error is in a protected area (auth, payments, DB schema), set changeScope to "protected".
- If you cannot determine the root cause, set isReproducible to false.
- Return your analysis AND the fix (if any) as valid JSON.

Respond ONLY with a JSON object matching this schema:
{
  "analysis": {
    "isExpected": boolean,
    "isExternalFailure": boolean,
    "isReproducible": boolean,
    "isNormalBehaviorKnown": boolean,
    "changeScope": "general-code" | "protected" | "unknown",
    "explanation": string
  },
  "fix": {
    "files": [{ "path": string, "content": string }],
    "description": string
  } | null
}`;

const parseStackPaths = (errors: RuntimeError[]): string[] => {
  const paths = new Set<string>();
  for (const error of errors) {
    const matches = error.stack.matchAll(
      /(?:at\s+.+?\s+\(|at\s+)(?:\/[^)]+\/)?src\/([^:)]+)/g,
    );
    for (const match of matches) {
      paths.add(`src/${match[1]}`);
    }
    if (error.path) {
      const routePath = error.path.replace(/^\//, '');
      if (routePath.startsWith('api/')) {
        paths.add(`src/app/${routePath}/route.ts`);
      }
    }
  }
  return [...paths].slice(0, 15);
};

const buildPrompt = (
  incident: Incident,
  errors: RuntimeError[],
  sourceFiles: Map<string, string>,
): string => {
  const parts: string[] = [
    `## Incident`,
    `- Fingerprint: ${incident.fingerprint}`,
    `- Category: ${incident.category}`,
    `- Project: ${incident.project_id}`,
    `- Environment: ${incident.environment}`,
    `- Occurrences: ${incident.occurrence_count}`,
    `- First seen: ${incident.first_seen_at}`,
    `- Last seen: ${incident.last_seen_at}`,
  ];

  if (errors.length > 0) {
    parts.push('\n## Runtime Errors');
    for (const error of errors.slice(0, 5)) {
      parts.push(`\n### Error (${error.count}x, path: ${error.path})`);
      parts.push(`Message: ${error.message}`);
      if (error.stack) {
        parts.push(`Stack:\n\`\`\`\n${error.stack.slice(0, 2000)}\n\`\`\``);
      }
    }
  } else {
    parts.push(
      '\n## Note\nNo detailed error info available. Only metadata: category and occurrence count.',
    );
  }

  if (sourceFiles.size > 0) {
    parts.push('\n## Source Files');
    for (const [path, content] of sourceFiles) {
      parts.push(`\n### ${path}\n\`\`\`typescript\n${content}\n\`\`\``);
    }
  }

  return parts.join('\n');
};

const parseFixResult = (text: string): FixResult | null => {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as FixResult;
    if (!parsed.analysis || typeof parsed.analysis.isExpected !== 'boolean')
      return null;
    return parsed;
  } catch {
    return null;
  }
};

const executeFix = async (
  incident: Incident,
  eligibilityContext: {
    attemptCount: number;
    isConcurrentRepairActive: boolean;
    isPreviousProductionRepairFailed: boolean;
  },
  config: FixExecutorConfig,
): Promise<FixExecutorResult> => {
  const stopped = (reason: string): FixExecutorResult => ({
    decision: { action: 'stop', reason },
    result: {
      analysis: {
        isExpected: false,
        isExternalFailure: false,
        isReproducible: false,
        isNormalBehaviorKnown: false,
        changeScope: 'unknown',
        explanation: reason,
      },
      fix: null,
    },
    branchName: null,
    baseSha: null,
    candidateSha: null,
  });

  let errors: RuntimeError[] = [];
  if (config.vercelToken && config.vercelProjectId) {
    try {
      errors = await getRuntimeErrors(
        config.vercelToken,
        config.vercelProjectId,
        incident.project_id,
      );
    } catch {
      // Vercel API unavailable — proceed with metadata only
    }
  }

  const github = createGitHubClient({
    token: config.githubToken,
    owner: config.githubOwner,
    repo: config.githubRepo,
  });

  let defaultBranch: { branch: string; sha: string };
  try {
    defaultBranch = await github.getDefaultBranch();
  } catch {
    return stopped('github-unreachable');
  }

  const filePaths = parseStackPaths(errors);
  const sourceFiles = new Map<string, string>();

  if (filePaths.length > 0) {
    const reads = await Promise.all(
      filePaths.map(async (path) => {
        const content = await github.readFile(path, defaultBranch.sha);
        return content ? ([path, content] as const) : null;
      }),
    );
    for (const read of reads) {
      if (read) sourceFiles.set(read[0], read[1]);
    }
  }

  if (sourceFiles.size === 0 && errors.length > 0) {
    const searchTerms = errors[0].message.split(/[\s:()]+/).slice(0, 3);
    const searchPaths = await github.searchCode(searchTerms.join(' '));
    const fallbackReads = await Promise.all(
      searchPaths.slice(0, 5).map(async (path) => {
        const content = await github.readFile(path, defaultBranch.sha);
        return content ? ([path, content] as const) : null;
      }),
    );
    for (const read of fallbackReads) {
      if (read) sourceFiles.set(read[0], read[1]);
    }
  }

  const prompt = buildPrompt(incident, errors, sourceFiles);

  const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });
  let fixResult: FixResult;
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: config.maxTokens,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    const parsed = parseFixResult(text);
    if (!parsed) return stopped('unparseable-ai-response');
    fixResult = parsed;
  } catch {
    return stopped('ai-api-error');
  }

  const eligibility: RecoveryEligibility = {
    isExpected: fixResult.analysis.isExpected,
    isExternalFailure: fixResult.analysis.isExternalFailure,
    isReproducible: fixResult.analysis.isReproducible,
    isNormalBehaviorKnown: fixResult.analysis.isNormalBehaviorKnown,
    changeScope: fixResult.analysis.changeScope,
    attemptCount: eligibilityContext.attemptCount,
    isConcurrentRepairActive: eligibilityContext.isConcurrentRepairActive,
    isPreviousProductionRepairFailed:
      eligibilityContext.isPreviousProductionRepairFailed,
  };
  const decision = evaluateRecoveryEligibility(eligibility);

  if (decision.action !== 'repair') {
    return {
      decision,
      result: fixResult,
      branchName: null,
      baseSha: defaultBranch.sha,
      candidateSha: null,
    };
  }

  if (!fixResult.fix || fixResult.fix.files.length === 0) {
    return stopped('no-fix-generated');
  }

  const branchName = `fix/agent-${incident.fingerprint.slice(0, 12)}`;

  try {
    await github.createBranch(branchName, defaultBranch.sha);
  } catch {
    return stopped('branch-creation-failed');
  }

  const metaFile = {
    path: '.auto-recovery-meta.json',
    content: JSON.stringify(
      {
        fingerprint: incident.fingerprint,
        baseSha: defaultBranch.sha,
        incidentCategory: incident.category,
        incidentPaths: [...sourceFiles.keys()],
        fixDescription: fixResult.fix.description,
      },
      null,
      2,
    ),
  };

  let candidateSha: string;
  try {
    candidateSha = await github.commitFiles(
      branchName,
      [...fixResult.fix.files, metaFile],
      `fix(auto-recovery): ${fixResult.fix.description.slice(0, 72)}`,
    );
  } catch {
    return stopped('commit-failed');
  }

  return {
    decision,
    result: fixResult,
    branchName,
    baseSha: defaultBranch.sha,
    candidateSha,
  };
};

export { executeFix };
