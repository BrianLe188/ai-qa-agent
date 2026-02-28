import { ChevronDown, ChevronUp } from "lucide-react";

export function TestCaseItem({
  testCase,
  expanded,
  onToggle,
  onExpand,
}: {
  testCase: any;
  expanded: boolean;
  onToggle: () => void;
  onExpand: () => void;
}) {
  return (
    <div
      className={`test-case-item ${testCase.enabled ? "" : "disabled"}`}
      style={{ flexDirection: "column", alignItems: "stretch" }}
    >
      <div className="flex items-center gap-3" style={{ width: "100%" }}>
        <input
          type="checkbox"
          className="test-case-checkbox"
          checked={testCase.enabled}
          onChange={onToggle}
        />
        <div
          className="test-case-info"
          style={{ cursor: "pointer" }}
          onClick={onExpand}
        >
          <div className="test-case-title">
            <span className={`priority-badge priority-${testCase.priority}`}>
              {testCase.priority}
            </span>
            {testCase.title}
            {testCase.source === "ai-generated" && (
              <span className="source-badge">🤖 AI</span>
            )}
          </div>
          <div className="test-case-description">
            {testCase.description || testCase.expectedResult}
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onExpand}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div
          style={{
            marginTop: 12,
            padding: "12px 16px",
            background: "var(--bg-secondary)",
            borderRadius: "var(--radius-md)",
            fontSize: "0.85rem",
            lineHeight: 1.8,
          }}
        >
          {testCase.url && (
            <div style={{ color: "var(--text-tertiary)", marginBottom: 8 }}>
              🔗 URL: {testCase.url}
            </div>
          )}
          <div
            style={{
              fontWeight: 600,
              marginBottom: 6,
              color: "var(--text-secondary)",
            }}
          >
            Steps:
          </div>
          <ol style={{ paddingLeft: 20 }}>
            {testCase.steps.map((step: any) => (
              <li key={step.order} style={{ marginBottom: 4 }}>
                <span style={{ color: "var(--text-primary)" }}>
                  {step.action}
                </span>
                {step.expected && (
                  <span
                    style={{
                      color: "var(--accent-secondary)",
                      fontSize: "0.8rem",
                    }}
                  >
                    {" "}
                    → {step.expected}
                  </span>
                )}
              </li>
            ))}
          </ol>
          <div style={{ marginTop: 8, color: "var(--accent-success)" }}>
            ✅ Expected: {testCase.expectedResult}
          </div>
        </div>
      )}
    </div>
  );
}
