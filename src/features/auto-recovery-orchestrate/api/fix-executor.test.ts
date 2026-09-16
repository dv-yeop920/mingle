// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = { create: mockCreate };
  }
  return { default: MockAnthropic };
});

const mockGetDefaultBranch = vi.fn();
const mockReadFile = vi.fn();
const mockSearchCode = vi.fn();
const mockCreateBranch = vi.fn();
const mockCommitFiles = vi.fn();
vi.mock('./github', () => ({
  createGitHubClient: vi.fn(() => ({
    getDefaultBranch: mockGetDefaultBranch,
    readFile: mockReadFile,
    readDirectory: vi.fn().mockResolvedValue([]),
    searchCode: mockSearchCode,
    createBranch: mockCreateBranch,
    commitFiles: mockCommitFiles,
  })),
}));

vi.mock('./vercel-api', () => ({
  getRuntimeErrors: vi.fn().mockResolvedValue([]),
}));

import { executeFix } from './fix-executor';

afterEach(() => {
  vi.clearAllMocks();
});

const INCIDENT = {
  fingerprint: 'abc123def456',
  category: 'server',
  project_id: 'prj_1',
  environment: 'production',
  first_seen_at: '2026-09-14T00:00:00Z',
  last_seen_at: '2026-09-14T01:00:00Z',
  occurrence_count: 5,
  attempt_count: 0,
  status: 'repairing',
  locked_by: 'worker-1',
  locked_at: '2026-09-14T01:00:00Z',
};

const CONFIG = {
  anthropicApiKey: 'test-key',
  githubToken: 'test-token',
  githubOwner: 'test-owner',
  githubRepo: 'test-repo',
  maxTokens: 4096,
};

const ELIGIBILITY_CONTEXT = {
  attemptCount: 0,
  isConcurrentRepairActive: false,
  isPreviousProductionRepairFailed: false,
};

describe('Fix Executor', () => {
  it('GitHub 연결 실패 시 stop을 반환한다', async () => {
    mockGetDefaultBranch.mockRejectedValue(new Error('network'));
    const result = await executeFix(INCIDENT, ELIGIBILITY_CONTEXT, CONFIG);
    expect(result.decision.action).toBe('stop');
    expect(result.decision.reason).toBe('github-unreachable');
  });

  it('AI가 파싱 불가능한 응답을 반환하면 stop을 반환한다', async () => {
    mockGetDefaultBranch.mockResolvedValue({ branch: 'main', sha: 'abc' });
    mockSearchCode.mockResolvedValue([]);
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'This is not JSON' }],
    });

    const result = await executeFix(INCIDENT, ELIGIBILITY_CONTEXT, CONFIG);
    expect(result.decision.action).toBe('stop');
    expect(result.decision.reason).toBe('unparseable-ai-response');
  });

  it('AI가 expected 에러로 분석하면 repair하지 않는다', async () => {
    mockGetDefaultBranch.mockResolvedValue({ branch: 'main', sha: 'abc' });
    mockSearchCode.mockResolvedValue([]);
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            analysis: {
              isExpected: true,
              isExternalFailure: false,
              isReproducible: true,
              isNormalBehaviorKnown: true,
              changeScope: 'general-code',
              explanation: 'This is expected behavior',
            },
            fix: null,
          }),
        },
      ],
    });

    const result = await executeFix(INCIDENT, ELIGIBILITY_CONTEXT, CONFIG);
    expect(result.decision.action).toBe('ignore');
  });

  it('적격한 수정이 있으면 브랜치를 생성하고 커밋한다', async () => {
    mockGetDefaultBranch.mockResolvedValue({
      branch: 'main',
      sha: 'a'.repeat(40),
    });
    mockSearchCode.mockResolvedValue([]);
    mockCreateBranch.mockResolvedValue(undefined);
    mockCommitFiles.mockResolvedValue('b'.repeat(40));
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            analysis: {
              isExpected: false,
              isExternalFailure: false,
              isReproducible: true,
              isNormalBehaviorKnown: true,
              changeScope: 'general-code',
              explanation: 'Null check missing',
            },
            fix: {
              files: [{ path: 'src/test.ts', content: 'fixed code' }],
              description: 'Add null check',
            },
          }),
        },
      ],
    });

    const result = await executeFix(INCIDENT, ELIGIBILITY_CONTEXT, CONFIG);
    expect(result.decision.action).toBe('repair');
    expect(result.branchName).toBe('fix/agent-abc123def456');
    expect(result.candidateSha).toBe('b'.repeat(40));
    expect(mockCreateBranch).toHaveBeenCalledWith(
      'fix/agent-abc123def456',
      'a'.repeat(40),
    );
    const committedFiles = mockCommitFiles.mock.calls[0][1];
    const metaFile = committedFiles.find(
      (f: { path: string }) => f.path === '.auto-recovery-meta.json',
    );
    expect(metaFile).toBeDefined();
    const meta = JSON.parse(metaFile.content);
    expect(meta.fingerprint).toBe('abc123def456');
    expect(meta.baseSha).toBe('a'.repeat(40));
  });

  it('AI API 에러 시 stop을 반환한다', async () => {
    mockGetDefaultBranch.mockResolvedValue({ branch: 'main', sha: 'abc' });
    mockSearchCode.mockResolvedValue([]);
    mockCreate.mockRejectedValue(new Error('API error'));

    const result = await executeFix(INCIDENT, ELIGIBILITY_CONTEXT, CONFIG);
    expect(result.decision.action).toBe('stop');
    expect(result.decision.reason).toBe('ai-api-error');
  });
});
