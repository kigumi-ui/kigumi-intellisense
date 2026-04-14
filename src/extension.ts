import * as vscode from 'vscode';
import { Catalog } from './catalog';
import { ClassCompletionProvider } from './providers/class-completion';
import { ClassHoverProvider } from './providers/class-hover';
import { TokenCompletionProvider } from './providers/token-completion';
import { TokenHoverProvider } from './providers/token-hover';

const MARKUP_LANGUAGES = [
  'html',
  'typescriptreact',   // React / Next.js / Gatsby / Remix (.tsx)
  'javascriptreact',   // React / Next.js / Gatsby / Remix (.jsx)
  'typescript',        // Angular templates, Lit, CSS-in-JS (styled-components, emotion, Linaria)
  'javascript',        // plain JS with template literals / CSS-in-JS
  'vue',               // Vue SFC
  'svelte',            // Svelte SFC
  'astro',             // Astro SFC
  'mdx',               // MDX with JSX
];

const STYLE_LANGUAGES = [
  'css',      // also matches *.module.css (CSS Modules share the css language ID)
  'scss',     // also matches *.module.scss
  'sass',     // indented-syntax SCSS
  'less',     // also matches *.module.less
  'postcss',
  'stylus',
];

const ALL_LANGUAGES = [...MARKUP_LANGUAGES, ...STYLE_LANGUAGES];

export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel('Kigumi IntelliSense');
  const config = vscode.workspace.getConfiguration('kigumi');

  if (!config.get<boolean>('enable', true)) {
    output.appendLine('Extension disabled via kigumi.enable setting');
    return;
  }

  const catalog = Catalog.load(context.extensionPath);
  output.appendLine(`Data path: ${context.extensionPath}/out/data/`);
  output.appendLine(`Loaded: ${catalog.utilities.length} utilities, ${catalog.tokens.length} tokens`);

  if (catalog.utilities.length === 0 && catalog.tokens.length === 0) {
    vscode.window
      .showErrorMessage(
        'Kigumi IntelliSense: No data catalogs found.',
        'Run pnpm generate'
      )
      .then((action) => {
        if (action) {
          output.show();
        }
      });
    output.appendLine('ERROR: No catalogs found. Run `pnpm generate` then `pnpm compile` to build them.');
  }

  const classAttributes = config.get<string[]>('classAttributes', ['class', 'className']);

  // Register class + token providers for EVERY supported language.
  // Context detectors (detectClassContext / detectTokenContext) gate each
  // provider to its valid surface: classes only fire inside class="" /
  // className={} / framework directive attributes; tokens only fire inside
  // var(--wa-...) or bare --wa-... declarations. The two surfaces are
  // mutually exclusive, so registering both for all languages is safe.
  const classCompletion = new ClassCompletionProvider(catalog, classAttributes);
  const classHover = new ClassHoverProvider(catalog, classAttributes);
  const tokenCompletion = new TokenCompletionProvider(catalog);
  const tokenHover = new TokenHoverProvider(catalog);

  for (const lang of ALL_LANGUAGES) {
    const selector: vscode.DocumentSelector = { language: lang, scheme: 'file' };

    context.subscriptions.push(
      vscode.languages.registerCompletionItemProvider(
        selector,
        classCompletion,
        '-', '"', "'", ' ' // hyphen, quotes (attr open), space (next class)
      ),
      vscode.languages.registerHoverProvider(selector, classHover),
      vscode.languages.registerCompletionItemProvider(
        selector,
        tokenCompletion,
        '-' // trigger on hyphen for --wa- prefix
      ),
      vscode.languages.registerHoverProvider(selector, tokenHover)
    );
  }

  output.appendLine('Providers registered successfully');
}

export function deactivate() {
  // Nothing to clean up
}
