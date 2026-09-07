/**
 * ============================================================================
 * STAGE 5: FONT COLOR NORMALIZER ("All-Black Engine")
 * ============================================================================
 *
 * Ensures every text run in the document uses black font color (#000000)
 * and removes visual artifacts from copy-paste / revisions:
 *
 *   1. Set <w:color w:val="000000"/> on all <w:rPr> elements
 *   2. Remove <w:highlight> (yellow/green/red highlight markers)
 *   3. Remove <w:shd> on run level (background shading from web copy-paste)
 *   4. Remove theme color attributes (w:themeColor, w:themeTint, w:themeShade)
 *
 * Safety:
 *   - Preserves <w:color> on runs inside <w:hyperlink> if intentional
 *     (but still normalizes to black since thesis standard = all black)
 *
 * Dependencies: constants.js (W_NS, STANDARDS)
 */

import { W_NS, STANDARDS } from '../constants'

/**
 * Run the font color normalizer on the entire document XML DOM.
 *
 * @param {Document} doc - The parsed document.xml DOM
 * @returns {{
 *   colorFixed: number,
 *   highlightRemoved: number,
 *   shadingRemoved: number,
 *   applied: Array<{ type: string, detail: string }>
 * }}
 */
export function runColorNormalizer(doc) {
  let colorFixed = 0
  let highlightRemoved = 0
  let shadingRemoved = 0
  const applied = []

  const body = doc.getElementsByTagNameNS(W_NS, 'body')[0]
  if (!body) return { colorFixed, highlightRemoved, shadingRemoved, applied }

  const targetColor = STANDARDS.font.color || '000000'

  // Process ALL rPr elements in the document (both in body and in styles)
  const allRPr = doc.getElementsByTagNameNS(W_NS, 'rPr')

  for (let i = 0; i < allRPr.length; i++) {
    const rPr = allRPr[i]

    // --- Rule 1: Normalize font color to black ---
    const color = rPr.getElementsByTagNameNS(W_NS, 'color')[0]
    if (color) {
      const currentVal =
        color.getAttribute('w:val') ||
        color.getAttributeNS(W_NS, 'val') ||
        ''

      if (currentVal.toLowerCase() !== targetColor && currentVal !== 'auto') {
        color.setAttribute('w:val', targetColor)

        // Remove theme color attributes that might override
        removeAttrSafe(color, 'w:themeColor')
        removeAttrSafe(color, 'w:themeTint')
        removeAttrSafe(color, 'w:themeShade')
        removeAttrNS(color, W_NS, 'themeColor')
        removeAttrNS(color, W_NS, 'themeTint')
        removeAttrNS(color, W_NS, 'themeShade')

        colorFixed++
      }
    }

    // --- Rule 2: Remove highlight markers ---
    const highlight = rPr.getElementsByTagNameNS(W_NS, 'highlight')[0]
    if (highlight) {
      rPr.removeChild(highlight)
      highlightRemoved++
    }

    // --- Rule 3: Remove run-level shading (background from copy-paste) ---
    const shd = rPr.getElementsByTagNameNS(W_NS, 'shd')[0]
    if (shd) {
      // Only remove if parent is rPr (not pPr — paragraph shading may be intentional)
      if (shd.parentNode === rPr) {
        rPr.removeChild(shd)
        shadingRemoved++
      }
    }
  }

  // Build transformation log
  if (colorFixed > 0) {
    applied.push({
      type: 'font_color',
      detail: `Normalized ${colorFixed} text run(s) to black (#${targetColor})`,
    })
  }

  if (highlightRemoved > 0) {
    applied.push({
      type: 'highlight_removed',
      detail: `Removed ${highlightRemoved} highlight marker(s) (yellow/green/red)`,
    })
  }

  if (shadingRemoved > 0) {
    applied.push({
      type: 'shading_removed',
      detail: `Removed ${shadingRemoved} background shading artifact(s)`,
    })
  }

  return { colorFixed, highlightRemoved, shadingRemoved, applied }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Safely remove an attribute by name (with w: prefix).
 */
function removeAttrSafe(el, attrName) {
  if (el.hasAttribute(attrName)) {
    el.removeAttribute(attrName)
  }
}

/**
 * Safely remove a namespaced attribute.
 */
function removeAttrNS(el, ns, localName) {
  if (el.hasAttributeNS(ns, localName)) {
    el.removeAttributeNS(ns, localName)
  }
}
