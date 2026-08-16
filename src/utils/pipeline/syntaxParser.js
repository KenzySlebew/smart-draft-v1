/**
 * ============================================================================
 * STAGE 1: SYNTAX PARSER (Prioritas 1 — Urgent)
 * ============================================================================
 *
 * Scans each <w:p> paragraph's text content for markdown-like syntax.
 * When found, strips the syntax markers from <w:t> elements and applies
 * the corresponding Word formatting via XML attributes/elements.
 *
 * Transformations:
 *   # text   → Heading 1 style
 *   ## text  → Heading 2 style
 *   ### text → Heading 3 style
 *   **text** → Bold (<w:b/>)
 *   *text*   → Italic (<w:i/>)
 *   ***text*** → Bold + Italic
 *   > text   → Indented citation (left indent 1 cm)
 *
 * Dependencies: constants.js (W_NS, HEADING_STYLES, INDENT)
 */

import { W_NS, HEADING_STYLES, INDENT } from '../constants'

// ===== Regex Patterns =====

/** Match heading markers at the start of full paragraph text */
const HEADING_RE = /^(#{1,3})\s+/

/** Match blockquote marker at the start of full paragraph text */
const BLOCKQUOTE_RE = /^>\s*/

/**
 * Match bold+italic (***text***), bold (**text**), or italic (*text*).
 * Order matters: triple stars must be tried before double/single.
 * Non-greedy inner match to handle multiple occurrences.
 */
const BOLD_ITALIC_RE = /\*{3}(.+?)\*{3}/g
const BOLD_RE = /\*{2}(.+?)\*{2}/g
const ITALIC_RE = /(?<!\*)\*([^*]+?)\*(?!\*)/g

/**
 * Run the syntax parser on the entire document XML DOM.
 *
 * @param {Document} doc - The parsed document.xml DOM
 * @returns {{ transformations: Array<{ type: string, detail: string }> }}
 *   A log of all transformations applied.
 */
export function runSyntaxParser(doc) {
  const transformations = []
  const body = doc.getElementsByTagNameNS(W_NS, 'body')[0]
  if (!body) return { transformations }

  // Collect paragraphs into a static array (DOM will be mutated)
  const paragraphs = Array.from(doc.getElementsByTagNameNS(W_NS, 'p'))

  for (const p of paragraphs) {
    // Skip paragraphs inside tables — they have their own formatting
    if (isInsideTable(p)) continue

    const fullText = getParagraphText(p)
    if (!fullText.trim()) continue

    // --- Heading detection (# / ## / ###) ---
    const headingMatch = fullText.match(HEADING_RE)
    if (headingMatch) {
      const level = headingMatch[1].length // 1, 2, or 3
      const markerLen = headingMatch[0].length
      applyHeadingStyle(doc, p, level)
      stripLeadingCharsFromRuns(p, markerLen)
      transformations.push({
        type: 'heading',
        detail: `Converted "${'#'.repeat(level)} ..." to Heading ${level}`,
      })
      continue // headings are fully handled, skip inline checks
    }

    // --- Blockquote detection (> ) ---
    const blockquoteMatch = fullText.match(BLOCKQUOTE_RE)
    if (blockquoteMatch) {
      const markerLen = blockquoteMatch[0].length
      applyCitationIndent(doc, p)
      stripLeadingCharsFromRuns(p, markerLen)
      transformations.push({
        type: 'citation',
        detail: `Converted "> ..." to indented citation`,
      })
    }

    // --- Inline bold+italic, bold, italic ---
    const inlineResult = processInlineFormatting(doc, p)
    if (inlineResult.length > 0) {
      transformations.push(...inlineResult)
    }
  }

  return { transformations }
}

// ============================================================================
// HEADING HELPERS
// ============================================================================

/**
 * Apply a Word heading style (Heading1, Heading2, Heading3) to a paragraph.
 * Creates or modifies the <w:pPr> → <w:pStyle> element.
 *
 * @param {Document} doc - XML DOM
 * @param {Element} p - The <w:p> element
 * @param {number} level - Heading level (1, 2, or 3)
 */
function applyHeadingStyle(doc, p, level) {
  const styleDef = HEADING_STYLES[level]
  if (!styleDef) return

  let pPr = p.getElementsByTagNameNS(W_NS, 'pPr')[0]
  if (!pPr) {
    pPr = doc.createElementNS(W_NS, 'w:pPr')
    p.insertBefore(pPr, p.firstChild)
  }

  // Set or replace <w:pStyle>
  let pStyle = pPr.getElementsByTagNameNS(W_NS, 'pStyle')[0]
  if (!pStyle) {
    pStyle = doc.createElementNS(W_NS, 'w:pStyle')
    pPr.insertBefore(pStyle, pPr.firstChild)
  }
  pStyle.setAttribute('w:val', styleDef.styleId)

  // Also apply bold and font size on all runs for visual consistency
  const runs = p.getElementsByTagNameNS(W_NS, 'r')
  for (let i = 0; i < runs.length; i++) {
    const r = runs[i]
    let rPr = r.getElementsByTagNameNS(W_NS, 'rPr')[0]
    if (!rPr) {
      rPr = doc.createElementNS(W_NS, 'w:rPr')
      r.insertBefore(rPr, r.firstChild)
    }
    if (styleDef.bold) {
      ensureElement(doc, rPr, 'b')
    }
    ensureElementWithVal(doc, rPr, 'sz', String(styleDef.fontSizeHalfPt))
    ensureElementWithVal(doc, rPr, 'szCs', String(styleDef.fontSizeHalfPt))
  }
}

// ============================================================================
// BLOCKQUOTE / CITATION HELPERS
// ============================================================================

/**
 * Apply citation indentation (1 cm left indent) to a paragraph.
 * Creates or modifies <w:pPr> → <w:ind w:left="567"/>.
 *
 * @param {Document} doc - XML DOM
 * @param {Element} p - The <w:p> element
 */
function applyCitationIndent(doc, p) {
  let pPr = p.getElementsByTagNameNS(W_NS, 'pPr')[0]
  if (!pPr) {
    pPr = doc.createElementNS(W_NS, 'w:pPr')
    p.insertBefore(pPr, p.firstChild)
  }

  let ind = pPr.getElementsByTagNameNS(W_NS, 'ind')[0]
  if (!ind) {
    ind = doc.createElementNS(W_NS, 'w:ind')
    pPr.appendChild(ind)
  }
  ind.setAttribute('w:left', String(INDENT.citation))
}

// ============================================================================
// INLINE FORMATTING (BOLD / ITALIC / BOLD+ITALIC)
// ============================================================================

/**
 * Process inline bold/italic/bold+italic markers in a paragraph.
 * This works by:
 *   1. Concatenating all run texts to get the full paragraph text.
 *   2. Finding all marker positions.
 *   3. Rebuilding the runs with appropriate formatting.
 *
 * @param {Document} doc - XML DOM
 * @param {Element} p - The <w:p> element
 * @returns {Array<{ type: string, detail: string }>} Transformation log entries
 */
function processInlineFormatting(doc, p) {
  const transformations = []

  // Collect all runs with their text and properties
  const runs = Array.from(p.getElementsByTagNameNS(W_NS, 'r'))
  if (runs.length === 0) return transformations

  // Build a unified text from all runs, tracking character→run mapping
  const segments = []
  for (const r of runs) {
    const texts = r.getElementsByTagNameNS(W_NS, 't')
    let text = ''
    for (let i = 0; i < texts.length; i++) {
      text += texts[i].textContent || ''
    }

    // Clone the rPr if present (to preserve existing formatting)
    const rPr = r.getElementsByTagNameNS(W_NS, 'rPr')[0]
    segments.push({
      text,
      rPr: rPr ? rPr.cloneNode(true) : null,
      originalRun: r,
    })
  }

  const fullText = segments.map(s => s.text).join('')

  // Check if there are any markers at all (quick bail-out)
  if (!fullText.includes('*')) return transformations

  // Parse the text into tokens: plain text and formatted spans
  const tokens = tokenizeInlineMarkers(fullText)

  // If no formatting tokens were found, bail out
  if (!tokens.some(t => t.format !== 'plain')) return transformations

  // Now rebuild the runs based on tokens
  // First, build a character-position → (segmentIndex, formatting) map
  const charMap = buildCharMap(segments)

  // Remove all existing <w:r> elements from the paragraph
  for (const r of runs) {
    p.removeChild(r)
  }

  // Create new <w:r> elements for each token
  for (const token of tokens) {
    if (!token.text) continue

    // Find the original formatting for the first character of this token
    const baseRPr = findRPrForPosition(charMap, token.originalStart, segments)

    const newRun = doc.createElementNS(W_NS, 'w:r')

    // Create rPr with inherited + new formatting
    const newRPr = baseRPr
      ? baseRPr.cloneNode(true)
      : doc.createElementNS(W_NS, 'w:rPr')

    if (token.format === 'bold' || token.format === 'bolditalic') {
      ensureElement(doc, newRPr, 'b')
      ensureElement(doc, newRPr, 'bCs')
      transformations.push({
        type: 'bold',
        detail: `Applied bold to "${token.text.substring(0, 30)}${token.text.length > 30 ? '...' : ''}"`,
      })
    }
    if (token.format === 'italic' || token.format === 'bolditalic') {
      ensureElement(doc, newRPr, 'i')
      ensureElement(doc, newRPr, 'iCs')
      transformations.push({
        type: 'italic',
        detail: `Applied italic to "${token.text.substring(0, 30)}${token.text.length > 30 ? '...' : ''}"`,
      })
    }

    // Only add rPr if it has children
    if (newRPr.childNodes.length > 0) {
      newRun.appendChild(newRPr)
    }

    // Create the <w:t> element
    const newT = doc.createElementNS(W_NS, 'w:t')
    newT.setAttribute('xml:space', 'preserve')
    newT.textContent = token.text
    newRun.appendChild(newT)

    p.appendChild(newRun)
  }

  return transformations
}

/**
 * Tokenize a string into segments with formatting markers removed.
 * Handles ***, **, and * markers in priority order.
 *
 * Returns an array of { text, format, originalStart, originalEnd }
 * where format is 'plain', 'bold', 'italic', or 'bolditalic'.
 *
 * @param {string} text - The full paragraph text
 * @returns {Array<{ text: string, format: string, originalStart: number, originalEnd: number }>}
 */
function tokenizeInlineMarkers(text) {
  // Find all marked spans and their positions
  const spans = []

  // Phase 1: Find ***...*** (bold+italic)
  let match
  const biRe = /\*{3}(.+?)\*{3}/g
  while ((match = biRe.exec(text)) !== null) {
    spans.push({
      start: match.index,
      end: match.index + match[0].length,
      innerStart: match.index + 3,
      innerEnd: match.index + 3 + match[1].length,
      innerText: match[1],
      format: 'bolditalic',
    })
  }

  // Phase 2: Find **...** (bold) — skip ranges already captured
  const bRe = /\*{2}(.+?)\*{2}/g
  while ((match = bRe.exec(text)) !== null) {
    if (!overlapsAny(match.index, match.index + match[0].length, spans)) {
      spans.push({
        start: match.index,
        end: match.index + match[0].length,
        innerStart: match.index + 2,
        innerEnd: match.index + 2 + match[1].length,
        innerText: match[1],
        format: 'bold',
      })
    }
  }

  // Phase 3: Find *...* (italic) — skip ranges already captured
  const iRe = /(?<!\*)\*([^*]+?)\*(?!\*)/g
  while ((match = iRe.exec(text)) !== null) {
    if (!overlapsAny(match.index, match.index + match[0].length, spans)) {
      spans.push({
        start: match.index,
        end: match.index + match[0].length,
        innerStart: match.index + 1,
        innerEnd: match.index + 1 + match[1].length,
        innerText: match[1],
        format: 'italic',
      })
    }
  }

  if (spans.length === 0) {
    return [{ text, format: 'plain', originalStart: 0, originalEnd: text.length }]
  }

  // Sort spans by start position
  spans.sort((a, b) => a.start - b.start)

  // Build final token array with plain text between spans
  const tokens = []
  let cursor = 0

  for (const span of spans) {
    // Plain text before this span
    if (cursor < span.start) {
      tokens.push({
        text: text.slice(cursor, span.start),
        format: 'plain',
        originalStart: cursor,
        originalEnd: span.start,
      })
    }
    // The formatted span (markers stripped)
    tokens.push({
      text: span.innerText,
      format: span.format,
      originalStart: span.innerStart,
      originalEnd: span.innerEnd,
    })
    cursor = span.end
  }

  // Trailing plain text
  if (cursor < text.length) {
    tokens.push({
      text: text.slice(cursor),
      format: 'plain',
      originalStart: cursor,
      originalEnd: text.length,
    })
  }

  return tokens
}

/**
 * Check if a range [start, end) overlaps with any existing span.
 */
function overlapsAny(start, end, spans) {
  return spans.some(s => start < s.end && end > s.start)
}

// ============================================================================
// TEXT MANIPULATION HELPERS
// ============================================================================

/**
 * Get the full text content of a paragraph by concatenating all <w:t> values.
 *
 * @param {Element} p - The <w:p> element
 * @returns {string} Full paragraph text
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
 * Strip a given number of leading characters from the paragraph's runs.
 * This is used to remove heading markers (e.g., "## ") or blockquote markers ("> ").
 * Characters are removed from left to right across multiple runs if needed.
 *
 * @param {Element} p - The <w:p> element
 * @param {number} charCount - Number of leading characters to strip
 */
function stripLeadingCharsFromRuns(p, charCount) {
  const runs = p.getElementsByTagNameNS(W_NS, 'r')
  let remaining = charCount

  for (let i = 0; i < runs.length && remaining > 0; i++) {
    const ts = runs[i].getElementsByTagNameNS(W_NS, 't')
    for (let j = 0; j < ts.length && remaining > 0; j++) {
      const t = ts[j]
      const text = t.textContent || ''
      if (text.length <= remaining) {
        remaining -= text.length
        t.textContent = ''
      } else {
        t.textContent = text.substring(remaining)
        remaining = 0
      }
    }
  }
}

/**
 * Build a character-position map that maps each character index in the
 * concatenated text back to its originating segment index.
 *
 * @param {Array<{ text: string }>} segments - Run segments
 * @returns {Array<{ segmentIndex: number, localOffset: number }>}
 */
function buildCharMap(segments) {
  const map = []
  for (let i = 0; i < segments.length; i++) {
    for (let j = 0; j < segments[i].text.length; j++) {
      map.push({ segmentIndex: i, localOffset: j })
    }
  }
  return map
}

/**
 * Find the rPr (run properties) element for a given character position.
 * Falls back to null if position is out of range.
 *
 * @param {Array} charMap - Character position map
 * @param {number} position - Character position in full text
 * @param {Array} segments - Run segments with rPr
 * @returns {Element|null} Cloned rPr element or null
 */
function findRPrForPosition(charMap, position, segments) {
  if (position >= charMap.length) return null
  const entry = charMap[position]
  return segments[entry.segmentIndex].rPr || null
}

// ============================================================================
// XML ELEMENT HELPERS
// ============================================================================

/**
 * Check if a paragraph is inside a table cell.
 * Walks up the parent chain looking for <w:tc>.
 *
 * @param {Element} p - The <w:p> element
 * @returns {boolean} True if inside a table
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

/**
 * Ensure a simple boolean element (like <w:b/>) exists in an rPr.
 * If it already exists, leaves it alone.
 *
 * @param {Document} doc - XML DOM
 * @param {Element} rPr - The <w:rPr> element
 * @param {string} localName - Element local name (e.g., 'b', 'i')
 */
function ensureElement(doc, rPr, localName) {
  const existing = rPr.getElementsByTagNameNS(W_NS, localName)[0]
  if (!existing) {
    const el = doc.createElementNS(W_NS, `w:${localName}`)
    rPr.appendChild(el)
  }
}

/**
 * Ensure an element with a w:val attribute exists in an rPr.
 * Creates or updates the element.
 *
 * @param {Document} doc - XML DOM
 * @param {Element} rPr - The <w:rPr> element
 * @param {string} localName - Element local name (e.g., 'sz')
 * @param {string} val - The value for w:val attribute
 */
function ensureElementWithVal(doc, rPr, localName, val) {
  let el = rPr.getElementsByTagNameNS(W_NS, localName)[0]
  if (!el) {
    el = doc.createElementNS(W_NS, `w:${localName}`)
    rPr.appendChild(el)
  }
  el.setAttribute('w:val', val)
}
