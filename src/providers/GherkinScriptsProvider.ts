/**
 * Provider for Gherkin scripts tree view
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { GherkinScript } from '../models/GherkinScript';
import { ensureHerculesDirectory, pathExists, createSampleGherkinScript } from '../utils/filesystem';
import { PathManager } from '../utils/pathManager';
import { getServerMemFeaturesPath } from '../utils/serverMemPathHelper';

/**
 * TreeDataProvider for the Gherkin Scripts view
 */
export class GherkinScriptsProvider implements vscode.TreeDataProvider<GherkinScript> {
    private _onDidChangeTreeData: vscode.EventEmitter<GherkinScript | undefined | null | void> = new vscode.EventEmitter<GherkinScript | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<GherkinScript | undefined | null | void> = this._onDidChangeTreeData.event;

    /**
     * Creates a new GherkinScriptsProvider instance
     * @param workspaceRoot The workspace root path
     */
    constructor(private workspaceRoot: string | undefined) {}

    /**
     * Refreshes the tree view
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * Gets the TreeItem for the given element
     * @param element The element to get the TreeItem for
     * @returns The TreeItem for the element
     */
    getTreeItem(element: GherkinScript): vscode.TreeItem {
        return element;
    }

    /**
     * Gets the children of the given element
     * @param element The element to get the children for
     * @returns A promise that resolves to the children of the element
     */
    getChildren(element?: GherkinScript): Thenable<GherkinScript[]> {
        if (element && element.isFolder && element.resourceUri) {
            // If the element is a folder, return its children
            return this.getGherkinScriptsInFolder(element.resourceUri.fsPath);
        } else {
            // Use serverMem/data/manager/lib/features path for Gherkin scripts
            try {
                const pathManager = PathManager.getInstance();
                const globalStoragePath = pathManager.getGlobalStoragePath();
                
                // Get the serverMem features path
                const serverMemFeaturesPath = getServerMemFeaturesPath(globalStoragePath);
                console.log(`Loading Gherkin scripts from: ${serverMemFeaturesPath}`);
                
                // If the directory is empty, create a sample script
                const entries = fs.readdirSync(serverMemFeaturesPath, { withFileTypes: true });
                // if (entries.length === 0) {
                //     createSampleGherkinScript(serverMemFeaturesPath);
                //     console.log(`Created sample Gherkin script in ${serverMemFeaturesPath}`);
                // }
                
                // Check if we need to migrate scripts from the old location
                // const folders = pathManager.createHerculesFolders();
                // if (folders && folders.input && pathExists(folders.input)) {
                //     // Check if we need to copy existing scripts
                //     const inputEntries = fs.readdirSync(folders.input, { withFileTypes: true });
                //     for (const entry of inputEntries) {
                //         if (entry.isFile() && entry.name.endsWith('.feature')) {
                //             const sourcePath = path.join(folders.input, entry.name);
                //             const destPath = path.join(serverMemFeaturesPath, entry.name);
                //             // Only copy if the file doesn't exist in the destination
                //             if (!fs.existsSync(destPath)) {
                //                 fs.copyFileSync(sourcePath, destPath);
                //                 console.log(`Migrated ${entry.name} to serverMem features directory`);
                //             }
                //         }
                //     }
                // }
                
                return this.getGherkinScriptsInFolder(serverMemFeaturesPath);
            } catch (error) {
                console.error('Error loading Gherkin scripts:', error);
                vscode.window.showInformationMessage('Global storage is not available. Please restart VS Code and try again.');
                return Promise.resolve([]);
            }
        }
    }

    /**
     * Gets the Gherkin scripts in the given directory
     * @param scriptsPath The path to the directory containing the Gherkin scripts
     * @returns A promise that resolves to the Gherkin scripts
     */
    private async getGherkinScriptsInFolder(folderPath: string): Promise<GherkinScript[]> {
        if (pathExists(folderPath)) {
            const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });
            
            // Process folders first, then files for nicer organization
            const folders: GherkinScript[] = [];
            const files: GherkinScript[] = [];
            
            for (const entry of entries) {
                const entryPath = path.join(folderPath, entry.name);
                
                if (entry.isDirectory()) {
                    // This is a directory
                    folders.push(new GherkinScript(
                        entry.name,
                        vscode.TreeItemCollapsibleState.Collapsed,
                        undefined,
                        entryPath,
                        true
                    ));
                } else if (entry.isFile() && entry.name.endsWith('.feature')) {
                    // This is a feature file
                    files.push(new GherkinScript(
                        entry.name,
                        vscode.TreeItemCollapsibleState.None,
                        {
                            command: 'vscode.open',
                            title: 'Open Gherkin Script',
                            arguments: [vscode.Uri.file(entryPath)]
                        },
                        entryPath,
                        false
                    ));
                }
            }
            
            // Return folders first, then files
            return [...folders, ...files];
        } else {
            return [];
        }
    }
} 