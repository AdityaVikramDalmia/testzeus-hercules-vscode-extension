/**
 * Result item model
 */

import * as vscode from 'vscode';

/**
 * Represents a test result item in the Execution Results tree view
 */
export class ResultItem extends vscode.TreeItem {
    /**
     * Creates a new ResultItem instance
     * @param label The display label for the tree item
     * @param value The value to display
     * @param collapsibleState Whether the tree item is collapsible
     * @param command The command to execute when the tree item is selected
     * @param contextValue The context value for the tree item
     * @param id Unique identifier for the result item
     */
    constructor(
        public readonly label: string,
        private value: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command,
        public readonly contextValue: string = 'resultItem',
        public readonly id?: string
    ) {
        super(label, collapsibleState);
        this.tooltip = `${label}: ${value}`;
        this.description = value;
        
        // Set appropriate icons based on item type
        if (contextValue === 'resultPassed') {
            this.iconPath = new vscode.ThemeIcon('pass');
        } else if (contextValue === 'resultFailed') {
            this.iconPath = new vscode.ThemeIcon('error');
        } else if (contextValue === 'resultReport') {
            this.iconPath = new vscode.ThemeIcon('file-text');
        } else if (contextValue === 'resultDetail') {
            this.iconPath = new vscode.ThemeIcon('info');
        } else if (contextValue === 'resultEmpty') {
            this.iconPath = new vscode.ThemeIcon('info');
        }
    }
} 