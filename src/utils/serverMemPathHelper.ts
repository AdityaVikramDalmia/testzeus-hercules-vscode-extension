/**
 * Helper functions for serverMem paths
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Gets the path to the serverMem/data/manager/lib/features directory
 * @param globalStoragePath The global storage path
 * @returns The path to the features directory
 */
export function getServerMemFeaturesPath(globalStoragePath: string): string {
    const featuresPath = path.join(globalStoragePath, 'serverMem', 'data', 'manager', 'lib', 'features');
    
    // Create the directory if it doesn't exist
    if (!fs.existsSync(featuresPath)) {
        fs.mkdirSync(featuresPath, { recursive: true });
        console.log(`Created serverMem features directory at: ${featuresPath}`);
    }
    
    return featuresPath;
}

/**
 * Gets the path to the serverMem/data/manager/lib/test_data directory
 * @param globalStoragePath The global storage path
 * @returns The path to the test_data directory
 */
export function getServerMemTestDataPath(globalStoragePath: string): string {
    const testDataPath = path.join(globalStoragePath, 'serverMem', 'data', 'manager', 'lib', 'test_data');
    
    // Create the directory if it doesn't exist
    if (!fs.existsSync(testDataPath)) {
        fs.mkdirSync(testDataPath, { recursive: true });
        console.log(`Created serverMem test_data directory at: ${testDataPath}`);
    }
    
    return testDataPath;
}

/**
 * Gets the path to the serverMem/data/manager/perm directory
 * @param globalStoragePath The global storage path
 * @returns The path to the permanent storage directory
 */
export function getServerMemPermanentStoragePath(globalStoragePath: string): string {
    const permStoragePath = path.join(globalStoragePath, 'serverMem', 'data', 'manager', 'perm');
    
    // Create the directory if it doesn't exist
    if (!fs.existsSync(permStoragePath)) {
        fs.mkdirSync(permStoragePath, { recursive: true });
        console.log(`Created serverMem permanent storage directory at: ${permStoragePath}`);
    }
    
    return permStoragePath;
}
