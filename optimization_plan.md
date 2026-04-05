# Optimization & Stabilization Plan - Microwave Show

This plan aims to maximize build and execution performance, resolve infrastructure debt, and ensure zero-defect security and stability for the hackathon project.

## 1. Frontend Performance & Refactoring
- **React Optimization (`CountdownPage.tsx`)**:
  - Implement `memo()` for heavy pure components (Timer, Voice Visualizer).
  - Use `useMemo` for derived status strings and derived style configurations.
  - Move static configuration lookups outside of the component.
  - Pre-load and cache audio contexts.
- **Algorithm Speedup (`client.ts`)**:
  - Replace character-by-character loops in `normalizeTextInput` with a high-performance RegExp.
  - Optimize `fitNarrationWithinDuration` logic for faster sentence trimming.
  - Reduce overhead of rate-limiting logic using efficient bitmasks or simple timestamp comparisons.

## 2. Backend & Infrastructure Stabilization
- **API Router Parallelization (`index.ts`)**:
  - Parallelize LLM and memory queries where possible within Durable Objects.
  - Optimize storage usage using `put({...})` sparingly.
- **Error Boundaries**:
  - Strengthen failover logic for all Cloudflare external AI calls (Gemini, Llama) with standardized JSON error responses.
  - Ensure the browser rendering job is async to prevent blocking the main show feedback.
- **Security**:
  - Add strict CSP (Content Security Policy) headers for both Frontend and Worker responses.
  - Enforce stricter input length limits for all entry routes.

## 3. Build & Compilation Speed
- **Vite Tuning**:
  - Adjust manual chunking to keep chunks below 500KB.
  - Ensure tree-shaking is fully optimized for `lucide-react`.

## 4. Verification & Testing
- **E2E Playwright**: 
  - Run the existing `app-flow.spec.ts` against the optimized build.
  - Add a sub-test specifically for the "AI Remote" mode to verify Durable Object continuity.
- **Build Verification**:
  - Verify zero-error state in TypeScript (TSC) and ESLint.

---

### Step-by-Step Execution Guide

1.  **Refactor `client.ts` (Algorithms)**: Optimize text normalization and duration fitting.
2.  **Refactor `CountdownPage.tsx` (React)**: Implement memoization and move static logic.
3.  **Optimize `index.ts` (Backend Gateway)**: Parallelize DO sub-requests and strengthen error handling.
4.  **Tweak `vite.config.ts`**: Optimize chunking for performance.
5.  **Security Update**: Add CSP and stricter validation.
6.  **Run Playwright**: Verify the whole system.
