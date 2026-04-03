/**
 * DOCX Parser — Extracts formatting properties from .docx files
 * 
 * .docx files are ZIP archives containing XML files.
 * Key files:
 *   - word/document.xml  → Main content, section properties
 *   - word/styles.xml    → Style definitions (Normal, Heading, etc.)
 *   - word/settings.xml  → Document settings
 */

import JSZip from 'jszip'
import { W_NS, CM_TO_TWIPS } from './constants'

/**
 * Parse a .docx File object and extract all formatting data
 * @param {File} file - The uploaded .docx file
 * @returns {Object} Parsed document data
 */
export async function parseDocx(file) {
  const arrayBuffer = await file.arrayBuffer()

  // Validate ZIP magic bytes (PK = 0x50 0x4B)
  const header = new Uint8Array(arrayBuffer.slice(0, 4))
  if (header[0] !== 0x50 || header[1] !== 0x4B) {
    throw new Error(
      'Invalid file format. The uploaded file is not a valid .docx document. ' +
      'Please make sure you are uploading a Microsoft Word (.docx) file.'
    )
  }

  const zip = await JSZip.loadAsync(arrayBuffer)

  // Verify it contains word/document.xml (essential for .docx)
  if (!zip.file('word/document.xml')) {
    throw new Error(
      'The uploaded ZIP file does not contain a valid Word document structure. ' +
      'Please upload a .docx file created with Microsoft Word or compatible software.'
    )
  }

  // Store the zip for later modification
  const result = {
    zip,
    fileName: file.name,
    fileSize: file.size,
    sections: [],
    paragraphs: [],
    runs: [],
    styles: {},
    defaultStyle: null,
    documentXml: null,
    stylesXml: null,
    documentXmlString: null,
    stylesXmlString: null,
  }

  // Parse document.xml
  const docXmlFile = zip.file('word/document.xml')
  if (docXmlFile) {
    result.documentXmlString = await docXmlFile.async('string')
    const parser = new DOMParser()
    result.documentXml = parser.parseFromString(result.documentXmlString, 'text/xml')
    
    extractSections(result)
    extractParagraphs(result)
  }

  // Parse styles.xml
  const stylesXmlFile = zip.file('word/styles.xml')
  if (stylesXmlFile) {
    result.stylesXmlString = await stylesXmlFile.async('string')
    const parser = new DOMParser()
    result.stylesXml = parser.parseFromString(result.stylesXmlString, 'text/xml')
    
    extractStyles(result)
  }

  return result
}

/**
 * Extract section properties (margins, paper size) from document.xml
 */
function extractSections(result) {
  const doc = result.documentXml
  const body = doc.getElementsByTagNameNS(W_NS, 'body')[0]
  if (!body) return

  // Get all sectPr elements (sections)
  const sectPrs = doc.getElementsByTagNameNS(W_NS, 'sectPr')
  
  for (let i = 0; i < sectPrs.length; i++) {
    const sectPr = sectPrs[i]
    const section = { index: i }

    // Page margins
    const pgMar = sectPr.getElementsByTagNameNS(W_NS, 'pgMar')[0]
    if (pgMar) {
      section.margins = {
        top: parseInt(pgMar.getAttributeNS(W_NS, 'top') || pgMar.getAttribute('w:top') || '0'),
        bottom: parseInt(pgMar.getAttributeNS(W_NS, 'bottom') || pgMar.getAttribute('w:bottom') || '0'),
        left: parseInt(pgMar.getAttributeNS(W_NS, 'left') || pgMar.getAttribute('w:left') || '0'),
        right: parseInt(pgMar.getAttributeNS(W_NS, 'right') || pgMar.getAttribute('w:right') || '0'),
        header: parseInt(pgMar.getAttributeNS(W_NS, 'header') || pgMar.getAttribute('w:header') || '0'),
        footer: parseInt(pgMar.getAttributeNS(W_NS, 'footer') || pgMar.getAttribute('w:footer') || '0'),
      }
    }

    // Page size
    const pgSz = sectPr.getElementsByTagNameNS(W_NS, 'pgSz')[0]
    if (pgSz) {
      section.pageSize = {
        width: parseInt(pgSz.getAttributeNS(W_NS, 'w') || pgSz.getAttribute('w:w') || '0'),
        height: parseInt(pgSz.getAttributeNS(W_NS, 'h') || pgSz.getAttribute('w:h') || '0'),
      }
    }

    result.sections.push(section)
  }
}

/**
 * Extract paragraph properties (spacing, alignment, fonts)
 */
function extractParagraphs(result) {
  const doc = result.documentXml
  const paragraphs = doc.getElementsByTagNameNS(W_NS, 'p')

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i]
    const paraData = { index: i, properties: {}, runs: [] }

    // Paragraph properties
    const pPr = p.getElementsByTagNameNS(W_NS, 'pPr')[0]
    if (pPr) {
      // Style reference
      const pStyle = pPr.getElementsByTagNameNS(W_NS, 'pStyle')[0]
      if (pStyle) {
        paraData.properties.styleId = pStyle.getAttributeNS(W_NS, 'val') || pStyle.getAttribute('w:val')
      }

      // Alignment (justification)
      const jc = pPr.getElementsByTagNameNS(W_NS, 'jc')[0]
      if (jc) {
        paraData.properties.alignment = jc.getAttributeNS(W_NS, 'val') || jc.getAttribute('w:val')
      }

      // Spacing
      const spacing = pPr.getElementsByTagNameNS(W_NS, 'spacing')[0]
      if (spacing) {
        paraData.properties.spacing = {
          line: parseInt(spacing.getAttributeNS(W_NS, 'line') || spacing.getAttribute('w:line') || '0'),
          lineRule: spacing.getAttributeNS(W_NS, 'lineRule') || spacing.getAttribute('w:lineRule') || '',
          before: parseInt(spacing.getAttributeNS(W_NS, 'before') || spacing.getAttribute('w:before') || '0'),
          after: parseInt(spacing.getAttributeNS(W_NS, 'after') || spacing.getAttribute('w:after') || '0'),
        }
      }

      // Run properties at paragraph level
      const rPr = pPr.getElementsByTagNameNS(W_NS, 'rPr')[0]
      if (rPr) {
        paraData.properties.runProperties = extractRunProperties(rPr)
      }
    }

    // Extract text runs
    const runs = p.getElementsByTagNameNS(W_NS, 'r')
    for (let j = 0; j < runs.length; j++) {
      const r = runs[j]
      const runData = { index: j, paraIndex: i }

      // Get text content
      const texts = r.getElementsByTagNameNS(W_NS, 't')
      runData.text = ''
      for (let k = 0; k < texts.length; k++) {
        runData.text += texts[k].textContent || ''
      }

      // Run properties
      const rPr = r.getElementsByTagNameNS(W_NS, 'rPr')[0]
      if (rPr) {
        runData.properties = extractRunProperties(rPr)
      }

      paraData.runs.push(runData)
      result.runs.push(runData)
    }

    // Extract full paragraph text
    paraData.text = paraData.runs.map(r => r.text).join('')
    
    result.paragraphs.push(paraData)
  }
}

/**
 * Extract run (character-level) properties
 */
function extractRunProperties(rPr) {
  const props = {}

  // Font family
  const rFonts = rPr.getElementsByTagNameNS(W_NS, 'rFonts')[0]
  if (rFonts) {
    props.fontFamily = 
      rFonts.getAttributeNS(W_NS, 'ascii') || rFonts.getAttribute('w:ascii') ||
      rFonts.getAttributeNS(W_NS, 'hAnsi') || rFonts.getAttribute('w:hAnsi') ||
      rFonts.getAttributeNS(W_NS, 'cs') || rFonts.getAttribute('w:cs') || null
    props.fontFamilyEastAsia = 
      rFonts.getAttributeNS(W_NS, 'eastAsia') || rFonts.getAttribute('w:eastAsia') || null
  }

  // Font size (in half-points)
  const sz = rPr.getElementsByTagNameNS(W_NS, 'sz')[0]
  if (sz) {
    props.fontSize = parseInt(sz.getAttributeNS(W_NS, 'val') || sz.getAttribute('w:val') || '0')
    props.fontSizePt = props.fontSize / 2
  }

  const szCs = rPr.getElementsByTagNameNS(W_NS, 'szCs')[0]
  if (szCs) {
    props.fontSizeCs = parseInt(szCs.getAttributeNS(W_NS, 'val') || szCs.getAttribute('w:val') || '0')
  }

  // Bold
  const b = rPr.getElementsByTagNameNS(W_NS, 'b')[0]
  if (b) {
    const val = b.getAttributeNS(W_NS, 'val') || b.getAttribute('w:val')
    props.bold = val !== '0' && val !== 'false'
  }

  // Italic
  const i = rPr.getElementsByTagNameNS(W_NS, 'i')[0]
  if (i) {
    const val = i.getAttributeNS(W_NS, 'val') || i.getAttribute('w:val')
    props.italic = val !== '0' && val !== 'false'
  }

  return props
}

/**
 * Extract style definitions from styles.xml
 */
function extractStyles(result) {
  const doc = result.stylesXml
  if (!doc) return

  // Document defaults
  const docDefaults = doc.getElementsByTagNameNS(W_NS, 'docDefaults')[0]
  if (docDefaults) {
    const rPrDefault = docDefaults.getElementsByTagNameNS(W_NS, 'rPrDefault')[0]
    if (rPrDefault) {
      const rPr = rPrDefault.getElementsByTagNameNS(W_NS, 'rPr')[0]
      if (rPr) {
        result.defaultStyle = extractRunProperties(rPr)
      }
    }
  }

  // Named styles
  const styles = doc.getElementsByTagNameNS(W_NS, 'style')
  for (let i = 0; i < styles.length; i++) {
    const style = styles[i]
    const styleId = style.getAttributeNS(W_NS, 'styleId') || style.getAttribute('w:styleId')
    const type = style.getAttributeNS(W_NS, 'type') || style.getAttribute('w:type')
    
    if (!styleId) continue

    const styleData = { id: styleId, type }

    // Style name
    const name = style.getElementsByTagNameNS(W_NS, 'name')[0]
    if (name) {
      styleData.name = name.getAttributeNS(W_NS, 'val') || name.getAttribute('w:val')
    }

    // Default style?
    const isDefault = style.getAttributeNS(W_NS, 'default') || style.getAttribute('w:default')
    styleData.isDefault = isDefault === '1' || isDefault === 'true'

    // Run properties
    const rPr = style.getElementsByTagNameNS(W_NS, 'rPr')[0]
    if (rPr) {
      styleData.runProperties = extractRunProperties(rPr)
    }

    // Paragraph properties
    const pPr = style.getElementsByTagNameNS(W_NS, 'pPr')[0]
    if (pPr) {
      styleData.paragraphProperties = {}
      
      const spacing = pPr.getElementsByTagNameNS(W_NS, 'spacing')[0]
      if (spacing) {
        styleData.paragraphProperties.spacing = {
          line: parseInt(spacing.getAttributeNS(W_NS, 'line') || spacing.getAttribute('w:line') || '0'),
          lineRule: spacing.getAttributeNS(W_NS, 'lineRule') || spacing.getAttribute('w:lineRule') || '',
          before: parseInt(spacing.getAttributeNS(W_NS, 'before') || spacing.getAttribute('w:before') || '0'),
          after: parseInt(spacing.getAttributeNS(W_NS, 'after') || spacing.getAttribute('w:after') || '0'),
        }
      }

      const jc = pPr.getElementsByTagNameNS(W_NS, 'jc')[0]
      if (jc) {
        styleData.paragraphProperties.alignment = jc.getAttributeNS(W_NS, 'val') || jc.getAttribute('w:val')
      }
    }

    result.styles[styleId] = styleData
  }
}

/**
 * Convert twips to cm for display
 */
export function twipsToCm(twips) {
  return (twips / CM_TO_TWIPS).toFixed(2)
}

/**
 * Convert half-points to pt for display
 */
export function halfPointsToPt(hp) {
  return hp / 2
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
