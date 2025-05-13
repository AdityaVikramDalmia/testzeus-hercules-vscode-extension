/**
 * Commands for managing the backend server connection
 */

import * as vscode from 'vscode';
import { PathManager } from '../utils/pathManager';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { CONFIG_NAMESPACE } from '../constants/config';

// Status bar item to display server connection status
let serverStatusBarItem: vscode.StatusBarItem;
let healthCheckInterval: NodeJS.Timeout | undefined;
const HEALTH_CHECK_INTERVAL_MS = 5000; // Check every 5 seconds

/**
 * Get the health check URL from configuration or environment variable
 */
function getHealthCheckUrl(): string {
    // First check for environment variable
    const envHealthPath = process.env.HEALTH_PATH_MAIN_CONNECT_SERVER;
    if (envHealthPath) {
        return envHealthPath;
    }
    
    // Fall back to configuration setting
    const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
    return config.get<string>('backendServerHealthPath') || 'http://127.0.0.1:8000/';
}

/**
 * Initialize backend server status bar item
 */
export function initializeBackendServerStatusBar(context: vscode.ExtensionContext): vscode.StatusBarItem {
    // Create status bar item for the backend server
    serverStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1001);
    serverStatusBarItem.text = "$(plug) Start Backend Server";
    serverStatusBarItem.tooltip = "Start the Python backend server";
    serverStatusBarItem.command = "testzeus-hercules.startBackendServer";
    
    // Make sure the status bar item is visible
    serverStatusBarItem.show();
    
    // Start health check immediately
    startServerHealthCheck();
    
    // Add to subscriptions for cleanup
    context.subscriptions.push(serverStatusBarItem);
    
    // Register configuration change event to update health check URL
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration(`${CONFIG_NAMESPACE}.backendServerHealthPath`)) {
            // Configuration changed, restart health check
            startServerHealthCheck();
        }
    }));
    
    return serverStatusBarItem;
}

/**
 * Perform HTTP request to check server status
 */
function makeHttpRequest(urlString: string): Promise<{status: number, data: string}> {
    return new Promise((resolve, reject) => {
        try {
            const url = new URL(urlString);
            const protocol = url.protocol === 'https:' ? https : http;
            
            const request = protocol.get(urlString, (response) => {
                let data = '';
                
                response.on('data', (chunk) => {
                    data += chunk;
                });
                
                response.on('end', () => {
                    resolve({
                        status: response.statusCode || 0,
                        data
                    });
                });
            });
            
            request.on('error', (error) => {
                reject(error);
            });
            
            request.setTimeout(3000, () => {
                request.destroy();
                reject(new Error('Request timeout'));
            });
            
            request.end();
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Start the backend server
 */
export async function startBackendServer(): Promise<void> {
    try {
        const pathManager = PathManager.getInstance();
        const globalStoragePath = pathManager.getGlobalStoragePath();
        const serverMemPath = path.join(globalStoragePath, 'serverMem');
        const healthCheckUrl = getHealthCheckUrl();
        
        // Check if server is already running
        try {
            const response = await makeHttpRequest(healthCheckUrl);
            if (response.status === 200) {
                vscode.window.showInformationMessage('Backend server is already running.');
                return;
            }
        } catch (error) {
            // Expected error if the server is not running, continue to start it
        }
        
        // Open a terminal and run the server
        const terminal = vscode.window.createTerminal('Backend Server');
        terminal.sendText(`cd "${serverMemPath}" && source venv/bin/activate && python server.py`);
        terminal.show();
        
        vscode.window.showInformationMessage('Starting backend server. Checking connection...');
        
        // Start health check if not already running
        startServerHealthCheck();
    } catch (error) {
        vscode.window.showErrorMessage(`Error starting backend server: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Start health check interval
 */
export function startServerHealthCheck(): void {
    // Clear existing interval if any
    if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
    }
    
    // Run health check immediately
    checkServerHealth();
    
    // Set up regular health checks
    healthCheckInterval = setInterval(checkServerHealth, HEALTH_CHECK_INTERVAL_MS);
}

/**
 * Check server health
 */
async function checkServerHealth(): Promise<void> {
    try {
        const healthCheckUrl = getHealthCheckUrl();
        const response = await makeHttpRequest(healthCheckUrl);
        
        if (response.status === 200) {
            // Server is healthy
            serverStatusBarItem.text = "$(check) Backend Server Connected";
            serverStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.successBackground');
            serverStatusBarItem.tooltip = "Backend server is running";
            serverStatusBarItem.command = undefined; // No need to start it again
        } else {
            // Server is responding but not with 200
            updateDisconnectedState();
        }
    } catch (error) {
        // Server is not responding
        updateDisconnectedState();
    }
}

/**
 * Update UI to show disconnected state
 */
function updateDisconnectedState(): void {
    serverStatusBarItem.text = "$(plug) Start Backend Server";
    serverStatusBarItem.backgroundColor = undefined; // Remove background color
    serverStatusBarItem.tooltip = "Start the Python backend server";
    serverStatusBarItem.command = "testzeus-hercules.startBackendServer";
}

/**
 * Dispose the health check interval
 */
export function disposeServerHealthCheck(): void {
    if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
        healthCheckInterval = undefined;
    }
}
