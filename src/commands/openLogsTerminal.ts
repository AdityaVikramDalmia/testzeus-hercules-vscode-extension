/**
 * Command to open the logs terminal
 */

import * as vscode from 'vscode';
import { LiveLogsProvider } from '../providers/LiveLogsProvider';

/**
 * Opens the logs terminal
 * @param liveLogsProvider The live logs provider
 */
export function openLogsTerminal(liveLogsProvider: LiveLogsProvider): void {
    try {
        // Get the logs terminal
        const terminal = liveLogsProvider.getTerminal();
        
        // Show the terminal
        terminal.show();
    } catch (error) {
        vscode.window.showErrorMessage(`Error opening logs terminal: ${error instanceof Error ? error.message : String(error)}`);
    }
} 