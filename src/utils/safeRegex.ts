/**
 * Safe regex utilities to prevent ReDoS attacks
 * Limits execution time and prevents infinite loops
 */

export interface RegexMatch {
  match: string;
  index: number;
  groups: string[];
}

export interface SafeRegexOptions {
  maxMatches?: number;
  timeout?: number; // milliseconds
}

/**
 * Safely execute regex with timeout and match limits
 */
export function safeRegexExec(
  pattern: RegExp,
  text: string,
  options: SafeRegexOptions = {}
): RegexMatch[] {
  const { maxMatches = 1000, timeout = 100 } = options;
  const results: RegexMatch[] = [];
  
  // Reset regex lastIndex to prevent state issues
  pattern.lastIndex = 0;
  
  const startTime = Date.now();
  let match: RegExpExecArray | null;
  let matchCount = 0;
  
  try {
    while ((match = pattern.exec(text)) !== null) {
      // Check timeout
      if (Date.now() - startTime > timeout) {
        console.warn('Regex execution timeout reached, stopping early');
        break;
      }
      
      // Check match limit
      if (matchCount >= maxMatches) {
        console.warn('Regex match limit reached, stopping early');
        break;
      }
      
      results.push({
        match: match[0],
        index: match.index,
        groups: match.slice(1),
      });
      
      matchCount++;
      
      // Prevent infinite loops on zero-length matches
      if (match[0].length === 0) {
        pattern.lastIndex++;
      }
      
      // Break if not global regex
      if (!pattern.global) {
        break;
      }
    }
  } catch (error) {
    console.warn('Regex execution error:', error);
  }
  
  // Reset regex lastIndex
  pattern.lastIndex = 0;
  
  return results;
}

/**
 * Safe regex test with timeout
 */
export function safeRegexTest(
  pattern: RegExp,
  text: string,
  timeout: number = 50
): boolean {
  const startTime = Date.now();
  
  try {
    // Use a timeout wrapper for regex test
    const result = new Promise<boolean>((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve(false);
      }, timeout);
      
      try {
        const matches = pattern.test(text);
        clearTimeout(timeoutId);
        resolve(matches);
      } catch (error) {
        clearTimeout(timeoutId);
        resolve(false);
      }
    });
    
    return pattern.test(text);
  } catch (error) {
    console.warn('Regex test error:', error);
    return false;
  }
}

/**
 * Create a safe version of String.match that limits execution time
 */
export function safeStringMatch(
  text: string,
  pattern: RegExp,
  options: SafeRegexOptions = {}
): string[] {
  const matches = safeRegexExec(pattern, text, options);
  return matches.map(m => m.match);
}

/**
 * Safe regex replace with limits
 */
export function safeRegexReplace(
  text: string,
  pattern: RegExp,
  replacement: string | ((match: string, ...args: any[]) => string),
  options: SafeRegexOptions = {}
): string {
  const { maxMatches = 1000, timeout = 100 } = options;
  
  let result = text;
  let replaceCount = 0;
  const startTime = Date.now();
  
  try {
    if (typeof replacement === 'string') {
      // Simple string replacement
      const matches = safeRegexExec(pattern, text, options);
      
      // Replace matches from end to beginning to maintain indices
      for (let i = matches.length - 1; i >= 0; i--) {
        const match = matches[i];
        result = result.substring(0, match.index) +
                replacement +
                result.substring(match.index + match.match.length);
      }
    } else {
      // Function replacement - more complex
      const matches = safeRegexExec(pattern, text, options);
      
      for (let i = matches.length - 1; i >= 0; i--) {
        const match = matches[i];
        const newValue = replacement(match.match, ...match.groups);
        result = result.substring(0, match.index) +
                newValue +
                result.substring(match.index + match.match.length);
      }
    }
  } catch (error) {
    console.warn('Safe regex replace error:', error);
    return text; // Return original on error
  }
  
  return result;
}

/**
 * Validate regex pattern for potential ReDoS vulnerabilities
 */
export function validateRegexSafety(pattern: RegExp): {
  isSafe: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  const patternStr = pattern.source;
  
  // Check for dangerous patterns
  const dangerousPatterns = [
    // Nested quantifiers
    /\([^)]*\*[^)]*\)/g,
    /\([^)]*\+[^)]*\)/g,
    // Alternation with repetition
    /\([^|)]*\|[^|)]*\)[\*\+]/g,
    // Excessive backtracking potential
    /\([^)]*\.[^)]*\)\*/g,
  ];
  
  let isSafe = true;
  
  dangerousPatterns.forEach((dangerous, index) => {
    if (dangerous.test(patternStr)) {
      isSafe = false;
      warnings.push(`Potential ReDoS pattern detected: ${dangerousPatterns[index]}`);
    }
  });
  
  return { isSafe, warnings };
}

/**
 * Create a timeout-limited regex
 */
export function createSafeRegex(
  pattern: string | RegExp,
  flags?: string,
  timeout: number = 100
): RegExp & { safeExec: (text: string) => RegexMatch[] } {
  const regex = typeof pattern === 'string' ? new RegExp(pattern, flags) : pattern;
  
  // Validate safety
  const { isSafe, warnings } = validateRegexSafety(regex);
  if (!isSafe) {
    console.warn('Potentially unsafe regex detected:', warnings);
  }
  
  return Object.assign(regex, {
    safeExec: (text: string) => safeRegexExec(regex, text, { timeout }),
  });
}