# TestZeus Hercules Extension for VS Code

This extension provides seamless integration with TestZeus Hercules, the world's first open-source AI testing agent. With this extension, you can easily manage your Gherkin scripts and run tests directly from VS Code.

## Features

- **Gherkin Scripts Panel**: Browse, create, and run your Gherkin test scripts
- **Settings Panel**: Easily configure TestZeus Hercules settings
- **One-Click Test Execution**: Run tests with a single click
- **Flexible LLM Configuration**: Configure LLM settings directly or via a JSON configuration file
- **Welcome Screen**: Interactive welcome screen for new projects with auto-initialization
- **Sample Files**: Auto-generates sample configuration files to help you get started
- **Gherkin Linting**: Built-in linting for Gherkin feature files to maintain clean, consistent code

## Requirements

- VS Code 1.99.1 or higher
- TestZeus Hercules installed (`pip install testzeus-hercules`)
- Playwright installed with dependencies (`playwright install --with-deps`)

## Getting Started

1. Install the extension from the VS Code marketplace
2. Open a folder/workspace where you want to use TestZeus Hercules
3. If this is a new project, the welcome screen will appear automatically
   - Click "Initialize TestZeus Hercules" to set up the necessary folders and sample files
   - The welcome screen provides information about configuration options and environment variables
4. If you don't see the welcome screen, you can open it manually via the command palette:
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
   - Type "Hercules: Show Welcome Screen" and press Enter
5. Configure the extension settings:
   - Open the extension sidebar by clicking the TestZeus Hercules icon
   - Click on any setting in the Settings panel to open the configuration
   - Set your API key, project paths, and other options

## Extension Settings

This extension provides the following settings:

* `testzeus-hercules.llmModel`: LLM model to use (e.g., gpt-4o)
* `testzeus-hercules.apiKey`: API key for the LLM model
* `testzeus-hercules.llmConfigFile`: Path to JSON configuration file for LLM settings (e.g., agents_llm_config.json)
* `testzeus-hercules.llmConfigFileRefKey`: The key for the config stanza to use from the LLM config file (e.g., 'openai_gpt', 'mistral', 'anthropic')
* `testzeus-hercules.projectBasePath`: Path to the project base directory
* `testzeus-hercules.gherkinScriptsPath`: Path to Gherkin scripts directory (relative to project base)
* `testzeus-hercules.outputPath`: Path to output directory (relative to project base)
* `testzeus-hercules.testDataPath`: Path to test data directory (relative to project base)
* `testzeus-hercules.browser`: Browser to use for running tests (chromium, firefox, webkit)
* `testzeus-hercules.headless`: Run browser in headless mode (true/false)

## Initialization Process

When you initialize TestZeus Hercules through the welcome screen, the following resources are created:

1. A `.testzeus-hercules` folder with subdirectories for:
   - `input`: Store your Gherkin feature files
   - `output`: View test results (HTML and XML reports)
   - `logs`: Execution logs
   - `results`: Test execution results
   - `screenshots`: Screenshots captured during test runs
   - `test_data`: Test data files
   - `cache`: Cache files

2. Sample configuration files:
   - `.env`: Sample environment variables configuration file
   - `agents_llm_config.json`: Sample LLM configuration file
   - `.testzeus-hercules/input/sample.feature`: Sample Gherkin feature file
   - `.testzeus-hercules/test_data/test_data.json`: Sample test data file

## Environment Variables

TestZeus Hercules supports numerous environment variables that can be configured in the `.env` file:

### Browser Settings
```
BROWSER_TYPE=chromium        # Options: chromium, firefox, webkit
HEADLESS=true                # Run browser in headless mode
RECORD_VIDEO=true            # Record test execution videos
TAKE_SCREENSHOTS=true        # Take screenshots during test
BROWSER_RESOLUTION=1920,1080 # Browser window resolution
```

### LLM Configuration
```
LLM_MODEL_NAME=gpt-4o        # LLM model to use
LLM_MODEL_API_KEY=your-key   # API key for the LLM model
AGENTS_LLM_CONFIG_FILE=./agents_llm_config.json  # Path to config file
AGENTS_LLM_CONFIG_FILE_REF_KEY=openai  # Config key to use
```

### Advanced Settings
```
RUN_DEVICE=iPhone 15 Pro Max # Mobile device emulation
LOAD_EXTRA_TOOLS=true        # Load additional tools
TELEMETRY_ENABLED=0          # Disable telemetry (1 to enable)
AUTO_MODE=1                  # Skip email prompt during runs
```

## LLM Configuration

You can configure LLM settings in two ways:

### 1. Direct Configuration

Set the `llmModel` and `apiKey` settings directly in the extension settings:

```
testzeus-hercules.llmModel: gpt-4o
testzeus-hercules.apiKey: your-api-key
```

### 2. JSON Configuration File

For more advanced configurations, you can use a JSON configuration file:

1. Create a JSON file (e.g., `agents_llm_config.json`) with configurations for different LLM providers
2. Set the path to this file in `testzeus-hercules.llmConfigFile`
3. Specify which configuration to use with `testzeus-hercules.llmConfigFileRefKey`

Example JSON configuration file:

```json
{
  "openai_gpt": {
    "planner_agent": {
      "model_name": "gpt-4o",
      "model_api_key": "your-api-key",
      "model_base_url": null,
      "llm_config_params": {
        "temperature": 0.0,
        "seed": 12345
      }
    },
    "nav_agent": { ... },
    "mem_agent": { ... },
    "helper_agent": { ... }
  },
  "mistral": { ... },
  "anthropic": { ... }
}
```

A sample configuration file is included with the extension at `agents_llm_config.json`.

## Usage

### Creating a New Gherkin Script

1. Open the TestZeus Hercules sidebar
2. In the Gherkin Scripts panel, click the "Create New Gherkin Script" button
3. Enter a name for your script (with or without the .feature extension)
4. A new script template will be created and opened for editing

### Running a Test

1. In the Gherkin Scripts panel, right-click on a script
2. Select "Run Gherkin Script" from the context menu
3. The test will execute in a terminal window, displaying progress and results

### Using Gherkin Linting

The extension provides built-in linting for Gherkin feature files, powered by gherkin-lint:

1. **Automatic Linting**: Feature files are automatically linted when opened or saved
2. **Enhanced Visual Feedback**: Linting issues are highlighted with colored backgrounds in the editor
3. **Quick Fixes**: One-click solutions for common issues like indentation problems, trailing spaces, and more
4. **Manual Linting**: 
   - Right-click on a feature file and select "TestZeus Hercules: Lint Current Gherkin Script"
   - Click the checkmark icon in the editor title bar when a feature file is open
   - Click the checklist icon in the Gherkin Scripts panel to lint all feature files
5. **Hover Information**: Hover over highlighted text to see linting rule violations and available fixes

For more details, see the [Gherkin Linting documentation](docs/gherkin-linting.md).

## Project Structure

For optimal use, your project should follow this structure (configurable in settings):

```
PROJECT_BASE/
├── opt/
    ├── input/
    │   └── test.feature
    ├── output/
    ├── test_data/
├── agents_llm_config.json  # Optional LLM configuration file
```

## Extension Development

To start working on the extension:

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Compile the extension:
   ```bash
   pnpm run compile
   ```

3. Launch the extension in a new VS Code window:
   ```bash
   code --extensionDevelopmentPath=${PWD}
   ```

Alternatively, after installing dependencies:
- Run `pnpm compile` to compile the extension
- Press F5 to run the extension in a new VS Code window

## Credits

This extension integrates with [TestZeus Hercules](https://github.com/test-zeus-ai/testzeus-hercules), the open-source testing agent.

## License

MIT
