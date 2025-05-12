/**
 * Provider for Enhanced Execution Results tree view
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { getApiBaseUrl } from '../config/environment';
import {
    ExecutionBrief,
    ExecutionDetail,
    CachedExecution,
    ExecutionTreeItem,
    ExecutionItem,
    TestResultItem,
    ArtifactItem,
    XmlResultItem
} from '../models/ExecutionTreeItems';

/**
 * Class to represent an error item in the tree view
 */
class ErrorResultItem extends ExecutionTreeItem {
    constructor(error: any, executionId: string) {
        // Create a unique ID to avoid conflicts
        const uniqueId = `${executionId}:error`;
        
        super(
            'Error Loading Test Results',
            vscode.TreeItemCollapsibleState.None,
            'testResult',
            uniqueId,
            executionId
        );
        this.description = 'An error occurred while loading test results';
        this.tooltip = String(error);
        this.iconPath = new vscode.ThemeIcon('error');
        this.contextValue = 'execution-error';
    }
}

/**
 * Class to represent a no results item in the tree view
 */
class NoResultsItem extends ExecutionTreeItem {
    constructor(executionId: string) {
        // Create a unique ID to avoid conflicts
        const uniqueId = `${executionId}:no-results`;
        
        super(
            'No Test Results Available',
            vscode.TreeItemCollapsibleState.None,
            'testResult',
            uniqueId,
            executionId
        );
        this.description = 'No test results were found for this execution';
        this.tooltip = 'No test results available';
        this.iconPath = new vscode.ThemeIcon('info');
        this.contextValue = 'no-results';
    }
}

/**
 * Class to represent when no executions are found
 */
class NoExecutionsItem extends ExecutionTreeItem {
    constructor() {
        super(
            'No Executions Found',
            vscode.TreeItemCollapsibleState.None,
            'execution',
            'no-executions'
        );
        this.description = 'Server may be offline or no executions have been run';
        this.iconPath = new vscode.ThemeIcon('debug-disconnect');
        this.contextValue = 'no-executions';
    }
}

/**
 * Class to represent an execution summary in the tree view
 */
class SummaryTestItem extends ExecutionTreeItem {
    constructor(executionDetail: ExecutionDetail) {
        // Create a unique ID by combining execution ID with 'summary' to avoid conflicts
        const uniqueId = `${executionDetail.execution_id}:summary`;
        
        super(
            'Execution Summary',
            vscode.TreeItemCollapsibleState.None,
            'testResult',
            uniqueId,
            executionDetail.execution_id
        );
        this.description = `${executionDetail.status.toUpperCase()} | Tests: ${executionDetail.completed_tests}/${executionDetail.total_tests}`;
        this.tooltip = `Execution Summary\nStatus: ${executionDetail.status.toUpperCase()}\n${executionDetail.test_summary}`;
        this.iconPath = new vscode.ThemeIcon('info');
        this.contextValue = 'execution-summary';
    }
}

/**
 * TreeDataProvider for the Enhanced Execution Results tree view
 */
export class EnhancedExecutionResultsProvider implements vscode.TreeDataProvider<ExecutionTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<ExecutionTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    // Using Map for efficient caching of execution details
    private _executionsCache = new Map<string, CachedExecution>();
    private _pollingInterval: NodeJS.Timeout | null = null;
    private _pollingEnabled: boolean = true;
    
    /**
     * Creates a new EnhancedExecutionResultsProvider instance
     * @param context Extension context
     */
    constructor(private context: vscode.ExtensionContext) {
        // Start polling for execution updates
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
            const apiBaseUrl = getApiBaseUrl();
            const url = `${apiBaseUrl}/executions`;
            console.log(`[EnhancedExecutionResultsProvider] Polling executions from: ${url}`);
            
            const response = await axios.get(url);
            
            // Process only changed or new executions
            const executions = response.data as ExecutionBrief[];
            let hasChanges = false;
            
            for (const execution of executions) {
                const cached = this._executionsCache.get(execution.execution_id);
                
                // Only fetch details if execution has completed or failed since last poll
                if (!cached || 
                    (execution.status !== cached.brief.status && 
                    (execution.status === 'completed' || execution.status === 'failed'))) {
                    hasChanges = true;
                    // Lazy-load the full details only when needed
                    this._executionsCache.set(execution.execution_id, {
                        brief: execution,
                        details: null // Will be loaded on demand when expanding the node
                    });
                } else if (cached) {
                    // Update brief info if it changed
                    if (JSON.stringify(cached.brief) !== JSON.stringify(execution)) {
                        hasChanges = true;
                        this._executionsCache.set(execution.execution_id, {
                            brief: execution,
                            details: cached.details
                        });
                    }
                }
            }
            
            if (hasChanges) {
                console.log(`[EnhancedExecutionResultsProvider] Changes detected, refreshing tree view`);
                this._onDidChangeTreeData.fire();
            }
        } catch (error) {
            console.error('[EnhancedExecutionResultsProvider] Error polling executions:', error);
        }
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
    getTreeItem(element: ExecutionTreeItem): vscode.TreeItem {
        return element;
    }
    
    /**
     * Gets the children of the given element
     * @param element The element to get the children for
     * @returns A promise that resolves to the children of the element
     */
    async getChildren(element?: ExecutionTreeItem): Promise<ExecutionTreeItem[]> {
        if (!element) {
            // Root level - display all executions sorted by start time (newest first)
            return this.getExecutionList();
        } else if (element.itemType === 'execution') {
            // Load test results for this execution
            return this.getTestResultsForExecution(element.id);
        } else if (element.itemType === 'testResult') {
            // Load artifacts for this test result
            return this.getArtifactsForTest(element.id, element.parentId!);
        }
        
        return [];
    }
    
    /**
     * Gets the list of executions
     * @returns List of ExecutionItem objects
     */
    private async getExecutionList(): Promise<ExecutionItem[]> {
        if (this._executionsCache.size === 0) {
            // Create a modified version of ExecutionItem for the 'no executions' state
            const mockExecutionBrief = {
                execution_id: 'no-executions',
                status: 'none',
                start_time: new Date().toISOString(),
                end_time: null,
                completed_tests: 0,
                total_tests: 0,
                failed_tests: 0,
                source: 'none'
            };
            
            // Use the NoExecutionsItem class defined at the top level
            
            const noExecutionsItem = new NoExecutionsItem();
            return [noExecutionsItem];
        }
        
        // Convert map to array and sort by start time (newest first)
        const executionItems = Array.from(this._executionsCache.values()).map(cached => {
            return new ExecutionItem(cached.brief);
        }).sort((a, b) => {
            const aTime = new Date(a.command?.arguments?.[0] || 0).getTime();
            const bTime = new Date(b.command?.arguments?.[0] || 0).getTime();
            return bTime - aTime; // Descending order (newest first)
        });
        
        return executionItems;
    }
    
    /**
     * Gets test results for an execution
     * @param executionId The execution ID
     * @returns List of TestResultItem objects
     */
    private async getTestResultsForExecution(executionId: string): Promise<ExecutionTreeItem[]> {
        try {
            const executionDetail = await this.getExecutionDetails(executionId);
            
            if (!executionDetail) {
                
                const noResultsItem = new NoResultsItem(executionId);
                return [noResultsItem];
            }
            
            // Create a summary item at the top using the class defined at root level
            
            const summaryTestItem = new SummaryTestItem(executionDetail);
            
            // Each test result becomes a tree item
            const resultItems = executionDetail.xml_results.map(result => {
                return new TestResultItem(result, executionId);
            });
            
            return [summaryTestItem, ...resultItems];
        } catch (error) {
            console.error(`[EnhancedExecutionResultsProvider] Error getting test results for execution ${executionId}:`, error);
            
            const errorItem = new ErrorResultItem(error, executionId);
            return [errorItem];
        }
    }
    
    /**
     * Gets artifacts for a test
     * @param testId The test ID
     * @param executionId The execution ID
     * @returns List of ArtifactItem objects
     */
    private async getArtifactsForTest(testId: string, executionId: string): Promise<ArtifactItem[]> {
        try {
            const executionDetail = await this.getExecutionDetails(executionId);
            
            if (!executionDetail) {
                return [];
            }
            
            // Find the test result
            const testResult = executionDetail.xml_results.find(result => result.test_id === testId);
            
            if (!testResult) {
                return [];
            }
            
            const artifacts: ArtifactItem[] = [];
            
            // Add Feature File
            if (testResult.property_feature_file && fs.existsSync(testResult.property_feature_file)) {
                artifacts.push(new ArtifactItem(
                    'Feature File',
                    path.basename(testResult.property_feature_file),
                    testResult.property_feature_file,
                    'feature',
                    testId
                ));
            }
            
            // Add XML Output File
            if (testResult.property_output_file && fs.existsSync(testResult.property_output_file)) {
                artifacts.push(new ArtifactItem(
                    'XML Results',
                    path.basename(testResult.property_output_file),
                    testResult.property_output_file,
                    'xml',
                    testId
                ));
            }
            
            // Add Video Proof
            if (testResult.property_proofs_video && fs.existsSync(testResult.property_proofs_video)) {
                artifacts.push(new ArtifactItem(
                    'Video Recording',
                    path.basename(testResult.property_proofs_video),
                    testResult.property_proofs_video,
                    'video',
                    testId
                ));
            }
            
            // Add Screenshots Folder
            if (testResult.property_proofs_screenshot && fs.existsSync(testResult.property_proofs_screenshot)) {
                artifacts.push(new ArtifactItem(
                    'Screenshots',
                    `${path.basename(testResult.property_proofs_screenshot)}`,
                    testResult.property_proofs_screenshot,
                    'folder',
                    testId
                ));
            }
            
            // Add Network Logs
            if (testResult.property_network_logs && fs.existsSync(testResult.property_network_logs)) {
                artifacts.push(new ArtifactItem(
                    'Network Logs',
                    path.basename(testResult.property_network_logs),
                    testResult.property_network_logs,
                    'json',
                    testId
                ));
            }
            
            // Add Agent Logs Folder
            if (testResult.property_agents_logs && fs.existsSync(testResult.property_agents_logs)) {
                artifacts.push(new ArtifactItem(
                    'Agent Logs',
                    path.basename(testResult.property_agents_logs),
                    testResult.property_agents_logs,
                    'folder',
                    testId
                ));
            }
            
            // Add Planner Thoughts
            if (testResult.property_planner_thoughts && fs.existsSync(testResult.property_planner_thoughts)) {
                artifacts.push(new ArtifactItem(
                    'Planner Thoughts',
                    path.basename(testResult.property_planner_thoughts),
                    testResult.property_planner_thoughts,
                    'json',
                    testId
                ));
            }
            
            return artifacts;
        } catch (error) {
            console.error(`[EnhancedExecutionResultsProvider] Error getting artifacts for test ${testId}:`, error);
            return [];
        }
    }
    
    /**
     * Gets execution details for an execution
     * @param executionId The execution ID
     * @returns The execution details
     */
    async getExecutionDetails(executionId: string): Promise<ExecutionDetail | null> {
        const cached = this._executionsCache.get(executionId);
        
        if (cached && cached.details) {
            return cached.details;
        }
        
        try {
            const apiBaseUrl = getApiBaseUrl();
            const url = `${apiBaseUrl}/executions/${executionId}`;
            console.log(`[EnhancedExecutionResultsProvider] Fetching execution details from: ${url}`);
            
            const response = await axios.get(url);
            const details = response.data as ExecutionDetail;
            
            // Update cache with details
            if (cached) {
                this._executionsCache.set(executionId, {
                    brief: cached.brief,
                    details
                });
            } else {
                this._executionsCache.set(executionId, {
                    brief: {
                        execution_id: details.execution_id,
                        status: details.status,
                        start_time: details.start_time,
                        end_time: details.end_time,
                        completed_tests: details.xml_results ? details.xml_results.length : 0,
                        total_tests: details.xml_results ? details.xml_results.length : 0,
                        failed_tests: details.test_passed ? 0 : 1,
                        source: 'api'
                    },
                    details
                });
            }
            
            return details;
        } catch (error) {
            console.error(`[EnhancedExecutionResultsProvider] Error fetching execution details for ${executionId}:`, error);
            return null;
        }
    }
}
