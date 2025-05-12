/**
 * Environment Provider for TestZeus Hercules
 * Displays environment settings and options
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { EnvironmentManager, ExecutionEnvironmentType } from '../utils/environmentManager';
import { DockerManager } from '../utils/dockerManager';

/**
 * Environment item class
 */
export class EnvironmentItem extends vscode.TreeItem {
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
 * Environment Provider class
 * Tree data provider for environment settings
 */
export class EnvironmentProvider implements vscode.TreeDataProvider<EnvironmentItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<EnvironmentItem | undefined | null | void> = new vscode.EventEmitter<EnvironmentItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<EnvironmentItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    private environmentManager: EnvironmentManager = EnvironmentManager.getInstance();
    private dockerManager: DockerManager = DockerManager.getInstance();
    
    constructor() {
        // No need for try-catch as instances are initialized above
    }
    
    /**
     * Refreshes the tree view
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
    
    /**
     * Gets a tree item for a given element
     * @param element The element to get the tree item for
     * @returns The tree item
     */
    getTreeItem(element: EnvironmentItem): vscode.TreeItem {
        return element;
    }
    
    /**
     * Gets the children of an element
     * @param element The element to get the children for
     * @returns A promise that resolves to the children of the element
     */
    async getChildren(element?: EnvironmentItem): Promise<EnvironmentItem[]> {
        if (!this.environmentManager || !this.dockerManager) {
            console.error('Environment or Docker manager not initialized');
            return [];
        }

        if (!element) {
            // Root elements - only showing Environment Tools
            return [
                new EnvironmentItem(
                    'Environment Tools',
                    vscode.TreeItemCollapsibleState.Expanded,
                    undefined,
                    undefined,
                    'environment-tools',
                    'tools'
                )
            ];
        } else if (element.contextValue === 'environment-tools') {
            // Environment tool options
            const currentEnvironment = this.environmentManager.getCurrentEnvironmentType();
            
            const tools: EnvironmentItem[] = [];
            
            // Three-step process for server setup
            tools.push(
                // Step 1: Set Up Project
                new EnvironmentItem(
                    'Step 1: Set Up Project',
                    vscode.TreeItemCollapsibleState.None,
                    'Create directory and clone the repository',
                    {
                        command: 'testzeus-hercules.setupProject',
                        title: 'Step 1: Set Up Project',
                        arguments: []
                    },
                    'tool-setup',
                    'setup'
                ),
                // Step 2: Install Hercules (Create virtual environment)
                new EnvironmentItem(
                    'Step 2: Create Virtual Environment',
                    vscode.TreeItemCollapsibleState.None,
                    'Create Python venv and install requirements',
                    {
                        command: 'testzeus-hercules.installHercules',
                        title: 'Step 2: Create Virtual Environment',
                        arguments: []
                    },
                    'tool-install',
                    'package'
                ),
                // Step 3: Run Server
                new EnvironmentItem(
                    'Step 3: Run Server',
                    vscode.TreeItemCollapsibleState.None,
                    'Run the Hercules MCP server',
                    {
                        command: 'testzeus-hercules.runServer',
                        title: 'Step 3: Run Server',
                        arguments: []
                    },
                    'tool-run',
                    'play'
                )
            );
            
            // No additional tools needed
            
            // Add Docker-specific tools if in Docker environment
            if (currentEnvironment === ExecutionEnvironmentType.DOCKER) {
                tools.push(
                    new EnvironmentItem(
                        'Pull Docker Image',
                        vscode.TreeItemCollapsibleState.None,
                        'Pull latest Hercules Docker image',
                        {
                            command: 'testzeus-hercules.pullDockerImage',
                            title: 'Pull Docker Image',
                            arguments: []
                        },
                        'tool-docker',
                        'docker'
                    )
                );
            }
            
            return tools;
        }
        
        return [];
    }
} 