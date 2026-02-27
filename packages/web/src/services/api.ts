// ============================================================
// API Client — communicates with Elysia backend
// ============================================================

const API_BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// --- Settings ---
export function getSettings() {
  return request<{ settings: Record<string, string> }>("/settings");
}

export function saveSetting(key: string, value: string) {
  return request<{ success: boolean }>("/settings", {
    method: "POST",
    body: JSON.stringify({ key, value }),
  });
}

// --- Providers ---
export function getProviders() {
  return request<{
    providers: Array<{
      name: string;
      displayName: string;
      isConfigured: boolean;
      isActive: boolean;
      models: string[];
    }>;
  }>("/providers");
}

export function setActiveProvider(name: string) {
  return request<{ success: boolean }>("/providers/active", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

// --- Test Plans ---
export function getTestPlans() {
  return request<{ testPlans: any[] }>("/test-plans");
}

export function getTestPlan(id: string) {
  return request<{ testPlan: any }>(`/test-plans/${id}`);
}

export function deleteTestPlan(id: string) {
  return request<{ success: boolean }>(`/test-plans/${id}`, {
    method: "DELETE",
  });
}

export function parseDocument(body: {
  document: string;
  targetUrl: string;
  name: string;
  generateAdditional?: boolean;
}) {
  return request<{ testPlan: any }>("/test-plans/parse", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateTestPlan(
  id: string,
  body: { testCases?: any[]; name?: string; targetUrl?: string },
) {
  return request<{ success: boolean }>(`/test-plans/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

// --- Test Runs ---
export function getTestRuns(testPlanId?: string) {
  const query = testPlanId ? `?testPlanId=${testPlanId}` : "";
  return request<{ testRuns: any[] }>(`/test-runs${query}`);
}

export function getTestRun(id: string) {
  return request<{ testRun: any }>(`/test-runs/${id}`);
}

export function startTestRun(body: {
  testPlanId: string;
  options?: { headless?: boolean; slowMo?: number; timeout?: number };
}) {
  return request<{ runId: string; status: string }>("/test-runs/start", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// --- Pause / Resume ---
export function pauseTestRun(runId: string) {
  return request<{ success: boolean; isPaused: boolean }>(
    `/test-runs/${runId}/pause`,
    { method: "POST" },
  );
}

export function resumeTestRun(runId: string) {
  return request<{ success: boolean; isPaused: boolean }>(
    `/test-runs/${runId}/resume`,
    { method: "POST" },
  );
}

export function getPauseStatus(runId: string) {
  return request<{
    isPaused: boolean;
    pausedAt: string | null;
    pausedAtStep: number | null;
  }>(`/test-runs/${runId}/pause-status`);
}

// --- Reports ---
export function getReports() {
  return request<Array<{ filename: string; runId: string }>>("/reports/");
}

export function getReportUrl(runId: string) {
  return `${API_BASE}/reports/${runId}`;
}

export function getReportDownloadUrl(filename: string) {
  return `${API_BASE}/reports/download/${filename}`;
}

// --- Visual Verification ---
export function saveBaseline(runId: string, testPlanId?: string) {
  return request<{ success: boolean; saved: number; message: string }>(
    `/visual/baseline/${runId}`,
    {
      method: "POST",
      body: JSON.stringify(testPlanId ? { testPlanId } : {}),
    },
  );
}

export function compareVisual(runId: string, testPlanId?: string) {
  const query = testPlanId ? `?testPlanId=${testPlanId}` : "";
  return request<any>(`/visual/${runId}/compare${query}`);
}

export function getVisualDiffUrl(filename: string) {
  return `${API_BASE}/visual/diffs/${filename}`;
}
