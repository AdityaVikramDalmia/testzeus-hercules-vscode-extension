/**
 * Commands for running TestZeus Hercules
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigStorage } from '../utils/configStorage';
import { PathManager } from '../utils/pathManager';
import { EnvironmentManager, ExecutionEnvironmentType } from '../utils/environmentManager';
import { DockerManager } from '../utils/dockerManager';
import { LiveLogsProvider } from '../providers/LiveLogsProvider';
import { LiveViewProvider } from '../providers/LiveViewProvider';
import { CombinedLiveViewProvider } from '../providers/CombinedLiveViewProvider';
import { ExecutionResultsProvider } from '../providers/ExecutionResultsProvider';
import { LiveViewData } from '../types/results';
import { GherkinScript } from '../models';

/**
 * Helper function to convert potentially undefined paths to strings
 * or null values that can be safely used with LiveViewData
 */
function ensureString(value: string | undefined): string {
    return value !== undefined ? value : '';
}

/**
 * Run TestZeus Hercules with the specified Gherkin script
 * @param gherkinScript The Gherkin script to run
 * @param liveViewProvider The live view provider
 * @param liveLogsProvider The live logs provider
 * @param executionResultsProvider The execution results provider
 */
export async function runGherkinScript(
    gherkinScript: GherkinScript, 
    liveViewProvider: CombinedLiveViewProvider | LiveViewProvider, 
    liveLogsProvider: CombinedLiveViewProvider | LiveLogsProvider, 
    executionResultsProvider: ExecutionResultsProvider
): Promise<void> {
    try {
        // Verify the Gherkin script has a valid URI
        if (!gherkinScript.resourceUri) {
            throw new Error('Invalid Gherkin script: missing resource URI');
        }
        
        // Get path to the Gherkin script
        const scriptPath = gherkinScript.resourceUri.fsPath;
        
        // Add initial log
        liveLogsProvider.addLog('info', `Starting execution of ${path.basename(scriptPath)}`);
        
        // Open logs terminal first
        const logsTerminal = liveLogsProvider.getTerminal();
        logsTerminal.show();
        
        // Run script with PathManager to get proper directory paths
        await runHercules(scriptPath);
        
        // Refresh the providers
        liveViewProvider.refresh();
        liveLogsProvider.refresh();
        executionResultsProvider.refresh();
    } catch (error) {
        vscode.window.showErrorMessage(`Error running Gherkin script: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Run TestZeus Hercules with the specified Gherkin script using the combined provider
 * @param gherkinScript The Gherkin script to run
 * @param combinedProvider The combined live view provider
 */
export async function runGherkinScriptWithCombined(
    gherkinScript: GherkinScript, 
    combinedProvider: CombinedLiveViewProvider
): Promise<void> {
    try {
        // Verify the Gherkin script has a valid URI
        if (!gherkinScript.resourceUri) {
            throw new Error('Invalid Gherkin script: missing resource URI');
        }
        
        // Get path to the Gherkin script
        const scriptPath = gherkinScript.resourceUri.fsPath;
        
        // Add initial log
        combinedProvider.addLog('info', `Starting execution of ${path.basename(scriptPath)}`);
        
        // Open logs terminal first
        const logsTerminal = combinedProvider.getTerminal();
        logsTerminal.show();
        
        // Run script with PathManager to get proper directory paths
        await runHercules(scriptPath);
        
        // Refresh the provider
        combinedProvider.refresh();
    } catch (error) {
        vscode.window.showErrorMessage(`Error running Gherkin script: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Run TestZeus Hercules with the current configuration
 * @param scriptPath Optional path to a specific script to run
 */
export async function runHercules(scriptPath?: string): Promise<void> {
    try {
        // Initialize the directory structure if it doesn't exist
        const pathManager = PathManager.getInstance();
        const folders = pathManager.createHerculesFolders();
        
        if (Object.keys(folders).length === 0) {
            vscode.window.showErrorMessage('Failed to initialize Hercules directories.');
            return;
        }
        
        // Get configuration
        const configStorage = ConfigStorage.getInstance();
        const config = configStorage.getConfig();
        
        // Get environment manager
        const environmentManager = EnvironmentManager.getInstance();
        
        // Ensure environment is set up
        try {
            await environmentManager.setupEnvironment();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to set up environment: ${error instanceof Error ? error.message : String(error)}`);
            return;
        }
        
        // Get environment options
        const envOptions = environmentManager.getEnvironmentOptions();
        
        // Build the command for Hercules
        let command = 'testzeus-hercules';
        
        if (scriptPath) {
            // Use the specific script path
            command += ` --input-file "${scriptPath}"`;
        } else {
            // Use project base path from config
            command += ` --project-base="${folders.input.replace('/input', '')}"`;
        }
        
        // Add output path
        command += ` --output-path="${folders.output}"`;
        
        // Add test data path
        command += ` --test-data-path="${folders.testData}"`;
        
        // Add LLM configuration
        if (config.llm.model) {
            command += ` --llm-model="${config.llm.model}"`;
        }
        
        if (config.llm.apiKey) {
            command += ` --llm-model-api-key="${config.llm.apiKey}"`;
        }
        
        // Add config file if specified
        if (config.llm.configFile) {
            command += ` --llm-config-file="${config.llm.configFile}"`;
        }
        
        if (config.llm.configFileRefKey) {
            command += ` --llm-config-file-ref-key="${config.llm.configFileRefKey}"`;
        }
        
        // Set up browser configuration as environment variables
        const env: { [key: string]: string } = {
            BROWSER_TYPE: config.browser.type,
            HEADLESS: String(config.browser.headless),
            RECORD_VIDEO: String(config.browser.recordVideo),
            TAKE_SCREENSHOTS: String(config.browser.takeScreenshots),
            CAPTURE_NETWORK: String(config.browser.captureNetwork),
            AUTO_MODE: String(config.advanced.autoMode),
            TELEMETRY_ENABLED: String(config.advanced.telemetryEnabled),
            LOAD_EXTRA_TOOLS: String(config.advanced.loadExtraTools),
            ENABLE_PLAYWRIGHT_TRACING: String(config.advanced.enablePlaywrightTracing)
        };
        
        // Add browser resolution if specified
        if (config.browser.resolution) {
            env.BROWSER_RESOLUTION = config.browser.resolution;
        }
        
        // Add run device if specified
        if (config.browser.runDevice) {
            env.RUN_DEVICE = config.browser.runDevice;
        }
        
        // Execute command based on environment type
        if (envOptions.environmentType === ExecutionEnvironmentType.DOCKER) {
            // Run with Docker
            await runWithDocker(command, envOptions, env);
        } else if (envOptions.environmentType === ExecutionEnvironmentType.PYTHON_VENV) {
            // Run with virtual environment
            await runWithVirtualEnv(command, envOptions, env);
        } else {
            // Run locally
            await runLocally(command, env);
        }
        
        vscode.window.showInformationMessage('TestZeus Hercules is running. Check the terminal for output.');
    } catch (error) {
        vscode.window.showErrorMessage(`Error running TestZeus Hercules: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Run Hercules with Docker
 * @param command The Hercules command to run
 * @param envOptions Environment options
 * @param env Environment variables
 */
async function runWithDocker(
    command: string, 
    envOptions: any, 
    env: { [key: string]: string }
): Promise<void> {
    try {
        // Get Docker manager
        const dockerManager = DockerManager.getInstance();
        
        // Check Docker availability
        if (!(await dockerManager.isDockerAvailable())) {
            throw new Error('Docker is not available. Please install Docker to use this feature.');
        }
        
        // Run with Docker
        dockerManager.runInDocker(command, envOptions, env);
    } catch (error) {
        throw new Error(`Failed to run with Docker: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Run Hercules with a virtual environment
 * @param command The Hercules command to run
 * @param envOptions Environment options
 * @param env Environment variables
 */
async function runWithVirtualEnv(
    command: string, 
    envOptions: any, 
    env: { [key: string]: string }
): Promise<void> {
    try {
        // Get environment manager
        const environmentManager = EnvironmentManager.getInstance();
        
        // Create and configure terminal
        const terminal = environmentManager.prepareTerminal({
            name: 'TestZeus Hercules (venv)',
            env: env
        });
        
        // Show terminal
        terminal.show();
        
        // Run command after activation
        terminal.sendText(command);
    } catch (error) {
        throw new Error(`Failed to run with virtual environment: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Run Hercules locally
 * @param command The Hercules command to run
 * @param env Environment variables
 */
async function runLocally(
    command: string, 
    env: { [key: string]: string }
): Promise<void> {
    try {
        // Create and configure terminal
        const terminal = vscode.window.createTerminal({
            name: 'TestZeus Hercules',
            env: env
        });
        
        // Show the terminal
        terminal.show();
        
        // Attempt to find the active liveLogsProvider
        const extension = vscode.extensions.getExtension('testzeus-hercules');
        if (extension) {
            const extensionApi = extension.exports;
            if (extensionApi && extensionApi.liveLogsProvider) {
                // Connect terminal to logs provider
                extensionApi.liveLogsProvider.connectJobTerminal(terminal);
            }
        }
        
        // Run command
        terminal.sendText(command);
    } catch (error) {
        throw new Error(`Failed to run locally: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Stop the currently running test
 * @param liveViewProvider The live view provider
 * @param liveLogsProvider The live logs provider
 */
export function stopTest(
    liveViewProvider: CombinedLiveViewProvider | LiveViewProvider,
    liveLogsProvider: CombinedLiveViewProvider | LiveLogsProvider
): void {
    try {
        liveLogsProvider.addLog('info', 'Stopping test...');
        
        // Find and kill the running process if available
        const logsTerminal = liveLogsProvider.getTerminal();
        
        // Send interrupt signal
        logsTerminal.sendText('\u0003'); // Ctrl+C
        
        // Update live view
        liveViewProvider.refresh({
            isExecuting: false,
            stepStatus: 'failed',
            currentStep: 'Test stopped by user'
        });
        
        liveLogsProvider.addLog('info', 'Test stopped by user.');
    } catch (error) {
        vscode.window.showErrorMessage(`Error stopping test: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Stop the currently running test using the combined provider
 * @param combinedProvider The combined live view provider
 */
export function stopTestWithCombined(combinedProvider: CombinedLiveViewProvider): void {
    try {
        // Create a stop file to signal the test process to stop
        const pathManager = PathManager.getInstance();
        const folders = pathManager.createHerculesFolders();
        
        // Create or ensure the run directory exists
        const runDir = path.join(folders.output, 'run');
        if (!fs.existsSync(runDir)) {
            fs.mkdirSync(runDir, { recursive: true });
        }
        
        // Create a stop file
        const stopFilePath = path.join(runDir, 'stop');
        fs.writeFileSync(stopFilePath, 'stop', 'utf8');
        vscode.window.showInformationMessage('Signal sent to stop test execution');
        
        // Add log
        combinedProvider.addLog('info', 'Signal sent to stop test execution');
        
        // Update the live view
        combinedProvider.refresh({
            isExecuting: false
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error stopping test: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Rerun the last test
 * @param liveViewProvider The live view provider
 * @param liveLogsProvider The live logs provider
 * @param executionResultsProvider The execution results provider
 */
export async function rerunTest(
    liveViewProvider: CombinedLiveViewProvider | LiveViewProvider,
    liveLogsProvider: CombinedLiveViewProvider | LiveLogsProvider,
    executionResultsProvider: ExecutionResultsProvider
): Promise<void> {
    try {
        // Get the last executed test from execution results provider
        const lastExecutedTest = executionResultsProvider.getLastExecutedTest();
        
        if (!lastExecutedTest) {
            vscode.window.showErrorMessage('No previous test to run.');
            return;
        }
        
        // Clear any previous logs
        liveLogsProvider.addLog('info', `Rerunning test: ${path.basename(lastExecutedTest)}`);
        
        // Run the test
        await runHercules(lastExecutedTest);
        
        // Refresh providers
        liveViewProvider.refresh();
        liveLogsProvider.refresh();
        executionResultsProvider.refresh();
    } catch (error) {
        vscode.window.showErrorMessage(`Error rerunning test: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Rerun the last test using the combined provider
 * @param combinedProvider The combined live view provider
 */
export async function rerunTestWithCombined(
    combinedProvider: CombinedLiveViewProvider
): Promise<void> {
    try {
        // Get the path manager
        const pathManager = PathManager.getInstance();
        const folders = pathManager.createHerculesFolders();
        
        // Get the last run file path
        const lastRunFilePath = path.join(folders.output, 'run', 'last_run');
        
        if (fs.existsSync(lastRunFilePath)) {
            // Read the last run file to get the script path
            const scriptPath = fs.readFileSync(lastRunFilePath, 'utf8').trim();
            
            if (scriptPath && fs.existsSync(scriptPath)) {
                // Add log
                combinedProvider.addLog('info', `Rerunning test: ${path.basename(scriptPath)}`);
                
                // Open logs terminal
                const logsTerminal = combinedProvider.getTerminal();
                logsTerminal.show();
                
                // Run the script
                await runHercules(scriptPath);
                
                // Refresh the provider
                combinedProvider.refresh();
                
                vscode.window.showInformationMessage(`Rerunning test: ${path.basename(scriptPath)}`);
            } else {
                throw new Error('Last run script path is invalid or the file does not exist');
            }
        } else {
            throw new Error('No previous test run found');
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Error rerunning test: ${error instanceof Error ? error.message : String(error)}`);
    }
} 