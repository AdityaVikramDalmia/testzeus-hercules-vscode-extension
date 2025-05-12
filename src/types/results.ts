/**
 * Test result-related types and interfaces
 */

/** Step status type */
export type StepStatus = 'running' | 'passed' | 'failed';

/** Live view update data interface */
export interface LiveViewData {
    /** Whether a test is currently executing */
    isExecuting?: boolean;
    
    /** Current step being executed */
    currentStep?: string;
    
    /** Status of the current step */
    stepStatus?: StepStatus;
    
    /** Path to the latest browser screenshot */
    browserScreenshot?: string | undefined;

    /** Name of the test being executed */
    testName?: string;
    
    /** Browser being used for testing */
    browser?: string;
    
    /** Path to the test report */
    testReportPath?: string | undefined;
    
    /** Path to video recording of the test */
    videoRecordingPath?: string | undefined;
}

/** Test result interface */
export interface TestResult {
    /** Path to the script file */
    scriptPath: string;
    
    /** Name of the script file */
    scriptName: string;
    
    /** Whether the test passed */
    passed: boolean;
    
    /** Duration of the test in seconds */
    duration: number;
    
    /** Timestamp when the test was executed */
    timestamp: Date;
    
    /** Summary of the test results */
    summary: string;
    
    /** Optional path to the HTML report */
    report?: string;
} 