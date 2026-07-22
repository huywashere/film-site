/**
 * CineVerse XSS Security & Data Sanitization Module
 * Protects application against Cross-Site Scripting (XSS), HTML Injection & Malicious URLs.
 */

// Escape special HTML characters to prevent XSS string injections
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Strip out dangerous HTML tags, inline scripts, event handlers, and malicious protocols
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  return html
    // Remove <script> tags and their contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove <iframe>, <object>, <embed>, <applet> tags
    .replace(/<\/?(iframe|object|embed|applet)\b[^>]*>/gi, '')
    // Remove event handlers like onerror=, onload=, onclick=
    .replace(/\s*on\w+\s*=\s*(["'])[\s\S]*?\1/gi, '')
    .replace(/\s*on\w+\s*=\s*[^>\s]+/gi, '')
    // Remove javascript:, data:, vbscript: URIs
    .replace(/(href|src|action)\s*=\s*(["'])(javascript|data|vbscript):[\s\S]*?\2/gi, '$1="#"')
    .replace(/(href|src|action)\s*=\s*(javascript|data|vbscript):[^\s>]+/gi, '$1="#"');
}

// Sanitize user text inputs (for search inputs, comments, profiles)
export function sanitizeInput(input: string): string {
  if (!input) return '';
  // Trim spaces and escape HTML special characters
  return escapeHtml(input.trim());
}

// Validate and sanitize external URLs to prevent javascript: or malicious protocol exploits
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:')
  ) {
    return '#';
  }
  return trimmed;
}
