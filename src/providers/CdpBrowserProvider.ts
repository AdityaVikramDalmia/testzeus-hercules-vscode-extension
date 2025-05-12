/**
 * Provider for displaying CDP browser in VS Code editor
 */

import * as vscode from 'vscode';

/**
 * Manages the creation and handling of CDP browser WebView panels
 */
export class CdpBrowserProvider {
    // Keep track of current panel
    private static currentPanel: vscode.WebviewPanel | undefined;
    
    /**
     * Opens a CDP browser WebView panel
     * @param cdpUrl The CDP URL to open or undefined to prompt for URL
     */
    public static async openBrowser(cdpUrl?: string): Promise<void> {
        // If no URL provided, prompt user for input
        if (!cdpUrl) {
            cdpUrl = await vscode.window.showInputBox({
                prompt: 'Enter CDP endpoint URL',
                placeHolder: 'e.g., http://localhost:9222',
                validateInput: (value) => {
                    if (!value) {
                        return 'URL cannot be empty';
                    }
                    
                    try {
                        new URL(value);
                        return null; // Valid URL
                    } catch (error) {
                        return 'Please enter a valid URL';
                    }
                }
            });
            
            // Return if user canceled
            if (!cdpUrl) {
                return;
            }
        }

        const column = vscode.window.activeTextEditor 
            ? vscode.window.activeTextEditor.viewColumn 
            : vscode.ViewColumn.One;

        // If we already have a panel, show it in the target column
        if (CdpBrowserProvider.currentPanel) {
            CdpBrowserProvider.currentPanel.reveal(column || vscode.ViewColumn.One);
            
            // Update the URL
            CdpBrowserProvider.updateContent(CdpBrowserProvider.currentPanel, cdpUrl);
            return;
        }

        // Create and show a new webview panel
        const panel = vscode.window.createWebviewPanel(
            'cdpBrowser', // Identifier
            `CDP Browser: ${cdpUrl}`, // Title
            column || vscode.ViewColumn.One, // Show in the active column, fallback to first column
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                // Allow all resources to load within iframe
                localResourceRoots: []
            }
        );

        // Set the panel's content
        CdpBrowserProvider.updateContent(panel, cdpUrl);

        // Track the current panel
        CdpBrowserProvider.currentPanel = panel;

        // Reset when the current panel is closed
        panel.onDidDispose(
            () => {
                CdpBrowserProvider.currentPanel = undefined;
            },
            null,
            []
        );
    }

    /**
     * Updates the content of the WebView panel with the given CDP URL
     * @param panel The WebView panel to update
     * @param cdpUrl The CDP URL to load
     */
    private static updateContent(panel: vscode.WebviewPanel, cdpUrl: string): void {
        // Set the HTML content with an iframe pointing to the CDP URL
        panel.webview.html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>CDP Browser</title>
                <style>
                    body, html, iframe {
                        margin: 0;
                        padding: 0;
                        width: 100%;
                        height: 100%;
                        overflow: hidden;
                    }
                    
                    .loading {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        font-family: Arial, sans-serif;
                        font-size: 16px;
                        color: #666;
                    }
                    
                    .spinner {
                        border: 4px solid rgba(0, 0, 0, 0.1);
                        border-left-color: #767676;
                        border-radius: 50%;
                        width: 20px;
                        height: 20px;
                        animation: spin 1s linear infinite;
                        margin-right: 10px;
                    }
                    
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            </head>
            <body>
                <div id="loading" class="loading">
                    <div class="spinner"></div>
                    <span>Loading CDP browser...</span>
                </div>
                <iframe id="cdpFrame" src="${cdpUrl}" width="100%" height="100%" frameborder="0" style="display: none;"></iframe>
                <script>
                    // Handle iframe loading
                    const iframe = document.getElementById('cdpFrame');
                    const loading = document.getElementById('loading');
                    
                    iframe.onload = function() {
                        loading.style.display = 'none';
                        iframe.style.display = 'block';
                    };
                    
                    iframe.onerror = function() {
                        loading.innerHTML = 'Error loading CDP content. Please check the URL and try again.';
                    };
                </script>
            </body>
            </html>
        `;
        
        // Update the panel title with the URL
        panel.title = `CDP Browser: ${cdpUrl}`;
    }
}
