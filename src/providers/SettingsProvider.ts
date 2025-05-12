/**
 * Provider for settings tree view
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { SettingItem, LlmConfigFileSettingItem } from '../models/SettingItem';
import { 
    getConfiguration, 
    getLlmModel, 
    getApiKey, 
    getLlmConfigFile, 
    getLlmConfigFileRefKey, 
    getProjectBasePath,
    getGherkinScriptsPath,
    getOutputPath,
    getTestDataPath,
    getBrowser, 
    getHeadless,
    getRecordVideo,
    getTakeScreenshots,
    getBrowserResolution,
    getRunDevice,
    getCaptureNetwork,
    getLoadExtraTools,
    getTelemetryEnabled,
    getAutoMode,
    getEnablePlaywrightTracing
} from '../utils/config';

/**
 * TreeDataProvider for the Settings view
 */
export class SettingsProvider implements vscode.TreeDataProvider<SettingItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SettingItem | undefined | null | void> = new vscode.EventEmitter<SettingItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SettingItem | undefined | null | void> = this._onDidChangeTreeData.event;

    /**
     * Refreshes the tree view
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * Gets the TreeItem for the given element
     * @param element The element to get the TreeItem for
     * @returns The TreeItem for the element
     */
    getTreeItem(element: SettingItem): vscode.TreeItem {
        return element;
    }

    /**
     * Gets the children of the given element
     * @param element The element to get the children for
     * @returns A promise that resolves to the children of the element
     */
    getChildren(element?: SettingItem): Thenable<SettingItem[]> {
        if (element) {
            return Promise.resolve([]);
        } else {
            return Promise.resolve(this.getSettingsItems());
        }
    }

    /**
     * Gets the settings items to display in the tree view
     * @returns The settings items
     */
    private getSettingsItems(): SettingItem[] {
        const items: SettingItem[] = [];
        
        // Common command to open all extension settings
        const openSettingsCommand = {
            command: 'workbench.action.openSettings',
            title: 'Open Settings',
            arguments: ['testzeus-hercules']
        };
        
        // Add category headers
        items.push(new SettingItem(
            '📊 LLM Configuration',
            '',
            vscode.TreeItemCollapsibleState.None,
            undefined,
            'settingHeader'
        ));
        
        // Add LLM settings
        items.push(new SettingItem(
            'LLM Model',
            getLlmModel(),
            vscode.TreeItemCollapsibleState.None,
            openSettingsCommand
        ));
        
        // Add API Key as a setting but mask its value for security
        const apiKey = getApiKey() || '';
        items.push(new SettingItem(
            'API Key',
            apiKey ? '********' : '(not set)',
            vscode.TreeItemCollapsibleState.None,
            openSettingsCommand
        ));
        
        // Add LLM Config File setting with special behavior
        const llmConfigFile = getLlmConfigFile() || '';
        items.push(new LlmConfigFileSettingItem(
            'LLM Config File',
            llmConfigFile ? path.basename(llmConfigFile) : '(click to select file)',
            vscode.TreeItemCollapsibleState.None,
            {
                command: 'testzeus-hercules.selectLlmConfigFile',
                title: 'Select LLM Config File',
                arguments: []
            }
        ));
        
        // Add LLM Config File Ref Key setting
        items.push(new SettingItem(
            'LLM Config File Ref Key',
            getLlmConfigFileRefKey() || '(not set)',
            vscode.TreeItemCollapsibleState.None,
            openSettingsCommand
        ));
        
        // Project settings header
        items.push(new SettingItem(
            '📁 Project Settings',
            '',
            vscode.TreeItemCollapsibleState.None,
            undefined,
            'settingHeader'
        ));
        
        // Project base path
        items.push(new SettingItem(
            'Project Base Path',
            getProjectBasePath() || '(not set)',
            vscode.TreeItemCollapsibleState.None,
            openSettingsCommand
        ));
        
        // Gherkin scripts path
        items.push(new SettingItem(
            'Gherkin Scripts Path',
            getGherkinScriptsPath(),
            vscode.TreeItemCollapsibleState.None,
            openSettingsCommand
        ));
        
        // Output path
        items.push(new SettingItem(
            'Output Path',
            getOutputPath(),
            vscode.TreeItemCollapsibleState.None,
            openSettingsCommand
        ));
        
        // Test data path
        items.push(new SettingItem(
            'Test Data Path',
            getTestDataPath(),
            vscode.TreeItemCollapsibleState.None,
            openSettingsCommand
        ));
        
        // Browser settings header
        items.push(new SettingItem(
            '🌐 Browser Settings',
            '',
            vscode.TreeItemCollapsibleState.None,
            undefined,
            'settingHeader'
        ));
        
        // Browser settings
        items.push(new SettingItem(
            'Browser',
            getBrowser(),
            vscode.TreeItemCollapsibleState.None,
            openSettingsCommand
        ));
        
        // Headless mode
        items.push(new SettingItem(
            'Headless',
            getHeadless() ? 'true' : 'false',
            vscode.TreeItemCollapsibleState.None,
            openSettingsCommand
        ));
        
        // Record video
        items.push(new SettingItem(
            'Record Video',
            getRecordVideo() ? 'true' : 'false',
            vscode.TreeItemCollapsibleState.None,
            openSettingsCommand
        ));
        
        // Take screenshots
        items.push(new SettingItem(
            'Take Screenshots',
            getTakeScreenshots() ? 'true' : 'false',
            vscode.TreeItemCollapsibleState.None,
            openSettingsCommand
        ));
        
        // Browser resolution
        items.push(new SettingItem(
            'Browser Resolution',
            getBrowserResolution() || '(default)',
            vscode.TreeItemCollapsibleState.None,
            openSettingsCommand
        ));
        
        // Run device
        items.push(new SettingItem(
            'Run Device',
            getRunDevice() || '(none)',
            vscode.TreeItemCollapsibleState.None,
            openSettingsCommand
        ));
        
        // Capture network
        items.push(new SettingItem(
            'Capture Network',
            getCaptureNetwork() ? 'true' : 'false',
            vscode.TreeItemCollapsibleState.None,
            openSettingsCommand
        ));
        
        // Advanced settings header
        items.push(new SettingItem(
            '⚙️ Advanced Settings',
            '',
            vscode.TreeItemCollapsibleState.None,
            undefined,
            'settingHeader'
        ));
        
        // Load extra tools
        items.push(new SettingItem(
            'Load Extra Tools',
            getLoadExtraTools() ? 'true' : 'false',
            vscode.TreeItemCollapsibleState.None,
            openSettingsCommand
        ));
        
        // Telemetry enabled
        items.push(new SettingItem(
            'Telemetry Enabled',
            getTelemetryEnabled() ? 'true' : 'false',
            vscode.TreeItemCollapsibleState.None,
            openSettingsCommand
        ));
        
        // Auto mode
        items.push(new SettingItem(
            'Auto Mode',
            getAutoMode() ? 'true' : 'false',
            vscode.TreeItemCollapsibleState.None,
            openSettingsCommand
        ));
        
        // Enable Playwright tracing
        items.push(new SettingItem(
            'Enable Playwright Tracing',
            getEnablePlaywrightTracing() ? 'true' : 'false',
            vscode.TreeItemCollapsibleState.None,
            openSettingsCommand
        ));
        
        return items;
    }
} 