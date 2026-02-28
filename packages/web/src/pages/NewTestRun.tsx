import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import * as api from "../services/api";
import { NewTestRunUpload } from "../components/NewTestRunUpload";
import { NewTestRunReview } from "../components/NewTestRunReview";

export default function NewTestRun() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planId = searchParams.get("planId");

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

  useEffect(() => {
    if (planId) {
      loadExistingPlan(planId);
    }
  }, [planId]);

  async function loadExistingPlan(id: string) {
    setLoading(true);
    try {
      const res = await api.getTestPlan(id);
      setTestPlan(res.testPlan);
      setStep("review");
    } catch (e: any) {
      setError(e.message || "Failed to load test plan");
    } finally {
      setLoading(false);
    }
  }

  // --- File Upload ---
  const handleFileUploadInternal = useCallback(
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

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileUploadInternal(file);
    },
    [handleFileUploadInternal],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileUploadInternal(file);
    },
    [handleFileUploadInternal],
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

  if (step === "upload") {
    return (
      <NewTestRunUpload
        document={document}
        setDocument={setDocument}
        fileName={fileName}
        targetUrl={targetUrl}
        setTargetUrl={setTargetUrl}
        testName={testName}
        setTestName={setTestName}
        generateAdditional={generateAdditional}
        setGenerateAdditional={setGenerateAdditional}
        loading={loading}
        error={error}
        fileInputRef={fileInputRef}
        handleDrop={handleDrop}
        handleFileUpload={handleFileUpload}
        onParse={handleParse}
      />
    );
  }

  if (step === "review" && testPlan) {
    return (
      <NewTestRunReview
        testPlan={testPlan}
        loading={loading}
        error={error}
        planId={planId}
        expandedCase={expandedCase}
        setExpandedCase={setExpandedCase}
        onToggleTestCase={toggleTestCase}
        onStartRun={handleStartRun}
        onBack={() => {
          if (planId) {
            navigate("/dashboard");
          } else {
            setStep("upload");
          }
        }}
      />
    );
  }

  return null;
}
