/**
 * TestData model
 */

import * as vscode from 'vscode';

/**
 * Represents a TestData item in the tree view
 */
export class TestData extends vscode.TreeItem {
    /**
     * Creates a new TestData instance
     * @param label The display label for the tree item
     * @param collapsibleState Whether the tree item is collapsible
     * @param command The command to execute when the tree item is selected
     * @param filePath The path to the TestData file
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
        this.contextValue = isFolder ? 'testDataFolder' : 'testDataFile';
        
        // Set icon based on type - use 'database' icon for test data files
        this.iconPath = new vscode.ThemeIcon(isFolder ? 'folder' : 'database');
        
        // Set resource URI for VS Code to understand this is a file/folder
        if (filePath) {
            this.resourceUri = vscode.Uri.file(filePath);
        }
    }
}
