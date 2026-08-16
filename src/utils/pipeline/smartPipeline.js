/**
 * ============================================================================
 * SMART PIPELINE ORCHESTRATOR
 * ============================================================================
 *
 * Coordinates the 4-stage formatting pipeline in sequence:
 *
 *   Stage 1: Syntax Parser     — Markdown → Word formatting
 *   Stage 2: Noise Cleaner     — Remove visual noise
 *   Stage 3: Structure Normalizer — Fix numbering & structure
 *   Stage 4: Global Layout     — Alignment, indent, fonts, spacing
 *
 * Each stage operates on the same XML DOM object (in-place mutation).
 * The orchestrator collects transformation logs from all stages and
 * returns a unified summary.
 *
 * This module replaces the direct call to fixFormatting() in the UI.
 * It runs the pipeline stages first, THEN runs the existing format fixer
 * for XML-level property fixes (margins, fonts, spacing).
 *
 * Dependencies:
 *   - syntaxParser.js   (Stage 1)
 *   - noiseCleaner.js   (Stage 2)
 *   - structureNormalizer.js (Stage 3)
 *   - formatFixer.js    (existing — Stage 4 property fixes)
 */

import { runSyntaxParser } from './syntaxParser'
import { runNoiseCleaner } from './noiseCleaner'
import { runStructureNormalizer } from './structureNormalizer'
import { applyGlobalLayout } from './globalLayout'

/**
 * @typedef {Object} PipelineResult
 * @property {Array<{stage: string, type: string, detail: string}>} transformationLog
 *   Ordered list of all transformations applied across all stages.
 * @property {Array<{stage: string, type: string, detail: string}>} warnings
 *   Non-fatal issues detected but not auto-fixed.
 * @property {{ syntax: number, noise: number, structure: number, layout: number }} counts
 *   Count of transformations per stage.
 */

/**
 * Run the full smart formatting pipeline on a parsed document.
 *
 * This should be called BEFORE fixFormatting() so that text-level changes
 * (markdown parsing, noise removal) happen before XML property fixes
 * (fonts, margins, spacing).
 *
 * @param {Object} parsedDoc - Output from parseDocx()
 * @returns {PipelineResult} Pipeline results with transformation log
 */
export function runSmartPipeline(parsedDoc) {
  const { documentXml } = parsedDoc
  const transformationLog = []
  const warnings = []
  const counts = { syntax: 0, noise: 0, structure: 0, layout: 0 }

  if (!documentXml) {
    return { transformationLog, warnings, counts }
  }

  // ========================================================================
  // STAGE 1: SYNTAX PARSER (Prioritas 1)
  // ========================================================================
  try {
    const syntaxResult = runSyntaxParser(documentXml)

    for (const t of syntaxResult.transformations) {
      transformationLog.push({ stage: 'Syntax Parser', ...t })
    }
    counts.syntax = syntaxResult.transformations.length
  } catch (err) {
    console.error('[SmartPipeline] Stage 1 (Syntax Parser) error:', err)
    warnings.push({
      stage: 'Syntax Parser',
      type: 'error',
      detail: `Stage 1 failed: ${err.message}`,
    })
  }

  // ========================================================================
  // STAGE 2: NOISE CLEANER (Prioritas 2)
  // ========================================================================
  try {
    const noiseResult = runNoiseCleaner(documentXml)

    for (const r of noiseResult.removed) {
      transformationLog.push({
        stage: 'Noise Cleaner',
        type: r.type,
        detail: `Removed ${r.type}: "${r.text}"`,
      })
    }
    for (const c of noiseResult.cleaned) {
      transformationLog.push({ stage: 'Noise Cleaner', ...c })
    }
    for (const w of noiseResult.warnings) {
      warnings.push({
        stage: 'Noise Cleaner',
        type: w.type,
        detail: `Suspicious content: "${w.text}"`,
      })
    }
    counts.noise = noiseResult.removed.length + noiseResult.cleaned.length
  } catch (err) {
    console.error('[SmartPipeline] Stage 2 (Noise Cleaner) error:', err)
    warnings.push({
      stage: 'Noise Cleaner',
      type: 'error',
      detail: `Stage 2 failed: ${err.message}`,
    })
  }

  // ========================================================================
  // STAGE 3: STRUCTURE NORMALIZER (Prioritas 3)
  // ========================================================================
  try {
    const structureResult = runStructureNormalizer(documentXml)

    for (const n of structureResult.normalized) {
      transformationLog.push({ stage: 'Structure Normalizer', ...n })
    }
    for (const w of structureResult.warnings) {
      warnings.push({ stage: 'Structure Normalizer', ...w })
    }
    counts.structure = structureResult.normalized.length
  } catch (err) {
    console.error('[SmartPipeline] Stage 3 (Structure Normalizer) error:', err)
    warnings.push({
      stage: 'Structure Normalizer',
      type: 'error',
      detail: `Stage 3 failed: ${err.message}`,
    })
  }

  // ========================================================================
  // STAGE 4: GLOBAL LAYOUT (Prioritas 4)
  // ========================================================================
  try {
    const layoutResult = applyGlobalLayout(documentXml)

    for (const l of layoutResult.applied) {
      transformationLog.push({ stage: 'Global Layout', ...l })
    }
    counts.layout = layoutResult.applied.length
  } catch (err) {
    console.error('[SmartPipeline] Stage 4 (Global Layout) error:', err)
    warnings.push({
      stage: 'Global Layout',
      type: 'error',
      detail: `Stage 4 failed: ${err.message}`,
    })
  }

  return { transformationLog, warnings, counts }
}

/**
 * Get a human-readable summary of pipeline results.
 *
 * @param {PipelineResult} result - Output from runSmartPipeline()
 * @returns {string} Summary text
 */
export function getPipelineSummary(result) {
  const parts = []

  if (result.counts.syntax > 0) {
    parts.push(`${result.counts.syntax} syntax transformation(s)`)
  }
  if (result.counts.noise > 0) {
    parts.push(`${result.counts.noise} noise cleanup(s)`)
  }
  if (result.counts.structure > 0) {
    parts.push(`${result.counts.structure} structure normalization(s)`)
  }
  if (result.counts.layout > 0) {
    parts.push(`${result.counts.layout} layout rule(s) applied`)
  }

  if (parts.length === 0) {
    return 'No smart formatting changes needed.'
  }

  return `Applied: ${parts.join(', ')}.`
}
