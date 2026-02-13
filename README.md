# ai-tutor

VS Code extension that adds a **Tutor AI** panel (right sidebar) for Socratic, conceptual help. Uses OpenRouter (Qwen3 Coder Next); reads `OPENROUTER_API_KEY` from the environment. Not tied to any specific course.

## Contents

- VS Code extension (auxiliary bar view “Tutor AI” with chat UI).
- Build: `npm install && npm run compile`.

## Use

Consumers (e.g. course devcontainers) clone this repo, build the extension, and install it into the VS Code server. Requires `OPENROUTER_API_KEY` when using the chat.

## Development

Node 18+. Run from VS Code with “Run Extension” (F5) to test in a new window.
