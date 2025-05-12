/**
 * Command to open screenshots in an external application
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import { join } from 'path';

/**
 * Opens a screenshot file in the system's default application
 * @param screenshotPath The path to the screenshot file
 */
export async function openScreenshot(screenshotPath?: string): Promise<void> {
    try {
        // Check if the path is provided
        if (!screenshotPath) {
            throw new Error('No screenshot path provided');
        }
        
        // Check if the file exists
        if (!fs.existsSync(screenshotPath)) {
            throw new Error(`Screenshot file does not exist: ${screenshotPath}`);
        }
        
        // Open the file with the system's default application
        vscode.env.openExternal(vscode.Uri.file(screenshotPath));
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to open screenshot: ${error instanceof Error ? error.message : String(error)}`);
    }
} 