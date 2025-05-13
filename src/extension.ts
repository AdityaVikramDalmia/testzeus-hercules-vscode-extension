/**
 * TestZeus Hercules Extension
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getWorkspaceRoot, ensureHerculesDirectory } from './utils/filesystem';
import { CdpBrowserManager } from './utils/cdpBrowserManager';
import { 
    GherkinScriptsProvider, 
    TestDataProvider,
    LiveViewProvider, 
    LiveLogsProvider, 
    WelcomeViewProvider,
    PermanentStorageProvider,
    RunConfigProvider,
    CdpBrowserProvider,
    CdpBrowserTreeProvider
} from './providers';
import { EnhancedExecutionResultsProvider } from './providers/EnhancedExecutionResultsProvider';
import { ArtifactService } from './services/ArtifactService';
import { ExecutionResultsWebview } from './webviews/ExecutionResultsWebview';
import {
    initializeBackendServerStatusBar,
    startBackendServer,
    disposeServerHealthCheck
} from './commands/backendServerCommands';
import { 
    openScreenshot, 
    openTestReport, 
    clearLogs,
    openLogsTerminal,
    openVideoRecording
} from './commands';
import { 
    createGherkinScript, 
    deleteGherkinScript, 
    renameGherkinScript, 
    duplicateGherkinScript,
    createGherkinFolder,
    findGherkinScript
} from './commands/gherkinCommands';
import { improveGherkinWithCopilot } from './commands/improveGherkinCommand';
import {
    createTestData,
    deleteTestData,
    renameTestData,
    duplicateTestData,
    createTestDataFolder,
    findTestData
} from './commands/testDataCommands';
import { 
    runGherkinScript, 
    runHercules,
    stopTest,
    rerunTest,
    runGherkinScriptWithCombined,
    stopTestWithCombined,
    rerunTestWithCombined
} from './commands/runCommands';
import { createGherkinScriptFromTemplate } from './commands/scriptCommands';
import { 
    initializeHerculesDirectories, 
    openConfigFile, 
    resetConfigFile,
    createConfigFile,
    editConfigFile,
    initializeServerConFolder,
    updateServerUrls
} from './commands/configCommands';
import {
    openEnvFile,
    createEnvFile,
    editEnvFile,
    resetEnvFile,
    openEnvLocation
} from './commands/environmentFileCommands';
import {
    openConfigQuickPick,
    openAllSettings,
    openLlmSettings,
    openProjectSettings,
    openBrowserSettings,
    openAdvancedSettings
} from './commands/settingsCommands';
import { 
    setLocalEnvironment,
    setDockerEnvironment,
    setVirtualEnvEnvironment,
    configureEnvironment
} from './commands/environmentCommands';
import { checkHerculesInstall, installHercules, installPlaywright, setupEnvironment, pullDockerImage, setupProject, runServer, copyTestDataWithSamples } from './commands/environmentToolsCommands';
import { CONFIG_NAMESPACE } from './constants/config';
import { ResourceManager } from './utils/resourceManager';
import { ConfigStorage } from './utils/configStorage';
import { PathManager } from './utils/pathManager';
import { EnvironmentManager } from './utils/environmentManager';
import { DockerManager } from './utils/dockerManager';
import { GherkinScript } from './models';
import { EnvironmentProvider } from './providers/EnvironmentProvider';
import { ConfigurationTreeProvider } from './providers/ConfigurationTreeProvider';
// Import Gherkin linting functionality
import { 
    initializeGherkinLinter,
    lintCurrentDocument,
    lintAllFeatureFilesCommand
} from './commands/gherkinLintCommands';
import { CombinedLiveViewProvider } from './providers/CombinedLiveViewProvider';
import { LogDataProvider } from './providers/LogDataProvider';
import {
    clearLogsCombined,
    openLogsTerminalCombined
} from './commands/logCommands';
import { openExecutionLogs } from './commands/executionLogsCommands';
import { openExecutionTerminal, refreshLogData } from './commands/logDataCommands';
import { initScriptConfigProvider, openScriptConfig, createScriptConfig, editScriptConfigRaw } from './commands/scriptConfigCommands';

let serverStatusBarItem: vscode.StatusBarItem;
let configStatusBarItem: vscode.StatusBarItem | undefined;

/**
 * Activates the extension
 * @param context The extension context
 * @returns Object defining the extension API
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('TestZeus Hercules extension is now active');
    
    // Initialize ConfigStorage with extension context
    try {
        ConfigStorage.getInstance(context);
    } catch (error) {
        console.error('Failed to initialize ConfigStorage:', error);
        vscode.window.showErrorMessage(`Failed to initialize ConfigStorage: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Initialize ResourceManager with extension context
    try {
        ResourceManager.getInstance(context);
    } catch (error) {
        console.error('Failed to initialize ResourceManager:', error);
        vscode.window.showErrorMessage(`Failed to initialize ResourceManager: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Initialize PathManager with extension context
    try {
        PathManager.getInstance(context);
        
        // Ensure the global storage path exists
        const pathManager = PathManager.getInstance();
        const globalStoragePath = pathManager.getGlobalStoragePath();
        console.log(`Global storage path: ${globalStoragePath}`);
        
        // Initialize server_con folder in global storage
        const dataDir = '/Users/aditya/Documents/personal/newProjects3/testzeus-hercules-extension/testzeus-hercules-test/.testzeus-hercules/data';
        const serverConPath = pathManager.initializeServerConFolder(dataDir);
        console.log(`Server connection folder initialized at: ${serverConPath}`);
    } catch (error) {
        console.error('Failed to initialize PathManager:', error);
        vscode.window.showErrorMessage(`Failed to initialize PathManager: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Initialize EnvironmentManager with extension context
    try {
        EnvironmentManager.getInstance(context);
    } catch (error) {
        console.error('Failed to initialize EnvironmentManager:', error);
        vscode.window.showErrorMessage(`Failed to initialize EnvironmentManager: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Initialize DockerManager with extension context
    try {
        DockerManager.getInstance(context);
    } catch (error) {
        console.error('Failed to initialize DockerManager:', error);
        vscode.window.showErrorMessage(`Failed to initialize DockerManager: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Initialize CdpBrowserManager with extension context
    try {
        CdpBrowserManager.getInstance(context);
    } catch (error) {
        console.error('Failed to initialize CdpBrowserManager:', error);
        vscode.window.showErrorMessage(`Failed to initialize CdpBrowserManager: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Get the workspace folder
    const workspaceRoot = getWorkspaceRoot();
    
    // Check if the .testzeus-hercules folder exists
    if (workspaceRoot && !WelcomeViewProvider.hasHerculesFolder()) {
        // Show welcome screen if folder doesn't exist
        const welcomeViewProvider = new WelcomeViewProvider(context);
        welcomeViewProvider.show();
    } else if (workspaceRoot) {
        // Initialize .testzeus-hercules directory if we have a workspace
        ensureHerculesDirectory(workspaceRoot);
    }
    
    // Config status bar item has been removed per user request
    
    // Create a status bar item for backend server connection
    serverStatusBarItem = initializeBackendServerStatusBar(context);
    
    // Create our view providers
    const gherkinScriptsProvider = new GherkinScriptsProvider(workspaceRoot);
    const testDataProvider = new TestDataProvider(workspaceRoot);
    const combinedLiveViewProvider = new CombinedLiveViewProvider(workspaceRoot);
    const permanentStorageProvider = new PermanentStorageProvider(workspaceRoot);
    const runConfigProvider = new RunConfigProvider(workspaceRoot);
    const cdpBrowserTreeProvider = new CdpBrowserTreeProvider(workspaceRoot);
    const logDataProvider = new LogDataProvider();
    
    // Create enhanced execution results provider
    const enhancedExecutionResultsProvider = new EnhancedExecutionResultsProvider(context);
    
    // Register all tree data providers
    vscode.window.registerTreeDataProvider('herculesGherkinScripts', gherkinScriptsProvider);
    vscode.window.registerTreeDataProvider('herculesTestData', testDataProvider);
    
    // Create the live view with createTreeView instead of registerTreeDataProvider
    const combinedLiveViewTreeView = vscode.window.createTreeView('herculesCombinedLiveView', {
        treeDataProvider: combinedLiveViewProvider,
        showCollapseAll: true
    });
    
    // Force an initial refresh and add event listener to ensure executions are loaded
    combinedLiveViewTreeView.onDidChangeVisibility(e => {
        if (e.visible) {
            // Force refresh when view becomes visible
            combinedLiveViewProvider.refresh();
        }
    });
    
    // Trigger an immediate refresh
    combinedLiveViewProvider.refresh();
    
    vscode.window.registerTreeDataProvider('herculesPermanentStorage', permanentStorageProvider);
    
    // Create enhanced execution results treeview
    const enhancedExecutionResultsTreeView = vscode.window.createTreeView('testzeusExecutionResults', {
        treeDataProvider: enhancedExecutionResultsProvider,
        showCollapseAll: true
    });
    
    // Create tree views
    const runConfigTreeView = vscode.window.createTreeView('herculesRunConfig', {
        treeDataProvider: runConfigProvider,
        showCollapseAll: false,
        canSelectMany: false
    });
    
    // Store the tree view reference in the provider
    runConfigProvider.setTreeView(runConfigTreeView);
    
    // Create tree view for CDP Browser
    const cdpBrowserTreeView = vscode.window.createTreeView('herculesCdpBrowser', {
        treeDataProvider: cdpBrowserTreeProvider,
        showCollapseAll: false,
        canSelectMany: false
    });
    
    // Create tree view for Log Data
    const logDataTreeView = vscode.window.createTreeView('herculesLogData', {
        treeDataProvider: logDataProvider,
        showCollapseAll: false,
        canSelectMany: false
    });
    
    // Force refresh when Log Data view becomes visible
    logDataTreeView.onDidChangeVisibility(e => {
        if (e.visible) {
            logDataProvider.refresh();
        }
    });
    
    // Register refresh commands
    context.subscriptions.push(vscode.commands.registerCommand('testzeus-hercules.refreshGherkinScripts', () => gherkinScriptsProvider.refresh()));
    context.subscriptions.push(vscode.commands.registerCommand('testzeus-hercules.refreshTestData', () => testDataProvider.refresh()));
    context.subscriptions.push(vscode.commands.registerCommand('testzeus-hercules.refreshLiveView', () => combinedLiveViewProvider.refresh()));
    context.subscriptions.push(vscode.commands.registerCommand('testzeus-hercules.refreshLiveLogs', () => combinedLiveViewProvider.refresh()));
    context.subscriptions.push(vscode.commands.registerCommand('testzeus-hercules.refreshCombinedLiveView', () => combinedLiveViewProvider.refresh()));
    context.subscriptions.push(vscode.commands.registerCommand('testzeus-hercules.refreshEnhancedExecutionResults', () => enhancedExecutionResultsProvider.refresh()));
    context.subscriptions.push(vscode.commands.registerCommand('testzeus-hercules.refreshEnvironment', () => environmentProvider.refresh()));
    context.subscriptions.push(vscode.commands.registerCommand('testzeus-hercules.refreshConfiguration', () => configurationTreeProvider.refresh()));
    context.subscriptions.push(vscode.commands.registerCommand('testzeus-hercules.refreshPermanentStorage', () => permanentStorageProvider.refresh()));
    context.subscriptions.push(vscode.commands.registerCommand('testzeus-hercules.refreshRunConfig', () => runConfigProvider.refresh()));
    context.subscriptions.push(vscode.commands.registerCommand('testzeus-hercules.refreshCdpBrowser', () => cdpBrowserTreeProvider.refresh()));
    context.subscriptions.push(vscode.commands.registerCommand('testzeus-hercules.refreshLogData', () => logDataProvider.refresh()));
    context.subscriptions.push(vscode.commands.registerCommand('testzeus-hercules.openExecutionTerminal', (executionId) => openExecutionTerminal(executionId)));
    
    // Register commands for Gherkin script management
    context.subscriptions.push(
        vscode.commands.registerCommand('testzeus-hercules.createGherkinScript', async (folder) => {
            await createGherkinScript(folder);
            gherkinScriptsProvider.refresh();
        }),
        vscode.commands.registerCommand('testzeus-hercules.createGherkinFolder', async (folder) => {
            await createGherkinFolder(folder);
            gherkinScriptsProvider.refresh();
        }),
        vscode.commands.registerCommand('testzeus-hercules.findGherkinScript', findGherkinScript)
    );
    
    // Register command to improve Gherkin scripts using Copilot
    context.subscriptions.push(
        vscode.commands.registerCommand('testzeus-hercules.improveGherkinWithCopilot', improveGherkinWithCopilot)
    );
    
    // Register commands for Test Data management
    context.subscriptions.push(
        vscode.commands.registerCommand('testzeus-hercules.createTestData', async (folder) => {
            await createTestData(folder);
            testDataProvider.refresh();
        }),
        vscode.commands.registerCommand('testzeus-hercules.createTestDataFolder', async (folder) => {
            await createTestDataFolder(folder);
            testDataProvider.refresh();
        }),
        vscode.commands.registerCommand('testzeus-hercules.findTestData', findTestData),
        vscode.commands.registerCommand('testzeus-hercules.deleteTestData', async (item) => {
            await deleteTestData(item);
            testDataProvider.refresh();
        }),
        vscode.commands.registerCommand('testzeus-hercules.renameTestData', async (item) => {
            await renameTestData(item);
            testDataProvider.refresh();
        }),
        vscode.commands.registerCommand('testzeus-hercules.duplicateTestData', async (item) => {
            await duplicateTestData(item);
            testDataProvider.refresh();
        }),
        vscode.commands.registerCommand('testzeus-hercules.editTestData', (item) => {
            if (item.resourceUri) {
                vscode.commands.executeCommand('vscode.open', item.resourceUri);
            }
        }),
        vscode.commands.registerCommand('testzeus-hercules.deleteGherkinScript', async (item: GherkinScript) => {
            await deleteGherkinScript(item);
            gherkinScriptsProvider.refresh();
        }),
        vscode.commands.registerCommand('testzeus-hercules.renameGherkinScript', async (item: GherkinScript) => {
            await renameGherkinScript(item);
            gherkinScriptsProvider.refresh();
        }),
        vscode.commands.registerCommand('testzeus-hercules.duplicateGherkinScript', async (item: GherkinScript) => {
            await duplicateGherkinScript(item);
            gherkinScriptsProvider.refresh();
        })
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('testzeus-hercules.editGherkinScript', (gherkinScript) => {
            if (gherkinScript && gherkinScript.resourceUri) {
                vscode.commands.executeCommand('vscode.open', gherkinScript.resourceUri);
            }
        })
    );
    
    // Register run Gherkin script command
    context.subscriptions.push(vscode.commands.registerCommand('testzeus-hercules.runGherkinScript', (gherkinScript) => {
        runGherkinScriptWithCombined(gherkinScript, combinedLiveViewProvider);
    }));
    
    // Register clear logs command
    context.subscriptions.push(vscode.commands.registerCommand('testzeus-hercules.clearLogs', () => {
        clearLogsCombined(combinedLiveViewProvider);
    }));
    
    // Register open logs terminal command
    context.subscriptions.push(vscode.commands.registerCommand('testzeus-hercules.openLogsTerminal', () => {
        openLogsTerminalCombined(combinedLiveViewProvider);
    }));
    
    // Register open execution logs command
    context.subscriptions.push(vscode.commands.registerCommand('testzeus-hercules.openExecutionLogs', 
        (executionId: string, wsUrl?: string) => {
            openExecutionLogs(executionId, wsUrl);
        }
    ));
    
    // TEST LIVE VIEW section has been removed
    
    // Register enhanced execution results commands
    context.subscriptions.push(
        vscode.commands.registerCommand('testzeus-hercules.showExecutionSummary', async (executionId: string) => {
            try {
                const details = await enhancedExecutionResultsProvider.getExecutionDetails(executionId);
                if (details) {
                    const webviewProvider = new ExecutionResultsWebview(context);
                    await webviewProvider.showResults(details);
                } else {
                    vscode.window.showErrorMessage('Failed to load execution details.');
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Error opening execution details: ${error}`);
            }
        }),
        
        vscode.commands.registerCommand('testzeus-hercules.openArtifact', async (artifactPath: string, artifactType?: string) => {
            if (!artifactPath) {
                vscode.window.showErrorMessage('No artifact path provided.');
                return;
            }
            
            try {
                const artifactService = ArtifactService.getInstance();
                await artifactService.openArtifact(artifactPath, artifactType);
            } catch (error) {
                vscode.window.showErrorMessage(`Error opening artifact: ${error}`);
            }
        }),
        
        vscode.commands.registerCommand('testzeus-hercules.showTestDetails', async (testId: string, executionId: string) => {
            try {
                const details = await enhancedExecutionResultsProvider.getExecutionDetails(executionId);
                if (details) {
                    const testResult = details.xml_results.find(result => result.test_id === testId);
                    if (testResult) {
                        vscode.window.showInformationMessage(`Test: ${testResult.test_name} | Status: ${testResult.test_passed ? 'Passed' : 'Failed'}`);
                    } else {
                        vscode.window.showErrorMessage(`Test details not found for test ID: ${testId}`);
                    }
                } else {
                    vscode.window.showErrorMessage('Failed to load execution details.');
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Error showing test details: ${error}`);
            }
        })
    );
    
    // Register the enhanced execution results treeview
    context.subscriptions.push(enhancedExecutionResultsTreeView);
    
    // Register stop test command
    context.subscriptions.push(vscode.commands.registerCommand('testzeus-hercules.stopTest', () => {
        stopTestWithCombined(combinedLiveViewProvider);
    }));
    
    // Register rerun test command
    context.subscriptions.push(vscode.commands.registerCommand('testzeus-hercules.rerunTest', () => {
        rerunTestWithCombined(combinedLiveViewProvider);
    }));
    
    context.subscriptions.push(
        vscode.commands.registerCommand('testzeus-hercules.openScreenshot', (screenshotPath) => {
            openScreenshot(screenshotPath);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('testzeus-hercules.openTestReport', (reportPath: string) => {
            openTestReport(reportPath);
        })
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('testzeus-hercules.openVideoRecording', (videoPath) => {
            openVideoRecording(videoPath);
        })
    );
    
    // Register command to show welcome screen
    context.subscriptions.push(
        vscode.commands.registerCommand('testzeus-hercules.showWelcome', () => {
            const welcomeViewProvider = new WelcomeViewProvider(context);
            welcomeViewProvider.show();
        })
    );
    
    // Register commands for initialization and configuration
    context.subscriptions.push(
        vscode.commands.registerCommand('testzeus-hercules.initializeHerculesDirectories', initializeHerculesDirectories),
        vscode.commands.registerCommand('testzeus-hercules.openConfigFile', openConfigFile),
        vscode.commands.registerCommand('testzeus-hercules.resetConfigFile', resetConfigFile),
        vscode.commands.registerCommand('testzeus-hercules.createConfigFile', createConfigFile),
        vscode.commands.registerCommand('testzeus-hercules.editConfigFile', editConfigFile),
        vscode.commands.registerCommand('testzeus-hercules.initializeServerConFolder', initializeServerConFolder)
    );
    
    // Register environment file commands
    context.subscriptions.push(
        vscode.commands.registerCommand('testzeus-hercules.openEnvFile', openEnvFile)
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('testzeus-hercules.createEnvFile', createEnvFile)
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('testzeus-hercules.editEnvFile', editEnvFile)
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('testzeus-hercules.resetEnvFile', resetEnvFile)
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('testzeus-hercules.openEnvLocation', openEnvLocation)
    );
    
    // Initialize environment-related providers
    const environmentProvider = new EnvironmentProvider();
    vscode.window.registerTreeDataProvider('herculesEnvironmentTree', environmentProvider);
    
    // Initialize configuration tree provider
    const configurationTreeProvider = new ConfigurationTreeProvider();
    vscode.window.registerTreeDataProvider('herculesConfigurationTree', configurationTreeProvider);
    
    // Register environment commands
    context.subscriptions.push(
        vscode.commands.registerCommand('testzeus-hercules.setLocalEnvironment', setLocalEnvironment),
        vscode.commands.registerCommand('testzeus-hercules.setDockerEnvironment', setDockerEnvironment),
        vscode.commands.registerCommand('testzeus-hercules.setVirtualEnvEnvironment', setVirtualEnvEnvironment),
        vscode.commands.registerCommand('testzeus-hercules.configureEnvironment', configureEnvironment),
    
        // Register environment tools commands
        vscode.commands.registerCommand('testzeus-hercules.checkHerculesInstall', checkHerculesInstall),
        vscode.commands.registerCommand('testzeus-hercules.installHercules', installHercules),
        vscode.commands.registerCommand('testzeus-hercules.installPlaywright', installPlaywright),
        vscode.commands.registerCommand('testzeus-hercules.setupEnvironment', setupEnvironment),
        vscode.commands.registerCommand('testzeus-hercules.pullDockerImage', pullDockerImage),
        vscode.commands.registerCommand('testzeus-hercules.setupProject', setupProject),
        vscode.commands.registerCommand('testzeus-hercules.runServer', runServer),
        vscode.commands.registerCommand('testzeus-hercules.setup_data_test', copyTestDataWithSamples)

    );
    
    // Register settings commands
    context.subscriptions.push(
        vscode.commands.registerCommand('testzeus-hercules.openConfigQuickPick', openConfigQuickPick),
        vscode.commands.registerCommand('testzeus-hercules.openAllSettings', openAllSettings),
        vscode.commands.registerCommand('testzeus-hercules.openLlmSettings', openLlmSettings),
        vscode.commands.registerCommand('testzeus-hercules.openProjectSettings', openProjectSettings),
        vscode.commands.registerCommand('testzeus-hercules.openBrowserSettings', openBrowserSettings),
        vscode.commands.registerCommand('testzeus-hercules.openAdvancedSettings', openAdvancedSettings),
        vscode.commands.registerCommand('testzeus-hercules.updateServerUrls', updateServerUrls)
    );
    
    // Register the hello world command
    let disposable = vscode.commands.registerCommand('testzeus-hercules.helloWorld', () => {
        vscode.window.showInformationMessage('Hello from TestZeus Hercules!');
    });
    
    context.subscriptions.push(disposable);

    // Initialize script config provider
    initScriptConfigProvider(context);
    
    // Register script config commands
    context.subscriptions.push(
        vscode.commands.registerCommand('testzeus-hercules.openScriptConfig', openScriptConfig),
        vscode.commands.registerCommand('testzeus-hercules.createScriptConfig', createScriptConfig),
        vscode.commands.registerCommand('testzeus-hercules.editScriptConfigRaw', editScriptConfigRaw)
    );
    
    // Initialize Gherkin Linter
    try {
        initializeGherkinLinter(context);
        console.log('Gherkin linter initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Gherkin linter:', error);
        vscode.window.showErrorMessage(`Failed to initialize Gherkin linter: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Register Gherkin linting commands
    context.subscriptions.push(
        vscode.commands.registerCommand('testzeus-hercules.lintGherkinFile', lintCurrentDocument),
        vscode.commands.registerCommand('testzeus-hercules.lintAllGherkinFiles', lintAllFeatureFilesCommand)
    );
    
    // Register Run Config commands
    context.subscriptions.push(
        // Legacy commands for backward compatibility
        vscode.commands.registerCommand('testzeus-hercules.toggleGherkinSelection', (label, path) => {
            runConfigProvider.toggleGherkinSelection(label, path);
        }),
        vscode.commands.registerCommand('testzeus-hercules.selectTestDataForGherkin', (testDataLabel, testDataPath) => {
            runConfigProvider.selectTestDataForGherkin(testDataLabel, testDataPath);
        }),
        vscode.commands.registerCommand('testzeus-hercules.clearRunConfigSelection', () => {
            runConfigProvider.clearRunConfig();
        }),
        vscode.commands.registerCommand('testzeus-hercules.runSelectedTests', async () => {
            runConfigProvider.runTests();
        }),
        
        // New sequential workflow commands
        vscode.commands.registerCommand('testzeus-hercules.startNewTest', () => {
            runConfigProvider.startNewTest();
        }),
        vscode.commands.registerCommand('testzeus-hercules.selectTestConfig', (index) => {
            runConfigProvider.selectTestConfig(index);
        }),
        vscode.commands.registerCommand('testzeus-hercules.selectFeatureForTest', () => {
            runConfigProvider.selectFeatureForTest();
        }),
        vscode.commands.registerCommand('testzeus-hercules.openFeatureSelection', () => {
            // Update the provider state to feature selection mode
            runConfigProvider.selectFeatureForTest();
            
            // Focus the hercules explorer view programmatically
            vscode.commands.executeCommand('workbench.view.extension.hercules-explorer');
        }),
        vscode.commands.registerCommand('testzeus-hercules.selectFeatureFile', (label, path) => {
            runConfigProvider.selectFeatureFile(label, path);
        }),
        vscode.commands.registerCommand('testzeus-hercules.addTestDataToTest', () => {
            runConfigProvider.addTestDataToTest();
        }),
        vscode.commands.registerCommand('testzeus-hercules.selectTestDataFile', (label, path) => {
            runConfigProvider.selectTestDataFile(label, path);
        }),
        vscode.commands.registerCommand('testzeus-hercules.removeTestDataFromTest', (index) => {
            runConfigProvider.removeTestDataFromTest(index);
        }),
        vscode.commands.registerCommand('testzeus-hercules.viewRunPayload', () => {
            runConfigProvider.viewRunPayload();
        }),
        vscode.commands.registerCommand('testzeus-hercules.runTests', () => {
            runConfigProvider.runTests();
        }),
        vscode.commands.registerCommand('testzeus-hercules.clearRunConfig', () => {
            runConfigProvider.clearRunConfig();
        }),
        vscode.commands.registerCommand('testzeus-hercules.cancelFeatureSelection', () => {
            runConfigProvider.cancelFeatureSelection();
        }),
        vscode.commands.registerCommand('testzeus-hercules.cancelTestDataSelection', () => {
            runConfigProvider.cancelTestDataSelection();
        }),
        vscode.commands.registerCommand('testzeus-hercules.browseAllFeatureFiles', () => {
            runConfigProvider.browseAllFeatureFiles();
        })
    );
    
    // Register backend server commands
    context.subscriptions.push(vscode.commands.registerCommand('testzeus-hercules.startBackendServer', startBackendServer));
    
    // Register CDP browser commands
    context.subscriptions.push(
        vscode.commands.registerCommand('testzeus-hercules.spawnCdpBrowser', async () => {
            const cdpManager = CdpBrowserManager.getInstance();
            await cdpManager.spawnBrowser();
        }),
        vscode.commands.registerCommand('testzeus-hercules.closeCdpBrowser', async () => {
            const cdpManager = CdpBrowserManager.getInstance();
            await cdpManager.closeBrowser();
        }),
        vscode.commands.registerCommand('testzeus-hercules.manageCdpBrowser', async () => {
            const cdpManager = CdpBrowserManager.getInstance();
            await cdpManager.manageBrowser();
        }),
        vscode.commands.registerCommand('testzeus-hercules.openCdpBrowser', (cdpUrl?: string) => {
            // If cdpUrl is not provided, it will prompt the user for input
            CdpBrowserProvider.openBrowser(cdpUrl);
        })
    );
    
    // Return extension API
    return {
        combinedLiveViewProvider
    };
}

/**
 * Deactivates the extension
 */
export function deactivate() {
    // Clean up resources if needed
    if (serverStatusBarItem) {
        serverStatusBarItem.dispose();
    }
    // Clean up server health check interval
    disposeServerHealthCheck();
} 