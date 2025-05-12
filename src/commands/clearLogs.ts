import * as vscode from 'vscode';
import { LiveLogsProvider } from '../providers/LiveLogsProvider';

/**
 * Clears the logs in the LiveLogsProvider
 */
export const clearLogs = (liveLogsProvider?: LiveLogsProvider) => {
  try {
    if (!liveLogsProvider) {
      vscode.window.showErrorMessage('Live logs provider not available');
      return;
    }
    
    liveLogsProvider.clearLogs();
    vscode.window.showInformationMessage('Logs cleared successfully');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to clear logs: ${error}`);
  }
}; 