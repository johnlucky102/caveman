/**
 * Centralized test data constants
 * Re-exports constants from mockFactories and supabaseMocks for convenience
 */

// Re-export finance config and class test data
export { TEST_FINANCE_CONFIGS, TEST_CLASSES } from './mockFactories';

// Re-export mock error responses
export { MOCK_ERRORS } from './supabaseMocks';

/**
 * Usage:
 * 
 * import { TEST_FINANCE_CONFIGS, TEST_CLASSES, MOCK_ERRORS } from '@/test/utils/testData';
 * 
 * // Use in tests:
 * const daycareConfig = TEST_FINANCE_CONFIGS.daycare;
 * const eveningClass = TEST_CLASSES.evening1;
 * const notFoundError = MOCK_ERRORS.notFound;
 */
