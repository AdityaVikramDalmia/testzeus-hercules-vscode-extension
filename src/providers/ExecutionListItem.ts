/**
 * Execution list item model
 */

import * as vscode from 'vscode';
import { getWsLogsUrl } from '../config/environment';

/**
 * Represents an execution in the Live View & Logs tree view
 */
export class ExecutionListItem extends vscode.TreeItem {
    // Add support for buttons in the TreeItem
    buttons?: { iconPath: vscode.ThemeIcon; tooltip: string; command: string; arguments?: any[] }[];
    
    /**
     * Creates a new ExecutionListItem instance
     * @param label The display label for the tree item
     * @param description The description for this item
     * @param collapsibleState Whether the tree item is collapsible
     * @param command The command to execute when the tree item is selected
     * @param contextValue The context value for the tree item
     * @param executionId Unique execution ID
     */
    constructor(
        public readonly label: string,
        public readonly description: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public command?: vscode.Command,
        public contextValue: string = 'execution',
        public readonly executionId?: string
    ) {
        super(label, collapsibleState);
        this.tooltip = `${label}\n${description}\n\nClick to open logs in terminal using 'socat' command`;
        
        // Add button to open terminal logs if executionId is provided
        if (executionId) {
            this.buttons = [
                {
                    iconPath: new vscode.ThemeIcon('terminal'),
                    tooltip: 'Open logs in terminal',
                    command: 'testzeus-hercules.openExecutionLogs',
                    arguments: [executionId, getWsLogsUrl(executionId)]
                }
            ];
        }
    }
}
