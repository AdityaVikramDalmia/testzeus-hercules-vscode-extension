/**
 * Docker Manager for Hercules extension
 * Handles Docker-specific operations
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'child_process';
import { promisify } from 'util';
import { ExecutionEnvironmentOptions } from './environmentManager';
import { ConfigStorage } from './configStorage';
import { PathManager } from './pathManager';

const exec = promisify(cp.exec);

/**
 * Docker Manager class
 * Manages Docker-related operations for Hercules
 */
export class DockerManager {
    private static instance: DockerManager;
    private context: vscode.ExtensionContext;

    /**
     * Creates a new DockerManager
     * @param context The extension context
     */
    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Gets the DockerManager instance
     * @param context The extension context
     * @returns The DockerManager instance
     */
    public static getInstance(context?: vscode.ExtensionContext): DockerManager {
        if (!DockerManager.instance && context) {
            DockerManager.instance = new DockerManager(context);
        } else if (!DockerManager.instance) {
            throw new Error('DockerManager not initialized. Please provide a context.');
        }
        return DockerManager.instance;
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
     * Builds a Docker run command for Hercules
     * @param command The Hercules command to run
     * @param options Environment options
     * @param env Environment variables
     * @returns The Docker run command
     */
    public buildDockerRunCommand(
        command: string, 
        options: ExecutionEnvironmentOptions,
        env: Record<string, string> = {}
    ): string {
        // Get workspace root
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            throw new Error('No workspace folder is open. Please open a workspace folder to run Docker commands.');
        }

        // Get folder paths
        const pathManager = PathManager.getInstance();
        const folders = pathManager.createHerculesFolders();

        // Build Docker run command
        let dockerCommand = 'docker run --rm -it';
        
        // Add environment variables
        for (const [key, value] of Object.entries(env)) {
            dockerCommand += ` -e ${key}="${value}"`;
        }
        
        // Add volume mounts
        if (workspaceRoot) {
            // Mount workspace root at /app/workspace
            dockerCommand += ` -v "${workspaceRoot}:/app/workspace"`;
        }
        
        // Mount specific folders if available
        if (folders.input) {
            dockerCommand += ` -v "${folders.input}:/app/input"`;
        }
        
        if (folders.output) {
            dockerCommand += ` -v "${folders.output}:/app/output"`;
        }
        
        if (folders.testData) {
            dockerCommand += ` -v "${folders.testData}:/app/test_data"`;
        }
        
        // Add Docker image
        dockerCommand += ` ${options.dockerImage || 'testzeus/hercules:latest'}`;
        
        // Add the Hercules command (convert paths to Docker paths)
        const dockerCommand2 = this.convertPathsForDocker(command);
        
        return `${dockerCommand} ${dockerCommand2}`;
    }

    /**
     * Converts local paths to Docker container paths
     * @param command The command with local paths
     * @returns The command with Docker paths
     */
    private convertPathsForDocker(command: string): string {
        // Get workspace root
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            return command;
        }
        
        // Get folder paths
        const pathManager = PathManager.getInstance();
        const folders = pathManager.createHerculesFolders();
        
        // Replace paths in command
        let dockerCommand = command;
        
        // Replace workspace paths
        dockerCommand = dockerCommand.replace(new RegExp(this.escapeRegExp(workspaceRoot), 'g'), '/app/workspace');
        
        // Replace specific folder paths
        if (folders.input) {
            dockerCommand = dockerCommand.replace(new RegExp(this.escapeRegExp(folders.input), 'g'), '/app/input');
        }
        
        if (folders.output) {
            dockerCommand = dockerCommand.replace(new RegExp(this.escapeRegExp(folders.output), 'g'), '/app/output');
        }
        
        if (folders.testData) {
            dockerCommand = dockerCommand.replace(new RegExp(this.escapeRegExp(folders.testData), 'g'), '/app/test_data');
        }
        
        return dockerCommand;
    }

    /**
     * Escapes special characters in a string for use in a regular expression
     * @param string The string to escape
     * @returns The escaped string
     */
    private escapeRegExp(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Runs Hercules in a Docker container
     * @param command The Hercules command to run
     * @param options Environment options
     * @param env Environment variables
     * @returns The terminal used to run the command
     */
    public runInDocker(
        command: string, 
        options: ExecutionEnvironmentOptions,
        env: Record<string, string> = {}
    ): vscode.Terminal {
        // Build Docker run command
        const dockerCommand = this.buildDockerRunCommand(command, options, env);
        
        // Create and configure terminal
        const terminal = vscode.window.createTerminal({
            name: 'TestZeus Hercules (Docker)'
        });
        
        // Show terminal
        terminal.show();
        
        // Run command
        terminal.sendText(dockerCommand);
        
        return terminal;
    }

    /**
     * Pulls a Docker image
     * @param image The Docker image to pull
     * @returns Promise resolving when the pull is complete
     */
    public async pullImage(image: string): Promise<void> {
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Pulling Docker image: ${image}`,
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: 'Starting download...' });
                await exec(`docker pull ${image}`);
                progress.report({ increment: 100, message: 'Download complete' });
            });
        } catch (error) {
            console.error('Error pulling Docker image:', error);
            throw new Error(`Failed to pull Docker image: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
} 