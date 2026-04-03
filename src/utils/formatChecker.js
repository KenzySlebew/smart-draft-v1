/**
 * Format Checker — Compares parsed document against Telkom University standards
 * Returns a list of issues with severity, category, description, and fix metadata
 */

import { STANDARDS, MARGIN_TOLERANCE, SEVERITY, CATEGORIES, CATEGORY_ICONS, CM_TO_TWIPS } from './constants'
import { twipsToCm, halfPointsToPt } from './docxParser'

/**
 * Check all formatting rules against the parsed document
 * @param {Object} parsedDoc - Output from parseDocx()
 * @returns {Object} { issues: Array, stats: Object, complianceScore: Number }
 */
export function checkFormatting(parsedDoc) {
  const issues = []

  checkMargins(parsedDoc, issues)
  checkPaperSize(parsedDoc, issues)
  checkFonts(parsedDoc, issues)
  checkLineSpacing(parsedDoc, issues)
  checkParagraphSpacing(parsedDoc, issues)

  // Calculate stats
  const categories = [...new Set(issues.map(i => i.category))]
  const autoFixable = issues.filter(i => i.autoFixable).length
  const totalChecks = 5 // margin, paper, font, line-spacing, para-spacing
  const passedChecks = totalChecks - categories.length

  const complianceScore = issues.length === 0 
    ? 100 
    : Math.max(0, Math.round((1 - (issues.length / (issues.length + passedChecks * 2))) * 100))

  return {
    issues,
    stats: {
      totalPages: parsedDoc.sections.length > 0 ? estimatePageCount(parsedDoc) : '?',
      issuesFound: issues.length,
      categories: categories.length,
      autoFixablePercent: issues.length > 0 ? Math.round((autoFixable / issues.length) * 100) : 100,
    },
    complianceScore,
  }
}

/**
 * Check page margins against standards
 */
function checkMargins(parsedDoc, issues) {
  const std = STANDARDS.margins

  for (const section of parsedDoc.sections) {
    if (!section.margins) continue

    const marginChecks = [
      { side: 'top', actual: section.margins.top, expected: std.top },
      { side: 'bottom', actual: section.margins.bottom, expected: std.bottom },
      { side: 'left', actual: section.margins.left, expected: std.left },
      { side: 'right', actual: section.margins.right, expected: std.right },
    ]

    for (const check of marginChecks) {
      const diff = Math.abs(check.actual - check.expected.value)
      if (diff > MARGIN_TOLERANCE) {
        const actualCm = twipsToCm(check.actual)
        issues.push({
          id: `margin-${check.side}-s${section.index}`,
          category: CATEGORIES.MARGIN,
          icon: CATEGORY_ICONS[CATEGORIES.MARGIN],
          description: `${capitalize(check.side)} margin is ${actualCm} cm`,
          expected: `Expected: ${check.expected.label}`,
          actual: `${actualCm} cm`,
          severity: diff > 200 ? SEVERITY.HIGH : SEVERITY.MEDIUM,
          section: `Section ${section.index + 1} → Page Setup`,
          autoFixable: true,
          fixData: {
            type: 'margin',
            side: check.side,
            sectionIndex: section.index,
            targetValue: check.expected.value,
          },
        })
      }
    }
  }
}

/**
 * Check paper size
 */
function checkPaperSize(parsedDoc, issues) {
  const std = STANDARDS.paperSize

  for (const section of parsedDoc.sections) {
    if (!section.pageSize) continue

    const widthDiff = Math.abs(section.pageSize.width - std.width)
    const heightDiff = Math.abs(section.pageSize.height - std.height)

    if (widthDiff > 50 || heightDiff > 50) {
      issues.push({
        id: `paper-size-s${section.index}`,
        category: CATEGORIES.PAPER,
        icon: CATEGORY_ICONS[CATEGORIES.PAPER],
        description: `Paper size is not A4 (${section.pageSize.width}x${section.pageSize.height} twips)`,
        expected: `Expected: A4 (${std.width}x${std.height} twips)`,
        actual: `${section.pageSize.width}x${section.pageSize.height}`,
        severity: SEVERITY.HIGH,
        section: `Section ${section.index + 1} → Page Setup`,
        autoFixable: true,
        fixData: {
          type: 'paperSize',
          sectionIndex: section.index,
          targetWidth: std.width,
          targetHeight: std.height,
        },
      })
    }
  }
}

/**
 * Check fonts in the document
 */
function checkFonts(parsedDoc, issues) {
  const std = STANDARDS.font
  const checkedFonts = new Set()
  const checkedSizes = new Set()

  // Check default style
  if (parsedDoc.defaultStyle) {
    checkRunFont(parsedDoc.defaultStyle, 'Document Default', issues, checkedFonts, checkedSizes)
  }

  // Check styles (especially Normal style)
  for (const [styleId, style] of Object.entries(parsedDoc.styles)) {
    if (style.runProperties) {
      const styleName = style.name || styleId
      // Only flag heading styles if font family is wrong, not size (headings may have different sizes)
      const isHeading = styleName.toLowerCase().includes('heading') || styleId.toLowerCase().includes('heading')
      checkRunFont(style.runProperties, `Style "${styleName}"`, issues, checkedFonts, checkedSizes, isHeading)
    }
  }

  // Check individual runs (sample — check runs with non-empty text)
  const sampledParas = new Set()
  for (const para of parsedDoc.paragraphs) {
    if (!para.text.trim()) continue // Skip empty paragraphs
    
    // Check paragraph-level run properties
    if (para.properties.runProperties) {
      const paraLabel = getParaLabel(para)
      checkRunFont(para.properties.runProperties, paraLabel, issues, checkedFonts, checkedSizes)
    }

    for (const run of para.runs) {
      if (!run.text.trim()) continue
      if (!run.properties) continue
      
      const paraLabel = getParaLabel(para)
      
      // Check font family
      if (run.properties.fontFamily && 
          run.properties.fontFamily !== std.family && 
          !checkedFonts.has(run.properties.fontFamily)) {
        checkedFonts.add(run.properties.fontFamily)
        issues.push({
          id: `font-family-${run.paraIndex}-${run.index}`,
          category: CATEGORIES.FONT,
          icon: CATEGORY_ICONS[CATEGORIES.FONT],
          description: `Text uses "${run.properties.fontFamily}" font`,
          expected: `Expected: ${std.family}`,
          actual: run.properties.fontFamily,
          severity: SEVERITY.HIGH,
          section: `${paraLabel} → Font`,
          autoFixable: true,
          fixData: {
            type: 'fontFamily',
            targetValue: std.family,
          },
        })
      }

      // Check font size
      if (run.properties.fontSize && 
          run.properties.fontSize !== std.sizeHalfPoints) {
        const actualPt = halfPointsToPt(run.properties.fontSize)
        const key = `${actualPt}pt`
        if (!checkedSizes.has(key)) {
          checkedSizes.add(key)
          issues.push({
            id: `font-size-${run.paraIndex}-${run.index}`,
            category: CATEGORIES.FONT,
            icon: CATEGORY_ICONS[CATEGORIES.FONT],
            description: `Text uses ${actualPt}pt font size`,
            expected: `Expected: ${std.size}pt`,
            actual: `${actualPt}pt`,
            severity: Math.abs(actualPt - std.size) >= 2 ? SEVERITY.HIGH : SEVERITY.MEDIUM,
            section: `${paraLabel} → Font Size`,
            autoFixable: true,
            fixData: {
              type: 'fontSize',
              targetValue: std.sizeHalfPoints,
            },
          })
        }
      }
    }
  }
}

/**
 * Helper to check a run property object for font issues
 */
function checkRunFont(props, location, issues, checkedFonts, checkedSizes, isHeading = false) {
  const std = STANDARDS.font

  if (props.fontFamily && props.fontFamily !== std.family && !checkedFonts.has(props.fontFamily + '-' + location)) {
    checkedFonts.add(props.fontFamily + '-' + location)
    if (!checkedFonts.has(props.fontFamily)) {
      checkedFonts.add(props.fontFamily)
      issues.push({
        id: `font-family-style-${location.replace(/\s/g, '-')}`,
        category: CATEGORIES.FONT,
        icon: CATEGORY_ICONS[CATEGORIES.FONT],
        description: `${location} uses "${props.fontFamily}" font`,
        expected: `Expected: ${std.family}`,
        actual: props.fontFamily,
        severity: SEVERITY.HIGH,
        section: `${location} → Font`,
        autoFixable: true,
        fixData: { type: 'fontFamily', targetValue: std.family },
      })
    }
  }

  if (props.fontSize && props.fontSize !== std.sizeHalfPoints && !isHeading) {
    const actualPt = halfPointsToPt(props.fontSize)
    const key = `${actualPt}pt-${location}`
    if (!checkedSizes.has(key)) {
      checkedSizes.add(key)
      if (!checkedSizes.has(`${actualPt}pt`)) {
        checkedSizes.add(`${actualPt}pt`)
        issues.push({
          id: `font-size-style-${location.replace(/\s/g, '-')}`,
          category: CATEGORIES.FONT,
          icon: CATEGORY_ICONS[CATEGORIES.FONT],
          description: `${location} uses ${actualPt}pt font size`,
          expected: `Expected: ${std.size}pt`,
          actual: `${actualPt}pt`,
          severity: SEVERITY.MEDIUM,
          section: `${location} → Font Size`,
          autoFixable: true,
          fixData: { type: 'fontSize', targetValue: std.sizeHalfPoints },
        })
      }
    }
  }
}

/**
 * Check line spacing
 */
function checkLineSpacing(parsedDoc, issues) {
  const std = STANDARDS.lineSpacing
  const checkedSpacings = new Set()

  // Check Normal/default style first
  for (const [styleId, style] of Object.entries(parsedDoc.styles)) {
    if (style.paragraphProperties?.spacing?.line && style.paragraphProperties.spacing.line !== std.value) {
      const actual = style.paragraphProperties.spacing.line
      const actualMultiplier = (actual / 240).toFixed(2)
      const key = `style-${actual}`
      if (!checkedSpacings.has(key)) {
        checkedSpacings.add(key)
        issues.push({
          id: `line-spacing-style-${styleId}`,
          category: CATEGORIES.SPACING,
          icon: CATEGORY_ICONS[CATEGORIES.SPACING],
          description: `Style "${style.name || styleId}" has ${actualMultiplier}x line spacing`,
          expected: `Expected: ${std.label}`,
          actual: `${actualMultiplier}x`,
          severity: SEVERITY.HIGH,
          section: `Style "${style.name || styleId}" → Paragraph`,
          autoFixable: true,
          fixData: {
            type: 'lineSpacing',
            targetValue: std.value,
          },
        })
      }
    }
  }

  // Check individual paragraphs
  for (const para of parsedDoc.paragraphs) {
    if (!para.text.trim()) continue
    if (para.properties.spacing?.line && para.properties.spacing.line !== std.value) {
      const actual = para.properties.spacing.line
      const actualMultiplier = (actual / 240).toFixed(2)
      const key = `para-${actual}`
      if (!checkedSpacings.has(key)) {
        checkedSpacings.add(key)
        const paraLabel = getParaLabel(para)
        issues.push({
          id: `line-spacing-p${para.index}`,
          category: CATEGORIES.SPACING,
          icon: CATEGORY_ICONS[CATEGORIES.SPACING],
          description: `${paraLabel} has ${actualMultiplier}x line spacing`,
          expected: `Expected: ${std.label}`,
          actual: `${actualMultiplier}x`,
          severity: SEVERITY.HIGH,
          section: `${paraLabel} → Paragraph`,
          autoFixable: true,
          fixData: {
            type: 'lineSpacing',
            targetValue: std.value,
          },
        })
      }
    }
  }
}

/**
 * Check paragraph before/after spacing
 */
function checkParagraphSpacing(parsedDoc, issues) {
  let hasSpacingIssue = false

  // Check styles
  for (const [styleId, style] of Object.entries(parsedDoc.styles)) {
    const spacing = style.paragraphProperties?.spacing
    if (!spacing) continue
    
    // Check after spacing (commonly set to non-zero by default in Word)
    if (spacing.after > 0 && (style.isDefault || styleId === 'Normal' || styleId.toLowerCase() === 'normal')) {
      if (!hasSpacingIssue) {
        hasSpacingIssue = true
        issues.push({
          id: `para-spacing-after-style`,
          category: CATEGORIES.SPACING,
          icon: CATEGORY_ICONS[CATEGORIES.SPACING],
          description: `Default paragraph has ${spacing.after / 20}pt after-spacing`,
          expected: `Expected: 0pt`,
          actual: `${spacing.after / 20}pt`,
          severity: SEVERITY.LOW,
          section: `Style "Normal" → Spacing`,
          autoFixable: true,
          fixData: {
            type: 'paragraphSpacing',
            targetBefore: 0,
            targetAfter: 0,
          },
        })
      }
    }
  }
}

/**
 * Generate a label for a paragraph based on its content
 */
function getParaLabel(para) {
  const text = para.text.trim()
  if (!text) return `Paragraph ${para.index + 1}`
  
  // Check if it's a chapter heading
  const babMatch = text.match(/^BAB\s+[IVX\d]+/i)
  if (babMatch) return babMatch[0]
  
  // Use first ~40 chars
  const preview = text.substring(0, 40)
  return preview.length < text.length ? `"${preview}..."` : `"${preview}"`
}

/**
 * Estimate page count (rough estimate based on paragraph count)
 */
function estimatePageCount(parsedDoc) {
  // Very rough: ~25 paragraphs per page
  const parCount = parsedDoc.paragraphs.filter(p => p.text.trim()).length
  return Math.max(1, Math.ceil(parCount / 25))
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
