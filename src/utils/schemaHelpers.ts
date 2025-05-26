/**
 * Schema helper utilities for creating batch-enabled tool schemas
 */

/**
 * Create a schema that accepts either a single item or an array of items
 * 
 * @param singleSchema - The schema for a single item
 * @param arrayPropertyName - The property name for the array version (e.g., 'devices', 'groups')
 * @returns A schema that accepts both single and array inputs
 */
export function createBatchSchema(
  singleSchema: any,
  arrayPropertyName: string
): any {
  // Extract the properties from the single schema
  const { ...rest } = singleSchema;
  
  return {
    ...rest,
    oneOf: [
      // Single item schema
      singleSchema,
      // Array schema
      {
        type: 'object',
        properties: {
          [arrayPropertyName]: {
            type: 'array',
            items: singleSchema,
            description: `Array of ${arrayPropertyName} to process in batch`,
            minItems: 1
          },
          batchOptions: {
            type: 'object',
            properties: {
              maxConcurrent: {
                type: 'number',
                description: 'Maximum concurrent requests (default: 5)',
                minimum: 1,
                maximum: 50
              },
              continueOnError: {
                type: 'boolean',
                description: 'Continue processing if some items fail (default: true)'
              }
            }
          }
        },
        required: [arrayPropertyName]
      }
    ]
  };
}

/**
 * Check if the input is a batch request
 */
export function isBatchInput(input: any, arrayPropertyName: string): boolean {
  return input && typeof input === 'object' && Array.isArray(input[arrayPropertyName]);
}

/**
 * Normalize input to array format for processing
 */
export function normalizeToArray<T>(
  input: T | { [key: string]: T[] },
  arrayPropertyName: string
): T[] {
  if (isBatchInput(input, arrayPropertyName)) {
    return (input as any)[arrayPropertyName];
  }
  return [input as T];
}

/**
 * Extract batch options from input
 */
export function extractBatchOptions(input: any): {
  maxConcurrent?: number;
  continueOnError?: boolean;
} {
  if (input && typeof input === 'object' && input.batchOptions) {
    return input.batchOptions;
  }
  return {};
}