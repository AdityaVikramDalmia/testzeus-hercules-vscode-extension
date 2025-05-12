/**
 * Provider for Test Live View tree view
 */

import * as vscode from 'vscode';
import axios from 'axios';
import { getApiBaseUrl, getWsBaseUrl, getWsLogsUrl } from '../config/environment';
import * as path from 'path';

/**
 * Execution data interface
 */
export interface ExecutionData {
    execution_id: string;
    status: string;
    start_time: string;
    end_time?: string;
    completed_tests: number;
    total_tests: number;
    failed_tests: number;
    source: string;
}

/**
 * TreeItem for execution items
 */
export class ExecutionItem extends vscode.TreeItem {
    // Add support for buttons in the TreeItem
    buttons?: { iconPath: vscode.ThemeIcon; tooltip: string; command: string; arguments?: any[] }[];
    
    constructor(
        public readonly label: string,
        public readonly description: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public command?: vscode.Command,
        public contextValue: string = 'execution',
        public readonly executionId?: string,
        public readonly executionData?: ExecutionData
    ) {
        super(label, collapsibleState);
        this.tooltip = description;
        
        // Add button to open terminal logs if executionId is provided
        if (executionId) {
            this.buttons = [
                {
                    iconPath: new vscode.ThemeIcon('terminal'),
                    tooltip: 'Open logs in terminal',
                    command: 'testzeus-hercules.openExecutionLogs',
                    arguments: [executionId, executionData?.execution_id ? getWsLogsUrl(executionData.execution_id) : undefined]
                }
            ];
        }
    }
}

/**
 * TreeDataProvider for the Test Live View tree view
 */
export class TestLiveViewProvider implements vscode.TreeDataProvider<ExecutionItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ExecutionItem | undefined | null | void> = new vscode.EventEmitter<ExecutionItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ExecutionItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    private _executionItems: ExecutionData[] = [];
    private _pollingInterval: NodeJS.Timeout | null = null;
    private _pollingEnabled: boolean = true;
    
    /**
     * Creates a new TestLiveViewProvider instance
     * @param workspaceRoot The workspace root path
     */
    constructor(private workspaceRoot: string | undefined) {
        // Start polling immediately
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
     * Polls the executions API for running executions
     */
    async pollExecutions(): Promise<void> {
        try {
            // Use the configured API base URL with trailing slash to ensure proper path handling
            const baseUrl = getApiBaseUrl();
            // Ensure the URL ends with a slash before adding 'executions/'
            const apiUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
            const url = `${apiUrl}executions/`;
            
            console.log(`--------------------------------------------`);
            console.log(`TEST LIVE VIEW: Polling executions from: ${url}`);
            
            const response = await axios.get(url, {
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            // Store all execution items for display
            this._executionItems = response.data;
            console.log(`TEST LIVE VIEW: Success! Received ${this._executionItems.length} executions`);
            console.log(`TEST LIVE VIEW: Sample data:`, JSON.stringify(this._executionItems.slice(0, 2)));
            console.log(`--------------------------------------------`);
            
            this._onDidChangeTreeData.fire();
        } catch (error) {
            // Log error details for debugging
            console.error('TEST LIVE VIEW: Error polling executions:', error);
            console.log(`--------------------------------------------`);
            
            // Quietly fail as the server might not be running
            this._executionItems = [];
            this._onDidChangeTreeData.fire();
        }
    }
    
    /**
     * Refreshes the tree view
     */
    refresh(): void {
        console.log('TEST LIVE VIEW: Manual refresh triggered');
        this.pollExecutions();
    }
    
    /**
     * Gets the TreeItem for the given element
     * @param element The element to get the TreeItem for
     * @returns The TreeItem for the element
     */
    getTreeItem(element: ExecutionItem): vscode.TreeItem {
        return element;
    }
    
    /**
     * Gets the children of the given element
     * @param element The element to get the children for
     * @returns A promise that resolves to the children of the element
     */
    getChildren(element?: ExecutionItem): Thenable<ExecutionItem[]> {
        if (!this.workspaceRoot) {
            return Promise.resolve([]);
        }
        
        if (element) {
            // This provider doesn't have nested items
            return Promise.resolve([]);
        } else {
            // Root level - show all executions or status message
            if (this._executionItems.length === 0) {
                const noExecutionsItem = new ExecutionItem(
                    'No Executions Found',
                    'Server may be offline or no executions have been run',
                    vscode.TreeItemCollapsibleState.None,
                    undefined,
                    'noExecutions'
                );
                noExecutionsItem.iconPath = new vscode.ThemeIcon('debug-disconnect');
                return Promise.resolve([noExecutionsItem]);
            }
            
            // Map all execution items to tree items
            const items = this._executionItems.map(execution => {
                // Format the time to be more readable
                const startTime = new Date(execution.start_time).toLocaleTimeString();
                
                // Create title based on status
                let title = '';
                let statusIcon = '';
                const shortId = execution.execution_id.substring(0, 10);
                
                if (execution.status === 'running') {
                    statusIcon = '▶️';
                    title = `${statusIcon} RUNNING: ${shortId}...`;
                } else if (execution.status === 'completed') {
                    // Display with check mark - completed tests
                    const failedTests = execution.failed_tests || 0;
                    if (failedTests > 0) {
                        // Completed but with failed tests
                        statusIcon = '⚠️';
                        title = `${statusIcon} COMPLETED WITH ISSUES: ${shortId}...`;
                    } else {
                        statusIcon = '✅';
                        title = `${statusIcon} COMPLETED SUCCESS: ${shortId}...`;
                    }
                } else if (execution.status === 'failed') {
                    statusIcon = '❌';
                    title = `${statusIcon} FAILED: ${shortId}...`;
                } else if (execution.status === 'pending') {
                    statusIcon = '⏳';
                    title = `${statusIcon} PENDING: ${shortId}...`;
                } else {
                    statusIcon = '❓';
                    title = `${statusIcon} ${execution.status.toUpperCase()}: ${shortId}...`;
                }
                
                // Create details including time and test counts with better formatting
                let startDateTime, endDateTime;
                let details = '';
                
                try {
                    startDateTime = new Date(execution.start_time);
                    const formattedStartTime = startDateTime.toLocaleTimeString();
                    const formattedStartDate = startDateTime.toLocaleDateString();
                    
                    // Handle end time if available
                    let endTimeStr = '';
                    if (execution.end_time) {
                        endDateTime = new Date(execution.end_time);
                        const formattedEndTime = endDateTime.toLocaleTimeString();
                        endTimeStr = ` | Ended: ${formattedEndTime}`;
                        
                        // If test is complete, calculate duration
                        if (execution.status === 'completed' || execution.status === 'failed') {
                            const durationMs = endDateTime.getTime() - startDateTime.getTime();
                            const durationSec = Math.floor(durationMs / 1000);
                            const minutes = Math.floor(durationSec / 60);
                            const seconds = durationSec % 60;
                            endTimeStr += ` (${minutes}m ${seconds}s)`;
                        }
                    }
                    
                    // Format the test stats part
                    const statsStr = execution.total_tests > 0 ?
                        `Tests: ${execution.completed_tests}/${execution.total_tests} | Failed: ${execution.failed_tests || 0}` :
                        `Tests: ${execution.completed_tests || 0} | Failed: ${execution.failed_tests || 0}`;
                    
                    // Create the full details string
                    details = `${formattedStartDate} | Started: ${formattedStartTime}${endTimeStr} | ${statsStr} | Source: ${execution.source}`;
                } catch (error) {
                    console.error('Error formatting execution times:', error);
                    details = `Started: ${execution.start_time} | Tests: ${execution.completed_tests || 0}/${execution.total_tests || 0} | Failed: ${execution.failed_tests || 0}`;
                }
                
                // Set context value based on status
                let contextValue = `execution-${execution.status}`;
                if (execution.status === 'completed') {
                    const failedTests = execution.failed_tests || 0;
                    if (failedTests > 0) {
                        contextValue = 'execution-completed-issues';
                    } else {
                        contextValue = 'execution-completed-success';
                    }
                }
                
                // Prepare command for all executions using the configured WebSocket URL
                const command = {
                    command: 'testzeus-hercules.openExecutionLogs',
                    title: 'View Logs in Terminal',
                    tooltip: 'Open logs in a terminal using socat',
                    arguments: [execution.execution_id, getWsLogsUrl(execution.execution_id)]
                };
                
                // Create the execution item
                const item = new ExecutionItem(
                    title,
                    details,
                    vscode.TreeItemCollapsibleState.None,
                    command,
                    contextValue,
                    execution.execution_id,
                    execution
                );
                
                // Add the terminal icon for the redirect button
                item.tooltip = `${details}\n\nClick to open logs in terminal using 'socat' command`;
                item.command = command;
                
                // Add contextValue for context menu actions if needed
                item.contextValue = `${contextValue}-with-terminal-redirect`;
                
                // Set the appropriate icon based on status with better distinctions
                if (execution.status === 'running') {
                    // Running execution - show the pulse icon
                    item.iconPath = new vscode.ThemeIcon('pulse');
                } else if (execution.status === 'completed') {
                    const failedTests = execution.failed_tests || 0;
                    if (failedTests > 0) {
                        // Completed but with failed tests - warning icon
                        item.iconPath = new vscode.ThemeIcon('warning');
                    } else {
                        // Successfully completed - check mark
                        item.iconPath = new vscode.ThemeIcon('check');
                    }
                } else if (execution.status === 'failed') {
                    // Failed execution - error icon
                    item.iconPath = new vscode.ThemeIcon('error');
                } else if (execution.status === 'pending') {
                    // Pending execution - clock icon
                    item.iconPath = new vscode.ThemeIcon('clock');
                } else {
                    // Unknown status - question mark
                    item.iconPath = new vscode.ThemeIcon('question');
                }
                
                return item;
            });
            
            // Sort items by start time (newest first)
            items.sort((a, b) => {
                if (a.executionData && b.executionData) {
                    const dateA = new Date(a.executionData.start_time);
                    const dateB = new Date(b.executionData.start_time);
                    return dateB.getTime() - dateA.getTime();
                }
                return 0;
            });
            
            // Log the executions we found for debugging
            console.log(`Found ${items.length} executions:`, 
                items.map(item => `${item.label} - ${item.executionData?.status}`).join('\n')
            );
            
            return Promise.resolve(items);
        }
    }
    
    /**
     * Disposes of resources
     */
    dispose(): void {
        this.stopPolling();
    }
}
