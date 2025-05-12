/**
 * Path Manager for Hercules extension
 * Handles all path-related operations consistently across the extension
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigStorage } from './configStorage';

/**
 * Path Manager class for consistent path handling
 */
export class PathManager {
    private static instance: PathManager;
    private context: vscode.ExtensionContext;
    
    /**
     * Creates a new PathManager
     * @param context The extension context
     */
    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }
    
    /**
     * Gets the PathManager instance
     * @param context The extension context
     * @returns The PathManager instance
     */
    public static getInstance(context?: vscode.ExtensionContext): PathManager {
        if (!PathManager.instance && context) {
            PathManager.instance = new PathManager(context);
        } else if (!PathManager.instance) {
            throw new Error('PathManager not initialized. Please provide a context.');
        }
        return PathManager.instance;
    }
    
    /**
     * Gets the extension's global storage path
     * @returns The extension's global storage path
     */
    public getGlobalStoragePath(): string {
        const globalStoragePath = this.context.globalStoragePath;
        
        // Ensure the global storage path exists
        if (!fs.existsSync(globalStoragePath)) {
            try {
                fs.mkdirSync(globalStoragePath, { recursive: true });
            } catch (error) {
                console.error('Failed to create global storage directory:', error);
                vscode.window.showErrorMessage(`Failed to create global storage directory: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        
        return globalStoragePath;
    }
    
    /**
     * Initializes server_con folder in global storage and copies content from source directory
     * @param sourceDir The source directory to copy from
     * @returns Path to the server_con folder
     */
    public initializeServerConFolder(sourceDir: string = ''): string {
        try {
            const globalStoragePath = this.getGlobalStoragePath();
            const serverConPath = path.join(globalStoragePath, 'server_con');
            
            // Create server_con directory if it doesn't exist
            if (!fs.existsSync(serverConPath)) {
                fs.mkdirSync(serverConPath, { recursive: true });
                console.log(`Created server_con directory at: ${serverConPath}`);
                
                // Copy content from source directory if provided and exists
                if (sourceDir && fs.existsSync(sourceDir)) {
                    this.copyDirectory(sourceDir, serverConPath);
                    console.log(`Copied content from ${sourceDir} to ${serverConPath}`);
                } else {
                    console.log(`Source directory not provided or doesn't exist: ${sourceDir}`);
                }
            } else {
                console.log(`server_con directory already exists at: ${serverConPath}`);
            }
            
            return serverConPath;
        } catch (error) {
            console.error('Failed to initialize server_con folder:', error);
            vscode.window.showErrorMessage(`Failed to initialize server_con folder: ${error instanceof Error ? error.message : String(error)}`);
            return '';
        }
    }
    
    /**
     * Recursively copies a directory
     * @param source Source directory
     * @param destination Destination directory
     */
    private copyDirectory(source: string, destination: string): void {
        // Create destination directory if it doesn't exist
        if (!fs.existsSync(destination)) {
            fs.mkdirSync(destination, { recursive: true });
        }
        
        // Get all files and folders in the source directory
        const entries = fs.readdirSync(source, { withFileTypes: true });
        
        // Process each entry
        for (const entry of entries) {
            const srcPath = path.join(source, entry.name);
            const destPath = path.join(destination, entry.name);
            
            if (entry.isDirectory()) {
                // Recursively copy subdirectory
                this.copyDirectory(srcPath, destPath);
            } else {
                // Copy file
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }
    
    /**
     * Gets the extension's local storage path (workspace)
     * @returns The extension's local storage path
     */
    public getLocalStoragePath(): string {
        return this.context.storageUri?.fsPath || '';
    }
    
    /**
     * Gets the config file path
     * @returns The config file path
     */
    public getConfigFilePath(): string {
        return path.join(this.getGlobalStoragePath(), 'hercules-config.json');
    }
    
    /**
     * Creates the Hercules folder structure based on configuration
     * @returns Object with paths to created folders
     */
    public createHerculesFolders(): { [key: string]: string } {
        try {
            const configStorage = ConfigStorage.getInstance();
            const config = configStorage.getConfig();
            
            // Get base path from config or use default in global storage
            let basePath = config.project.basePath;
            if (!basePath) {
                basePath = path.join(this.getGlobalStoragePath(), 'hercules-data');
            }
            
            // Ensure base directory exists
            if (!fs.existsSync(basePath)) {
                fs.mkdirSync(basePath, { recursive: true });
            }
            
            // Create required folders based on config
            const folders = {
                input: path.join(basePath, config.project.gherkinScriptsPath || 'input'),
                output: path.join(basePath, config.project.outputPath || 'output'),
                testData: path.join(basePath, config.project.testDataPath || 'test_data'),
                logFiles: path.join(basePath, 'log_files'),
                proofs: path.join(basePath, 'proofs')
            };
            
            // Create each folder if it doesn't exist
            Object.values(folders).forEach(folderPath => {
                if (!fs.existsSync(folderPath)) {
                    fs.mkdirSync(folderPath, { recursive: true });
                }
            });
            
            return folders;
        } catch (error) {
            console.error('Error creating Hercules folders:', error);
            vscode.window.showErrorMessage(`Error creating Hercules folders: ${error instanceof Error ? error.message : String(error)}`);
            return {};
        }
    }
    
    /**
     * Resolves a path based on the project configuration
     * Handles relative and absolute paths appropriately
     * @param pathToResolve The path to resolve
     * @param basePathType The base path type to use (project, input, output, etc.)
     * @returns The resolved path
     */
    /**
     * Gets the path to the serverMem/data/manager/lib/features directory
     * @returns The path to the features directory
     */
    public getServerMemFeaturesPath(): string {
        const globalStoragePath = this.getGlobalStoragePath();
        const featuresPath = path.join(globalStoragePath, 'serverMem', 'data', 'manager', 'lib', 'features');
        
        // Create the directory if it doesn't exist
        if (!fs.existsSync(featuresPath)) {
            fs.mkdirSync(featuresPath, { recursive: true });
            console.log(`Created serverMem features directory at: ${featuresPath}`);
        }
        
        return featuresPath;
    }
    
    /**
     * Gets the path to the serverMem directory
     * @returns The path to the serverMem directory
     */
    public getServerMemPath(): string {
        const globalStoragePath = this.getGlobalStoragePath();
        const serverMemPath = path.join(globalStoragePath, 'serverMem');
        
        // Create the directory if it doesn't exist
        if (!fs.existsSync(serverMemPath)) {
            fs.mkdirSync(serverMemPath, { recursive: true });
            console.log(`Created serverMem directory at: ${serverMemPath}`);
        }
        
        return serverMemPath;
    }
    
    /**
     * Gets the path to the serverMem/.env file
     * @returns The path to the environment file
     */
    public getEnvFilePath(): string {
        return path.join(this.getServerMemPath(), '.env');
    }
    
    /**
     * Resolves a path based on the project configuration
     * Handles relative and absolute paths appropriately
     * @param pathToResolve The path to resolve
     * @param basePathType The base path type to use (project, input, output, etc.)
     * @returns The resolved path
     */
    public resolvePath(pathToResolve: string, basePathType: 'project' | 'input' | 'output' | 'testData' | 'logFiles' | 'proofs'): string {
        try {
            const configStorage = ConfigStorage.getInstance();
            const config = configStorage.getConfig();
            
            // Get base path from config or use default in global storage
            let basePath = config.project.basePath;
            if (!basePath) {
                basePath = path.join(this.getGlobalStoragePath(), 'hercules-data');
            }
            
            // If the path is absolute, return it as is
            if (path.isAbsolute(pathToResolve)) {
                return pathToResolve;
            }
            
            // Create a mapping of base path types to actual paths
            const basePathMap: { [key: string]: string } = {
                project: basePath,
                input: path.join(basePath, config.project.gherkinScriptsPath || 'input'),
                output: path.join(basePath, config.project.outputPath || 'output'),
                testData: path.join(basePath, config.project.testDataPath || 'test_data'),
                logFiles: path.join(basePath, 'log_files'),
                proofs: path.join(basePath, 'proofs')
            };
            
            // Resolve the path based on the base path type
            const resolvedPath = path.join(basePathMap[basePathType], pathToResolve);
            
            return resolvedPath;
        } catch (error) {
            console.error('Error resolving path:', error);
            vscode.window.showErrorMessage(`Error resolving path: ${error instanceof Error ? error.message : String(error)}`);
            return pathToResolve;
        }
    }
} 