/**
 * Environment configuration for the extension
 */
import * as vscode from 'vscode';

// Helper function to get configuration
function getConfiguration<T>(key: string, defaultValue: T): T {
    const config = vscode.workspace.getConfiguration('testzeus-hercules');
    return config.get<T>(key, defaultValue);
}

// HTTP API URLs
export function getApiBaseUrl(): string {
    return getConfiguration<string>('apiBaseUrl', 'http://127.0.0.1:8000');
}

export function getRunTemplateEndpoint(): string {
    return `${getApiBaseUrl()}/tests/run-from-template`;
}

// WebSocket URLs
export function getWsBaseUrl(): string {
    return getConfiguration<string>('wsBaseUrl', 'ws://127.0.0.1:8000');
}

export function getWsLogsUrl(executionId: string): string {
    return `${getWsBaseUrl()}/ws/logs/${executionId}`;
}

// CDP URL for external browser connection
export function getCdpEndpointUrl(): string {
    return getConfiguration<string>('cdpEndpointUrl', '');
}

// For backward compatibility with existing code
export const TESTZEUS_API_BASE_URL = getApiBaseUrl();
export const TESTZEUS_RUN_TEMPLATE_ENDPOINT = getRunTemplateEndpoint();
export const TESTZEUS_WS_BASE_URL = getWsBaseUrl();
export const TESTZEUS_WS_LOGS_URL = getWsLogsUrl;
export const TESTZEUS_CDP_ENDPOINT_URL = getCdpEndpointUrl;
