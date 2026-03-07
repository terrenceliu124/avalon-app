/**
 * InfoPanel vertical scroll CSS layout test.
 *
 * These tests parse styles.css directly and assert that the CSS properties
 * needed for the flex-based scroll chain to work are all present.
 *
 * The layout chain that enables vertical scrolling is:
 *   .info-overlay-card  (flex column, max-height: 80dvh)
 *     .info-panel-header  (flex-shrink: 0)
 *     .info-panel-body    (flex: 1, min-height: 0, display: flex, flex-direction: column)
 *       .tab-scroll-container  (flex: 1, min-height: 0  — NOT height: 100%)
 *         .tab-pane            (overflow-y: auto  — NOT height: 100%)
 *
 * Using flex: 1 / min-height: 0 instead of height: 100% at each level avoids
 * the unreliable percentage-height-in-flex-item resolution (broken on Safari).
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const css = fs.readFileSync(path.resolve(__dirname, '../styles.css'), 'utf-8');

/** Return all declaration text for every occurrence of a CSS selector. */
function getDeclarations(selector) {
  const escaped = selector.replace(/\./g, '\\.').replace(/[[\]]/g, '\\$&');
  const re = new RegExp(escaped + '\\s*\\{([^}]+)\\}', 'g');
  let out = '';
  let m;
  while ((m = re.exec(css)) !== null) out += ' ' + m[1];
  return out;
}

/** True if `prop: value` (ignoring extra whitespace) appears in declarations. */
function has(decls, prop, value) {
  return new RegExp(prop + '\\s*:\\s*' + value, 'i').test(decls);
}

// ─── .info-overlay-card ───────────────────────────────────────────────────────

describe('.info-overlay-card', () => {
  const d = getDeclarations('.info-overlay-card');

  it('is a flex column', () => {
    expect(has(d, 'display', 'flex')).toBe(true);
    expect(has(d, 'flex-direction', 'column')).toBe(true);
  });

  it('has max-height to bound the panel', () => {
    expect(d).toMatch(/max-height/);
  });
});

// ─── .info-panel-header ───────────────────────────────────────────────────────

describe('.info-panel-header', () => {
  const d = getDeclarations('.info-panel-header');

  it('does not grow/shrink (flex-shrink: 0)', () => {
    expect(has(d, 'flex-shrink', '0')).toBe(true);
  });
});

// ─── .info-panel-body ─────────────────────────────────────────────────────────

describe('.info-panel-body', () => {
  const d = getDeclarations('.info-panel-body');

  it('is a flex column so children can use flex sizing', () => {
    expect(has(d, 'display', 'flex')).toBe(true);
    expect(has(d, 'flex-direction', 'column')).toBe(true);
  });

  it('has flex: 1 to fill remaining height in parent', () => {
    // flex: 1 is shorthand; also accept explicit flex-grow: 1
    expect(has(d, 'flex', '1') || has(d, 'flex-grow', '1')).toBe(true);
  });

  it('has min-height: 0 to allow flex shrinking', () => {
    expect(has(d, 'min-height', '0')).toBe(true);
  });
});

// ─── .tab-scroll-container ────────────────────────────────────────────────────

describe('.tab-scroll-container', () => {
  const d = getDeclarations('.tab-scroll-container');

  it('uses flex: 1 (not height: 100%) to fill parent height reliably', () => {
    // flex: 1 is the correct cross-browser approach
    expect(has(d, 'flex', '1') || has(d, 'flex-grow', '1')).toBe(true);
  });

  it('does NOT use height: 100% (unreliable in flex items on Safari)', () => {
    expect(d).not.toMatch(/\bheight\s*:\s*100%/);
  });

  it('has min-height: 0 to allow flex shrinking', () => {
    expect(has(d, 'min-height', '0')).toBe(true);
  });

  it('scrolls horizontally for tab switching', () => {
    expect(has(d, 'overflow-x', 'scroll')).toBe(true);
  });
});

// ─── .tab-pane ────────────────────────────────────────────────────────────────

describe('.tab-pane', () => {
  const d = getDeclarations('.tab-pane');

  it('has overflow-y: auto to enable vertical scrolling', () => {
    expect(has(d, 'overflow-y', 'auto')).toBe(true);
  });

  it('does NOT use height: 100% (let flex stretch handle it instead)', () => {
    expect(d).not.toMatch(/\bheight\s*:\s*100%/);
  });
});
