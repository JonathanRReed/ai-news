# AI News Hub

This project uses Bun as the JavaScript runtime and package manager.

## Prerequisites

- Bun 1.x installed
  - Install: [bun.sh](https://bun.sh)

## Install dependencies

```sh
bun install
```

This will generate `bun.lock`.

Optionally, you can remove the old `package-lock.json` after verifying everything works.

## Common scripts

```sh
# Start dev server
bun run dev

# Build for production
bun run build

# Preview the production build
bun run preview

# Lint
bun run lint

# Lint and fix
bun run lint:fix
```

## Notes

- `package.json` declares `"packageManager": "bun@1"` and an engine constraint for Bun.
- Astro works seamlessly with Bun; no script changes were required.
