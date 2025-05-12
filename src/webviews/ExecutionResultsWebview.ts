/**
 * Webview for displaying execution results
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { ExecutionDetail, XmlResultItem } from '../models/ExecutionTreeItems';
import { ArtifactService } from '../services/ArtifactService';

/**
 * WebView for displaying execution results
 */
export class ExecutionResultsWebview {
    public static readonly viewType = 'testzeus-hercules.executionResults';
    private _panel: vscode.WebviewPanel | undefined;
    private _disposables: vscode.Disposable[] = [];
    
    /**
     * Creates a new ExecutionResultsWebview instance
     * @param context Extension context
     */
    constructor(private context: vscode.ExtensionContext) {}
    
    /**
     * Shows the webview for an execution
     * @param executionDetails Execution details to display
     */
    async showResults(executionDetails: ExecutionDetail) {
        // Create or reuse panel
        if (!this._panel) {
            this._panel = vscode.window.createWebviewPanel(
                ExecutionResultsWebview.viewType,
                'Execution Results',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [
                        vscode.Uri.file(path.join(this.context.extensionPath, 'media'))
                    ]
                }
            );
            
            this._panel.onDidDispose(() => {
                this._panel = undefined;
                this.dispose();
            }, null, this._disposables);
        }
        
        // Update title with execution ID for better context
        this._panel.title = `Results: ${executionDetails.execution_id.substring(0, 8)}`;
        
        // Set HTML content with data
        this._panel.webview.html = this.getWebviewContent(executionDetails);
        
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async message => this.handleWebviewMessage(message),
            undefined,
            this._disposables
        );
        
        // Reveal panel
        this._panel.reveal();
    }
    
    /**
     * Generates the HTML content for the webview
     * @param executionDetails Execution details to display
     * @returns HTML content for the webview
     */
    private getWebviewContent(executionDetails: ExecutionDetail): string {
        return `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Execution Results</title>
            <style>
                :root {
                    --vscode-font-family: var(--vscode-editor-font-family);
                    --vscode-font-size: var(--vscode-editor-font-size);
                    --container-padding: 20px;
                    --input-padding-vertical: 6px;
                    --input-padding-horizontal: 4px;
                    --input-margin-vertical: 4px;
                    --input-margin-horizontal: 0;
                }
                
                body {
                    padding: 0 var(--container-padding);
                    color: var(--vscode-foreground);
                    font-size: var(--vscode-font-size);
                    font-family: var(--vscode-font-family);
                    background-color: var(--vscode-editor-background);
                }
                
                /* Header styling */
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                    padding-bottom: 10px;
                }
                
                .status-badge {
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-weight: bold;
                }
                
                .status-success {
                    background-color: var(--vscode-testing-iconPassed, #4BB543);
                    color: var(--vscode-editor-background);
                }
                
                .status-failure {
                    background-color: var(--vscode-testing-iconErrored, #FF3333);
                    color: var(--vscode-editor-background);
                }
                
                .status-running {
                    background-color: var(--vscode-progressBar-background, #0E70C0);
                    color: var(--vscode-editor-background);
                }
                
                /* Styled grid layout for results */
                .result-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 16px;
                    margin-top: 20px;
                }
                
                .result-card {
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 4px;
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                }
                
                .result-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 12px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                    padding-bottom: 8px;
                }
                
                .result-status {
                    font-weight: bold;
                }
                
                .result-status.success {
                    color: var(--vscode-testing-iconPassed, #4BB543);
                }
                
                .result-status.failure {
                    color: var(--vscode-testing-iconErrored, #FF3333);
                }
                
                .test-details {
                    margin-bottom: 12px;
                }
                
                .system-out {
                    margin-top: 10px;
                    margin-bottom: 10px;
                }
                
                .system-out pre {
                    background-color: var(--vscode-editor-background);
                    padding: 8px;
                    border-radius: 4px;
                    overflow-x: auto;
                    border: 1px solid var(--vscode-panel-border);
                }
                
                .result-actions {
                    margin-top: auto;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }
                
                /* Tabs styling */
                .tabs {
                    display: flex;
                    margin-top: 20px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                
                .tab {
                    padding: 8px 16px;
                    cursor: pointer;
                }
                
                .tab.active {
                    border-bottom: 2px solid var(--vscode-focusBorder);
                }
                
                .tab-content {
                    padding: 16px 0;
                }
                
                .tab-panel {
                    display: none;
                }
                
                .tab-panel.active {
                    display: block;
                }
                
                /* Summary styling */
                .execution-summary {
                    background-color: var(--vscode-editor-background);
                    padding: 16px;
                    border-radius: 4px;
                    border: 1px solid var(--vscode-panel-border);
                    margin-bottom: 20px;
                }
                
                .summary-text {
                    margin-top: 10px;
                    white-space: pre-wrap;
                }
                
                /* Button styling */
                button {
                    padding: 6px 12px;
                    color: var(--vscode-button-foreground);
                    background: var(--vscode-button-background);
                    border: none;
                    border-radius: 2px;
                    cursor: pointer;
                }
                
                button:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                
                /* Artifact styles */
                .artifact-section {
                    margin-bottom: 20px;
                }
                
                .artifact-list {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                    gap: 12px;
                }
                
                .artifact-item {
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 4px;
                    padding: 12px;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                }
                
                .artifact-item:hover {
                    background-color: var(--vscode-list-hoverBackground);
                }
                
                .artifact-title {
                    font-weight: bold;
                    margin-bottom: 6px;
                }
                
                .artifact-path {
                    font-size: 0.9em;
                    color: var(--vscode-descriptionForeground);
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>Execution: ${executionDetails.execution_id}</h2>
                <div class="status-badge status-${executionDetails.test_passed ? 'success' : 'failure'}">
                    ${executionDetails.status.toUpperCase()}
                </div>
            </div>
            
            <div class="execution-summary">
                <div>Start Time: ${new Date(executionDetails.start_time).toLocaleString()}</div>
                <div>End Time: ${executionDetails.end_time ? new Date(executionDetails.end_time).toLocaleString() : 'Running...'}</div>
                <div>Tests: ${executionDetails.completed_tests}/${executionDetails.total_tests} (Failed: ${executionDetails.failed_tests})</div>
                
                <h3>Summary</h3>
                <div class="summary-text">${executionDetails.test_summary}</div>
            </div>
            
            <div class="tabs">
                <div class="tab active" data-tab="test-results">Test Results</div>
                <div class="tab" data-tab="artifacts">Artifacts</div>
                <div class="tab" data-tab="logs">Logs</div>
            </div>
            
            <div class="tab-content">
                <div class="tab-panel active" id="test-results">
                    ${this.generateTestResultsHtml(executionDetails)}
                </div>
                <div class="tab-panel" id="artifacts">
                    ${this.generateArtifactsHtml(executionDetails)}
                </div>
                <div class="tab-panel" id="logs">
                    ${this.generateLogsHtml(executionDetails)}
                </div>
            </div>
            
            <script>
                // Acquire vscode API for messaging
                const vscode = acquireVsCodeApi();
                
                // Setup tab switching
                document.querySelectorAll('.tab').forEach(tab => {
                    tab.addEventListener('click', () => {
                        // Remove active class from all tabs
                        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                        
                        // Add active class to clicked tab
                        tab.classList.add('active');
                        document.getElementById(tab.dataset.tab).classList.add('active');
                    });
                });
                
                // Setup artifact buttons
                document.querySelectorAll('.artifact-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        vscode.postMessage({
                            command: 'openArtifact',
                            data: {
                                path: btn.dataset.path,
                                type: btn.dataset.type
                            }
                        });
                    });
                });
                
                // Setup artifact items
                document.querySelectorAll('.artifact-item').forEach(item => {
                    item.addEventListener('click', () => {
                        vscode.postMessage({
                            command: 'openArtifact',
                            data: {
                                path: item.dataset.path,
                                type: item.dataset.type
                            }
                        });
                    });
                });
                
                // Setup test detail buttons
                document.querySelectorAll('.test-details-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        vscode.postMessage({
                            command: 'showTestDetails',
                            data: {
                                testId: btn.dataset.testId,
                                executionId: "${executionDetails.execution_id}"
                            }
                        });
                    });
                });
            </script>
        </body>
        </html>`;
    }
    
    /**
     * Generates HTML for the test results tab
     * @param executionDetails Execution details
     * @returns HTML for the test results tab
     */
    private generateTestResultsHtml(executionDetails: ExecutionDetail): string {
        if (!executionDetails.xml_results || executionDetails.xml_results.length === 0) {
            return '<p>No test results available</p>';
        }
        
        return `
            <div class="result-grid">
                ${executionDetails.xml_results.map(result => `
                    <div class="result-card">
                        <div class="result-header">
                            <span class="test-name">${result.test_name}</span>
                            <span class="result-status ${result.errors_count === 0 && result.failures_count === 0 ? 'success' : 'failure'}">
                                ${result.errors_count === 0 && result.failures_count === 0 ? '✅ PASSED' : '❌ FAILED'}
                            </span>
                        </div>
                        <div class="test-details">
                            <div>Suite: ${result.testsuite_name}</div>
                            <div>Duration: ${result.test_time}s</div>
                            ${result.system_out ? `<div class="system-out">
                                <details>
                                    <summary>System Output</summary>
                                    <pre>${result.system_out}</pre>
                                </details>
                            </div>` : ''}
                        </div>
                        <div class="result-actions">
                            <button 
                                class="artifact-btn" 
                                data-path="${result.property_feature_file}" 
                                data-type="feature">
                                View Feature File
                            </button>
                            <button 
                                class="artifact-btn" 
                                data-path="${result.property_proofs_video}" 
                                data-type="video">
                                View Video
                            </button>
                            <button 
                                class="artifact-btn" 
                                data-path="${result.property_proofs_screenshot}" 
                                data-type="folder">
                                View Screenshots
                            </button>
                            <button 
                                class="test-details-btn" 
                                data-test-id="${result.test_id}">
                                More Details
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * Generates HTML for the artifacts tab
     * @param executionDetails Execution details
     * @returns HTML for the artifacts tab
     */
    private generateArtifactsHtml(executionDetails: ExecutionDetail): string {
        if (!executionDetails.xml_results || executionDetails.xml_results.length === 0) {
            return '<p>No artifacts available</p>';
        }
        
        const artifactSections = executionDetails.xml_results.map(result => {
            return `
                <div class="artifact-section">
                    <h3>${result.test_name}</h3>
                    <div class="artifact-list">
                        ${this.generateArtifactItems(result)}
                    </div>
                </div>
            `;
        });
        
        return artifactSections.join('');
    }
    
    /**
     * Generates HTML for individual artifact items
     * @param testResult Test result
     * @returns HTML for artifact items
     */
    private generateArtifactItems(testResult: XmlResultItem): string {
        const artifacts = [];
        
        // Feature File
        if (testResult.property_feature_file) {
            artifacts.push(`
                <div class="artifact-item" data-path="${testResult.property_feature_file}" data-type="feature">
                    <div class="artifact-title">Feature File</div>
                    <div class="artifact-path">${testResult.property_feature_file}</div>
                </div>
            `);
        }
        
        // Output XML
        if (testResult.property_output_file) {
            artifacts.push(`
                <div class="artifact-item" data-path="${testResult.property_output_file}" data-type="xml">
                    <div class="artifact-title">XML Results</div>
                    <div class="artifact-path">${testResult.property_output_file}</div>
                </div>
            `);
        }
        
        // Video
        if (testResult.property_proofs_video) {
            artifacts.push(`
                <div class="artifact-item" data-path="${testResult.property_proofs_video}" data-type="video">
                    <div class="artifact-title">Video Recording</div>
                    <div class="artifact-path">${testResult.property_proofs_video}</div>
                </div>
            `);
        }
        
        // Screenshots
        if (testResult.property_proofs_screenshot) {
            artifacts.push(`
                <div class="artifact-item" data-path="${testResult.property_proofs_screenshot}" data-type="folder">
                    <div class="artifact-title">Screenshots</div>
                    <div class="artifact-path">${testResult.property_proofs_screenshot}</div>
                </div>
            `);
        }
        
        // Network Logs
        if (testResult.property_network_logs) {
            artifacts.push(`
                <div class="artifact-item" data-path="${testResult.property_network_logs}" data-type="json">
                    <div class="artifact-title">Network Logs</div>
                    <div class="artifact-path">${testResult.property_network_logs}</div>
                </div>
            `);
        }
        
        // Agent Logs
        if (testResult.property_agents_logs) {
            artifacts.push(`
                <div class="artifact-item" data-path="${testResult.property_agents_logs}" data-type="folder">
                    <div class="artifact-title">Agent Logs</div>
                    <div class="artifact-path">${testResult.property_agents_logs}</div>
                </div>
            `);
        }
        
        // Planner Thoughts
        if (testResult.property_planner_thoughts) {
            artifacts.push(`
                <div class="artifact-item" data-path="${testResult.property_planner_thoughts}" data-type="json">
                    <div class="artifact-title">Planner Thoughts</div>
                    <div class="artifact-path">${testResult.property_planner_thoughts}</div>
                </div>
            `);
        }
        
        return artifacts.join('');
    }
    
    /**
     * Generates HTML for the logs tab
     * @param executionDetails Execution details
     * @returns HTML for the logs tab
     */
    private generateLogsHtml(executionDetails: ExecutionDetail): string {
        if (!executionDetails.xml_results || executionDetails.xml_results.length === 0) {
            return '<p>No logs available</p>';
        }
        
        const logItems = executionDetails.xml_results.map(result => {
            return `
                <div class="result-card">
                    <div class="result-header">
                        <span class="test-name">${result.test_name}</span>
                    </div>
                    <div class="test-details">
                        ${result.final_response ? `
                            <h4>Final Response</h4>
                            <pre>${result.final_response}</pre>
                        ` : ''}
                        
                        ${result.property_plan ? `
                            <h4>Test Plan</h4>
                            <pre>${result.property_plan}</pre>
                        ` : ''}
                    </div>
                    <div class="result-actions">
                        <button 
                            class="artifact-btn" 
                            data-path="${result.property_planner_thoughts}" 
                            data-type="json">
                            View Planner Thoughts
                        </button>
                        <button 
                            class="artifact-btn" 
                            data-path="${result.property_agents_logs}" 
                            data-type="folder">
                            View Agent Logs
                        </button>
                    </div>
                </div>
            `;
        });
        
        return `
            <div class="result-grid">
                ${logItems.join('')}
            </div>
        `;
    }
    
    /**
     * Handles messages from the webview
     * @param message Message from the webview
     */
    private async handleWebviewMessage(message: any) {
        const { command, data } = message;
        
        switch (command) {
            case 'openArtifact':
                if (data && data.path) {
                    const artifactService = ArtifactService.getInstance();
                    await artifactService.openArtifact(data.path, data.type);
                }
                break;
                
            case 'showTestDetails':
                if (data && data.testId && data.executionId) {
                    vscode.commands.executeCommand('testzeus-hercules.showTestDetails', data.testId, data.executionId);
                }
                break;
        }
    }
    
    /**
     * Disposes resources
     */
    dispose() {
        this._panel = undefined;
        
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
