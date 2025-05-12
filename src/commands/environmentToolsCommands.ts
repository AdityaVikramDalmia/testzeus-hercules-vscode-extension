/**
 * Commands for environment tools
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ExecutionEnvironmentType } from '../utils/environmentManager';
import { EnvironmentManager } from '../utils/environmentManager';
import { DockerManager } from '../utils/dockerManager';
import { PathManager } from '../utils/pathManager';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Step 1: Set up the project - creates serverMem directory and clones the repository
 */
export async function setupProject(): Promise<void> {
    try {
        const pathManager = PathManager.getInstance();
        const globalStoragePath = pathManager.getGlobalStoragePath();
        const serverMemPath = path.join(globalStoragePath, 'serverMem');
        
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Step 1: Setting up Hercules Project',
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: 'Creating directory...' });
            
            // Create serverMem directory if it doesn't exist
            if (!fs.existsSync(serverMemPath)) {
                fs.mkdirSync(serverMemPath, { recursive: true });
            }
            
            progress.report({ increment: 20, message: 'Cloning repository...' });
            
            // Change to serverMem directory and clone the repository
            try {
                // First navigate to the directory
                process.chdir(serverMemPath);
                
                // Check if directory is empty or not
                const files = fs.readdirSync(serverMemPath);
                if (files.length > 0) {
                    // Directory not empty, ask user if they want to remove existing content
                    const shouldContinue = await vscode.window.showWarningMessage(
                        'The serverMem directory is not empty. Do you want to remove existing content and continue?',
                        'Yes', 'No'
                    );
                    
                    if (shouldContinue === 'No') {
                        return;
                    }
                    
                    // Remove existing content
                    for (const file of files) {
                        const filePath = path.join(serverMemPath, file);
                        if (fs.lstatSync(filePath).isDirectory()) {
                            fs.rmSync(filePath, { recursive: true, force: true });
                        } else {
                            fs.unlinkSync(filePath);
                        }
                    }
                }
                
                // Clone the repository - updated URL to match the specified one
                const repoUrl = 'https://github.com/AdityaVikramDalmia/testzeus-hercules-mcp.git';
                await execAsync(`git clone ${repoUrl} .`);
                
                progress.report({ increment: 70, message: 'Setting up environment files...' });
                
                // Copy .env.example to .env
                if (fs.existsSync(path.join(serverMemPath, '.env.example'))) {
                    fs.copyFileSync(path.join(serverMemPath, '.env.example'), path.join(serverMemPath, '.env'));
                } else if (fs.existsSync(path.join(serverMemPath, 'env.example'))) {
                    fs.copyFileSync(path.join(serverMemPath, 'env.example'), path.join(serverMemPath, '.env'));
                }
                
                // Note: data_sample to data copying has been removed
                
                progress.report({ increment: 100, message: 'Project setup complete!' });
                vscode.window.showInformationMessage(`Step 1: Project setup completed successfully at: ${serverMemPath}`);
            } catch (error) {
                console.error('Error during project setup:', error);
                vscode.window.showErrorMessage(`Error during project setup: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error setting up project: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Helper function to copy a directory recursively
 */
function copyDirectory(source: string, destination: string): void {
    // Get all files and directories in the source
    const entries = fs.readdirSync(source, { withFileTypes: true });
    
    // Process each entry
    for (const entry of entries) {
        const srcPath = path.join(source, entry.name);
        const destPath = path.join(destination, entry.name);
        
        if (entry.isDirectory()) {
            // Create directory if it doesn't exist
            if (!fs.existsSync(destPath)) {
                fs.mkdirSync(destPath, { recursive: true });
            }
            
            // Recursive copy for subdirectories
            copyDirectory(srcPath, destPath);
        } else {
            // Copy file
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

/**
 * Check if Hercules is installed
 */
export async function checkHerculesInstall(): Promise<void> {
    try {
        const environmentManager = EnvironmentManager.getInstance();
        
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Checking Hercules installation',
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: 'Checking...' });
            
            const isInstalled = await environmentManager.isHerculesInstalled();
            
            progress.report({ increment: 100, message: 'Done' });
            
            if (isInstalled) {
                vscode.window.showInformationMessage('Hercules is installed in the current environment.');
            } else {
                const install = await vscode.window.showWarningMessage(
                    'Hercules is not installed in the current environment. Would you like to install it now?',
                    'Yes', 'No'
                );
                
                if (install === 'Yes') {
                    await installHercules();
                }
            }
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error checking Hercules installation: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Step 2: Create virtual environment and install requirements
 */
export async function installHercules(): Promise<void> {
    try {
        const pathManager = PathManager.getInstance();
        const globalStoragePath = pathManager.getGlobalStoragePath();
        const serverMemPath = path.join(globalStoragePath, 'serverMem');

        // Check if the serverMem directory exists, if not run setupProject first
        if (!fs.existsSync(serverMemPath)) {
            const setupFirst = await vscode.window.showWarningMessage(
                'Project needs to be set up first. Would you like to set up the project now?',
                'Yes', 'No'
            );
            
            if (setupFirst === 'Yes') {
                await setupProject();
            } else {
                return;
            }
        }
        
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Step 2: Creating Python Virtual Environment',
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: 'Creating virtual environment...' });
            
            try {
                // Change to serverMem directory
                process.chdir(serverMemPath);
                
                // Create virtual environment
                await execAsync('python -m venv venv');
                
                progress.report({ increment: 30, message: 'Installing requirements...' });
                
                // Activate virtual environment and install requirements
                const activateCmd = process.platform === 'win32' ? 
                    'venv\\Scripts\\activate' : 
                    'source venv/bin/activate';
                
                // Install requirements
                const terminal = vscode.window.createTerminal({
                    name: 'Hercules Setup',
                    cwd: serverMemPath
                });
                
                terminal.show();
                
                // Upgrade pip first
                if (process.platform === 'win32') {
                    terminal.sendText(`${activateCmd} && pip install --upgrade pip && pip install -r requirements.txt`);
                } else {
                    terminal.sendText(`${activateCmd} && pip install --upgrade pip && pip install -r requirements.txt`);
                }
                
                progress.report({ increment: 60, message: 'Installing websocat using Homebrew...' });
                
                // Check if Homebrew is installed
                try {
                    await execAsync('which brew');
                    
                    // Install websocat using Homebrew
                    terminal.sendText('brew install websocat');
                    
                    vscode.window.showInformationMessage('Installing websocat using Homebrew. This may take a moment...');
                } catch (error) {
                    // Homebrew not installed
                    vscode.window.showErrorMessage('Homebrew is not installed. Please install Homebrew first to use websocat: https://brew.sh');
                }
                
                progress.report({ increment: 100, message: 'Virtual environment setup complete!' });
                vscode.window.showInformationMessage('Python virtual environment created and requirements installed. Websocat installation initiated.');
            } catch (error) {
                console.error('Error during virtual environment setup:', error);
                vscode.window.showErrorMessage(`Error setting up virtual environment: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error installing Hercules: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Install Playwright
 */
export async function installPlaywright(): Promise<void> {
    try {
        const environmentManager = EnvironmentManager.getInstance();
        
        vscode.window.showInformationMessage('Installing Playwright dependencies. This may take a few minutes...');
        
        await environmentManager.installPlaywright();
        
        // Note: We don't show a "completed" message here because installPlaywright opens a terminal
        // and the operation finishes in the terminal, not programmatically
    } catch (error) {
        vscode.window.showErrorMessage(`Error installing Playwright: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Setup environment
 */
export async function setupEnvironment(): Promise<void> {
    try {
        const environmentManager = EnvironmentManager.getInstance();
        
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Setting up environment',
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: 'Setting up...' });
            
            await environmentManager.setupEnvironment();
            
            progress.report({ increment: 100, message: 'Done' });
            
            vscode.window.showInformationMessage('Environment has been set up successfully.');
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error setting up environment: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Step 3: Run the Hercules MCP server
 */
export async function runServer(): Promise<void> {
    try {
        const pathManager = PathManager.getInstance();
        const environmentManager = EnvironmentManager.getInstance();
        const globalStoragePath = pathManager.getGlobalStoragePath();
        const serverMemPath = path.join(globalStoragePath, 'serverMem');
        
        // Check if Hercules is installed
        const isHerculesInstalled = await environmentManager.isHerculesInstalled();
        if (!isHerculesInstalled) {
            const install = await vscode.window.showWarningMessage(
                'Hercules is not installed. Would you like to install it now?',
                'Yes', 'No'
            );
            
            if (install === 'Yes') {
                await installHercules();
            } else {
                return;
            }
        }
        
        // Check if the current environment is set
        const currentEnv = environmentManager.getCurrentEnvironmentType();
        if (!currentEnv) {
            vscode.window.showErrorMessage('No environment is set. Please set an environment first.');
            return;
        }
        
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Step 3: Running Hercules MCP Server',
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: 'Starting server...' });
            
            // Run the server based on the environment
            if (currentEnv === ExecutionEnvironmentType.LOCAL) {
                // Open a terminal and run the server in the local environment
                const terminal = vscode.window.createTerminal('Hercules MCP Server');
                terminal.sendText(`cd "${serverMemPath}" && python -m hercules_mcp.server.main`);
                terminal.show();
            } else if (currentEnv === ExecutionEnvironmentType.DOCKER) {
                // Run the server in Docker
                const dockerManager = DockerManager.getInstance();
                // Run Docker container with appropriate settings
                const terminal = vscode.window.createTerminal('Hercules MCP Server (Docker)');
                terminal.sendText(`cd "${serverMemPath}" && docker-compose up`);
                terminal.show();
            } else if (currentEnv === ExecutionEnvironmentType.PYTHON_VENV) {
                // Open a terminal and run the server in the virtual environment
                const terminal = vscode.window.createTerminal('Hercules MCP Server');
                terminal.sendText(`cd "${serverMemPath}" && ./.venv/bin/python -m hercules_mcp.server.main`);
                terminal.show();
            }
            
            progress.report({ increment: 100, message: 'Server started successfully!' });
            vscode.window.showInformationMessage(`Step 3: Hercules MCP server started successfully.`);
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error running Hercules MCP server: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Pull Docker image
 */
export async function pullDockerImage(): Promise<void> {
    try {
        const environmentManager = EnvironmentManager.getInstance();
        const dockerManager = DockerManager.getInstance();
        
        const options = environmentManager.getEnvironmentOptions();
        const dockerImage = options.dockerImage || 'testzeus/hercules:latest';
        
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Pulling Docker image: ${dockerImage}`,
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: 'Pulling...' });
            
            await dockerManager.pullImage(dockerImage);
            
            progress.report({ increment: 100, message: 'Done' });
            
            vscode.window.showInformationMessage(`Docker image ${dockerImage} has been pulled successfully.`);
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error pulling Docker image: ${error instanceof Error ? error.message : String(error)}`);
    }
} 