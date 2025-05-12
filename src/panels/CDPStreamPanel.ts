/**
 * Panel for streaming CDP (Chrome DevTools Protocol) data
 */

import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Manages a WebView panel for streaming CDP data
 */
export class CDPStreamPanel {
    public static currentPanel: CDPStreamPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _cdpUrl: string | undefined;

    /**
     * Creates or shows the CDP Stream Panel
     */
    public static createOrShow(extensionUri: vscode.Uri, cdpUrl?: string) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (CDPStreamPanel.currentPanel) {
            CDPStreamPanel.currentPanel._panel.reveal(column);
            if (cdpUrl) {
                CDPStreamPanel.currentPanel._cdpUrl = cdpUrl;
                CDPStreamPanel.currentPanel._update();
            }
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            'cdpStreamPanel',
            'CDP Stream',
            column || vscode.ViewColumn.One,
            {
                // Enable JavaScript in the webview
                enableScripts: true,
                // Restrict the webview to only load resources from specific locations
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media')
                ],
                // Keep the webview in memory when hidden
                retainContextWhenHidden: true
            }
        );

        CDPStreamPanel.currentPanel = new CDPStreamPanel(panel, extensionUri, cdpUrl);
    }

    /**
     * Creates a new CDPStreamPanel
     */
    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, cdpUrl?: string) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._cdpUrl = cdpUrl;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Update the content based on view changes
        this._panel.onDidChangeViewState(
            e => {
                if (this._panel.visible) {
                    this._update();
                }
            },
            null,
            this._disposables
        );

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'connectToCdp':
                        this._cdpUrl = message.url;
                        this._update();
                        return;
                    case 'error':
                        vscode.window.showErrorMessage(message.text);
                        return;
                    case 'info':
                        vscode.window.showInformationMessage(message.text);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    /**
     * Updates the CDP URL and refreshes the panel
     */
    public updateCdpUrl(cdpUrl: string) {
        this._cdpUrl = cdpUrl;
        this._update();
    }

    /**
     * Disposes this panel
     */
    public dispose() {
        CDPStreamPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    /**
     * Updates the webview content
     */
    private _update() {
        const webview = this._panel.webview;
        this._panel.title = 'CDP Stream';
        webview.html = this._getHtmlForWebview(webview);
    }

    /**
     * Get the HTML content for the webview panel
     */
    private _getHtmlForWebview(webview: vscode.Webview) {
        // Local path to JS file
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'cdpStreamPanel.js')
        );
        
        // Local path to CSS file
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'cdpStreamPanel.css')
        );

        // Use a nonce to allow only specific scripts to be run
        const nonce = getNonce();

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; connect-src ws: wss:;">
            <link href="${styleUri}" rel="stylesheet">
            <title>CDP Stream</title>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>CDP Stream Viewer</h1>
                    <div class="url-container">
                        <input type="text" id="cdpUrlInput" value="${this._cdpUrl || ''}" placeholder="ws://localhost:9222/devtools/page/..." />
                        <button id="connectButton">Connect</button>
                        <button id="clearButton">Clear</button>
                        <div class="status-indicator" id="connectionStatus">Disconnected</div>
                    </div>
                </div>
                <div class="filter-container">
                    <input type="text" id="filterInput" placeholder="Filter CDP events (e.g. Network, Page, DOM)" />
                    <div class="checkbox-container">
                        <label><input type="checkbox" id="autoScroll" checked /> Auto-scroll</label>
                        <label><input type="checkbox" id="formatJson" checked /> Format JSON</label>
                    </div>
                </div>
                <div class="event-list" id="eventList"></div>
            </div>
            <script nonce="${nonce}" src="${scriptUri}"></script>
            <script nonce="${nonce}">
                // Initialize with CDP URL if available
                const initialUrl = ${this._cdpUrl ? `"${this._cdpUrl}"` : 'null'};
                if (initialUrl) {
                    document.getElementById('cdpUrlInput').value = initialUrl;
                    // Connect automatically when URL is provided
                    window.connectToCdpUrl(initialUrl);
                }
            </script>
        </body>
        </html>`;
    }
}

/**
 * Generates a nonce for content security policy
 */
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
