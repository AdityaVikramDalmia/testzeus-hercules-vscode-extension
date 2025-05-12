/**
 * Filesystem utilities for the Hercules extension
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { HERCULES_DIR, SUBDIRECTORIES, GITIGNORE_CONTENT, SAMPLE_FEATURE_CONTENT } from '../constants/paths';

/**
 * Ensures the Hercules directory structure exists
 * @param workspaceRoot The workspace root path
 * @returns The path to the Hercules directory, or undefined if it couldn't be created
 */
export function ensureHerculesDirectory(workspaceRoot: string | undefined): string | undefined {
    if (!workspaceRoot) {
        return undefined;
    }
    
    const herculesDir = path.join(workspaceRoot, HERCULES_DIR);
    if (!fs.existsSync(herculesDir)) {
        try {
            fs.mkdirSync(herculesDir, { recursive: true });
            
            // Create subdirectories for different artifacts
            for (const subdir of SUBDIRECTORIES) {
                fs.mkdirSync(path.join(herculesDir, subdir), { recursive: true });
            }
            
            // Create a .gitignore to exclude cache files if needed
            fs.writeFileSync(
                path.join(herculesDir, '.gitignore'),
                GITIGNORE_CONTENT
            );
        } catch (err) {
            console.error('Failed to create .testzeus-hercules directory:', err);
            return undefined;
        }
    }
    
    return herculesDir;
}

/**
 * Creates a sample Gherkin script if none exists
 * @param inputDir The directory to create the sample in
 */
export function createSampleGherkinScript(inputDir: string): void {
    const samplePath = path.join(inputDir, 'example.feature');
    if (!fs.existsSync(samplePath)) {
        fs.writeFileSync(samplePath, SAMPLE_FEATURE_CONTENT);
    }
}

/**
 * Checks if a path exists
 * @param p The path to check
 * @returns True if the path exists, false otherwise
 */
export function pathExists(p: string): boolean {
    try {
        fs.accessSync(p);
        return true;
    } catch (err) {
        return false;
    }
}

/**
 * Gets the workspace root path
 * @returns The workspace root path or undefined if no workspace is open
 */
export function getWorkspaceRoot(): string | undefined {
    return vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
        ? vscode.workspace.workspaceFolders[0].uri.fsPath
        : undefined;
}

/**
 * Get standard paths based on workspace root
 * @param workspaceRoot The workspace root path
 * @returns Object containing standard paths
 */
export function getStandardPaths(workspaceRoot: string): {
    herculesDir: string;
    inputDir: string;
    outputDir: string;
    logsDir: string;
    resultsDir: string;
    screenshotsDir: string;
    testDataDir: string;
    cacheDir: string;
} {
    const herculesDir = path.join(workspaceRoot, HERCULES_DIR);
    
    return {
        herculesDir,
        inputDir: path.join(herculesDir, 'input'),
        outputDir: path.join(herculesDir, 'output'),
        logsDir: path.join(herculesDir, 'logs'),
        resultsDir: path.join(herculesDir, 'results'),
        screenshotsDir: path.join(herculesDir, 'screenshots'),
        testDataDir: path.join(herculesDir, 'test_data'),
        cacheDir: path.join(herculesDir, 'cache'),
    };
} 