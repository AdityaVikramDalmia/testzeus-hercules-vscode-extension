/**
 * Commands for managing configuration
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigManager } from '../utils/configManager';

/**
 * Opens the configuration file in the editor
 */
export async function openConfigFile(): Promise<void> {
    const configManager = ConfigManager.getInstance();
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace folder is open. Please open a folder to manage configuration.');
        return;
    }
    
    const configPath = path.join(workspaceRoot, 'testzeus-hercules.config.json');
    
    // Check if the config file exists
    if (!fs.existsSync(configPath)) {
        // Create a default config file if it doesn't exist
        const createFile = await vscode.window.showInformationMessage(
            'Configuration file does not exist. Do you want to create it?',
            'Yes', 'No'
        );
        
        if (createFile === 'Yes') {
            configManager.createDefaultConfig();
        } else {
            return;
        }
    }
    
    // Open the config file in the editor
    const document = await vscode.workspace.openTextDocument(configPath);
    await vscode.window.showTextDocument(document);
}

/**
 * Creates a configuration file with default values
 */
export async function createConfigFile(): Promise<void> {
    const configManager = ConfigManager.getInstance();
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace folder is open. Please open a folder to create a configuration file.');
        return;
    }
    
    const configPath = path.join(workspaceRoot, 'testzeus-hercules.config.json');
    
    // Check if the config file already exists
    if (fs.existsSync(configPath)) {
        const overwrite = await vscode.window.showWarningMessage(
            'Configuration file already exists. Do you want to overwrite it?',
            'Yes', 'No'
        );
        
        if (overwrite !== 'Yes') {
            return;
        }
    }
    
    // Create the default configuration file
    configManager.createDefaultConfig();
    
    // Open the config file in the editor
    const document = await vscode.workspace.openTextDocument(configPath);
    await vscode.window.showTextDocument(document);
} 