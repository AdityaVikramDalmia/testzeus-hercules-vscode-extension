/**
 * Command to open an execution folder in the file explorer
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Opens an execution folder in the file explorer
 * @param folderPath The path to the execution folder
 */
export async function openExecutionFolder(folderPath?: string): Promise<void> {
    try {
        // Check if the path is provided
        if (!folderPath) {
            throw new Error('No folder path provided');
        }
        
        // Check if the folder exists
        if (!fs.existsSync(folderPath)) {
            throw new Error(`Folder does not exist: ${folderPath}`);
        }
        
        // If the path is a file, get its parent directory
        let targetPath = folderPath;
        if (fs.statSync(folderPath).isFile()) {
            targetPath = path.dirname(folderPath);
        }
        
        // Open the folder with the system's default file explorer
        const success = await vscode.env.openExternal(vscode.Uri.file(targetPath));
        
        if (!success) {
            throw new Error(`Failed to open explorer for folder: ${targetPath}`);
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to open folder: ${error instanceof Error ? error.message : String(error)}`);
    }
}
