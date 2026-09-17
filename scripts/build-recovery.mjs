import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';

const { ANTHROPIC_API_KEY, GITHUB_OUTPUT, COMMIT_SHA } = process.env;

const SYSTEM_PROMPT = `You are an automated build error recovery agent for the MIXTI web application (Next.js 16 / React 19 / Tailwind CSS v4).

Analyze the Vercel build error and generate a minimal fix.

RULES:
1. Fix ONLY the build error. Do not refactor or change unrelated code.
2. For npm install errors: modify package.json only. NEVER output package-lock.json.
3. For TypeScript errors: fix only the file(s) mentioned in the error.
4. For transient errors (npm registry down, network timeout): set isFixable to false.
5. For infrastructure errors (missing env vars, server config): set isFixable to false.
6. Output the COMPLETE file content for each file you modify.
7. Keep changes minimal — remove or fix the problematic part only.

Respond ONLY with valid JSON:
{
  "isFixable": boolean,
  "category": "dependency" | "typescript" | "build" | "lint" | "transient" | "infrastructure",
  "explanation": string,
  "fix": {
    "files": [{ "path": string, "content": string }],
    "description": string
  } | null
}`;

const output = (key, value) => {
  if (GITHUB_OUTPUT) {
    appendFileSync(GITHUB_OUTPUT, `${key}=${value}\n`);
  }
};

const main = async () => {
  if (!ANTHROPIC_API_KEY) {
    console.log('Missing ANTHROPIC_API_KEY');
    output('hasFix', 'false');
    return;
  }

  const buildErrors = existsSync('build-errors.txt')
    ? readFileSync('build-errors.txt', 'utf8').trim()
    : '';

  if (!buildErrors) {
    console.log('No build errors found');
    output('hasFix', 'false');
    return;
  }

  const configPaths = [
    'package.json',
    'tsconfig.json',
    'next.config.ts',
    'next.config.mjs',
    'next.config.js',
  ];
  const projectFiles = configPaths
    .filter((f) => existsSync(f))
    .map((f) => ({ path: f, content: readFileSync(f, 'utf8') }));

  const srcPathMatches = buildErrors.matchAll(
    /(?:^|\s)(src\/[^\s:()]+\.(?:tsx?|jsx?|mjs))/gm,
  );
  const errorFilePaths = [...new Set([...srcPathMatches].map((m) => m[1]))];

  for (const filePath of errorFilePaths.slice(0, 10)) {
    if (existsSync(filePath) && !projectFiles.some((f) => f.path === filePath)) {
      try {
        const content = readFileSync(filePath, 'utf8');
        projectFiles.push({ path: filePath, content: content.slice(0, 5000) });
      } catch {
        // skip unreadable files
      }
    }
  }

  const userPrompt = [
    '## Build Error Logs',
    '```',
    buildErrors.slice(0, 8000),
    '```',
    '',
    '## Project Files',
    ...projectFiles.map(
      (f) => `### ${f.path}\n\`\`\`\n${f.content.slice(0, 5000)}\n\`\`\``,
    ),
  ].join('\n');

  console.log(
    `Analyzing build error with ${projectFiles.length} project files...`,
  );

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    console.log(`Claude API error: ${response.status} ${response.statusText}`);
    output('hasFix', 'false');
    return;
  }

  const data = await response.json();
  const text =
    data.content
      ?.filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('') || '';

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.log('Failed to parse AI response');
    output('hasFix', 'false');
    return;
  }

  let result;
  try {
    result = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.log(`JSON parse error: ${e.message}`);
    output('hasFix', 'false');
    return;
  }

  console.log(`Category: ${result.category}`);
  console.log(`Fixable: ${result.isFixable}`);
  console.log(`Explanation: ${result.explanation}`);

  if (!result.isFixable || !result.fix?.files?.length) {
    console.log('Build error is not auto-fixable');
    output('hasFix', 'false');
    return;
  }

  for (const file of result.fix.files) {
    if (file.path === 'package-lock.json') continue;
    writeFileSync(file.path, file.content);
    console.log(`Written: ${file.path}`);
  }

  writeFileSync(
    '.auto-recovery-meta.json',
    JSON.stringify(
      {
        fingerprint: `build-${COMMIT_SHA?.slice(0, 12) || Date.now()}`,
        baseSha: COMMIT_SHA || 'unknown',
        incidentCategory: 'build',
        incidentPaths: result.fix.files.map((f) => f.path),
        fixDescription: result.fix.description,
        buildErrorCategory: result.category,
      },
      null,
      2,
    ),
  );

  const description = result.fix.description.replace(/[\r\n]/g, ' ').slice(0, 72);
  output('hasFix', 'true');
  output('description', description);
  console.log(`Fix ready: ${description}`);
};

main().catch((err) => {
  console.error('Build recovery failed:', err);
  if (GITHUB_OUTPUT) {
    appendFileSync(GITHUB_OUTPUT, 'hasFix=false\n');
  }
  process.exit(1);
});
