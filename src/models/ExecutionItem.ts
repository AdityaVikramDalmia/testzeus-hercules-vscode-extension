/**
 * Class representing an execution item in the tree view
 */

import * as vscode from 'vscode';

export interface ExecutionData {
    execution_id: string;
    status: string;
    start_time: string;
    end_time: string | null;
    completed_tests: number;
    total_tests: number;
    failed_tests: number;
    source: string;
}

/**
 * Represents an execution tree item in the VS Code TreeView
 */
export class ExecutionItem extends vscode.TreeItem {
    /**
     * Creates a new execution item
     * @param label Display label for the tree item
     * @param description Secondary description text
     * @param collapsibleState Whether the item can be expanded
     * @param command Command to execute when the item is clicked
     * @param contextValue Context value for the item (used for context menu filtering)
     * @param id Optional identifier for the item
     */
    constructor(
        public readonly label: string,
        public readonly description: string | undefined,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command,
        public readonly contextValue?: string,
        public readonly id?: string,
        public readonly executionData?: ExecutionData
    ) {
        super(label, collapsibleState);
        
        this.description = description;
        this.tooltip = `${label}${description ? ` - ${description}` : ''}`;
        
        // Set context value for conditional context menu items
        this.contextValue = contextValue;
        
        // Set command if provided
        if (command) {
            this.command = command;
        }
        
        this.id = id;
        
        // Use database icon for executions
        this.iconPath = new vscode.ThemeIcon('database');
    }
}
