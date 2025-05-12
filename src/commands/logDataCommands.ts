/**
 * Commands for the Log Data view
 */

import * as vscode from 'vscode';
import { getWsBaseUrl } from '../config/environment';

/**
 * Opens a terminal and connects to WebSocket logs for the given execution ID
 * @param executionId ID of the execution to view logs for
 */
export async function openExecutionTerminal(executionId: string): Promise<void> {
    if (!executionId) {
        vscode.window.showErrorMessage('No execution ID provided');
        return;
    }
    
    try {
        // Create a new terminal instance
        const terminal = vscode.window.createTerminal(`TestZeus Logs: ${executionId.substring(0, 8)}...`);
        
        // Get the WebSocket URL for logs
        const wsBaseUrl = getWsBaseUrl();
        const wsUrl = `${wsBaseUrl}/ws/logs/${executionId}`;
        
        // Run websocat command to connect to WebSocket
        terminal.sendText(`websocat ${wsUrl}`);
        
        // Show the terminal
        terminal.show();
        
        vscode.window.showInformationMessage(`Connected to logs for execution ${executionId.substring(0, 8)}...`);
    } catch (error) {
        console.error('Failed to open execution terminal:', error);
        vscode.window.showErrorMessage(`Failed to open logs: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Refreshes the Log Data view
 * @param logDataProvider The LogDataProvider instance
 */
export function refreshLogData(logDataProvider: any): void {
    if (logDataProvider && typeof logDataProvider.refresh === 'function') {
        logDataProvider.refresh();
    }
}
