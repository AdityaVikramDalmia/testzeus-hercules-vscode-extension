/**
 * Command to open HTML reports in the browser
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Opens an HTML report file in the default browser
 * @param reportPath The path to the HTML report file
 */
export async function openBrowserHtmlReport(reportPath?: string): Promise<void> {
    try {
        // Check if the path is provided
        if (!reportPath) {
            throw new Error('No report path provided');
        }
        
        // Check if the file exists
        if (!fs.existsSync(reportPath)) {
            throw new Error(`Report file does not exist: ${reportPath}`);
        }
        
        // Convert XML path to HTML path if needed
        let htmlPath = reportPath;
        if (path.extname(reportPath) === '.xml') {
            // Try to find a matching HTML file in the same directory
            const baseName = path.basename(reportPath, '.xml');
            const dirName = path.dirname(reportPath);
            const possibleHtmlPath = path.join(dirName, `${baseName}.html`);
            
            if (fs.existsSync(possibleHtmlPath)) {
                htmlPath = possibleHtmlPath;
            }
        }
        
        // Open the file with the system's default browser
        const success = await vscode.env.openExternal(vscode.Uri.file(htmlPath));
        
        if (!success) {
            throw new Error(`Failed to open browser for HTML report: ${htmlPath}`);
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to open HTML report in browser: ${error instanceof Error ? error.message : String(error)}`);
    }
}
