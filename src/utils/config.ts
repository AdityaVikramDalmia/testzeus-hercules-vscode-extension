/**
 * Configuration utilities for the Hercules extension
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import { CONFIG_NAMESPACE, DEFAULT_LLM_MODEL, DEFAULT_BROWSER, DEFAULT_HEADLESS, REQUIRED_LLM_AGENTS, REQUIRED_LLM_AGENT_FIELDS } from '../constants/config';

/**
 * Gets the extension configuration
 * @returns The extension configuration
 */
export function getConfiguration(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
}

/**
 * Gets the LLM model from configuration
 * @returns The configured LLM model
 */
export function getLlmModel(): string {
    return getConfiguration().get<string>('llmModel') || DEFAULT_LLM_MODEL;
}

/**
 * Gets the API key from configuration
 * @returns The configured API key or undefined
 */
export function getApiKey(): string | undefined {
    return getConfiguration().get<string>('apiKey');
}

/**
 * Gets the LLM config file path from configuration
 * @returns The configured LLM config file path or undefined
 */
export function getLlmConfigFile(): string | undefined {
    return getConfiguration().get<string>('llmConfigFile');
}

/**
 * Gets the LLM config file reference key from configuration
 * @returns The configured LLM config file reference key or undefined
 */
export function getLlmConfigFileRefKey(): string | undefined {
    return getConfiguration().get<string>('llmConfigFileRefKey');
}

/**
 * Gets the project base path from configuration
 * @returns The configured project base path or undefined
 */
export function getProjectBasePath(): string | undefined {
    return getConfiguration().get<string>('projectBasePath');
}

/**
 * Gets the Gherkin scripts path from configuration
 * @returns The configured Gherkin scripts path
 */
export function getGherkinScriptsPath(): string {
    return getConfiguration().get<string>('gherkinScriptsPath') || 'input';
}

/**
 * Gets the output path from configuration
 * @returns The configured output path
 */
export function getOutputPath(): string {
    return getConfiguration().get<string>('outputPath') || 'output';
}

/**
 * Gets the test data path from configuration
 * @returns The configured test data path
 */
export function getTestDataPath(): string {
    return getConfiguration().get<string>('testDataPath') || 'test_data';
}

/**
 * Gets the browser type from configuration
 * @returns The configured browser type
 */
export function getBrowser(): string {
    return getConfiguration().get<string>('browser') || DEFAULT_BROWSER;
}

/**
 * Gets the headless mode from configuration
 * @returns The configured headless mode
 */
export function getHeadless(): boolean {
    return getConfiguration().get<boolean>('headless') ?? DEFAULT_HEADLESS;
}

/**
 * Gets the record video setting from configuration
 * @returns The configured record video setting
 */
export function getRecordVideo(): boolean {
    return getConfiguration().get<boolean>('recordVideo') ?? true;
}

/**
 * Gets the take screenshots setting from configuration
 * @returns The configured take screenshots setting
 */
export function getTakeScreenshots(): boolean {
    return getConfiguration().get<boolean>('takeScreenshots') ?? true;
}

/**
 * Gets the browser resolution from configuration
 * @returns The configured browser resolution or undefined
 */
export function getBrowserResolution(): string | undefined {
    return getConfiguration().get<string>('browserResolution');
}

/**
 * Gets the run device from configuration
 * @returns The configured run device or undefined
 */
export function getRunDevice(): string | undefined {
    return getConfiguration().get<string>('runDevice');
}

/**
 * Gets the capture network setting from configuration
 * @returns The configured capture network setting
 */
export function getCaptureNetwork(): boolean {
    return getConfiguration().get<boolean>('captureNetwork') ?? false;
}

/**
 * Gets the load extra tools setting from configuration
 * @returns The configured load extra tools setting
 */
export function getLoadExtraTools(): boolean {
    return getConfiguration().get<boolean>('loadExtraTools') ?? false;
}

/**
 * Gets the telemetry enabled setting from configuration
 * @returns The configured telemetry enabled setting
 */
export function getTelemetryEnabled(): boolean {
    return getConfiguration().get<boolean>('telemetryEnabled') ?? true;
}

/**
 * Gets the auto mode setting from configuration
 * @returns The configured auto mode setting
 */
export function getAutoMode(): boolean {
    return getConfiguration().get<boolean>('autoMode') ?? false;
}

/**
 * Gets the enable Playwright tracing setting from configuration
 * @returns The configured enable Playwright tracing setting
 */
export function getEnablePlaywrightTracing(): boolean {
    return getConfiguration().get<boolean>('enablePlaywrightTracing') ?? false;
}

/**
 * Validates the JSON structure of the LLM config file
 * @param filePath Path to the LLM config file
 * @returns Object with validation result and optional error message
 */
export function validateLlmConfigFile(filePath: string): { isValid: boolean; message?: string } {
    if (!filePath) {
        return { isValid: true }; // No file selected is considered valid
    }

    try {
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return { isValid: false, message: `File does not exist: ${filePath}` };
        }

        // Check if file is JSON
        if (!filePath.toLowerCase().endsWith('.json')) {
            return { isValid: false, message: 'Selected file must be a JSON file' };
        }

        // Read and parse the file
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const config = JSON.parse(fileContent);
        
        // Check if at least one valid model provider exists
        const hasValidProvider = Object.keys(config).some(provider => {
            const providerConfig = config[provider];
            
            // Check if all required agents exist for this provider
            return REQUIRED_LLM_AGENTS.every(agent => {
                if (!providerConfig[agent]) {
                    return false;
                }
                
                // Check if all required fields exist for this agent
                return REQUIRED_LLM_AGENT_FIELDS.every(field => {
                    return providerConfig[agent][field] !== undefined;
                });
            });
        });

        if (!hasValidProvider) {
            return { 
                isValid: false, 
                message: 'Invalid LLM config file format. Must include at least one provider with planner_agent, nav_agent, mem_agent, and helper_agent configurations.' 
            };
        }

        return { isValid: true };
    } catch (error) {
        return { isValid: false, message: `Error validating config file: ${error instanceof Error ? error.message : String(error)}` };
    }
} 