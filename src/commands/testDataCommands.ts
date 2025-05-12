/**
 * Commands for managing test data files
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { GherkinScript } from '../models/GherkinScript';
import { getServerMemTestDataPath } from '../utils/serverMemPathHelper';
import { PathManager } from '../utils/pathManager';
import { pathExists } from '../utils/filesystem';

/**
 * Creates a new test data file
 * @param folder The folder to create the file in (optional)
 */
export async function createTestData(folder?: GherkinScript): Promise<void> {
    try {
        const pathManager = PathManager.getInstance();
        const globalStoragePath = pathManager.getGlobalStoragePath();
        const baseTestDataPath = getServerMemTestDataPath(globalStoragePath);
        
        // Determine the target folder
        let targetFolder = baseTestDataPath;
        if (folder && folder.isFolder && folder.resourceUri) {
            targetFolder = folder.resourceUri.fsPath;
        }
        
        // Prompt for file name
        const fileNameInput = await vscode.window.showInputBox({
            prompt: 'Enter a name for the test data file',
            placeHolder: 'sample_data.json'
        });
        
        if (!fileNameInput) {
            return; // User cancelled
        }
        
        // Add extension if not provided
        let fileName = fileNameInput;
        if (!fileName.includes('.')) {
            fileName += '.json';
        }
        
        // Create the full path
        const filePath = path.join(targetFolder, fileName);
        
        // Check if file already exists
        if (fs.existsSync(filePath)) {
            const overwrite = await vscode.window.showQuickPick(['Yes', 'No'], {
                placeHolder: `File ${fileName} already exists. Overwrite?`
            });
            
            if (overwrite !== 'Yes') {
                return; // User cancelled
            }
        }
        
        // Create sample test data content
        const testDataContent = JSON.stringify({
            "testData": {
                "users": [
                    {
                        "username": "testuser1",
                        "password": "password123",
                        "email": "testuser1@example.com"
                    }
                ],
                "testCases": [
                    {
                        "id": "TC001",
                        "description": "Sample test case",
                        "expectedResult": "Expected result"
                    }
                ]
            }
        }, null, 2);
        
        // Write the file
        fs.writeFileSync(filePath, testDataContent);
        
        // Open the file in the editor
        const document = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(document);
        
        vscode.window.showInformationMessage(`Test data file ${fileName} created successfully.`);
    } catch (error) {
        vscode.window.showErrorMessage(`Error creating test data file: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Creates a new folder for test data files
 * @param parent The parent folder (optional)
 */
export async function createTestDataFolder(parent?: GherkinScript): Promise<void> {
    try {
        const pathManager = PathManager.getInstance();
        const globalStoragePath = pathManager.getGlobalStoragePath();
        const baseTestDataPath = getServerMemTestDataPath(globalStoragePath);
        
        // Determine the parent folder
        let parentFolder = baseTestDataPath;
        if (parent && parent.isFolder && parent.resourceUri) {
            parentFolder = parent.resourceUri.fsPath;
        }
        
        // Prompt for folder name
        const folderName = await vscode.window.showInputBox({
            prompt: 'Enter a name for the new folder',
            placeHolder: 'my_test_data'
        });
        
        if (!folderName) {
            return; // User cancelled
        }
        
        // Create the full path
        const folderPath = path.join(parentFolder, folderName);
        
        // Check if folder already exists
        if (fs.existsSync(folderPath)) {
            vscode.window.showErrorMessage(`Folder ${folderName} already exists.`);
            return;
        }
        
        // Create the folder
        fs.mkdirSync(folderPath, { recursive: true });
        
        vscode.window.showInformationMessage(`Folder ${folderName} created successfully.`);
    } catch (error) {
        vscode.window.showErrorMessage(`Error creating folder: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Deletes a test data file
 * @param item The test data file to delete
 */
export async function deleteTestData(item: GherkinScript): Promise<void> {
    try {
        if (!item.resourceUri) {
            vscode.window.showErrorMessage('Invalid test data file.');
            return;
        }
        
        const filePath = item.resourceUri.fsPath;
        
        // Confirm deletion
        const confirm = await vscode.window.showQuickPick(['Yes', 'No'], {
            placeHolder: `Are you sure you want to delete ${item.label}?`
        });
        
        if (confirm !== 'Yes') {
            return; // User cancelled
        }
        
        // Delete the file
        if (item.isFolder) {
            // Delete the directory
            fs.rmdirSync(filePath, { recursive: true });
        } else {
            // Delete the file
            fs.unlinkSync(filePath);
        }
        
        vscode.window.showInformationMessage(`${item.isFolder ? 'Folder' : 'Test data file'} ${item.label} deleted successfully.`);
    } catch (error) {
        vscode.window.showErrorMessage(`Error deleting ${item.isFolder ? 'folder' : 'test data file'}: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Renames a test data file
 * @param item The test data file to rename
 */
export async function renameTestData(item: GherkinScript): Promise<void> {
    try {
        if (!item.resourceUri) {
            vscode.window.showErrorMessage('Invalid test data file.');
            return;
        }
        
        const filePath = item.resourceUri.fsPath;
        const dirName = path.dirname(filePath);
        const extension = item.isFolder ? '' : path.extname(filePath);
        const baseName = item.isFolder ? item.label : path.basename(filePath, extension);
        
        // Prompt for new name
        const newName = await vscode.window.showInputBox({
            prompt: `Enter a new name for the ${item.isFolder ? 'folder' : 'test data file'}`,
            value: baseName
        });
        
        if (!newName) {
            return; // User cancelled
        }
        
        // Create the new path
        const newPath = path.join(dirName, newName + extension);
        
        // Check if file already exists
        if (fs.existsSync(newPath)) {
            vscode.window.showErrorMessage(`A ${item.isFolder ? 'folder' : 'file'} with the name ${newName}${extension} already exists.`);
            return;
        }
        
        // Rename the file
        fs.renameSync(filePath, newPath);
        
        vscode.window.showInformationMessage(`${item.isFolder ? 'Folder' : 'Test data file'} renamed successfully.`);
    } catch (error) {
        vscode.window.showErrorMessage(`Error renaming ${item.isFolder ? 'folder' : 'test data file'}: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Duplicates a test data file
 * @param item The test data file to duplicate
 */
export async function duplicateTestData(item: GherkinScript): Promise<void> {
    try {
        if (!item.resourceUri || item.isFolder) {
            vscode.window.showErrorMessage('Invalid test data file for duplication.');
            return;
        }
        
        const filePath = item.resourceUri.fsPath;
        const dirName = path.dirname(filePath);
        const extension = path.extname(filePath);
        const baseName = path.basename(filePath, extension);
        
        // Prompt for new name
        const newName = await vscode.window.showInputBox({
            prompt: 'Enter a name for the duplicate file',
            value: `${baseName}_copy${extension}`
        });
        
        if (!newName) {
            return; // User cancelled
        }
        
        // Create the new path
        let newPath = path.join(dirName, newName);
        if (!newPath.endsWith(extension)) {
            newPath += extension;
        }
        
        // Check if file already exists
        if (fs.existsSync(newPath)) {
            vscode.window.showErrorMessage(`A file with the name ${newName} already exists.`);
            return;
        }
        
        // Copy the file
        fs.copyFileSync(filePath, newPath);
        
        // Open the file in the editor
        const document = await vscode.workspace.openTextDocument(newPath);
        await vscode.window.showTextDocument(document);
        
        vscode.window.showInformationMessage(`Test data file duplicated successfully.`);
    } catch (error) {
        vscode.window.showErrorMessage(`Error duplicating test data file: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Opens a QuickPick dialog to find and open test data files
 */
export async function findTestData(): Promise<void> {
    try {
        const pathManager = PathManager.getInstance();
        const globalStoragePath = pathManager.getGlobalStoragePath();
        const baseTestDataPath = getServerMemTestDataPath(globalStoragePath);
        
        if (!pathExists(baseTestDataPath)) {
            vscode.window.showErrorMessage('Test data directory does not exist.');
            return;
        }
        
        // Get all test data files
        const testDataFiles: { label: string; path: string }[] = [];
        
        // Function to recursively search for files
        function findFiles(directory: string, relativePath: string = ''): void {
            const entries = fs.readdirSync(directory, { withFileTypes: true });
            
            for (const entry of entries) {
                const entryPath = path.join(directory, entry.name);
                const entryRelativePath = path.join(relativePath, entry.name);
                
                if (entry.isDirectory()) {
                    findFiles(entryPath, entryRelativePath);
                } else {
                    testDataFiles.push({
                        label: entryRelativePath,
                        path: entryPath
                    });
                }
            }
        }
        
        findFiles(baseTestDataPath);
        
        if (testDataFiles.length === 0) {
            vscode.window.showInformationMessage('No test data files found.');
            return;
        }
        
        // Show QuickPick with all files
        const selected = await vscode.window.showQuickPick(testDataFiles, {
            placeHolder: 'Select a test data file to open'
        });
        
        if (selected) {
            const document = await vscode.workspace.openTextDocument(selected.path);
            await vscode.window.showTextDocument(document);
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Error finding test data files: ${error instanceof Error ? error.message : String(error)}`);
    }
}
