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
}

// Category icons
export const CATEGORY_ICONS = {
  [CATEGORIES.MARGIN]: '📐',
  [CATEGORIES.FONT]: '🔤',
  [CATEGORIES.SPACING]: '📏',
  [CATEGORIES.PAPER]: '📄',
  [CATEGORIES.ALIGNMENT]: '↔️',
}
