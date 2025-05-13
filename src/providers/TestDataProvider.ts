/**
 * Provider for Test Data tree view
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TestData } from '../models/TestData';
import { ensureHerculesDirectory, pathExists, createSampleGherkinScript } from '../utils/filesystem';
import { PathManager } from '../utils/pathManager';
import { getServerMemTestDataPath } from '../utils/serverMemPathHelper';

/**
 * TreeDataProvider for the Test Data view
 */
export class TestDataProvider implements vscode.TreeDataProvider<TestData> {
    private _onDidChangeTreeData: vscode.EventEmitter<TestData | undefined | null | void> = new vscode.EventEmitter<TestData | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TestData | undefined | null | void> = this._onDidChangeTreeData.event;

    /**
     * Creates a new TestDataProvider instance
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
    getTreeItem(element: TestData): vscode.TreeItem {
        return element;
    }

    /**
     * Gets the children of the given element
     * @param element The element to get the children for
     * @returns A promise that resolves to the children of the element
     */
    getChildren(element?: TestData): Thenable<TestData[]> {
        if (element && element.isFolder && element.resourceUri) {
            // If the element is a folder, return its children
            return this.getTestDataInFolder(element.resourceUri.fsPath);
        } else {
            // Use serverMem/data/manager/exec/lib/test_data path for Test Data
            try {
                const pathManager = PathManager.getInstance();
                const globalStoragePath = pathManager.getGlobalStoragePath();
                
                // Get the serverMem test_data path
                const serverMemTestDataPath = getServerMemTestDataPath(globalStoragePath);
                console.log(`Loading Test Data from: ${serverMemTestDataPath}`);
                
                // Create directory if it doesn't exist
                if (!fs.existsSync(serverMemTestDataPath)) {
                    fs.mkdirSync(serverMemTestDataPath, { recursive: true });
                    console.log(`Created Test Data directory: ${serverMemTestDataPath}`);
                }
                
                // If the directory is empty, create a sample file
                const entries = fs.readdirSync(serverMemTestDataPath, { withFileTypes: true });
                // if (entries.length === 0) {
                //     this.createSampleTestDataFile(serverMemTestDataPath);
                //     console.log(`Created sample Test Data file in ${serverMemTestDataPath}`);
                // }
                
                return this.getTestDataInFolder(serverMemTestDataPath);
            } catch (error) {
                console.error('Error loading Test Data:', error);
                vscode.window.showInformationMessage('Global storage is not available. Please restart VS Code and try again.');
                return Promise.resolve([]);
            }
        }
    }

    /**
     * Gets the Test Data files in the given directory
     * @param folderPath The path to the directory containing the Test Data files
     * @returns A promise that resolves to the Test Data files
     */
    private async getTestDataInFolder(folderPath: string): Promise<TestData[]> {
        if (pathExists(folderPath)) {
            const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });
            
            // Process folders first, then files for nicer organization
            const folders: TestData[] = [];
            const files: TestData[] = [];
            
            for (const entry of entries) {
                const entryPath = path.join(folderPath, entry.name);
                
                if (entry.isDirectory()) {
                    // This is a directory
                    folders.push(new TestData(
                        entry.name,
                        vscode.TreeItemCollapsibleState.Collapsed,
                        undefined,
                        entryPath,
                        true
                    ));
                } else if (entry.isFile()) {
                    // This is a test data file
                    files.push(new TestData(
                        entry.name,
                        vscode.TreeItemCollapsibleState.None,
                        {
                            command: 'vscode.open',
                            title: 'Open Test Data File',
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

    /**
     * Creates a sample Test Data file
     * @param directory The directory to create the sample file in
     */
    private createSampleTestDataFile(directory: string): void {
        const sampleFilePath = path.join(directory, 'sample_data.json');
        const sampleContent = JSON.stringify({
            "testData": {
                "users": [
                    {
                        "username": "testuser1",
                        "password": "password123",
                        "email": "testuser1@example.com"
                    },
                    {
                        "username": "testuser2",
                        "password": "password456",
                        "email": "testuser2@example.com"
                    }
                ],
                "testCases": [
                    {
                        "id": "TC001",
                        "description": "Verify login functionality",
                        "expectedResult": "User should be able to login successfully"
                    }
                ]
            }
        }, null, 2);
        
        fs.writeFileSync(sampleFilePath, sampleContent);
    }
}
