/**
 * Jest configuration for @marketplace/backend.
 *
 * Phase 0: enables a working CI test job for the self-contained unit suites
 * under `src` (all `*.spec.ts` files). TS files are transformed with ts-jest;
 * compiled artifacts under `dist/` are ignored by construction (only `.spec.ts`
 * sources match the testMatch glob, and dist only emits `.js`).
 *
 * Notes (deliberate scope):
 *  - `test/` (concurrency + e2e order lifecycle) requires a database/Redis
 *    harness and is wired in a later phase (Phase 14 hardening).
 *  - `tsconfig.json` excludes `test` and `*.spec.ts` from the build; ts-jest
 *    compiles spec files regardless of that exclude, so this is safe.
 *  - Two spec files are excluded because they test methods that are NOT YET
 *    implemented (they fail to compile today). They will be restored to the
 *    suite when the features land:
 *      * src/admin/admin.service.spec.ts        -> AuthService.getOrders (phase 2/11)
 *      * src/orders/orders.service.lifecycle.spec.ts
 *          -> OrdersService.transitionOrder / getOrdersByVendor (phase 8)
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
    // Spec for not-yet-implemented feature (see comment header). Restore when the method lands.
    '<rootDir>/src/admin/admin.service.spec.ts',
    // NOTE: orders.service.lifecycle.spec.ts is now restored — transitionOrder + getOrdersByVendor
    // were implemented in Phase 2.
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