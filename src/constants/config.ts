/**
 * Configuration constants for the Hercules extension
 */

/** Extension's configuration namespace */
export const CONFIG_NAMESPACE = 'testzeus-hercules';

/** Default LLM model to use */
export const DEFAULT_LLM_MODEL = 'gpt-4o';

/** Default browser to use */
export const DEFAULT_BROWSER = 'chromium';

/** Default headless mode */
export const DEFAULT_HEADLESS = true;

/** Required agents for LLM config */
export const REQUIRED_LLM_AGENTS = ['planner_agent', 'nav_agent', 'mem_agent', 'helper_agent'];

/** Required fields for each LLM agent configuration */
export const REQUIRED_LLM_AGENT_FIELDS = ['model_name', 'llm_config_params'];

/** Callback URL for real-time updates */
export const DEFAULT_CALLBACK_URL = 'http://localhost:55555/hercules-callback';

/** Maximum number of logs to keep in memory */
export const MAX_LOGS = 100; 