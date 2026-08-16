/**
 * Telkom University Thesis Formatting Standards
 * 
 * Unit conversions:
 * - 1 cm = 567 twips (approx)
 * - 1 pt = 20 twips
 * - Font size in OpenXML = half-points (12pt = 24)
 * - Line spacing 1.5 = 360 twips (240 * 1.5)
 */

// WordprocessingML namespace
export const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
export const R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

// Conversion helpers
export const CM_TO_TWIPS = 567
export const PT_TO_TWIPS = 20
export const PT_TO_HALF_POINTS = 2

// ===== Telkom University Standards =====

export const STANDARDS = {
  margins: {
    top:    { value: 3 * CM_TO_TWIPS, label: '3 cm', cm: 3 },     // 1701 twips
    bottom: { value: 3 * CM_TO_TWIPS, label: '3 cm', cm: 3 },     // 1701 twips
    left:   { value: 4 * CM_TO_TWIPS, label: '4 cm', cm: 4 },     // 2268 twips
    right:  { value: 3 * CM_TO_TWIPS, label: '3 cm', cm: 3 },     // 1701 twips
  },

  font: {
    family: 'Times New Roman',
    size: 12,                          // in pt
    sizeHalfPoints: 12 * PT_TO_HALF_POINTS,  // 24 half-points
    sizeTwips: 12 * PT_TO_TWIPS,       // 240 twips (for w:szCs)
  },

  lineSpacing: {
    value: 360,                        // 1.5 spacing = 360 twips
    label: '1.5',
    multiplier: 1.5,
  },

  paperSize: {
    width: 11906,                      // A4 width in twips
    height: 16838,                     // A4 height in twips
    label: 'A4',
  },

  paragraph: {
    alignment: 'both',                 // justified
    spaceBefore: 0,                    // 0 twips
    spaceAfter: 0,                     // 0 twips
  },
}

// ===== Smart Formatting Pipeline Constants =====

/**
 * Heading style definitions for Prioritas 1 (Syntax Parser).
 * Maps markdown heading levels to Word built-in style IDs and font sizes.
 */
export const HEADING_STYLES = {
  1: { styleId: 'Heading1', name: 'heading 1', fontSizeHalfPt: 28, bold: true },  // 14pt
  2: { styleId: 'Heading2', name: 'heading 2', fontSizeHalfPt: 26, bold: true },  // 13pt
  3: { styleId: 'Heading3', name: 'heading 3', fontSizeHalfPt: 24, bold: true },  // 12pt
}

/**
 * Indentation values in twips for citation blocks and first-line indent.
 * 1 cm ≈ 567 twips.
 */
export const INDENT = {
  citation: 567,     // 1 cm left indent for blockquotes (> syntax)
  firstLine: 567,    // 1 cm first-line indent for body paragraphs
}

/**
 * BAB (chapter) heading detection pattern.
 * Matches: BAB I, BAB II, BAB 1, BAB IV PEMBAHASAN, etc.
 */
export const BAB_PATTERN = /^BAB\s+([IVXLCDM]+|\d+)\s*(.*)/i

/**
 * Sub-section numbering pattern.
 * Matches: 1.1, 1.1.1, 2.3.4, etc.
 */
export const SUBSECTION_PATTERN = /^(\d+(?:\.\d+)+)\s+(.*)/

/**
 * Characters recognized as raw bullet points that should be converted
 * to Word's native list bullet format.
 */
export const RAW_BULLET_CHARS = ['•', '●', '▪', '▸', '▹', '◦', '○']

/**
 * Pattern to detect raw bullet lines (dash, asterisk, or unicode bullets).
 * Captures the bullet character and the content after it.
 */
export const BULLET_LINE_PATTERN = /^\s*([•●▪▸▹◦○\-\*])\s+(.*)/

/**
 * Roman numeral mapping for chapter number normalization.
 */
export const ARABIC_TO_ROMAN = {
  1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V',
  6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X',
  11: 'XI', 12: 'XII', 13: 'XIII', 14: 'XIV', 15: 'XV',
}

/**
 * Reverse mapping: Roman numeral string → Arabic number.
 */
export const ROMAN_TO_ARABIC = Object.fromEntries(
  Object.entries(ARABIC_TO_ROMAN).map(([k, v]) => [v, parseInt(k)])
)

// Tolerance: allow ±10 twips for margins (rounding differences)
export const MARGIN_TOLERANCE = 30

// Severity levels
export const SEVERITY = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
}

// Category labels
export const CATEGORIES = {
  MARGIN: 'Margin',
  FONT: 'Font',
  SPACING: 'Spacing',
  PAPER: 'Paper Size',
  ALIGNMENT: 'Alignment',
  SYNTAX: 'Syntax',
  NOISE: 'Noise',
  STRUCTURE: 'Structure',
  INDENT: 'Indentation',
}

// Category icons
export const CATEGORY_ICONS = {
  [CATEGORIES.MARGIN]: '📐',
  [CATEGORIES.FONT]: '🔤',
  [CATEGORIES.SPACING]: '📏',
  [CATEGORIES.PAPER]: '📄',
  [CATEGORIES.ALIGNMENT]: '↔️',
  [CATEGORIES.SYNTAX]: '✏️',
  [CATEGORIES.NOISE]: '🧹',
  [CATEGORIES.STRUCTURE]: '🏗️',
  [CATEGORIES.INDENT]: '↦',
}
