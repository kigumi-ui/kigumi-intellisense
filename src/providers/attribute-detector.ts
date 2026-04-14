import * as vscode from 'vscode';

/**
 * Detect whether the cursor is inside a class/className attribute value.
 *
 * Returns the current partial class name being typed, or null if not in context.
 */
export function detectClassContext(
  document: vscode.TextDocument,
  position: vscode.Position,
  classAttributes: string[]
): string | null {
  const lineText = document.lineAt(position).text;
  const charPos = position.character;
  const textBeforeCursor = lineText.slice(0, charPos);

  // Build pattern for attribute names
  const attrPattern = classAttributes.map(escapeRegex).join('|');

  // Strategy 1: Same-line match: className="value..."
  const sameLineRe = new RegExp(`(?:${attrPattern})\\s*=\\s*["']([^"']*)$`);
  const sameLineMatch = sameLineRe.exec(textBeforeCursor);
  if (sameLineMatch) {
    const valueBeforeCursor = sameLineMatch[1];
    const lastSpace = valueBeforeCursor.lastIndexOf(' ');
    return valueBeforeCursor.slice(lastSpace + 1);
  }

  // Strategy 2: Same-line JSX expression: className={`value...`} or className={'value...'}
  const jsxExprRe = new RegExp(`(?:${attrPattern})\\s*=\\s*\\{[\`'"]([^}\`'"]*?)$`);
  const jsxMatch = jsxExprRe.exec(textBeforeCursor);
  if (jsxMatch) {
    const valueBeforeCursor = jsxMatch[1];
    const lastSpace = valueBeforeCursor.lastIndexOf(' ');
    return valueBeforeCursor.slice(lastSpace + 1);
  }

  // Strategy 3: Multi-line - scan backward to find opening class attribute
  // Handles cases where className=" is on a previous line
  const maxScanLines = 5;
  const startLine = Math.max(0, position.line - maxScanLines);
  let combined = '';
  for (let i = startLine; i <= position.line; i++) {
    const line = i === position.line ? textBeforeCursor : document.lineAt(i).text;
    combined += (i === position.line ? line : line + ' ');
  }

  const multiLineRe = new RegExp(`(?:${attrPattern})\\s*=\\s*["']([^"']*)$`);
  const multiLineMatch = multiLineRe.exec(combined);
  if (multiLineMatch) {
    const valueBeforeCursor = multiLineMatch[1];
    const lastSpace = valueBeforeCursor.lastIndexOf(' ');
    return valueBeforeCursor.slice(lastSpace + 1);
  }

  return null;
}

/**
 * Detect the class name under the cursor for hover.
 *
 * Returns the full class name at the cursor position, or null if not in context.
 */
export function detectClassAtCursor(
  document: vscode.TextDocument,
  position: vscode.Position,
  classAttributes: string[]
): { name: string; range: vscode.Range } | null {
  const lineText = document.lineAt(position).text;
  const charPos = position.character;

  // Check if we're inside a class attribute
  const attrPattern = classAttributes.map(escapeRegex).join('|');
  const attrRe = new RegExp(`(?:${attrPattern})\\s*=\\s*["']`, 'g');

  let attrMatch: RegExpExecArray | null;
  while ((attrMatch = attrRe.exec(lineText)) !== null) {
    const valueStart = attrMatch.index + attrMatch[0].length;

    // Find the closing quote
    const quoteChar = attrMatch[0].slice(-1);
    const closeIdx = lineText.indexOf(quoteChar, valueStart);
    const valueEnd = closeIdx === -1 ? lineText.length : closeIdx;

    if (charPos < valueStart || charPos > valueEnd) continue;

    // We're inside this attribute value - find the word at cursor
    const valueText = lineText.slice(valueStart, valueEnd);
    const cursorInValue = charPos - valueStart;

    // Find word boundaries (space-delimited)
    let wordStart = valueText.lastIndexOf(' ', cursorInValue - 1) + 1;
    let wordEnd = valueText.indexOf(' ', cursorInValue);
    if (wordEnd === -1) wordEnd = valueText.length;

    const word = valueText.slice(wordStart, wordEnd);
    if (!word || !word.startsWith('wa-')) return null;

    const range = new vscode.Range(
      position.line,
      valueStart + wordStart,
      position.line,
      valueStart + wordEnd
    );

    return { name: word, range };
  }

  return null;
}

/**
 * Result of a token-context detection.
 *
 * - `prefix`: the partial string the user has typed so far (may be empty
 *   immediately after `var(` or at the start of an inline-style string).
 * - `wrapInVar`: whether the completion should wrap the token name in
 *   `var(...)`. True when the cursor is in a CSS-value context that does
 *   not yet have a `var(` around it (e.g. JSX inline-style object string,
 *   bare `--wa-*` after a `:` declaration).
 */
export interface TokenContext {
  prefix: string;
  wrapInVar: boolean;
}

/**
 * Detect whether the cursor is in a CSS-token context and how the
 * completion should be inserted.
 *
 * Returns `null` when no token context is detected.
 *
 * Supported contexts:
 * 1. Inside `var(...)`                           → no wrap
 * 2. JSX/TSX inline-style object string
 *    `style={{ prop: 'x|' }}`                    → wrap in var()
 * 3. Vue `:style` bound object string
 *    `:style="{ prop: 'x|' }"`                   → wrap in var()
 * 4. Bare `--wa-*` after a `:` declaration
 *    (CSS/SCSS/Less properties, HTML `style="..."`) → wrap in var()
 */
export function detectTokenContext(
  document: vscode.TextDocument,
  position: vscode.Position
): TokenContext | null {
  const lineText = document.lineAt(position).text;
  const charPos = position.character;
  const textBeforeCursor = lineText.slice(0, charPos);

  // 1. Inside var(...) — captures any prefix of --wa-* (including empty).
  //    The `(?:^|[\s,(:'"`])` prefix ensures we only match `var(` at a
  //    valid starting position: start of line, or preceded by whitespace
  //    / `,` / `(` / `:` / a string delimiter (so JSX / Vue / tagged
  //    templates like `'var(...'` still work). This prevents false
  //    positives like `--var(` where the user typed an extra `--` by
  //    mistake (without this guard, the completion would insert INSIDE
  //    the `()` and leave the stray `--` untouched, producing
  //    `--var(--wa-color-brand)`).
  //    `[^()]*` stops at nested parens so `var(var(--wa-` still picks the
  //    innermost var().
  const varMatch = /(?:^|[\s,(:'"`])var\(\s*([^()]*)$/.exec(textBeforeCursor);
  if (varMatch && isTokenPrefix(varMatch[1])) {
    return { prefix: varMatch[1], wrapInVar: false };
  }

  // 2. JSX/TSX inline-style object string: style={{ prop: 'x|' }}
  //    Matches any string literal (single/double quote or backtick) inside
  //    a `style={{ ... }}` expression.
  const jsxObjectStyleMatch = /style\s*=\s*\{\{[^}]*['"`]([^'"`]*)$/.exec(textBeforeCursor);
  if (jsxObjectStyleMatch && isTokenPrefix(jsxObjectStyleMatch[1])) {
    return { prefix: jsxObjectStyleMatch[1], wrapInVar: true };
  }

  // 3. Vue :style bound object string: :style="{ prop: 'x|' }"
  const vueObjectStyleMatch = /:style\s*=\s*["']\s*\{[^}]*['"`]([^'"`]*)$/.exec(textBeforeCursor);
  if (vueObjectStyleMatch && isTokenPrefix(vueObjectStyleMatch[1])) {
    return { prefix: vueObjectStyleMatch[1], wrapInVar: true };
  }

  // 4. Bare --wa-* after a `:` declaration. Requires at least one `-` so we
  //    don't fire after every CSS property colon (e.g. `color: red`).
  const bareMatch = /:\s*([^;:{}\s"'`)]*)$/.exec(textBeforeCursor);
  if (bareMatch) {
    const inner = bareMatch[1];
    if (inner.length > 0 && inner.startsWith('-') && isTokenPrefix(inner)) {
      return { prefix: inner, wrapInVar: true };
    }
  }

  return null;
}

/**
 * Whether `s` is a valid prefix for completion — either empty, a proper
 * prefix of the literal string `--wa-`, or already starts with `--wa-`.
 */
function isTokenPrefix(s: string): boolean {
  return s === '' || '--wa-'.startsWith(s) || s.startsWith('--wa-');
}

/**
 * Detect a --wa-* token name under the cursor for hover.
 */
export function detectTokenAtCursor(
  document: vscode.TextDocument,
  position: vscode.Position
): { name: string; range: vscode.Range } | null {
  const lineText = document.lineAt(position).text;
  const charPos = position.character;

  // Find --wa-* token at cursor position
  const re = /--wa-[a-z0-9-]+/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(lineText)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (charPos >= start && charPos <= end) {
      return {
        name: match[0],
        range: new vscode.Range(position.line, start, position.line, end),
      };
    }
  }

  return null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
