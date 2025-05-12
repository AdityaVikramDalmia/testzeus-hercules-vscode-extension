/**
 * Provider for Permanent Storage tree view
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { GherkinScript } from '../models/GherkinScript';
import { ensureHerculesDirectory, pathExists } from '../utils/filesystem';
import { PathManager } from '../utils/pathManager';
import { getServerMemPermanentStoragePath } from '../utils/serverMemPathHelper';

/**
 * TreeDataProvider for the Permanent Storage view
 * Provides a full file explorer for the /serverMem/data/manager/perm directory
 */
export class PermanentStorageProvider implements vscode.TreeDataProvider<GherkinScript> {
    private _onDidChangeTreeData: vscode.EventEmitter<GherkinScript | undefined | null | void> = new vscode.EventEmitter<GherkinScript | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<GherkinScript | undefined | null | void> = this._onDidChangeTreeData.event;

    /**
     * Creates a new PermanentStorageProvider instance
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
            return this.getFilesInFolder(element.resourceUri.fsPath);
        } else {
            // Use serverMem/data/manager/perm path for Permanent Storage
            try {
                const pathManager = PathManager.getInstance();
                const globalStoragePath = pathManager.getGlobalStoragePath();
                
                // Get the serverMem permanent storage path
                const serverMemPermPath = getServerMemPermanentStoragePath(globalStoragePath);
                console.log(`Loading Permanent Storage from: ${serverMemPermPath}`);
                
                // Create directory if it doesn't exist
                if (!fs.existsSync(serverMemPermPath)) {
                    fs.mkdirSync(serverMemPermPath, { recursive: true });
                    console.log(`Created Permanent Storage directory: ${serverMemPermPath}`);
                }
                
                return this.getFilesInFolder(serverMemPermPath);
            } catch (error) {
                console.error('Error loading Permanent Storage:', error);
                vscode.window.showInformationMessage('Global storage is not available. Please restart VS Code and try again.');
                return Promise.resolve([]);
            }
        }
    }

    /**
     * Gets the files and folders in the given directory
     * @param folderPath The path to the directory containing the files
     * @returns A promise that resolves to the list of files and folders
     */
    private async getFilesInFolder(folderPath: string): Promise<GherkinScript[]> {
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
                } else if (entry.isFile()) {
                    // This is a file
                    let fileIconPath: { light: string; dark: string } | undefined;
                    
                    // Set different icons based on file extension
                    const fileExt = path.extname(entry.name).toLowerCase();
                    if (['.json', '.yaml', '.yml'].includes(fileExt)) {
                        fileIconPath = {
                            light: path.join(__filename, '..', '..', '..', 'resources', 'light', 'json.svg'),
                            dark: path.join(__filename, '..', '..', '..', 'resources', 'dark', 'json.svg')
                        };
                    } else if (['.txt', '.md'].includes(fileExt)) {
                        fileIconPath = {
                            light: path.join(__filename, '..', '..', '..', 'resources', 'light', 'document.svg'),
                            dark: path.join(__filename, '..', '..', '..', 'resources', 'dark', 'document.svg')
                        };
                    }
                    
                    files.push(new GherkinScript(
                        entry.name,
                        vscode.TreeItemCollapsibleState.None,
                        {
                            command: 'vscode.open',
                            title: 'Open File',
                            arguments: [vscode.Uri.file(entryPath)]
                        },
                        entryPath,
                        false
                    ));
                }
            }
            
            // Return folders first, then files (alphabetically sorted within each group)
            return [
                ...folders.sort((a, b) => a.label!.localeCompare(b.label!)),
                ...files.sort((a, b) => a.label!.localeCompare(b.label!))
            ];
        } else {
            return [];
        }
    }
}
