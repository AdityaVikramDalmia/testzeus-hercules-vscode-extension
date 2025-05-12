/**
 * Path constants for the Hercules extension
 */

/** Main directory for storing extension artifacts */
export const HERCULES_DIR = '.testzeus-hercules';

/** Subdirectories for different artifact types */
export const SUBDIRECTORIES = ['logs', 'results', 'screenshots', 'input', 'output', 'test_data', 'cache'];

/** Git ignore content for the Hercules directory */
export const GITIGNORE_CONTENT = `# Automatically generated file by TestZeus Hercules
cache/*
`;

/** Default sample Gherkin feature file content */
export const SAMPLE_FEATURE_CONTENT = `Feature: Sample Test

Scenario: Example scenario
  Given I open a browser
  When I navigate to "https://example.com"
  Then I should see "Example Domain" in the page
`; 