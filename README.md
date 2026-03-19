# Kigumi IntelliSense

Your companion for [Kigumi](https://kigumi.style) projects. Autocomplete and hover previews for `wa-*` utility classes and `--wa-*` design tokens in your projects.

## Features

### Class Name Completions

Type `wa-` inside any `class` or `className` attribute to get completions with CSS previews.

```html
<div class="wa-stack wa-gap-l">
  <h2 class="wa-heading-xl">Team</h2>
  <div class="wa-cluster wa-gap-xs">
    <wa-tag>Design</wa-tag>
    <wa-tag>Engineering</wa-tag>
  </div>
</div>
```

```tsx
<div className="wa-stack wa-gap-m">
  <h1 className="wa-heading-2xl">Settings</h1>
  <p className="wa-body-s wa-color-text-quiet">Manage your preferences.</p>
</div>
```

### CSS Token Completions

Type `--wa-` inside `var()` to get token completions with resolved values.

```css
.callout {
  padding: var(--wa-space-m) var(--wa-space-l);
  color: var(--wa-color-text-normal);
  background: var(--wa-color-fill-quiet);
  border: 1px solid var(--wa-color-border-quiet);
}
```

### Hover Previews

Hover over any `wa-*` class to see its CSS declarations, or any `--wa-*` token to see its resolved value and category.

## Supported Languages

| Type   | Languages                                          |
| ------ | -------------------------------------------------- |
| Markup | HTML, React (TSX/JSX), TypeScript, JavaScript, Vue |
| Styles | CSS, SCSS, Less                                    |

## Configuration

| Setting                  | Default                  | Description                                |
| ------------------------ | ------------------------ | ------------------------------------------ |
| `kigumi.enable`          | `true`                   | Enable or disable the extension            |
| `kigumi.classAttributes` | `["class", "className"]` | Attribute names to provide completions for |

## Requirements

Works with any project using Kigumi components or [Web Awesome](https://webawesome.com).

### Install via the [Kigumi CLI](https://kigumi.style):

```bash
npx kigumi init
```

## License

[MIT](LICENSE.md)
