# @repo/config-typescript

Shared TypeScript configuration bases consumed by all apps and packages in the marketplace monorepo.

## Available configs

- `base.json` — Common base, strict by default
- `nestjs.json` — Backend NestJS apps (commonjs, decorators, src → dist)
- `nextjs.json` — Frontend Next.js apps (jsx preserve, plugins)
- `library.json` — Reusable shared libraries

## Usage in a package

```jsonc
{
  "extends": "@repo/config-typescript/nestjs.json"
  // or nextjs.json / library.json
}
```

Make sure `@repo/config-typescript` is declared as a `devDependency` using
the workspace protocol (`"@repo/config-typescript": "workspace:*"`).