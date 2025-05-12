/**
 * Command to open video recordings in an external application
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import { join } from 'path';

/**
 * Opens a video recording file in the system's default application
 * @param videoPath The path to the video recording file
 */
export async function openVideoRecording(videoPath: string): Promise<void> {
    try {
        // Check if the file exists
        if (!fs.existsSync(videoPath)) {
            throw new Error(`Video recording file does not exist: ${videoPath}`);
        }
        
        // Open the file with the system's default application
        vscode.env.openExternal(vscode.Uri.file(videoPath));
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to open video recording: ${error instanceof Error ? error.message : String(error)}`);
    }
} 