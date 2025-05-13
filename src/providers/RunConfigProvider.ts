/**
 * Provider for Run Config tree view - Implements a sequential wizard-like workflow
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';
import axios from 'axios';
import { getRunTemplateEndpoint } from '../config/environment';
import { RunConfig, RunConfigSelection, RunConfigState, TestConfigItem } from '../models/RunConfig';
import { GherkinScript } from '../models/GherkinScript';
import { TestData } from '../models/TestData';
import { PathManager } from '../utils/pathManager';
import { getServerMemFeaturesPath, getServerMemTestDataPath } from '../utils/serverMemPathHelper';

/**
 * TreeDataProvider for the Run Config view
 */
export class RunConfigProvider implements vscode.TreeDataProvider<RunConfig> {
    private _onDidChangeTreeData: vscode.EventEmitter<RunConfig | undefined | null | void> = new vscode.EventEmitter<RunConfig | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<RunConfig | undefined | null | void> = this._onDidChangeTreeData.event;
    
    // Reference to the tree view for programmatic control
    private treeView?: vscode.TreeView<RunConfig>;

    // State management for the wizard-like workflow
    private state: RunConfigState = {
        tests: [],
        currentStage: 'feature-selection',
        currentTestIndex: 0,
        isComplete: false
    };
    
    // Legacy selection tracking for backward compatibility
    private selection: RunConfigSelection = {
        gherkinScripts: new Map<string, string>(),
        testDataFiles: new Map<string, string[]>()
    };
    
    // Path caching for performance
    private featuresPath: string = '';
    private testDataPath: string = '';

    /**
     * Creates a new RunConfigProvider instance
     * @param workspaceRoot The workspace root path
     */
    constructor(private workspaceRoot: string | undefined) {
        // Initialize paths
        this.initializePaths();
    }
    
    /**
     * Initializes the paths for Gherkin scripts and Test Data
     */
    private initializePaths(): void {
        try {
            const pathManager = PathManager.getInstance();
            const globalStoragePath = pathManager.getGlobalStoragePath();
            this.featuresPath = getServerMemFeaturesPath(globalStoragePath);
            this.testDataPath = getServerMemTestDataPath(globalStoragePath);
        } catch (error) {
            console.error('Error initializing paths:', error);
        }
    }

    /**
     * Sets the tree view reference for programmatic control
     * @param treeView The tree view reference
     */
    setTreeView(treeView: vscode.TreeView<RunConfig>): void {
        this.treeView = treeView;
    }
    
    /**
     * Refreshes the tree view
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * Gets the TreeItem for the given element
     * @param element The element to get the TreeItem for
     * @returns The TreeItem for the element
     */
    getTreeItem(element: RunConfig): vscode.TreeItem {
        return element;
    }

    /**
     * Gets the children of the given element
     * @param element The element to get the children for
     * @returns A promise that resolves to the children of the element
     */
    getChildren(element?: RunConfig): Thenable<RunConfig[]> {
        // Handle other tree nodes (e.g., nested Gherkin directories)
        if (element) {
            if (element.contextValue === 'feature-folder') {
                return this.getNestedGherkinScripts(element.resourceUri?.fsPath || '');
            }
            
            if (element.contextValue === 'testdata-folder') {
                return this.getNestedTestData(element.resourceUri?.fsPath || '');
            }
            
            return Promise.resolve([]);
        }
        
        // Handle feature selection state directly when we're in that state
        if (this.state.currentStage === 'feature-selection') {
            // When in feature selection mode, show the feature browser directly
            return this.getGherkinRoot();
        }
        
        // Handle test data selection state directly when we're in that state
        if (this.state.currentStage === 'test-data-selection') {
            // When in test data selection mode, show the test data browser directly
            return this.getTestDataRoot();
        }
        
        // Root level: show wizard workflow UI based on current state
        // Show test sequence summary and action items
        const items: RunConfig[] = [];
        
        // 1. Add status and instruction header
        let headerText = 'Create Test Run';
        if (this.state.tests.length > 0) {
            headerText = `Test Run (${this.state.tests.length} test${this.state.tests.length !== 1 ? 's' : ''})`;
        }
        
        const headerItem = new RunConfig(
            headerText,
            vscode.TreeItemCollapsibleState.None,
            undefined,
            undefined,
            false,
            false,
            false,
            'section',
            'header'
        );
        headerItem.iconPath = new vscode.ThemeIcon('list-tree');
        items.push(headerItem);
        
        // CDP Browser section has been moved to its own dedicated view
        
        // Add New Test button at the top level for easy access
        const addTestButton = new RunConfig(
            '+ Add New Test',
            vscode.TreeItemCollapsibleState.None,
            {
                command: 'testzeus-hercules.startNewTest',
                title: 'Start New Test',
                arguments: []
            },
            undefined,
            false,
            false,
            false,
            'action',
            'add-test'
        );
        addTestButton.iconPath = new vscode.ThemeIcon('add');
        items.push(addTestButton);
        
        // 2. Add configured test cases
        if (this.state.tests.length > 0) {
            this.state.tests.forEach((test, index) => {
                const isCurrentTest = index === this.state.currentTestIndex;
                const testIcon = test.isComplete ? 'pass' : (isCurrentTest ? 'edit' : 'circle-outline');
                
                // Add test item with better visual indicators
                const testItem = new RunConfig(
                    `Test #${index + 1}${test.featureLabel ? ': ' + test.featureLabel : ''}`,
                    isCurrentTest ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed,
                    isCurrentTest ? undefined : {
                        command: 'testzeus-hercules.selectTestConfig',
                        title: 'Edit This Test',
                        arguments: [index]
                    },
                    undefined,
                    true,
                    false,
                    false,
                    'section',
                    `test-${test.isComplete ? 'complete' : 'incomplete'}`
                );
                
                // Use different icons for test state
                if (test.isComplete) {
                    testItem.iconPath = new vscode.ThemeIcon('testing-passed-icon');
                } else if (isCurrentTest) {
                    testItem.iconPath = new vscode.ThemeIcon('edit');
                } else {
                    testItem.iconPath = new vscode.ThemeIcon('circle-large-outline');
                }
                
                items.push(testItem);
                
                // Add details for this test if it's expanded
                if (isCurrentTest) {
                    // Feature file info
                    const featureItem = new RunConfig(
                        `Feature: ${test.featureLabel}`,
                        vscode.TreeItemCollapsibleState.None,
                        {
                            command: 'testzeus-hercules.selectFeatureForTest',
                            title: 'Change Feature File',
                            arguments: []
                        },
                        vscode.Uri.file(test.featurePath),
                        false,
                        false,
                        true,
                        'gherkin',
                        'feature-item'
                    );
                    featureItem.iconPath = new vscode.ThemeIcon('file-code');
                    items.push(featureItem);
                    
                    // Test data files
                    if (test.testDataPaths.length > 0) {
                        for (let i = 0; i < test.testDataPaths.length; i++) {
                            const dataItem = new RunConfig(
                                `Data: ${test.testDataLabels[i]}`,
                                vscode.TreeItemCollapsibleState.None,
                                {
                                    command: 'testzeus-hercules.removeTestDataFromTest',
                                    title: 'Remove Test Data',
                                    arguments: [i]
                                },
                                vscode.Uri.file(test.testDataPaths[i]),
                                false,
                                false,
                                true,
                                'testdata',
                                'testdata-item'
                            );
                            dataItem.iconPath = new vscode.ThemeIcon('database');
                            items.push(dataItem);
                        }
                    }
                    
                    // Add test data button with icon
                    const addTestDataButton = new RunConfig(
                        '+ Add Test Data',
                        vscode.TreeItemCollapsibleState.None,
                        {
                            command: 'testzeus-hercules.addTestDataToTest',
                            title: 'Add Test Data',
                            arguments: []
                        },
                        undefined,
                        false,
                        false,
                        false,
                        'action',
                        'add-testdata'
                    );
                    addTestDataButton.iconPath = new vscode.ThemeIcon('add');
                    items.push(addTestDataButton);
                }
            });
        }
        
        // 3. Add action buttons based on the current state
        const currentStage = this.state.currentStage as 'feature-selection' | 'test-data-selection' | 'ready' | 'in-progress';
        if (currentStage === 'feature-selection' || 
            currentStage === 'test-data-selection' || 
            this.state.tests.length === 0) {
            // Option to add a new test with icon
            const addTestButton = new RunConfig(
                '+ Add New Test',
                vscode.TreeItemCollapsibleState.None,
                {
                    command: 'testzeus-hercules.startNewTest',
                    title: 'Start New Test',
                    arguments: []
                },
                undefined,
                false,
                false,
                false,
                'action',
                'add-test'
            );
            addTestButton.iconPath = new vscode.ThemeIcon('add');
            items.push(addTestButton);
        }
        
        // 4. Add action buttons for the entire test run
        if (this.state.tests.length > 0) {
            // View Payload button with icon
            const viewPayloadButton = new RunConfig(
                'View Payload',
                vscode.TreeItemCollapsibleState.None,
                {
                    command: 'testzeus-hercules.viewRunPayload',
                    title: 'View Payload',
                    arguments: []
                },
                undefined,
                false,
                false,
                false,
                'action',
                'view-payload'
            );
            viewPayloadButton.iconPath = new vscode.ThemeIcon('json');
            items.push(viewPayloadButton);
            
            // Run tests button with icon
            if (this.state.tests.some(t => t.isComplete)) {
                const runButton = new RunConfig(
                    'Run Tests',
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'testzeus-hercules.runTests',
                        title: 'Run Tests',
                        arguments: []
                    },
                    undefined,
                    false,
                    false,
                    false,
                    'run',
                    'run-tests'
                );
                runButton.iconPath = new vscode.ThemeIcon('play');
                items.push(runButton);
            }
        }
        
        return Promise.resolve(items);
    }

    /**
     * Gets the root Gherkin scripts container
     * @returns A promise that resolves to the root Gherkin scripts
     */
    private async getGherkinRoot(): Promise<RunConfig[]> {
        const items: RunConfig[] = [];
        
        try {
            // First add a back/cancel button if we're in selection mode
            if (this.state.currentStage === 'feature-selection') {
                const cancelButton = new RunConfig(
                    'Cancel Selection',
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'testzeus-hercules.cancelFeatureSelection',
                        title: 'Cancel Selection',
                        arguments: []
                    },
                    undefined,
                    false,
                    false,
                    false,
                    'action',
                    'cancel-selection'
                );
                cancelButton.iconPath = new vscode.ThemeIcon('close');
                items.push(cancelButton);
            }
            
            // Check if folder exists, if not, show empty state
            if (fs.existsSync(this.featuresPath) && fs.statSync(this.featuresPath).isDirectory()) {
                // Get all directories and feature files in the root features path
                const entries = await fs.promises.readdir(this.featuresPath, { withFileTypes: true });
                
                // Add all directories first
                for (const entry of entries) {
                    if (entry.isDirectory()) {
                        const dirPath = path.join(this.featuresPath, entry.name);
                        const hasFeatureFiles = await this.directoryContainsFeatureFiles(dirPath);
                        
                        if (hasFeatureFiles) {
                            const item = new RunConfig(
                                entry.name,
                                vscode.TreeItemCollapsibleState.Collapsed,
                                undefined,
                                vscode.Uri.file(dirPath),
                                false,
                                false,
                                false,
                                'section',
                                'feature-folder'
                            );
                            item.iconPath = new vscode.ThemeIcon('folder');
                            items.push(item);
                        }
                    }
                }
                
                // Then add all feature files in the root directory
                for (const entry of entries) {
                    if (entry.isFile() && entry.name.endsWith('.feature')) {
                        const filePath = path.join(this.featuresPath, entry.name);
                        const relativePath = path.relative(this.featuresPath, filePath);
                        
                        const item = new RunConfig(
                            entry.name,
                            vscode.TreeItemCollapsibleState.None,
                            {
                                command: 'testzeus-hercules.selectFeatureFile',
                                title: 'Select Feature File',
                                arguments: [entry.name, filePath]
                            },
                            vscode.Uri.file(filePath),
                            true,
                            this.isSelected(relativePath),
                            false,
                            'gherkin',
                            'feature-file'
                        );
                        item.iconPath = new vscode.ThemeIcon('file-code');
                        items.push(item);
                    }
                }
                
                // If no items, show a message
                if (items.length === 1 && this.state.currentStage === 'feature-selection') { // Only cancel button
                    const noFeaturesItem = new RunConfig(
                        'No feature files found',
                        vscode.TreeItemCollapsibleState.None,
                        undefined,
                        undefined,
                        false,
                        false,
                        false,
                        'message',
                        'no-features'
                    );
                    noFeaturesItem.iconPath = new vscode.ThemeIcon('warning');
                    items.push(noFeaturesItem);
                }
            } else {
                const noFeaturesItem = new RunConfig(
                    'No feature files found',
                    vscode.TreeItemCollapsibleState.None,
                    undefined,
                    undefined,
                    false,
                    false,
                    false,
                    'message',
                    'no-features'
                );
                noFeaturesItem.iconPath = new vscode.ThemeIcon('warning');
                items.push(noFeaturesItem);
            }
        } catch (error) {
            console.error('Error loading feature scripts:', error);
            const errorItem = new RunConfig(
                'Error loading feature files',
                vscode.TreeItemCollapsibleState.None,
                undefined,
                undefined,
                false,
                false,
                false,
                'message',
                'error'
            );
            errorItem.iconPath = new vscode.ThemeIcon('error');
            items.push(errorItem);
        }
        
        return items;
    }

    /**
     * Gets the root Test Data files container
     * @returns A promise that resolves to the root Test Data files
     */
    private async getTestDataRoot(): Promise<RunConfig[]> {
        const items: RunConfig[] = [];
        
        try {
            // First add a back/cancel button if we're in selection mode
            if (this.state.currentStage === 'test-data-selection') {
                const cancelButton = new RunConfig(
                    'Cancel Selection',
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'testzeus-hercules.cancelTestDataSelection',
                        title: 'Cancel Selection',
                        arguments: []
                    },
                    undefined,
                    false,
                    false,
                    false,
                    'action',
                    'cancel-selection'
                );
                cancelButton.iconPath = new vscode.ThemeIcon('close');
                items.push(cancelButton);
            }
            
            // Check if folder exists, if not, show empty state
            if (fs.existsSync(this.testDataPath) && fs.statSync(this.testDataPath).isDirectory()) {
                // Get all directories and test data files in the root
                const entries = await fs.promises.readdir(this.testDataPath, { withFileTypes: true });
                
                // Add all directories first
                for (const entry of entries) {
                    if (entry.isDirectory()) {
                        const dirPath = path.join(this.testDataPath, entry.name);
                        
                        const item = new RunConfig(
                            entry.name,
                            vscode.TreeItemCollapsibleState.Collapsed,
                            undefined,
                            vscode.Uri.file(dirPath),
                            false,
                            false,
                            false,
                            'section',
                            'testdata-folder'
                        );
                        item.iconPath = new vscode.ThemeIcon('folder');
                        items.push(item);
                    }
                }
                
                // Then add all JSON files in the root directory
                for (const entry of entries) {
                    if (entry.isFile() && entry.name.endsWith('.json')) {
                        const filePath = path.join(this.testDataPath, entry.name);
                        
                        const item = new RunConfig(
                            entry.name,
                            vscode.TreeItemCollapsibleState.None,
                            {
                                command: 'testzeus-hercules.selectTestDataFile',
                                title: 'Select Test Data File',
                                arguments: [entry.name, filePath]
                            },
                            vscode.Uri.file(filePath),
                            true,
                            false,
                            false,
                            'testdata',
                            'testdata-file'
                        );
                        item.iconPath = new vscode.ThemeIcon('database');
                        items.push(item);
                    }
                }
                
                // If no items, show a message
                if (items.length === 1 && this.state.currentStage === 'test-data-selection') { // Only cancel button
                    const noTestDataItem = new RunConfig(
                        'No test data files found',
                        vscode.TreeItemCollapsibleState.None,
                        undefined,
                        undefined,
                        false,
                        false,
                        false,
                        'message',
                        'no-testdata'
                    );
                    noTestDataItem.iconPath = new vscode.ThemeIcon('warning');
                    items.push(noTestDataItem);
                }
            } else {
                const noTestDataItem = new RunConfig(
                    'No test data files found',
                    vscode.TreeItemCollapsibleState.None,
                    undefined,
                    undefined,
                    false,
                    false,
                    false,
                    'message',
                    'no-testdata'
                );
                noTestDataItem.iconPath = new vscode.ThemeIcon('warning');
                items.push(noTestDataItem);
            }
        } catch (error) {
            console.error('Error loading test data files:', error);
            const errorItem = new RunConfig(
                'Error loading test data files',
                vscode.TreeItemCollapsibleState.None,
                undefined,
                undefined,
                false,
                false,
                false,
                'message',
                'error'
            );
            errorItem.iconPath = new vscode.ThemeIcon('error');
            items.push(errorItem);
        }
        
        return items;
    }
    
    /**
     * Gets test data files in a nested directory
     * @param folderPath The path to the directory containing the test data files
     * @returns A promise that resolves to the test data files
     */
    private async getNestedTestData(folderPath: string): Promise<RunConfig[]> {
        const items: RunConfig[] = [];
        
        try {
            // Read the directory contents
            const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });
            
            // Process directories first, then files
            const directories = entries.filter(entry => entry.isDirectory());
            const files = entries.filter(entry => entry.isFile() && entry.name.endsWith('.json'));
            
            // Add directories
            for (const dir of directories) {
                const dirPath = path.join(folderPath, dir.name);
                
                const item = new RunConfig(
                    dir.name,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    undefined,
                    vscode.Uri.file(dirPath),
                    false,
                    false,
                    false,
                    'section',
                    'testdata-folder'
                );
                item.iconPath = new vscode.ThemeIcon('folder');
                items.push(item);
            }
            
            // Add test data files
            for (const file of files) {
                const filePath = path.join(folderPath, file.name);
                
                const item = new RunConfig(
                    file.name,
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'testzeus-hercules.selectTestDataFile',
                        title: 'Select Test Data File',
                        arguments: [file.name, filePath]
                    },
                    vscode.Uri.file(filePath),
                    true,
                    false,
                    false,
                    'testdata',
                    'testdata-file'
                );
                item.iconPath = new vscode.ThemeIcon('database');
                items.push(item);
            }
            
        } catch (error) {
            console.error(`Error getting nested test data files from ${folderPath}:`, error);
            
            // Show error item
            const errorItem = new RunConfig(
                `Error loading folder: ${path.basename(folderPath)}`,
                vscode.TreeItemCollapsibleState.None,
                undefined,
                undefined,
                false,
                false,
                false,
                'message',
                'error'
            );
            errorItem.iconPath = new vscode.ThemeIcon('error');
            items.push(errorItem);
        }
        
        return items;
    }

    /**
     * Gets the Gherkin scripts in a nested directory
     * @param folderPath The path to the directory containing the Gherkin scripts
     */
    private async getNestedGherkinScripts(folderPath: string): Promise<RunConfig[]> {
        const items: RunConfig[] = [];
        
        try {
            // Read the directory contents
            const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });
            
            // Process directories first, then files
            const directories = entries.filter(entry => entry.isDirectory());
            const files = entries.filter(entry => entry.isFile() && entry.name.endsWith('.feature'));
            
            // Add directories
            for (const dir of directories) {
                const dirPath = path.join(folderPath, dir.name);
                
                // Check if the directory contains any feature files (recursively)
                const hasFeatureFiles = await this.directoryContainsFeatureFiles(dirPath);
                
                if (hasFeatureFiles) {
                    const item = new RunConfig(
                        dir.name,
                        vscode.TreeItemCollapsibleState.Collapsed,
                        undefined,
                        vscode.Uri.file(dirPath),
                        false,
                        false,
                        false,
                        'section',
                        'feature-folder'
                    );
                    item.iconPath = new vscode.ThemeIcon('folder');
                    items.push(item);
                }
            }
            
            // Add feature files
            for (const file of files) {
                const filePath = path.join(folderPath, file.name);
                const relativePath = path.relative(this.featuresPath, filePath);
                
                // Create item for feature file
                const item = new RunConfig(
                    file.name,
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'testzeus-hercules.selectFeatureFile',
                        title: 'Select Feature File',
                        arguments: [file.name, filePath]
                    },
                    vscode.Uri.file(filePath),
                    true,
                    this.isSelected(relativePath),
                    false,
                    'gherkin',
                    'gherkin-file'
                );
                item.iconPath = new vscode.ThemeIcon('file-code');
                items.push(item);
            }
            
        } catch (error) {
            console.error(`Error getting nested Gherkin scripts from ${folderPath}:`, error);
            
            // Show error item
            const errorItem = new RunConfig(
                `Error loading folder: ${path.basename(folderPath)}`,
                vscode.TreeItemCollapsibleState.None,
                undefined,
                undefined,
                false,
                false,
                false,
                'message',
                'error'
            );
            errorItem.iconPath = new vscode.ThemeIcon('error');
            items.push(errorItem);
        }
        
        return items;
    }
    
    /**
     * Checks if a directory contains any feature files recursively
     * @param directoryPath The path to check
     * @returns True if the directory contains feature files, false otherwise
     */
    private async directoryContainsFeatureFiles(directoryPath: string): Promise<boolean> {
        try {
            const entries = await fs.promises.readdir(directoryPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(directoryPath, entry.name);
                
                if (entry.isFile() && entry.name.endsWith('.feature')) {
                    return true;
                }
                
                if (entry.isDirectory()) {
                    const containsFeature = await this.directoryContainsFeatureFiles(fullPath);
                    if (containsFeature) {
                        return true;
                    }
                }
            }
            
            return false;
        } catch (error) {
            console.error(`Error checking directory for feature files: ${directoryPath}`, error);
            return false;
        }
    }
    
    /**
     * Checks if a Gherkin script is selected
     * @param path The path to the Gherkin script
     * @returns True if the Gherkin script is selected, false otherwise
     */
    private isSelected(path: string): boolean {
        return this.selection.gherkinScripts.has(path);
    }

    /**
     * Validates the current state
     */
    private validateState(): string | undefined {
        if (this.state.currentStage === 'feature-selection') {
            return 'Please select a feature file first';
        }
        if (this.state.currentStage === 'test-data-selection') {
            return 'Please select a test data file first';
        }
        return undefined;
    }

    /**
     * Gets the Gherkin Scripts for selection (legacy method kept for compatibility)
     */
    private async getGherkinScripts(): Promise<RunConfig[]> {
        return this.getGherkinRoot();
    }

    /**
     * Gets the Test Data files for selection
     */
    private async getTestData(): Promise<RunConfig[]> {
        return this.getTestDataRoot();
    }

    /**
     * Toggles the selection of a Gherkin script
     * @param label The label of the Gherkin script
     * @param path The path to the Gherkin script
     */
    toggleGherkinSelection(label: string, path: string): void {
        if (this.selection.gherkinScripts.has(label)) {
            // Unselect the Gherkin script
            this.selection.gherkinScripts.delete(label);
            
            // Remove any test data associations
            this.selection.testDataFiles.delete(label);
        } else {
            // Select the Gherkin script
            this.selection.gherkinScripts.set(label, path);
            
            // Initialize the test data association
            if (!this.selection.testDataFiles.has(label)) {
                this.selection.testDataFiles.set(label, []);
            }
        }
        
        this.refresh();
    }
    
    /**
     * Selects test data for a Gherkin script
     * @param testDataLabel The label of the test data
     * @param testDataPath The path to the test data
     */
    async selectTestDataForGherkin(testDataLabel: string, testDataPath: string): Promise<void> {
        // Get the selected Gherkin scripts
        const selectedGherkins = Array.from(this.selection.gherkinScripts.keys());
        
        if (selectedGherkins.length === 0) {
            vscode.window.showWarningMessage('Please select a Gherkin script first.');
            return;
        }
        
        // If there's only one Gherkin script selected, use it directly
        if (selectedGherkins.length === 1) {
            this.toggleTestDataForGherkin(selectedGherkins[0], testDataPath);
        } else {
            // If there are multiple Gherkin scripts, ask the user which one to associate with
            const selectedGherkin = await vscode.window.showQuickPick(selectedGherkins, {
                placeHolder: 'Select a Gherkin script to associate with this test data'
            });
            
            if (selectedGherkin) {
                this.toggleTestDataForGherkin(selectedGherkin, testDataPath);
            }
        }
    }
    
    /**
     * Toggles test data for a specific Gherkin script
     * @param gherkinLabel The label of the Gherkin script
     * @param testDataPath The path to the test data
     */
    private toggleTestDataForGherkin(gherkinLabel: string, testDataPath: string): void {
        // Get the current test data paths for this Gherkin script
        const currentPaths = this.selection.testDataFiles.get(gherkinLabel) || [];
        
        // Toggle the test data path
        const index = currentPaths.indexOf(testDataPath);
        if (index >= 0) {
            // Remove the test data path
            currentPaths.splice(index, 1);
        } else {
            // Add the test data path
            currentPaths.push(testDataPath);
        }
        
        // Update the selection
        this.selection.testDataFiles.set(gherkinLabel, currentPaths);
        
        this.refresh();
    }
    
    /**
     * Starts a new test configuration
     */
    startNewTest(): void {
        // Create a new test config item
        const newTest: TestConfigItem = {
            id: crypto.randomUUID(),
            order: this.state.tests.length,
            featurePath: '',
            featureLabel: '',
            testDataPaths: [],
            testDataLabels: [],
            isComplete: false,
            headless: false,
            timeout: 300
        };
        
        // Add the new test to the state
        this.state.tests.push(newTest);
        this.state.currentTestIndex = this.state.tests.length - 1;
        this.state.currentStage = 'feature-selection';
        
        // Navigate to feature selection
        this.showFeatureSelection();
    }
    
    /**
     * Shows the feature selection view
     */
    private showFeatureSelection(): void {
        // Update the state to feature selection mode
        this.state.currentStage = 'feature-selection';
        this.refresh();
        
        // Focus the view programmatically
        if (this.treeView) {
            vscode.commands.executeCommand('workbench.view.extension.hercules-explorer');
            
            // After a short delay (to allow for UI update), reveal the feature selection area
            setTimeout(() => {
                // Focus on the RunConfig view
                vscode.commands.executeCommand('herculesRunConfig.focus');
                
                this.getGherkinRoot().then(items => {
                    if (items.length > 0) {
                        this.treeView?.reveal(items[0], { select: true, focus: true });
                    }
                });
            }, 300);
        }
    }

    /**
     * Selects a feature file for the current test
     * @param label The label of the feature file
     * @param path The path to the feature file
     */
    selectFeatureFile(label: string, path: string): void {
        if (this.state.currentTestIndex >= 0 && this.state.currentTestIndex < this.state.tests.length) {
            const currentTest = this.state.tests[this.state.currentTestIndex];
            
            // Update the feature file info
            currentTest.featurePath = path;
            currentTest.featureLabel = label;
            
            // Update completion status
            this.updateTestCompletionStatus(this.state.currentTestIndex);
            
            // Update state and refresh
            this.state.currentStage = 'ready';
            this.refresh();
        }
    }

    /**
     * Opens the "Add Test Data" dialog for the current test
     */
    addTestDataToTest(): void {
        // Make sure we have a valid test to add data to
        if (this.state.currentTestIndex < 0 || this.state.currentTestIndex >= this.state.tests.length) {
            vscode.window.showErrorMessage('Please select or create a test first');
            return;
        }

        const currentTest = this.state.tests[this.state.currentTestIndex];
        if (!currentTest.featurePath) {
            vscode.window.showErrorMessage('Please select a Feature file first');
            return;
        }
        
        // Ask user if they'd like to browse all test data or use the tree view
        vscode.window.showQuickPick(
            [
                { label: 'Browse All Test Data', description: 'Search through all test data files' },
                { label: 'Use Tree View', description: 'Browse test data using the hierarchical tree view' }
            ],
            { placeHolder: 'Select how you want to choose test data' }
        ).then(selection => {
            if (!selection) {
                return; // User cancelled
            }

            if (selection.label === 'Browse All Test Data') {
                // Use quick pick to browse all test data
                this.browseAllTestData();
            } else {
                // Update state to test data selection
                this.state.currentStage = 'test-data-selection';
                this.refresh();
                
                // Focus the view programmatically and show test data files
                if (this.treeView) {
                    vscode.commands.executeCommand('workbench.view.extension.hercules-explorer');
                    
                    // After a short delay to allow for UI update, reveal the test data selection area
                    setTimeout(() => {
                        // Focus on the RunConfig view
                        vscode.commands.executeCommand('herculesRunConfig.focus');
                        
                        this.getTestDataRoot().then(items => {
                            if (items.length > 0) {
                                this.treeView?.reveal(items[0], { select: true, focus: true });
                            }
                        });
                    }, 300);
                }
            }
        });
    }
    
    /**
     * Shows a dialog to browse all available test data files
     */
    async browseAllTestData(): Promise<void> {
        try {
            // Get all test data files
            vscode.window.showInformationMessage(`PATH FOR TEST DATA: ${this.testDataPath}`);
            const allTestData = await this.getAllTestDataFiles(this.testDataPath);
            
            if (allTestData.length === 0) {
                vscode.window.showWarningMessage('No test data files found in the repository');
                return;
            }
            
            // Format for QuickPick display
            const quickPickItems = allTestData.map(testData => ({
                label: testData.name,
                description: testData.relativePath,
                detail: testData.path
            }));
            
            // Show QuickPick with test data files
            const selected = await vscode.window.showQuickPick(quickPickItems, {
                placeHolder: 'Select a test data file',
                matchOnDescription: true,
                matchOnDetail: true
            });
            
            if (selected) {
                // Use the selected test data file
                this.selectTestDataFile(selected.label, selected.detail);
            }
        } catch (error) {
            console.error('Error browsing test data files:', error);
            vscode.window.showErrorMessage(`Error browsing test data files: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Gets all test data files (potentially in nested directories)
     * @param rootFolder The root folder to search for test data files
     * @returns A list of all test data files in the folder and subfolders
     */
    private async getAllTestDataFiles(rootFolder: string): Promise<{path: string, name: string, relativePath: string}[]> {
        const results: {path: string, name: string, relativePath: string}[] = [];
        
        // Helper function to recursively search directories
        const searchDirectory: (dirPath: string) => Promise<void> = async (dirPath: string) => {
            try {
                const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
                
                for (const entry of entries) {
                    const fullPath = path.join(dirPath, entry.name);
                    
                    if (entry.isDirectory()) {
                        // Recursively search subdirectories
                        await searchDirectory(fullPath);
                    } else if (entry.name.endsWith('.txt')) {
                        // Calculate relative path from testDataPath
                        const relativePath = path.relative(this.testDataPath, fullPath);
                        results.push({
                            path: fullPath,
                            name: entry.name,
                            relativePath
                        });
                    }
                }
            } catch (error) {
                console.error(`Error searching directory ${dirPath}:`, error);
            }
        };
        
        // Start the recursive search
        await searchDirectory(rootFolder);
        return results;
    }

    /**
     * Selects a test data file for the current test
     * @param label The label of the test data file
     * @param path The path to the test data file
     */
    selectTestDataFile(label: string, path: string): void {
        if (this.state.currentTestIndex >= 0 && this.state.currentTestIndex < this.state.tests.length) {
            const currentTest = this.state.tests[this.state.currentTestIndex];
            
            // Add test data if it doesn't already exist
            if (!currentTest.testDataPaths.includes(path)) {
                currentTest.testDataPaths.push(path);
                currentTest.testDataLabels.push(label);
            }
            
            // Update completion status
            this.updateTestCompletionStatus(this.state.currentTestIndex);
            
            // Update state and refresh
            this.state.currentStage = 'ready';
            this.refresh();
        }
    }

    /**
     * Removes a test data file from the current test
     * @param index The index of the test data file to remove
     */
    removeTestDataFromTest(index: number): void {
        if (this.state.currentTestIndex >= 0 && this.state.currentTestIndex < this.state.tests.length) {
            const currentTest = this.state.tests[this.state.currentTestIndex];
            
            // Remove the test data file at the specified index
            if (index >= 0 && index < currentTest.testDataPaths.length) {
                currentTest.testDataPaths.splice(index, 1);
                currentTest.testDataLabels.splice(index, 1);
            }
            
            // Update completion status
            this.updateTestCompletionStatus(this.state.currentTestIndex);
            
            // Refresh view
            this.refresh();
        }
    }

    /**
     * Selects a test config to edit
     * @param index The index of the test config to edit
     */
    selectTestConfig(index: number): void {
        if (index >= 0 && index < this.state.tests.length) {
            this.state.currentTestIndex = index;
            this.state.currentStage = 'ready';
            this.refresh();
        }
    }

    /**
     * Updates the completion status of a test config
     * @param index The index of the test config to update
     */
    private updateTestCompletionStatus(index: number): void {
        if (index >= 0 && index < this.state.tests.length) {
            const test = this.state.tests[index];
            
            // A test is complete if it has a feature file selected
            test.isComplete = test.featurePath !== '';
            
            // Update the overall state completion status
            this.state.isComplete = this.state.tests.some(t => t.isComplete);
        }
    }

    /**
     * Cancels the feature selection
     */
    cancelFeatureSelection(): void {
        this.state.currentStage = 'ready';
        this.refresh();
    }

    /**
     * Cancels the test data selection
     */
    cancelTestDataSelection(): void {
        this.state.currentStage = 'ready';
        this.refresh();
    }

    /**
     * Starts the feature selection process for the current test
     */
    selectFeatureForTest(): void {
        // Make sure we have a valid test index
        if (this.state.currentTestIndex < 0 || this.state.currentTestIndex >= this.state.tests.length) {
            // If not, start a new test
            this.startNewTest();
            return;
        }

        // Ask user if they'd like to browse all features (including nested) or use the tree view
        vscode.window.showQuickPick(
            [
                { label: 'Browse All Feature Files', description: 'Search through all feature files including nested directories' },
                { label: 'Use Tree View', description: 'Browse features using the hierarchical tree view' }
            ],
            { placeHolder: 'Select how you want to choose a feature file' }
        ).then(selection => {
            if (!selection) {
                return; // User cancelled
            }

            if (selection.label === 'Browse All Feature Files') {
                // Use the quick pick dialog to browse all features
                this.browseAllFeatureFiles();
            } else {
                // Update state to feature selection mode for tree view
                this.state.currentStage = 'feature-selection';
                this.refresh();
                
                // Use the tree view to reveal the root level
                if (this.treeView) {
                    // Focus on the explorer view
                    vscode.commands.executeCommand('workbench.view.extension.hercules-explorer');
                    
                    // We need to delay this slightly to ensure the tree has updated
                    setTimeout(() => {
                        // Explicitly focus the tree view
                        vscode.commands.executeCommand('herculesRunConfig.focus');
                        
                        // Try to reveal the first item to make UI more responsive
                        this.getGherkinRoot().then(items => {
                            if (items.length > 0) {
                                this.treeView?.reveal(items[0], { select: true, focus: true });
                            }
                        });
                    }, 300);
                }
            }
        });
    }

    /**
     * Views the API payload for the current test run configuration
     */
    async viewRunPayload(): Promise<void> {
        try {
            // Check if we have any tests configured
            if (this.state.tests.length === 0 || !this.state.tests.some(t => t.isComplete)) {
                vscode.window.showWarningMessage('No complete tests configured to generate payload');
                return;
            }
            
            const payload = this.buildApiPayload();
            const jsonPayload = JSON.stringify(payload, null, 2);
            
            // Create a temporary file to display the JSON payload
            const tempFile = path.join(os.tmpdir(), 'test-run-payload.json');
            fs.writeFileSync(tempFile, jsonPayload, 'utf8');
            
            // Open the temp file
            const document = await vscode.workspace.openTextDocument(tempFile);
            await vscode.window.showTextDocument(document);
            
            vscode.window.showInformationMessage('Generated payload from the current configuration');
        } catch (error) {
            console.error('Error showing payload:', error);
            vscode.window.showErrorMessage(`Error showing payload: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Runs the configured tests by sending the payload to the server
     */
    async runTests(): Promise<void> {
        try {
            // Check if we have any complete tests
            if (!this.state.tests.some(t => t.isComplete)) {
                vscode.window.showErrorMessage('No complete tests configured to run');
                return;
            }
            
            // Build the API payload
            const payload = this.buildApiPayload();
            
            // Show info message before running
            vscode.window.showInformationMessage(`Running ${this.state.tests.filter(t => t.isComplete).length} tests...`);
            
            try {
                // Make API call to run tests
                // vscode.window.showInformationMessage(`${getRunTemplateEndpoint()}`)
                // vscode.window.showInformationMessage(`${JSON.stringify(payload, )}`)

                const response = await axios.post(getRunTemplateEndpoint(), payload, {
                    headers: {
                        'accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
                
                // console.log('Test run initiated:', response.data);
                // vscode.window.showInformationMessage(`Data Received Back ${JSON.stringify(response.data)}`);
                vscode.window.showInformationMessage('Test run initiated successfully!');
            } catch (apiError) {
                console.error('Error calling API:', apiError);
                vscode.window.showErrorMessage(`Error calling test API: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
                
                // Show payload for debugging
                const jsonPayload = JSON.stringify(payload, null, 2);
                const tempFile = path.join(os.tmpdir(), 'test-run-payload.json');
                fs.writeFileSync(tempFile, jsonPayload, 'utf8');
                const document = await vscode.workspace.openTextDocument(tempFile);
                await vscode.window.showTextDocument(document);
            }
        } catch (error) {
            console.error('Error running tests:', error);
            vscode.window.showErrorMessage(`Error running tests: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Clears all tests from the current configuration
     */
    clearRunConfig(): void {
        // Reset state
        this.state = {
            tests: [],
            currentStage: 'feature-selection',
            currentTestIndex: 0,
            isComplete: false
        };
        
        // For backwards compatibility
        this.selection.gherkinScripts.clear();
        this.selection.testDataFiles.clear();
        
        // Refresh view
        this.refresh();
    }
    
    /**
     * Gets the current CDP URL from settings
     * @returns The CDP URL or empty string if not configured
     */
    private getCdpEndpointUrl(): string {
        const config = vscode.workspace.getConfiguration('testzeus-hercules');
        return config.get<string>('cdpEndpointUrl', '');
    }

    /**
     * Builds the API payload for the run request
     * @returns The payload for the API call
     */
    private buildApiPayload(): any {
        // Filter out incomplete tests
        const completeTests = this.state.tests.filter(t => t.isComplete);
        
        // Map tests to the API format
        const testInfos = completeTests.map((test, index) => {
            return {
                order: index,
                feature: {
                    templatePath: this.getRelativePath(test.featurePath, this.featuresPath)
                },
                testData: test.testDataPaths.map(tdPath => ({
                    templatePath: this.getRelativePath(tdPath, this.testDataPath)
                })),
                headless: test.headless,
                timeout: test.timeout
            };
        });
        
        // Build the base payload
        const payload: any = {
            test_infos: testInfos,
            mock: false // TODO: Make this configurable
        };
        
        // Add CDP URL if available
        const cdpUrl = this.getCdpEndpointUrl();
        // if (cdpUrl) {
        //     payload.cdp_endpoint_url = cdpUrl;
        // }
        
        return payload;
    }
    
    /**
     * Gets the relative path from a full path based on a base path
     * @param fullPath The full path
     * @param basePath The base path
     * @returns The relative path
     */
    private getRelativePath(fullPath: string, basePath: string): string {
        return path.relative(basePath, fullPath).replace(/\\/g, '/');
    }
    
    /**
     * Gets the path to nested Gherkin files, supporting deeply nested directories
     * @param rootFolder The root folder to search for Gherkin files
     * @returns A list of all Gherkin files in the folder and subfolders
     */
    private async getAllGherkinFiles(rootFolder: string): Promise<{path: string, name: string, relativePath: string}[]> {
        const results: {path: string, name: string, relativePath: string}[] = [];
        
        // Helper function to recursively search directories
        const searchDirectory = async (dirPath: string): Promise<void> => {
            try {
                const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
                
                for (const entry of entries) {
                    const fullPath = path.join(dirPath, entry.name);
                    
                    if (entry.isDirectory()) {
                        // Recursively search subdirectories
                        await searchDirectory(fullPath);
                    } else if (entry.name.endsWith('.feature')) {
                        // Calculate relative path from featuresPath
                        const relativePath = path.relative(this.featuresPath, fullPath);
                        results.push({
                            path: fullPath,
                            name: entry.name,
                            relativePath
                        });
                    }
                }
            } catch (error) {
                console.error(`Error searching directory ${dirPath}:`, error);
            }
        };
        
        // Start the recursive search
        await searchDirectory(rootFolder);
        return results;
    }
    
    /**
     * Shows a dialog to browse all available feature files, including those in nested folders
     */
    async browseAllFeatureFiles(): Promise<void> {
        try {
            // Get all feature files recursively
            const allFeatures = await this.getAllGherkinFiles(this.featuresPath);
            
            if (allFeatures.length === 0) {
                vscode.window.showWarningMessage('No feature files found in the repository');
                return;
            }
            
            // Format for QuickPick display
            const quickPickItems = allFeatures.map(feature => ({
                label: feature.name,
                description: feature.relativePath,
                detail: feature.path
            }));
            
            // Show QuickPick with feature files
            const selected = await vscode.window.showQuickPick(quickPickItems, {
                placeHolder: 'Select a feature file',
                matchOnDescription: true,
                matchOnDetail: true
            });
            
            if (selected) {
                // Use the selected feature file
                this.selectFeatureFile(selected.label, selected.detail);
            }
        } catch (error) {
            console.error('Error browsing feature files:', error);
            vscode.window.showErrorMessage(`Error browsing feature files: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
}
