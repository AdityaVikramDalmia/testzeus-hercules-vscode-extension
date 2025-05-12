/**
 * Commands for handling screenshots
 */

import * as vscode from 'vscode';

/**
 * Opens a screenshot in the default viewer
 * @param screenshotPath Path to the screenshot file
 */
export async function openScreenshot(screenshotPath: string): Promise<void> {
    try {
        if (!screenshotPath) {
            vscode.window.showErrorMessage('No screenshot path provided');
            return;
        }
        
        // Open the screenshot in the default OS viewer
        const uri = vscode.Uri.file(screenshotPath);
        await vscode.commands.executeCommand('vscode.open', uri);
        
    } catch (error) {
        vscode.window.showErrorMessage(`Error opening screenshot: ${error instanceof Error ? error.message : String(error)}`);
    }
} 