# Changelog

## 0.1.7

### Fixed

- Token completion no longer fires on invalid `var(` positions (e.g. a stray `--var(` from a typo), which previously caused results like `--var(--wa-color-brand)` on selection. `var(` now only matches at the start of a line or after whitespace, `,`, `(`, `:`, or a string delimiter.
- Completion items now always set an explicit replacement range, so a zero-length prefix inserts cleanly at the cursor without VS Code's default word-range logic accidentally stripping or preserving nearby characters.

## 0.1.6

### Added

- Token completion now fires inside React/JSX/TSX inline-style objects (`style={{ border: '' }}`) and auto-wraps the selected token in `var(...)`
- Token completion in Vue `:style="{ ... }"` bound object bindings
- Token completion in HTML `style="..."` attributes and CSS-in-JS tagged templates
- Support for Svelte, Astro, and MDX files
- Support for Sass, PostCSS, and Stylus style languages
- Default `kigumi.classAttributes` now covers Vue (`:class`, `v-bind:class`), Angular (`[class]`, `[ngClass]`), and Astro (`class:list`) out of the box

### Fixed

- Token suggestions now appear immediately after `var(` with the cursor between the parentheses (previously required typing `--wa-` first)
- Token suggestions now appear for partial prefixes like `--wa`, `--w`, `--`, or `-` (previously required the full `--wa-` trigger)
- Token and class providers are now registered across all supported markup and style languages; a single context detector decides which one fires based on cursor position

## 0.1.5

- Update data catalogs for Web Awesome 3.5.0
- Add new spacing utility: `wa-gap-5xl`
- Add new typography scale: `wa-font-size-3xs` (10px), `wa-font-size-5xl` (66px)
- Add extended text utilities: body, heading, caption, longform at 3xs/5xl sizes

## 0.1.3

- Fix typo in README

## 0.1.2

- Improved README: updated code snippets and added a more comprehensive usage example

## 0.1.1

- Add extension icon

## 0.1.0

Initial release.

### Features

- CSS class name autocomplete for `wa-*` utility classes in `class` and `className` attributes
- CSS custom property autocomplete for `--wa-*` tokens inside `var()` expressions
- Hover previews showing CSS declarations and resolved token values
- Configurable class attribute names via `kigumi.classAttributes` setting

### Supported Languages

- HTML, React (TSX/JSX), TypeScript, JavaScript, Vue
- CSS, SCSS, Less
