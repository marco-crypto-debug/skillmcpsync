/**
 * Safe JSON and JSONC parser/formatter
 */

export function stripJsonComments(jsonString: string): string {
  // Remove single line comments // ... and multi-line comments /* ... */
  // while preserving strings containing // or /*
  let insideString = false;
  let stringQuote = '';
  let isEscaped = false;
  let result = '';

  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString[i];
    const nextChar = jsonString[i + 1];

    if (insideString) {
      result += char;
      if (char === '\\' && !isEscaped) {
        isEscaped = true;
      } else {
        if (char === stringQuote && !isEscaped) {
          insideString = false;
        }
        isEscaped = false;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      insideString = true;
      stringQuote = char;
      result += char;
      continue;
    }

    // Check for comments
    if (char === '/' && nextChar === '/') {
      // Single line comment: skip until newline
      const newlineIndex = jsonString.indexOf('\n', i + 2);
      if (newlineIndex === -1) {
        break;
      }
      i = newlineIndex - 1;
      continue;
    }

    if (char === '/' && nextChar === '*') {
      // Multi-line comment: skip until */
      const closingIndex = jsonString.indexOf('*/', i + 2);
      if (closingIndex === -1) {
        break;
      }
      i = closingIndex + 1;
      continue;
    }

    result += char;
  }

  // Remove trailing commas before closing braces/brackets
  result = result.replace(/,(\s*[\]}])/g, '$1');

  return result;
}

export function parseJsonSafe<T = any>(content: string, defaultValue?: T): T {
  try {
    const sanitized = stripJsonComments(content);
    return JSON.parse(sanitized);
  } catch (err: any) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Failed to parse JSON: ${err.message}`);
  }
}

export function stringifyJson(data: any): string {
  return JSON.stringify(data, null, 2) + '\n';
}
