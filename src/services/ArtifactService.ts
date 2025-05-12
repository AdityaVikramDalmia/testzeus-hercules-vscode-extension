/**
 * Service for handling test artifacts
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Service for opening different types of artifacts
 */
export class ArtifactService {
    // Use singleton pattern for efficient caching
    private static instance: ArtifactService;
    
    // Cache for artifact metadata
    private artifactTypeCache = new Map<string, string>();
    
    private constructor() {}
    
    /**
     * Gets the singleton instance of the ArtifactService
     * @returns The ArtifactService instance
     */
    public static getInstance(): ArtifactService {
        if (!ArtifactService.instance) {
            ArtifactService.instance = new ArtifactService();
        }
        return ArtifactService.instance;
    }
    
    /**
     * Opens an artifact with the appropriate handler based on file type
     * @param artifactPath Path to the artifact
     * @param hintType Optional hint about the type of artifact
     */
    async openArtifact(artifactPath: string, hintType?: string): Promise<void> {
        if (!artifactPath) {
            vscode.window.showErrorMessage('Invalid artifact path');
            return;
        }
        
        try {
            const artifactType = hintType || await this.determineArtifactType(artifactPath);
            
            switch (artifactType) {
                case 'video':
                    await this.openVideo(artifactPath);
                    break;
                    
                case 'image':
                    await this.openImage(artifactPath);
                    break;
                    
                case 'folder':
                    await this.openFolder(artifactPath);
                    break;
                    
                case 'json':
                case 'xml':
                case 'log':
                case 'text':
                    await this.openTextFile(artifactPath);
                    break;
                    
                case 'feature':
                    await this.openFeatureFile(artifactPath);
                    break;
                    
                default:
                    // If we can't determine the type, let VS Code decide
                    await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(artifactPath));
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open artifact: ${error}`);
        }
    }
    
    /**
     * Smart detection of file type
     * @param artifactPath Path to the artifact
     * @returns The determined artifact type
     */
    private async determineArtifactType(artifactPath: string): Promise<string> {
        // Check cache first for efficiency
        if (this.artifactTypeCache.has(artifactPath)) {
            return this.artifactTypeCache.get(artifactPath)!;
        }
        
        // Determine type based on extension and stat
        try {
            const stats = await fs.promises.stat(artifactPath);
            
            if (stats.isDirectory()) {
                this.artifactTypeCache.set(artifactPath, 'folder');
                return 'folder';
            }
            
            const extension = path.extname(artifactPath).toLowerCase();
            let artifactType: string;
            
            switch (extension) {
                case '.mp4':
                case '.webm':
                case '.mov':
                    artifactType = 'video';
                    break;
                    
                case '.png':
                case '.jpg':
                case '.jpeg':
                case '.gif':
                    artifactType = 'image';
                    break;
                    
                case '.json':
                    artifactType = 'json';
                    break;
                    
                case '.xml':
                    artifactType = 'xml';
                    break;
                    
                case '.log':
                    artifactType = 'log';
                    break;
                    
                case '.feature':
                    artifactType = 'feature';
                    break;
                    
                default:
                    // Try to determine by content for text files
                    const isText = await this.isTextFile(artifactPath);
                    artifactType = isText ? 'text' : 'binary';
            }
            
            // Cache the result
            this.artifactTypeCache.set(artifactPath, artifactType);
            return artifactType;
        } catch (error) {
            console.error('Error determining artifact type:', error);
            return 'unknown';
        }
    }
    
    /**
     * Opens a video file in the default external player
     * @param videoPath Path to the video
     */
    private async openVideo(videoPath: string): Promise<void> {
        // On macOS, we can use the default player
        await vscode.env.openExternal(vscode.Uri.file(videoPath));
    }
    
    /**
     * Opens an image in VS Code's built-in image preview
     * @param imagePath Path to the image
     */
    private async openImage(imagePath: string): Promise<void> {
        // Use VS Code's built-in image preview
        const uri = vscode.Uri.file(imagePath);
        await vscode.commands.executeCommand('vscode.open', uri);
    }
    
    /**
     * Opens a folder in the file explorer
     * @param folderPath Path to the folder
     */
    private async openFolder(folderPath: string): Promise<void> {
        // Reveal folder in file explorer
        await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(folderPath));
    }
    
    /**
     * Opens a text file in the editor
     * @param filePath Path to the text file
     */
    private async openTextFile(filePath: string): Promise<void> {
        // Open text file in editor
        const document = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(document);
    }
    
    /**
     * Opens a feature file with syntax highlighting
     * @param featurePath Path to the feature file
     */
    private async openFeatureFile(featurePath: string): Promise<void> {
        // Open feature file with syntax highlighting
        const document = await vscode.workspace.openTextDocument(featurePath);
        await vscode.window.showTextDocument(document);
    }
    
    /**
     * Checks if a file is text-based
     * @param filePath Path to the file
     * @returns True if the file is text-based, false otherwise
     */
    private async isTextFile(filePath: string): Promise<boolean> {
        try {
            // Read the first 4KB of the file to determine if it's text
            const fd = await fs.promises.open(filePath, 'r');
            const buffer = Buffer.alloc(4096);
            const { bytesRead } = await fd.read(buffer, 0, 4096, 0);
            await fd.close();
            
            // Check for null bytes which typically indicate binary content
            for (let i = 0; i < bytesRead; i++) {
                if (buffer[i] === 0) {
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            console.error('Error checking if file is text:', error);
            return false;
        }
    }
}
