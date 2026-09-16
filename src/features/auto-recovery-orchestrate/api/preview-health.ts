type HealthCheckResult = {
  isPreviewReady: boolean;
  isHealthy: boolean;
  deployId: string | null;
  previewUrl: string | null;
  checks: { path: string; status: number | null; ok: boolean }[];
};

const HEALTH_PATHS = ['/', '/api/health'];

const checkPreviewHealth = async (
  previewUrl: string,
): Promise<HealthCheckResult['checks']> => {
  const checks: HealthCheckResult['checks'] = [];

  for (const path of HEALTH_PATHS) {
    try {
      const url = previewUrl.startsWith('https://')
        ? `${previewUrl}${path}`
        : `https://${previewUrl}${path}`;

      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
      });

      checks.push({
        path,
        status: response.status,
        ok: response.status >= 200 && response.status < 400,
      });
    } catch {
      checks.push({ path, status: null, ok: false });
    }
  }

  return checks;
};

export { checkPreviewHealth, HEALTH_PATHS, type HealthCheckResult };
