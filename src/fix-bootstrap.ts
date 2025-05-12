/**
 * Bootstrap file to fix TEST LIVE VIEW without modifying the corrupted extension.ts file
 * This file provides an export that can be imported in the extension.ts file
 */

import * as vscode from 'vscode';
import { TestLiveViewProvider } from './providers/TestLiveViewProvider';
import { registerTestLiveView } from './fix-executor';

/**
 * This variable is used to hold the TEST LIVE VIEW provider instance
 * It doesn't need to be used directly, but can be accessed if needed
 */
let testLiveViewProvider: TestLiveViewProvider | undefined;

/**
 * Initialize the TEST LIVE VIEW provider
 * @param context The extension context
 */
export function initializeTestLiveView(context: vscode.ExtensionContext): void {
    // Register the TEST LIVE VIEW provider
    testLiveViewProvider = registerTestLiveView(context);
    
    // Log a message to confirm initialization
    console.log('TEST LIVE VIEW provider initialized successfully');
    
    // Show a message to the user
    vscode.window.showInformationMessage('TEST LIVE VIEW initialized! Click refresh to see executions.');
}
