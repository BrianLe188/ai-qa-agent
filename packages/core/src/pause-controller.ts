// ============================================================
// Pause Controller — Manage pause/resume state for test runs
// ============================================================

type PauseResolve = () => void;

interface PauseState {
  isPaused: boolean;
  resolve: PauseResolve | null;
  pausedAt: string | null;
  pausedAtStep: number | null;
}

/** Map of runId → pause state */
const pauseStates = new Map<string, PauseState>();

/** Initialize pause state for a new run */
export function initPauseState(runId: string): void {
  pauseStates.set(runId, {
    isPaused: false,
    resolve: null,
    pausedAt: null,
    pausedAtStep: null,
  });
}

/** Clean up pause state when run completes */
export function cleanupPauseState(runId: string): void {
  const state = pauseStates.get(runId);
  // If still paused, resume first to unblock the runner
  if (state?.isPaused && state.resolve) {
    state.resolve();
  }
  pauseStates.delete(runId);
}

/**
 * Pause a running test. Returns true if successfully paused.
 */
export function pauseRun(runId: string, stepOrder?: number): boolean {
  const state = pauseStates.get(runId);
  if (!state || state.isPaused) return false;

  state.isPaused = true;
  state.pausedAt = new Date().toISOString();
  state.pausedAtStep = stepOrder ?? null;
  return true;
}

/**
 * Resume a paused test. Returns true if successfully resumed.
 */
export function resumeRun(runId: string): boolean {
  const state = pauseStates.get(runId);
  if (!state || !state.isPaused) return false;

  state.isPaused = false;
  state.pausedAt = null;
  state.pausedAtStep = null;

  // Resolve the pending promise to unblock the runner loop
  if (state.resolve) {
    state.resolve();
    state.resolve = null;
  }
  return true;
}

/**
 * Check if a run is currently paused
 */
export function isPaused(runId: string): boolean {
  return pauseStates.get(runId)?.isPaused ?? false;
}

/**
 * Get pause info for a run
 */
export function getPauseInfo(runId: string): {
  isPaused: boolean;
  pausedAt: string | null;
  pausedAtStep: number | null;
} {
  const state = pauseStates.get(runId);
  return {
    isPaused: state?.isPaused ?? false,
    pausedAt: state?.pausedAt ?? null,
    pausedAtStep: state?.pausedAtStep ?? null,
  };
}

/**
 * Wait if the run is paused. Call this between steps.
 * This function returns immediately if not paused,
 * or blocks (via Promise) until resumed.
 */
export async function waitIfPaused(runId: string): Promise<void> {
  const state = pauseStates.get(runId);
  if (!state || !state.isPaused) return;

  // Create a promise that will be resolved when resumeRun() is called
  return new Promise<void>((resolve) => {
    state.resolve = resolve;
  });
}
