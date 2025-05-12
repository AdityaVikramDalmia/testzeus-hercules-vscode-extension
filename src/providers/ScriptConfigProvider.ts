/**
 * Provider for script configuration editing
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getNonce } from '../utils/security';
import { getWorkspaceRoot } from '../utils/filesystem';

/**
 * Provider for script configuration WebView panel
 */
export class ScriptConfigProvider {
    public static readonly viewType = 'herculesScriptConfig';
    
    private _panel: vscode.WebviewPanel | undefined;
    private _context: vscode.ExtensionContext;
    private _disposables: vscode.Disposable[] = [];
    private _configPath: string = '';
    private _configData: any = {};
    private _isRawMode: boolean = false;
    
    /**
     * Creates a new ScriptConfigProvider instance
     * @param context The extension context
     */
    constructor(context: vscode.ExtensionContext) {
        this._context = context;
    }
    
    /**
     * Opens the script config editor for a config file
     * @param configPath Path to the config file, or undefined to create a new one
     * @param startInRawMode Whether to start in raw JSON edit mode (true) or form mode (false)
     */
    public async open(configPath?: string, startInRawMode: boolean = false) {
        this._isRawMode = startInRawMode;
        
        // If no config path was provided, ask the user for a location to save a new config
        if (!configPath) {
            const workspaceRoot = getWorkspaceRoot();
            if (!workspaceRoot) {
                vscode.window.showErrorMessage('No workspace folder is open');
                return;
            }
            
            const saveLocation = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(path.join(workspaceRoot, 'script-config.json')),
                filters: {
                    'JSON Files': ['json']
                },
                title: 'Create Script Configuration'
            });
            
            if (!saveLocation) {
                return; // User canceled the dialog
            }
            
            configPath = saveLocation.fsPath;
            
            // Initialize with default config data
            this._configData = {
                version: "1.0",
                scriptSettings: {
                    timeout: 30000,
                    retries: 2,
                    screenshots: true
                },
                browser: {
                    type: "chromium",
                    headless: true,
                    resolution: "1920x1080"
                },
                execution: {
                    parallel: false,
                    maxInstances: 1
                }
            };
            
            // Write the initial config file
            try {
                fs.writeFileSync(configPath, JSON.stringify(this._configData, null, 2));
            } catch (err) {
                vscode.window.showErrorMessage(`Failed to create config file: ${err instanceof Error ? err.message : String(err)}`);
                return;
            }
        } else {
            // Try to load the existing config file
            try {
                const fileContent = fs.readFileSync(configPath, 'utf8');
                this._configData = JSON.parse(fileContent);
            } catch (err) {
                vscode.window.showErrorMessage(`Failed to load config file: ${err instanceof Error ? err.message : String(err)}`);
                return;
            }
        }
        
        this._configPath = configPath;
        
        // Create or show the panel
        if (this._panel) {
            this._panel.reveal();
            this._panel.title = 'Script Configuration';
        } else {
            this._createPanel();
        }
        
        // Update the webview content
        this._updateWebviewContent();
    }
    
    /**
     * Creates the WebView panel
     */
    private _createPanel() {
        // Create and show the WebView panel
        this._panel = vscode.window.createWebviewPanel(
            ScriptConfigProvider.viewType,
            'Script Configuration',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(this._context.extensionPath, 'media'))
                ]
            }
        );
        
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'save':
                        await this._saveConfig(message.config);
                        return;
                    
                    case 'toggleView':
                        this._isRawMode = !this._isRawMode;
                        this._updateWebviewContent();
                        return;
                        
                    case 'close':
                        this._panel?.dispose();
                        return;
                }
            },
            null,
            this._disposables
        );
        
        // Clean up resources when the panel is closed
        this._panel.onDidDispose(
            () => {
                this._panel = undefined;
                
                // Dispose all disposables
                while (this._disposables.length) {
                    const disposable = this._disposables.pop();
                    if (disposable) {
                        disposable.dispose();
                    }
                }
            },
            null,
            this._disposables
        );
    }
    
    /**
     * Updates the webview content based on the current configuration and view mode
     */
    private _updateWebviewContent() {
        if (!this._panel) {
            return;
        }
        
        // Set the webview's HTML content
        this._panel.webview.html = this._getHtml();
        
        // Post the current config data to the webview
        this._panel.webview.postMessage({
            command: 'updateConfig',
            config: this._configData,
            isRawMode: this._isRawMode
        });
    }
    
    /**
     * Gets the HTML for the webview
     */
    private _getHtml(): string {
        if (!this._panel) {
            return '';
        }
        
        const nonce = getNonce();
        const configFileName = path.basename(this._configPath);
        
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
            <title>Script Configuration</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    padding: 20px;
                }
                
                h1 {
                    font-size: 24px;
                    font-weight: normal;
                    margin-bottom: 20px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                    padding-bottom: 10px;
                }
                
                .config-actions {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 20px;
                }
                
                button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 12px;
                    cursor: pointer;
                    border-radius: 2px;
                }
                
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                
                .secondary {
                    background-color: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                }
                
                .secondary:hover {
                    background-color: var(--vscode-button-secondaryHoverBackground);
                }
                
                textarea {
                    width: 100%;
                    height: 500px;
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    padding: 10px;
                    font-family: 'Courier New', monospace;
                    resize: vertical;
                }
                
                .form-view {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 20px;
                }
                
                .section {
                    background-color: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 3px;
                    padding: 15px;
                }
                
                .section-title {
                    font-size: 16px;
                    font-weight: bold;
                    margin-bottom: 15px;
                    color: var(--vscode-panelTitle-activeForeground);
                }
                
                .form-group {
                    margin-bottom: 12px;
                }
                
                label {
                    display: block;
                    margin-bottom: 5px;
                }
                
                input[type="text"],
                input[type="number"],
                select {
                    width: 100%;
                    padding: 6px 8px;
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 2px;
                }
                
                input[type="checkbox"] {
                    margin-right: 6px;
                }
                
                .checkbox-label {
                    display: flex;
                    align-items: center;
                }
                
                .description {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    margin-top: 3px;
                }
                
                .error {
                    color: var(--vscode-errorForeground);
                    margin-top: 10px;
                }
            </style>
        </head>
        <body>
            <h1>Script Configuration: ${configFileName}</h1>
            
            <div class="config-actions">
                <button id="toggleViewBtn">${this._isRawMode ? 'Switch to Form View' : 'Switch to Raw JSON'}</button>
                <div>
                    <button class="secondary" id="cancelBtn">Cancel</button>
                    <button id="saveBtn">Save</button>
                </div>
            </div>
            
            <div id="jsonView" style="${this._isRawMode ? '' : 'display: none;'}">
                <textarea id="jsonEditor"></textarea>
                <div id="jsonError" class="error"></div>
            </div>
            
            <div id="formView" style="${this._isRawMode ? 'display: none;' : ''}">
                <div class="form-view">
                    <div class="section">
                        <div class="section-title">General Settings</div>
                        <div class="form-group">
                            <label for="version">Configuration Version</label>
                            <input type="text" id="version" name="version" />
                        </div>
                    </div>
                    
                    <div class="section">
                        <div class="section-title">Script Settings</div>
                        <div class="form-group">
                            <label for="timeout">Timeout (ms)</label>
                            <input type="number" id="timeout" name="timeout" min="1000" />
                            <div class="description">Maximum time in milliseconds to wait for a script step</div>
                        </div>
                        
                        <div class="form-group">
                            <label for="retries">Retries</label>
                            <input type="number" id="retries" name="retries" min="0" />
                            <div class="description">Number of times to retry a failed step</div>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="screenshots" name="screenshots" />
                                Take Screenshots
                            </label>
                            <div class="description">Capture screenshots during test execution</div>
                        </div>
                    </div>
                    
                    <div class="section">
                        <div class="section-title">Browser Settings</div>
                        <div class="form-group">
                            <label for="browserType">Browser Type</label>
                            <select id="browserType" name="browserType">
                                <option value="chromium">Chromium</option>
                                <option value="firefox">Firefox</option>
                                <option value="webkit">WebKit</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="headless" name="headless" />
                                Headless Mode
                            </label>
                            <div class="description">Run browser in headless mode (no UI)</div>
                        </div>
                        
                        <div class="form-group">
                            <label for="resolution">Resolution</label>
                            <input type="text" id="resolution" name="resolution" placeholder="1920x1080" />
                            <div class="description">Browser window resolution (width x height)</div>
                        </div>
                    </div>
                    
                    <div class="section">
                        <div class="section-title">Execution Settings</div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="parallel" name="parallel" />
                                Run Tests in Parallel
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <label for="maxInstances">Maximum Instances</label>
                            <input type="number" id="maxInstances" name="maxInstances" min="1" />
                            <div class="description">Maximum number of parallel test instances</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <script nonce="${nonce}">
                // Acquire VS Code API
                const vscode = acquireVsCodeApi();
                
                // Get DOM elements
                const jsonView = document.getElementById('jsonView');
                const formView = document.getElementById('formView');
                const jsonEditor = document.getElementById('jsonEditor');
                const jsonError = document.getElementById('jsonError');
                const toggleViewBtn = document.getElementById('toggleViewBtn');
                const saveBtn = document.getElementById('saveBtn');
                const cancelBtn = document.getElementById('cancelBtn');
                
                // Store the current configuration
                let currentConfig = {};
                let isRawMode = ${this._isRawMode};
                
                // Handle messages from the extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    
                    switch (message.command) {
                        case 'updateConfig':
                            currentConfig = message.config;
                            isRawMode = message.isRawMode;
                            updateUI();
                            break;
                    }
                });
                
                // Update the UI based on the current configuration
                function updateUI() {
                    if (isRawMode) {
                        // Update JSON editor
                        jsonEditor.value = JSON.stringify(currentConfig, null, 2);
                    } else {
                        // Update form fields
                        document.getElementById('version').value = currentConfig.version || '';
                        
                        // Script settings
                        const scriptSettings = currentConfig.scriptSettings || {};
                        document.getElementById('timeout').value = scriptSettings.timeout || 30000;
                        document.getElementById('retries').value = scriptSettings.retries || 0;
                        document.getElementById('screenshots').checked = scriptSettings.screenshots !== false;
                        
                        // Browser settings
                        const browser = currentConfig.browser || {};
                        document.getElementById('browserType').value = browser.type || 'chromium';
                        document.getElementById('headless').checked = browser.headless !== false;
                        document.getElementById('resolution').value = browser.resolution || '1920x1080';
                        
                        // Execution settings
                        const execution = currentConfig.execution || {};
                        document.getElementById('parallel').checked = execution.parallel === true;
                        document.getElementById('maxInstances').value = execution.maxInstances || 1;
                    }
                }
                
                // Get the configuration from the form
                function getConfigFromForm() {
                    return {
                        version: document.getElementById('version').value,
                        scriptSettings: {
                            timeout: parseInt(document.getElementById('timeout').value, 10),
                            retries: parseInt(document.getElementById('retries').value, 10),
                            screenshots: document.getElementById('screenshots').checked
                        },
                        browser: {
                            type: document.getElementById('browserType').value,
                            headless: document.getElementById('headless').checked,
                            resolution: document.getElementById('resolution').value
                        },
                        execution: {
                            parallel: document.getElementById('parallel').checked,
                            maxInstances: parseInt(document.getElementById('maxInstances').value, 10)
                        }
                    };
                }
                
                // Toggle between JSON and form views
                toggleViewBtn.addEventListener('click', () => {
                    // If we're currently in JSON view, validate the JSON before switching
                    if (isRawMode) {
                        try {
                            currentConfig = JSON.parse(jsonEditor.value);
                            jsonError.textContent = '';
                        } catch (err) {
                            jsonError.textContent = \`Invalid JSON: \${err.message}\`;
                            return;
                        }
                    } else {
                        // Get config from form
                        currentConfig = getConfigFromForm();
                    }
                    
                    // Send message to extension to toggle view
                    vscode.postMessage({ command: 'toggleView' });
                });
                
                // Save configuration
                saveBtn.addEventListener('click', () => {
                    if (isRawMode) {
                        try {
                            const config = JSON.parse(jsonEditor.value);
                            jsonError.textContent = '';
                            vscode.postMessage({ command: 'save', config });
                        } catch (err) {
                            jsonError.textContent = \`Invalid JSON: \${err.message}\`;
                        }
                    } else {
                        const config = getConfigFromForm();
                        vscode.postMessage({ command: 'save', config });
                    }
                });
                
                // Cancel and close
                cancelBtn.addEventListener('click', () => {
                    vscode.postMessage({ command: 'close' });
                });
            </script>
        </body>
        </html>`;
    }
    
    /**
     * Saves the config to the file
     * @param config The config to save
     */
    private async _saveConfig(config: any) {
        if (!this._configPath) {
            return;
        }
        
        try {
            // Update the current config data
            this._configData = config;
            
            // Write to file
            fs.writeFileSync(this._configPath, JSON.stringify(config, null, 2));
            
            vscode.window.showInformationMessage('Script configuration saved successfully');
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to save config: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
} 