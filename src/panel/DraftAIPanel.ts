import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import type { WebviewMessage } from "../types";

export class DraftAIPanel implements vscode.WebviewViewProvider {
  public static readonly viewType = "draftai.mainView";

  private _view?: vscode.WebviewView;
  private _messageHandler?: (message: WebviewMessage) => void;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  /**
   * Set the handler for messages received from the webview.
   */
  onMessage(handler: (message: WebviewMessage) => void): void {
    this._messageHandler = handler;
  }

  /**
   * Send a message to the webview.
   */
  postMessage(message: WebviewMessage): void {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  /**
   * Called by VS Code when the webview view is resolved.
   */
  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage((message: WebviewMessage) => {
      if (this._messageHandler) {
        this._messageHandler(message);
      }
    });
  }

  /**
   * Generate the HTML content for the webview.
   * In production, loads the bundled React app.
   * In development, loads from the Vite dev server.
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    // Check if the production build exists
    const distPath = path.join(
      this._extensionUri.fsPath,
      "webview-ui",
      "dist"
    );

    if (fs.existsSync(distPath)) {
      return this._getProductionHtml(webview, distPath);
    }

    // Development mode — load from Vite dev server
    return this._getDevHtml();
  }

  private _getProductionHtml(
    webview: vscode.Webview,
    distPath: string
  ): string {
    // Read the index.html from the Vite build output
    const indexPath = path.join(distPath, "index.html");
    if (!fs.existsSync(indexPath)) {
      return this._getFallbackHtml();
    }

    let html = fs.readFileSync(indexPath, "utf-8");

    // Replace relative paths with webview URIs
    const distUri = webview.asWebviewUri(
      vscode.Uri.file(distPath)
    );

    // Replace href="/assets/..." and src="/assets/..." with webview URIs
    html = html.replace(
      /(href|src)="\/assets\//g,
      `$1="${distUri}/assets/`
    );

    // Replace href="/" with empty
    html = html.replace(
      /href="\//g,
      `href="`
    );

    // Add the VS Code webview API script
    const nonce = getNonce();
    const cspSource = webview.cspSource;

    // Insert CSP meta tag
    html = html.replace(
      "<head>",
      `<head>
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${cspSource}; font-src ${cspSource}; img-src ${cspSource} https:; connect-src https://api.longcat.chat https://api.tavily.com;">`
    );

    return html;
  }

  private _getDevHtml(): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Draft AI</title>
      <style>
        body {
          margin: 0;
          padding: 16px;
          font-family: var(--vscode-font-family);
          color: var(--vscode-foreground);
          background: var(--vscode-sideBar-background);
        }
        .dev-message {
          text-align: center;
          padding: 40px 20px;
        }
        .dev-message h2 {
          color: var(--vscode-textLink-foreground);
          margin-bottom: 12px;
        }
        .dev-message p {
          opacity: 0.7;
          line-height: 1.6;
        }
        code {
          background: var(--vscode-textBlockQuote-background);
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 0.9em;
        }
      </style>
    </head>
    <body>
      <div class="dev-message">
        <h2>🐱 Draft AI — Dev Mode</h2>
        <p>Build the webview UI to see the panel:</p>
        <p><code>cd webview-ui && npm run build</code></p>
        <p>Or start the dev server:</p>
        <p><code>cd webview-ui && npm run dev</code></p>
      </div>
    </body>
    </html>`;
  }

  private _getFallbackHtml(): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Draft AI</title>
      <style>
        body {
          margin: 0;
          padding: 16px;
          font-family: var(--vscode-font-family);
          color: var(--vscode-foreground);
          background: var(--vscode-sideBar-background);
        }
      </style>
    </head>
    <body>
      <p>Draft AI panel could not be loaded. Please rebuild the extension.</p>
    </body>
    </html>`;
  }
}

function getNonce(): string {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
