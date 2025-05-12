/**
 * Commands for handling test reports
 */

import * as vscode from 'vscode';

/**
 * Opens a test report in the default viewer
 * @param reportPath Path to the report file
 */
export async function openTestReport(reportPath: string): Promise<void> {
    try {
        if (!reportPath) {
            vscode.window.showErrorMessage('No report path provided');
            return;
        }
        
        // Open the report in the default OS viewer
        const uri = vscode.Uri.file(reportPath);
        await vscode.commands.executeCommand('vscode.open', uri);
        
    } catch (error) {
        vscode.window.showErrorMessage(`Error opening test report: ${error instanceof Error ? error.message : String(error)}`);
    }
} 