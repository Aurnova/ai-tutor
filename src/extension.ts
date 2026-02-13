import * as vscode from "vscode";

const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "qwen/qwen3-coder-next";
const TUTOR_SYSTEM = `You are a patient, Socratic tutor for students learning AI and programming.
Your role is to teach and guide, not to do the work for them. Prefer asking questions and giving hints over full answers.
Explain concepts clearly, use examples when helpful, and encourage reasoning. If they ask for direct code or solutions,
steer them toward understanding the idea first, then offer structure or pseudocode before full implementations.
Be encouraging and clear. Keep responses focused and not overly long unless the topic requires it.`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "tutorAI.chat",
      new TutorAIViewProvider(context)
    )
  );
}

class TutorAIViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _history: ChatMessage[] = [];

  constructor(private _context: vscode.ExtensionContext) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [],
    };
    webviewView.webview.html = this._getHtml(webviewView.webview);
    webviewView.webview.onDidReceiveMessage(async (data) => {
      if (data.type === "send" && typeof data.text === "string") {
        await this._sendToTutor(webviewView.webview, data.text);
      }
      if (data.type === "clear") {
        this._history = [];
        webviewView.webview.postMessage({ type: "history", messages: [] });
      }
    });
    webviewView.webview.postMessage({
      type: "history",
      messages: this._history,
    });
  }

  private _getHtml(webview: vscode.Webview): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 12px; font-family: var(--vscode-font-family); font-size: 13px; color: var(--vscode-foreground); background: var(--vscode-editor-background); height: 100vh; display: flex; flex-direction: column; }
    #messages { flex: 1; overflow-y: auto; padding: 8px 0; }
    .msg { margin: 8px 0; padding: 8px 12px; border-radius: 8px; max-width: 95%; white-space: pre-wrap; word-break: break-word; }
    .user { background: var(--vscode-input-background); color: var(--vscode-input-foreground); margin-left: 0; }
    .assistant { background: var(--vscode-textBlockQuote-background); border-left: 3px solid var(--vscode-focusBorder); }
    #inputRow { display: flex; gap: 8px; margin-top: 8px; }
    #input { flex: 1; padding: 8px 12px; border: 1px solid var(--vscode-input-border); background: var(--vscode-input-background); color: var(--vscode-input-foreground); border-radius: 4px; }
    #send { padding: 8px 16px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; cursor: pointer; }
    #send:disabled { opacity: 0.5; cursor: not-allowed; }
    #clear { padding: 8px 12px; background: transparent; color: var(--vscode-foreground); border: 1px solid var(--vscode-input-border); border-radius: 4px; cursor: pointer; font-size: 12px; }
    .loading { opacity: 0.7; }
    .error { color: var(--vscode-errorForeground); }
  </style>
</head>
<body>
  <div id="messages"></div>
  <div id="inputRow">
    <input id="input" type="text" placeholder="Ask your tutor..." />
    <button id="send">Send</button>
    <button id="clear">Clear</button>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    const messagesEl = document.getElementById('messages');
    const inputEl = document.getElementById('input');
    const sendBtn = document.getElementById('send');
    const clearBtn = document.getElementById('clear');

    function render(messages) {
      messagesEl.innerHTML = messages.map(m => '<div class="msg ' + m.role + '">' + escapeHtml(m.content) + '</div>').join('');
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function escapeHtml(s) {
      const div = document.createElement('div');
      div.textContent = s;
      return div.innerHTML;
    }

    window.addEventListener('message', e => {
      const msg = e.data;
      if (msg.type === 'history') render(msg.messages || []);
      if (msg.type === 'append') {
        const last = document.querySelector('#messages .msg:last-child');
        if (last && last.classList.contains('assistant')) last.textContent += msg.content;
        else messagesEl.innerHTML += '<div class="msg assistant">' + escapeHtml(msg.content) + '</div>';
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
      if (msg.type === 'done') { sendBtn.disabled = false; inputEl.focus(); }
      if (msg.type === 'error') { sendBtn.disabled = false; messagesEl.innerHTML += '<div class="msg assistant error">' + escapeHtml(msg.text) + '</div>'; messagesEl.scrollTop = messagesEl.scrollHeight; }
    });

    sendBtn.addEventListener('click', () => {
      const text = inputEl.value.trim();
      if (!text) return;
      vscode.postMessage({ type: 'send', text });
      inputEl.value = '';
      sendBtn.disabled = true;
    });
    inputEl.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendBtn.click(); } });
    clearBtn.addEventListener('click', () => vscode.postMessage({ type: 'clear' }));
  </script>
</body>
</html>`;
  }

  private async _sendToTutor(webview: vscode.Webview, userText: string) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      webview.postMessage({
        type: "error",
        text: "OPENROUTER_API_KEY is not set. Add it in Codespaces secrets and rebuild.",
      });
      return;
    }

    this._history.push({ role: "user", content: userText });
    webview.postMessage({ type: "history", messages: this._history });

    const messages = [
      { role: "system", content: TUTOR_SYSTEM },
      ...this._history.map((m) => ({ role: m.role, content: m.content })),
    ];

    try {
      const res = await fetch(OPENROUTER_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://github.com/Aurnova/ai-tutor",
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          stream: true,
          max_tokens: 4096,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenRouter ${res.status}: ${err}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = "";
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));
          for (const line of lines) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const j = JSON.parse(data);
              const delta = j.choices?.[0]?.delta?.content;
              if (delta) {
                full += delta;
                webview.postMessage({ type: "append", content: delta });
              }
            } catch (_) {}
          }
        }
      }
      this._history.push({ role: "assistant", content: full });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      webview.postMessage({ type: "error", text: message });
    }
    webview.postMessage({ type: "done" });
  }
}
