/**
 * Provider for Log Data tree view
 * This provider polls the executions API every 5 seconds and displays a list of test runs
 */

import * as vscode from 'vscode';
import axios from 'axios';
import { LogDataItem } from '../models/LogDataItem';
import { getApiBaseUrl } from '../config/environment';

interface ExecutionData {
    execution_id: string;
    status: string;
    start_time: string;
    end_time: string;
    completed_tests: number;
    total_tests: number;
    failed_tests: number;
    source: string;
}

/**
 * TreeDataProvider for the Log Data tree view
 */
export class LogDataProvider implements vscode.TreeDataProvider<LogDataItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<LogDataItem | undefined | null | void> = new vscode.EventEmitter<LogDataItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<LogDataItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    // Store executions data
    private _executions: ExecutionData[] = [];
    private _refreshInterval: NodeJS.Timeout | undefined;
    
    /**
     * Creates a new LogDataProvider instance
     */
    constructor() {
        // Initial data load
        this.refreshData();
        
        // Setup polling interval (every 5 seconds)
        this._refreshInterval = setInterval(() => {
            this.refreshData();
        }, 5000);
    }
    
    /**
     * Gets the TreeItem for the given element
     * @param element The element to get the TreeItem for
     * @returns The TreeItem for the element
     */
    getTreeItem(element: LogDataItem): vscode.TreeItem {
        return element;
    }
    
    /**
     * Gets the children of the given element
     * @param element The element to get the children for
     * @returns A promise that resolves to the children of the element
     */
    getChildren(element?: LogDataItem): Thenable<LogDataItem[]> {
        if (element) {
            // No sub-items for now
            return Promise.resolve([]);
        } else {
            // Root items - show only running executions
            const runningExecutions = this._executions.filter(execution => execution.status === 'running');
            
            // If there are no running executions, show an informational message
            if (runningExecutions.length === 0) {
                return Promise.resolve([
                    new LogDataItem(
                        'no-running-executions',
                        'No running executions found',
                        '',
                        'info',
                        '',
                        '',
                        0,
                        0,
                        0,
                        vscode.TreeItemCollapsibleState.None,
                        'infoMessage'
                    )
                ]);
            }
            
            return Promise.resolve(
                runningExecutions.map(execution => {
                    // Format date for display
                    const startDate = new Date(execution.start_time);
                    const formattedStartTime = `${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString()}`;
                    
                    // Create display label
                    const displayLabel = `${execution.execution_id.substring(0, 8)}... | running | ${formattedStartTime}`;
                    
                    return new LogDataItem(
                        `log-data-${execution.execution_id}`,
                        displayLabel,
                        execution.execution_id,
                        execution.status,
                        execution.start_time,
                        execution.end_time,
                        execution.completed_tests,
                        execution.total_tests,
                        execution.failed_tests,
                        vscode.TreeItemCollapsibleState.None,
                        'logDataItem'
                    );
                })
            );
        }
    }
    
    /**
     * Refreshes the tree view with data from the API
     */
    async refreshData(): Promise<void> {
        try {
            const apiUrl = `${getApiBaseUrl()}/executions/`;
            console.log(`Fetching executions from: ${apiUrl}`);
            
            const response = await axios.get<ExecutionData[]>(apiUrl);
            this._executions = response.data;
            
            // Notify tree view of data change
            this._onDidChangeTreeData.fire();
        } catch (error) {
            console.error('Failed to fetch execution data:', error);
            // Don't show error to user every 5 seconds - would be annoying
        }
    }
    
    /**
     * Manually refresh the data
     */
    refresh(): void {
        this.refreshData();
    }
    
    /**
     * Dispose of resources when provider is no longer needed
     */
    dispose(): void {
        if (this._refreshInterval) {
            clearInterval(this._refreshInterval);
            this._refreshInterval = undefined;
        }
    }
}
