/**
 * Live view item model
 */

import * as vscode from 'vscode';

/**
 * Represents an item in the Live View tree view
 */
export class LiveViewItem extends vscode.TreeItem {
    /**
     * Creates a new LiveViewItem instance
     * @param label The display label for the tree item
     * @param value The value to display
     * @param collapsibleState Whether the tree item is collapsible
     * @param command The command to execute when the tree item is selected
     * @param contextValue The context value for the tree item
     * @param id Optional unique identifier for the tree item
     */
    constructor(
        public readonly label: string,
        private value: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command,
        public readonly contextValue: string = 'liveViewItem',
        public readonly id?: string
    ) {
        super(label, collapsibleState);
        this.tooltip = `${label}: ${value}`;
        this.description = value;
        
        // Set appropriate icons based on item type
        if (contextValue === 'liveLiveStatus') {
            this.iconPath = new vscode.ThemeIcon('play');
        } else if (contextValue === 'liveIdleStatus') {
            this.iconPath = new vscode.ThemeIcon('debug-disconnect');
        } else if (contextValue === 'liveScreenshot') {
            this.iconPath = new vscode.ThemeIcon('device-camera');
        } else if (contextValue === 'liveReport') {
            this.iconPath = new vscode.ThemeIcon('file-text');
        } else if (contextValue === 'liveVideo') {
            this.iconPath = new vscode.ThemeIcon('device-camera-video');
        } else if (contextValue === 'liveProgress') {
            this.iconPath = new vscode.ThemeIcon('pulse');
        } else if (contextValue === 'liveBrowser') {
            this.iconPath = new vscode.ThemeIcon('browser');
        } else if (contextValue === 'history') {
            this.iconPath = new vscode.ThemeIcon('history');
        } else if (contextValue === 'liveStop') {
            this.iconPath = new vscode.ThemeIcon('debug-stop');
        } else if (contextValue === 'liveRun') {
            this.iconPath = new vscode.ThemeIcon('debug-restart');
        } else if (contextValue && contextValue.startsWith('step-')) {
            // Handle step status icons
            const status = contextValue.split('-')[1];
            if (status === 'passed') {
                this.iconPath = new vscode.ThemeIcon('check');
            } else if (status === 'failed') {
                this.iconPath = new vscode.ThemeIcon('error');
            } else {
                this.iconPath = new vscode.ThemeIcon('loading~spin');
            }
        } else {
            this.iconPath = new vscode.ThemeIcon('info');
        }
    }
} 