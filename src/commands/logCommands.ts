/**
 * Commands for handling logs
 */

import * as vscode from 'vscode';
import { LiveLogsProvider } from '../providers/LiveLogsProvider';
import { CombinedLiveViewProvider } from '../providers/CombinedLiveViewProvider';

/**
 * Clears the logs from the log provider
 * @param provider The logs provider
 */
export function clearLogs(provider: LiveLogsProvider): void {
    try {
        provider.clearLogs();
        vscode.window.showInformationMessage('Logs cleared');
    } catch (error) {
        vscode.window.showErrorMessage(`Error clearing logs: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Opens the logs terminal
 * @param provider The logs provider
 */
export function openLogsTerminal(provider: LiveLogsProvider): void {
    try {
        const terminal = provider.getTerminal();
        terminal.show();
    } catch (error) {
        vscode.window.showErrorMessage(`Error opening logs terminal: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Clears the logs from the combined log provider
 * @param provider The combined provider
 */
export function clearLogsCombined(provider: CombinedLiveViewProvider): void {
    try {
        provider.clearLogs();
        vscode.window.showInformationMessage('Logs cleared');
    } catch (error) {
        vscode.window.showErrorMessage(`Error clearing logs: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Opens the logs terminal from the combined provider
 * @param provider The combined provider
 */
export function openLogsTerminalCombined(provider: CombinedLiveViewProvider): void {
    try {
        const terminal = provider.getTerminal();
        terminal.show();
    } catch (error) {
        vscode.window.showErrorMessage(`Error opening logs terminal: ${error instanceof Error ? error.message : String(error)}`);
    }
} 