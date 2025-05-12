/**
 * Log item model
 */

import * as vscode from 'vscode';

/**
 * Represents a log item in the Live Logs tree view
 */
export class LogItem extends vscode.TreeItem {
    /**
     * Creates a new LogItem instance
     * @param label The display label for the tree item
     * @param value The value to display
     * @param collapsibleState Whether the tree item is collapsible
     * @param command The command to execute when the tree item is selected
     * @param contextValue The context value for the tree item
     */
    constructor(
        public readonly label: string,
        private value: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command,
        public readonly contextValue: string = 'logItem'
    ) {
        super(label, collapsibleState);
        this.tooltip = value;
        this.description = value;
        
        // Set appropriate icons based on log type
        if (contextValue === 'loginfo') {
            this.iconPath = new vscode.ThemeIcon('info');
        } else if (contextValue === 'logerror') {
            this.iconPath = new vscode.ThemeIcon('error');
        } else if (contextValue === 'logdebug') {
            this.iconPath = new vscode.ThemeIcon('debug');
        } else if (contextValue === 'logtest') {
            this.iconPath = new vscode.ThemeIcon('beaker');
        } else if (contextValue === 'logClear') {
            this.iconPath = new vscode.ThemeIcon('clear-all');
        }
    }
} 