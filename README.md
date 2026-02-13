# ai-tutor

VS Code extension that adds a **Tutor AI** panel (right sidebar) for Socratic, conceptual help. Uses OpenRouter (Qwen3 Coder Next); reads `OPENROUTER_API_KEY` from the environment. Not tied to any specific course.

## Contents

- VS Code extension (auxiliary bar view “Tutor AI” with chat UI).
- Build: `npm install && npm run compile`.

## Use

Consumers (e.g. course devcontainers) clone this repo, build the extension, and install it into the VS Code server. Requires `OPENROUTER_API_KEY` when using the chat.

## Test locally

1. **Clone and build:**
   ```bash
   git clone https://github.com/Aurnova/ai-tutor.git && cd ai-tutor
   npm install && npm run compile
   ```
2. **API key** — Set `OPENROUTER_API_KEY` in your environment (get one at [OpenRouter](https://openrouter.ai/settings/keys)). The extension reads it at runtime.
3. **Run the extension** — Open the `ai-tutor` folder in VS Code. Press **F5** (or Run → Start Debugging). A new “Extension Development Host” window opens with the Tutor AI extension loaded.
4. In the new window: open the **right sidebar** (View → Appearance → Secondary Side Bar), then click the **Tutor AI** (book) icon and use the chat.

Your main VS Code window can have `OPENROUTER_API_KEY` set in the environment (e.g. `export OPENROUTER_API_KEY=sk-or-...` in the terminal before starting `code .`), or add it to `.vscode/launch.json` (see below) and run via F5 so the dev host inherits it.

## Development

Node 18+. The repo includes a launch config so F5 runs the extension and passes `OPENROUTER_API_KEY` from your environment into the extension host.
