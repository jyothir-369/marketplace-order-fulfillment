/**
 * Jest configuration for @marketplace/backend.
 *
 * Phase 0: enables a working CI test job for the self-contained unit suites
 * under `src` (all `*.spec.ts` files). TS files are transformed with ts-jest;
 * compiled artifacts under `dist/` are ignored by construction (only `.spec.ts`
 * sources match the testMatch glob, and dist only emits `.js`).
 *
 * Notes (deliberate scope):
 *  - `test/` (e2e order lifecycle) requires a database/Redis harness and is
 *    wired in a later phase (Phase 14 hardening).
 *  - The concurrency suite previously lived at `test/concurrency.spec.ts`;
 *    Phase 4.4 rewrote it against the real pessimistic-lock implementation and
 *    moved it to `src/inventory/inventory.concurrency.spec.ts` so it runs in CI.
 *  - `tsconfig.json` excludes `test` and `*.spec.ts` from the build; ts-jest
 *    compiles spec files regardless of that exclude, so this is safe.
 *
 * CAUTION for future authors: do not write a path containing TWO asterisks
 * followed by a forward slash (e.g. a glob like "src" + "slash-star-star-slash"
 * + "spec.ts") inside this block comment — the "star slash" pair closes the
 * block comment early and breaks parsing.
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  testPathIgnorePatterns: [
    // No exclusions are required anymore:
    //  - admin.service.spec.ts tests an already-implemented feature (Phase 8
    //    orders work landed in Phase 2) and now runs in CI (Phase 4.4).
    //  - orders.service.lifecycle.spec.ts is restored — transitionOrder +
    //    getOrdersByVendor were implemented in Phase 2.
  ],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.spec.ts',
    '!src/**/index.ts',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
};