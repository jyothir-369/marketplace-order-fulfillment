# @repo/config-eslint

Shared ESLint configurations consumed across apps and packages in the marketplace monorepo.

## Files

- `index.js` — shared base rules (no-console, prefer-const, etc.)
- `next.js` — Next.js / React extension of base
- `nest.js` — NestJS extension of base
- `library.js` — alias of base, for shared libraries

## Usage

```js
// apps/frontend/eslint.config.mjs
import base from '@repo/config-eslint/next.js';
export default base;
```