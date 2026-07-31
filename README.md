# keys

A fullstack app that interacts with the GitHub API.

The Backend API is located at [apps/backend](apps/backend) using [Hono](https://hono.dev/).
The Frontend is located at [apps/frontend](apps/frontend) using [Tanstack Start](https://tanstack.com/start/latest).

## Getting started

[mise](https://mise.jdx.dev/getting-started.html) is used to manage dev tools like Node.js versions.
Run once install run `mise install` to install the tools for this project.

Alternatively, you can look at the [mise.toml](mise.toml) file and install the dependencies with your own tooling.

Run `bun install` to install package dependencies required for the app.

Playwright is used for browser tests. Run `bunx playwright install --with-deps` to install the browser binaries to support running the tests.

## Running the app

To run the app run `turbo run dev`. This will spin up the frontend on port `3000` and the backend on port `3001`.

## Testing

TODO: Document more when setup

## Architecture

TODO: Document API Contract Approach

## Commands

| Command              | What it does                                                          |
| -------------------- | --------------------------------------------------------------------- |
| `turbo run check`    | Lint, format and typechecking.                                        |
| `turbo run generate` | Responsible for code generation. TypeSpec -> OpenAPI -> orval clients |
| `turbo run test`     | Running tests in respective apps/packages.                            |

## Deferred Decisions

- CI/CD monorepo caching.
- Authenticating/Authorization of the backend API.
- The frontend respects GitHub rate-limitting.
- Changing the filters shows a loading state.
- The api-contract package is the source of truth for the auto-generated clients.
- Validate the web app colours meet accessible guidelines
