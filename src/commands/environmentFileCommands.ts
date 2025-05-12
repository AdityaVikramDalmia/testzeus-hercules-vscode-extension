/**
 * Command handlers for environment file operations
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { CONFIG_NAMESPACE } from '../constants/config';
import { getWorkspaceRoot, ensureHerculesDirectory } from '../utils/filesystem';
import { PathManager } from '../utils/pathManager';

const DEFAULT_ENV_CONTENT = `# TestZeus Hercules Environment Variables
# This file contains environment variables for the TestZeus Hercules extension

# API Keys (never commit these to version control)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Test Environment
TEST_BASE_URL=https://example.com
TEST_USERNAME=test_user
TEST_PASSWORD=test_password

# Browser Configuration
PLAYWRIGHT_BROWSER=chromium
HEADLESS=true
`;

/**
 * Opens the environment file in the editor
 */
export async function openEnvFile(): Promise<void> {
    const pathManager = PathManager.getInstance();
    const envFilePath = pathManager.getEnvFilePath();
    
    // Check if the file exists
    if (!fs.existsSync(envFilePath)) {
        const result = await vscode.window.showWarningMessage(
            `Environment file does not exist at ${envFilePath}. Would you like to create it?`,
            'Yes',
            'No'
        );
        
        if (result === 'Yes') {
            await createEnvFile();
            return;
        } else {
            return;
        }
    }
    
    // Open the file in the editor
    const document = await vscode.workspace.openTextDocument(envFilePath);
    await vscode.window.showTextDocument(document);
}

/**
 * Creates a new environment file
 */
export async function createEnvFile(): Promise<void> {
    const pathManager = PathManager.getInstance();
    const envFilePath = pathManager.getEnvFilePath();
    const serverMemPath = pathManager.getServerMemPath();
    const envExamplePath = path.join(serverMemPath, 'env.example');
    
    try {
        // Write the default content to the file
        fs.writeFileSync(envFilePath, DEFAULT_ENV_CONTENT, 'utf8');
        
        // Also create env.example with the same content if it doesn't exist
        if (!fs.existsSync(envExamplePath)) {
            fs.writeFileSync(envExamplePath, DEFAULT_ENV_CONTENT, 'utf8');
        }
        
        // Open the file in the editor
        const document = await vscode.workspace.openTextDocument(envFilePath);
        await vscode.window.showTextDocument(document);
        
        vscode.window.showInformationMessage(`Environment file created at ${envFilePath}`);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to create environment file: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Edits the environment file
 */
export async function editEnvFile(): Promise<void> {
    const pathManager = PathManager.getInstance();
    const envFilePath = pathManager.getEnvFilePath();
    
    // Check if the file exists
    if (!fs.existsSync(envFilePath)) {
        const result = await vscode.window.showWarningMessage(
            `Environment file does not exist at ${envFilePath}. Would you like to create it?`,
            'Yes',
            'No'
        );
        
        if (result === 'Yes') {
            await createEnvFile();
        }
        return;
    }
    
    // Open the file in the editor
    const document = await vscode.workspace.openTextDocument(envFilePath);
    await vscode.window.showTextDocument(document);
}

/**
 * Resets the environment file to the default content
 */
export async function resetEnvFile(): Promise<void> {
    const pathManager = PathManager.getInstance();
    const envFilePath = pathManager.getEnvFilePath();
    const serverMemPath = pathManager.getServerMemPath();
    const envExamplePath = path.join(serverMemPath, 'env.example');
    
    // Confirm with the user
    const result = await vscode.window.showWarningMessage(
        `Are you sure you want to reset the environment file at ${envFilePath}? This will delete the existing file and copy env.example to .env.`,
        'Yes',
        'No'
    );
    
    if (result !== 'Yes') {
        return;
    }
    
    try {
        // Delete the existing .env file if it exists
        if (fs.existsSync(envFilePath)) {
            fs.unlinkSync(envFilePath);
        }
        
        // Check if env.example exists, use it if available
        if (fs.existsSync(envExamplePath)) {
            // Copy env.example to .env
            fs.copyFileSync(envExamplePath, envFilePath);
            vscode.window.showInformationMessage(`Environment file reset using env.example template at ${envFilePath}`);
        } else {
            // If env.example doesn't exist, create .env with default content
            fs.writeFileSync(envFilePath, DEFAULT_ENV_CONTENT, 'utf8');
            
            // Also create env.example with the same content
            fs.writeFileSync(envExamplePath, DEFAULT_ENV_CONTENT, 'utf8');
            vscode.window.showInformationMessage(`Environment file and env.example template created at ${serverMemPath}`);
        }
        
        // Open the file in the editor
        const document = await vscode.workspace.openTextDocument(envFilePath);
        await vscode.window.showTextDocument(document);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to reset environment file: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Opens the environment file location in the explorer
 */
export async function openEnvLocation(): Promise<void> {
    const pathManager = PathManager.getInstance();
    const serverMemPath = pathManager.getServerMemPath();
    
    try {
        // Ensure the directory exists
        if (!fs.existsSync(serverMemPath)) {
            fs.mkdirSync(serverMemPath, { recursive: true });
        }
        
        // Open the folder in the explorer
        const uri = vscode.Uri.file(serverMemPath);
        vscode.commands.executeCommand('revealFileInOS', uri);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to open environment file location: ${error instanceof Error ? error.message : String(error)}`);
    }
} 