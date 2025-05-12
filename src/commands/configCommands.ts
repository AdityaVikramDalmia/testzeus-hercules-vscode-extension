/**
 * Commands for managing configuration
 */

import * as vscode from 'vscode';
import { ConfigStorage } from '../utils/configStorage';
import { PathManager } from '../utils/pathManager';
import { getApiBaseUrl, getWsBaseUrl } from '../config/environment';

/**
 * Initializes the server_con folder in the extension's global storage
 * Copies content from the specified source directory
 */
export async function initializeServerConFolder(): Promise<void> {
    try {
        const pathManager = PathManager.getInstance();
        
        // Show an input box to get the source directory
        const sourceDir = await vscode.window.showInputBox({
            prompt: 'Enter the source directory to copy from (leave empty to only create folder)',
            placeHolder: '/path/to/source/directory',
            value: '/Users/aditya/Documents/personal/newProjects3/testzeus-hercules-extension/testzeus-hercules-test/.testzeus-hercules/data'
        });
        
        if (sourceDir === undefined) {
            // User canceled the input
            return;
        }
        
        const serverConPath = pathManager.initializeServerConFolder(sourceDir);
        
        if (serverConPath) {
            vscode.window.showInformationMessage(`Server connection folder initialized at: ${serverConPath}`);
        } else {
            vscode.window.showErrorMessage('Failed to initialize server connection folder.');
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Error initializing server connection folder: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Opens the configuration file in the editor
 */
export async function openConfigFile(): Promise<void> {
    try {
        const configStorage = ConfigStorage.getInstance();
        const configPath = configStorage.getConfigPath();
        
        // Check if the config file exists
        const fs = require('fs');
        if (!fs.existsSync(configPath)) {
            // Create a default config file if it doesn't exist
            const createFile = await vscode.window.showInformationMessage(
                'Configuration file does not exist. Do you want to create it?',
                'Yes', 'No'
            );
            
            if (createFile === 'Yes') {
                configStorage.createDefaultConfig();
            } else {
                return;
            }
        }
        
        // Open the config file in the editor
        const document = await vscode.workspace.openTextDocument(vscode.Uri.file(configPath));
        await vscode.window.showTextDocument(document);
    } catch (error) {
        vscode.window.showErrorMessage(`Error opening configuration file: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Creates a configuration file with default values
 */
export async function createConfigFile(): Promise<void> {
    try {
        const configStorage = ConfigStorage.getInstance();
        const configPath = configStorage.getConfigPath();
        
        // Check if the config file already exists
        const fs = require('fs');
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
        configStorage.createDefaultConfig();
        
        // Open the config file in the editor
        const document = await vscode.workspace.openTextDocument(vscode.Uri.file(configPath));
        await vscode.window.showTextDocument(document);
    } catch (error) {
        vscode.window.showErrorMessage(`Error creating configuration file: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Updates the TestZeus server URLs for HTTP and WebSocket connections
 */
export async function updateServerUrls(): Promise<void> {
    try {
        // Show current server settings
        const currentHttpUrl = getApiBaseUrl();
        const currentWsUrl = getWsBaseUrl();
        
        // Extract host and port from current URL (http://127.0.0.1:8001)
        const currentUrlMatch = currentHttpUrl.match(/[a-z]+:\/\/([^:]+):([0-9]+)/);
        const defaultUrl = currentUrlMatch ? `${currentUrlMatch[1]}:${currentUrlMatch[2]}` : '127.0.0.1:8001';
        
        // Show an input box to get the new server URL
        const serverUrlInput = await vscode.window.showInputBox({
            prompt: 'Enter the TestZeus server host:port',
            placeHolder: 'e.g., 127.0.0.1:8001',
            value: defaultUrl,
            validateInput: (value) => {
                if (!value) {
                    return 'Server URL cannot be empty';
                }
                
                // Check if it follows host:port format
                if (!/^[\w\.-]+:[0-9]+$/.test(value)) {
                    return 'Please enter a valid host:port combination (e.g., 127.0.0.1:8001)';
                }
                
                return null; // Input is valid
            }
        });
        
        if (!serverUrlInput) {
            // User canceled the input
            return;
        }
        
        // Parse host and port
        const [host, port] = serverUrlInput.split(':');
        
        // Create the new HTTP and WebSocket URLs
        const newHttpUrl = `http://${host}:${port}`;
        const newWsUrl = `ws://${host}:${port}`;
        
        // Update the configuration
        const config = vscode.workspace.getConfiguration('testzeus-hercules');
        
        // First update apiBaseUrl
        await config.update('apiBaseUrl', newHttpUrl, vscode.ConfigurationTarget.Global);
        
        // Then update wsBaseUrl
        await config.update('wsBaseUrl', newWsUrl, vscode.ConfigurationTarget.Global);
        
        vscode.window.showInformationMessage(
            `TestZeus server URLs updated successfully:\n` +
            `API: ${newHttpUrl}\n` +
            `WebSocket: ${newWsUrl}`
        );
        
    } catch (error) {
        vscode.window.showErrorMessage(`Error updating server URLs: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Opens or creates the configuration file from the extension's global storage path
 * This is used to configure TestZeus Hercules settings centrally
 */
export async function editConfigFile(): Promise<void> {
    try {
        const configStorage = ConfigStorage.getInstance();
        const configPath = configStorage.getConfigPath();
        
        // Check if the config file exists, create it if it doesn't
        const fs = require('fs');
        if (!fs.existsSync(configPath)) {
            // Create a default config file
            configStorage.createDefaultConfig();
            vscode.window.showInformationMessage('Created new configuration file with default settings.');
        }
        
        // Open the config file in the editor
        const document = await vscode.workspace.openTextDocument(vscode.Uri.file(configPath));
        await vscode.window.showTextDocument(document);
        
        vscode.window.showInformationMessage('Edit the settings and save the file to update TestZeus Hercules configuration.');
    } catch (error) {
        vscode.window.showErrorMessage(`Error managing configuration file: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Initializes the TestZeus Hercules directory structure
 * Creates all required folders based on the configuration
 */
export async function initializeHerculesDirectories(): Promise<void> {
    try {
        const pathManager = PathManager.getInstance();
        const folders = pathManager.createHerculesFolders();
        
        if (Object.keys(folders).length === 0) {
            vscode.window.showErrorMessage('Failed to create Hercules directories.');
            return;
        }
        
        // Create a sample Gherkin file if the input directory is empty
        const fs = require('fs');
        const path = require('path');
        
        if (fs.readdirSync(folders.input).length === 0) {
            const sampleFeatureContent = `Feature: Sample Test with TestZeus Hercules

Scenario: Basic Google Search
  Given I navigate to "https://www.google.com"
  When I enter "TestZeus Hercules" in the search box
  And I click the search button
  Then I should see search results for "TestZeus Hercules"
`;
            fs.writeFileSync(path.join(folders.input, 'sample.feature'), sampleFeatureContent);
        }
        
        // Create a sample test data file if the test data directory is empty
        if (fs.readdirSync(folders.testData).length === 0) {
            const sampleTestDataContent = `{
  "searchTerm": "TestZeus Hercules",
  "expectedTitle": "TestZeus Hercules - Google Search"
}`;
            fs.writeFileSync(path.join(folders.testData, 'test_data.json'), sampleTestDataContent);
        }
        
        vscode.window.showInformationMessage('Hercules directories initialized successfully. Sample files created.');
        
        // Open the sample feature file
        const document = await vscode.workspace.openTextDocument(vscode.Uri.file(path.join(folders.input, 'sample.feature')));
        await vscode.window.showTextDocument(document);
    } catch (error) {
        vscode.window.showErrorMessage(`Error initializing Hercules directories: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Resets the configuration file to default values
 * This will overwrite any existing configuration
 */
export async function resetConfigFile(): Promise<void> {
    try {
        const configStorage = ConfigStorage.getInstance();
        const configPath = configStorage.getConfigPath();
        
        // Check if the config file already exists
        const fs = require('fs');
        if (fs.existsSync(configPath)) {
            const reset = await vscode.window.showWarningMessage(
                'This will reset all configuration settings to default values. Are you sure you want to continue?',
                'Yes', 'No'
            );
            
            if (reset !== 'Yes') {
                return;
            }
        }
        
        // Create the default configuration file
        configStorage.createDefaultConfig();
        
        // Open the config file in the editor
        const document = await vscode.workspace.openTextDocument(vscode.Uri.file(configPath));
        await vscode.window.showTextDocument(document);
        
        vscode.window.showInformationMessage('Configuration has been reset to default values.');
    } catch (error) {
        vscode.window.showErrorMessage(`Error resetting configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
} 