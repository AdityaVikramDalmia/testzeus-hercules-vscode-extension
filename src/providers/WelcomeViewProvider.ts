/**
 * Provider for welcome view webview panel
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { HERCULES_DIR } from '../constants/paths';
import { ensureHerculesDirectory } from '../utils/filesystem';

/**
 * Manages the welcome view webview panel
 */
export class WelcomeViewProvider {
    public static readonly viewType = 'herculesWelcome';
    
    private _panel: vscode.WebviewPanel | undefined;
    private _context: vscode.ExtensionContext;
    private _disposables: vscode.Disposable[] = [];
    
    /**
     * Creates a new WelcomeViewProvider instance
     * @param context The extension context
     */
    constructor(context: vscode.ExtensionContext) {
        this._context = context;
    }
    
    /**
     * Check if the workspace has the TestZeus Hercules folder
     * @returns True if the folder exists, false otherwise
     */
    public static hasHerculesFolder(): boolean {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            return false;
        }
        
        const herculesDir = path.join(workspaceRoot, HERCULES_DIR);
        return fs.existsSync(herculesDir);
    }
    
    /**
     * Shows the welcome view
     */
    public show() {
        if (this._panel) {
            this._panel.reveal();
            return;
        }
        
        // Create and show panel
        this._panel = vscode.window.createWebviewPanel(
            WelcomeViewProvider.viewType,
            'Welcome to TestZeus Hercules',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(this._context.extensionPath, 'media'))
                ]
            }
        );
        
        // Set the webview's html content
        this._panel.webview.html = this._getHtml();
        
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'initialize':
                        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                        if (workspaceRoot) {
                            const herculesDir = ensureHerculesDirectory(workspaceRoot);
                            if (herculesDir) {
                                await this._createSampleConfigFiles(workspaceRoot, herculesDir);
                            }
                            vscode.window.showInformationMessage('TestZeus Hercules initialized successfully!');
                            this._panel?.dispose();
                        } else {
                            vscode.window.showErrorMessage('No workspace folder is open. Please open a folder to initialize TestZeus Hercules.');
                        }
                        return;
                }
            },
            null,
            this._disposables
        );
        
        // Reset when the panel is disposed
        this._panel.onDidDispose(
            () => {
                this._panel = undefined;
                
                // Dispose of all disposables
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
     * Creates sample configuration files to help users get started
     * @param workspaceRoot The workspace root path
     * @param herculesDir The Hercules directory path
     */
    private async _createSampleConfigFiles(workspaceRoot: string, herculesDir: string): Promise<void> {
        try {
            // Create a sample .env file in the workspace root
            const envFilePath = path.join(workspaceRoot, '.env');
            if (!fs.existsSync(envFilePath)) {
                const envContent = `# TestZeus Hercules Environment Configuration

# Browser Settings
BROWSER_TYPE=chromium
HEADLESS=true
RECORD_VIDEO=true
TAKE_SCREENSHOTS=true
# BROWSER_RESOLUTION=1920,1080
# RUN_DEVICE=iPhone 15 Pro Max

# LLM Configuration (Uncomment and set your values)
# LLM_MODEL_NAME=gpt-4o
# LLM_MODEL_API_KEY=your-api-key-here
# AGENTS_LLM_CONFIG_FILE=./agents_llm_config.json
# AGENTS_LLM_CONFIG_FILE_REF_KEY=openai

# Telemetry Settings
# TELEMETRY_ENABLED=1
# AUTO_MODE=1
`;
                fs.writeFileSync(envFilePath, envContent);
            }
            
            // Create a sample agents_llm_config.json file in the workspace root
            const llmConfigPath = path.join(workspaceRoot, 'agents_llm_config.json');
            if (!fs.existsSync(llmConfigPath)) {
                const llmConfigContent = `{
  "openai": {
    "planner_agent": {
      "model_name": "gpt-4o",
      "model_api_key": "",
      "model_api_type": "openai",
      "llm_config_params": {
        "cache_seed": null,
        "temperature": 0.0,
        "seed": 12345
      }
    },
    "nav_agent": {
      "model_name": "gpt-4o",
      "model_api_key": "",
      "model_api_type": "openai",
      "llm_config_params": {
        "cache_seed": null,
        "temperature": 0.0,
        "seed": 12345
      }
    }
  },
  "anthropic": {
    "planner_agent": {
      "model_name": "claude-3-5-haiku-latest",
      "model_api_key": "",
      "model_api_type": "anthropic",
      "llm_config_params": {
        "cache_seed": null,
        "temperature": 0.0,
        "seed": 12345
      }
    },
    "nav_agent": {
      "model_name": "claude-3-5-haiku-latest",
      "model_api_key": "",
      "model_api_type": "anthropic",
      "llm_config_params": {
        "cache_seed": null,
        "temperature": 0.0,
        "seed": 12345
      }
    }
  }
}`;
                fs.writeFileSync(llmConfigPath, llmConfigContent);
            }
            
            // Create a sample Gherkin feature file
            const inputDir = path.join(herculesDir, 'input');
            const sampleFeaturePath = path.join(inputDir, 'sample.feature');
            if (!fs.existsSync(sampleFeaturePath)) {
                const featureContent = `Feature: Google Search

Scenario: Search for TestZeus on Google
  Given I open a browser
  When I navigate to "https://www.google.com"
  And I enter "TestZeus Hercules" in the search box
  And I click the search button
  Then I should see search results for "TestZeus Hercules"
`;
                fs.writeFileSync(sampleFeaturePath, featureContent);
            }
            
            // Create a sample test data file
            const testDataDir = path.join(herculesDir, 'test_data');
            const sampleDataPath = path.join(testDataDir, 'test_data.json');
            if (!fs.existsSync(sampleDataPath)) {
                const testDataContent = `{
  "credentials": {
    "username": "test_user",
    "password": "test_password"
  },
  "search_terms": [
    "TestZeus Hercules",
    "AI test automation",
    "No-code testing"
  ]
}`;
                fs.writeFileSync(sampleDataPath, testDataContent);
            }
        } catch (error) {
            console.error('Error creating sample configuration files:', error);
        }
    }
    
    /**
     * Gets the HTML for the webview
     * @returns The HTML for the webview
     */
    private _getHtml(): string {
        const nonce = this._getNonce();
        
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
            <title>Welcome to TestZeus Hercules</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    padding: 20px;
                    color: var(--vscode-foreground);
                    max-width: 800px;
                    margin: 0 auto;
                }
                h1 {
                    font-size: 24px;
                    margin-bottom: 10px;
                    text-align: center;
                }
                h2 {
                    font-size: 18px;
                    margin-top: 20px;
                    margin-bottom: 10px;
                }
                .description {
                    font-size: 16px;
                    line-height: 1.5;
                    margin-bottom: 20px;
                    text-align: center;
                }
                .button-container {
                    display: flex;
                    justify-content: center;
                    margin-top: 30px;
                }
                button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 10px 20px;
                    font-size: 14px;
                    cursor: pointer;
                    border-radius: 4px;
                }
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .note {
                    font-size: 14px;
                    font-style: italic;
                    margin-top: 20px;
                    color: var(--vscode-descriptionForeground);
                    text-align: center;
                }
                .features {
                    margin-top: 20px;
                    padding: 20px;
                    background-color: var(--vscode-editor-background);
                    border-radius: 5px;
                }
                .features ul {
                    padding-left: 20px;
                    margin-bottom: 15px;
                }
                .features li {
                    margin-bottom: 10px;
                }
                .config-section {
                    margin-top: 20px;
                    padding: 15px;
                    background-color: var(--vscode-editor-background);
                    border-radius: 5px;
                }
                .config-section h3 {
                    margin-top: 0;
                    margin-bottom: 10px;
                    font-size: 16px;
                }
                .config-section dl {
                    margin: 0;
                }
                .config-section dt {
                    font-weight: bold;
                    margin-top: 10px;
                }
                .config-section dd {
                    margin-left: 15px;
                    margin-bottom: 5px;
                }
                .tabs {
                    margin-top: 20px;
                }
                .tab-buttons {
                    display: flex;
                    gap: 5px;
                    margin-bottom: 10px;
                }
                .tab-button {
                    background-color: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    border: none;
                    padding: 8px 15px;
                    cursor: pointer;
                    border-radius: 3px;
                    font-size: 12px;
                }
                .tab-button.active {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                }
                .tab-content {
                    display: none;
                    padding: 15px;
                    background-color: var(--vscode-editor-background);
                    border-radius: 5px;
                }
                .tab-content.active {
                    display: block;
                }
            </style>
        </head>
        <body>
            <h1>Welcome to TestZeus Hercules</h1>
            <div class="description">
                The first AI tester in a box. Get started with automated testing powered by AI.
            </div>
            
            <div class="features">
                <h2>Key Features:</h2>
                <ul>
                    <li>AI-powered test generation from English descriptions</li>
                    <li>Visual test execution with live view</li>
                    <li>Detailed reporting and screenshots</li>
                    <li>Simple Gherkin syntax for test scenarios</li>
                    <li>No code required - just write tests in natural language</li>
                    <li>Support for Salesforce and complex web applications</li>
                    <li>CI/CD ready with Docker support</li>
                </ul>
            </div>
            
            <div class="tabs">
                <div class="tab-buttons">
                    <button class="tab-button active" data-tab="setup">Setup</button>
                    <button class="tab-button" data-tab="config">Configuration</button>
                    <button class="tab-button" data-tab="llm">LLM Options</button>
                </div>
                
                <div id="setup-tab" class="tab-content active">
                    <h3>Getting Started</h3>
                    <p>Clicking "Initialize" will create a <code>.testzeus-hercules</code> folder in your workspace with the following structure:</p>
                    <ul>
                        <li><code>input/</code> - Store your Gherkin feature files</li>
                        <li><code>output/</code> - View test results (HTML and XML reports)</li>
                        <li><code>logs/</code> - Execution logs</li>
                        <li><code>results/</code> - Test execution results</li>
                        <li><code>screenshots/</code> - Screenshots captured during test runs</li>
                        <li><code>test_data/</code> - Test data files</li>
                        <li><code>cache/</code> - Cache files</li>
                    </ul>
                    <p>The following sample files will also be created in your workspace to help you get started:</p>
                    <ul>
                        <li><code>.env</code> - Sample environment configuration file</li>
                        <li><code>agents_llm_config.json</code> - Sample LLM configuration file</li>
                        <li><code>.testzeus-hercules/input/sample.feature</code> - Sample Gherkin feature file</li>
                        <li><code>.testzeus-hercules/test_data/test_data.json</code> - Sample test data file</li>
                    </ul>
                </div>
                
                <div id="config-tab" class="tab-content">
                    <h3>Key Configuration Options</h3>
                    <dl>
                        <dt>BROWSER_TYPE</dt>
                        <dd>Type of browser (chromium, firefox, webkit). Default: chromium</dd>
                        
                        <dt>HEADLESS</dt>
                        <dd>Run browser in headless mode (true/false). Default: true</dd>
                        
                        <dt>RECORD_VIDEO</dt>
                        <dd>Record test execution videos (true/false). Default: true</dd>
                        
                        <dt>TAKE_SCREENSHOTS</dt>
                        <dd>Take screenshots during test (true/false). Default: true</dd>
                        
                        <dt>BROWSER_RESOLUTION</dt>
                        <dd>Browser window resolution (width,height). Example: 1920,1080</dd>
                        
                        <dt>RUN_DEVICE</dt>
                        <dd>Device to emulate for mobile testing (e.g., "iPhone 15 Pro Max")</dd>
                    </dl>
                </div>
                
                <div id="llm-tab" class="tab-content">
                    <h3>LLM Configuration</h3>
                    <p>TestZeus Hercules supports various LLM providers:</p>
                    <ul>
                        <li>OpenAI (GPT-4o, GPT-4, etc.)</li>
                        <li>Anthropic (Claude 3.5 Haiku and above)</li>
                        <li>Groq</li>
                        <li>Mistral (large and medium models)</li>
                        <li>Ollama (70B+ models)</li>
                        <li>Deepseek Chat v3</li>
                    </ul>
                    <p>Key LLM settings:</p>
                    <dl>
                        <dt>LLM_MODEL_NAME</dt>
                        <dd>LLM model to use (e.g., gpt-4o)</dd>
                        
                        <dt>LLM_MODEL_API_KEY</dt>
                        <dd>API key for the LLM model</dd>
                        
                        <dt>AGENTS_LLM_CONFIG_FILE</dt>
                        <dd>Path to JSON configuration file for custom LLM settings</dd>
                    </dl>
                </div>
            </div>
            
            <div class="button-container">
                <button id="initializeButton">Initialize TestZeus Hercules</button>
            </div>
            
            <div class="note">
                After initialization, you'll need to configure your LLM settings and create Gherkin feature files to start testing.
            </div>
            
            <script nonce="${nonce}">
                const vscode = acquireVsCodeApi();
                
                document.getElementById('initializeButton').addEventListener('click', () => {
                    vscode.postMessage({
                        command: 'initialize'
                    });
                });
                
                // Tab functionality
                document.querySelectorAll('.tab-button').forEach(button => {
                    button.addEventListener('click', () => {
                        // Remove active class from all buttons and content
                        document.querySelectorAll('.tab-button').forEach(b => {
                            b.classList.remove('active');
                        });
                        document.querySelectorAll('.tab-content').forEach(content => {
                            content.classList.remove('active');
                        });
                        
                        // Add active class to current button and content
                        button.classList.add('active');
                        const tabId = button.getAttribute('data-tab');
                        document.getElementById(tabId + '-tab').classList.add('active');
                    });
                });
            </script>
        </body>
        </html>`;
    }
    
    /**
     * Generates a nonce for use in the webview
     * @returns A random nonce
     */
    private _getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
} 