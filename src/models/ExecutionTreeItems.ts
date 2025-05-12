/**
 * Models for Execution Tree Items in TestZeus Hercules
 */

import * as vscode from 'vscode';

/**
 * Brief summary of an execution from the API
 */
export interface ExecutionBrief {
    execution_id: string;
    status: string;
    start_time: string;
    end_time: string | null;
    completed_tests: number;
    total_tests: number;
    failed_tests: number;
    source: string;
}

/**
 * Detailed information about an execution including test results
 */
export interface ExecutionDetail extends ExecutionBrief {
    test_passed: boolean;
    test_summary: string;
    xml_results: XmlResultItem[];
    xml_results_count: number;
}

/**
 * XML test result item from the API
 */
export interface XmlResultItem {
    id: number;
    run_id: number;
    execution_id: string;
    test_id: string;
    testsuite_name: string;
    tests_count: number;
    errors_count: number;
    failures_count: number;
    skipped_count: number;
    time: number;
    timestamp: string;
    test_name: string;
    test_classname: string;
    test_time: number;
    system_out: string;
    property_terminate: string;
    property_feature_file: string;
    property_output_file: string;
    property_proofs_video: string;
    property_proofs_base_folder: string;
    property_proofs_screenshot: string;
    property_network_logs: string;
    property_agents_logs: string;
    property_planner_thoughts: string;
    property_plan: string;
    property_next_step: string;
    property_terminate_flag: string;
    property_target_helper: string;
    final_response: string;
    total_execution_cost: number;
    total_token_used: number;
    xml_file_path: string;
    test_passed: number;
}

/**
 * Cached execution data including brief summary and optional detailed data
 */
export interface CachedExecution {
    brief: ExecutionBrief;
    details: ExecutionDetail | null;
}

/**
 * Base class for all execution tree items
 */
export abstract class ExecutionTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly itemType: 'execution' | 'testResult' | 'artifact',
        public readonly id: string,
        public readonly parentId?: string
    ) {
        super(label, collapsibleState);
    }
}

/**
 * Tree item representing an execution
 */
export class ExecutionItem extends ExecutionTreeItem {
    constructor(execution: ExecutionBrief) {
        const statusIcon = getStatusIcon(execution.status);
        super(
            `${statusIcon} ${execution.execution_id.substring(0, 8)}...`,
            vscode.TreeItemCollapsibleState.Collapsed,
            'execution',
            execution.execution_id
        );
        
        this.description = getExecutionDescription(execution);
        this.tooltip = getExecutionTooltip(execution);
        this.contextValue = `execution-${execution.status}`;
        this.iconPath = getIconForStatus(execution.status);
        
        // Command to show execution summary when single-clicked
        this.command = {
            command: 'testzeus-hercules.showExecutionSummary',
            title: 'Show Execution Summary',
            arguments: [execution.execution_id]
        };
    }
}

/**
 * Tree item representing a test result
 */
export class TestResultItem extends ExecutionTreeItem {
    constructor(testResult: XmlResultItem, executionId: string) {
        const isPassed = testResult.errors_count === 0 && testResult.failures_count === 0;
        const statusIcon = isPassed ? '✅' : '❌';
        
        // Create a unique ID by combining execution ID and test ID to avoid conflicts
        const uniqueId = `${executionId}:${testResult.test_id}`;
        
        super(
            `${statusIcon} ${testResult.test_name}`,
            vscode.TreeItemCollapsibleState.Collapsed,
            'testResult',
            uniqueId,
            executionId
        );
        
        this.description = `${testResult.testsuite_name} (${testResult.test_time}s)`;
        this.tooltip = `${testResult.test_name}\n${testResult.testsuite_name}\nDuration: ${testResult.test_time}s`;
        
        // Enhanced contextValue for finer-grained context menu targeting
        let contextValues = [isPassed ? 'testResult-passed' : 'testResult-failed'];
        
        if (testResult.property_proofs_video) {
            contextValues.push('hasVideo');
        }
        
        if (testResult.property_output_file) {
            contextValues.push('hasHtmlReport');
        }
        
        if (testResult.property_agents_logs) {
            contextValues.push('hasLogs');
        }
        
        // Join the context values with a space
        this.contextValue = contextValues.join(' ');
        this.iconPath = isPassed ? new vscode.ThemeIcon('pass') : new vscode.ThemeIcon('error');
        
        // Command to show test details
        this.command = {
            command: 'testzeus-hercules.showTestDetails',
            title: 'Show Test Details',
            arguments: [testResult.test_id, executionId]
        };
    }
}

/**
 * Tree item representing a test artifact
 */
export class ArtifactItem extends ExecutionTreeItem {
    constructor(
        label: string, 
        description: string,
        path: string,
        type: string,
        testId: string
    ) {
        // Create a unique ID by combining testId and path to avoid conflicts
        const uniqueId = `${testId}:artifact:${path}`;
        
        super(
            label,
            vscode.TreeItemCollapsibleState.None,
            'artifact',
            uniqueId,
            testId
        );
        
        this.description = description;
        this.tooltip = `${label}: ${path}`;
        // Enhanced context values with full path for direct access
        this.contextValue = `artifact-${type}`;
        this.iconPath = getIconForArtifactType(type);
        
        // Command to open the artifact
        this.command = {
            command: 'testzeus-hercules.openArtifact',
            title: 'Open Artifact',
            arguments: [path, type]
        };
        
        // Store the path for easy access in commands
        this.resourcePath = path;
    }
    
    // Path to the artifact file or directory
    resourcePath: string;
}

/**
 * Returns the appropriate icon for an execution status
 */
function getIconForStatus(status: string): vscode.ThemeIcon {
    switch (status) {
        case 'running':
            return new vscode.ThemeIcon('pulse');
        case 'completed':
            return new vscode.ThemeIcon('check');
        case 'failed':
            return new vscode.ThemeIcon('error');
        case 'pending':
            return new vscode.ThemeIcon('clock');
        default:
            return new vscode.ThemeIcon('question');
    }
}

/**
 * Returns the appropriate icon for an artifact type
 */
function getIconForArtifactType(type: string): vscode.ThemeIcon {
    switch (type) {
        case 'video':
            return new vscode.ThemeIcon('device-camera-video');
        case 'image':
        case 'screenshot':
            return new vscode.ThemeIcon('file-media');
        case 'json':
            return new vscode.ThemeIcon('json');
        case 'xml':
            return new vscode.ThemeIcon('file-code');
        case 'log':
            return new vscode.ThemeIcon('output');
        case 'feature':
            return new vscode.ThemeIcon('list-tree');
        case 'folder':
            return new vscode.ThemeIcon('folder');
        default:
            return new vscode.ThemeIcon('file');
    }
}

/**
 * Returns a status icon based on execution status
 */
function getStatusIcon(status: string): string {
    switch (status) {
        case 'running':
            return '▶️';
        case 'completed':
            return '✅';
        case 'failed':
            return '❌';
        case 'pending':
            return '⏳';
        default:
            return '❓';
    }
}

/**
 * Formats a description string for an execution
 */
function getExecutionDescription(execution: ExecutionBrief): string {
    const startTime = new Date(execution.start_time).toLocaleTimeString();
    const endTimeStr = execution.end_time 
        ? ` | Ended: ${new Date(execution.end_time).toLocaleTimeString()}` 
        : '';
        
    return `${execution.status.toUpperCase()} | Started: ${startTime}${endTimeStr}`;
}

/**
 * Formats a tooltip string for an execution
 */
function getExecutionTooltip(execution: ExecutionBrief): string {
    const startTime = new Date(execution.start_time).toLocaleString();
    const endTimeStr = execution.end_time 
        ? `\nEnd Time: ${new Date(execution.end_time).toLocaleString()}` 
        : '';
        
    return `Execution ID: ${execution.execution_id}\nStatus: ${execution.status.toUpperCase()}\nStart Time: ${startTime}${endTimeStr}\nTests: ${execution.completed_tests}/${execution.total_tests} | Failed: ${execution.failed_tests}`;
}
