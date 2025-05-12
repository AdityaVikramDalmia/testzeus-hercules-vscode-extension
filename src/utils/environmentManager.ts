/**
 * Environment Manager for Hercules extension
 * Handles Docker and Python environment configuration
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'child_process';
import { promisify } from 'util';
import { ConfigStorage } from './configStorage';

const exec = promisify(cp.exec);

/**
 * Environment type for running Hercules
 */
export enum ExecutionEnvironmentType {
    LOCAL = 'local',
    DOCKER = 'docker',
    PYTHON_VENV = 'python_venv'
}

/**
 * Interface for environment execution options
 */
export interface ExecutionEnvironmentOptions {
    environmentType: ExecutionEnvironmentType;
    dockerImage?: string;
    useVirtualEnv?: boolean;
    virtualEnvPath?: string;
    installIfMissing?: boolean;
}

/**
 * Environment Manager class
 * Manages the execution environment (Docker/local/virtual env)
 */
export class EnvironmentManager {
    private static instance: EnvironmentManager;
    private context: vscode.ExtensionContext;
    private environmentOptions: ExecutionEnvironmentOptions;

    /**
     * Creates a new EnvironmentManager
     * @param context The extension context
     */
    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        
        // Initialize with default options
        this.environmentOptions = {
            environmentType: ExecutionEnvironmentType.LOCAL,
            dockerImage: 'testzeus/hercules:latest',
            useVirtualEnv: false,
            installIfMissing: true
        };
        
        // Load from config
        this.loadOptionsFromConfig();
    }

    /**
     * Loads environment options from configuration
     */
    private loadOptionsFromConfig(): void {
        try {
            const configStorage = ConfigStorage.getInstance();
            const config = configStorage.getConfig();
            
            // Check if we have execution environment settings
            if (config.advanced && 'executionEnvironment' in config.advanced) {
                const envSettings = (config.advanced as any).executionEnvironment;
                if (envSettings) {
                    this.environmentOptions = {
                        ...this.environmentOptions,
                        ...envSettings
                    };
                }
            }
        } catch (error) {
            console.error('Error loading environment options from config:', error);
        }
    }

    /**
     * Gets the EnvironmentManager instance
     * @param context The extension context
     * @returns The EnvironmentManager instance
     */
    public static getInstance(context?: vscode.ExtensionContext): EnvironmentManager {
        if (!EnvironmentManager.instance && context) {
            EnvironmentManager.instance = new EnvironmentManager(context);
        } else if (!EnvironmentManager.instance) {
            throw new Error('EnvironmentManager not initialized. Please provide a context.');
        }
        return EnvironmentManager.instance;
    }

    /**
     * Checks if Hercules is installed in the current environment
     * @returns Promise resolving to true if Hercules is installed, false otherwise
     */
    public async isHerculesInstalled(): Promise<boolean> {
        try {
            if (this.environmentOptions.environmentType === ExecutionEnvironmentType.DOCKER) {
                // For Docker, check if the image exists
                const { stdout } = await exec(`docker image ls ${this.environmentOptions.dockerImage} --format "{{.Repository}}:{{.Tag}}"`);
                return stdout.trim() === this.environmentOptions.dockerImage;
            } else {
                // For local or virtual env, check if the package is installed
                const pipCmd = this.buildPipCommand('list');
                const { stdout } = await exec(pipCmd);
                return stdout.includes('testzeus-hercules');
            }
        } catch (error) {
            console.error('Error checking if Hercules is installed:', error);
            return false;
        }
    }

    /**
     * Checks if Docker is installed and available
     * @returns Promise resolving to true if Docker is installed, false otherwise
     */
    public async isDockerAvailable(): Promise<boolean> {
        try {
            const { stdout } = await exec('docker --version');
            return stdout.includes('Docker version');
        } catch (error) {
            console.error('Error checking if Docker is installed:', error);
            return false;
        }
    }

    /**
     * Checks if Python is installed and available
     * @returns Promise resolving to true if Python is installed, false otherwise
     */
    public async isPythonAvailable(): Promise<boolean> {
        try {
            const { stdout } = await exec('python --version || python3 --version');
            return stdout.toLowerCase().includes('python');
        } catch (error) {
            console.error('Error checking if Python is installed:', error);
            return false;
        }
    }

    /**
     * Installs Hercules if not already installed
     * @returns Promise resolving when installation is complete
     */
    public async installHercules(): Promise<void> {
        try {
            if (await this.isHerculesInstalled()) {
                console.log('Hercules is already installed');
                return;
            }

            if (this.environmentOptions.environmentType === ExecutionEnvironmentType.DOCKER) {
                // Pull Docker image
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'Pulling Hercules Docker image',
                    cancellable: false
                }, async (progress) => {
                    progress.report({ increment: 0, message: 'Starting download...' });
                    await exec(`docker pull ${this.environmentOptions.dockerImage}`);
                    progress.report({ increment: 100, message: 'Download complete' });
                });
            } else {
                // Install using pip in the appropriate environment
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'Installing Hercules',
                    cancellable: false
                }, async (progress) => {
                    progress.report({ increment: 0, message: 'Installing package...' });
                    const pipCmd = this.buildPipCommand('install testzeus-hercules');
                    await exec(pipCmd);
                    progress.report({ increment: 100, message: 'Installation complete' });
                });
            }
        } catch (error) {
            console.error('Error installing Hercules:', error);
            throw new Error(`Failed to install Hercules: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Installs Playwright dependencies
     * @returns Promise resolving when installation is complete
     */
    public async installPlaywright(): Promise<void> {
        try {
            if (this.environmentOptions.environmentType === ExecutionEnvironmentType.DOCKER) {
                // Playwright is already installed in the Docker image
                return;
            }

            // Install Playwright dependencies
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Installing Playwright dependencies',
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: 'Installing dependencies...' });
                
                if (this.environmentOptions.useVirtualEnv) {
                    // Use virtual environment if configured
                    let activateCmd = '';
                    if (process.platform === 'win32') {
                        // Windows
                        activateCmd = `${this.environmentOptions.virtualEnvPath}\\Scripts\\activate && `;
                    } else {
                        // macOS/Linux
                        activateCmd = `source ${this.environmentOptions.virtualEnvPath}/bin/activate && `;
                    }
                    
                    const terminal = vscode.window.createTerminal({
                        name: 'Playwright Setup'
                    });
                    
                    terminal.show();
                    terminal.sendText(`${activateCmd}playwright install --with-deps`);
                } else {
                    // Use global Python
                    const terminal = vscode.window.createTerminal({
                        name: 'Playwright Setup'
                    });
                    
                    terminal.show();
                    terminal.sendText('playwright install --with-deps');
                }
                
                progress.report({ increment: 100, message: 'Installation initiated in terminal' });
            });
        } catch (error) {
            console.error('Error installing Playwright:', error);
            throw new Error(`Failed to install Playwright: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Sets up the environment (Docker/virtual env/local)
     * @returns Promise resolving when setup is complete
     */
    public async setupEnvironment(): Promise<void> {
        try {
            if (this.environmentOptions.environmentType === ExecutionEnvironmentType.DOCKER) {
                // Check Docker availability
                if (!await this.isDockerAvailable()) {
                    throw new Error('Docker is not available. Please install Docker to use this feature.');
                }
                
                // Pull image if not already available
                if (!await this.isHerculesInstalled() && this.environmentOptions.installIfMissing) {
                    await this.installHercules();
                }
            } else if (this.environmentOptions.environmentType === ExecutionEnvironmentType.PYTHON_VENV) {
                // Check Python availability
                if (!await this.isPythonAvailable()) {
                    throw new Error('Python is not available. Please install Python to use this feature.');
                }
                
                // Create virtual environment if needed
                await this.setupVirtualEnv();
                
                // Install Hercules if not present and installIfMissing is true
                if (!await this.isHerculesInstalled() && this.environmentOptions.installIfMissing) {
                    await this.installHercules();
                    await this.installPlaywright();
                }
            } else {
                // LOCAL mode
                // Check Python availability
                if (!await this.isPythonAvailable()) {
                    throw new Error('Python is not available. Please install Python to use this feature.');
                }
                
                // Install Hercules if not present and installIfMissing is true
                if (!await this.isHerculesInstalled() && this.environmentOptions.installIfMissing) {
                    await this.installHercules();
                    await this.installPlaywright();
                }
            }
        } catch (error) {
            console.error('Error setting up environment:', error);
            throw new Error(`Failed to set up environment: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Creates and sets up a virtual environment
     * @returns Promise resolving when setup is complete
     */
    private async setupVirtualEnv(): Promise<void> {
        if (!this.environmentOptions.useVirtualEnv) {
            return;
        }

        try {
            // Default virtual env path if not specified
            if (!this.environmentOptions.virtualEnvPath) {
                const storageDir = this.context.globalStoragePath;
                this.environmentOptions.virtualEnvPath = path.join(storageDir, 'venv');
                
                // Save updated options
                this.saveOptionsToConfig();
            }
            
            // Check if virtual env exists
            if (!fs.existsSync(this.environmentOptions.virtualEnvPath)) {
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'Creating virtual environment',
                    cancellable: false
                }, async (progress) => {
                    progress.report({ increment: 0, message: 'Creating environment...' });
                    
                    // Create virtual environment
                    await exec(`python -m venv "${this.environmentOptions.virtualEnvPath}"`);
                    
                    progress.report({ increment: 100, message: 'Virtual environment created' });
                });
            }
        } catch (error) {
            console.error('Error setting up virtual environment:', error);
            throw new Error(`Failed to set up virtual environment: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Builds a pip command with the appropriate environment
     * @param args The pip arguments
     * @returns The complete pip command
     */
    private buildPipCommand(args: string): string {
        if (this.environmentOptions.useVirtualEnv && this.environmentOptions.virtualEnvPath) {
            // Use virtual environment pip
            if (process.platform === 'win32') {
                // Windows
                return `"${this.environmentOptions.virtualEnvPath}\\Scripts\\pip" ${args}`;
            } else {
                // macOS/Linux
                return `"${this.environmentOptions.virtualEnvPath}/bin/pip" ${args}`;
            }
        } else {
            // Use global pip
            return `pip ${args}`;
        }
    }

    /**
     * Gets the current environment options
     * @returns The current environment options
     */
    public getEnvironmentOptions(): ExecutionEnvironmentOptions {
        return { ...this.environmentOptions };
    }

    /**
     * Updates the environment options
     * @param options The new environment options
     */
    public updateEnvironmentOptions(options: Partial<ExecutionEnvironmentOptions>): void {
        this.environmentOptions = {
            ...this.environmentOptions,
            ...options
        };
        
        // Save updated options
        this.saveOptionsToConfig();
    }

    /**
     * Saves the environment options to config
     */
    private saveOptionsToConfig(): void {
        try {
            const configStorage = ConfigStorage.getInstance();
            const config = configStorage.getConfig();
            
            // Update the config with current environment options
            const updatedConfig = {
                ...config,
                advanced: {
                    ...config.advanced,
                    executionEnvironment: this.environmentOptions
                }
            };
            
            // Save the updated config
            configStorage.updateConfig(updatedConfig);
        } catch (error) {
            console.error('Error saving environment options to config:', error);
        }
    }

    /**
     * Prepares a terminal for running Hercules commands
     * @param options Terminal options
     * @returns The configured terminal
     */
    public prepareTerminal(options: vscode.TerminalOptions = {}): vscode.Terminal {
        const terminalOptions: vscode.TerminalOptions = {
            name: 'TestZeus Hercules',
            ...options
        };

        if (this.environmentOptions.useVirtualEnv && this.environmentOptions.virtualEnvPath) {
            // Set up terminal to use virtual environment
            const terminal = vscode.window.createTerminal(terminalOptions);
            
            // Activate virtual environment
            if (process.platform === 'win32') {
                // Windows
                terminal.sendText(`& "${this.environmentOptions.virtualEnvPath}\\Scripts\\activate.ps1"`);
            } else {
                // macOS/Linux
                terminal.sendText(`source "${this.environmentOptions.virtualEnvPath}/bin/activate"`);
            }
            
            return terminal;
        } else {
            // Regular terminal
            return vscode.window.createTerminal(terminalOptions);
        }
    }

    /**
     * Gets the current environment type as a string
     * @returns The current environment type as a string
     */
    public getCurrentEnvironmentType(): string {
        const options = this.getEnvironmentOptions();
        
        switch (options.environmentType) {
            case ExecutionEnvironmentType.LOCAL:
                return 'Local Python';
            case ExecutionEnvironmentType.DOCKER:
                return 'Docker';
            case ExecutionEnvironmentType.PYTHON_VENV:
                return 'Python Virtual Environment';
            default:
                return 'Unknown';
        }
    }
} 