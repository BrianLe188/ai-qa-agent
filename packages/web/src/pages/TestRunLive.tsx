import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Image as ImageIcon,
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
            // Avoid duplicates
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
          // Reload full data
          if (runId) {
            api
              .getTestRun(runId)
              .then((res) => setTestRun(res.testRun))
              .catch(() => {});
          }
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

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">
          {isLive ? "🔴 Live" : "📊"} Test Run #{runId?.slice(0, 6)}
        </h1>
        <p className="page-subtitle">
          Target: {testRun.targetUrl} ·{" "}
          {isLive
            ? "Running..."
            : `Completed in ${((testRun.durationMs || 0) / 1000).toFixed(1)}s`}
        </p>
      </div>

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
                        href={`/api/screenshots/${step.screenshotPath}`}
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
