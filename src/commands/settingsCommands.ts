/**
 * Command handlers for settings-related commands
 */

import * as vscode from 'vscode';
import { CONFIG_NAMESPACE } from '../constants/config';
import { validateLlmConfigFile } from '../utils/config';
import { ConfigStorage } from '../utils/configStorage';

/**
 * Opens the settings view
 */
export function openSettings(): void {
    vscode.commands.executeCommand('workbench.action.openSettings', CONFIG_NAMESPACE);
}

/**
 * Selects an LLM config file
 */
export async function selectLlmConfigFile(): Promise<void> {
    const options: vscode.OpenDialogOptions = {
        canSelectMany: false,
        openLabel: 'Select',
        filters: {
            'JSON Files': ['json']
        }
    };
    
    const fileUri = await vscode.window.showOpenDialog(options);
    if (fileUri && fileUri[0]) {
        const filePath = fileUri[0].fsPath;
        const validation = validateLlmConfigFile(filePath);
        
        if (validation.isValid) {
            // Update the configuration
            const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
            await config.update('llmConfigFile', filePath, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage('LLM Config File validated and saved successfully.');
        } else {
            vscode.window.showErrorMessage(`Invalid LLM Config File: ${validation.message}`);
        }
    }
}

/**
 * Open all extension settings in VS Code settings UI
 */
export async function openAllSettings(): Promise<void> {
    await vscode.commands.executeCommand('workbench.action.openSettings', 'testzeus-hercules');
}

/**
 * Open a quick pick menu for all configuration categories
 */
export async function openConfigQuickPick(): Promise<void> {
    const configItems = [
        { label: '$(gear) LLM Configuration', description: 'API Keys, Models, Config Files', detail: 'Configure LLM settings', command: 'testzeus-hercules.openLlmSettings' },
        { label: '$(folder) Project Settings', description: 'Paths, Directories', detail: 'Configure project directories', command: 'testzeus-hercules.openProjectSettings' },
        { label: '$(browser) Browser Settings', description: 'Browser type, headless mode, screenshots', detail: 'Configure browser behavior', command: 'testzeus-hercules.openBrowserSettings' },
        { label: '$(settings) Advanced Settings', description: 'Telemetry, Tools, Playwright', detail: 'Configure advanced options', command: 'testzeus-hercules.openAdvancedSettings' },
        { label: '$(file) Open Config File', description: 'Edit JSON configuration file directly', detail: 'Open and edit the configuration file', command: 'testzeus-hercules.openConfigFile' },
        { label: '$(refresh) Reset Configuration', description: 'Reset to default settings', detail: 'Reset all configuration to defaults', command: 'testzeus-hercules.resetConfigFile' },
    ];

    const selected = await vscode.window.showQuickPick(configItems, { 
        placeHolder: 'Select configuration category',
        matchOnDescription: true,
        matchOnDetail: true
    });

    if (selected) {
        await vscode.commands.executeCommand(selected.command);
    }
}

/**
 * Open LLM settings in VS Code settings UI
 */
export async function openLlmSettings(): Promise<void> {
    await vscode.commands.executeCommand('workbench.action.openSettings', 'testzeus-hercules.llm');
}

/**
 * Open Project settings in VS Code settings UI
 */
export async function openProjectSettings(): Promise<void> {
    await vscode.commands.executeCommand('workbench.action.openSettings', 'testzeus-hercules.project');
}

/**
 * Open Browser settings in VS Code settings UI
 */
export async function openBrowserSettings(): Promise<void> {
    await vscode.commands.executeCommand('workbench.action.openSettings', 'testzeus-hercules.browser');
}

/**
 * Open Advanced settings in VS Code settings UI
 */
export async function openAdvancedSettings(): Promise<void> {
    await vscode.commands.executeCommand('workbench.action.openSettings', 'testzeus-hercules.advanced');
} 