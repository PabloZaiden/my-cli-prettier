# AGENTS.md - AI Coding Agent Guidelines

This document provides guidelines for AI coding agents working on this project.

## General Agentic Workflow

When working on tasks, follow this general workflow to ensure clarity and goal alignment:

- Always make sure you have all your goals written down in a document in `./.planning/plan.md` and agreed upon before starting to code.
- Always use the `Todo` functionality to keep track of the work you're doing, and the last `Todo` should always be "verify that all goals are met according to the document, and update the `Todo` again". Use `./.planning/status.md` to track the plan status.
- Track the status of the work in that document.
- After checking the document, update what the next steps to work on are, and what's important to know about it to be able to continue working on it later.
- Make sure that the goals you are trying to achieve are written down, in a way that you can properly verify them later.
- Don't say something is done until you have verified that all the goals are met.
- The general loop then is:

  1. Write down the goals you want to achieve.
  2. Write the code to achieve those goals.
  3. Verify that all the goals are met.
  4. Update the document with the status of the work.
  5. If all goals are met, you are done.
  6. If not, go back to step 2.

## Project Overview

My CLI is Prettier (than your MCP server) is a CLI tool made with TerminaTUI (https://github.com/PabloZaiden/terminatui) to expose MCP server operations via a CLI. It's a Bun-based and Bun-only application, using TypeScript. As with any other TerminaTUI application, we only care about the operations logic, and the CLI interface + TUIs are generated automatically by TerminaTUI.

For more project information, see the [README.md](README.md).

### TypeScript

- **Strict mode is enabled** - respect all strict checks
- Use inline type annotations for function parameters
- Use `as` for type assertions: `formData.get("key") as string`
- Use `Partial<T>` for optional config objects
- Non-null assertions (`!`) are acceptable when the value is guaranteed
- **Use bracket notation for index signatures**: `process.env["VAR"]` not `process.env.VAR`

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| React Components | PascalCase.tsx | `App.tsx`, `APITester.tsx` |
| TypeScript files | lowercase.ts | `index.ts`, `build.ts` |
| Functions | camelCase | `testEndpoint`, `parseArgs` |
| Variables | camelCase | `responseInputRef`, `formData` |
| Type declarations | kebab-case.d.ts | `bun-env.d.ts` |

### Error Handling

Use try/catch with String conversion for error display:

```typescript
try {
  const data = await res.json();
  // handle success
} catch (error) {
  console.error(String(error));
}
```

### Async Patterns

Use async/await consistently:

```typescript
async GET(req) {
  return Response.json({ message: "Hello" });
}

const handler = async (e: FormEvent) => {
  const res = await fetch(url);
};
```

**CRITICAL: Always await async operations.** Never use fire-and-forget patterns like `.then()` or `.catch()` without `await`:
```typescript
// WRONG - fire and forget, errors are silently swallowed
async POST(req) {
  engine.start().catch((error) => log.error(error));
  return Response.json({ success: true }); // Returns before start() completes!
}

// CORRECT - await all async operations
async POST(req) {
  try {
    await engine.start();
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ success: false, error: String(error) }, { status: 500 });
  }
}
```

### Comments

- Use JSDoc blocks for file-level documentation
- Use inline comments for context and explanations
- Generated files should include origin comment

```typescript
/**
 * This file handles the main application logic.
 */

// Serve index.html for all unmatched routes.
"/*": index,
```

### Formatting

- 2-space indentation
- Double quotes for imports
- Template literals for string interpolation
- Trailing commas in multiline structures

## Bun Specifics

This is a Bun-only project. Never check if something might not be supported in another environment. You can assume Bun is always available.

Always use Bun features and APIs where possible:

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.

## APIs

- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Use `Bun.$` for shell commands instead of execa

```typescript
// File operations
const file = Bun.file("path/to/file");
const content = await file.text();
await Bun.write("path/to/file", content);

// Shell commands
const result = await Bun.$`git status`.text();
```

## Testing

Always run `bun run build` before running tests, to make sure there are no build errors.
Use `bun run test` to run all the tests. Don't do `bun test` directly, since the script cleans a lot of the logs that add noise to the tests.

Always run `bun run test` when you think you are done making changes.

```typescript
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

### Testing Guidelines

- Every new feature **MUST** have unit tests covering its functionality
- Every bug fix **MUST** have a test case that reproduces the bug
- Unit tests should be written alongside implementation, not after
- **100%** of the tests **MUST** pass before considering a feature complete
- A flaky test that fails intermittently **MUST** be fixed. A lot of times, flaky tests indicate deeper issues, race conditions, or bad mock implementations.

### Test Patterns

1. **Unit tests** (`tests/unit/`): Test individual functions and classes

### Avoiding Flaky Tests with Polling

**CRITICAL:** Never use fixed delays (`delay()`, `setTimeout`) to wait for async operations in tests. Fixed delays are inherently flaky because execution time varies across environments.

Instead, use polling helpers that wait for a specific condition to be met.

**Guidelines:**

1. Polling helpers should have reasonable timeouts (10s default) with informative error messages
2. Poll interval should be short (50ms) to minimize test duration
3. Error messages should include the last observed state for debugging
4. If you need to wait for a condition, create a new polling helper rather than using `delay()`

## General Guidelines

- Always prefer simplicity, usability and top level type safety over cleverness.
- Before doing something, check the patterns used in the rest of the codebase.
- Keep the `.planning/status.md` file updated with progress.

## Common Patterns

### Fixing TypeScript Errors

Common fixes:

1. **Unused imports**: Remove or use them
2. **Unused parameters**: Prefix with `_` (e.g., `_unused`)
3. **Index signature access**: Use `obj["prop"]` instead of `obj.prop` for `Record<string, unknown>` and `process.env`
4. **Type-only imports**: Use `import type { X }` for types not used as values
