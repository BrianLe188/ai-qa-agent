# 🔄 Core Workflows

This document illustrates the two primary workflows of the **AI QA Agent**: Plan Creation and Test Execution (Self-Healing).

## 1. Parse & Create Test Plan

When a user provides testing documentation (e.g. a PR description, User Story, or raw instructions), the AI parses it into a structured Test Plan containing individual test cases and steps.

```mermaid
sequenceDiagram
    participant User as User (Web UI)
    participant API as API Server (Elysia)
    participant LLM as AI Parser (OpenAI/GPT)
    participant DB as Memory (SQLite)

    User->>API: Upload Document or paste raw instructions
    API->>LLM: Send raw content for extraction
    LLM-->>API: Return structured Test Cases & Steps
    API-->>User: Display parsed Test Plan for review
    User->>User: Enable/disable cases & verify steps
    User->>API: Save Test Plan
    API->>DB: Persist Test Plan and Cases
    API-->>User: Ready to execute
```

## 2. Test Execution & Self-Healing (Cognitive Runner)

This is the core execution loop. It relies on a high-speed **Fast Path** (instant execution using memory) and a robust **Slow Path** (AI-driven self-healing when UI changes occur).

```mermaid
flowchart TD
    Start([Start Test Run]) --> InitBrowser[Init Playwright Browser]
    InitBrowser --> LoadTestCase[Load list of Test Cases]

    LoadTestCase --> LoopCases{More Test Cases?}
    LoopCases -- No --> GenerateReport[Generate summary & Report]
    GenerateReport --> End([End Test Run])

    LoopCases -- Yes --> PickCase[Get next Test Case]
    PickCase --> LoopSteps{More Steps?}

    LoopSteps -- No --> MarkCasePass([Mark Case as PASSED])
    MarkCasePass --> LoopCases

    LoopSteps -- Yes --> PickStep[Get next natural language Step]
    PickStep --> CheckMemory[(Search Memory<br/>SQLite & ChromaDB)]

    CheckMemory --> HasMemory{Cached Selector<br/>Found?}
    HasMemory -- "Yes (Fast Path)" --> FingerprintCheck[Perform Fingerprint Sanity Check]

    FingerprintCheck -- "Element Matches" --> ExecFast["Execute Playwright Action (<5ms)"]
    ExecFast -- Error / Timeout --> SlowPath[Fallback to Slow Path]
    ExecFast -- Success --> LoopSteps

    HasMemory -- No --> SlowPath
    FingerprintCheck -- "Element Changed" --> SlowPath

    SlowPath((Slow Path<br/>Self-Healing)) --> DOMSnapshot[Take accessible DOM Snapshot]
    DOMSnapshot --> CallLLM[Call LLM to decompose Step into 1..N Actions]
    CallLLM --> ExecSlow["Execute Action(s) Sequentially"]

    ExecSlow -- Success --> IsSingleAction{N = 1?}
    IsSingleAction -- Yes --> UpdateMemory[(Update Memory with new<br/>Fingerprint & Selector)]
    IsSingleAction -- No --> LoopSteps
    UpdateMemory --> LoopSteps

    ExecSlow -- Error / Timeout --> MarkCaseFail([Mark Case as FAILED])
    MarkCaseFail --> LoopCases
```
