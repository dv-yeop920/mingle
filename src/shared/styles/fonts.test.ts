import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '../../..');
const WEIGHTS = ['400', '700', '800', '900'] as const;
const MAX_CRITICAL_FONT_BYTES = 40 * 1024;

type FontManifest = {
  preload_weights: string[];
  tooling: {
    fonttools: string;
    brotli: string;
  };
  inputs: Record<
    (typeof WEIGHTS)[number],
    { path: string; sha256: string }
  >;
  outputs: Record<
    (typeof WEIGHTS)[number],
    { path: string; bytes: number; sha256: string }
  >;
  inventory: {
    source_allowlist: string;
    codepoints: string;
    count: number;
    sha256: string;
    unicode_range: string;
    platform_fallback_codepoints: string[];
  };
  full_cmaps: {
    is_common_across_weights: boolean;
    weights: Record<
      (typeof WEIGHTS)[number],
      {
        canonical: { count: number; sha256: string; unicode_range: string };
        residual: { count: number; sha256: string; unicode_range: string };
      }
    >;
  };
};

const readRootFile = (path: string) =>
  readFileSync(resolve(ROOT, path), 'utf8');

const convertFileToSha256 = (path: string) =>
  createHash('sha256').update(readFileSync(resolve(ROOT, path))).digest('hex');

const manifest = JSON.parse(
  readRootFile('scripts/fonts/home-critical-fonts.json'),
) as FontManifest;

describe('Gothic A1 critical font contract', () => {
  it('고정 UI source allowlist와 codepoint inventory를 canonical하게 유지한다', () => {
    const sourcePaths = readRootFile(manifest.inventory.source_allowlist)
      .split('\n')
      .filter(Boolean);
    const codepointLines = readRootFile(manifest.inventory.codepoints)
      .split('\n')
      .filter(Boolean);
    const supported = new Set(codepointLines.map((value) => Number.parseInt(value, 16)));
    const platformFallback = new Set(
      manifest.inventory.platform_fallback_codepoints.map((value) =>
        Number.parseInt(value.slice(2), 16),
      ),
    );
    const inventory = new Set([...supported, ...platformFallback]);
    const sourceCodepoints = new Set<number>(
      Array.from({ length: 0x7f - 0x20 }, (_, index) => index + 0x20),
    );

    for (const sourcePath of sourcePaths) {
      expect(existsSync(resolve(ROOT, sourcePath))).toBe(true);
      for (const character of readRootFile(sourcePath)) {
        if (character.codePointAt(0)! >= 0x80) {
          sourceCodepoints.add(character.codePointAt(0)!);
        }
      }
    }

    expect(sourcePaths).toEqual([...new Set(sourcePaths)].sort());
    expect(codepointLines).toEqual([...new Set(codepointLines)].sort());
    expect(codepointLines).toHaveLength(manifest.inventory.count);
    expect(convertFileToSha256(manifest.inventory.codepoints)).toBe(
      manifest.inventory.sha256,
    );
    expect([...sourceCodepoints].sort((a, b) => a - b)).toEqual(
      [...inventory].sort((a, b) => a - b),
    );
  });

  it('네 weight의 input과 immutable v2 output checksum 및 크기를 고정한다', () => {
    for (const weight of WEIGHTS) {
      const input = manifest.inputs[weight];
      const output = manifest.outputs[weight];

      expect(convertFileToSha256(input.path)).toBe(input.sha256);
      expect(output.path).toBe(
        `public/fonts/v2/gothic-a1-critical-${weight}.woff2`,
      );
      expect(existsSync(resolve(ROOT, output.path))).toBe(true);
      expect(statSync(resolve(ROOT, output.path)).size).toBe(output.bytes);
      expect(output.bytes).toBeLessThanOrEqual(MAX_CRITICAL_FONT_BYTES);
      expect(convertFileToSha256(output.path)).toBe(output.sha256);
    }
  });

  it('CSS의 critical face와 full fallback stack을 weight별로 연결한다', () => {
    const css = readRootFile('src/shared/styles/fonts.css');
    const criticalFaces = css.match(
      /@font-face\s*{[^}]*font-family:\s*["']Gothic A1 Critical["'];[^}]*}/g,
    );

    expect(criticalFaces).toHaveLength(WEIGHTS.length);
    for (const [index, weight] of WEIGHTS.entries()) {
      const face = criticalFaces![index];
      const fullFace = css.match(
        new RegExp(
          `@font-face\\s*{[^}]*font-family:\\s*["']Gothic A1["'];[^}]*font-weight:\\s*${weight};[^}]*}`,
        ),
      )?.[0];

      expect(face).toContain(`font-weight: ${weight};`);
      expect(face).toContain('font-display: optional;');
      expect(face).toContain(
        `/fonts/v2/gothic-a1-critical-${weight}.woff2`,
      );
      expect(face.replace(/\s+/g, ' ')).toContain(
        `unicode-range: ${manifest.inventory.unicode_range};`,
      );
      expect(css).toContain(`/fonts/v1/gothic-a1-${weight}.woff2`);
      expect(fullFace).toBeDefined();
      expect(fullFace!.replace(/\s+/g, ' ')).toContain(
        `unicode-range: ${manifest.full_cmaps.weights[weight].residual.unicode_range};`,
      );
      expect(manifest.full_cmaps.weights[weight].residual.count).toBe(
        manifest.full_cmaps.weights[weight].canonical.count -
          manifest.inventory.count,
      );
    }

    expect(css.replace(/\s+/g, ' ')).toContain(
      '--font-gothic-a1: "Gothic A1 Critical", "Gothic A1", "Gothic A1 Fallback", system-ui, sans-serif;',
    );
  });

  it('critical preload와 cache 및 production CSS inline 계약을 유지한다', () => {
    const layout = readRootFile('src/app/layout.tsx');
    const nextConfig = readRootFile('next.config.ts');
    const preloadUrls = [
      ...layout.matchAll(
        /<link\s+rel="preload"\s+href="([^"]+)"\s+as="font"/g,
      ),
    ].map((match) => match[1]);

    expect(preloadUrls).toEqual([
      '/fonts/v2/gothic-a1-critical-700.woff2',
      '/fonts/v2/gothic-a1-critical-800.woff2',
      '/fonts/v2/gothic-a1-critical-900.woff2',
    ]);
    expect(manifest.preload_weights).toEqual(['700', '800', '900']);
    expect(layout).not.toContain('href="/fonts/v1/gothic-a1-');
    expect(nextConfig).toContain("source: '/fonts/v2/:path*'");
    expect(nextConfig).toContain(
      "value: 'public, max-age=31536000, immutable'",
    );
    expect(nextConfig).toContain('inlineCss: true');
  });

  it('결정적 재생성을 위한 pinned tooling과 subset option을 고정한다', () => {
    const generator = readRootFile('scripts/generate-home-critical-fonts.py');

    expect(manifest.tooling).toEqual({
      fonttools: '4.59.2',
      brotli: '1.1.0',
    });
    expect(readRootFile('scripts/fonts/requirements.txt')).toBe(
      'fonttools==4.59.2\nbrotli==1.1.0\n',
    );
    expect(generator).toContain('options.canonical_order = True');
    expect(generator).toContain('options.recalc_timestamp = False');
    expect(generator).toContain(
      'if first[weight]["sha256"] != second[weight]["sha256"]:',
    );
    expect(generator).toContain(
      'if generated[weight]["sha256"] != manifest["outputs"][weight]["sha256"]:',
    );
  });

  it('Gothic A1 OFL 라이선스를 함께 보존한다', () => {
    const license = readRootFile('public/fonts/OFL-Gothic-A1.txt');

    expect(license).toContain('SIL OPEN FONT LICENSE Version 1.1');
  });
});
