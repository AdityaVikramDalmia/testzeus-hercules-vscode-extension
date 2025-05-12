/**
 * Commands for script configuration
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ScriptConfigProvider } from '../providers/ScriptConfigProvider';
import { getWorkspaceRoot } from '../utils/filesystem';

// Instance of the script config provider
let scriptConfigProvider: ScriptConfigProvider | undefined;

/**
 * Initialize the script config provider
 * @param context Extension context
 */
export function initScriptConfigProvider(context: vscode.ExtensionContext): ScriptConfigProvider {
    scriptConfigProvider = new ScriptConfigProvider(context);
    return scriptConfigProvider;
}

/**
 * Open a script configuration file
 */
export async function openScriptConfig(): Promise<void> {
    if (!scriptConfigProvider) {
        vscode.window.showErrorMessage('Script config provider not initialized');
        return;
    }
    
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace folder is open');
        return;
    }
    
    // Find all script config files in the workspace
    const configFiles = await findScriptConfigFiles(workspaceRoot);
    
    if (configFiles.length === 0) {
        // No config files found, ask if user wants to create one
        const createNew = await vscode.window.showInformationMessage(
            'No script configuration files found. Would you like to create a new one?',
            'Create New', 'Cancel'
        );
        
        if (createNew === 'Create New') {
            await scriptConfigProvider.open();
        }
        return;
    }
    
    // If there are multiple config files, let the user select one
    const configItems = configFiles.map(file => {
        const fileName = path.basename(file);
        return {
            label: fileName,
            description: path.relative(workspaceRoot, file),
            file
        };
    });
    
    // Add an option to create a new config file
    configItems.push({
        label: '$(add) Create New Configuration',
        description: 'Create a new script configuration file',
        file: ''
    });
    
    const selected = await vscode.window.showQuickPick(configItems, {
        placeHolder: 'Select a script configuration file to open'
    });
    
    if (!selected) {
        return;
    }
    
    if (selected.file === '') {
        // Create a new config file
        await scriptConfigProvider.open();
    } else {
        // Open the selected config file
        await scriptConfigProvider.open(selected.file);
    }
}

/**
 * Create a new script configuration file
 */
export async function createScriptConfig(): Promise<void> {
    if (!scriptConfigProvider) {
        vscode.window.showErrorMessage('Script config provider not initialized');
        return;
    }
    
    await scriptConfigProvider.open();
}

/**
 * Edit a script configuration file in raw JSON mode
 */
export async function editScriptConfigRaw(): Promise<void> {
    if (!scriptConfigProvider) {
        vscode.window.showErrorMessage('Script config provider not initialized');
        return;
    }
    
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace folder is open');
        return;
    }
    
    // Find all script config files in the workspace
    const configFiles = await findScriptConfigFiles(workspaceRoot);
    
    if (configFiles.length === 0) {
        // No config files found, ask if user wants to create one
        const createNew = await vscode.window.showInformationMessage(
            'No script configuration files found. Would you like to create a new one?',
            'Create New', 'Cancel'
        );
        
        if (createNew === 'Create New') {
            await scriptConfigProvider.open(undefined, true);
        }
        return;
    }
    
    // If there are multiple config files, let the user select one
    const configItems = configFiles.map(file => {
        const fileName = path.basename(file);
        return {
            label: fileName,
            description: path.relative(workspaceRoot, file),
            file
        };
    });
    
    const selected = await vscode.window.showQuickPick(configItems, {
        placeHolder: 'Select a script configuration file to edit in raw mode'
    });
    
    if (!selected) {
        return;
    }
    
    // Open the selected config file in raw mode
    await scriptConfigProvider.open(selected.file, true);
}

/**
 * Find script configuration files in the workspace
 * @param workspaceRoot Workspace root path
 * @returns Array of script config file paths
 */
async function findScriptConfigFiles(workspaceRoot: string): Promise<string[]> {
    const result: string[] = [];
    
    // Look for JSON files that might be script configs
    const jsonFiles = await vscode.workspace.findFiles('**/*.json', '**/node_modules/**');
    
    for (const file of jsonFiles) {
        try {
            const content = fs.readFileSync(file.fsPath, 'utf8');
            const config = JSON.parse(content);
            
            // Check if this looks like a script config file (has common script config properties)
            if (config.scriptSettings || 
                (config.browser && typeof config.browser === 'object') ||
                (config.execution && typeof config.execution === 'object')) {
                result.push(file.fsPath);
            }
        } catch (err) {
            // Skip files that can't be read or parsed
            continue;
        }
    }
    
    return result;
} 