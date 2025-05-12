/**
 * Configuration storage utility for Hercules extension
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  llm: {
    model: "gpt-4o",
    apiKey: "",
    configFile: "",
    configFileRefKey: ""
  },
  project: {
    basePath: "",
    gherkinScriptsPath: "input",
    outputPath: "output",
    testDataPath: "test_data"
  },
  browser: {
    type: "chromium",
    headless: true,
    recordVideo: true,
    takeScreenshots: true,
    resolution: "",
    runDevice: "",
    captureNetwork: false
  },
  advanced: {
    loadExtraTools: false,
    telemetryEnabled: true,
    autoMode: false,
    enablePlaywrightTracing: false,
    executionEnvironment: {
      environmentType: "local",
      dockerImage: "testzeus/hercules:latest",
      useVirtualEnv: false,
      installIfMissing: true
    }
  }
};

/**
 * Configuration interface
 */
export interface HerculesConfig {
  llm: {
    model: string;
    apiKey: string;
    configFile: string;
    configFileRefKey: string;
  };
  project: {
    basePath: string;
    gherkinScriptsPath: string;
    outputPath: string;
    testDataPath: string;
  };
  browser: {
    type: string;
    headless: boolean;
    recordVideo: boolean;
    takeScreenshots: boolean;
    resolution: string;
    runDevice: string;
    captureNetwork: boolean;
  };
  advanced: {
    loadExtraTools: boolean;
    telemetryEnabled: boolean;
    autoMode: boolean;
    enablePlaywrightTracing: boolean;
    executionEnvironment?: {
      environmentType: string;
      dockerImage?: string;
      useVirtualEnv?: boolean;
      virtualEnvPath?: string;
      installIfMissing?: boolean;
    };
  };
}

/**
 * Configuration storage manager
 */
export class ConfigStorage {
  private static instance: ConfigStorage;
  private config: HerculesConfig;
  private configPath: string;
  private context: vscode.ExtensionContext;

  /**
   * Creates a new ConfigStorage instance
   * @param context Extension context
   */
  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    
    // Ensure storage directory exists
    const storageDir = context.globalStoragePath;
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    
    this.configPath = path.join(storageDir, 'hercules-config.json');
    this.config = this.loadConfig();
  }

  /**
   * Gets the ConfigStorage instance
   * @param context Extension context
   * @returns The ConfigStorage instance
   */
  public static getInstance(context?: vscode.ExtensionContext): ConfigStorage {
    if (!ConfigStorage.instance && context) {
      ConfigStorage.instance = new ConfigStorage(context);
    } else if (!ConfigStorage.instance) {
      throw new Error('ConfigStorage not initialized. Please provide a context.');
    }
    return ConfigStorage.instance;
  }

  /**
   * Gets the path to the configuration file
   * @returns The path to the configuration file
   */
  public getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Loads the configuration from the config file
   * @returns The loaded configuration
   */
  private loadConfig(): HerculesConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        const loadedConfig = JSON.parse(configData);
        return this.mergeWithDefaultConfig(loadedConfig);
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      // Show error to user
      vscode.window.showErrorMessage(`Error loading configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Return default config if loading fails
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }

  /**
   * Merges the loaded config with the default config
   * @param loadedConfig The loaded configuration
   * @returns The merged configuration
   */
  private mergeWithDefaultConfig(loadedConfig: any): HerculesConfig {
    const defaultConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    
    // Helper function to recursively merge objects
    const mergeObjects = (target: any, source: any) => {
      Object.keys(source).forEach(key => {
        if (source[key] !== null && typeof source[key] === 'object') {
          if (!target[key]) {
            target[key] = {};
          }
          mergeObjects(target[key], source[key]);
        } else if (target[key] === undefined) {
          target[key] = source[key];
        }
      });
      return target;
    };
    
    return mergeObjects(loadedConfig, defaultConfig);
  }

  /**
   * Saves the configuration to the config file
   */
  public saveConfig(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      vscode.window.showInformationMessage('Configuration saved successfully.');
    } catch (error) {
      console.error('Error saving configuration:', error);
      vscode.window.showErrorMessage(`Error saving configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Creates a default configuration file
   */
  public createDefaultConfig(): void {
    // Reset config to default
    this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    
    // Save default config
    this.saveConfig();
  }

  /**
   * Gets the configuration
   * @returns The configuration
   */
  public getConfig(): HerculesConfig {
    return this.config;
  }

  /**
   * Updates the configuration
   * @param config The new configuration
   */
  public updateConfig(config: HerculesConfig): void {
    this.config = config;
    this.saveConfig();
  }

  /**
   * Gets a configuration value
   * @param section The configuration section
   * @param key The configuration key
   * @returns The configuration value
   */
  public getValue<T>(section: keyof HerculesConfig, key: string): T | undefined {
    return this.config[section]?.[key as keyof typeof this.config[typeof section]] as unknown as T;
  }

  /**
   * Sets a configuration value
   * @param section The configuration section
   * @param key The configuration key
   * @param value The configuration value
   */
  public setValue<T>(section: keyof HerculesConfig, key: string, value: T): void {
    if (this.config[section]) {
      (this.config[section] as any)[key] = value;
      this.saveConfig();
    }
  }
} 