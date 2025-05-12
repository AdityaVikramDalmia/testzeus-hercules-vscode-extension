/**
 * Gherkin Script model
 */

import * as vscode from 'vscode';

/**
 * Represents a Gherkin script in the tree view
 */
export class GherkinScript extends vscode.TreeItem {
    /**
     * Creates a new GherkinScript instance
     * @param label The display label for the tree item
     * @param collapsibleState Whether the tree item is collapsible
     * @param command The command to execute when the tree item is selected
     * @param filePath The path to the Gherkin script file
     * @param isFolder Whether this item represents a folder
     */
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command,
        public readonly filePath?: string,
        public readonly isFolder: boolean = false
    ) {
        super(label, collapsibleState);
        this.tooltip = filePath;
        
        // Set context value to allow for proper context menu in view
        this.contextValue = isFolder ? 'gherkinFolder' : 'gherkinScript';
        
        // Set icon based on type
        this.iconPath = new vscode.ThemeIcon(isFolder ? 'folder' : 'file');
        
        // Set resource URI for VS Code to understand this is a file/folder
        if (filePath) {
            this.resourceUri = vscode.Uri.file(filePath);
        }
    }
} 