import type { RuntimeError } from '../model/types';

const VERCEL_API_BASE = 'https://api.vercel.com';

const getRuntimeErrors = async (
  token: string,
  projectId: string,
  deploymentId: string,
): Promise<RuntimeError[]> => {
  const url = new URL(`${VERCEL_API_BASE}/v1/projects/${projectId}/logs`);
  url.searchParams.set('deploymentId', deploymentId);
  url.searchParams.set('level', 'error');
  url.searchParams.set('limit', '50');

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) return [];

  const data = (await response.json()) as {
    data?: Array<{
      message?: string;
      stack?: string;
      path?: string;
      timestamp?: number;
    }>;
  };

  if (!Array.isArray(data.data)) return [];

  const grouped = new Map<string, RuntimeError>();
  for (const log of data.data) {
    const message = log.message || 'Unknown error';
    const key = message.slice(0, 200);
    const existing = grouped.get(key);
    const timestamp = log.timestamp
      ? new Date(log.timestamp).toISOString()
      : new Date().toISOString();

    if (existing) {
      existing.count += 1;
      existing.lastSeen = timestamp;
    } else {
      grouped.set(key, {
        message,
        stack: log.stack || '',
        path: log.path || '',
        count: 1,
        firstSeen: timestamp,
        lastSeen: timestamp,
      });
    }
  }

  return [...grouped.values()].sort((a, b) => b.count - a.count);
};

type PreviewDeployment = {
  id: string;
  url: string;
  readyState: string;
  createdAt: number;
};

const getPreviewDeployment = async (
  token: string,
  projectId: string,
  branchName: string,
): Promise<PreviewDeployment | null> => {
  const url = new URL(`${VERCEL_API_BASE}/v6/deployments`);
  url.searchParams.set('projectId', projectId);
  url.searchParams.set('target', 'preview');
  url.searchParams.set('limit', '10');

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    deployments?: Array<{
      uid?: string;
      url?: string;
      readyState?: string;
      createdAt?: number;
      meta?: { githubCommitRef?: string };
    }>;
  };

  if (!Array.isArray(data.deployments)) return null;

  const deployment = data.deployments.find(
    (d) => d.meta?.githubCommitRef === branchName,
  );

  if (!deployment || !deployment.uid || !deployment.url) return null;

  return {
    id: deployment.uid,
    url: deployment.url,
    readyState: deployment.readyState ?? 'QUEUED',
    createdAt: deployment.createdAt ?? 0,
  };
};

type ProductionDeployment = {
  id: string;
  url: string;
  readyState: string;
  createdAt: number;
  commitSha: string | null;
};

const getProductionDeployments = async (
  token: string,
  projectId: string,
  limit = 5,
): Promise<ProductionDeployment[]> => {
  const url = new URL(`${VERCEL_API_BASE}/v6/deployments`);
  url.searchParams.set('projectId', projectId);
  url.searchParams.set('target', 'production');
  url.searchParams.set('limit', String(limit));

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) return [];

  const data = (await response.json()) as {
    deployments?: Array<{
      uid?: string;
      url?: string;
      readyState?: string;
      createdAt?: number;
      meta?: { githubCommitSha?: string };
    }>;
  };

  if (!Array.isArray(data.deployments)) return [];

  return data.deployments
    .filter(
      (d): d is typeof d & { uid: string; url: string } =>
        !!d.uid && !!d.url,
    )
    .map((d) => ({
      id: d.uid,
      url: d.url,
      readyState: d.readyState ?? 'QUEUED',
      createdAt: d.createdAt ?? 0,
      commitSha: d.meta?.githubCommitSha ?? null,
    }));
};

const promoteDeployment = async (
  token: string,
  projectId: string,
  deploymentId: string,
): Promise<boolean> => {
  const response = await fetch(
    `${VERCEL_API_BASE}/v10/projects/${projectId}/promote/${deploymentId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );
  return response.ok;
};

export {
  getRuntimeErrors,
  getPreviewDeployment,
  getProductionDeployments,
  promoteDeployment,
  type PreviewDeployment,
  type ProductionDeployment,
};
