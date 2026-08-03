# keys

A fullstack app that interacts with the GitHub API. Built with assistance from Claude Code.

## Getting started

[mise](https://mise.jdx.dev/getting-started.html) is used to manage dev tools like Node.js versions.
Once it is installed, run `mise install` to install the tools for this project.

Alternatively, you can look at the [mise.toml](mise.toml) file and install the dependencies with your own tooling.

Run `bun install` to install package dependencies required for the app.

Playwright is used for browser tests. Run `bunx playwright install --with-deps` to install the browser binaries to support running the tests.

## Running the app

To run the app, run `turbo run dev`. This will spin up the frontend on port `3000` and the backend on port `3001`.

## Testing

Outside-In TDD is the testing approach for this task, starting with Playwright tests to cover core functionality. Component and unit tests have been used to cover edge cases and accessibility issues.

Tests can be run from the root level of the project by running `turbo run test`.

E2E tests can be run via `turbo run test:e2e`.

## Architecture

A monorepo ([Turborepo](https://turborepo.dev/)) has been used for this task.

The project is split into three core areas:

1. `packages/api-contract`: The source of truth for the API model. Other apps generate their models from this package rather than hand-writing their own, which avoids code drift.
2. `apps/backend`: The backend API. This talks directly to GitHub. The backend API follows the practice of [lightweight clean code](https://blog.serverlessadvocate.com/serverless-lightweight-clean-code-approach-84133c90eeeb).
3. `apps/frontend`: The React frontend built using [Tanstack Start](https://tanstack.com/start/latest). [Shadcn](https://ui.shadcn.com/) has been used for the design system. Feature/domain code lives in [`src/features`](apps/frontend/src/features).

## Commands

| Command              | What it does                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| `turbo run check`    | Lint, format and typechecking.                                                                       |
| `turbo run generate` | Code generation. [TypeSpec](https://typespec.io/) -> OpenAPI -> [orval](https://orval.dev/) clients. |
| `turbo run test`     | Runs non-e2e tests in the respective apps/packages.                                                  |
| `turbo run test:e2e` | Runs e2e tests in the respective apps/packages.                                                      |

## Deferred decisions

- CI/CD monorepo caching.
- Authentication/authorization of the backend API.
- Make the frontend respect Backend API rate-limiting.
- Changing the filters should show a loading state.
- The api-contract package should also generate the codegen clients.
- Validate the web app colours meet accessible guidelines.
- Visual regression testing.
- Add a favicon to the frontend.
