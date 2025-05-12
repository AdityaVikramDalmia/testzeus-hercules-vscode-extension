/**
 * Execution Result Item model
 */

import * as vscode from 'vscode';

/**
 * Represents an execution result item in the tree view
 */
export class ExecutionResultItem extends vscode.TreeItem {
    /**
     * Creates a new ExecutionResultItem instance
     * @param label The display label for the tree item
     * @param descriptionText The description text for the tree item
     * @param tooltipText The tooltip text for the tree item
     * @param collapsibleState Whether the tree item is collapsible
     * @param command The command to execute when the tree item is selected
     * @param contextValue The context value for the tree item
     */
    constructor(
        public readonly label: string,
        descriptionText: string,
        tooltipText: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command,
        public readonly contextValue: string = 'executionResult'
    ) {
        super(label, collapsibleState);
        this.description = descriptionText;
        this.tooltip = tooltipText;
        
        // Set appropriate icons based on context value
        if (contextValue === 'resultPassed') {
            this.iconPath = new vscode.ThemeIcon('pass');
        } else if (contextValue === 'resultFailed') {
            this.iconPath = new vscode.ThemeIcon('error');
        } else {
            this.iconPath = new vscode.ThemeIcon('info');
        }
    }
} 