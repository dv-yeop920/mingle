// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

const mockGet = vi.fn().mockResolvedValue({
  data: { default_branch: 'main' },
});
const mockGetContent = vi.fn().mockResolvedValue({
  data: {
    content: Buffer.from('console.log("hello")').toString('base64'),
    encoding: 'base64',
  },
});
const mockGetRef = vi.fn().mockResolvedValue({
  data: { object: { sha: 'abc123' } },
});
const mockCreateRef = vi.fn().mockResolvedValue({});
const mockGetCommit = vi.fn().mockResolvedValue({
  data: { tree: { sha: 'tree123' } },
});
const mockCreateBlob = vi.fn().mockResolvedValue({
  data: { sha: 'blob123' },
});
const mockCreateTree = vi.fn().mockResolvedValue({
  data: { sha: 'newtree123' },
});
const mockCreateCommit = vi.fn().mockResolvedValue({
  data: { sha: 'newcommit123' },
});
const mockUpdateRef = vi.fn().mockResolvedValue({});
const mockSearchCode = vi.fn().mockResolvedValue({
  data: { items: [{ path: 'src/app/api/test/route.ts' }] },
});

const mockListForRef = vi.fn().mockResolvedValue({
  data: {
    check_runs: [
      { name: 'lint', status: 'completed', conclusion: 'success' },
    ],
  },
});
const mockCompareCommits = vi.fn().mockResolvedValue({
  data: {
    files: [{ filename: 'src/test.ts', status: 'modified' }],
  },
});
const mockPullsCreate = vi.fn().mockResolvedValue({
  data: { number: 1, html_url: 'https://github.com/test/test/pull/1' },
});
const mockPullsMerge = vi.fn().mockResolvedValue({
  data: { sha: 'mergesha123', merged: true },
});
const mockDeleteRef = vi.fn().mockResolvedValue({});
const mockListWorkflowRunArtifacts = vi.fn().mockResolvedValue({
  data: { artifacts: [] },
});
const mockDownloadArtifact = vi.fn();
const mockListWorkflowRuns = vi.fn().mockResolvedValue({
  data: { workflow_runs: [] },
});

vi.mock('octokit', () => {
  class MockOctokit {
    rest = {
      repos: {
        get: mockGet,
        getContent: mockGetContent,
        compareCommits: mockCompareCommits,
      },
      git: {
        getRef: mockGetRef,
        createRef: mockCreateRef,
        getCommit: mockGetCommit,
        createBlob: mockCreateBlob,
        createTree: mockCreateTree,
        createCommit: mockCreateCommit,
        updateRef: mockUpdateRef,
        deleteRef: mockDeleteRef,
      },
      search: { code: mockSearchCode },
      checks: { listForRef: mockListForRef },
      pulls: { create: mockPullsCreate, merge: mockPullsMerge },
      actions: {
        listWorkflowRunArtifacts: mockListWorkflowRunArtifacts,
        downloadArtifact: mockDownloadArtifact,
        listWorkflowRuns: mockListWorkflowRuns,
      },
    };
  }
  return { Octokit: MockOctokit };
});

import { createGitHubClient } from './github';

const github = createGitHubClient({
  token: 'test-token',
  owner: 'test-owner',
  repo: 'test-repo',
});

describe('GitHub 클라이언트', () => {
  it('getDefaultBranch가 브랜치 이름과 SHA를 반환한다', async () => {
    const result = await github.getDefaultBranch();
    expect(result).toEqual({ branch: 'main', sha: 'abc123' });
  });

  it('readFile이 파일 내용을 반환한다', async () => {
    const content = await github.readFile('src/test.ts', 'abc123');
    expect(content).toBe('console.log("hello")');
  });

  it('searchCode가 파일 경로 목록을 반환한다', async () => {
    const paths = await github.searchCode('handleDrainRequest');
    expect(paths).toEqual(['src/app/api/test/route.ts']);
  });

  it('commitFiles가 커밋 SHA를 반환한다', async () => {
    const sha = await github.commitFiles(
      'fix/agent-test',
      [{ path: 'src/test.ts', content: 'fixed' }],
      'fix: test',
    );
    expect(sha).toBe('newcommit123');
  });

  it('getCheckRuns가 체크 실행 목록을 반환한다', async () => {
    const runs = await github.getCheckRuns('abc123');
    expect(runs).toEqual([
      { name: 'lint', status: 'completed', conclusion: 'success' },
    ]);
  });

  it('getCompareCommits가 변경 파일 목록을 반환한다', async () => {
    const files = await github.getCompareCommits('base', 'head');
    expect(files).toEqual([
      { filename: 'src/test.ts', status: 'modified' },
    ]);
  });

  it('createPullRequest가 PR 번호와 URL을 반환한다', async () => {
    const pr = await github.createPullRequest(
      'fix/agent-test',
      'main',
      'Fix test',
      'Body',
    );
    expect(pr.number).toBe(1);
    expect(pr.url).toBe('https://github.com/test/test/pull/1');
  });

  it('mergePullRequest가 squash merge를 수행한다', async () => {
    const result = await github.mergePullRequest(1);
    expect(result.merged).toBe(true);
    expect(mockPullsMerge).toHaveBeenCalledWith(
      expect.objectContaining({ merge_method: 'squash' }),
    );
  });

  it('deleteBranch가 ref를 삭제한다', async () => {
    await github.deleteBranch('fix/agent-test');
    expect(mockDeleteRef).toHaveBeenCalledWith(
      expect.objectContaining({ ref: 'heads/fix/agent-test' }),
    );
  });

  it('getWorkflowRuns가 실행 목록을 반환한다', async () => {
    mockListWorkflowRuns.mockResolvedValue({
      data: {
        workflow_runs: [
          { id: 100, status: 'completed', conclusion: 'success' },
        ],
      },
    });
    const runs = await github.getWorkflowRuns('fix/agent-test', 'ci.yml');
    expect(runs).toEqual([
      { id: 100, status: 'completed', conclusion: 'success' },
    ]);
  });
});
