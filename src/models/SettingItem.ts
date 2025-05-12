/**
 * Setting item models
 */

import * as vscode from 'vscode';

/**
 * Represents a setting in the Settings tree view
 */
export class SettingItem extends vscode.TreeItem {
    /**
     * Creates a new SettingItem instance
     * @param label The display label for the tree item
     * @param value The value of the setting
     * @param collapsibleState Whether the tree item is collapsible
     * @param command The command to execute when the tree item is selected
     * @param contextValue The context value for the tree item
     */
    constructor(
        public readonly label: string,
        private value: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command,
        public readonly contextValue: string = 'setting'
    ) {
        super(label, collapsibleState);
        
        // For headers, apply different styling
        if (contextValue === 'settingHeader') {
            this.description = ''; // No description for headers
            this.tooltip = label;
            // Make headers stand out
            this.iconPath = undefined;
            // Style to indicate it's a header
            this.resourceUri = vscode.Uri.parse(`testzeus-hercules:${label}`);
        } else {
            this.tooltip = `${label}: ${value}`;
            this.description = value;
            this.iconPath = new vscode.ThemeIcon('gear');
        }
    }
}

/**
 * Represents an LLM config file setting in the Settings tree view
 */
export class LlmConfigFileSettingItem extends SettingItem {
    /**
     * Creates a new LlmConfigFileSettingItem instance
     * @param label The display label for the tree item
     * @param value The value of the setting
     * @param collapsibleState Whether the tree item is collapsible
     * @param settingsCommand The command to execute when the tree item is selected
     */
    constructor(
        label: string,
        value: string,
        collapsibleState: vscode.TreeItemCollapsibleState,
        settingsCommand: vscode.Command
    ) {
        super(label, value, collapsibleState, settingsCommand, 'llmConfigFileSetting');
        this.iconPath = new vscode.ThemeIcon('file-binary');
        this.description = value + (value ? '' : ' (click to select)');
    }
} 