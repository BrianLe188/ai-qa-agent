import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FlaskConical,
  Play,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import * as api from "../services/api";

export default function Dashboard() {
  const [testPlans, setTestPlans] = useState<any[]>([]);
  const [testRuns, setTestRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [plansRes, runsRes] = await Promise.all([
        api.getTestPlans(),
        api.getTestRuns(),
      ]);
      setTestPlans(plansRes.testPlans);
      setTestRuns(runsRes.testRuns);
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(planId: string) {
    if (!confirm("Delete this test plan?")) return;
    await api.deleteTestPlan(planId);
    loadData();
  }

  async function handleStartRun(planId: string) {
    try {
      const { runId } = await api.startTestRun({ testPlanId: planId });
      navigate(`/run/${runId}`);
    } catch (e: any) {
      alert(e.message);
    }
  }

  if (loading) {
    return (
      <div className="empty-state">
        <div className="spinner spinner-lg" style={{ margin: "0 auto" }} />
      </div>
    );
  }

  // Summary stats from recent runs
  const recentRuns = testRuns.slice(0, 10);
  const totalTests = recentRuns.reduce(
    (acc, r) => acc + (r.summary?.total || 0),
    0,
  );
  const totalPassed = recentRuns.reduce(
    (acc, r) => acc + (r.summary?.passed || 0),
    0,
  );
  const totalFailed = recentRuns.reduce(
    (acc, r) => acc + (r.summary?.failed || 0),
    0,
  );
  const totalErrors = recentRuns.reduce(
    (acc, r) => acc + (r.summary?.error || 0),
    0,
  );

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Overview of your test plans and recent runs
        </p>
      </div>

      {/* Stats */}
      {recentRuns.length > 0 && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value total">{totalTests}</div>
            <div className="stat-label">Total Tests</div>
          </div>
          <div className="stat-card">
            <div className="stat-value passed">{totalPassed}</div>
            <div className="stat-label">Passed</div>
          </div>
          <div className="stat-card">
            <div className="stat-value failed">{totalFailed}</div>
            <div className="stat-label">Failed</div>
          </div>
          <div className="stat-card">
            <div className="stat-value errors">{totalErrors}</div>
            <div className="stat-label">Errors</div>
          </div>
        </div>
      )}

      {/* Test Plans */}
      <div className="card mb-4">
        <div className="card-header">
          <h2 className="card-title">
            <FlaskConical size={18} />
            Test Plans
          </h2>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate("/new-test")}
          >
            + New Test
          </button>
        </div>

        {testPlans.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🧪</div>
            <div className="title">No test plans yet</div>
            <div className="description">
              Upload a test document to create your first test plan
            </div>
          </div>
        ) : (
          <div className="test-case-list">
            {testPlans.map((plan) => (
              <div key={plan.id} className="test-case-item">
                <div
                  className="test-case-info"
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/new-test?planId=${plan.id}`)}
                >
                  <div className="test-case-title">
                    {plan.name}
                    <span className="source-badge">
                      {plan.testCases?.length || 0} cases
                    </span>
                  </div>
                  <div className="test-case-description">
                    🎯 {plan.targetUrl} · Created{" "}
                    {new Date(plan.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => handleStartRun(plan.id)}
                  title="Run tests"
                >
                  <Play size={14} />
                  Run
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(plan.id)}
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Runs */}
      {testRuns.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Clock size={18} />
              Recent Runs
            </h2>
          </div>
          <div className="test-case-list">
            {testRuns.slice(0, 10).map((run) => {
              const statusIcon =
                run.status === "completed" && run.summary?.failed === 0 ? (
                  <CheckCircle2
                    size={16}
                    style={{ color: "var(--accent-success)" }}
                  />
                ) : run.status === "completed" && run.summary?.failed > 0 ? (
                  <XCircle
                    size={16}
                    style={{ color: "var(--accent-danger)" }}
                  />
                ) : run.status === "running" ? (
                  <div className="spinner" />
                ) : (
                  <AlertTriangle
                    size={16}
                    style={{ color: "var(--accent-warning)" }}
                  />
                );

              return (
                <div
                  key={run.id}
                  className="test-case-item"
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/run/${run.id}`)}
                >
                  {statusIcon}
                  <div className="test-case-info">
                    <div className="test-case-title">
                      Run #{run.id.slice(0, 6)}
                      {run.summary && (
                        <span
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--text-tertiary)",
                            fontWeight: 400,
                          }}
                        >
                          {run.summary.passed}/{run.summary.total} passed
                        </span>
                      )}
                    </div>
                    <div className="test-case-description">
                      🎯 {run.targetUrl} ·{" "}
                      {new Date(run.startedAt).toLocaleString()}
                      {run.durationMs
                        ? ` · ${(run.durationMs / 1000).toFixed(1)}s`
                        : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
