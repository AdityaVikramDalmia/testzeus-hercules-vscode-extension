/**
 * Provider for live view tree view
 */

import * as vscode from 'vscode';
import { LiveViewItem } from '../models/LiveViewItem';
import { StepStatus, LiveViewData } from '../types/results';
import * as path from 'path';

/**
 * TreeDataProvider for the Live View tree view
 */
export class LiveViewProvider implements vscode.TreeDataProvider<LiveViewItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<LiveViewItem | undefined | null | void> = new vscode.EventEmitter<LiveViewItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<LiveViewItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    // Track current test execution state
    private _isExecuting: boolean = false;
    private _currentStep: string | null = null;
    private _stepStatus: StepStatus | null = null;
    private _browserScreenshot: string | null = null;
    private _testName: string | null = null;
    private _browser: string | null = null;
    private _startTime: Date | null = null;
    private _testProgress: number = 0;
    private _completedSteps: Array<{step: string, status: StepStatus}> = [];
    private _testReportPath: string | null = null;
    private _videoRecordingPath: string | null = null;
    
    /**
     * Creates a new LiveViewProvider instance
     * @param workspaceRoot The workspace root path
     */
    constructor(private workspaceRoot: string | undefined) {}
    
    /**
     * Refreshes the tree view with updated data
     * @param data Optional data to update the view with
     */
    refresh(data?: LiveViewData): void {
        if (data) {
            if (data.isExecuting !== undefined) {
                this._isExecuting = data.isExecuting;
                
                // Reset data when starting a new test
                if (data.isExecuting && !this._isExecuting) {
                    this._startTime = new Date();
                    this._completedSteps = [];
                    this._testProgress = 0;
                }
                
                // Clear data when test is done
                if (!data.isExecuting && this._isExecuting) {
                    this._testProgress = 100;
                }
            }
            
            if (data.currentStep !== undefined) {
                // Add previous step to completed steps if step changed
                if (this._currentStep && this._currentStep !== data.currentStep && this._stepStatus) {
                    this._completedSteps.unshift({
                        step: this._currentStep,
                        status: this._stepStatus
                    });
                    
                    // Keep only the last 5 steps
                    if (this._completedSteps.length > 5) {
                        this._completedSteps.pop();
                    }
                }
                
                this._currentStep = data.currentStep;
            }
            
            if (data.stepStatus !== undefined) {
                this._stepStatus = data.stepStatus;
                
                // Update progress on each step
                if (this._isExecuting) {
                    // Simple incremental progress
                    this._testProgress = Math.min(this._testProgress + 5, 95);
                }
            }
            
            if (data.browserScreenshot !== undefined) {
                this._browserScreenshot = data.browserScreenshot;
            }
            
            if (data.testName !== undefined) {
                this._testName = data.testName;
            }
            
            if (data.browser !== undefined) {
                this._browser = data.browser;
            }
            
            if (data.testReportPath !== undefined) {
                this._testReportPath = data.testReportPath;
            }
            
            if (data.videoRecordingPath !== undefined) {
                this._videoRecordingPath = data.videoRecordingPath;
            }
        }
        
        this._onDidChangeTreeData.fire();
    }
    
    /**
     * Gets the TreeItem for the given element
     * @param element The element to get the TreeItem for
     * @returns The TreeItem for the element
     */
    getTreeItem(element: LiveViewItem): vscode.TreeItem {
        return element;
    }
    
    /**
     * Gets the elapsed time of test execution in human-readable format
     */
    private getElapsedTime(): string {
        if (!this._startTime) {
            return '00:00';
        }
        
        const now = new Date();
        const diffMs = now.getTime() - this._startTime.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffSecs = Math.floor((diffMs % 60000) / 1000);
        
        return `${diffMins.toString().padStart(2, '0')}:${diffSecs.toString().padStart(2, '0')}`;
    }
    
    /**
     * Gets the children of the given element
     * @param element The element to get the children for
     * @returns A promise that resolves to the children of the element
     */
    getChildren(element?: LiveViewItem): Thenable<LiveViewItem[]> {
        if (!this.workspaceRoot) {
            return Promise.resolve([]);
        }
        
        if (element) {
            // Handle expandable items
            if (element.id === 'history') {
                return Promise.resolve(
                    this._completedSteps.map((step, index) => {
                        const statusIcon = step.status === 'passed' ? '✅' :
                                           step.status === 'failed' ? '❌' : '⏳';
                        return new LiveViewItem(
                            `Step ${index + 1}`,
                            `${statusIcon} ${step.step}`,
                            vscode.TreeItemCollapsibleState.None,
                            undefined,
                            `step-${step.status}`
                        );
                    })
                );
            }
            
            return Promise.resolve([]);
        } else {
            const items: LiveViewItem[] = [];
            
            // Status item with test name if available
            const statusLabel = this._testName ? `${this._isExecuting ? 'Running' : 'Last Run'}: ${this._testName}` : 'Status';
            const statusValue = this._isExecuting 
                ? `Running (${this.getElapsedTime()})`
                : this._testName ? 'Completed' : 'Idle';
            
            items.push(new LiveViewItem(
                statusLabel,
                statusValue,
                vscode.TreeItemCollapsibleState.None,
                undefined,
                this._isExecuting ? 'liveLiveStatus' : 'liveIdleStatus'
            ));
            
            // Progress bar
            if (this._isExecuting || this._testProgress > 0) {
                const progressBar = this.createProgressBar(this._testProgress);
                items.push(new LiveViewItem(
                    'Progress',
                    `${progressBar} ${this._testProgress}%`,
                    vscode.TreeItemCollapsibleState.None,
                    undefined,
                    'liveProgress'
                ));
            }
            
            // Browser information
            if (this._browser) {
                items.push(new LiveViewItem(
                    'Browser',
                    this._browser,
                    vscode.TreeItemCollapsibleState.None,
                    undefined,
                    'liveBrowser'
                ));
            }
            
            // Current step being executed
            if (this._currentStep) {
                const statusIcon = this._stepStatus === 'passed' ? '✅' :
                                   this._stepStatus === 'failed' ? '❌' : '⏳';
                items.push(new LiveViewItem(
                    'Current Step',
                    `${statusIcon} ${this._currentStep}`,
                    vscode.TreeItemCollapsibleState.None,
                    undefined,
                    `step-${this._stepStatus || 'running'}`
                ));
            }
            
            // Recent step history
            if (this._completedSteps.length > 0) {
                items.push(new LiveViewItem(
                    'Step History',
                    `${this._completedSteps.length} step${this._completedSteps.length > 1 ? 's' : ''} completed`,
                    vscode.TreeItemCollapsibleState.Expanded,
                    undefined,
                    'history',
                    'history'
                ));
            }
            
            // Test Report link if available
            if (this._testReportPath) {
                items.push(new LiveViewItem(
                    'Test Report',
                    path.basename(this._testReportPath),
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'testzeus-hercules.openTestReport',
                        title: 'Open Test Report',
                        arguments: [this._testReportPath]
                    },
                    'liveReport'
                ));
            }
            
            // Screenshot link if available
            if (this._browserScreenshot) {
                items.push(new LiveViewItem(
                    'Screenshot',
                    path.basename(this._browserScreenshot),
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'testzeus-hercules.openScreenshot',
                        title: 'Open Screenshot',
                        arguments: [this._browserScreenshot]
                    },
                    'liveScreenshot'
                ));
            }
            
            // Video recording link if available
            if (this._videoRecordingPath) {
                items.push(new LiveViewItem(
                    'Video Recording',
                    path.basename(this._videoRecordingPath),
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'testzeus-hercules.openVideoRecording',
                        title: 'Open Video Recording',
                        arguments: [this._videoRecordingPath]
                    },
                    'liveVideo'
                ));
            }
            
            // Add a start/stop test button if needed
            if (this._isExecuting) {
                items.push(new LiveViewItem(
                    'Stop Test',
                    'Cancel the currently running test',
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'testzeus-hercules.stopTest',
                        title: 'Stop Test',
                        arguments: []
                    },
                    'liveStop'
                ));
            } else if (this._testName) {
                items.push(new LiveViewItem(
                    'Rerun Test',
                    'Run the test again',
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'testzeus-hercules.rerunTest',
                        title: 'Rerun Test',
                        arguments: []
                    },
                    'liveRun'
                ));
            }
            
            return Promise.resolve(items);
        }
    }
    
    /**
     * Creates a visual progress bar using Unicode block characters
     * @param percentage The percentage to represent (0-100)
     * @returns A text-based progress bar
     */
    private createProgressBar(percentage: number): string {
        const width = 10;
        const filled = Math.round(width * (percentage / 100));
        const empty = width - filled;
        
        return '█'.repeat(filled) + '░'.repeat(empty);
    }
} 