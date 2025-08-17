/**
 * HTML sanitization utilities to prevent XSS attacks
 * Safe alternatives to innerHTML
 */

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Create DOM element safely with text content
 */
export function createSafeElement(tagName: string, textContent: string, className?: string): HTMLElement {
  const element = document.createElement(tagName);
  element.textContent = textContent;
  if (className) {
    element.className = className;
  }
  return element;
}

/**
 * Safe alternative to innerHTML for setting text content
 */
export function setTextContent(element: HTMLElement, content: string): void {
  // Clear existing content
  element.textContent = '';
  
  // Add new text content safely
  element.textContent = content;
}

/**
 * Safe alternative to innerHTML for setting simple HTML with specific allowed patterns
 */
export function setSafeHtml(element: HTMLElement, content: string, allowedPattern?: RegExp): void {
  // Clear existing content
  element.textContent = '';
  
  // Only allow very specific safe patterns
  const safePatterns = [
    /^<div class="error-message">[^<>]+<\/div>$/,
    /^<div class="success-message">[^<>]+<\/div>$/,
    /^<div class="info-message">[^<>]+<\/div>$/,
  ];
  
  const isPattern = allowedPattern || safePatterns.some(pattern => pattern.test(content));
  
  if (isPattern) {
    // Extract text content from simple div pattern
    const textMatch = content.match(/^<div class="[^"]*">([^<>]+)<\/div>$/);
    if (textMatch) {
      const className = content.match(/class="([^"]*)"/)?.[1] || '';
      const textContent = textMatch[1];
      
      const div = createSafeElement('div', textContent, className);
      element.appendChild(div);
      return;
    }
  }
  
  // Fallback: treat as plain text
  element.textContent = content.replace(/<[^>]*>/g, '');
}

/**
 * Create error message element safely
 */
export function createErrorMessage(message: string): HTMLElement {
  return createSafeElement('div', message, 'error-message');
}

/**
 * Create success message element safely
 */
export function createSuccessMessage(message: string): HTMLElement {
  return createSafeElement('div', message, 'success-message');
}

/**
 * Safe way to clear and set content
 */
export function replaceContent(container: HTMLElement, newElement: HTMLElement): void {
  container.textContent = '';
  container.appendChild(newElement);
}