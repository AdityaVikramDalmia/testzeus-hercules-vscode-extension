/**
 * Command handlers for script-related commands
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { GherkinScript } from '../models/GherkinScript';
import { LiveViewProvider } from '../providers/LiveViewProvider';
import { LiveLogsProvider } from '../providers/LiveLogsProvider';
import { ExecutionResultsProvider } from '../providers/ExecutionResultsProvider';
import { ensureHerculesDirectory, getWorkspaceRoot } from '../utils/filesystem';
import { runGherkinScript as executeGherkinScript } from '../services/scriptRunner';
import { ResourceManager } from '../utils/resourceManager';

/**
 * Creates a new Gherkin script from a template
 */
export async function createGherkinScriptFromTemplate(): Promise<void> {
    const workspaceRoot = getWorkspaceRoot();
    
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace folder is open. Please open a workspace folder first.');
        return;
    }
    
    // Create and use our standard directory structure
    const herculesDir = ensureHerculesDirectory(workspaceRoot);
    if (!herculesDir) {
        vscode.window.showErrorMessage('Failed to create Hercules directory structure');
        return;
    }
    
    // Get available templates
    let templateFiles: string[] = [];
    try {
        const resourceManager = ResourceManager.getInstance();
        templateFiles = resourceManager.getAvailableTemplates()
            .filter(file => file.endsWith('.feature'));
    } catch (error) {
        // If ResourceManager is not initialized, use a default template
        templateFiles = ['sample.feature'];
    }
    
    // Allow the user to select a template
    const selectedTemplate = await vscode.window.showQuickPick(
        templateFiles,
        {
            placeHolder: 'Select a template for your Gherkin script',
            title: 'Gherkin Script Template'
        }
    );
    
    if (!selectedTemplate) {
        return;
    }
    
    // Ask for a filename
    const fileName = await vscode.window.showInputBox({
        prompt: 'Enter the name of the new Gherkin script',
        placeHolder: 'example.feature'
    });
    
    if (!fileName) {
        return;
    }
    
    let filePath: string;
    
    try {
        // Try to use ResourceManager
        const resourceManager = ResourceManager.getInstance();
        filePath = resourceManager.createGherkinScriptFromTemplate(selectedTemplate, fileName);
    } catch (error) {
        // Fall back to simple file creation
        const inputDir = path.join(herculesDir, 'input');
        if (!fs.existsSync(inputDir)) {
            fs.mkdirSync(inputDir, { recursive: true });
        }
        
        filePath = path.join(inputDir, fileName.endsWith('.feature') ? fileName : `${fileName}.feature`);
        
        const defaultContent = `Feature: Sample Test\n\nScenario: Example scenario\n  Given I open a browser\n  When I navigate to "https://example.com"\n  Then I should see "Example Domain" in the page`;
        fs.writeFileSync(filePath, defaultContent);
    }
    
    // Open the new file
    const document = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(document);
}

/**
 * Runs a Gherkin script
 * @param gherkinScript The Gherkin script to run
 * @param liveViewProvider The live view provider
 * @param liveLogsProvider The live logs provider
 * @param executionResultsProvider The execution results provider
 */
export function runGherkinScript(
    gherkinScript: GherkinScript,
    liveViewProvider: LiveViewProvider,
    liveLogsProvider: LiveLogsProvider,
    executionResultsProvider: ExecutionResultsProvider
): void {
    if (gherkinScript && gherkinScript.filePath) {
        executeGherkinScript(gherkinScript.filePath, liveViewProvider, liveLogsProvider, executionResultsProvider);
    }
}

/**
 * Opens a screenshot
 * @param screenshotPath Path to the screenshot
 */
export function openScreenshot(screenshotPath: string): void {
    if (fs.existsSync(screenshotPath)) {
        vscode.commands.executeCommand('vscode.open', vscode.Uri.file(screenshotPath));
    } else {
        vscode.window.showErrorMessage(`Screenshot file not found: ${screenshotPath}`);
    }
}

/**
 * Opens a test report
 * @param reportPath Path to the test report
 */
export function openTestReport(reportPath: string): void {
    if (fs.existsSync(reportPath)) {
        vscode.commands.executeCommand('vscode.open', vscode.Uri.file(reportPath));
    } else {
        vscode.window.showErrorMessage(`Report file not found: ${reportPath}`);
    }
} 