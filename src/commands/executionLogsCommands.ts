/**
 * Commands for handling execution logs via WebSocket terminal connections
 */

import * as vscode from 'vscode';
import { getApiBaseUrl, getWsBaseUrl, getWsLogsUrl } from '../config/environment';

/**
 * Opens a terminal and connects to the WebSocket logs endpoint for the given execution ID
 * @param executionId The execution ID to get logs for
 * @param wsUrl Optional WebSocket URL, will be generated if not provided
 */
export async function openExecutionLogs(executionId: string, wsUrl?: string): Promise<void> {
    if (!executionId) {
        vscode.window.showErrorMessage('No execution ID provided');
        return;
    }

    // Use provided WebSocket URL or build it from configuration
    const websocketUrl = wsUrl || getWsLogsUrl(executionId);
    
    // Log for debugging
    console.log(`Opening execution logs for ${executionId}`);
    console.log(`WebSocket URL: ${websocketUrl}`);
    
    try {
        // Create a new terminal for this execution's logs
        const terminal = vscode.window.createTerminal(`TestZeus Logs: ${executionId.substring(0, 8)}`);
        
        // Show the terminal
        terminal.show();
        
        // Log a message to the console for debugging
        console.log(`Connecting to WebSocket logs for execution: ${executionId}`);
        
        // Send the socat command to connect to the WebSocket endpoint
        terminal.sendText(`echo "Connecting to logs for execution ${executionId}..."`);
        terminal.sendText(`echo "WebSocket URL: ${websocketUrl}"`);
        terminal.sendText(`echo "----------------------------------------------"`);
        terminal.sendText(`socat - ${websocketUrl}`);
        
        // Show success message
        vscode.window.showInformationMessage(`Connected to logs for execution: ${executionId.substring(0, 8)}...`);
    } catch (error) {
        console.error('Error opening execution logs terminal:', error);
        vscode.window.showErrorMessage(`Failed to open logs terminal: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Fetches the list of executions from the API
 * @returns Promise containing the execution data list
 */
export async function fetchExecutions(): Promise<any[]> {
    try {
        // Use the vscode-axios module to make the API call
        const { default: axios } = require('axios');
        
        // Build the API URL with trailing slash
        const baseUrl = getApiBaseUrl();
        const apiUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
        const url = `${apiUrl}executions/`;
        
        console.log(`Fetching executions from: ${url}`);
        
        const response = await axios.get(url, {
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        return response.data || [];
    } catch (error) {
        console.error('Error fetching executions:', error);
        return [];
    }
}
