/**
 * Configuration Tree Provider for Environment panel
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigStorage } from '../utils/configStorage';
import { getWorkspaceRoot, ensureHerculesDirectory } from '../utils/filesystem';
import { CONFIG_NAMESPACE } from '../constants/config';
import { PathManager } from '../utils/pathManager';

/**
 * Tree item for configuration settings
 */
export class ConfigurationItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly description?: string,
        public readonly command?: vscode.Command,
        public readonly contextValue?: string,
        iconName?: string
    ) {
        super(label, collapsibleState);
        this.description = description;
        this.command = command;
        this.contextValue = contextValue;

        if (iconName) {
            this.iconPath = {
                light: vscode.Uri.file(path.join(__filename, '..', '..', '..', 'resources', 'light', `${iconName}.svg`)),
                dark: vscode.Uri.file(path.join(__filename, '..', '..', '..', 'resources', 'dark', `${iconName}.svg`))
            };
        }
    }
}

/**
 * Tree data provider for configuration settings
 */
export class ConfigurationTreeProvider implements vscode.TreeDataProvider<ConfigurationItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ConfigurationItem | undefined | null | void> = new vscode.EventEmitter<ConfigurationItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ConfigurationItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    private configStorage: ConfigStorage;
    
    constructor() {
        this.configStorage = ConfigStorage.getInstance();
    }
    
    /**
     * Refresh the tree view
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
    
    /**
     * Gets a tree item for a given element
     * @param element The element to get the tree item for
     * @returns The tree item
     */
    getTreeItem(element: ConfigurationItem): vscode.TreeItem {
        return element;
    }
    
    /**
     * Gets the path to the environment file
     * @returns The path to the environment file
     */
    getEnvFilePath(): string {
        const pathManager = PathManager.getInstance();
        return pathManager.getEnvFilePath();
    }
    
    /**
     * Gets the children of an element
     * @param element The element to get the children for
     * @returns A promise that resolves to the children of the element
     */
    async getChildren(element?: ConfigurationItem): Promise<ConfigurationItem[]> {
        if (!element) {
            // Root elements - only show HERCULES ENV FILE
            return [
                new ConfigurationItem(
                    'HERCULES ENV FILE',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    undefined,
                    undefined,
                    'config-category-env-files',
                    'file-code'
                )
            ];
        } else if (element.contextValue === 'config-category-env-files') {
            // Environment file management
            const envFilePath = this.getEnvFilePath();
            const pathManager = PathManager.getInstance();
            const serverMemPath = pathManager.getServerMemPath();
            const envFileExists = fs.existsSync(envFilePath);
            const envExamplePath = path.join(serverMemPath, 'env.example');
            const envExampleExists = fs.existsSync(envExamplePath);
            
            return [
                new ConfigurationItem(
                    'Edit',
                    vscode.TreeItemCollapsibleState.None,
                    'Edit environment file',
                    {
                        command: 'testzeus-hercules.editEnvFile',
                        title: 'Edit Environment File',
                        arguments: []
                    },
                    'env-command',
                    'edit'
                ),
                new ConfigurationItem(
                    'Reset',
                    vscode.TreeItemCollapsibleState.None,
                    'Reset from env.example template',
                    {
                        command: 'testzeus-hercules.resetEnvFile',
                        title: 'Reset Environment File',
                        arguments: []
                    },
                    'env-command',
                    'refresh'
                )
            ];
        }
        
        return [];
    }
}