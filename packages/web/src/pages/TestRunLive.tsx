import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Image as ImageIcon,
  FileText,
  Download,
  Eye,
  Camera,
  GitCompare,
  Pause,
  Play,
} from "lucide-react";
import * as api from "../services/api";

interface WSEvent {
  type: string;
  data: any;
}

interface Props {
  events: WSEvent[];
  clearEvents: () => void;
}

export default function TestRunLive({ events, clearEvents }: Props) {
  const { runId } = useParams<{ runId: string }>();
  const [testRun, setTestRun] = useState<any>(null);
  const [logs, setLogs] = useState<Array<{ level: string; message: string }>>(
    [],
  );
  const [isLive, setIsLive] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [visualReport, setVisualReport] = useState<any>(null);
  const [showVisual, setShowVisual] = useState(false);
  const [baselineMsg, setBaselineMsg] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Load persisted run data
  useEffect(() => {
    if (!runId) return;
    api
      .getTestRun(runId)
      .then((res) => {
        setTestRun(res.testRun);
        if (res.testRun?.status === "completed") {
          setIsLive(false);
          setReportUrl(api.getReportUrl(runId));
        }
      })
      .catch(() => {});
  }, [runId]);

  // Process WebSocket events
  useEffect(() => {
    for (const event of events) {
      if (event.data?.runId !== runId) continue;

      switch (event.type) {
        case "test-run:started":
          setIsLive(true);
          break;

        case "test-case:completed":
          setTestRun((prev: any) => {
            if (!prev) return prev;
            const results = [...(prev.results || [])];
            const existingIdx = results.findIndex(
              (r: any) => r.testCaseId === event.data.result.testCaseId,
            );
            if (existingIdx >= 0) {
              results[existingIdx] = event.data.result;
            } else {
              results.push(event.data.result);
            }
            return { ...prev, results };
          });
          break;

        case "test-run:completed":
          setTestRun((prev: any) =>
            prev
              ? { ...prev, status: "completed", summary: event.data.summary }
              : prev,
          );
          setIsLive(false);
          if (runId) {
            api
              .getTestRun(runId)
              .then((res) => setTestRun(res.testRun))
              .catch(() => {});
          }
          break;

        case "report:ready":
          setReportUrl(event.data.reportUrl);
          break;

        case "test-run:paused":
          setIsPaused(true);
          break;

        case "test-run:resumed":
          setIsPaused(false);
          break;

        case "log":
          setLogs((prev) => [
            ...prev,
            { level: event.data.level, message: event.data.message },
          ]);
          break;
      }
    }
  }, [events, runId]);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleSaveBaseline = async () => {
    if (!runId || !testRun) return;
    try {
      const res = await api.saveBaseline(runId, testRun.testPlanId);
      setBaselineMsg(res.message);
      setTimeout(() => setBaselineMsg(null), 4000);
    } catch (err: any) {
      setBaselineMsg("Failed to save baseline: " + err.message);
    }
  };

  const handleCompareVisual = async () => {
    if (!runId || !testRun) return;
    try {
      const report = await api.compareVisual(runId, testRun.testPlanId);
      setVisualReport(report);
      setShowVisual(true);
    } catch (err: any) {
      setBaselineMsg("No baseline found. Save a baseline first!");
      setTimeout(() => setBaselineMsg(null), 4000);
    }
  };

  if (!testRun) {
    return (
      <div className="empty-state">
        <div className="spinner spinner-lg" style={{ margin: "0 auto" }} />
        <div className="title mt-4">Loading test run...</div>
      </div>
    );
  }

  const summary = testRun.summary || {
    total: 0,
    passed: 0,
    failed: 0,
    error: 0,
  };
  const completedCount = (testRun.results || []).length;
  const progress =
    summary.total > 0 ? (completedCount / summary.total) * 100 : 0;

  const handlePauseResume = async () => {
    if (!runId) return;
    try {
      if (isPaused) {
        await api.resumeTestRun(runId);
        setIsPaused(false);
      } else {
        await api.pauseTestRun(runId);
        setIsPaused(true);
      }
    } catch (err: any) {
      console.error("Pause/resume failed:", err);
    }
  };

  return (
    <>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 className="page-title" style={{ margin: 0 }}>
            {isLive ? (isPaused ? "⏸️ Paused" : "🔴 Live") : "📊"} Test Run #
            {runId?.slice(0, 6)}
          </h1>
          {isLive && (
            <button
              onClick={handlePauseResume}
              className={isPaused ? "btn btn-primary" : "btn btn-secondary"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.82rem",
                padding: "6px 16px",
                borderRadius: 20,
                ...(isPaused
                  ? { animation: "pulse 1.5s ease-in-out infinite" }
                  : {}),
              }}
            >
              {isPaused ? (
                <>
                  <Play size={14} />
                  Resume
                </>
              ) : (
                <>
                  <Pause size={14} />
                  Pause
                </>
              )}
            </button>
          )}
        </div>
        <p className="page-subtitle">
          Target: {testRun.targetUrl} ·{" "}
          {isLive
            ? isPaused
              ? "Paused — waiting for resume..."
              : "Running..."
            : `Completed in ${((testRun.durationMs || 0) / 1000).toFixed(1)}s`}
        </p>
      </div>

      {/* Action Bar — Report, Baseline, Visual Compare */}
      {!isLive && (
        <div className="card mb-4" style={{ padding: "12px 16px" }}>
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {reportUrl && (
              <>
                <a
                  href={reportUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    textDecoration: "none",
                    fontSize: "0.82rem",
                    padding: "6px 14px",
                  }}
                >
                  <FileText size={14} />
                  View Report
                </a>
                <a
                  href={api.getReportDownloadUrl(`report-${runId}.html`)}
                  className="btn btn-secondary"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    textDecoration: "none",
                    fontSize: "0.82rem",
                    padding: "6px 14px",
                  }}
                >
                  <Download size={14} />
                  Download HTML
                </a>
              </>
            )}

            <button
              className="btn btn-secondary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.82rem",
                padding: "6px 14px",
              }}
              onClick={handleSaveBaseline}
            >
              <Camera size={14} />
              Save as Baseline
            </button>

            <button
              className="btn btn-secondary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.82rem",
                padding: "6px 14px",
              }}
              onClick={handleCompareVisual}
            >
              <GitCompare size={14} />
              Visual Compare
            </button>

            {baselineMsg && (
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "var(--accent-success)",
                  fontWeight: 500,
                }}
              >
                {baselineMsg}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Progress */}
      {isLive && (
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>
              Progress: {completedCount}/{summary.total}
            </span>
            <span
              style={{ fontSize: "0.85rem", color: "var(--text-tertiary)" }}
            >
              {progress.toFixed(0)}%
            </span>
          </div>
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value total">{summary.total}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-card">
          <div className="stat-value passed">{summary.passed}</div>
          <div className="stat-label">Passed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value failed">{summary.failed}</div>
          <div className="stat-label">Failed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value errors">{summary.error}</div>
          <div className="stat-label">Errors</div>
        </div>
      </div>

      {/* Visual Comparison Panel */}
      {showVisual && visualReport && (
        <div className="card mb-4">
          <div
            className="card-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2 className="card-title">🔍 Visual Comparison</h2>
            <button
              style={{
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "1.2rem",
              }}
              onClick={() => setShowVisual(false)}
            >
              ✕
            </button>
          </div>

          {/* Visual Summary Stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
              padding: 16,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  color: "var(--accent-success)",
                }}
              >
                {visualReport.summary.matched}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-tertiary)",
                }}
              >
                Matched
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  color: "var(--accent-danger)",
                }}
              >
                {visualReport.summary.mismatched}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-tertiary)",
                }}
              >
                Mismatched
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  color: "#6366f1",
                }}
              >
                {visualReport.summary.newBaselines}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-tertiary)",
                }}
              >
                New
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  color: "var(--text-tertiary)",
                }}
              >
                {visualReport.summary.noScreenshot}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-tertiary)",
                }}
              >
                No Screenshot
              </div>
            </div>
          </div>

          {/* Visual Diff List */}
          <div style={{ padding: "0 16px 16px" }}>
            {visualReport.diffs.map((diff: any) => (
              <div
                key={diff.testCaseId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  borderBottom: "1px solid var(--border-subtle)",
                  fontSize: "0.85rem",
                }}
              >
                <span>{diff.testCaseTitle}</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {diff.status === "match" && (
                    <span
                      style={{
                        background: "#10b981",
                        color: "white",
                        padding: "2px 8px",
                        borderRadius: 10,
                        fontSize: "0.72rem",
                        fontWeight: 600,
                      }}
                    >
                      MATCH
                    </span>
                  )}
                  {diff.status === "mismatch" && (
                    <>
                      <span
                        style={{
                          background: "#ef4444",
                          color: "white",
                          padding: "2px 8px",
                          borderRadius: 10,
                          fontSize: "0.72rem",
                          fontWeight: 600,
                        }}
                      >
                        {diff.mismatchPercentage}% DIFF
                      </span>
                      {diff.diffScreenshot && (
                        <a
                          href={api.getVisualDiffUrl(diff.diffScreenshot)}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#6366f1" }}
                        >
                          <Eye size={14} />
                        </a>
                      )}
                    </>
                  )}
                  {diff.status === "new" && (
                    <span
                      style={{
                        background: "#6366f1",
                        color: "white",
                        padding: "2px 8px",
                        borderRadius: 10,
                        fontSize: "0.72rem",
                        fontWeight: 600,
                      }}
                    >
                      NEW
                    </span>
                  )}
                  {diff.status === "no-screenshot" && (
                    <span
                      style={{
                        color: "var(--text-tertiary)",
                        fontSize: "0.72rem",
                      }}
                    >
                      No screenshot
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {(testRun.results || []).length > 0 && (
        <div className="card mb-4">
          <div className="card-header">
            <h2 className="card-title">Results</h2>
          </div>
          <div className="result-grid">
            {(testRun.results || []).map((result: any) => (
              <ResultCard key={result.testCaseId} result={result} />
            ))}
          </div>
        </div>
      )}

      {/* Log Console */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            📟 Execution Log
            {isLive && <div className="spinner" style={{ marginLeft: 8 }} />}
          </h2>
        </div>
        <div className="log-console">
          {logs.length === 0 && !isLive ? (
            <div style={{ color: "var(--text-tertiary)" }}>
              No logs available for this run.
            </div>
          ) : logs.length === 0 ? (
            <div style={{ color: "var(--text-tertiary)" }}>
              Waiting for test execution to begin...
            </div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className={`log-line ${log.level}`}>
                {log.message}
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </>
  );
}

// --- Result Card Component ---
function ResultCard({ result }: { result: any }) {
  const [expanded, setExpanded] = useState(false);

  const statusEmoji =
    result.status === "passed"
      ? "✅"
      : result.status === "failed"
        ? "❌"
        : result.status === "error"
          ? "⚠️"
          : "⏭️";

  return (
    <div
      className={`result-card ${result.status}`}
      onClick={() => setExpanded(!expanded)}
      style={expanded ? { gridColumn: "1 / -1" } : {}}
    >
      <div className="result-status-icon">{statusEmoji}</div>
      <div className="result-info">
        <div className="result-title">{result.testCaseTitle}</div>
        <div className="result-meta">
          {result.status.toUpperCase()} ·{" "}
          {(result.durationMs / 1000).toFixed(1)}s
          {result.stepResults && ` · ${result.stepResults.length} steps`}
        </div>

        {expanded && result.stepResults && (
          <div style={{ marginTop: 12 }}>
            {result.stepResults.map((step: any) => (
              <div
                key={step.stepOrder}
                style={{
                  padding: "6px 0",
                  borderBottom: "1px solid var(--border-subtle)",
                  fontSize: "0.82rem",
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                }}
              >
                <span style={{ flexShrink: 0 }}>
                  {step.status === "passed" ? "✅" : "❌"}
                </span>
                <div style={{ flex: 1 }}>
                  <div>{step.action}</div>
                  {step.error && (
                    <div
                      style={{
                        color: "var(--accent-danger)",
                        marginTop: 2,
                        fontSize: "0.78rem",
                      }}
                    >
                      Error: {step.error}
                    </div>
                  )}
                  {step.screenshotPath && (
                    <div className="flex items-center gap-2 mt-2">
                      <ImageIcon size={12} />
                      <a
                        href={`/api/screenshots/${step.screenshotPath.split("/").pop()}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: "0.78rem" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Screenshot
                      </a>
                    </div>
                  )}
                </div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-tertiary)",
                    flexShrink: 0,
                  }}
                >
                  {(step.durationMs / 1000).toFixed(1)}s
                </span>
              </div>
            ))}

            {result.aiAnalysis && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  background: "var(--bg-secondary)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.82rem",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  🧠 AI Analysis:
                </div>
                <div style={{ color: "var(--text-secondary)" }}>
                  {result.aiAnalysis}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
