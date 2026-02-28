import { Upload, Globe, FileText, Sparkles } from "lucide-react";

interface UploadProps {
  document: string;
  setDocument: (value: string) => void;
  fileName: string;
  targetUrl: string;
  setTargetUrl: (value: string) => void;
  testName: string;
  setTestName: (value: string) => void;
  generateAdditional: boolean;
  setGenerateAdditional: (value: boolean) => void;
  loading: boolean;
  error: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleDrop: (e: React.DragEvent) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onParse: () => void;
}

export function NewTestRunUpload({
  document,
  setDocument,
  fileName,
  targetUrl,
  setTargetUrl,
  testName,
  setTestName,
  generateAdditional,
  setGenerateAdditional,
  loading,
  error,
  fileInputRef,
  handleDrop,
  handleFileUpload,
  onParse,
}: UploadProps) {
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
            onChange={handleFileUpload}
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
        onClick={onParse}
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
