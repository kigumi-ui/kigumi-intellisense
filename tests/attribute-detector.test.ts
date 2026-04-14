import { describe, it, expect } from 'vitest';
import { Position } from 'vscode';
import {
  detectClassContext,
  detectClassAtCursor,
  detectTokenContext,
  detectTokenAtCursor,
} from '../src/providers/attribute-detector';
import { createMockDocument } from './helpers/mock-document';

const defaultAttrs = ['class', 'className'];

// ---------------------------------------------------------------------------
// detectClassContext
// ---------------------------------------------------------------------------
describe('detectClassContext', () => {
  describe('positive cases', () => {
    it('returns partial prefix mid-value', () => {
      const doc = createMockDocument(['<div class="wa-fl">']);
      //                               cursor at char 17 => after "wa-fl"
      expect(detectClassContext(doc, new Position(0, 17), defaultAttrs)).toBe('wa-fl');
    });

    it('returns prefix after space (second class)', () => {
      const doc = createMockDocument(['<div class="wa-flex wa-g">']);
      expect(detectClassContext(doc, new Position(0, 24), defaultAttrs)).toBe('wa-g');
    });

    it('returns empty string when cursor is right after opening quote', () => {
      const doc = createMockDocument(['<div className="">']);
      expect(detectClassContext(doc, new Position(0, 16), defaultAttrs)).toBe('');
    });

    it('detects JSX expression with single quotes', () => {
      const doc = createMockDocument(["<div className={'wa-fl'}>"]);
      expect(detectClassContext(doc, new Position(0, 22), defaultAttrs)).toBe('wa-fl');
    });

    it('detects JSX expression with template literal', () => {
      const doc = createMockDocument(['<div className={`wa-fl`}>']);
      expect(detectClassContext(doc, new Position(0, 22), defaultAttrs)).toBe('wa-fl');
    });

    it('detects multi-line class attribute and extracts current prefix', () => {
      // Multi-line fallback joins earlier lines with ' ' and matches the full
      // class value across lines. The partial prefix after the last space on
      // the cursor line is returned for filtering.
      const doc = createMockDocument([
        '<div className="',
        '  wa-fl',
      ]);
      expect(detectClassContext(doc, new Position(1, 7), defaultAttrs)).toBe('wa-fl');
    });

    it('supports custom classAttributes', () => {
      const doc = createMockDocument(['<div classList="wa-">']);
      expect(detectClassContext(doc, new Position(0, 19), ['classList'])).toBe('wa-');
    });

    it('detects Vue :class directive', () => {
      const doc = createMockDocument(['<div :class="wa-fl">']);
      expect(
        detectClassContext(doc, new Position(0, 18), [':class'])
      ).toBe('wa-fl');
    });

    it('detects Vue v-bind:class directive', () => {
      const doc = createMockDocument(['<div v-bind:class="wa-fl">']);
      expect(
        detectClassContext(doc, new Position(0, 24), ['v-bind:class'])
      ).toBe('wa-fl');
    });

    it('detects Angular [class] property binding', () => {
      const doc = createMockDocument(['<div [class]="wa-fl">']);
      expect(
        detectClassContext(doc, new Position(0, 19), ['[class]'])
      ).toBe('wa-fl');
    });

    it('detects Angular [ngClass] directive', () => {
      const doc = createMockDocument(['<div [ngClass]="wa-fl">']);
      expect(
        detectClassContext(doc, new Position(0, 21), ['[ngClass]'])
      ).toBe('wa-fl');
    });

    it('detects Astro class:list directive', () => {
      const doc = createMockDocument(['<div class:list="wa-fl">']);
      expect(
        detectClassContext(doc, new Position(0, 22), ['class:list'])
      ).toBe('wa-fl');
    });
  });

  describe('false positives (must return null)', () => {
    it('rejects non-class attribute', () => {
      const doc = createMockDocument(['<div id="wa-flex">']);
      expect(detectClassContext(doc, new Position(0, 16), defaultAttrs)).toBeNull();
    });

    it('rejects wrong attribute when multiple present', () => {
      const doc = createMockDocument(['<div class="done" onclick="wa-fl">']);
      expect(detectClassContext(doc, new Position(0, 31), defaultAttrs)).toBeNull();
    });

    it('rejects cursor outside quotes', () => {
      const doc = createMockDocument(['<div class="done"  wa-fl>']);
      expect(detectClassContext(doc, new Position(0, 23), defaultAttrs)).toBeNull();
    });

    it('rejects multi-line beyond 5-line lookback', () => {
      const doc = createMockDocument([
        '<div className="',
        'line1',
        'line2',
        'line3',
        'line4',
        'line5',
        'line6',
        '  wa-fl',
      ]);
      expect(detectClassContext(doc, new Position(7, 7), defaultAttrs)).toBeNull();
    });

    it('rejects plain text with no attribute', () => {
      const doc = createMockDocument(['wa-flex is cool']);
      expect(detectClassContext(doc, new Position(0, 7), defaultAttrs)).toBeNull();
    });

    it('rejects empty line', () => {
      const doc = createMockDocument(['']);
      expect(detectClassContext(doc, new Position(0, 0), defaultAttrs)).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// detectClassAtCursor
// ---------------------------------------------------------------------------
describe('detectClassAtCursor', () => {
  describe('positive cases', () => {
    it('detects wa- class under cursor', () => {
      const doc = createMockDocument(['<div class="wa-flex">']);
      const result = detectClassAtCursor(doc, new Position(0, 15), defaultAttrs);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('wa-flex');
    });

    it('detects second class in multi-class value', () => {
      const doc = createMockDocument(['<div class="wa-flex wa-gap-m">']);
      const result = detectClassAtCursor(doc, new Position(0, 24), defaultAttrs);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('wa-gap-m');
    });

    it('returns correct range', () => {
      const doc = createMockDocument(['<div class="wa-flex">']);
      const result = detectClassAtCursor(doc, new Position(0, 15), defaultAttrs);
      expect(result!.range.start.character).toBe(12);
      expect(result!.range.end.character).toBe(19);
    });
  });

  describe('false positives (must return null)', () => {
    it('rejects non-wa- class name', () => {
      const doc = createMockDocument(['<div class="my-custom-class">']);
      expect(detectClassAtCursor(doc, new Position(0, 18), defaultAttrs)).toBeNull();
    });

    it('rejects wa- in wrong attribute', () => {
      const doc = createMockDocument(['<div id="wa-flex">']);
      expect(detectClassAtCursor(doc, new Position(0, 13), defaultAttrs)).toBeNull();
    });

    it('rejects empty class value', () => {
      const doc = createMockDocument(['<div class="">']);
      expect(detectClassAtCursor(doc, new Position(0, 12), defaultAttrs)).toBeNull();
    });

    it('rejects cursor on non-wa word in mixed classes', () => {
      const doc = createMockDocument(['<div class="foo wa-flex">']);
      const result = detectClassAtCursor(doc, new Position(0, 14), defaultAttrs);
      expect(result).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// detectTokenContext
// ---------------------------------------------------------------------------
describe('detectTokenContext', () => {
  describe('positive cases inside var(...)', () => {
    it('detects var(--wa-...) partial', () => {
      const doc = createMockDocument(['color: var(--wa-color-bl);']);
      expect(detectTokenContext(doc, new Position(0, 24))).toEqual({
        prefix: '--wa-color-bl',
        wrapInVar: false,
      });
    });

    it('detects empty prefix right after var(', () => {
      // cursor between ( and ) in `var()`
      const doc = createMockDocument(['color: var();']);
      expect(detectTokenContext(doc, new Position(0, 11))).toEqual({
        prefix: '',
        wrapInVar: false,
      });
    });

    it('detects single-dash prefix inside var(-', () => {
      const doc = createMockDocument(['color: var(-);']);
      expect(detectTokenContext(doc, new Position(0, 12))).toEqual({
        prefix: '-',
        wrapInVar: false,
      });
    });

    it('detects --wa prefix without trailing hyphen inside var(', () => {
      const doc = createMockDocument(['color: var(--wa);']);
      expect(detectTokenContext(doc, new Position(0, 15))).toEqual({
        prefix: '--wa',
        wrapInVar: false,
      });
    });

    it('detects var( --wa-) with space after paren', () => {
      const doc = createMockDocument(['color: var( --wa-);']);
      expect(detectTokenContext(doc, new Position(0, 17))).toEqual({
        prefix: '--wa-',
        wrapInVar: false,
      });
    });

    it('detects inside JSX inline style with var() prefix', () => {
      const doc = createMockDocument([
        "<div style={{ color: 'var(--wa-color-br' }} />",
      ]);
      expect(detectTokenContext(doc, new Position(0, 39))).toEqual({
        prefix: '--wa-color-br',
        wrapInVar: false,
      });
    });

    it('detects inside JSX inline style double-quoted with var() prefix', () => {
      const doc = createMockDocument([
        'style={{ color: "var(--wa-space-" }}',
      ]);
      expect(detectTokenContext(doc, new Position(0, 32))).toEqual({
        prefix: '--wa-space-',
        wrapInVar: false,
      });
    });

    it('detects inside CSS-in-JS tagged template literal', () => {
      const doc = createMockDocument([
        'styled.div`color: var(--wa-color-brand-`',
      ]);
      expect(detectTokenContext(doc, new Position(0, 39))).toEqual({
        prefix: '--wa-color-brand-',
        wrapInVar: false,
      });
    });
  });

  describe('positive cases that need var() wrapping', () => {
    it('detects empty string inside JSX inline style object', () => {
      // style={{ border: '|' }} — cursor inside empty quotes
      const doc = createMockDocument(["<div style={{ border: '' }} />"]);
      expect(detectTokenContext(doc, new Position(0, 23))).toEqual({
        prefix: '',
        wrapInVar: true,
      });
    });

    it('detects --wa prefix inside JSX inline style without var()', () => {
      const doc = createMockDocument(["<div style={{ border: '--wa' }} />"]);
      expect(detectTokenContext(doc, new Position(0, 27))).toEqual({
        prefix: '--wa',
        wrapInVar: true,
      });
    });

    it('detects inside Vue :style bound object string', () => {
      // <div :style="{ color: 'x|' }">
      const doc = createMockDocument([
        "<div :style=\"{ color: '--wa-' }\">",
      ]);
      expect(detectTokenContext(doc, new Position(0, 28))).toEqual({
        prefix: '--wa-',
        wrapInVar: true,
      });
    });

    it('detects bare --wa- after colon in CSS', () => {
      const doc = createMockDocument([': --wa-spacing-;']);
      expect(detectTokenContext(doc, new Position(0, 15))).toEqual({
        prefix: '--wa-spacing-',
        wrapInVar: true,
      });
    });

    it('detects bare --wa- in HTML style attribute', () => {
      const doc = createMockDocument(['<div style="color: --wa-">']);
      expect(detectTokenContext(doc, new Position(0, 24))).toEqual({
        prefix: '--wa-',
        wrapInVar: true,
      });
    });
  });

  describe('false positives (must return null)', () => {
    it('rejects non-wa custom property', () => {
      const doc = createMockDocument(['color: var(--my-custom);']);
      expect(detectTokenContext(doc, new Position(0, 22))).toBeNull();
    });

    it('rejects plain CSS value', () => {
      const doc = createMockDocument(['display: flex;']);
      expect(detectTokenContext(doc, new Position(0, 13))).toBeNull();
    });

    it('rejects color keyword', () => {
      const doc = createMockDocument(['border: 1px solid blue;']);
      expect(detectTokenContext(doc, new Position(0, 22))).toBeNull();
    });

    it('rejects non-wa content in JSX inline style', () => {
      const doc = createMockDocument(["<div style={{ border: '1px solid red' }} />"]);
      // cursor after "red"
      expect(detectTokenContext(doc, new Position(0, 36))).toBeNull();
    });

    it('rejects empty line', () => {
      const doc = createMockDocument(['']);
      expect(detectTokenContext(doc, new Position(0, 0))).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// detectTokenAtCursor
// ---------------------------------------------------------------------------
describe('detectTokenAtCursor', () => {
  describe('positive cases', () => {
    it('detects token under cursor', () => {
      const doc = createMockDocument(['color: var(--wa-color-blue);']);
      const result = detectTokenAtCursor(doc, new Position(0, 18));
      expect(result).not.toBeNull();
      expect(result!.name).toBe('--wa-color-blue');
    });

    it('returns correct range', () => {
      const doc = createMockDocument(['color: var(--wa-color-blue);']);
      const result = detectTokenAtCursor(doc, new Position(0, 18));
      expect(result!.range.start.character).toBe(11);
      expect(result!.range.end.character).toBe(26);
    });

    it('detects second token on same line', () => {
      const doc = createMockDocument(['border: var(--wa-color-blue) var(--wa-spacing-m);']);
      const result = detectTokenAtCursor(doc, new Position(0, 40));
      expect(result).not.toBeNull();
      expect(result!.name).toBe('--wa-spacing-m');
    });

    it('matches at token start boundary', () => {
      const doc = createMockDocument(['var(--wa-color-blue)']);
      const result = detectTokenAtCursor(doc, new Position(0, 4));
      expect(result).not.toBeNull();
      expect(result!.name).toBe('--wa-color-blue');
    });

    it('matches at token end boundary', () => {
      const doc = createMockDocument(['var(--wa-color-blue)']);
      const result = detectTokenAtCursor(doc, new Position(0, 19));
      expect(result).not.toBeNull();
      expect(result!.name).toBe('--wa-color-blue');
    });
  });

  describe('false positives (must return null)', () => {
    it('rejects non-wa custom property', () => {
      const doc = createMockDocument(['var(--my-custom-var)']);
      expect(detectTokenAtCursor(doc, new Position(0, 10))).toBeNull();
    });

    it('rejects plain CSS value', () => {
      const doc = createMockDocument(['color: blue;']);
      expect(detectTokenAtCursor(doc, new Position(0, 8))).toBeNull();
    });

    it('rejects whitespace between tokens', () => {
      const doc = createMockDocument(['var(--wa-color-blue) var(--wa-spacing-m)']);
      const result = detectTokenAtCursor(doc, new Position(0, 21));
      expect(result).toBeNull();
    });
  });
});
