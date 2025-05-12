/**
 * Gherkin script runner service
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { LiveViewProvider } from '../providers/LiveViewProvider';
import { LiveLogsProvider } from '../providers/LiveLogsProvider';
import { ExecutionResultsProvider } from '../providers/ExecutionResultsProvider';
import { ensureHerculesDirectory, getStandardPaths } from '../utils/filesystem';
import { getLlmModel, getApiKey, getLlmConfigFile, getLlmConfigFileRefKey, getBrowser, getHeadless } from '../utils/config';
import { DEFAULT_CALLBACK_URL } from '../constants/config';

/**
 * Runs a Gherkin script with Hercules
 * @param scriptPath Path to the Gherkin script
 * @param liveViewProvider Live view provider
 * @param liveLogsProvider Live logs provider
 * @param executionResultsProvider Execution results provider
 */
export async function runGherkinScript(
    scriptPath: string, 
    liveViewProvider: LiveViewProvider, 
    liveLogsProvider: LiveLogsProvider,
    executionResultsProvider: ExecutionResultsProvider
): Promise<void> {
    // Get workspace root
    const workspaceRoot = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
        ? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;
    
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace folder is open. Please open a workspace folder to run scripts.');
        return;
    }
    
    // Ensure we have our directory structure
    const herculesDir = ensureHerculesDirectory(workspaceRoot);
    if (!herculesDir) {
        vscode.window.showErrorMessage('Failed to create directory structure for TestZeus Hercules.');
        return;
    }
    
    // Get standard paths
    const paths = getStandardPaths(workspaceRoot);
    
    // Get configuration values
    const llmModel = getLlmModel();
    const apiKey = getApiKey();
    const llmConfigFile = getLlmConfigFile();
    const llmConfigFileRefKey = getLlmConfigFileRefKey();
    const browser = getBrowser();
    const headless = getHeadless();
    
    // Check if direct API key is provided or if using config file
    if (!apiKey && !llmConfigFile) {
        vscode.window.showErrorMessage('Either API key or LLM Config File must be configured. Please update the extension settings.');
        return;
    }
    
    // Update the LiveView to show execution is starting
    liveViewProvider.refresh({
        isExecuting: true,
        currentStep: 'Initializing test...',
        stepStatus: 'running'
    });
    
    // Add log entry
    liveLogsProvider.addLog('info', `Starting execution of ${path.basename(scriptPath)}`);
    
    // First ensure the logs terminal is created and shown
    const logsTerminal = liveLogsProvider.getTerminal();
    logsTerminal.show();
    
    // Write header to logs terminal
    liveLogsProvider.writeToTerminal('\r\n\x1b[1;35m===== TestZeus Hercules Job Starting =====\x1b[0m\r\n\r\n');
    
    // Create a separate job terminal
    const terminal = vscode.window.createTerminal('TestZeus Hercules');
    
    // Connect the terminal to LiveLogsProvider for log streaming
    liveLogsProvider.connectJobTerminal(terminal);
    
    // Show the job terminal after a short delay to allow logs terminal to be visible first
    setTimeout(() => {
        terminal.show();
    }, 500);
    
    // Build command
    let command = `cd "${workspaceRoot}" && testzeus-hercules`;
    
    // Add paths
    command += ` --input-file="${scriptPath}"`;
    command += ` --output-path="${paths.outputDir}"`;
    command += ` --test-data-path="${paths.testDataDir}"`;
    command += ` --screenshots-dir="${paths.screenshotsDir}"`;
    
    // Add either direct LLM model and API key OR config file reference
    if (llmConfigFile) {
        command += ` --agents-llm-config-file="${llmConfigFile}"`;
        
        if (llmConfigFileRefKey) {
            command += ` --agents-llm-config-file-ref-key="${llmConfigFileRefKey}"`;
        }
    } else {
        // Use direct model and API key if config file not specified
        command += ` --llm-model="${llmModel}" --llm-model-api-key="${apiKey}"`;
    }
    
    // Add callback endpoint for real-time updates
    command += ` --callback-url="${DEFAULT_CALLBACK_URL}"`;
    
    // Add environment variables for browser type and headless mode
    command = `BROWSER_TYPE=${browser} HEADLESS=${headless ? 'true' : 'false'} ${command}`;
    
    // Add log entry and also write it to the logs terminal
    liveLogsProvider.addLog('debug', `Executing command: ${command}`);
    
    // Simulate test execution with updates (in a real implementation, you'd process actual test output)
    simulateTestExecution(liveViewProvider, liveLogsProvider, executionResultsProvider, scriptPath, paths.herculesDir);
    
    // Send the command to the terminal
    terminal.sendText(command);
}

/**
 * Simulates test execution (this would be replaced by actual test execution in a real implementation)
 * @param liveViewProvider Live view provider
 * @param liveLogsProvider Live logs provider
 * @param executionResultsProvider Execution results provider
 * @param scriptPath Path to the script being executed
 * @param herculesDir Path to the Hercules directory
 */
function simulateTestExecution(
    liveViewProvider: LiveViewProvider,
    liveLogsProvider: LiveLogsProvider,
    executionResultsProvider: ExecutionResultsProvider,
    scriptPath: string,
    herculesDir: string
): void {
    const testStart = Date.now();
    
    // Start a timer to simulate test progress
    const simulateTestProgress = () => {
        setTimeout(() => {
            if (!liveViewProvider) { return; }
            
            // Generate a fake step message
            const steps = [
                'Opening browser',
                'Navigating to example.com',
                'Checking for example text',
                'Clicking on a button',
                'Validating results'
            ];
            
            const randomStep = steps[Math.floor(Math.random() * steps.length)];
            const randomStatus = Math.random() > 0.2 ? 'running' : 'passed';
            
            // Update the live view
            liveViewProvider.refresh({
                currentStep: randomStep,
                stepStatus: randomStatus
            });
            
            // Add a log entry
            liveLogsProvider.addLog('test', `Executing step: ${randomStep}`);
            
            // Randomly add a screenshot
            if (Math.random() > 0.7 && herculesDir) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const screenshotFile = path.join(herculesDir, 'screenshots', `screenshot-${timestamp}.png`);
                
                // In a real implementation, we would get actual screenshots from the test
                // Here we just simulate it by logging
                liveLogsProvider.addLog('info', `Screenshot captured: ${screenshotFile}`);
                liveViewProvider.refresh({
                    browserScreenshot: screenshotFile
                });
            }
            
            // Continue simulation if test is still "running"
            const elapsedSeconds = (Date.now() - testStart) / 1000;
            if (elapsedSeconds < 15) {
                simulateTestProgress();
            } else {
                // Test complete
                const passed = Math.random() > 0.3; // 70% chance of passing
                const duration = elapsedSeconds;
                const summary = passed ? 
                    'All test steps completed successfully' : 
                    'Test failed at step: ' + randomStep;
                
                // Update live view
                liveViewProvider.refresh({
                    isExecuting: false,
                    currentStep: 'Test completed',
                    stepStatus: passed ? 'passed' : 'failed'
                });
                
                // Add log
                liveLogsProvider.addLog(
                    passed ? 'info' : 'error', 
                    `Test ${passed ? 'passed' : 'failed'} in ${duration.toFixed(2)} seconds`
                );
                
                // Add a completion message to the logs terminal
                liveLogsProvider.writeToTerminal('\r\n\x1b[1;' + (passed ? '32' : '31') + 'm===== Test ' +
                    (passed ? 'Completed Successfully' : 'Failed') + ' =====\x1b[0m\r\n\r\n');
                
                // Add test result
                const reportFile = path.join(herculesDir, 'results', `report-${path.basename(scriptPath, '.feature')}.html`);
                
                executionResultsProvider.addResult({
                    scriptPath,
                    scriptName: path.basename(scriptPath),
                    passed,
                    duration,
                    timestamp: new Date(),
                    summary,
                    report: reportFile
                });
            }
        }, 1000);
    };
    
    // Start the test simulation
    simulateTestProgress();
} 