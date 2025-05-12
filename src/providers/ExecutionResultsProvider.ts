/**
 * Provider for execution results tree view
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { ExecutionResultItem } from '../models/ExecutionResultItem';
import { TestResult } from '../types/results';
import { ensureHerculesDirectory } from '../utils/filesystem';
import { getApiBaseUrl } from '../config/environment';

/**
 * TreeDataProvider for the Execution Results tree view
 */
export class ExecutionResultsProvider implements vscode.TreeDataProvider<ExecutionResultItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ExecutionResultItem | undefined | null | void> = new vscode.EventEmitter<ExecutionResultItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ExecutionResultItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    private _results: TestResult[] = [];
    private _lastExecutedTest: string | null = null;
    private _executions: any[] = [];
    private _pollingInterval: NodeJS.Timeout | null = null;
    private _pollingEnabled: boolean = true;
    
    /**
     * Creates a new ExecutionResultsProvider instance
     * @param workspaceRoot The workspace root path
     */
    constructor(private workspaceRoot: string | undefined) {
        this.loadResults();
        this.startPolling();
    }
    
    /**
     * Starts polling for executions
     */
    startPolling(): void {
        if (this._pollingInterval) {
            clearInterval(this._pollingInterval);
        }
        
        // Poll every 5 seconds
        this._pollingInterval = setInterval(() => {
            if (this._pollingEnabled) {
                this.pollExecutions();
            }
        }, 5000);
        
        // Do an initial poll immediately
        this.pollExecutions();
    }
    
    /**
     * Stops polling for executions
     */
    stopPolling(): void {
        if (this._pollingInterval) {
            clearInterval(this._pollingInterval);
            this._pollingInterval = null;
        }
    }
    
    /**
     * Toggles polling on or off
     */
    togglePolling(): void {
        this._pollingEnabled = !this._pollingEnabled;
        vscode.window.showInformationMessage(`Execution polling ${this._pollingEnabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Polls the executions API for execution results
     */
    async pollExecutions(): Promise<void> {
        try {
            // Use the configured API base URL with trailing slash for proper path handling
            const baseUrl = getApiBaseUrl();
            // Ensure the URL ends with a slash before adding 'executions/'
            const apiUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
            const url = `${apiUrl}executions/`;
            
            console.log(`[ExecutionResultsProvider] Polling executions from: ${url}`);
            
            const response = await axios.get(url, {
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            // Store all execution items
            this._executions = response.data;
            console.log(`[ExecutionResultsProvider] Received ${this._executions.length} executions`);
            this._onDidChangeTreeData.fire();
        } catch (error) {
            // Log error details for debugging
            console.error('[ExecutionResultsProvider] Error polling executions:', error);
            // Keep existing data if there's an error (don't reset)
            this._onDidChangeTreeData.fire();
        }
    }
    
    /**
     * Adds a test result and refreshes the view
     * @param result The test result to add
     */
    addResult(result: TestResult): void {
        this._results.unshift(result); // Add to beginning of array
        this._lastExecutedTest = result.scriptPath;
        this.saveResults();
        this.refresh();
    }
    
    /**
     * Returns the path to the last executed test script
     * @returns The path to the last executed test script or null if none
     */
    getLastExecutedTest(): string | null {
        return this._lastExecutedTest;
    }
    
    /**
     * Refreshes the tree view
     */
    refresh(): void {
        this.pollExecutions();
        this._onDidChangeTreeData.fire();
    }
    
    /**
     * Gets the TreeItem for the given element
     * @param element The element to get the TreeItem for
     * @returns The TreeItem for the element
     */
    getTreeItem(element: ExecutionResultItem): vscode.TreeItem {
        return element;
    }
    
    /**
     * Gets the children of the given element
     * @param element The element to get the children for
     * @returns A promise that resolves to the children of the element
     */
    getChildren(element?: ExecutionResultItem): Thenable<ExecutionResultItem[]> {
        if (!this.workspaceRoot) {
            return Promise.resolve([]);
        }
        
        if (element) {
            // This is a child element (test details)
            return Promise.resolve([]);
        } else {
            // If we have API executions data, show that
            if (this._executions && this._executions.length > 0) {
                // Show API execution results first
                const apiItems: ExecutionResultItem[] = this._executions.map(execution => {
                    // Format the time to be more readable
                    const startTime = new Date(execution.start_time).toLocaleTimeString();
                    
                    // Create title based on status
                    let statusIcon = '';
                    let contextValue = '';
                    
                    if (execution.status === 'running') {
                        statusIcon = '▶️';
                        contextValue = 'execution-running';
                    } else if (execution.status === 'completed') {
                        statusIcon = '✅';
                        contextValue = 'execution-completed';
                    } else if (execution.status === 'failed') {
                        statusIcon = '❌';
                        contextValue = 'execution-failed';
                    } else if (execution.status === 'pending') {
                        statusIcon = '⏳';
                        contextValue = 'execution-pending';
                    } else {
                        statusIcon = '❓';
                        contextValue = 'execution-unknown';
                    }
                    
                    const label = `${statusIcon} ${execution.execution_id.substring(0, 8)}...`;
                    
                    // Create details including time and test counts
                    const endTimeStr = execution.end_time 
                        ? ` | Ended: ${new Date(execution.end_time).toLocaleTimeString()}` 
                        : '';
                    
                    const details = `${execution.status.toUpperCase()} | Started: ${startTime}${endTimeStr}`;
                    const description = `Tests: ${execution.completed_tests}/${execution.total_tests} | Failed: ${execution.failed_tests}`;
                    
                    // Prepare command for viewing logs
                    const command = {
                        command: 'testzeus-hercules.openExecutionLogs',
                        title: 'Open Execution Logs',
                        arguments: [execution.execution_id]
                    };
                    
                    return new ExecutionResultItem(
                        label,
                        details,
                        description,
                        vscode.TreeItemCollapsibleState.None,
                        command,
                        contextValue
                    );
                });
                
                // Sort items by start time (newest first)
                apiItems.sort((a, b) => {
                    const timeA = typeof a.description === 'string' ? a.description.indexOf('Started:') : -1;
                    const timeB = typeof b.description === 'string' ? b.description.indexOf('Started:') : -1;
                    if (timeA > 0 && timeB > 0) {
                        return timeB - timeA;
                    }
                    return 0;
                });
                
                if (apiItems.length === 0) {
                    // If no executions, show placeholder
                    const noExecutionsItem = new ExecutionResultItem(
                        'No Executions Found',
                        'Server may be offline or no executions have been run',
                        '',
                        vscode.TreeItemCollapsibleState.None,
                        undefined,
                        'noExecutions'
                    );
                    return Promise.resolve([noExecutionsItem]);
                }
                
                return Promise.resolve(apiItems);
            }
            
            // Fall back to local results if no API data is available
            const items: ExecutionResultItem[] = this._results.map((result) => {
                const label = `${result.scriptName} (${result.passed ? 'Passed' : 'Failed'})`;
                const description = new Date(result.timestamp).toLocaleString();
                
                return new ExecutionResultItem(
                    label,
                    description,
                    result.summary,
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'testzeus-hercules.openTestReport',
                        title: 'Open Test Report',
                        arguments: [result.report]
                    },
                    result.passed ? 'resultPassed' : 'resultFailed'
                );
            });
            
            if (items.length === 0) {
                // If no results, show placeholder
                const noResultsItem = new ExecutionResultItem(
                    'No Results Found',
                    'Run a test to see results here',
                    '',
                    vscode.TreeItemCollapsibleState.None,
                    undefined,
                    'noResults'
                );
                return Promise.resolve([noResultsItem]);
            }
            
            return Promise.resolve(items);
        }
    }
    
    /**
     * Loads test results from the saved file
     */
    private loadResults(): void {
        if (!this.workspaceRoot) { return; }
        
        try {
            const herculesDir = ensureHerculesDirectory(this.workspaceRoot);
            if (!herculesDir) { return; }
            
            const resultsFile = path.join(herculesDir, 'results.json');
            
            if (fs.existsSync(resultsFile)) {
                const data = fs.readFileSync(resultsFile, 'utf8');
                const results = JSON.parse(data);
                
                // Convert timestamp strings back to Date objects
                this._results = results.map((result: any) => ({
                    ...result,
                    timestamp: new Date(result.timestamp)
                }));
                
                // Set the last executed test if there are results
                if (this._results.length > 0) {
                    this._lastExecutedTest = this._results[0].scriptPath;
                }
            }
        } catch (err) {
            console.error('Failed to load test results:', err);
        }
    }
    
    /**
     * Saves test results to a file
     */
    private saveResults(): void {
        if (!this.workspaceRoot) { return; }
        
        try {
            const herculesDir = ensureHerculesDirectory(this.workspaceRoot);
            if (!herculesDir) { return; }
            
            const resultsFile = path.join(herculesDir, 'results.json');
            fs.writeFileSync(resultsFile, JSON.stringify(this._results), 'utf8');
        } catch (err) {
            console.error('Failed to save test results:', err);
        }
    }
} 