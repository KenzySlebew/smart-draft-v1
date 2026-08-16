/**
 * ============================================================================
 * STAGE 4: GLOBAL LAYOUT ENGINE (Prioritas 4 — Low)
 * ============================================================================
 *
 * Applies document-wide layout rules to all body paragraphs:
 *
 *   1. Justify alignment    — <w:jc w:val="both"/> on body paragraphs
 *   2. First-line indent    — <w:ind w:firstLine="567"/> (1 cm)
 *   3. (Fonts/spacing/margins are handled by the existing formatFixer.js)
 *
 * Exceptions:
 *   - Heading paragraphs (Heading1, Heading2, Heading3) keep center alignment
 *   - Table cell paragraphs are not modified
 *   - Paragraphs already having explicit indentation (e.g., citation) are not overridden
 *
 * Dependencies: constants.js (W_NS, INDENT, HEADING_STYLES)
 */

import { W_NS, INDENT, HEADING_STYLES } from '../constants'

/** Set of heading style IDs that should NOT receive justify + first-line indent */
const HEADING_STYLE_IDS = new Set(
  Object.values(HEADING_STYLES).map(h => h.styleId.toLowerCase())
)

/**
 * Apply global layout rules to the document.
 *
 * @param {Document} doc - The parsed document.xml DOM
 * @returns {{ applied: Array<{ type: string, detail: string }> }}
 */
export function applyGlobalLayout(doc) {
  const applied = []
  const body = doc.getElementsByTagNameNS(W_NS, 'body')[0]
  if (!body) return { applied }

  const paragraphs = Array.from(doc.getElementsByTagNameNS(W_NS, 'p'))

  let justifyCount = 0
  let indentCount = 0

  for (const p of paragraphs) {
    // Skip table paragraphs
    if (isInsideTable(p)) continue

    // Determine current style
    const pPr = p.getElementsByTagNameNS(W_NS, 'pPr')[0]
    const currentStyle = getStyleId(pPr)

    // Skip headings — they should keep their own alignment (typically center)
    if (currentStyle && HEADING_STYLE_IDS.has(currentStyle.toLowerCase())) continue

    // Skip empty paragraphs
    const text = getParagraphText(p).trim()
    if (!text) continue

    // Ensure <w:pPr> exists
    let targetPPr = pPr
    if (!targetPPr) {
      targetPPr = doc.createElementNS(W_NS, 'w:pPr')
      p.insertBefore(targetPPr, p.firstChild)
    }

    // --- Rule 1: Justify alignment ---
    const currentJc = getJcValue(targetPPr)
    if (currentJc !== 'both') {
      let jc = targetPPr.getElementsByTagNameNS(W_NS, 'jc')[0]
      if (!jc) {
        jc = doc.createElementNS(W_NS, 'w:jc')
        targetPPr.appendChild(jc)
      }
      jc.setAttribute('w:val', 'both')
      justifyCount++
    }

    // --- Rule 2: First-line indent (only if no existing special indent) ---
    const ind = targetPPr.getElementsByTagNameNS(W_NS, 'ind')[0]
    const hasSpecialIndent = ind && (
      ind.getAttribute('w:left') ||
      ind.getAttributeNS(W_NS, 'left') ||
      ind.getAttribute('w:hanging') ||
      ind.getAttributeNS(W_NS, 'hanging')
    )

    if (!hasSpecialIndent) {
      let indEl = ind
      if (!indEl) {
        indEl = doc.createElementNS(W_NS, 'w:ind')
        targetPPr.appendChild(indEl)
      }

      const currentFirstLine =
        indEl.getAttribute('w:firstLine') ||
        indEl.getAttributeNS(W_NS, 'firstLine') ||
        '0'

      if (currentFirstLine !== String(INDENT.firstLine)) {
        indEl.setAttribute('w:firstLine', String(INDENT.firstLine))
        indentCount++
      }
    }
  }

  if (justifyCount > 0) {
    applied.push({
      type: 'justify',
      detail: `Applied justify alignment to ${justifyCount} paragraph(s)`,
    })
  }

  if (indentCount > 0) {
    applied.push({
      type: 'first_line_indent',
      detail: `Applied 1 cm first-line indent to ${indentCount} paragraph(s)`,
    })
  }

  return { applied }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get the style ID of a paragraph from its <w:pPr> → <w:pStyle>.
 */
function getStyleId(pPr) {
  if (!pPr) return null
  const pStyle = pPr.getElementsByTagNameNS(W_NS, 'pStyle')[0]
  if (!pStyle) return null
  return pStyle.getAttribute('w:val') || pStyle.getAttributeNS(W_NS, 'val') || null
}

/**
 * Get the current justification value from <w:pPr> → <w:jc>.
 */
function getJcValue(pPr) {
  if (!pPr) return null
  const jc = pPr.getElementsByTagNameNS(W_NS, 'jc')[0]
  if (!jc) return null
  return jc.getAttribute('w:val') || jc.getAttributeNS(W_NS, 'val') || null
}

/**
 * Get full paragraph text content.
 */
function getParagraphText(p) {
  const runs = p.getElementsByTagNameNS(W_NS, 'r')
  let text = ''
  for (let i = 0; i < runs.length; i++) {
    const ts = runs[i].getElementsByTagNameNS(W_NS, 't')
    for (let j = 0; j < ts.length; j++) {
      text += ts[j].textContent || ''
    }
  }
  return text
}

/**
 * Check if a paragraph is inside a table.
 */
function isInsideTable(p) {
  let node = p.parentNode
  while (node) {
    if (node.localName === 'tc' || node.localName === 'tbl') return true
    if (node.localName === 'body') return false
    node = node.parentNode
  }
  return false
}
