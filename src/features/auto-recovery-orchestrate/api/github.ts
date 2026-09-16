import { Octokit } from 'octokit';

type GitHubConfig = {
  token: string;
  owner: string;
  repo: string;
};

type FileChange = {
  path: string;
  content: string;
};

const createGitHubClient = (config: GitHubConfig) => {
  const octokit = new Octokit({ auth: config.token });
  const { owner, repo } = config;

  const getDefaultBranch = async () => {
    const { data } = await octokit.rest.repos.get({ owner, repo });
    const branch = data.default_branch;
    const { data: ref } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });
    return { branch, sha: ref.object.sha };
  };

  const readFile = async (path: string, ref: string): Promise<string | null> => {
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });
      if ('content' in data && data.encoding === 'base64') {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }
      return null;
    } catch {
      return null;
    }
  };

  const readDirectory = async (
    path: string,
    ref: string,
  ): Promise<string[]> => {
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });
      if (Array.isArray(data)) {
        return data.map((item) => item.path);
      }
      return [];
    } catch {
      return [];
    }
  };

  const searchCode = async (query: string): Promise<string[]> => {
    try {
      const { data } = await octokit.rest.search.code({
        q: `${query} repo:${owner}/${repo}`,
        per_page: 10,
      });
      return data.items.map((item) => item.path);
    } catch {
      return [];
    }
  };

  const createBranch = async (name: string, sha: string) => {
    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${name}`,
      sha,
    });
  };

  const commitFiles = async (
    branch: string,
    files: FileChange[],
    message: string,
  ): Promise<string> => {
    const { data: refData } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });
    const parentSha = refData.object.sha;

    const { data: parentCommit } = await octokit.rest.git.getCommit({
      owner,
      repo,
      commit_sha: parentSha,
    });

    const blobs = await Promise.all(
      files.map(async (file) => {
        const { data } = await octokit.rest.git.createBlob({
          owner,
          repo,
          content: Buffer.from(file.content).toString('base64'),
          encoding: 'base64',
        });
        return { path: file.path, sha: data.sha };
      }),
    );

    const { data: tree } = await octokit.rest.git.createTree({
      owner,
      repo,
      base_tree: parentCommit.tree.sha,
      tree: blobs.map((blob) => ({
        path: blob.path,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: blob.sha,
      })),
    });

    const { data: commit } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message,
      tree: tree.sha,
      parents: [parentSha],
    });

    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: commit.sha,
    });

    return commit.sha;
  };

  const getCheckRuns = async (
    ref: string,
  ): Promise<{ name: string; status: string; conclusion: string | null }[]> => {
    const { data } = await octokit.rest.checks.listForRef({
      owner,
      repo,
      ref,
    });
    return data.check_runs.map((run) => ({
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
    }));
  };

  const getCompareCommits = async (
    base: string,
    head: string,
  ): Promise<{ filename: string; status: string }[]> => {
    const { data } = await octokit.rest.repos.compareCommits({
      owner,
      repo,
      base,
      head,
    });
    return (data.files ?? []).map((file) => ({
      filename: file.filename,
      status: file.status ?? 'unknown',
    }));
  };

  const createPullRequest = async (
    head: string,
    base: string,
    title: string,
    body: string,
  ): Promise<{ number: number; url: string }> => {
    const { data } = await octokit.rest.pulls.create({
      owner,
      repo,
      head,
      base,
      title,
      body,
    });
    return { number: data.number, url: data.html_url };
  };

  const mergePullRequest = async (
    prNumber: number,
  ): Promise<{ sha: string; merged: boolean }> => {
    const { data } = await octokit.rest.pulls.merge({
      owner,
      repo,
      pull_number: prNumber,
      merge_method: 'squash',
    });
    return { sha: data.sha, merged: data.merged };
  };

  const deleteBranch = async (name: string): Promise<void> => {
    await octokit.rest.git.deleteRef({
      owner,
      repo,
      ref: `heads/${name}`,
    });
  };

  const getWorkflowRunArtifacts = async (
    runId: number,
  ): Promise<{ name: string; data: unknown }[]> => {
    const { data: artifacts } =
      await octokit.rest.actions.listWorkflowRunArtifacts({
        owner,
        repo,
        run_id: runId,
      });

    const results: { name: string; data: unknown }[] = [];
    for (const artifact of artifacts.artifacts) {
      const { data } = await octokit.rest.actions.downloadArtifact({
        owner,
        repo,
        artifact_id: artifact.id,
        archive_format: 'zip',
      });
      results.push({ name: artifact.name, data });
    }
    return results;
  };

  const getWorkflowRuns = async (
    branch: string,
    workflowFileName: string,
  ): Promise<
    { id: number; status: string; conclusion: string | null }[]
  > => {
    const { data } = await octokit.rest.actions.listWorkflowRuns({
      owner,
      repo,
      workflow_id: workflowFileName,
      branch,
      per_page: 5,
    });
    return data.workflow_runs.map((run) => ({
      id: run.id,
      status: run.status ?? 'queued',
      conclusion: run.conclusion ?? null,
    }));
  };

  const revertCommit = async (
    commitSha: string,
  ): Promise<string | null> => {
    try {
      const { data: mergeCommit } = await octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: commitSha,
      });

      if (!mergeCommit.parents.length) return null;

      const parentSha = mergeCommit.parents[0].sha;
      const { data: parentCommit } = await octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: parentSha,
      });

      const defaultBranch = await getDefaultBranch();

      if (defaultBranch.sha !== commitSha) return null;

      const { data: revert } = await octokit.rest.git.createCommit({
        owner,
        repo,
        message: `revert: auto-recovery rollback for ${commitSha.slice(0, 7)}`,
        tree: parentCommit.tree.sha,
        parents: [commitSha],
      });

      await octokit.rest.git.updateRef({
        owner,
        repo,
        ref: `heads/${defaultBranch.branch}`,
        sha: revert.sha,
      });

      return revert.sha;
    } catch {
      return null;
    }
  };

  return {
    getDefaultBranch,
    readFile,
    readDirectory,
    searchCode,
    createBranch,
    commitFiles,
    getCheckRuns,
    getCompareCommits,
    createPullRequest,
    mergePullRequest,
    deleteBranch,
    getWorkflowRunArtifacts,
    getWorkflowRuns,
    revertCommit,
  };
};

export { createGitHubClient, type GitHubConfig, type FileChange };
