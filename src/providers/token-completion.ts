import * as vscode from 'vscode';
import { Catalog } from '../catalog';
import { detectTokenContext } from './attribute-detector';

export class TokenCompletionProvider implements vscode.CompletionItemProvider {
  constructor(private readonly catalog: Catalog) {}

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | null {
    const ctx = detectTokenContext(document, position);
    if (ctx === null) return null;

    const { prefix, wrapInVar } = ctx;
    const entries = this.catalog.filterTokens(prefix);

    return entries.map((entry, idx) => {
      // Use Color kind for color tokens to get swatch preview
      const kind =
        entry.category === 'color'
          ? vscode.CompletionItemKind.Color
          : vscode.CompletionItemKind.Variable;

      const item = new vscode.CompletionItem(entry.name, kind);

      item.detail = `${entry.category} - ${entry.group}`;

      const docs = new vscode.MarkdownString();
      docs.appendCodeblock(entry.name + ': ' + entry.value + ';', 'css');
      if (entry.description) {
        docs.appendText('\n' + entry.description);
      }
      item.documentation = docs;

      // Group by category then group for ordering
      item.sortText = `${entry.group.padEnd(30)}${String(idx).padStart(4, '0')}`;

      // When the context is outside a var() expression (e.g. inside a JSX
      // inline-style string or a bare CSS value), insert the token wrapped
      // in var(...). Inside var(...) we only insert the token name.
      item.insertText = wrapInVar ? `var(${entry.name})` : entry.name;

      // Always set an explicit range so VS Code never falls back to its
      // language-default "word at cursor" logic. With an empty prefix the
      // range is zero-length at the cursor (pure insertion); with a
      // non-empty prefix it covers exactly the characters the user has
      // typed so far.
      const startChar = position.character - prefix.length;
      item.range = new vscode.Range(
        position.line,
        startChar,
        position.line,
        position.character
      );

      return item;
    });
  }
}
