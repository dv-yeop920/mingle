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
import { checkScope } from './scope-checker';
import { getRuntimeErrors } from './vercel-api';

const SYSTEM_PROMPT = `You are an automated error recovery agent for the MIXTI web application (Next.js 16 / React 19 / Tailwind CSS v4 / Supabase).

Your task: analyze a runtime error and determine if you can fix it.

Rules:
- Only fix code bugs. Do not fix expected behavior, external service failures, or infrastructure issues.
- Make minimal changes. Do not refactor surrounding code.
- Do not touch: database migrations, environment variables, authentication logic, payment logic, or security-critical code.
- changeScope classification:
  - "protected": ONLY for files under src/shared/lib/supabase/, src/features/auth/, or supabase/migrations/
  - "general-code": ALL other application code including API routes, pages, components, utilities, and any src/app/ routes
  - "unknown": only when you truly cannot determine what the code does
  - IMPORTANT: src/app/api/ routes (including auto-recovery, health-check, etc.) are general application code, NOT protected infrastructure
- If you cannot determine the root cause, set isReproducible to false.

Use the submit_fix tool to return your analysis and fix.`;

const FIX_TOOL: Anthropic.Tool = {
  name: 'submit_fix',
  description: 'Submit the error analysis and optional code fix',
  input_schema: {
    type: 'object' as const,
    required: ['analysis'],
    properties: {
      analysis: {
        type: 'object',
        required: [
          'isExpected',
          'isExternalFailure',
          'isReproducible',
          'isNormalBehaviorKnown',
          'changeScope',
          'explanation',
        ],
        properties: {
          isExpected: { type: 'boolean' },
          isExternalFailure: { type: 'boolean' },
          isReproducible: { type: 'boolean' },
          isNormalBehaviorKnown: { type: 'boolean' },
          changeScope: { type: 'string', enum: ['general-code', 'protected', 'unknown'] },
          explanation: { type: 'string' },
        },
      },
      fix: {
        type: 'object',
        required: ['files', 'description'],
        properties: {
          files: {
            type: 'array',
            items: {
              type: 'object',
              required: ['path', 'content'],
              properties: {
                path: { type: 'string' },
                content: { type: 'string' },
              },
            },
          },
          description: { type: 'string' },
        },
      },
    },
  },
};

const parseStackPaths = (errors: RuntimeError[]): string[] => {
  const paths = new Set<string>();
  for (const error of errors) {
    const combined = `${error.stack}\n${error.message}`;
    const srcMatches = combined.matchAll(
      /(?:at\s+.+?\s+\(|at\s+)(?:\/[^)]+\/)?src\/([^:)]+)/g,
    );
    for (const match of srcMatches) {
      paths.add(`src/${match[1]}`);
    }
    const nextMatches = combined.matchAll(
      /\.next\/server\/app\/([^:)\s]+)/g,
    );
    for (const match of nextMatches) {
      const filePath = `src/app/${match[1]}`.replace(/\.js$/, '.ts');
      paths.add(filePath);
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


const executeFix = async (
  incident: Incident,
  eligibilityContext: {
    attemptCount: number;
    isConcurrentRepairActive: boolean;
    isPreviousProductionRepairFailed: boolean;
  },
  config: FixExecutorConfig,
  injectedErrors?: RuntimeError[],
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

  let errors: RuntimeError[] = injectedErrors ?? [];
  if (errors.length === 0 && config.vercelToken && config.vercelProjectId) {
    try {
      errors = await getRuntimeErrors(
        config.vercelToken,
        config.vercelProjectId,
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
      model: 'claude-sonnet-5',
      max_tokens: config.maxTokens,
      system: SYSTEM_PROMPT,
      tools: [FIX_TOOL],
      tool_choice: { type: 'tool', name: 'submit_fix' },
      messages: [{ role: 'user', content: prompt }],
    });

    const toolBlock = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    );

    if (!toolBlock) {
      return stopped('no-tool-use-in-response');
    }

    const input = toolBlock.input as Record<string, unknown>;
    const analysis = input.analysis as FixResult['analysis'] | undefined;
    if (!analysis || typeof analysis.isExpected !== 'boolean') {
      return stopped('invalid-tool-input');
    }

    fixResult = {
      analysis,
      fix: (input.fix as FixResult['fix']) ?? null,
    };
  } catch {
    return stopped('ai-api-error');
  }

  const incidentFiles = [...sourceFiles.keys()].map((f) => ({
    filename: f,
    status: 'modified',
  }));
  const scopeResult = checkScope(incidentFiles);
  const resolvedScope =
    fixResult.analysis.changeScope !== 'general-code' && scopeResult.isPassed
      ? 'general-code'
      : fixResult.analysis.changeScope;

  const isFrequentError = incident.occurrence_count >= 3;
  const resolvedReproducible =
    fixResult.analysis.isReproducible || isFrequentError;
  const resolvedNormalBehavior =
    fixResult.analysis.isNormalBehaviorKnown ||
    (isFrequentError && (sourceFiles.size > 0 || fixResult.fix !== null));

  const eligibility: RecoveryEligibility = {
    isExpected: fixResult.analysis.isExpected,
    isExternalFailure: fixResult.analysis.isExternalFailure,
    isReproducible: resolvedReproducible,
    isNormalBehaviorKnown: resolvedNormalBehavior,
    changeScope: resolvedScope,
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return stopped(`branch-creation-failed: ${msg.slice(0, 200)}`);
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return stopped(`commit-failed: ${msg.slice(0, 200)}`);
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
