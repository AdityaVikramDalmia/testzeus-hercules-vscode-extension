/**
 * Provider for live logs tree view
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { LogItem } from '../models/LogItem';
import { LogEntry, LogType } from '../types/logs';
import { ensureHerculesDirectory } from '../utils/filesystem';
import { MAX_LOGS } from '../constants/config';

/**
 * TreeDataProvider for the Live Logs tree view
 */
export class LiveLogsProvider implements vscode.TreeDataProvider<LogItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<LogItem | undefined | null | void> = new vscode.EventEmitter<LogItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<LogItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    private _logs: LogEntry[] = [];
    private _terminal: vscode.Terminal | null = null;
    private _writeEmitter: vscode.EventEmitter<string> | null = null;
    private _activeJobs: Map<string, vscode.Terminal> = new Map();
    
    /**
     * Creates a new LiveLogsProvider instance
     * @param workspaceRoot The workspace root path
     */
    constructor(private workspaceRoot: string | undefined) {}
    
    /**
     * Refreshes the tree view
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
    
    /**
     * Creates or returns the existing terminal for logs
     * @returns The terminal for logs
     */
    getTerminal(): vscode.Terminal {
        if (!this._terminal || this._terminal.exitStatus !== undefined) {
            // Create a write emitter for streaming logs to the terminal
            this._writeEmitter = new vscode.EventEmitter<string>();
            
            // Create terminal with write emitter as the pty
            this._terminal = vscode.window.createTerminal({
                name: 'TestZeus Hercules Logs',
                pty: {
                    onDidWrite: this._writeEmitter.event,
                    open: () => {
                        // Show welcome message when terminal is first opened
                        this.writeToTerminal('\r\n\x1b[1;36m===== TestZeus Hercules Logs Terminal =====\x1b[0m\r\n');
                        this.writeToTerminal('\x1b[1;37mThis terminal displays logs from TestZeus Hercules jobs.\x1b[0m\r\n');
                        this.writeToTerminal('\x1b[1;37mJob output will appear here automatically when jobs are run.\x1b[0m\r\n\r\n');
                    },
                    close: () => {
                        // Clean up when terminal is closed
                        this._terminal = null;
                        this._writeEmitter = null;
                    },
                    handleInput: (data: string) => {
                        // Process terminal input if needed
                        if (data === '\r') {
                            // Enter key pressed
                            this.writeToTerminal('\r\n');
                            return;
                        }
                        
                        // Echo input characters
                        this.writeToTerminal(data);
                    }
                }
            });
        }
        return this._terminal;
    }
    
    /**
     * Connects a job terminal to this logs provider
     * @param jobTerminal The job terminal to connect
     */
    connectJobTerminal(jobTerminal: vscode.Terminal): void {
        // Ensure our log terminal is created and visible
        const logsTerminal = this.getTerminal();
        
        // Generate a unique job ID
        const jobId = `job-${Date.now()}`;
        
        // Add to active jobs
        this._activeJobs.set(jobId, jobTerminal);
        
        // Register event handler for job terminal close
        const disposable = vscode.window.onDidCloseTerminal(terminal => {
            if (terminal === jobTerminal) {
                // Job terminal closed, remove from active jobs
                this._activeJobs.delete(jobId);
                
                // Add log
                this.addLog('info', `Job terminal closed`);
                
                // Write to logs terminal
                this.writeToTerminal('\r\n\x1b[1;33m===== TestZeus Hercules Job Terminal Closed =====\x1b[0m\r\n\r\n');
                
                // Dispose of the event handler
                disposable.dispose();
            }
        });
        
        // Write a header to the logs terminal
        this.writeToTerminal('\r\n\x1b[1;33m===== TestZeus Hercules Job Connected =====\x1b[0m\r\n\r\n');
    }
    
    /**
     * Writes directly to the terminal
     * @param message The message to write
     */
    writeToTerminal(message: string): void {
        if (this._writeEmitter) {
            this._writeEmitter.fire(message);
        }
    }
    
    /**
     * Adds a log entry and refreshes the view
     * @param type The type of log entry
     * @param message The log message
     */
    addLog(type: LogType, message: string): void {
        const timestamp = new Date();
        this._logs.push({ type, message, timestamp });
        
        // Format the message for the terminal with colors
        let colorCode = '';
        switch (type) {
            case 'error':
                colorCode = '\x1b[1;31m'; // Bold Red
                break;
            case 'warn':
                colorCode = '\x1b[1;33m'; // Bold Yellow
                break;
            case 'info':
                colorCode = '\x1b[1;36m'; // Bold Cyan
                break;
            case 'debug':
                colorCode = '\x1b[1;90m'; // Bold Gray
                break;
            case 'test':
                colorCode = '\x1b[1;32m'; // Bold Green
                break;
            default:
                colorCode = '\x1b[1;37m'; // Bold White
        }
        
        // Format timestamp
        const timeStr = timestamp.toLocaleTimeString();
        
        // Write to terminal if available
        if (this._writeEmitter) {
            this.writeToTerminal(`${colorCode}[${timeStr}] [${type.toUpperCase()}]\x1b[0m ${message}\r\n`);
        }
        
        // Trim log if it gets too large
        if (this._logs.length > MAX_LOGS) {
            this._logs = this._logs.slice(-MAX_LOGS);
        }
        
        // Save logs to file
        this.saveLogs();
        
        this.refresh();
    }
    
    /**
     * Clears all logs
     */
    clearLogs(): void {
        this._logs = [];
        
        // Clear terminal if available
        if (this._writeEmitter) {
            this.writeToTerminal('\x1b[2J\x1b[3J\x1b[H'); // ANSI clear screen and scrollback
            this.writeToTerminal('\r\n\x1b[1;33m===== Logs Cleared =====\x1b[0m\r\n\r\n');
        }
        
        this.refresh();
    }
    
    /**
     * Returns the number of active job terminals
     * @returns Number of active jobs
     */
    getActiveJobsCount(): number {
        return this._activeJobs.size;
    }
    
    /**
     * Saves logs to file in .testzeus-hercules/logs directory
     */
    private saveLogs(): void {
        if (!this.workspaceRoot) { return; }
        
        // Use the standardized directory for logs
        const herculesDir = ensureHerculesDirectory(this.workspaceRoot);
        if (!herculesDir) { return; }
        
        const logsDir = path.join(herculesDir, 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const logFile = path.join(logsDir, `log_${timestamp}.json`);
        
        try {
            fs.writeFileSync(logFile, JSON.stringify(this._logs, null, 2), 'utf8');
        } catch (err) {
            console.error('Failed to save logs:', err);
        }
    }
    
    /**
     * Gets the TreeItem for the given element
     * @param element The element to get the TreeItem for
     * @returns The TreeItem for the element
     */
    getTreeItem(element: LogItem): vscode.TreeItem {
        return element;
    }
    
    /**
     * Gets the children of the given element
     * @param element The element to get the children for
     * @returns A promise that resolves to the children of the element
     */
    getChildren(element?: LogItem): Thenable<LogItem[]> {
        if (!this.workspaceRoot) {
            return Promise.resolve([]);
        }
        
        if (element) {
            return Promise.resolve([]);
        } else {
            // Map log entries to LogItem instances
            const items: LogItem[] = this._logs.map(log => {
                const formattedTime = log.timestamp.toLocaleTimeString();
                return new LogItem(
                    `[${formattedTime}] ${log.type.toUpperCase()}`,
                    log.message,
                    vscode.TreeItemCollapsibleState.None,
                    undefined,
                    `log${log.type}`
                );
            });
            
            // Add action buttons at the top
            if (items.length > 0) {
                // Add "Clear logs" item at the top
                items.unshift(new LogItem(
                    'Clear Logs',
                    '',
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'testzeus-hercules.clearLogs',
                        title: 'Clear Logs',
                        arguments: []
                    },
                    'logClear'
                ));
                
                // Add "Open logs terminal" item at the top
                items.unshift(new LogItem(
                    'Open Logs Terminal',
                    '',
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'testzeus-hercules.openLogsTerminal',
                        title: 'Open Logs Terminal',
                        arguments: []
                    },
                    'terminal'
                ));
            }
            
            return Promise.resolve(items);
        }
    }
} 