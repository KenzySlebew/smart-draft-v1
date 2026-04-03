/**
 * Format Fixer — Modifies the .docx XML to fix formatting issues
 * 
 * Works by directly manipulating the XML DOM, then serializing back
 * and re-zipping into a new .docx file.
 */

import { W_NS, STANDARDS } from './constants'
import { saveAs } from 'file-saver'

/**
 * Fix all detected issues in the document and return a downloadable blob
 * @param {Object} parsedDoc - Output from parseDocx()
 * @param {Array} issues - Issues from checkFormatting()
 * @returns {Object} { blob, fixedIssues }
 */
export async function fixFormatting(parsedDoc, issues) {
  const { zip, documentXml, stylesXml } = parsedDoc
  const fixedIssues = []

  // Apply fixes to document.xml
  if (documentXml) {
    fixMargins(documentXml, issues, fixedIssues)
    fixPaperSize(documentXml, issues, fixedIssues)
    fixFontsInDocument(documentXml, issues, fixedIssues)
    fixLineSpacingInDocument(documentXml, issues, fixedIssues)
    fixParagraphSpacingInDocument(documentXml, issues, fixedIssues)

    // Serialize document.xml back to string
    const serializer = new XMLSerializer()
    const newDocXml = serializer.serializeToString(documentXml)
    zip.file('word/document.xml', newDocXml)
  }

  // Apply fixes to styles.xml
  if (stylesXml) {
    fixFontsInStyles(stylesXml, issues, fixedIssues)
    fixLineSpacingInStyles(stylesXml, issues, fixedIssues)
    fixParagraphSpacingInStyles(stylesXml, issues, fixedIssues)

    const serializer = new XMLSerializer()
    const newStylesXml = serializer.serializeToString(stylesXml)
    zip.file('word/styles.xml', newStylesXml)
  }

  // Generate the fixed .docx file
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  return { blob, fixedIssues }
}

/**
 * Download the fixed document
 */
export function downloadFixedDoc(blob, originalFileName) {
  const baseName = originalFileName.replace(/\.docx$/i, '')
  const fixedName = `${baseName}_formatted.docx`
  saveAs(blob, fixedName)
}

// ===== Fix Functions =====

/**
 * Fix page margins in all sections
 */
function fixMargins(doc, issues, fixedIssues) {
  const marginIssues = issues.filter(i => i.fixData?.type === 'margin')
  if (marginIssues.length === 0) return

  const sectPrs = doc.getElementsByTagNameNS(W_NS, 'sectPr')
  
  for (let i = 0; i < sectPrs.length; i++) {
    const sectPr = sectPrs[i]
    let pgMar = sectPr.getElementsByTagNameNS(W_NS, 'pgMar')[0]
    
    if (!pgMar) {
      // Create pgMar element if it doesn't exist
      pgMar = doc.createElementNS(W_NS, 'w:pgMar')
      sectPr.appendChild(pgMar)
    }

    // Set all margins to standard values
    const std = STANDARDS.margins
    setAttr(pgMar, 'w:top', String(std.top.value))
    setAttr(pgMar, 'w:bottom', String(std.bottom.value))
    setAttr(pgMar, 'w:left', String(std.left.value))
    setAttr(pgMar, 'w:right', String(std.right.value))
  }

  for (const issue of marginIssues) {
    fixedIssues.push({
      ...issue,
      fixed: true,
      fixDescription: `Changed to ${issue.fixData.side === 'left' ? '4 cm' : '3 cm'}`,
    })
  }
}

/**
 * Fix paper size in all sections
 */
function fixPaperSize(doc, issues, fixedIssues) {
  const paperIssues = issues.filter(i => i.fixData?.type === 'paperSize')
  if (paperIssues.length === 0) return

  const sectPrs = doc.getElementsByTagNameNS(W_NS, 'sectPr')
  
  for (let i = 0; i < sectPrs.length; i++) {
    const sectPr = sectPrs[i]
    let pgSz = sectPr.getElementsByTagNameNS(W_NS, 'pgSz')[0]
    
    if (!pgSz) {
      pgSz = doc.createElementNS(W_NS, 'w:pgSz')
      sectPr.appendChild(pgSz)
    }

    setAttr(pgSz, 'w:w', String(STANDARDS.paperSize.width))
    setAttr(pgSz, 'w:h', String(STANDARDS.paperSize.height))
  }

  for (const issue of paperIssues) {
    fixedIssues.push({
      ...issue,
      fixed: true,
      fixDescription: `Changed to A4 (${STANDARDS.paperSize.width}x${STANDARDS.paperSize.height})`,
    })
  }
}

/**
 * Fix fonts in document.xml (all runs)
 */
function fixFontsInDocument(doc, issues, fixedIssues) {
  const fontFamilyIssues = issues.filter(i => i.fixData?.type === 'fontFamily')
  const fontSizeIssues = issues.filter(i => i.fixData?.type === 'fontSize')
  
  if (fontFamilyIssues.length === 0 && fontSizeIssues.length === 0) return

  const std = STANDARDS.font

  // Fix all run properties in the document
  const allRPr = doc.getElementsByTagNameNS(W_NS, 'rPr')
  
  for (let i = 0; i < allRPr.length; i++) {
    const rPr = allRPr[i]
    
    // Fix font family
    if (fontFamilyIssues.length > 0) {
      let rFonts = rPr.getElementsByTagNameNS(W_NS, 'rFonts')[0]
      if (rFonts) {
        // Update existing rFonts
        setAttr(rFonts, 'w:ascii', std.family)
        setAttr(rFonts, 'w:hAnsi', std.family)
        setAttr(rFonts, 'w:cs', std.family)
      }
    }

    // Fix font size
    if (fontSizeIssues.length > 0) {
      let sz = rPr.getElementsByTagNameNS(W_NS, 'sz')[0]
      if (sz) {
        setAttr(sz, 'w:val', String(std.sizeHalfPoints))
      }
      
      let szCs = rPr.getElementsByTagNameNS(W_NS, 'szCs')[0]
      if (szCs) {
        setAttr(szCs, 'w:val', String(std.sizeHalfPoints))
      }
    }
  }

  for (const issue of fontFamilyIssues) {
    fixedIssues.push({
      ...issue,
      fixed: true,
      fixDescription: `Changed to ${std.family}`,
    })
  }
  for (const issue of fontSizeIssues) {
    fixedIssues.push({
      ...issue,
      fixed: true,
      fixDescription: `Changed to ${std.size}pt`,
    })
  }
}

/**
 * Fix fonts in styles.xml
 */
function fixFontsInStyles(doc, issues, fixedIssues) {
  const fontFamilyIssues = issues.filter(i => i.fixData?.type === 'fontFamily')
  const fontSizeIssues = issues.filter(i => i.fixData?.type === 'fontSize')
  
  if (fontFamilyIssues.length === 0 && fontSizeIssues.length === 0) return

  const std = STANDARDS.font

  // Fix document defaults
  const docDefaults = doc.getElementsByTagNameNS(W_NS, 'docDefaults')[0]
  if (docDefaults) {
    const rPrDefault = docDefaults.getElementsByTagNameNS(W_NS, 'rPrDefault')[0]
    if (rPrDefault) {
      const rPr = rPrDefault.getElementsByTagNameNS(W_NS, 'rPr')[0]
      if (rPr) {
        fixRunPropertiesFont(doc, rPr, fontFamilyIssues.length > 0, fontSizeIssues.length > 0, std)
      }
    }
  }

  // Fix all style definitions
  const styles = doc.getElementsByTagNameNS(W_NS, 'style')
  for (let i = 0; i < styles.length; i++) {
    const style = styles[i]
    const rPr = style.getElementsByTagNameNS(W_NS, 'rPr')[0]
    if (rPr) {
      fixRunPropertiesFont(doc, rPr, fontFamilyIssues.length > 0, fontSizeIssues.length > 0, std)
    }
  }
}

/**
 * Fix font properties in a single rPr element
 */
function fixRunPropertiesFont(doc, rPr, fixFamily, fixSize, std) {
  if (fixFamily) {
    let rFonts = rPr.getElementsByTagNameNS(W_NS, 'rFonts')[0]
    if (rFonts) {
      setAttr(rFonts, 'w:ascii', std.family)
      setAttr(rFonts, 'w:hAnsi', std.family)
      setAttr(rFonts, 'w:cs', std.family)
      // Also set eastAsia if it exists
      if (rFonts.getAttribute('w:eastAsia') || rFonts.getAttributeNS(W_NS, 'eastAsia')) {
        setAttr(rFonts, 'w:eastAsia', std.family)
      }
    }
  }

  if (fixSize) {
    let sz = rPr.getElementsByTagNameNS(W_NS, 'sz')[0]
    if (sz) {
      setAttr(sz, 'w:val', String(std.sizeHalfPoints))
    }
    let szCs = rPr.getElementsByTagNameNS(W_NS, 'szCs')[0]
    if (szCs) {
      setAttr(szCs, 'w:val', String(std.sizeHalfPoints))
    }
  }
}

/**
 * Fix line spacing in document.xml
 */
function fixLineSpacingInDocument(doc, issues, fixedIssues) {
  const spacingIssues = issues.filter(i => i.fixData?.type === 'lineSpacing')
  if (spacingIssues.length === 0) return

  const std = STANDARDS.lineSpacing
  const allSpacing = doc.getElementsByTagNameNS(W_NS, 'spacing')
  
  for (let i = 0; i < allSpacing.length; i++) {
    const spacing = allSpacing[i]
    // Only fix if parent is pPr (paragraph property), not rPr
    if (spacing.parentElement?.localName === 'pPr' || spacing.parentNode?.localName === 'pPr') {
      setAttr(spacing, 'w:line', String(std.value))
      setAttr(spacing, 'w:lineRule', 'auto')
    }
  }
}

/**
 * Fix line spacing in styles.xml
 */
function fixLineSpacingInStyles(doc, issues, fixedIssues) {
  const spacingIssues = issues.filter(i => i.fixData?.type === 'lineSpacing')
  if (spacingIssues.length === 0) return

  const std = STANDARDS.lineSpacing
  const allSpacing = doc.getElementsByTagNameNS(W_NS, 'spacing')
  
  for (let i = 0; i < allSpacing.length; i++) {
    const spacing = allSpacing[i]
    if (spacing.parentElement?.localName === 'pPr' || spacing.parentNode?.localName === 'pPr') {
      setAttr(spacing, 'w:line', String(std.value))
      setAttr(spacing, 'w:lineRule', 'auto')
    }
  }

  for (const issue of spacingIssues) {
    fixedIssues.push({
      ...issue,
      fixed: true,
      fixDescription: `Changed to ${std.label} spacing`,
    })
  }
}

/**
 * Fix paragraph before/after spacing in document.xml
 */
function fixParagraphSpacingInDocument(doc, issues, fixedIssues) {
  const paraSpacingIssues = issues.filter(i => i.fixData?.type === 'paragraphSpacing')
  if (paraSpacingIssues.length === 0) return

  const allSpacing = doc.getElementsByTagNameNS(W_NS, 'spacing')
  
  for (let i = 0; i < allSpacing.length; i++) {
    const spacing = allSpacing[i]
    if (spacing.parentElement?.localName === 'pPr' || spacing.parentNode?.localName === 'pPr') {
      setAttr(spacing, 'w:before', '0')
      setAttr(spacing, 'w:after', '0')
    }
  }
}

/**
 * Fix paragraph before/after spacing in styles.xml
 */
function fixParagraphSpacingInStyles(doc, issues, fixedIssues) {
  const paraSpacingIssues = issues.filter(i => i.fixData?.type === 'paragraphSpacing')
  if (paraSpacingIssues.length === 0) return

  const allSpacing = doc.getElementsByTagNameNS(W_NS, 'spacing')
  
  for (let i = 0; i < allSpacing.length; i++) {
    const spacing = allSpacing[i]
    if (spacing.parentElement?.localName === 'pPr' || spacing.parentNode?.localName === 'pPr') {
      setAttr(spacing, 'w:before', '0')
      setAttr(spacing, 'w:after', '0')
    }
  }

  for (const issue of paraSpacingIssues) {
    fixedIssues.push({
      ...issue,
      fixed: true,
      fixDescription: `Changed to 0pt`,
    })
  }
}

// ===== Helpers =====

/**
 * Set attribute on an element, trying w: namespace prefix first
 */
function setAttr(el, attrName, value) {
  // Try removing namespaced version first, then set with prefix
  const localName = attrName.replace('w:', '')
  
  // Check if attribute exists with namespace
  if (el.hasAttributeNS(W_NS, localName)) {
    el.setAttributeNS(W_NS, attrName, value)
  } else if (el.hasAttribute(attrName)) {
    el.setAttribute(attrName, value)
  } else {
    // Default: set with w: prefix
    el.setAttribute(attrName, value)
  }
}
