/**
 * Model for Run Config items in the tree view
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Represents a Run Configuration item in the tree view
 */
export class RunConfig extends vscode.TreeItem {
    /**
     * Creates a new RunConfig instance
     * @param label The label to display for the item
     * @param collapsibleState The collapsible state of the item
     * @param command The command to execute when the item is clicked
     * @param resourceUri The URI of the resource this item represents
     * @param isFolder Whether this item represents a folder
     * @param isCheckable Whether this item can be checked (selected)
     * @param isChecked Whether this item is currently checked (selected)
     * @param type The type of item (e.g., 'section', 'gherkin', 'testdata')
     * @param contextValue Additional context for commands
     */
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command,
        public readonly resourceUri?: vscode.Uri,
        public readonly isFolder: boolean = false,
        public readonly isCheckable: boolean = false,
        public readonly isChecked: boolean = false,
        public readonly type: 'section' | 'gherkin' | 'testdata' | 'run' | 'action' | 'cdpUrl' | 'message' = 'section',
        public readonly contextValue: string = '',
    ) {
        super(label, collapsibleState);

        // Set icon based on type
        if (type === 'section') {
            this.iconPath = new vscode.ThemeIcon('list-tree');
        } else if (type === 'gherkin') {
            this.iconPath = new vscode.ThemeIcon('file-code');
        } else if (type === 'testdata') {
            this.iconPath = new vscode.ThemeIcon('database');
        } else if (type === 'run') {
            this.iconPath = new vscode.ThemeIcon('play');
        }

        // Set context value for command enablement
        this.contextValue = contextValue || type;

        // Set description to show the checked state if checkable
        if (isCheckable) {
            this.description = isChecked ? '✓ Selected' : '';
        }

        // Set tooltip to show the full path for resource items
        if (resourceUri) {
            this.tooltip = resourceUri.fsPath;
        }
    }
}

/**
 * Test configuration item in a sequence
 */
export interface TestConfigItem {
    id: string; // Unique ID for this test config
    order: number; // Order in the sequence
    featurePath: string; // Full path to the Gherkin feature file
    featureLabel: string; // Display name of the feature file
    testDataPaths: string[]; // Array of paths to associated test data files
    testDataLabels: string[]; // Array of display names for test data files
    isComplete: boolean; // Whether this test config has all required items
    headless: boolean; // Whether to run in headless mode
    timeout: number; // Timeout in seconds
}

/**
 * Run configuration state for all tests
 */
export interface RunConfigState {
    tests: TestConfigItem[]; // Array of test configurations
    currentStage: 'feature-selection' | 'test-data-selection' | 'ready' | 'in-progress'; // Current stage of configuration
    currentTestIndex: number; // Index of the test being configured
    isComplete: boolean; // Whether the entire configuration is complete
}

/**
 * Selection model for Run Config
 */
export interface RunConfigSelection {
    gherkinScripts: Map<string, string>; // Map of label to path
    testDataFiles: Map<string, string[]>; // Map of gherkin label to test data paths
}
