/**
 * Commands for managing Gherkin scripts
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { PathManager } from '../utils/pathManager';
import { getServerMemFeaturesPath } from '../utils/serverMemPathHelper';

/**
 * Creates a new Gherkin script
 * @param parentFolder Optional parent folder to create script in
 * @returns Promise that resolves when the script is created
 */
export async function createGherkinScript(parentFolder?: any): Promise<void> {
    try {
        // Initialize the directory structure if it doesn't exist
        const pathManager = PathManager.getInstance();
        const globalStoragePath = pathManager.getGlobalStoragePath();
        
        // Use the serverMem/data/manager/lib/features path
        const serverMemFeaturesPath = getServerMemFeaturesPath(globalStoragePath);
        
        // Determine base path - use parent folder if provided, otherwise use serverMem features folder
        let basePath = serverMemFeaturesPath;
        if (parentFolder && parentFolder.resourceUri) {
            basePath = parentFolder.resourceUri.fsPath;
        }
        
        // Ask for a filename
        const fileName = await vscode.window.showInputBox({
            prompt: 'Enter the name of the new Gherkin script',
            placeHolder: 'example.feature',
            validateInput: (value) => {
                if (!value) {
                    return 'Filename is required';
                }
                if (!/^[a-zA-Z0-9_\-\.]+$/.test(value)) {
                    return 'Filename contains invalid characters';
                }
                return null;
            }
        });
        
        if (!fileName) {
            return; // User cancelled
        }
        
        // Ensure the filename has the .feature extension
        const fullFileName = fileName.endsWith('.feature') ? fileName : `${fileName}.feature`;
        const filePath = path.join(basePath, fullFileName);
        
        // Check if the file already exists
        if (fs.existsSync(filePath)) {
            const overwrite = await vscode.window.showWarningMessage(
                `A file named "${fullFileName}" already exists. Do you want to overwrite it?`,
                'Yes', 'No'
            );
            
            if (overwrite !== 'Yes') {
                return;
            }
        }
        
        // Template options
        const templateOptions = [
            { label: 'Empty Feature', description: 'Create an empty feature file' },
            { label: 'Web Test', description: 'Basic web application test template' },
            { label: 'API Test', description: 'Basic API test template' },
            { label: 'Custom', description: 'Create a custom template' }
        ];
        
        // Let the user select a template
        const templateChoice = await vscode.window.showQuickPick(templateOptions, {
            placeHolder: 'Select a template for your Gherkin script'
        });
        
        if (!templateChoice) {
            return; // User cancelled
        }
        
        let content = '';
        
        // Generate content based on template choice
        if (templateChoice.label === 'Empty Feature') {
            content = `Feature: ${path.basename(fileName, '.feature')}

Scenario: New Scenario
  Given I have a precondition
  When I perform an action
  Then I should see a result
`;
        } else if (templateChoice.label === 'Web Test') {
            content = `Feature: ${path.basename(fileName, '.feature')}

Scenario: Web Test Example
  Given I navigate to "https://example.com"
  When I click on the element with text "More information"
  Then I should see "Example Domain" in the page
`;
        } else if (templateChoice.label === 'API Test') {
            content = `Feature: ${path.basename(fileName, '.feature')}

Scenario: API Test Example
  Given I set the base URL to "https://api.example.com"
  When I send a GET request to "/users"
  Then the response status code should be 200
  And the response should contain "data"
`;
        } else if (templateChoice.label === 'Custom') {
            // Allow the user to create a custom template
            const customContent = await vscode.window.showInputBox({
                prompt: 'Enter your custom Gherkin script content',
                placeHolder: 'Feature: Custom Feature\n\nScenario: Custom Scenario\n  Given ...\n  When ...\n  Then ...'
            });
            
            if (customContent) {
                content = customContent;
            } else {
                return; // User cancelled
            }
        }
        
        // Write the content to the file
        fs.writeFileSync(filePath, content);
        
        // Open the file in the editor
        const document = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(document);
        
        vscode.window.showInformationMessage(`Created Gherkin script: ${fullFileName}`);
    } catch (error) {
        vscode.window.showErrorMessage(`Error creating Gherkin script: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Deletes a Gherkin script
 * @param gherkinScript The Gherkin script to delete
 * @returns Promise that resolves when the script is deleted
 */
export async function deleteGherkinScript(gherkinScript: any): Promise<void> {
    try {
        if (!gherkinScript || !gherkinScript.resourceUri) {
            vscode.window.showErrorMessage('No Gherkin script selected.');
            return;
        }
        
        const filePath = gherkinScript.resourceUri.fsPath;
        
        // Confirm deletion
        const confirm = await vscode.window.showWarningMessage(
            `Are you sure you want to delete "${path.basename(filePath)}"?`,
            'Yes', 'No'
        );
        
        if (confirm !== 'Yes') {
            return;
        }
        
        // Delete the file
        fs.unlinkSync(filePath);
        
        vscode.window.showInformationMessage(`Deleted Gherkin script: ${path.basename(filePath)}`);
    } catch (error) {
        vscode.window.showErrorMessage(`Error deleting Gherkin script: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Renames a Gherkin script
 * @param gherkinScript The Gherkin script to rename
 * @returns Promise that resolves when the script is renamed
 */
export async function renameGherkinScript(gherkinScript: any): Promise<void> {
    try {
        if (!gherkinScript || !gherkinScript.resourceUri) {
            vscode.window.showErrorMessage('No Gherkin script selected.');
            return;
        }
        
        const filePath = gherkinScript.resourceUri.fsPath;
        const currentName = path.basename(filePath);
        const directory = path.dirname(filePath);
        
        // Ask for a new filename
        const newName = await vscode.window.showInputBox({
            prompt: 'Enter the new name for the Gherkin script',
            value: currentName,
            validateInput: (value) => {
                if (!value) {
                    return 'Filename is required';
                }
                if (!/^[a-zA-Z0-9_\-\.]+$/.test(value)) {
                    return 'Filename contains invalid characters';
                }
                return null;
            }
        });
        
        if (!newName || newName === currentName) {
            return; // User cancelled or didn't change the name
        }
        
        // Ensure the filename has the .feature extension
        const fullNewName = newName.endsWith('.feature') ? newName : `${newName}.feature`;
        const newPath = path.join(directory, fullNewName);
        
        // Check if the file already exists
        if (fs.existsSync(newPath)) {
            const overwrite = await vscode.window.showWarningMessage(
                `A file named "${fullNewName}" already exists. Do you want to overwrite it?`,
                'Yes', 'No'
            );
            
            if (overwrite !== 'Yes') {
                return;
            }
        }
        
        // Rename the file
        fs.renameSync(filePath, newPath);
        
        // Open the renamed file
        const document = await vscode.workspace.openTextDocument(newPath);
        await vscode.window.showTextDocument(document);
        
        vscode.window.showInformationMessage(`Renamed Gherkin script from "${currentName}" to "${fullNewName}"`);
    } catch (error) {
        vscode.window.showErrorMessage(`Error renaming Gherkin script: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Duplicates a Gherkin script
 * @param gherkinScript The Gherkin script to duplicate
 * @returns Promise that resolves when the script is duplicated
 */
export async function duplicateGherkinScript(gherkinScript: any): Promise<void> {
    try {
        if (!gherkinScript || !gherkinScript.resourceUri) {
            vscode.window.showErrorMessage('No Gherkin script selected.');
            return;
        }
        
        const filePath = gherkinScript.resourceUri.fsPath;
        const currentName = path.basename(filePath);
        const directory = path.dirname(filePath);
        
        // Generate a default name for the duplicate
        const nameWithoutExt = path.basename(currentName, '.feature');
        const defaultDuplicateName = `${nameWithoutExt}_copy.feature`;
        
        // Ask for a name for the duplicate
        const duplicateName = await vscode.window.showInputBox({
            prompt: 'Enter a name for the duplicate Gherkin script',
            value: defaultDuplicateName,
            validateInput: (value) => {
                if (!value) {
                    return 'Filename is required';
                }
                if (!/^[a-zA-Z0-9_\-\.]+$/.test(value)) {
                    return 'Filename contains invalid characters';
                }
                return null;
            }
        });
        
        if (!duplicateName) {
            return; // User cancelled
        }
        
        // Ensure the filename has the .feature extension
        const fullDuplicateName = duplicateName.endsWith('.feature') ? duplicateName : `${duplicateName}.feature`;
        const duplicatePath = path.join(directory, fullDuplicateName);
        
        // Check if the file already exists
        if (fs.existsSync(duplicatePath)) {
            const overwrite = await vscode.window.showWarningMessage(
                `A file named "${fullDuplicateName}" already exists. Do you want to overwrite it?`,
                'Yes', 'No'
            );
            
            if (overwrite !== 'Yes') {
                return;
            }
        }
        
        // Read the content of the original file
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Write the content to the duplicate file
        fs.writeFileSync(duplicatePath, content);
        
        // Open the duplicate file
        const document = await vscode.workspace.openTextDocument(duplicatePath);
        await vscode.window.showTextDocument(document);
        
        vscode.window.showInformationMessage(`Created duplicate of "${currentName}" as "${fullDuplicateName}"`);
    } catch (error) {
        vscode.window.showErrorMessage(`Error duplicating Gherkin script: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Creates a new folder in the Gherkin scripts directory
 * @param parentFolder Optional parent folder to create subfolder in
 * @returns Promise that resolves when the folder is created
 */
export async function createGherkinFolder(parentFolder?: any): Promise<void> {
    try {
        // Initialize the directory structure if it doesn't exist
        const pathManager = PathManager.getInstance();
        const globalStoragePath = pathManager.getGlobalStoragePath();
        
        // Use the serverMem/data/manager/lib/features path
        const serverMemFeaturesPath = getServerMemFeaturesPath(globalStoragePath);
        
        // Determine base path - use parent folder if provided, otherwise use serverMem features folder
        let basePath = serverMemFeaturesPath;
        if (parentFolder && parentFolder.resourceUri) {
            basePath = parentFolder.resourceUri.fsPath;
        }
        
        // Ask for a folder name
        const folderName = await vscode.window.showInputBox({
            prompt: 'Enter the name of the new folder',
            placeHolder: 'my-tests',
            validateInput: (value) => {
                if (!value) {
                    return 'Folder name is required';
                }
                if (!/^[a-zA-Z0-9_\-\.]+$/.test(value)) {
                    return 'Folder name contains invalid characters';
                }
                return null;
            }
        });
        
        if (!folderName) {
            return; // User cancelled
        }
        
        const folderPath = path.join(basePath, folderName);
        
        // Check if the folder already exists
        if (fs.existsSync(folderPath)) {
            vscode.window.showWarningMessage(`A folder named "${folderName}" already exists.`);
            return;
        }
        
        // Create the folder
        fs.mkdirSync(folderPath, { recursive: true });
        
        vscode.window.showInformationMessage(`Created folder: ${folderName}`);
    } catch (error) {
        vscode.window.showErrorMessage(`Error creating folder: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Find a Gherkin script using QuickPick
 * @returns Promise that resolves when a script is selected
 */
export async function findGherkinScript(): Promise<void> {
    try {
        // Initialize the directory structure
        const pathManager = PathManager.getInstance();
        const folders = pathManager.createHerculesFolders();
        
        if (!folders || Object.keys(folders).length === 0 || !folders.input) {
            vscode.window.showErrorMessage('Failed to initialize Hercules directories. Please check the configuration.');
            return;
        }
        
        // Get all feature files recursively
        const featureFiles: { label: string; description: string; path: string }[] = [];
        
        // Function to traverse the directory recursively
        const traverseDirectory = async (dir: string, relativePath: string = '') => {
            const entries = await fs.promises.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const entryPath = path.join(dir, entry.name);
                const entryRelativePath = path.join(relativePath, entry.name);
                
                if (entry.isDirectory()) {
                    // Recursively traverse subdirectories
                    await traverseDirectory(entryPath, entryRelativePath);
                } else if (entry.isFile() && entry.name.endsWith('.feature')) {
                    // Add feature files to the list
                    featureFiles.push({
                        label: entry.name,
                        description: entryRelativePath,
                        path: entryPath
                    });
                }
            }
        };
        
        // Start traversing from the input folder
        await traverseDirectory(folders.input);
        
        if (featureFiles.length === 0) {
            vscode.window.showInformationMessage('No Gherkin scripts found. Create some scripts first.');
            return;
        }
        
        // Sort files alphabetically by path for better organization
        featureFiles.sort((a, b) => a.description.localeCompare(b.description));
        
        // Show quick pick with search support
        const selectedFile = await vscode.window.showQuickPick(featureFiles, {
            placeHolder: 'Search for a Gherkin script...',
            matchOnDescription: true,
            matchOnDetail: true
        });
        
        if (!selectedFile) {
            return; // User cancelled
        }
        
        // Open the selected file
        const document = await vscode.workspace.openTextDocument(selectedFile.path);
        await vscode.window.showTextDocument(document);
        
    } catch (error) {
        vscode.window.showErrorMessage(`Error finding Gherkin script: ${error instanceof Error ? error.message : String(error)}`);
    }
} 