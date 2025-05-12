/**
 * Provider for combined live view tree view
 */

import * as vscode from 'vscode';
import { LiveViewItem } from '../models/LiveViewItem';
import { LogItem } from '../models/LogItem';
import { StepStatus, LiveViewData } from '../types/results';
import { LogEntry, LogType } from '../types/logs';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';
import { getApiBaseUrl, getWsBaseUrl, getWsLogsUrl } from '../config/environment';
// We'll use LiveViewItem instead of a separate ExecutionListItem class
import { ensureHerculesDirectory } from '../utils/filesystem';
import { MAX_LOGS } from '../constants/config';

// Union type for tree items
type CombinedTreeItem = LiveViewItem | LogItem;

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
 * TreeDataProvider for the Combined Live View tree view
 */
export class CombinedLiveViewProvider implements vscode.TreeDataProvider<CombinedTreeItem>, vscode.Disposable {
    private _onDidChangeTreeData: vscode.EventEmitter<CombinedTreeItem | undefined | null | void> = new vscode.EventEmitter<CombinedTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<CombinedTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    // Live View properties
    private _isExecuting: boolean = false;
    private _currentStep: string | null = null;
    private _stepStatus: StepStatus | null = null;
    private _browserScreenshot: string | null = null;
    private _testName: string | null = null;
    private _browser: string | null = null;
    private _startTime: Date | null = null;
    private _testProgress: number = 0;
    private _completedSteps: Array<{step: string, status: StepStatus}> = [];
    private _testReportPath: string | null = null;
    private _videoRecordingPath: string | null = null;
    
    // Live Logs properties
    private _logs: LogEntry[] = [];
    private _terminal: vscode.Terminal | null = null;
    private _writeEmitter: vscode.EventEmitter<string> | null = null;
    private _activeJobs: Map<string, vscode.Terminal> = new Map();
    
    // Execution data properties
    private _executionItems: ExecutionData[] = [];
    private _pollingInterval: NodeJS.Timeout | null = null;
    private _pollingEnabled: boolean = true;
    
    /**
     * Creates a new CombinedLiveViewProvider instance
     * @param workspaceRoot The workspace root path
     */
    constructor(private workspaceRoot: string | undefined) {
        // Start polling immediately for executions
        this.startPolling();
        
        // Load logs from file
        this.loadLogs();
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
            // Use the same URL pattern as EnhancedExecutionResultsProvider
            const apiBaseUrl = getApiBaseUrl();
            const url = `${apiBaseUrl}/executions`;
            
            console.log(`LIVE VIEW & LOGS: Polling executions from: ${url}`);
            
            const response = await axios.get(url, {
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                // Add a timestamp to prevent caching
                params: { t: new Date().getTime() }
            });
            
            if (response.status === 200 && Array.isArray(response.data)) {
                // Store all execution items for display
                this._executionItems = response.data;
                console.log(`LIVE VIEW & LOGS: Success! Received ${this._executionItems.length} executions`);
                console.log(`LIVE VIEW & LOGS: Sample data:`, JSON.stringify(this._executionItems.slice(0, 2)));
                
                // Force immediate refresh of the tree view
                this._onDidChangeTreeData.fire();
            } else {
                console.error('LIVE VIEW & LOGS: Error in API response format:', response);
                this._executionItems = [];
                this._onDidChangeTreeData.fire();
            }
        } catch (error) {
            // Log error details for debugging
            console.error('LIVE VIEW & LOGS: Error polling executions:', error);
            
            // Quietly fail as the server might not be running
            this._executionItems = [];
            this._onDidChangeTreeData.fire();
        }
    }
    
    /**
     * Refreshes the tree view with updated data
     * @param data Optional data to update the view with
     */
    refresh(data?: LiveViewData): void {
        // Always poll for executions on refresh to ensure data is fresh
        this.pollExecutions();
        
        if (data) {
            if (data.isExecuting !== undefined) {
                this._isExecuting = data.isExecuting;
                
                // Reset data when starting a new test
                if (data.isExecuting && !this._isExecuting) {
                    this._startTime = new Date();
                    this._completedSteps = [];
                    this._testProgress = 0;
                }
                
                // Clear data when test is done
                if (!data.isExecuting && this._isExecuting) {
                    this._testProgress = 100;
                }
            }
            
            if (data.currentStep !== undefined) {
                // Add previous step to completed steps if step changed
                if (this._currentStep && this._currentStep !== data.currentStep && this._stepStatus) {
                    this._completedSteps.unshift({
                        step: this._currentStep,
                        status: this._stepStatus
                    });
                    
                    // Keep only the last 5 steps
                    if (this._completedSteps.length > 5) {
                        this._completedSteps.pop();
                    }
                }
                
                this._currentStep = data.currentStep;
            }
            
            if (data.stepStatus !== undefined) {
                this._stepStatus = data.stepStatus;
                
                // Update progress on each step
                if (this._isExecuting) {
                    // Simple incremental progress
                    this._testProgress = Math.min(this._testProgress + 5, 95);
                }
            }
            
            if (data.browserScreenshot !== undefined) {
                this._browserScreenshot = data.browserScreenshot;
            }
            
            if (data.testName !== undefined) {
                this._testName = data.testName;
            }
            
            if (data.browser !== undefined) {
                this._browser = data.browser;
            }
            
            if (data.testReportPath !== undefined) {
                this._testReportPath = data.testReportPath;
            }
            
            if (data.videoRecordingPath !== undefined) {
                this._videoRecordingPath = data.videoRecordingPath;
            }
        }
        
        this._onDidChangeTreeData.fire();
    }
    
    /**
     * Gets the TreeItem for the given element
     * @param element The element to get the TreeItem for
     * @returns The TreeItem for the element
     */
    getTreeItem(element: CombinedTreeItem): vscode.TreeItem {
        return element;
    }
    
    /**
     * Gets the elapsed time of test execution in human-readable format
     */
    private getElapsedTime(): string {
        if (!this._startTime) {
            return '00:00';
        }
        
        const now = new Date();
        const diffMs = now.getTime() - this._startTime.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffSecs = Math.floor((diffMs % 60000) / 1000);
        
        return `${diffMins.toString().padStart(2, '0')}:${diffSecs.toString().padStart(2, '0')}`;
    }
    
    /**
     * Gets the children of the given element
     * @param element The element to get the children for
     * @returns A promise that resolves to the children of the element
     */
    getChildren(element?: CombinedTreeItem): Thenable<CombinedTreeItem[]> {
        if (!this.workspaceRoot) {
            return Promise.resolve([]);
        }
        
        if (element) {
            // Handle expandable items
            if (element.id === 'history') {
                return Promise.resolve(
                    this._completedSteps.map((step, index) => {
                        const statusIcon = step.status === 'passed' ? '✅' :
                                           step.status === 'failed' ? '❌' : '⏳';
                        return new LiveViewItem(
                            `Step ${index + 1}`,
                            `${statusIcon} ${step.step}`,
                            vscode.TreeItemCollapsibleState.None,
                            undefined,
                            `step-${step.status}`
                        );
                    })
                );
            } else if (element.id === 'logs') {
                return Promise.resolve(this.getLogItems());
            } else if (element.id === 'executions') {
                // Create list of execution items with terminal buttons
                const executionItems = this.getExecutionItems();
                console.log(`LIVE VIEW & LOGS: Rendering ${executionItems.length} execution items as children of 'executions'`);
                return Promise.resolve(executionItems);
            } else if (element.id && element.id.startsWith('execution-')) {
                // Handle execution item children if needed in the future
                console.log(`LIVE VIEW & LOGS: Selected execution item: ${element.id}`);
                return Promise.resolve([]);
            }
            
            return Promise.resolve([]);
        } else {
            const items: CombinedTreeItem[] = [];
            
            // Status item with test name if available
            const statusLabel = this._testName ? `${this._isExecuting ? 'Running' : 'Last Run'}: ${this._testName}` : 'Status';
            const statusValue = this._isExecuting 
                ? `Running (${this.getElapsedTime()})`
                : this._testName ? 'Completed' : 'Idle';
            
            items.push(new LiveViewItem(
                statusLabel,
                statusValue,
                vscode.TreeItemCollapsibleState.None,
                undefined,
                this._isExecuting ? 'liveLiveStatus' : 'liveIdleStatus'
            ));
            
            // Progress bar
            if (this._isExecuting || this._testProgress > 0) {
                const progressBar = this.createProgressBar(this._testProgress);
                items.push(new LiveViewItem(
                    'Progress',
                    `${progressBar} ${this._testProgress}%`,
                    vscode.TreeItemCollapsibleState.None,
                    undefined,
                    'liveProgress'
                ));
            }
            
            // Current step being executed
            if (this._currentStep) {
                const statusIcon = this._stepStatus === 'passed' ? '✅' :
                                   this._stepStatus === 'failed' ? '❌' : '⏳';
                items.push(new LiveViewItem(
                    'Current Step',
                    `${statusIcon} ${this._currentStep}`,
                    vscode.TreeItemCollapsibleState.None,
                    undefined,
                    `step-${this._stepStatus || 'running'}`
                ));
            }
            
            // Recent step history (collapsed by default to save space)
            if (this._completedSteps.length > 0) {
                items.push(new LiveViewItem(
                    'Step History',
                    `${this._completedSteps.length} step${this._completedSteps.length > 1 ? 's' : ''} completed`,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    undefined,
                    'history',
                    'history'
                ));
            }
            
            // Logs section (always show and always collapsed by default)
            const logsItem = new LiveViewItem(
                'Logs',
                `${this._logs.length} log entries`,
                vscode.TreeItemCollapsibleState.Collapsed,
                undefined,
                'logs',
                'logs'
            );
            logsItem.iconPath = new vscode.ThemeIcon('output');
            items.push(logsItem);

            // Browser information (only if available)
            if (this._browser) {
                items.push(new LiveViewItem(
                    'Browser',
                    this._browser,
                    vscode.TreeItemCollapsibleState.None,
                    undefined,
                    'liveBrowser'
                ));
            }
            
            // Test Report link if available
            if (this._testReportPath) {
                items.push(new LiveViewItem(
                    'Test Report',
                    path.basename(this._testReportPath),
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'testzeus-hercules.openTestReport',
                        title: 'Open Test Report',
                        arguments: [this._testReportPath]
                    },
                    'liveReport'
                ));
            }
            
            // Screenshot link if available
            if (this._browserScreenshot) {
                items.push(new LiveViewItem(
                    'Screenshot',
                    path.basename(this._browserScreenshot),
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'testzeus-hercules.openScreenshot',
                        title: 'Open Screenshot',
                        arguments: [this._browserScreenshot]
                    },
                    'liveScreenshot'
                ));
            }
            
            // Video recording link if available
            if (this._videoRecordingPath) {
                items.push(new LiveViewItem(
                    'Video Recording',
                    path.basename(this._videoRecordingPath),
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'testzeus-hercules.openVideoRecording',
                        title: 'Open Video Recording',
                        arguments: [this._videoRecordingPath]
                    },
                    'liveVideo'
                ));
            }
            
            // Add control buttons if needed
            if (this._isExecuting) {
                items.push(new LiveViewItem(
                    'Stop Test',
                    'Cancel the currently running test',
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'testzeus-hercules.stopTest',
                        title: 'Stop Test',
                        arguments: []
                    },
                    'liveStop'
                ));
            } else if (this._testName) {
                items.push(new LiveViewItem(
                    'Rerun Test',
                    'Run the test again',
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'testzeus-hercules.rerunTest',
                        title: 'Rerun Test',
                        arguments: []
                    },
                    'liveRun'
                ));
            }
            
            // Add "Open Terminal" button
            items.push(new LiveViewItem(
                'Open Logs Terminal',
                'Open the logs terminal',
                vscode.TreeItemCollapsibleState.None,
                {
                    command: 'testzeus-hercules.openLogsTerminal',
                    title: 'Open Logs Terminal',
                    arguments: []
                },
                'liveTerminal'
            ));
            
            // Add "Clear Logs" button
            items.push(new LiveViewItem(
                'Clear Logs',
                'Clear all logs',
                vscode.TreeItemCollapsibleState.None,
                {
                    command: 'testzeus-hercules.clearLogs',
                    title: 'Clear Logs',
                    arguments: []
                },
                'liveClear'
            ));
            
            // Move executions to the top of the view so they're more visible
            // Display execution items directly at the root if there are <= 3, otherwise use a folder
            if (this._executionItems.length <= 3) {
                // Display the executions directly at the root level for better visibility
                console.log(`LIVE VIEW & LOGS: Adding ${this._executionItems.length} executions directly to root view`);
                
                // Add a header for executions
                const executionsHeader = new LiveViewItem(
                    'Recent Executions',
                    `${this._executionItems.length} execution(s) found`,
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'testzeus-hercules.refreshCombinedLiveView',
                        title: 'Refresh Executions',
                        arguments: []
                    },
                    'executions-header'
                );
                executionsHeader.iconPath = new vscode.ThemeIcon('debug-start');
                items.push(executionsHeader);
                
                // Add execution items directly
                const execItems = this.getExecutionItems();
                items.push(...execItems);
            } else {
                // Use a collapsible folder for more executions
                const executionsItem = new LiveViewItem(
                    'Executions',
                    `${this._executionItems.length} execution(s) found`,
                    // Force expanded state to make items visible
                    vscode.TreeItemCollapsibleState.Expanded,
                    {
                        // Add a refresh command
                        command: 'testzeus-hercules.refreshCombinedLiveView',
                        title: 'Refresh Executions',
                        arguments: []
                    },
                    'executions',
                    'executions'
                );
                executionsItem.iconPath = new vscode.ThemeIcon('server-process');
                // Ensure it's always added to the items
                items.push(executionsItem);
                
                console.log(`LIVE VIEW & LOGS: Adding ${this._executionItems.length} executions to the tree view folder`);
            }
            
            return Promise.resolve(items);
        }
    }

    /**
     * Get the log items for display in the tree view
     * @returns Array of LogItem objects
     */
    private getLogItems(): LogItem[] {
        // Get only the last few logs to save space (limit to around 3-4 entries as requested)
        const recentLogs = this._logs.slice(-4);
        
        return recentLogs.map(log => {
            const timestamp = log.timestamp.toLocaleTimeString();
            const label = `[${timestamp}] [${log.type.toUpperCase()}]`;
            
            return new LogItem(
                label,
                log.message,
                vscode.TreeItemCollapsibleState.None,
                undefined,
                `log${log.type}`
            );
        });
    }
    
    /**
     * Creates a visual progress bar using Unicode block characters
     * @param percentage The percentage to represent (0-100)
     * @returns A text-based progress bar
     */
    private createProgressBar(percentage: number): string {
        const width = 10;
        const filled = Math.round(width * (percentage / 100));
        const empty = width - filled;
        
        return '█'.repeat(filled) + '░'.repeat(empty);
    }

    // Live Logs Methods
    
    /**
     * Creates or returns the existing terminal for logs
     * @returns The terminal for logs
     */
    getTerminal(): vscode.Terminal {
        if (!this._terminal || this._terminal.exitStatus !== undefined) {
            // Create a write emitter for streaming logs to the terminal
            this._writeEmitter = new vscode.EventEmitter<string>();
            
            // Create terminal with write emitter as the pty
            this._terminal = vscode.window.createTerminal({
                name: 'TestZeus Hercules Logs',
                pty: {
                    onDidWrite: this._writeEmitter.event,
                    open: () => {
                        // Show welcome message when terminal is first opened
                        this.writeToTerminal('\r\n\x1b[1;36m===== TestZeus Hercules Logs Terminal =====\x1b[0m\r\n');
                        this.writeToTerminal('\x1b[1;37mThis terminal displays logs from TestZeus Hercules jobs.\x1b[0m\r\n');
                        this.writeToTerminal('\x1b[1;37mJob output will appear here automatically when jobs are run.\x1b[0m\r\n\r\n');
                    },
                    close: () => {
                        // Clean up when terminal is closed
                        this._terminal = null;
                        this._writeEmitter = null;
                    },
                    handleInput: (data: string) => {
                        // Process terminal input if needed
                        if (data === '\r') {
                            // Enter key pressed
                            this.writeToTerminal('\r\n');
                            return;
                        }
                        
                        // Echo input characters
                        this.writeToTerminal(data);
                    }
                }
            });
        }
        return this._terminal;
    }
    
    /**
     * Connects a job terminal to this logs provider
     * @param jobTerminal The job terminal to connect
     */
    connectJobTerminal(jobTerminal: vscode.Terminal): void {
        // Ensure our log terminal is created and visible
        const logsTerminal = this.getTerminal();
        
        // Generate a unique job ID
        const jobId = `job-${Date.now()}`;
        
        // Add to active jobs
        this._activeJobs.set(jobId, jobTerminal);
        
        // Register event handler for job terminal close
        const disposable = vscode.window.onDidCloseTerminal(terminal => {
            if (terminal === jobTerminal) {
                // Job terminal closed, remove from active jobs
                this._activeJobs.delete(jobId);
                
                // Add log
                this.addLog('info', `Job terminal closed`);
                
                // Write to logs terminal
                this.writeToTerminal('\r\n\x1b[1;33m===== TestZeus Hercules Job Terminal Closed =====\x1b[0m\r\n\r\n');
                
                // Dispose of the event handler
                disposable.dispose();
            }
        });
        
        // Write a header to the logs terminal
        this.writeToTerminal('\r\n\x1b[1;33m===== TestZeus Hercules Job Connected =====\x1b[0m\r\n\r\n');
    }
    
    /**
     * Writes directly to the terminal
     * @param message The message to write
     */
    writeToTerminal(message: string): void {
        if (this._writeEmitter) {
            this._writeEmitter.fire(message);
        }
    }
    
    /**
     * Adds a log entry and refreshes the view
     * @param type The type of log entry
     * @param message The log message
     */
    addLog(type: LogType, message: string): void {
        const timestamp = new Date();
        this._logs.push({ type, message, timestamp });
        
        // Format the message for the terminal with colors
        let colorCode = '';
        switch (type) {
            case 'error':
                colorCode = '\x1b[1;31m'; // Bold Red
                break;
            case 'warn':
                colorCode = '\x1b[1;33m'; // Bold Yellow
                break;
            case 'info':
                colorCode = '\x1b[1;36m'; // Bold Cyan
                break;
            case 'debug':
                colorCode = '\x1b[1;90m'; // Bold Gray
                break;
            case 'test':
                colorCode = '\x1b[1;32m'; // Bold Green
                break;
            default:
                colorCode = '\x1b[1;37m'; // Bold White
        }
        
        // Format timestamp
        const timeStr = timestamp.toLocaleTimeString();
        
        // Write to terminal if available
        if (this._writeEmitter) {
            this.writeToTerminal(`${colorCode}[${timeStr}] [${type.toUpperCase()}]\x1b[0m ${message}\r\n`);
        }
        
        // Trim log if it gets too large
        if (this._logs.length > MAX_LOGS) {
            this._logs = this._logs.slice(-MAX_LOGS);
        }
        
        // Save logs to file
        this.saveLogs();
        
        this.refresh();
    }
    
    /**
     * Clears all logs
     */
    clearLogs(): void {
        this._logs = [];
        
        // Clear terminal if available
        if (this._writeEmitter) {
            this.writeToTerminal('\x1b[2J\x1b[3J\x1b[H'); // ANSI clear screen and scrollback
            this.writeToTerminal('\r\n\x1b[1;33m===== Logs Cleared =====\x1b[0m\r\n\r\n');
        }
        
        this.refresh();
    }
    
    /**
     * Returns the number of active job terminals
     * @returns Number of active jobs
     */
    getActiveJobsCount(): number {
        return this._activeJobs.size;
    }
    
    /**
     * Get execution items for display in the tree view
     * @returns Array of LiveViewItem objects representing executions
     */
    private getExecutionItems(): LiveViewItem[] {
        // Always add a dummy line that explains how to use this section
        const executionHelpItem = new LiveViewItem(
            'About Terminal Logs',
            'Click any execution item to open terminal logs with socat',
            vscode.TreeItemCollapsibleState.None,
            undefined,
            'execution-help'
        );
        executionHelpItem.iconPath = new vscode.ThemeIcon('info');
        
        // If no executions are found, show an informative message
        if (!this._executionItems || this._executionItems.length === 0) {
            const noExecutionsItem = new LiveViewItem(
                'No Executions Found',
                'Server may be offline or no executions have been run',
                vscode.TreeItemCollapsibleState.None,
                {
                    // Add refresh capability
                    command: 'testzeus-hercules.refreshCombinedLiveView',
                    title: 'Refresh Executions',
                    arguments: []
                },
                'noExecutions'
            );
            noExecutionsItem.iconPath = new vscode.ThemeIcon('debug-disconnect');
            console.log('LIVE VIEW & LOGS: No executions found');
            return [executionHelpItem, noExecutionsItem];
        }
        
        console.log(`LIVE VIEW & LOGS: Found ${this._executionItems.length} executions to display`);
        
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
            
            // Prepare command for terminal redirect
            const command = {
                command: 'testzeus-hercules.openExecutionLogs',
                title: 'View Logs in Terminal',
                tooltip: 'Open logs in a terminal using socat',
                arguments: [execution.execution_id, getWsLogsUrl(execution.execution_id)]
            };
            
            // Create the execution item
            const item = new LiveViewItem(
                title,
                details,
                vscode.TreeItemCollapsibleState.None,
                command,
                `${contextValue}-with-terminal-redirect`,
                execution.execution_id
            );
            
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
        items.sort((a: LiveViewItem, b: LiveViewItem) => {
            const idA = a.id;
            const idB = b.id;
            
            if (!idA || !idB) return 0;
            
            const execA = this._executionItems.find(e => e.execution_id === idA);
            const execB = this._executionItems.find(e => e.execution_id === idB);
            
            if (execA && execB) {
                const dateA = new Date(execA.start_time);
                const dateB = new Date(execB.start_time);
                return dateB.getTime() - dateA.getTime();
            }
            return 0;
        });
        
        // Always return the help item at the top, followed by the actual executions
        return [executionHelpItem, ...items];
    }
    
    /**
     * Dispose of the provider resources
     */
    dispose(): void {
        this.stopPolling();
    }
    
    /**
     * Saves logs to file in .testzeus-hercules/logs directory
     */
    private saveLogs(): void {
        if (!this.workspaceRoot) { return; }
        
        try {
            const herculesDir = ensureHerculesDirectory(this.workspaceRoot);
            if (!herculesDir) { return; }
            
            const logsDir = path.join(herculesDir, 'logs');
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }
            
            const logFilePath = path.join(logsDir, 'testzeus-logs.json');
            fs.writeFileSync(logFilePath, JSON.stringify(this._logs, null, 2), 'utf8');
        } catch (err) {
            console.error('Failed to save logs:', err);
        }
    }
    
    /**
     * Loads logs from file
     */
    loadLogs(): void {
        if (!this.workspaceRoot) { return; }
        
        try {
            const herculesDir = ensureHerculesDirectory(this.workspaceRoot);
            if (!herculesDir) { return; }
            
            const logFilePath = path.join(herculesDir, 'logs', 'testzeus-logs.json');
            
            if (fs.existsSync(logFilePath)) {
                const data = fs.readFileSync(logFilePath, 'utf8');
                const logs = JSON.parse(data);
                
                this._logs = logs.map((log: any) => ({
                    ...log,
                    timestamp: new Date(log.timestamp)
                }));
                
                this.refresh();
            }
        } catch (err) {
            console.error('Failed to load logs:', err);
        }
    }
} 