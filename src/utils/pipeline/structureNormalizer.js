/**
 * ============================================================================
 * STAGE 3: STRUCTURE NORMALIZER (Prioritas 3 — Medium)
 * ============================================================================
 *
 * Standardizes document structure patterns by manipulating the XML DOM:
 *
 *   1. BAB heading normalization:
 *      - Detects "BAB I", "BAB 1", "BAB II PENDAHULUAN", etc.
 *      - Normalizes to "BAB [ROMAN] [UPPERCASE TITLE]"
 *      - Applies Heading1 style
 *
 *   2. Sub-section numbering validation:
 *      - Detects decimal patterns (1.1, 1.1.1, 2.3)
 *      - Flags inconsistencies (e.g., jumping from 1.1 to 1.3)
 *
 *   3. Bullet point normalization:
 *      - Detects raw bullet characters (•, -, *, ▪, etc.)
 *      - Strips the character and applies Word list formatting
 *
 *   4. DAFTAR PUSTAKA sorting:
 *      - Detects the bibliography section
 *      - Sorts entries alphabetically (A→Z)
 *
 * Dependencies: constants.js (W_NS, BAB_PATTERN, BULLET_LINE_PATTERN,
 *               ARABIC_TO_ROMAN, ROMAN_TO_ARABIC, HEADING_STYLES)
 */

import {
  W_NS,
  BAB_PATTERN,
  BULLET_LINE_PATTERN,
  SUBSECTION_PATTERN,
  ARABIC_TO_ROMAN,
  ROMAN_TO_ARABIC,
  HEADING_STYLES,
} from '../constants'

/**
 * Run the structure normalizer on the entire document XML DOM.
 *
 * @param {Document} doc - The parsed document.xml DOM
 * @returns {{
 *   normalized: Array<{ type: string, detail: string }>,
 *   warnings: Array<{ type: string, detail: string }>
 * }}
 */
export function runStructureNormalizer(doc) {
  const normalized = []
  const warnings = []

  const body = doc.getElementsByTagNameNS(W_NS, 'body')[0]
  if (!body) return { normalized, warnings }

  const paragraphs = Array.from(doc.getElementsByTagNameNS(W_NS, 'p'))

  // --- Pass 1: BAB heading normalization ---
  normalizeBabHeadings(doc, paragraphs, normalized)

  // --- Pass 2: Sub-section numbering validation ---
  validateSubsections(paragraphs, warnings)

  // --- Pass 3: Bullet point normalization ---
  normalizeBullets(doc, paragraphs, normalized)

  // --- Pass 4: DAFTAR PUSTAKA sorting ---
  sortDaftarPustaka(doc, body, paragraphs, normalized)

  return { normalized, warnings }
}

// ============================================================================
// BAB HEADING NORMALIZATION
// ============================================================================

/**
 * Find and normalize BAB (chapter) headings.
 *
 * Handles variations like:
 *   "BAB I PENDAHULUAN"       → already correct
 *   "BAB 1 PENDAHULUAN"       → "BAB I PENDAHULUAN"
 *   "BAB 1 pendahuluan"       → "BAB I PENDAHULUAN"
 *   "Bab II  Tinjauan Pustaka" → "BAB II TINJAUAN PUSTAKA"
 *   "BAB IV"                   → "BAB IV" (no title, leave as is)
 *
 * Also applies Heading1 style to the paragraph.
 *
 * @param {Document} doc - XML DOM
 * @param {Element[]} paragraphs - All <w:p> elements
 * @param {Array} normalized - Transformation log
 */
function normalizeBabHeadings(doc, paragraphs, normalized) {
  for (const p of paragraphs) {
    if (isInsideTable(p)) continue

    const fullText = getParagraphText(p)
    const match = fullText.match(BAB_PATTERN)
    if (!match) continue

    const rawNumber = match[1].trim()
    const rawTitle = (match[2] || '').trim()

    // Convert number to Roman if it's Arabic
    let romanNumber = rawNumber.toUpperCase()
    const asArabic = parseInt(rawNumber, 10)
    if (!isNaN(asArabic) && ARABIC_TO_ROMAN[asArabic]) {
      romanNumber = ARABIC_TO_ROMAN[asArabic]
    }

    // Build normalized text
    const normalizedTitle = rawTitle.toUpperCase()
    const normalizedText = normalizedTitle
      ? `BAB ${romanNumber} ${normalizedTitle}`
      : `BAB ${romanNumber}`

    const originalText = fullText.trim()

    // Only modify if the text actually changed
    if (normalizedText !== originalText) {
      // Replace all run text content with the normalized text
      replaceAllRunText(doc, p, normalizedText)
      normalized.push({
        type: 'bab_heading',
        detail: `"${originalText}" → "${normalizedText}"`,
      })
    }

    // Apply Heading1 style regardless
    applyParagraphStyle(doc, p, HEADING_STYLES[1].styleId)

    // Make runs bold
    makeParagraphBold(doc, p)
  }
}

// ============================================================================
// SUB-SECTION NUMBERING VALIDATION
// ============================================================================

/**
 * Validate sub-section numbering consistency.
 * Checks for:
 *   - Gaps in numbering (e.g., 1.1 → 1.3 without 1.2)
 *   - Depth inconsistencies (e.g., jumping from 1.1 to 1.1.1.1)
 *
 * Does NOT auto-fix — only generates warnings.
 *
 * @param {Element[]} paragraphs - All <w:p> elements
 * @param {Array} warnings - Warning log
 */
function validateSubsections(paragraphs, warnings) {
  const numbering = []

  for (const p of paragraphs) {
    if (isInsideTable(p)) continue

    const fullText = getParagraphText(p).trim()
    const match = fullText.match(SUBSECTION_PATTERN)
    if (!match) continue

    const numStr = match[1] // e.g., "1.1.2"
    const parts = numStr.split('.').map(Number)

    numbering.push({ numStr, parts, text: fullText })
  }

  // Check sequential consistency
  for (let i = 1; i < numbering.length; i++) {
    const prev = numbering[i - 1]
    const curr = numbering[i]

    // Same depth — check if the last number is sequential
    if (prev.parts.length === curr.parts.length) {
      const prevParent = prev.parts.slice(0, -1).join('.')
      const currParent = curr.parts.slice(0, -1).join('.')

      if (prevParent === currParent) {
        const prevLast = prev.parts[prev.parts.length - 1]
        const currLast = curr.parts[curr.parts.length - 1]

        if (currLast !== prevLast + 1 && currLast !== 1) {
          warnings.push({
            type: 'subsection_gap',
            detail: `Numbering gap: "${prev.numStr}" → "${curr.numStr}" (expected ${prevParent ? prevParent + '.' : ''}${prevLast + 1})`,
          })
        }
      }
    }

    // Check for extreme depth jumps (e.g., 1.1 → 1.1.1.1.1)
    if (curr.parts.length - prev.parts.length > 2) {
      warnings.push({
        type: 'subsection_depth',
        detail: `Unusual depth jump: "${prev.numStr}" → "${curr.numStr}"`,
      })
    }
  }
}

// ============================================================================
// BULLET POINT NORMALIZATION
// ============================================================================

/**
 * Normalize raw bullet characters to Word's built-in list bullet format.
 *
 * Detects lines starting with •, -, *, ▪, etc. and:
 *   1. Strips the bullet character from the text
 *   2. Applies a left indent (for visual bullet appearance)
 *   3. Adds a <w:numPr> element pointing to a bullet list definition
 *
 * Since creating proper abstract numbering definitions requires modifying
 * word/numbering.xml (which may not exist), we use a simpler approach:
 * set left indent + hanging indent to simulate bullet appearance.
 *
 * @param {Document} doc - XML DOM
 * @param {Element[]} paragraphs - All <w:p> elements
 * @param {Array} normalized - Transformation log
 */
function normalizeBullets(doc, paragraphs, normalized) {
  for (const p of paragraphs) {
    if (isInsideTable(p)) continue

    const fullText = getParagraphText(p)
    const match = fullText.match(BULLET_LINE_PATTERN)
    if (!match) continue

    const bulletChar = match[1]
    const content = match[2]

    // Don't normalize if it looks like a markdown heading marker
    if (bulletChar === '*' && fullText.trim().startsWith('**')) continue

    // Strip the bullet character and space from runs
    const prefixLen = fullText.indexOf(content)
    stripLeadingCharsFromRuns(p, prefixLen)

    // Apply indented paragraph formatting (simulating a bullet list)
    let pPr = p.getElementsByTagNameNS(W_NS, 'pPr')[0]
    if (!pPr) {
      pPr = doc.createElementNS(W_NS, 'w:pPr')
      p.insertBefore(pPr, p.firstChild)
    }

    // Set indent: left=720 twips (1.27 cm), hanging=360 twips (0.63 cm)
    let ind = pPr.getElementsByTagNameNS(W_NS, 'ind')[0]
    if (!ind) {
      ind = doc.createElementNS(W_NS, 'w:ind')
      pPr.appendChild(ind)
    }
    ind.setAttribute('w:left', '720')
    ind.setAttribute('w:hanging', '360')

    // Prepend a bullet character as a separate run with Symbol/Wingdings-like rendering
    // Using Unicode bullet • which renders natively in Word
    const bulletRun = doc.createElementNS(W_NS, 'w:r')
    const bulletT = doc.createElementNS(W_NS, 'w:t')
    bulletT.setAttribute('xml:space', 'preserve')
    bulletT.textContent = '•\t'
    bulletRun.appendChild(bulletT)

    // Insert bullet run before the first existing run
    const firstRun = p.getElementsByTagNameNS(W_NS, 'r')[0]
    if (firstRun) {
      p.insertBefore(bulletRun, firstRun)
    } else {
      p.appendChild(bulletRun)
    }

    normalized.push({
      type: 'bullet',
      detail: `Normalized bullet "${bulletChar}" → "•" for "${content.substring(0, 40)}..."`,
    })
  }
}

// ============================================================================
// DAFTAR PUSTAKA (BIBLIOGRAPHY) SORTING
// ============================================================================

/**
 * Find the DAFTAR PUSTAKA section and sort its entries alphabetically.
 *
 * Algorithm:
 *   1. Find the paragraph containing "DAFTAR PUSTAKA"
 *   2. Collect all subsequent non-empty paragraphs until the next heading
 *   3. Sort them alphabetically by text content
 *   4. Reorder the <w:p> elements in the DOM
 *
 * @param {Document} doc - XML DOM
 * @param {Element} body - The <w:body> element
 * @param {Element[]} paragraphs - All <w:p> elements
 * @param {Array} normalized - Transformation log
 */
function sortDaftarPustaka(doc, body, paragraphs, normalized) {
  // Find the DAFTAR PUSTAKA heading
  let daftarIdx = -1
  for (let i = 0; i < paragraphs.length; i++) {
    const text = getParagraphText(paragraphs[i]).trim().toUpperCase()
    if (text.includes('DAFTAR PUSTAKA')) {
      daftarIdx = i
      break
    }
  }

  if (daftarIdx === -1) return // No bibliography section found

  // Collect bibliography entries (paragraphs after DAFTAR PUSTAKA)
  const entries = []
  for (let i = daftarIdx + 1; i < paragraphs.length; i++) {
    const p = paragraphs[i]
    const text = getParagraphText(p).trim()

    // Stop at the next major heading or section break
    if (BAB_PATTERN.test(text)) break
    if (/^(LAMPIRAN|LEMBAR|DAFTAR\s+(GAMBAR|TABEL|ISI|SIMBOL))/i.test(text)) break

    // Skip empty paragraphs
    if (!text) continue

    entries.push({ element: p, text })
  }

  if (entries.length < 2) return // Nothing to sort

  // Check if already sorted
  const texts = entries.map(e => e.text.toLowerCase())
  const isSorted = texts.every((t, i) => i === 0 || t >= texts[i - 1])
  if (isSorted) return

  // Sort alphabetically
  entries.sort((a, b) => a.text.toLowerCase().localeCompare(b.text.toLowerCase()))

  // Reorder in DOM: insert sorted entries after the DAFTAR PUSTAKA heading
  // First, find the reference point (the paragraph after the heading)
  let insertAfter = paragraphs[daftarIdx]
  for (const entry of entries) {
    // Remove from current position
    const parent = entry.element.parentNode
    if (parent) parent.removeChild(entry.element)

    // Insert after the reference point
    const nextSibling = insertAfter.nextSibling
    if (nextSibling) {
      body.insertBefore(entry.element, nextSibling)
    } else {
      body.appendChild(entry.element)
    }
    insertAfter = entry.element
  }

  normalized.push({
    type: 'bibliography_sort',
    detail: `Sorted ${entries.length} bibliography entries alphabetically (A→Z)`,
  })
}

// ============================================================================
// UTILITY HELPERS
// ============================================================================

/**
 * Get the full text content of a paragraph.
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

/**
 * Replace all text in a paragraph's runs with new text.
 * Puts the new text in the first run's first <w:t> and clears the rest.
 *
 * @param {Document} doc - XML DOM
 * @param {Element} p - The <w:p> element
 * @param {string} newText - The replacement text
 */
function replaceAllRunText(doc, p, newText) {
  const runs = p.getElementsByTagNameNS(W_NS, 'r')
  let first = true

  for (let i = 0; i < runs.length; i++) {
    const ts = runs[i].getElementsByTagNameNS(W_NS, 't')
    for (let j = 0; j < ts.length; j++) {
      if (first) {
        ts[j].textContent = newText
        ts[j].setAttribute('xml:space', 'preserve')
        first = false
      } else {
        ts[j].textContent = ''
      }
    }
  }

  // If there were no runs, create one
  if (first) {
    const r = doc.createElementNS(W_NS, 'w:r')
    const t = doc.createElementNS(W_NS, 'w:t')
    t.setAttribute('xml:space', 'preserve')
    t.textContent = newText
    r.appendChild(t)
    p.appendChild(r)
  }
}

/**
 * Apply a paragraph style by setting <w:pPr> → <w:pStyle>.
 */
function applyParagraphStyle(doc, p, styleId) {
  let pPr = p.getElementsByTagNameNS(W_NS, 'pPr')[0]
  if (!pPr) {
    pPr = doc.createElementNS(W_NS, 'w:pPr')
    p.insertBefore(pPr, p.firstChild)
  }

  let pStyle = pPr.getElementsByTagNameNS(W_NS, 'pStyle')[0]
  if (!pStyle) {
    pStyle = doc.createElementNS(W_NS, 'w:pStyle')
    pPr.insertBefore(pStyle, pPr.firstChild)
  }
  pStyle.setAttribute('w:val', styleId)
}

/**
 * Make all runs in a paragraph bold.
 */
function makeParagraphBold(doc, p) {
  const runs = p.getElementsByTagNameNS(W_NS, 'r')
  for (let i = 0; i < runs.length; i++) {
    const r = runs[i]
    let rPr = r.getElementsByTagNameNS(W_NS, 'rPr')[0]
    if (!rPr) {
      rPr = doc.createElementNS(W_NS, 'w:rPr')
      r.insertBefore(rPr, r.firstChild)
    }
    if (!rPr.getElementsByTagNameNS(W_NS, 'b')[0]) {
      rPr.appendChild(doc.createElementNS(W_NS, 'w:b'))
    }
    if (!rPr.getElementsByTagNameNS(W_NS, 'bCs')[0]) {
      rPr.appendChild(doc.createElementNS(W_NS, 'w:bCs'))
    }
  }
}

/**
 * Strip a given number of leading characters from a paragraph's runs.
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
