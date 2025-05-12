/**
 * Represents an item in the Log Data view
 */

import * as vscode from 'vscode';

/**
 * Model class for Log Data items in the tree view
 */
export class LogDataItem extends vscode.TreeItem {
    /**
     * Creates a new LogDataItem
     * @param id Unique identifier for this item
     * @param label Display label for this item
     * @param executionId ID of the test execution
     * @param status Status of the execution (running, completed, failed)
     * @param startTime Start time of the execution
     * @param endTime End time of the execution
     * @param completedTests Number of completed tests
     * @param totalTests Total number of tests
     * @param failedTests Number of failed tests
     * @param collapsibleState Collapsible state for this item
     * @param contextValue Context value for this item
     */
    constructor(
        public readonly id: string,
        public readonly label: string,
        public readonly executionId: string,
        public readonly status: string,
        public readonly startTime: string,
        public readonly endTime: string,
        public readonly completedTests: number,
        public readonly totalTests: number,
        public readonly failedTests: number,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue?: string
    ) {
        super(label, collapsibleState);
        
        // Set tooltip with detailed information
        this.tooltip = `Execution ID: ${executionId}\nStatus: ${status}\nStart: ${startTime}\nEnd: ${endTime}\nTests: ${completedTests}/${totalTests} (${failedTests} failed)`;
        
        // Set context value for command enablement
        this.contextValue = contextValue || 'logDataItem';
        
        // Set icon based on status
        if (status === 'running') {
            this.iconPath = new vscode.ThemeIcon('sync', new vscode.ThemeColor('charts.blue'));
        } else if (status === 'completed') {
            if (failedTests > 0) {
                this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('charts.yellow'));
            } else {
                this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'));
            }
        } else if (status === 'failed') {
            this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('charts.red'));
        } else {
            this.iconPath = new vscode.ThemeIcon('question');
        }
        
        // Add Open Logs command to this item
        this.command = {
            title: 'Open Logs',
            command: 'testzeus-hercules.openExecutionTerminal',
            arguments: [this.executionId]
        };
    }
}
