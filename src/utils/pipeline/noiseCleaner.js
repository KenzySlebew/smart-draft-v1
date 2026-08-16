/**
 * ============================================================================
 * STAGE 2: NOISE CLEANER (Prioritas 2 — High)
 * ============================================================================
 *
 * Removes visual noise from paragraph text content by directly manipulating
 * the XML DOM. All removals are logged for the transformation report.
 *
 * Rules:
 *   1. Remove paragraphs that are pure horizontal rules (----, ====, ____)
 *   2. Remove paragraphs that are comment lines (// ...)
 *   3. Normalize double/triple spaces to single spaces within <w:t> elements
 *   4. Trim leading/trailing whitespace from <w:t> elements
 *   5. Flag (but don't auto-delete) suspicious all-caps lines
 *
 * Safety:
 *   - Never removes paragraphs inside tables (<w:tc>)
 *   - Never removes paragraphs containing images (<w:drawing>) or objects
 *   - Preserves xml:space="preserve" where semantically needed
 *
 * Dependencies: constants.js (W_NS)
 */

import { W_NS } from '../constants'

// ===== Detection Patterns =====

/** Horizontal rule: 3+ repeating dashes, equals, or underscores (optionally with spaces) */
const HORIZONTAL_RULE_RE = /^[\s]*[-=_]{3,}[\s]*$/

/** Comment line: starts with // (with optional leading whitespace) */
const COMMENT_LINE_RE = /^\s*\/\//

/** Inline comment: // followed by text, appearing after real content */
const INLINE_COMMENT_RE = /\s*\/\/.*$/

/** Multiple consecutive spaces */
const MULTI_SPACE_RE = /[ \t]{2,}/g

/** Suspicious all-caps line: 20+ uppercase letters/spaces with no lowercase */
const ALL_CAPS_RE = /^[A-Z\s.,!?:;()]{20,}$/

/**
 * Run the noise cleaner on the entire document XML DOM.
 *
 * @param {Document} doc - The parsed document.xml DOM
 * @returns {{
 *   removed: Array<{ type: string, text: string }>,
 *   cleaned: Array<{ type: string, detail: string }>,
 *   warnings: Array<{ type: string, text: string }>
 * }}
 */
export function runNoiseCleaner(doc) {
  const removed = []
  const cleaned = []
  const warnings = []

  const body = doc.getElementsByTagNameNS(W_NS, 'body')[0]
  if (!body) return { removed, cleaned, warnings }

  // Collect paragraphs into a static array (we'll be removing some)
  const paragraphs = Array.from(doc.getElementsByTagNameNS(W_NS, 'p'))

  for (const p of paragraphs) {
    // === Safety: skip paragraphs in tables or containing special elements ===
    if (isProtectedParagraph(p)) continue

    const fullText = getParagraphText(p)

    // --- Rule 1: Remove horizontal rules ---
    if (HORIZONTAL_RULE_RE.test(fullText)) {
      const parent = p.parentNode
      if (parent) {
        parent.removeChild(p)
        removed.push({
          type: 'horizontal_rule',
          text: fullText.trim().substring(0, 40),
        })
      }
      continue
    }

    // --- Rule 2: Remove full comment lines ---
    if (COMMENT_LINE_RE.test(fullText)) {
      const parent = p.parentNode
      if (parent) {
        parent.removeChild(p)
        removed.push({
          type: 'comment_line',
          text: fullText.trim().substring(0, 60),
        })
      }
      continue
    }

    // --- Rule 5: Flag suspicious all-caps lines (don't delete) ---
    const trimmed = fullText.trim()
    if (trimmed.length >= 20 && ALL_CAPS_RE.test(trimmed)) {
      // Don't flag known patterns (BAB headings, DAFTAR PUSTAKA, etc.)
      if (!/^(BAB\s|DAFTAR\s|KATA\s|ABSTRAK|LAMPIRAN|LEMBAR|SURAT|HALAMAN)/i.test(trimmed)) {
        warnings.push({
          type: 'all_caps',
          text: trimmed.substring(0, 60),
        })
      }
    }

    // --- Rule 2b: Strip inline comments (// at end of content lines) ---
    let hadInlineComment = false
    const runs = p.getElementsByTagNameNS(W_NS, 'r')
    // Rebuild the full text to check for inline comments
    if (INLINE_COMMENT_RE.test(fullText) && !COMMENT_LINE_RE.test(fullText)) {
      hadInlineComment = stripInlineComments(runs)
    }
    if (hadInlineComment) {
      cleaned.push({
        type: 'inline_comment',
        detail: `Stripped inline comment from "${trimmed.substring(0, 40)}..."`,
      })
    }

    // --- Rule 3 & 4: Normalize whitespace in <w:t> elements ---
    const wsResult = normalizeWhitespace(runs)
    if (wsResult.multiSpaceFixed > 0) {
      cleaned.push({
        type: 'multi_space',
        detail: `Fixed ${wsResult.multiSpaceFixed} double-space occurrence(s)`,
      })
    }
    if (wsResult.trimmed > 0) {
      cleaned.push({
        type: 'trim',
        detail: `Trimmed whitespace from ${wsResult.trimmed} text run(s)`,
      })
    }
  }

  return { removed, cleaned, warnings }
}

// ============================================================================
// PARAGRAPH-LEVEL HELPERS
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
 * Check if a paragraph is "protected" and should not be modified.
 * Protected paragraphs are:
 *   - Inside table cells (<w:tc>)
 *   - Containing images (<w:drawing>) or embedded objects (<w:object>)
 *
 * @param {Element} p - The <w:p> element
 * @returns {boolean} True if the paragraph should be skipped
 */
function isProtectedParagraph(p) {
  // Check parent chain for table context
  let node = p.parentNode
  while (node) {
    if (node.localName === 'tc' || node.localName === 'tbl') return true
    if (node.localName === 'body') break
    node = node.parentNode
  }

  // Check for embedded images or objects within the paragraph
  if (p.getElementsByTagNameNS(W_NS, 'drawing')[0]) return true
  if (p.getElementsByTagNameNS(W_NS, 'object')[0]) return true

  // Also check the relationship namespace for images
  const drawingNS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
  const wpNS = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'
  if (p.getElementsByTagNameNS(wpNS, 'inline')[0]) return true
  if (p.getElementsByTagNameNS(wpNS, 'anchor')[0]) return true

  return false
}

// ============================================================================
// INLINE COMMENT STRIPPING
// ============================================================================

/**
 * Strip inline comments (// ...) from run elements.
 * Modifies <w:t> content in-place. If a run's text becomes empty after
 * stripping, the run is left (Word handles empty runs gracefully).
 *
 * @param {HTMLCollection} runs - The <w:r> elements of a paragraph
 * @returns {boolean} True if any inline comment was stripped
 */
function stripInlineComments(runs) {
  // Build the full text and find where // starts
  let fullText = ''
  const runTexts = []
  for (let i = 0; i < runs.length; i++) {
    const ts = runs[i].getElementsByTagNameNS(W_NS, 't')
    let text = ''
    for (let j = 0; j < ts.length; j++) {
      text += ts[j].textContent || ''
    }
    runTexts.push(text)
    fullText += text
  }

  const commentIdx = fullText.search(/\s*\/\//)
  if (commentIdx === -1) return false

  // Truncate from the comment position onwards
  let charPos = 0
  for (let i = 0; i < runs.length; i++) {
    const ts = runs[i].getElementsByTagNameNS(W_NS, 't')
    for (let j = 0; j < ts.length; j++) {
      const t = ts[j]
      const text = t.textContent || ''
      const endPos = charPos + text.length

      if (commentIdx >= charPos && commentIdx < endPos) {
        // This text node contains the start of the comment
        const localIdx = commentIdx - charPos
        t.textContent = text.substring(0, localIdx).trimEnd()
      } else if (charPos >= commentIdx) {
        // This entire text node is part of the comment
        t.textContent = ''
      }

      charPos = endPos
    }
  }

  return true
}

// ============================================================================
// WHITESPACE NORMALIZATION
// ============================================================================

/**
 * Normalize whitespace in all <w:t> elements within the given runs:
 *   - Replace multiple consecutive spaces with a single space
 *   - Trim leading/trailing whitespace (but preserve xml:space="preserve"
 *     semantics by adding it when the text starts/ends with a space)
 *
 * @param {HTMLCollection} runs - The <w:r> elements
 * @returns {{ multiSpaceFixed: number, trimmed: number }}
 */
function normalizeWhitespace(runs) {
  let multiSpaceFixed = 0
  let trimmed = 0

  for (let i = 0; i < runs.length; i++) {
    const ts = runs[i].getElementsByTagNameNS(W_NS, 't')
    for (let j = 0; j < ts.length; j++) {
      const t = ts[j]
      let text = t.textContent || ''
      const original = text

      // Fix multiple spaces
      if (MULTI_SPACE_RE.test(text)) {
        text = text.replace(MULTI_SPACE_RE, ' ')
        multiSpaceFixed++
      }

      // Trim leading/trailing spaces
      const trimmedText = text.trim()
      if (trimmedText !== text && trimmedText.length > 0) {
        // Preserve a single space at boundaries if needed for word separation
        const needsLeadingSpace = text.startsWith(' ') && i > 0
        const needsTrailingSpace = text.endsWith(' ') && i < runs.length - 1
        text = (needsLeadingSpace ? ' ' : '') + trimmedText + (needsTrailingSpace ? ' ' : '')
        trimmed++
      } else if (trimmedText.length === 0 && original.length > 0) {
        // All whitespace — preserve single space if between other runs
        if (i > 0 && i < runs.length - 1) {
          text = ' '
        } else {
          text = ''
        }
        trimmed++
      }

      if (text !== original) {
        t.textContent = text
        // Ensure xml:space="preserve" if text has leading/trailing spaces
        if (text.startsWith(' ') || text.endsWith(' ')) {
          t.setAttribute('xml:space', 'preserve')
        }
      }
    }
  }

  return { multiSpaceFixed, trimmed }
}
