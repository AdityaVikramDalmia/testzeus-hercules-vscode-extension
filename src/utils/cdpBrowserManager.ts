/**
 * Chrome DevTools Protocol Browser Manager
 * Handles launching Chrome instances with debugging enabled and retrieving CDP URLs
 */

import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as os from 'os';
import * as path from 'path';
import axios from 'axios';

/**
 * Chrome DevTools Protocol Browser Manager
 * Handles launching Chrome instances with debugging enabled and retrieving CDP URLs
 */
export class CdpBrowserManager {
    private static instance: CdpBrowserManager;
    private extensionContext: vscode.ExtensionContext;
    private browserProcess: cp.ChildProcess | null = null;
    private cdpUrl: string | null = null;
    private debugPort: number = 0;
    private userDataDir: string = '';
    private statusBarItem: vscode.StatusBarItem;
    
    // Event emitter for browser status changes
    private _onBrowserStatusChanged: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onBrowserStatusChanged: vscode.Event<void> = this._onBrowserStatusChanged.event;
    
    // Default Chrome paths based on platform
    private static readonly DEFAULT_CHROME_PATHS: Record<string, string> = {
        'darwin': '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        'win32': 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'linux': '/usr/bin/google-chrome'
    };
    
    /**
     * Updates the status bar with the current CDP browser status
     * @param cdpUrl The current CDP URL or null if not connected
     */
    private updateStatusBar(cdpUrl: string | null): void {
        if (cdpUrl) {
            this.statusBarItem.text = '$(debug) CDP Connected';
            this.statusBarItem.tooltip = `CDP Browser running: ${cdpUrl}`;
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        } else {
            this.statusBarItem.text = '$(debug-disconnect) CDP';
            this.statusBarItem.tooltip = 'No CDP Browser Running';
            this.statusBarItem.backgroundColor = undefined;
        }
        
        // Notify listeners that browser status has changed
        this._onBrowserStatusChanged.fire();
    }

    // Private constructor for singleton pattern
    private constructor(context: vscode.ExtensionContext) {
        this.extensionContext = context;
        
        // Create status bar item to display CDP connection status
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.tooltip = 'No CDP Browser Running';
        this.statusBarItem.text = '$(debug-disconnect) CDP';
        this.statusBarItem.command = 'testzeus-hercules.manageCdpBrowser';
        this.statusBarItem.show();
        
        // Save status bar item in extension context
        context.subscriptions.push(this.statusBarItem);
        
        // Restore previous state if browser was running
        const wasRunning = this.extensionContext.globalState.get<boolean>('cdpBrowserRunning', false);
        const lastUrl = this.extensionContext.globalState.get<string>('lastCdpUrl', '');
        
        if (wasRunning && lastUrl) {
            // If a browser was previously running, don't auto-start it,
            // but update the statusBar to show the previous state
            this.cdpUrl = lastUrl;
            this.updateStatusBar(this.cdpUrl);
        }
    }
    
    /**
     * Gets the singleton instance of CdpBrowserManager
     * @param context The extension context (required only on first call)
     * @returns The CdpBrowserManager instance
     */
    public static getInstance(context?: vscode.ExtensionContext): CdpBrowserManager {
        if (!CdpBrowserManager.instance) {
            if (!context) {
                throw new Error('Extension context is required when initializing CdpBrowserManager');
            }
            CdpBrowserManager.instance = new CdpBrowserManager(context);
        }
        return CdpBrowserManager.instance;
    }
    
    /**
     * Spawns a Chrome instance with CDP debugging enabled
     * @returns A promise that resolves to the CDP URL or null if failed
     */
    public async spawnBrowser(): Promise<string | null> {
        try {
            // Kill any existing CDP browser process
            await this.closeBrowser();
            
            // Generate a random port between 9222 and 9999
            this.debugPort = Math.floor(Math.random() * (9999 - 9222) + 9222);
            this.userDataDir = path.join(os.tmpdir(), `chrome-debug-${Date.now()}`);
            
            // Get Chrome path based on platform
            const platform = os.platform();
            const defaultChromePath = CdpBrowserManager.DEFAULT_CHROME_PATHS[platform] || '';
            
            // Get custom Chrome path from settings if available
            const config = vscode.workspace.getConfiguration('testzeus-hercules');
            const customChromePath = config.get<string>('chromePath', '');
            const chromePath = customChromePath || defaultChromePath;
            
            if (!chromePath) {
                throw new Error('Chrome executable path not found. Please configure it in settings.');
            }
            
            // Chrome launch arguments
            const args = [
                `--remote-debugging-port=${this.debugPort}`,
                `--user-data-dir=${this.userDataDir}`,
                '--no-first-run',
                '--no-default-browser-check',
                '--start-maximized',
                '--incognito'
            ];
            
            console.log(`Launching Chrome with args: ${args.join(' ')}`);
            
            // Launch Chrome process
            this.browserProcess = cp.spawn(chromePath, args, { 
                detached: true,
                stdio: 'ignore'
            });
            
            // Handle process events
            this.browserProcess.on('error', (error) => {
                vscode.window.showErrorMessage(`Failed to start Chrome: ${error.message}`);
                this.updateStatusBar(null);
                this.browserProcess = null;
            });
            
            this.browserProcess.on('exit', () => {
                this.updateStatusBar(null);
                this.browserProcess = null;
                this.cdpUrl = null;
            });
            
            // Wait for the debugging API to be available (increase timeout for slower systems)
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Get the WebSocket URL from the browser's debugging API
            try {
                const response = await axios.get(`http://localhost:${this.debugPort}/json/version`);
                this.cdpUrl = response.data.webSocketDebuggerUrl;
                
                if (!this.cdpUrl) {
                    throw new Error('Could not retrieve WebSocket debugger URL');
                }
            } catch (error) {
                console.error('Error getting WebSocket URL:', error);
                throw new Error(`Failed to connect to Chrome debugging API: ${error instanceof Error ? error.message : String(error)}`);
            }
            
            // Update the statusBar
            this.updateStatusBar(this.cdpUrl);
            
            // Show the URL to the user
            vscode.window.showInformationMessage(`CDP URL available: ${this.cdpUrl}`, 'Copy to Clipboard').then(selection => {
                if (selection === 'Copy to Clipboard') {
                    vscode.env.clipboard.writeText(this.cdpUrl || '');
                }
            });
            
            // Store CDP URL in extension settings
            await vscode.workspace.getConfiguration('testzeus-hercules').update('cdpEndpointUrl', this.cdpUrl, vscode.ConfigurationTarget.Global);
            
            // Store in extension context for persistence
            this.extensionContext.globalState.update('lastCdpUrl', this.cdpUrl);
            this.extensionContext.globalState.update('cdpBrowserRunning', true);
            
            return this.cdpUrl;
        } catch (error) {
            this.updateStatusBar(null);
            vscode.window.showErrorMessage(`Error spawning CDP browser: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }
    
    /**
     * Closes the spawned CDP browser
     * @returns A promise that resolves when the browser is closed
     */
    public async closeBrowser(): Promise<void> {
        if (this.browserProcess) {
            try {
                // Kill process based on platform
                if (os.platform() === 'win32') {
                    cp.exec(`taskkill /pid ${this.browserProcess.pid} /T /F`);
                } else {
                    this.browserProcess.kill('SIGTERM');
                }
            } catch (error) {
                console.error('Error closing browser:', error);
            }
            
            this.browserProcess = null;
            this.cdpUrl = null;
            
            // Update status and settings
            this.updateStatusBar(null);
            await vscode.workspace.getConfiguration('testzeus-hercules').update('cdpEndpointUrl', '', vscode.ConfigurationTarget.Global);
            this.extensionContext.globalState.update('cdpBrowserRunning', false);
            
            vscode.window.showInformationMessage('CDP browser session closed');
        }
    }
    
    /**
     * Gets the current CDP URL
     * @returns The CDP URL or null if no browser is running
     */
    public getCurrentUrl(): string | null {
        return this.cdpUrl;
    }
    
    /**
     * Checks if a CDP browser is currently running
     * @returns True if a browser is running, false otherwise
     */
    public isBrowserRunning(): boolean {
        return this.browserProcess !== null && this.cdpUrl !== null;
    }
    
    /**
     * Gets the current CDP browser endpoint URL
     * @returns The CDP URL or empty string if not running
     */
    public getBrowserEndpoint(): string {
        return this.cdpUrl || '';
    }
    
    /**
     * Gets the debug port used by the CDP browser
     * @returns The debug port or 0 if no browser is running
     */
    public getDebugPort(): number {
        return this.debugPort;
    }
    
    /**
     * Opens CDP management options
     * @returns A promise that resolves when the action is complete
     */
    public async manageBrowser(): Promise<void> {
        const isRunning = this.browserProcess !== null || this.cdpUrl !== null;
        const options = isRunning
            ? ['Copy CDP URL', 'Close Browser', 'Restart Browser']
            : ['Start Browser'];
            
        const choice = await vscode.window.showQuickPick(options, {
            placeHolder: isRunning ? 'CDP Browser is running' : 'CDP Browser is not running'
        });
        
        if (!choice) {
            return;
        }
        
        switch (choice) {
            case 'Start Browser':
                await this.spawnBrowser();
                break;
            case 'Close Browser':
                await this.closeBrowser();
                break;
            case 'Restart Browser':
                await this.closeBrowser();
                await this.spawnBrowser();
                break;
            case 'Copy CDP URL':
                if (this.cdpUrl) {
                    await vscode.env.clipboard.writeText(this.cdpUrl);
                    vscode.window.showInformationMessage('CDP URL copied to clipboard');
                }
                break;
        }
    }
}
