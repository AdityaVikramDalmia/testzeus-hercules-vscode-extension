/**
 * Command for improving Gherkin scripts with OpenAI
 */

import * as vscode from 'vscode';
import axios from 'axios';

// OpenAI API constants
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini'; // Using GPT-4o mini as specified

/**
 * Improves a Gherkin script using OpenAI based on metadata in the file
 * @returns Promise that resolves when the script is improved
 */
export async function improveGherkinWithCopilot(): Promise<void> {
    try {
        // Get the active text editor
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor. Please open a .feature file first.');
            return;
        }

        // Check if this is a .feature file
        const document = editor.document;
        if (!document.fileName.endsWith('.feature')) {
            vscode.window.showErrorMessage('This command only works with .feature files.');
            return;
        }

        // Get the entire text content
        const text = document.getText();
        
        // Look for metadata comments in the format: # META: Some information
        const metaComments: string[] = [];
        const lines = text.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('# META:') || trimmed.startsWith('#META:')) {
                metaComments.push(trimmed.substring(trimmed.indexOf(':') + 1).trim());
            }
        }

        // If no metadata is found, ask the user if they want to add some
        if (metaComments.length === 0) {
            const addMeta = await vscode.window.showInformationMessage(
                'No metadata found in the file. Metadata helps generate better improvements. Would you like to add metadata?',
                'Yes', 'No, continue without metadata'
            );

            if (addMeta === 'Yes') {
                const metaInfo = await vscode.window.showInputBox({
                    prompt: 'Enter metadata information (e.g., "This test verifies login functionality")',
                    placeHolder: 'Enter metadata about the test purpose or requirements'
                });

                if (metaInfo) {
                    // Add metadata to the beginning of the file
                    const metaLine = `# META: ${metaInfo}`;
                    const edit = new vscode.WorkspaceEdit();
                    edit.insert(document.uri, new vscode.Position(0, 0), metaLine + '\n');
                    await vscode.workspace.applyEdit(edit);
                    metaComments.push(metaInfo);
                } else {
                    // User cancelled metadata input
                    vscode.window.showInformationMessage('Continuing without metadata.');
                }
            }
        }

        // Show progress indicator
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Improving Gherkin script...',
            cancellable: true
        }, async (progress, token) => {
            progress.report({ message: 'Analyzing script and generating improvements...' });
            
            // Extract feature information
            let featureTitle = '';
            let scenarios: string[] = [];
            let currentScenario = '';
            let featureStarted = false;
            let inScenario = false;

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('Feature:')) {
                    featureTitle = trimmed.substring('Feature:'.length).trim();
                    featureStarted = true;
                } else if (featureStarted && (trimmed.startsWith('Scenario:') || trimmed.startsWith('Scenario Outline:'))) {
                    if (currentScenario) {
                        scenarios.push(currentScenario);
                    }
                    currentScenario = line;
                    inScenario = true;
                } else if (inScenario) {
                    currentScenario += '\n' + line;
                }
            }

            if (currentScenario) {
                scenarios.push(currentScenario);
            }

            // Get the API key from the user
            const apiKey = await getApiKey();
            if (!apiKey) {
                vscode.window.showErrorMessage('OpenAI API key is required to improve the Gherkin script.');
                return;
            }

            try {
                // Get the selection if there is one, otherwise use the entire document
                const selection = editor.selection;
                let textToImprove = '';
                let selectedRange: vscode.Range | null = null;
                
                if (!selection.isEmpty) {
                    textToImprove = document.getText(selection);
                    selectedRange = selection;
                } else {
                    textToImprove = text;
                }

                // Create prompt for the API
                const prompt = createPrompt(textToImprove, metaComments);
                
                // Call the OpenAI API
                const improvedText = await callOpenAI(apiKey, prompt, token);
                
                if (token.isCancellationRequested) {
                    return;
                }
                
                if (improvedText) {
                    // Apply the improved text to the document
                    const edit = new vscode.WorkspaceEdit();
                    
                    if (selectedRange) {
                        // Replace only the selected text
                        edit.replace(document.uri, selectedRange, improvedText);
                    } else {
                        // Replace the entire document
                        const entireRange = new vscode.Range(
                            new vscode.Position(0, 0),
                            document.lineAt(document.lineCount - 1).range.end
                        );
                        edit.replace(document.uri, entireRange, improvedText);
                    }
                    
                    await vscode.workspace.applyEdit(edit);
                    vscode.window.showInformationMessage('Gherkin script improved successfully!');
                } else {
                    vscode.window.showErrorMessage('Failed to generate an improved Gherkin script.');
                }
            } catch (error) {
                if (error instanceof Error) {
                    vscode.window.showErrorMessage(`Error improving Gherkin script: ${error.message}`);
                } else {
                    vscode.window.showErrorMessage(`Error improving Gherkin script: ${String(error)}`);
                }
            }
        });
    } catch (error) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`Error improving Gherkin script: ${error.message}`);
        } else {
            vscode.window.showErrorMessage(`Error improving Gherkin script: ${String(error)}`);
        }
    }
}

/**
 * Get the OpenAI API key from configuration or by asking the user
 * @returns API key as string or undefined if cancelled
 */
async function getApiKey(): Promise<string | undefined> {
    // First try to get the API key from configuration
    const config = vscode.workspace.getConfiguration('testzeusHercules');
    let apiKey = config.get<string>('openaiApiKey');
    
    // If not found, ask the user for the API key
    if (!apiKey) {
        apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your OpenAI API key',
            placeHolder: 'sk-...',
            password: true,
            ignoreFocusOut: true,
            validateInput: (input) => {
                if (!input || !input.startsWith('sk-')) {
                    return 'Please enter a valid OpenAI API key (starts with sk-)';
                }
                return null;
            }
        });
        
        // Ask if the user wants to save the API key for future use
        if (apiKey) {
            const saveKey = await vscode.window.showInformationMessage(
                'Do you want to save the API key for future use?',
                'Yes', 'No'
            );
            
            if (saveKey === 'Yes') {
                await config.update('openaiApiKey', apiKey, vscode.ConfigurationTarget.Global);
            }
        }
    }
    
    return apiKey;
}

/**
 * Creates a prompt for the OpenAI API based on the original text and metadata
 * @param originalText The original Gherkin script text
 * @param metadata Metadata extracted from the file
 * @returns Formatted prompt for the API
 */
function createPrompt(originalText: string, metadata: string[]): string {
    let prompt = 'You are an expert QA automation engineer specializing in writing high-quality Gherkin scripts. ';
    prompt += 'Please improve the following Gherkin script to make it more comprehensive, maintainable, and aligned with best practices. ';
    
    if (metadata.length > 0) {
        prompt += '\n\nUSE THIS METADATA TO GUIDE THE IMPROVEMENTS:\n' + metadata.join('\n') + '\n\n';
    }
    
    prompt += '\nORIGINAL GHERKIN SCRIPT:\n```gherkin\n' + originalText + '\n```\n\n';
    
    prompt += 'Return ONLY the improved Gherkin script without any explanations or additional text. ';
    prompt += 'Your response should be in valid Gherkin format that can be directly used in Cucumber/Behave frameworks. ';
    prompt += 'IMPORTANT: DO NOT include ```gherkin or ``` markers in your response. ';
    prompt += 'Just return the raw Gherkin content starting with Feature: with no markdown formatting.';
    
    return prompt;
}

/**
 * Calls the OpenAI API to improve the Gherkin script
 * @param apiKey OpenAI API key
 * @param prompt Prompt for the API
 * @param token Cancellation token
 * @returns Improved Gherkin script or undefined if failed
 */
async function callOpenAI(apiKey: string, prompt: string, token: vscode.CancellationToken): Promise<string | undefined> {
    try {
        // Check if cancellation was requested
        if (token.isCancellationRequested) {
            return undefined;
        }
        
        const response = await axios.post(
            OPENAI_API_URL,
            {
                model: DEFAULT_MODEL,
                messages: [
                    { role: 'system', content: 'You are an expert QA automation engineer specializing in Gherkin scripts.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.5, // Less random, more focused on improving actual content
                max_tokens: 2000
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                timeout: 30000 // 30 seconds timeout
            }
        );
        
        // Extract the improved text from the response
        if (response.data?.choices && response.data.choices.length > 0) {
            return response.data.choices[0].message.content.trim();
        }
        
        return undefined;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            if (error.response) {
                throw new Error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
            } else if (error.request) {
                throw new Error('No response received from the API. Please check your internet connection.');
            }
        }
        throw error;
    }
}
