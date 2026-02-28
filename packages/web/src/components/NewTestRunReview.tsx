import { FileText, Sparkles, Play } from "lucide-react";
import { TestCaseItem } from "./TestCaseItem";

interface ReviewProps {
  testPlan: any;
  loading: boolean;
  error: string;
  planId: string | null;
  expandedCase: string | null;
  setExpandedCase: (id: string | null) => void;
  onToggleTestCase: (id: string) => void;
  onStartRun: () => void;
  onBack: () => void;
}

export function NewTestRunReview({
  testPlan,
  loading,
  error,
  planId,
  expandedCase,
  setExpandedCase,
  onToggleTestCase,
  onStartRun,
  onBack,
}: ReviewProps) {
  const documentCases = testPlan.testCases.filter(
    (tc: any) => tc.source === "document",
  );
  const aiCases = testPlan.testCases.filter(
    (tc: any) => tc.source === "ai-generated",
  );
  const enabledCount = testPlan.testCases.filter(
    (tc: any) => tc.enabled,
  ).length;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Review Test Plan</h1>
        <p className="page-subtitle">
          {testPlan.testCases.length} test cases found · {enabledCount} enabled
          · Target: {testPlan.targetUrl}
        </p>
      </div>

      {error && (
        <div
          className="toast error mb-4"
          style={{ position: "static", minWidth: "auto" }}
        >
          ❌ {error}
        </div>
      )}

      {/* Document-extracted test cases */}
      <div className="card mb-4">
        <div className="card-header">
          <h2 className="card-title">
            <FileText size={18} />
            Extracted from Document ({documentCases.length})
          </h2>
        </div>
        <div className="test-case-list">
          {documentCases.map((tc: any) => (
            <TestCaseItem
              key={tc.id}
              testCase={tc}
              expanded={expandedCase === tc.id}
              onToggle={() => onToggleTestCase(tc.id)}
              onExpand={() =>
                setExpandedCase(expandedCase === tc.id ? null : tc.id)
              }
            />
          ))}
        </div>
      </div>

      {/* AI-generated test cases */}
      {aiCases.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">
            <h2 className="card-title">
              <Sparkles
                size={18}
                style={{ color: "var(--accent-secondary)" }}
              />
              AI-Generated ({aiCases.length})
            </h2>
          </div>
          <div className="test-case-list">
            {aiCases.map((tc: any) => (
              <TestCaseItem
                key={tc.id}
                testCase={tc}
                expanded={expandedCase === tc.id}
                onToggle={() => onToggleTestCase(tc.id)}
                onExpand={() =>
                  setExpandedCase(expandedCase === tc.id ? null : tc.id)
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button className="btn btn-ghost" onClick={onBack}>
          ← Back
        </button>
        <button
          className="btn btn-success btn-lg"
          onClick={onStartRun}
          disabled={loading || enabledCount === 0}
        >
          {loading ? (
            <>
              <div className="spinner" />
              Starting...
            </>
          ) : (
            <>
              <Play size={18} />
              Run {enabledCount} Test Cases
            </>
          )}
        </button>
      </div>
    </>
  );
}
