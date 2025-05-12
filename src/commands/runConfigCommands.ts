/**
 * Commands for managing Run Config
 */

import * as vscode from 'vscode';
import * as axios from 'axios';
import { EnvironmentManager } from '../utils/environmentManager';

/**
 * Send a test run request to the backend
 * @param payload The payload to send to the backend
 * @returns A promise that resolves when the operation is complete
 */
export async function sendTestRunRequest(payload: any): Promise<void> {
    try {
        // Get the backend server URL from environment manager
        const environmentManager = EnvironmentManager.getInstance();
        const serverUrl = 'http://127.0.0.1:8000'; // Default URL, can be replaced with environment config
        
        // Send the request to the backend
        const response = await axios.default.post(`${serverUrl}/tests/run-from-template`, payload);
        
        // Show the response in an information message
        if (response.status >= 200 && response.status < 300) {
            vscode.window.showInformationMessage(`Tests started running. Response status: ${response.status}`);
            return response.data;
        } else {
            throw new Error(`Unexpected status code: ${response.status}`);
        }
    } catch (error) {
        console.error('Error sending test run request:', error);
        vscode.window.showErrorMessage(`Error sending test run request: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
    }
}
