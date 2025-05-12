/**
 * Log-related types and interfaces
 */

/** Log entry type */
export type LogType = 'info' | 'error' | 'debug' | 'test' | 'warn';

/** Log entry interface */
export interface LogEntry {
    /** Type of log entry */
    type: LogType;
    
    /** Log message */
    message: string;
    
    /** Timestamp of the log entry */
    timestamp: Date;
} 