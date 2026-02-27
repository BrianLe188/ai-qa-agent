import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  Globe,
  FileText,
  Sparkles,
  Play,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import * as api from "../services/api";

export default function NewTestRun() {
  const navigate = useNavigate();

  // Form state
  const [step, setStep] = useState<"upload" | "review" | "running">("upload");
  const [document, setDocument] = useState("");
  const [fileName, setFileName] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [testName, setTestName] = useState("");
  const [generateAdditional, setGenerateAdditional] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Parsed test plan
  const [testPlan, setTestPlan] = useState<any>(null);
  const [expandedCase, setExpandedCase] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- File Upload ---
  const handleFileUpload = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setDocument(e.target?.result as string);
        setFileName(file.name);
        if (!testName) {
          setTestName(file.name.replace(/\.[^.]+$/, ""));
        }
      };
      reader.readAsText(file);
    },
    [testName],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload],
  );

  // --- Parse Document ---
  async function handleParse() {
    if (!document.trim()) {
      setError("Please upload a test document or paste content");
      return;
    }
    if (!targetUrl.trim()) {
      setError("Please enter the target URL");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await api.parseDocument({
        document,
        targetUrl: targetUrl.trim(),
        name: testName || "Untitled Test",
        generateAdditional,
      });
      setTestPlan(res.testPlan);
      setStep("review");
    } catch (e: any) {
      setError(e.message || "Failed to parse document");
    } finally {
      setLoading(false);
    }
  }

  // --- Toggle Test Case ---
  function toggleTestCase(testCaseId: string) {
    if (!testPlan) return;
    const updated = testPlan.testCases.map((tc: any) =>
      tc.id === testCaseId ? { ...tc, enabled: !tc.enabled } : tc,
    );
    setTestPlan({ ...testPlan, testCases: updated });
  }

  // --- Start Test Run ---
  async function handleStartRun() {
    if (!testPlan) return;

    setLoading(true);
    try {
      // Save updated test cases
      await api.updateTestPlan(testPlan.id, {
        testCases: testPlan.testCases,
      });

      // Start run
      const { runId } = await api.startTestRun({
        testPlanId: testPlan.id,
        options: { headless: false, slowMo: 100 },
      });
      navigate(`/run/${runId}`);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  // --- UPLOAD Step ---
  if (step === "upload") {
    return (
      <>
        <div className="page-header">
          <h1 className="page-title">New Test</h1>
          <p className="page-subtitle">
            Upload a test document, user story, or paste test cases
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

        <div className="card mb-4">
          <div className="card-title mb-4">
            <Upload size={18} />
            Test Document
          </div>

          {/* File Upload Zone */}
          <div
            className="file-upload-zone mb-4"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.txt,.csv"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />

            {fileName ? (
              <div className="file-selected">
                <FileText size={16} />
                {fileName}
              </div>
            ) : (
              <>
                <Upload className="icon" />
                <div className="label">
                  Drop test document here or click to upload
                </div>
                <div className="sublabel">.md, .txt files supported</div>
              </>
            )}
          </div>

          {/* Or paste directly */}
          <div className="input-group">
            <label className="input-label">Or paste test cases directly</label>
            <textarea
              className="input input-mono"
              placeholder={`# Login Feature Tests\n\n## TC-001: Login with valid credentials\n- Steps:\n  1. Navigate to /login\n  2. Enter email "test@example.com"\n  3. Enter password "pass123"\n  4. Click "Sign In"\n- Expected: Redirect to dashboard`}
              value={document}
              onChange={(e) => setDocument(e.target.value)}
              rows={10}
            />
          </div>
        </div>

        <div className="card mb-4">
          <div className="card-title mb-4">
            <Globe size={18} />
            Configuration
          </div>

          <div className="input-group">
            <label className="input-label">Target URL *</label>
            <input
              className="input"
              type="url"
              placeholder="https://your-app.com"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Test Name</label>
            <input
              className="input"
              type="text"
              placeholder="Login Feature Tests"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
            />
          </div>

          <label
            className="flex items-center gap-2"
            style={{ cursor: "pointer", fontSize: "0.88rem" }}
          >
            <input
              type="checkbox"
              className="test-case-checkbox"
              checked={generateAdditional}
              onChange={(e) => setGenerateAdditional(e.target.checked)}
            />
            <Sparkles size={16} style={{ color: "var(--accent-secondary)" }} />
            <span>
              AI generates additional test cases (edge cases, security, etc.)
            </span>
          </label>
        </div>

        <button
          className="btn btn-primary btn-lg"
          onClick={handleParse}
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="spinner" />
              Analyzing document...
            </>
          ) : (
            <>
              <Sparkles size={18} />
              Parse & Generate Test Cases
            </>
          )}
        </button>
      </>
    );
  }

  // --- REVIEW Step ---
  if (step === "review" && testPlan) {
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
            {testPlan.testCases.length} test cases found · {enabledCount}{" "}
            enabled · Target: {testPlan.targetUrl}
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
                onToggle={() => toggleTestCase(tc.id)}
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
                  onToggle={() => toggleTestCase(tc.id)}
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
          <button className="btn btn-ghost" onClick={() => setStep("upload")}>
            ← Back
          </button>
          <button
            className="btn btn-success btn-lg"
            onClick={handleStartRun}
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

  return null;
}

// --- Test Case Item Component ---
function TestCaseItem({
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
