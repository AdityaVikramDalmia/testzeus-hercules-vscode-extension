/**
 * Commands for managing execution environments
 */

import * as vscode from 'vscode';
import { EnvironmentManager, ExecutionEnvironmentType } from '../utils/environmentManager';
import { DockerManager } from '../utils/dockerManager';

/**
 * Configure the execution environment
 */
export async function configureEnvironment(): Promise<void> {
    try {
        // Get environment manager
        const environmentManager = EnvironmentManager.getInstance();
        const options = environmentManager.getEnvironmentOptions();
        
        // Show quick pick for environment type
        const envType = await vscode.window.showQuickPick(
            [
                { 
                    label: 'Local Python', 
                    description: 'Run Hercules using local Python installation',
                    detail: 'Uses your system Python installation directly',
                    value: ExecutionEnvironmentType.LOCAL 
                },
                { 
                    label: 'Docker', 
                    description: 'Run Hercules in a Docker container',
                    detail: 'No Python dependencies required, uses isolated container',
                    value: ExecutionEnvironmentType.DOCKER 
                },
                { 
                    label: 'Python Virtual Environment', 
                    description: 'Run Hercules in a dedicated virtual environment',
                    detail: 'Creates an isolated Python environment for Hercules',
                    value: ExecutionEnvironmentType.PYTHON_VENV 
                }
            ],
            {
                placeHolder: 'Select Execution Environment',
                title: 'Hercules Execution Environment'
            }
        );
        
        if (!envType) {
            return; // User cancelled
        }
        
        // Update environment type
        const updatedOptions = { ...options, environmentType: envType.value };
        
        // Show additional configuration options based on type
        if (envType.value === ExecutionEnvironmentType.DOCKER) {
            // Configure Docker options
            await configureDockerOptions(updatedOptions);
        } else if (envType.value === ExecutionEnvironmentType.PYTHON_VENV) {
            // Configure virtual environment options
            await configureVirtualEnvOptions(updatedOptions);
        } else {
            // Just save local options
            environmentManager.updateEnvironmentOptions(updatedOptions);
            vscode.window.showInformationMessage(`Environment set to: ${envType.label}`);
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Error configuring environment: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Configure Docker options
 * @param options The current environment options
 */
async function configureDockerOptions(options: any): Promise<void> {
    try {
        // Get Docker manager
        const dockerManager = DockerManager.getInstance();
        
        // Check Docker availability
        if (!(await dockerManager.isDockerAvailable())) {
            const installDocker = await vscode.window.showWarningMessage(
                'Docker is not available. Please install Docker to use this feature.',
                'Open Docker Installation Guide',
                'OK'
            );
            
            if (installDocker === 'Open Docker Installation Guide') {
                vscode.env.openExternal(vscode.Uri.parse('https://www.docker.com/get-started'));
            }
            
            return;
        }
        
        // Ask for Docker image
        const dockerImage = await vscode.window.showInputBox({
            prompt: 'Enter Docker image for Hercules',
            placeHolder: 'testzeus/hercules:latest',
            value: options.dockerImage || 'testzeus/hercules:latest'
        });
        
        if (dockerImage === undefined) {
            return; // User cancelled
        }
        
        // Update environment options
        const environmentManager = EnvironmentManager.getInstance();
        environmentManager.updateEnvironmentOptions({
            ...options,
            dockerImage
        });
        
        // Ask if we should pull the image
        const pullImage = await vscode.window.showInformationMessage(
            `Environment set to Docker using image: ${dockerImage}. Pull the image now?`,
            'Yes',
            'No'
        );
        
        if (pullImage === 'Yes') {
            try {
                await dockerManager.pullImage(dockerImage);
                vscode.window.showInformationMessage(`Docker image ${dockerImage} pulled successfully.`);
            } catch (error) {
                vscode.window.showErrorMessage(`Error pulling Docker image: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Error configuring Docker: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Configure virtual environment options
 * @param options The current environment options
 */
async function configureVirtualEnvOptions(options: any): Promise<void> {
    try {
        // Get environment manager
        const environmentManager = EnvironmentManager.getInstance();
        
        // Check Python availability
        if (!(await environmentManager.isPythonAvailable())) {
            const installPython = await vscode.window.showWarningMessage(
                'Python is not available. Please install Python to use this feature.',
                'Open Python Installation Guide',
                'OK'
            );
            
            if (installPython === 'Open Python Installation Guide') {
                vscode.env.openExternal(vscode.Uri.parse('https://www.python.org/downloads/'));
            }
            
            return;
        }
        
        // Ask for virtual environment path
        const virtualEnvPath = await vscode.window.showInputBox({
            prompt: 'Enter virtual environment path (leave empty for default)',
            placeHolder: 'Path to virtual environment',
            value: options.virtualEnvPath || ''
        });
        
        if (virtualEnvPath === undefined) {
            return; // User cancelled
        }
        
        // Update environment options
        environmentManager.updateEnvironmentOptions({
            ...options,
            useVirtualEnv: true,
            virtualEnvPath: virtualEnvPath || undefined
        });
        
        // Create the virtual environment and install Hercules
        const setupEnv = await vscode.window.showInformationMessage(
            'Environment set to Virtual Environment. Set up the environment now?',
            'Yes',
            'No'
        );
        
        if (setupEnv === 'Yes') {
            try {
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'Setting up virtual environment',
                    cancellable: false
                }, async (progress) => {
                    progress.report({ increment: 0, message: 'Creating environment...' });
                    await environmentManager.setupEnvironment();
                    progress.report({ increment: 100, message: 'Environment setup complete' });
                });
                
                vscode.window.showInformationMessage('Virtual environment set up successfully.');
            } catch (error) {
                vscode.window.showErrorMessage(`Error setting up virtual environment: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Error configuring virtual environment: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Set the execution environment to local
 */
export async function setLocalEnvironment(): Promise<void> {
    try {
        // Get environment manager
        const environmentManager = EnvironmentManager.getInstance();
        
        // Check Python availability
        if (!(await environmentManager.isPythonAvailable())) {
            const installPython = await vscode.window.showWarningMessage(
                'Python is not available. Please install Python to use this feature.',
                'Open Python Installation Guide',
                'OK'
            );
            
            if (installPython === 'Open Python Installation Guide') {
                vscode.env.openExternal(vscode.Uri.parse('https://www.python.org/downloads/'));
            }
            
            return;
        }
        
        // Update environment options
        environmentManager.updateEnvironmentOptions({
            environmentType: ExecutionEnvironmentType.LOCAL
        });
        
        vscode.window.showInformationMessage('Environment set to: Local Python');
    } catch (error) {
        vscode.window.showErrorMessage(`Error setting local environment: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Set the execution environment to Docker
 */
export async function setDockerEnvironment(): Promise<void> {
    try {
        // Get Docker manager
        const dockerManager = DockerManager.getInstance();
        
        // Check Docker availability
        if (!(await dockerManager.isDockerAvailable())) {
            const installDocker = await vscode.window.showWarningMessage(
                'Docker is not available. Please install Docker to use this feature.',
                'Open Docker Installation Guide',
                'OK'
            );
            
            if (installDocker === 'Open Docker Installation Guide') {
                vscode.env.openExternal(vscode.Uri.parse('https://www.docker.com/get-started'));
            }
            
            return;
        }
        
        // Update environment options
        const environmentManager = EnvironmentManager.getInstance();
        environmentManager.updateEnvironmentOptions({
            environmentType: ExecutionEnvironmentType.DOCKER,
            dockerImage: 'testzeus/hercules:latest'
        });
        
        vscode.window.showInformationMessage('Environment set to: Docker');
    } catch (error) {
        vscode.window.showErrorMessage(`Error setting Docker environment: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Set the execution environment to virtual environment
 */
export async function setVirtualEnvEnvironment(): Promise<void> {
    try {
        // Get environment manager
        const environmentManager = EnvironmentManager.getInstance();
        
        // Check Python availability
        if (!(await environmentManager.isPythonAvailable())) {
            const installPython = await vscode.window.showWarningMessage(
                'Python is not available. Please install Python to use this feature.',
                'Open Python Installation Guide',
                'OK'
            );
            
            if (installPython === 'Open Python Installation Guide') {
                vscode.env.openExternal(vscode.Uri.parse('https://www.python.org/downloads/'));
            }
            
            return;
        }
        
        // Update environment options
        environmentManager.updateEnvironmentOptions({
            environmentType: ExecutionEnvironmentType.PYTHON_VENV,
            useVirtualEnv: true
        });
        
        // Ask to set up the environment
        const setupEnv = await vscode.window.showInformationMessage(
            'Environment set to: Python Virtual Environment. Set up the environment now?',
            'Yes',
            'No'
        );
        
        if (setupEnv === 'Yes') {
            try {
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'Setting up virtual environment',
                    cancellable: false
                }, async (progress) => {
                    progress.report({ increment: 0, message: 'Creating environment...' });
                    await environmentManager.setupEnvironment();
                    progress.report({ increment: 100, message: 'Environment setup complete' });
                });
                
                vscode.window.showInformationMessage('Virtual environment set up successfully.');
            } catch (error) {
                vscode.window.showErrorMessage(`Error setting up virtual environment: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Error setting virtual environment: ${error instanceof Error ? error.message : String(error)}`);
    }
} 