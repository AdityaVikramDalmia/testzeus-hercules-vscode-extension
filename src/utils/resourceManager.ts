/**
 * Resource manager for handling test templates and resources
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getWorkspaceRoot } from './filesystem';

/**
 * Resource manager class
 */
export class ResourceManager {
    private static instance: ResourceManager;
    private resourcePath: string;
    private extensionPath: string;
    
    /**
     * Creates a new ResourceManager instance
     * @param context The extension context
     */
    private constructor(context: vscode.ExtensionContext) {
        this.extensionPath = context.extensionPath;
        this.resourcePath = path.join(this.extensionPath, 'resources');
    }
    
    /**
     * Gets the ResourceManager instance
     * @param context The extension context
     * @returns The ResourceManager instance
     */
    public static getInstance(context?: vscode.ExtensionContext): ResourceManager {
        if (!ResourceManager.instance && context) {
            ResourceManager.instance = new ResourceManager(context);
        } else if (!ResourceManager.instance) {
            throw new Error('ResourceManager not initialized. Please provide a context.');
        }
        return ResourceManager.instance;
    }
    
    /**
     * Gets the path to a template file
     * @param templateName The name of the template
     * @returns The path to the template file
     */
    public getTemplatePath(templateName: string): string {
        return path.join(this.resourcePath, 'templates', templateName);
    }
    
    /**
     * Gets the content of a template file
     * @param templateName The name of the template
     * @returns The content of the template file
     */
    public getTemplateContent(templateName: string): string {
        const templatePath = this.getTemplatePath(templateName);
        if (fs.existsSync(templatePath)) {
            return fs.readFileSync(templatePath, 'utf8');
        }
        throw new Error(`Template file not found: ${templateName}`);
    }
    
    /**
     * Gets the list of available templates
     * @returns The list of available templates
     */
    public getAvailableTemplates(): string[] {
        const templatesPath = path.join(this.resourcePath, 'templates');
        if (fs.existsSync(templatesPath)) {
            return fs.readdirSync(templatesPath);
        }
        return [];
    }
    
    /**
     * Creates a new file from a template
     * @param templateName The name of the template
     * @param targetPath The path to the target file
     * @returns The path to the created file
     */
    public createFileFromTemplate(templateName: string, targetPath: string): string {
        const templateContent = this.getTemplateContent(templateName);
        const targetDir = path.dirname(targetPath);
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        
        // Write the file
        fs.writeFileSync(targetPath, templateContent);
        return targetPath;
    }
    
    /**
     * Creates a Gherkin script from a template
     * @param templateName The name of the template
     * @param scriptName The name of the script
     * @returns The path to the created script
     */
    public createGherkinScriptFromTemplate(templateName: string, scriptName: string): string {
        const workspaceRoot = getWorkspaceRoot();
        if (!workspaceRoot) {
            throw new Error('No workspace folder is open.');
        }
        
        const herculesDir = path.join(workspaceRoot, '.testzeus-hercules');
        const inputDir = path.join(herculesDir, 'input');
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(inputDir)) {
            fs.mkdirSync(inputDir, { recursive: true });
        }
        
        // Ensure script name has .feature extension
        const scriptFileName = scriptName.endsWith('.feature') ? scriptName : `${scriptName}.feature`;
        const targetPath = path.join(inputDir, scriptFileName);
        
        return this.createFileFromTemplate(templateName, targetPath);
    }
    
    /**
     * Creates a test data file from a template
     * @param targetFileName The name of the target file
     * @returns The path to the created file
     */
    public createTestDataFromTemplate(targetFileName: string): string {
        const workspaceRoot = getWorkspaceRoot();
        if (!workspaceRoot) {
            throw new Error('No workspace folder is open.');
        }
        
        const herculesDir = path.join(workspaceRoot, '.testzeus-hercules');
        const testDataDir = path.join(herculesDir, 'test_data');
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(testDataDir)) {
            fs.mkdirSync(testDataDir, { recursive: true });
        }
        
        const targetPath = path.join(testDataDir, targetFileName);
        return this.createFileFromTemplate('test_data.json', targetPath);
    }
} 