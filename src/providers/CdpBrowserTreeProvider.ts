/**
 * TreeDataProvider for CDP Browser view
 */

import * as vscode from 'vscode';
import { CdpBrowserManager } from '../utils/cdpBrowserManager';

/**
 * Represents a node in the CDP Browser tree view
 */
export class CdpBrowserItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly type: 'command' | 'info' | 'status',
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);

        // Set icon based on type
        switch (type) {
            case 'command':
                this.iconPath = new vscode.ThemeIcon('play');
                break;
            case 'info':
                this.iconPath = new vscode.ThemeIcon('link');
                break;
            case 'status':
                const isRunning = label.includes('Running');
                this.iconPath = new vscode.ThemeIcon(isRunning ? 'debug-start' : 'debug-disconnect');
                break;
        }
    }
}

/**
 * Tree data provider for CDP Browser view
 */
export class CdpBrowserTreeProvider implements vscode.TreeDataProvider<CdpBrowserItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<CdpBrowserItem | undefined | null | void> = 
        new vscode.EventEmitter<CdpBrowserItem | undefined | null | void>();
    
    readonly onDidChangeTreeData: vscode.Event<CdpBrowserItem | undefined | null | void> = 
        this._onDidChangeTreeData.event;
    
    private cdpBrowserManager: CdpBrowserManager;
    
    constructor(private workspaceRoot?: string) {
        this.cdpBrowserManager = CdpBrowserManager.getInstance();
        
        // Register listener for browser status changes
        this.cdpBrowserManager.onBrowserStatusChanged(() => {
            this.refresh();
        });
    }
    
    /**
     * Refresh the tree view
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
    
    /**
     * Gets the children of the tree view
     * @param element The parent element
     * @returns The children of the element
     */
    getChildren(element?: CdpBrowserItem): Thenable<CdpBrowserItem[]> {
        if (!this.workspaceRoot) {
            return Promise.resolve([]);
        }
        
        // Root elements
        if (!element) {
            return Promise.resolve(this.getRootItems());
        }
        
        // No child elements
        return Promise.resolve([]);
    }
    
    /**
     * Gets the tree item for the given element
     * @param element The element
     * @returns The tree item
     */
    getTreeItem(element: CdpBrowserItem): vscode.TreeItem {
        return element;
    }
    
    /**
     * Gets the root items for the tree view
     * @returns The root items
     */
    private getRootItems(): CdpBrowserItem[] {
        const items: CdpBrowserItem[] = [];
        
        // Add browser status
        const isBrowserRunning = this.cdpBrowserManager.isBrowserRunning();
        items.push(
            new CdpBrowserItem(
                isBrowserRunning ? 'CDP Browser: Running' : 'CDP Browser: Stopped',
                vscode.TreeItemCollapsibleState.None,
                'status'
            )
        );
        
        // Add browser URL if running
        if (isBrowserRunning) {
            const browserEndpoint = this.cdpBrowserManager.getBrowserEndpoint();
            items.push(
                new CdpBrowserItem(
                    `CDP URL: ${browserEndpoint}`,
                    vscode.TreeItemCollapsibleState.None,
                    'info',
                    {
                        command: 'testzeus-hercules.openCdpBrowser',
                        title: 'Open CDP Browser',
                        arguments: [browserEndpoint]
                    }
                )
            );
        }
        
        // Add commands
        items.push(
            new CdpBrowserItem(
                'Respawn CDP Browser',
                vscode.TreeItemCollapsibleState.None,
                'command',
                {
                    command: 'testzeus-hercules.spawnCdpBrowser',
                    title: 'Spawn CDP Browser'
                }
            )
        );
        
        // Add close command if browser is running
        if (isBrowserRunning) {
            items.push(
                new CdpBrowserItem(
                    'Close CDP Browser',
                    vscode.TreeItemCollapsibleState.None,
                    'command',
                    {
                        command: 'testzeus-hercules.closeCdpBrowser',
                        title: 'Close CDP Browser'
                    }
                )
            );
        }
        
        // Removed 'Add New Test' button as it belongs to the CREATE TEST RUN section only
        
        return items;
    }
}
