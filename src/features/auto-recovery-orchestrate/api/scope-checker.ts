const PROTECTED_PATHS = [
  'src/shared/lib/supabase/',
  'src/features/auth/',
  'supabase/migrations/',
];

const CONFIG_FILES = [
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'next.config',
  'tailwind.config',
  'postcss.config',
  'eslint.config',
  'vitest.config',
];

const META_FILE = '.auto-recovery-meta.json';

type ScopeCheckResult = {
  isPassed: boolean;
  violations: string[];
  changedFiles: string[];
};

const checkScope = (
  files: { filename: string; status: string }[],
): ScopeCheckResult => {
  const violations: string[] = [];
  const changedFiles = files.map((f) => f.filename);

  for (const file of files) {
    const { filename } = file;

    if (filename === META_FILE) continue;

    if (!filename.startsWith('src/')) {
      violations.push(`outside-src: ${filename}`);
      continue;
    }

    const isProtected = PROTECTED_PATHS.some((p) => filename.startsWith(p));
    if (isProtected) {
      violations.push(`protected-path: ${filename}`);
      continue;
    }

    const isConfig = CONFIG_FILES.some(
      (c) => filename === c || filename.includes(`${c}.`),
    );
    if (isConfig) {
      violations.push(`config-file: ${filename}`);
    }
  }

  return {
    isPassed: violations.length === 0,
    violations,
    changedFiles,
  };
};

export { checkScope, type ScopeCheckResult };
