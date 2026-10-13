# MASTER PROMPT — COMPLETE AND VERIFY SELL + VENDOR PORTAL END TO END

## Project

Repository root:

`C:\Users\raghava\OneDrive\Desktop\marketplace-order-fulfillment`

## Source of truth — mandatory

Read and follow this existing document before making implementation decisions:

@VENDOR_PORTAL_AND_MANAGE_PRODUCTS_PLAN.md

Treat this as the source of truth for the intended Vendor Portal, Become a Vendor, vendor onboarding, vendor application lifecycle, and product-management behavior.

**Do not edit, rename, move, regenerate, or overwrite this document.** If the implementation and document disagree, identify the discrepancy, follow the documented intended behavior where safe, and report any conflict that needs a decision. Do not silently change the requirements.

## Objective

Complete and verify the following two entry points and every necessary step behind them:

1. **Vendor Portal**
   `http://localhost:3000/login?redirect=/vendor/dashboard`

2. **Become a vendor**
   `http://localhost:3000/sell`

The work is not complete merely because either page returns HTTP 200, renders a button, or passes mocked tests. Deliver a coherent, secure, functional vendor journey from the storefront through authentication or application submission, admin review, vendor activation, vendor dashboard, and vendor-owned product management, to the extent specified by the source-of-truth document.

Work iteratively until all applicable acceptance criteria below pass or a genuine external blocker is documented with reproducible evidence. Never claim “complete,” “fully working,” or “verified end to end” without the corresponding test evidence.

---

## 1. Mandatory safety and repository-preservation rules

Before changing files:

- Inspect the current branch, `git status --short`, relevant diffs, package scripts, route structure, auth implementation, backend guards, vendor services, and existing tests.
- Read `VENDOR_PORTAL_AND_MANAGE_PRODUCTS_PLAN.md`.
- Establish a baseline test and typecheck report.
- Preserve all pre-existing user changes, tracked modifications, staged changes, and untracked files.
- Do not overwrite existing work merely to make tests pass.
- Do not use `git reset`, `git clean`, blanket restores, broad file deletions, or destructive cleanup.
- Do not stage, commit, push, deploy, or create pull requests.
- Do not alter unrelated features or reformat unrelated files.
- Never read, print, edit, delete, stage, or otherwise access the contents of `cookies.txt`. Avoid broad commands that could expose it.
- Do not edit `VENDOR_PORTAL_AND_MANAGE_PRODUCTS_PLAN.md`.
- Never connect to, inspect through application queries, seed, migrate, reset, or mutate the production `marketplace` database.
- Do not run destructive SQL or database migrations against an unverified database.
- Do not run TypeORM synchronization or disable database safety mechanisms.
- Do not start, stop, rebuild, or modify Docker containers, images, networks, or volumes unless explicitly authorized.
- Do not perform actual vendor applications, admin approvals, product creation, payment operations, or other persistent mutations against a real database without explicit authorization.
- Do not print secrets, environment-file contents, credentials, tokens, cookie values, or personal data into logs or reports.
- Use the repository's existing conventions and smallest targeted changes possible.

Use only an explicitly confirmed isolated test database for integration tests that require persistence. Verify the target database before any test writes. If isolation cannot be proved, do not run that test against a database.

Do not stop and ask for permission for ordinary, reversible code fixes that comply with these rules. If an action would violate one of the safety constraints, use a safe alternative and report the blocker.

---

## 2. Establish the actual architecture before editing

Inspect and map the existing implementation of:

- Storefront `/sell` page.
- Application page, including `/sell/apply` if this is the route defined by the project.
- Login and registration pages.
- `redirect` query parameter handling.
- Auth context/provider and login/logout lifecycle.
- Vendor dashboard and route guards.
- Vendor application frontend API functions.
- Backend vendor-application controller, service, entity, DTOs, validation, and guards.
- Admin application review flow.
- Vendor account activation and vendor ID assignment.
- Vendor-owned product creation, editing, listing, and deletion routes and authorization.
- Database entities, migrations, constraints, and existing seed/test fixtures.
- Existing tests for storefront, login, vendor applications, admin review, dashboard, and product ownership.
- Frontend/backend development ports and API base URL configuration.
- Existing development server processes and health checks, without killing unrelated processes.

Use actual source files and runtime output as evidence. Do not assume a previous report describes the current working tree accurately.

Produce a concise route-and-state map before making broad changes.

---

## 3. Make `/sell` a complete, role-aware entry point

Implement the behavior required by the source-of-truth document.

At minimum, evaluate and correctly support these states:

### Guest

- `/sell` loads and explains how to become a vendor.
- The user can reach a clear application flow without being forced through an unnecessary authentication loop if guest applications are supported by the documented design.
- The application link navigates to the actual application route.
- Any login or registration links preserve a safe, relevant return destination.
- The page never shows authenticated-user content based on stale or fabricated state.

### Authenticated buyer without an application

- The page offers the documented next step to apply.
- It does not show a guest-only state.
- The application route works for an authenticated user.

### Buyer with a pending application

- The page accurately reflects pending status.
- It does not encourage duplicate applications if the documented policy disallows them.
- The user receives a clear explanation of the next step.

### Buyer with an approved application

- The page and backend agree on the user's vendor status and vendor ID.
- The user can navigate to the correct vendor dashboard.
- Access is based on verified server-side authorization, not a client-supplied role alone.

### Buyer with a rejected application

- The page displays the actual application status.
- Any retry/resubmission path follows the documented rules and backend constraints.

### Existing vendor

- The user can open the vendor dashboard.
- Vendor access remains valid after a reload and a fresh login.
- A vendor cannot access another vendor's resources.

### Administrator

- The documented admin review workflow remains accessible to authorized administrators.
- Ordinary buyers and vendors cannot access admin-only routes or operations.

Handle loading, API errors, expired sessions, missing vendor IDs, and empty application lists deliberately. Avoid infinite loading states, silent failures, contradictory status messages, and accidental duplicate requests.

---

## 4. Make the Vendor Portal login URL work correctly

Verify this exact URL:

`http://localhost:3000/login?redirect=/vendor/dashboard`

Acceptance criteria:

- Login page loads correctly.
- The `redirect` parameter is preserved through the authentication flow where appropriate.
- After successful login, an authorized vendor is sent to `/vendor/dashboard`.
- An authenticated user who is not authorized as a vendor is not allowed to access the dashboard merely because the URL requests it.
- Unauthorized users receive the documented safe fallback or appropriate access-denied experience.
- A missing, malformed, external, protocol-relative, or otherwise unsafe redirect cannot produce an open redirect.
- `//evil.example`, external URLs, and dangerous URL schemes must never be treated as valid internal destinations.
- Refreshing the dashboard preserves correct session handling.
- Logging out and logging in as another user does not retain the previous user's vendor data.
- A direct visit to `/vendor/dashboard` without the appropriate session is handled by the real route guard.
- API authorization remains authoritative even if frontend route guards are bypassed.

Use the project's actual role and authentication model. Do not invent new role names or bypass existing guard behavior.

---

## 5. Make the application flow genuinely functional

Inspect and implement the complete application flow specified by the source-of-truth document.

If `/sell/apply` is the correct route, verify it directly.

Required checks:

- Form fields and server-side DTOs agree.
- Required fields and email format are validated on both client and server.
- Input is normalized safely; whitespace-only values are rejected.
- Submission calls the actual frontend API function.
- The request uses the intended authentication behavior for guest versus authenticated applicants.
- Pending submission disables the submit button and prevents duplicate submissions.
- Success and error states are visible and accurate.
- Failure restores the ability to retry.
- Guest success does not incorrectly redirect to an authenticated-only application page.
- Authenticated success follows the documented redirect behavior.
- Reloading does not create another application.
- Existing applications are handled according to the documented duplicate-application policy.
- Backend errors are surfaced without exposing stack traces, secrets, or internal implementation details.

Do not claim that the backend works because a mocked API function resolves successfully.

---

## 6. Verify the backend application lifecycle and security

Inspect the real backend implementation and close any gaps required by the plan.

Check:

- Controller routes and HTTP methods.
- Authentication and optional-authentication behavior.
- DTO validation and server-side normalization.
- Persistence and application status transitions.
- Duplicate application protection.
- Application ownership and visibility.
- Admin-only approval/rejection.
- Prevention of self-approval or unauthorized review.
- Transaction boundaries and concurrent review behavior.
- Consistent vendor activation and vendor ID assignment after approval.
- Correct behavior for anonymous applications if supported by the design.
- Rejection of invalid state transitions.
- Correct status and error codes.
- Vendor dashboard access after approval.
- Product ownership checks for every vendor-scoped read and write endpoint.
- No IDOR vulnerabilities, such as accessing another vendor's application, dashboard data, or products by changing an ID.
- Regression coverage for existing authorization rules.

Preserve existing locking, transactional behavior, ownership checks, and security constraints unless evidence proves a defect. Do not weaken guards simply to make a test pass.

Use unit tests for service logic and isolated integration tests for persistence and authorization. Do not use production data.

---

## 7. Complete the vendor dashboard and product-management journey

Follow the source-of-truth document to determine the required dashboard and product-management scope.

Verify every documented workflow, including applicable actions such as:

- Vendor dashboard loading and error states.
- Vendor identity and status.
- Listing the current vendor's products.
- Creating a product.
- Editing a product.
- Deleting a product if supported.
- Form validation and API error handling.
- Loading, empty, success, and failure states.
- Refresh persistence.
- Product visibility and status.
- Protection against cross-vendor access.
- Appropriate behavior when the session expires or the vendor account is disabled.

Check frontend components, backend routes, DTOs, entity constraints, migrations, and existing tests together.

Do not build unrelated features or silently expand scope beyond the source-of-truth document. If a documented feature depends on unavailable credentials or external infrastructure, implement what can be safely verified locally and record the precise blocker.

---

## 8. Fix the existing failing SellPage tests correctly

Current known results:

- `npm --prefix apps/frontend test -- --runInBand test/sell/apply.mock.spec.tsx`: previously passed 8/8 after rewriting the new untracked test with module-boundary mocks and real React Testing Library interactions.
- `npm --prefix apps/frontend test -- --runInBand test/sell/page.spec.tsx`: previously failed 9 tests because it expects an old informational-only SellPage.
- `npm --prefix apps/frontend run typecheck`: previously passed.

Re-run these commands against the current source. Treat these as historical results, not current proof.

Inspect `apps/frontend/test/sell/page.spec.tsx` and compare it with the current intended behavior in `/sell` and the source-of-truth document.

Update outdated tests to reflect the intended behavior, or fix a genuine implementation regression if the current page is wrong. Do not weaken or delete meaningful assertions simply to obtain a green test result.

The new `apply.mock.spec.tsx` contains real rendered/interacted application-flow tests according to the latest report, but inspect them and ensure they test the current source.

Remove hard-coded fake assertions that test a manually constructed object instead of the actual component. ApplyPage tests must render the actual component and use real user interactions, with API, auth, and router mocked only at external boundaries.

At minimum, test:

1. Guest `/sell` link and correct href.
2. Authenticated buyer branch.
3. Pending application branch.
4. Application form validation.
5. Guest successful submit: API call, confirmation message, no protected-page redirect.
6. Authenticated successful submit: correct router navigation.
7. API failure and retry.
8. Pending promise disables submission and blocks duplicate requests.
9. Safe login redirect behavior.
10. Loading and API error states.
11. Approved/rejected states where implemented.
12. Dashboard guard and vendor ownership authorization.
13. Vendor product-management behavior required by the plan.

Ensure test mocks match the actual exported hooks and provider APIs. Do not try to pass auth state through unsupported props. Avoid accidental real network calls from component tests.

---

## 9. Execute the verification suite in layers

Run the smallest relevant checks first, then expand.

### Frontend focused tests

`npm --prefix apps/frontend test -- --runInBand test/sell/apply.mock.spec.tsx`

`npm --prefix apps/frontend test -- --runInBand test/sell/page.spec.tsx`

Discover and run the existing relevant login, auth, vendor dashboard, application, and product-management test files using the repository's actual Jest configuration. Do not guess nonexistent test paths.

### Frontend static checks

`npm --prefix apps/frontend run typecheck`

Run the frontend lint command defined by `apps/frontend/package.json` and fix issues introduced by this work without altering unrelated files.

### Backend tests and static checks

Discover the actual backend package scripts. Run the relevant vendor application, admin review, authentication/authorization, vendor ownership, and product service/controller tests. Then run the available backend typecheck/build/lint checks using the repository's actual scripts.

### Build

Run the appropriate frontend/backend builds if feasible without modifying Docker or touching production infrastructure.

### Integration

Use only an explicitly verified isolated test database and the project's supported integration-test setup. Confirm the target database name and host without exposing credentials. If isolation cannot be established, skip persistence tests that could write data and report the limitation instead of guessing.

### Browser/runtime verification

When local services are already available or can be run safely without touching Docker or production infrastructure, verify the actual routes in a browser or through HTTP and the frontend/backend API boundary.

Verify the actual user journey, not just HTTP 200:

1. Open `/sell` as a guest.
2. Follow the application link.
3. Submit valid test input against a safe isolated test environment.
4. Confirm the persisted or API-confirmed result.
5. Sign in using a controlled test account if available.
6. Verify the redirect and authorization behavior.
7. Verify application status and approval behavior using safe test fixtures.
8. Verify the approved vendor dashboard.
9. Verify product listing and the documented create/edit/delete workflows using isolated test data.
10. Attempt an unauthorized cross-vendor request and confirm rejection.
11. Reload the page and verify the state remains correct.

Do not fabricate accounts, credentials, backend responses, database persistence, or browser evidence. If a safe test account or isolated environment is unavailable, document the missing prerequisite and still complete all safe unit, component, typecheck, lint, and build verification.

---

## 10. Iteration protocol — do not stop after one green test

Work in focused iterations:

### Iteration 1 — Discovery and baseline

- Read the source-of-truth document.
- Map routes, APIs, guards, application lifecycle, and product-management scope.
- Record baseline status, tests, and failures.
- Identify the exact missing behavior.

### Iteration 2 — Frontend entry points and authentication

- Fix `/sell`, login redirects, and application-page behavior.
- Fix the existing SellPage tests.
- Verify role-aware states and loading/error behavior.

### Iteration 3 — Backend lifecycle and authorization

- Fix application persistence/lifecycle gaps.
- Verify admin review, activation, and ownership protections.
- Add regression tests.

### Iteration 4 — Vendor dashboard and product management

- Complete the plan-defined dashboard/product workflows.
- Verify validation, persistence, error states, and cross-vendor security.

### Iteration 5 — Full regression and final evidence

- Run all relevant tests and static checks.
- Run safe isolated integration/browser checks where available.
- Fix any regressions introduced by the changes.
- Repeat failed checks after fixes.
- Inspect the final diff and `git status --short` without touching forbidden files or unrelated changes.
- Confirm no changes were staged, committed, pushed, or deployed.

If any test fails, determine whether it is a code defect, an outdated test, a configuration issue, or an external blocker. Fix the actual cause where safe. Do not stop at “the remaining test is unrelated” without investigating whether it affects the required journey.

Continue until all locally verifiable acceptance criteria pass. If one criterion cannot be verified because an environment, test account, service, or isolated database is unavailable, state exactly what is missing and how to verify it later. Never promise absolute certainty or hide unresolved failures.

---

## 11. Final report — evidence only

At completion, report:

1. Source-of-truth document read and followed; confirm it was not modified.
2. Files changed and the purpose of each change.
3. Exact behavior completed for `/sell` and `/login?redirect=/vendor/dashboard`.
4. Application, approval, dashboard, and product-management workflows verified.
5. Every executed test command with actual pass/fail counts and exit status.
6. Typecheck, lint, and build results.
7. Integration/browser evidence, explicitly distinguishing mocked tests from real API and persistence tests.
8. Security and cross-vendor authorization checks.
9. Any remaining blocker or unverified acceptance criterion.
10. Final `git status --short` summary, confirming user changes preserved and nothing staged, committed, pushed, or deployed.

Do not report a test as passing if it was not executed. Do not report persistence or end-to-end behavior as verified when only mocks were used.

**Definition of done:** The documented vendor journey works consistently across guest, authenticated buyer, pending applicant, approved vendor, rejected applicant, and administrator states; the login redirect is safe; vendor authorization is enforced server-side; plan-defined product management works; all relevant regression tests and static checks pass; and any environment-dependent verification is backed by explicit evidence or clearly documented as blocked.

Begin by reading `VENDOR_PORTAL_AND_MANAGE_PRODUCTS_PLAN.md`, inspecting the working tree safely, and identifying the current source files and actual failing tests. Then execute the iterations above without destructive repository operations.