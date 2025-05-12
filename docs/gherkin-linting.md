# Gherkin Linting Feature

The TestZeus Hercules VS Code extension includes a built-in Gherkin linting feature powered by [gherkin-lint](https://github.com/vsiakka/gherkin-lint), which helps you write cleaner and more consistent Gherkin feature files.

## Features

- Real-time linting of Gherkin feature files as you type
- Automatic linting of Gherkin feature files on open and save
- On-demand manual linting of individual files or all files
- Inline highlighting of linting issues directly in the editor
- Enhanced visual feedback with colored highlights for different issue types
- Quick-fix actions for common linting problems
- Support for a comprehensive set of Gherkin linting rules

## Linting Rules

The following linting rules are enabled by default:

| Rule | Description |
|------|-------------|
| `indentation` | Ensures consistent indentation for features, scenarios, steps, etc. |
| `no-dupe-scenario-names` | Ensures scenario names are unique |
| `no-dupe-feature-names` | Ensures feature names are unique |
| `no-empty-file` | Checks for empty feature files |
| `no-files-without-scenarios` | Checks for feature files without scenarios |
| `no-trailing-spaces` | Checks for trailing whitespace |
| `no-unnamed-features` | Ensures all features have names |
| `no-unnamed-scenarios` | Ensures all scenarios have names |
| `new-line-at-eof` | Ensures a newline at end of file |
| `no-scenario-outlines-without-examples` | Ensures scenario outlines have examples |
| `no-duplicate-tags` | Ensures tags are not duplicated |
| `no-restricted-patterns` | Ensures steps follow proper format starting with Given, When, Then, And, or But |

## Using the Linting Feature

### Automatic Linting

Gherkin feature files are automatically linted when:
- You open a feature file
- You save changes to a feature file
- You make changes to the file (real-time linting)

### Manual Linting

You can also perform manual linting:

1. **Lint Current File**: With a Gherkin file open, right-click in the editor and select "TestZeus Hercules: Lint Current Gherkin Script" or click the ✓ (check) icon in the editor title bar.

2. **Lint All Files**: Right-click in the Explorer view and select "TestZeus Hercules: Lint All Gherkin Scripts" to lint all feature files in your project.

## Understanding Linting Issues

Linting issues are displayed in several ways:

1. **Problems Panel**: All issues appear in the VS Code Problems panel with details about the rule, line number, and suggested fixes.

2. **In-Editor Highlights**: Issues are highlighted directly in the editor with different colors based on severity:
   - Red: Error-level issues that should be fixed
   - Yellow: Warning-level issues that represent best practices

3. **Hover Information**: Hover over any highlighted issue to see a detailed explanation of the problem and how to fix it.

## Example Linting Issues

Here are some common issues the linter will detect:

### 1. Invalid Step Format

Steps must start with Given, When, Then, And, or But:

```gherkin
Feature: My Feature
Scenario: Test scenario
    I visit the homepage  # Error: Invalid step format
```

Corrected version:
```gherkin
Feature: My Feature
Scenario: Test scenario
    Given I visit the homepage
```

### 2. Indentation Issues

Each element must be properly indented:

```gherkin
Feature: My Feature
Scenario: Test scenario
Given I am on the homepage  # Error: Incorrect indentation
```

Corrected version:
```gherkin
Feature: My Feature
  Scenario: Test scenario
    Given I am on the homepage
```

### 3. Keywords in Logical Order

Given, When, Then steps should appear in logical order:

```gherkin
Feature: My Feature
Scenario: Test scenario
    Then I should see the result  # Error: Then before Given/When
    Given I am on the homepage
```

Corrected version:
```gherkin
Feature: My Feature
Scenario: Test scenario
    Given I am on the homepage
    Then I should see the result
```

## Quick Fixes

The linter provides quick fixes for certain issues. When available, you'll see a light bulb icon next to the code. Click this icon to see available fixes:

1. **Indentation fixes**: Automatically adjust indentation to the correct level
2. **Trailing spaces**: Remove trailing spaces with one click
3. **Empty lines**: Fix multiple empty lines with one click

## Resolving Linting Issues

When linting issues are detected:

1. They appear as colored highlights in your code
2. Hover over the highlighted text to see the specific rule violation
3. Use the quick fix options when available
4. Fix the issue manually according to the rule guidelines
5. Save the file to verify the issue is resolved

## Best Practices for Gherkin Files

The linter encourages these Gherkin best practices:

1. **Concise step definitions**: Keep steps clear and focused
2. **Logical flow**: Use Given (preconditions), When (actions), Then (outcomes) in the correct order
3. **Consistent indentation**: Feature at column 0, Scenario at column 2, Steps at column 4
4. **Descriptive names**: Feature and Scenario names should clearly describe their purpose
5. **Use And instead of repeating Given/When/Then**: For multiple steps of the same type
6. **Proper tagging**: Use tags effectively without duplication

## Customizing Linting Rules

The linting rules are currently preset with common best practices for Gherkin files. Future versions will support custom rule configuration through a configuration file. 

## Troubleshooting

If you encounter any issues with the Gherkin linter:

1. **Reload the window**: Use the Command Palette (Ctrl+Shift+P) and select "Developer: Reload Window"
2. **Check for syntax errors**: Make sure your Gherkin file has valid syntax
3. **Check the output panel**: Open the Output panel (View > Output) and select "TestZeus Hercules" from the dropdown for detailed logs
4. **Report issues**: If problems persist, report them through the extension's issue tracker

## Further Resources

- [Gherkin Syntax Reference](https://cucumber.io/docs/gherkin/reference/)
- [BDD Best Practices](https://cucumber.io/docs/bdd/better-gherkin/)
- [gherkin-lint Documentation](https://github.com/vsiakka/gherkin-lint) 