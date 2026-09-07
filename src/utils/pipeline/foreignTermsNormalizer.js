/**
 * ============================================================================
 * STAGE 6: FOREIGN TERMS NORMALIZER (Auto-Italicize English & Latin Terms)
 * ============================================================================
 *
 * Automatically detects English, Latin, and technical loanwords that are
 * required to be written in italics according to Telkom University thesis
 * guidelines and Indonesian academic writing rules (PUEBI / EYD V).
 *
 * It safely inspects text runs (<w:r>) in body paragraphs, detects terms
 * that are currently NOT in italic, and wraps them in dedicated <w:r>
 * elements with <w:i/> and <w:iCs/>, while preserving all existing
 * formatting (font family, font size, bold, color).
 *
 * Safety Guards:
 *   - Skips English ABSTRACT section (where the whole text is English).
 *   - Skips code blocks, URLs, emails, and file paths.
 *   - Skips runs that are already italicized (<w:i/> present and not false).
 *   - Skips paragraphs with complex structures (drawings, hyperlinks, tables).
 *   - Uses word boundaries (\b) so Indonesian words are never broken.
 *   - Multi-word phrases are matched first before single-word terms.
 */

import { W_NS } from '../constants'

/**
 * Curated dictionary of foreign (English / Latin / Technical) terms commonly
 * used in academic papers and theses at Telkom University.
 * Ordered with multi-word terms first so longer phrases take precedence.
 */
export const FOREIGN_TERMS = [
  // --- Multi-word Academic, Latin & Research Methodology ---
  'et al.',
  'in vitro',
  'in vivo',
  'in silico',
  'status quo',
  'vice versa',
  'de facto',
  'de jure',
  'per se',
  'ad hoc',
  'ceteris paribus',
  'bona fide',
  'literature review',
  'state of the art',
  'ground truth',
  'case study',
  'focus group discussion',
  'in-depth interview',
  'purposive sampling',
  'snowball sampling',
  'stratified random sampling',
  'simple random sampling',
  'action research',
  'grounded theory',

  // --- Multi-word AI, Data Science & Computing ---
  'machine learning',
  'deep learning',
  'artificial intelligence',
  'data science',
  'data mining',
  'data warehouse',
  'data lake',
  'neural network',
  'neural networks',
  'convolutional neural network',
  'recurrent neural network',
  'cloud computing',
  'internet of things',
  'smart contract',
  'smart contracts',
  'blockchain',
  'natural language processing',
  'computer vision',
  'reinforcement learning',
  'supervised learning',
  'unsupervised learning',
  'transfer learning',
  'support vector machine',
  'random forest',
  'decision tree',
  'naive bayes',
  'k-nearest neighbor',
  'k-means clustering',
  'linear regression',
  'logistic regression',
  'principal component analysis',
  'feature extraction',
  'feature selection',
  'cross-validation',
  'hyperparameter tuning',
  'confusion matrix',
  'f1-score',
  'mean squared error',
  'root mean squared error',
  'loss function',
  'learning rate',
  'batch size',
  'fine-tuning',
  'zero-shot',
  'few-shot',

  // --- Multi-word Software Engineering, Web & Architecture ---
  'use case',
  'use case diagram',
  'activity diagram',
  'class diagram',
  'sequence diagram',
  'component diagram',
  'deployment diagram',
  'state machine diagram',
  'entity relationship diagram',
  'black box testing',
  'white box testing',
  'unit testing',
  'integration testing',
  'system testing',
  'user acceptance testing',
  'usability testing',
  'load testing',
  'stress testing',
  'penetration testing',
  'agile development',
  'scrum framework',
  'waterfall model',
  'continuous integration',
  'continuous deployment',
  'source code',
  'open source',
  'user interface',
  'user experience',
  'human computer interaction',
  'responsive web design',
  'single page application',
  'rest api',
  'microservices architecture',
  'object oriented programming',
  'relational database',
  'decision support system',
  'enterprise resource planning',
  'customer relationship management',
  'supply chain management',

  // --- Single-word Computing & Technical Terms ---
  'framework',
  'frameworks',
  'database',
  'databases',
  'frontend',
  'front-end',
  'backend',
  'back-end',
  'fullstack',
  'full-stack',
  'repository',
  'repositories',
  'endpoint',
  'endpoints',
  'middleware',
  'query',
  'queries',
  'payload',
  'payloads',
  'dataset',
  'datasets',
  'benchmark',
  'benchmarks',
  'wireframe',
  'wireframes',
  'mockup',
  'mockups',
  'prototype',
  'prototypes',
  'sprint',
  'sprints',
  'backlog',
  'backlogs',
  'debugging',
  'deployment',
  'testing',
  'hardware',
  'software',
  'freeware',
  'malware',
  'ransomware',
  'phishing',
  'firewall',
  'firewalls',
  'gateway',
  'gateways',
  'router',
  'routers',
  'bandwidth',
  'throughput',
  'latency',
  'packet',
  'packets',
  'runtime',
  'compiler',
  'compilers',
  'interpreter',
  'interpreters',
  'caching',
  'cache',
  'session',
  'sessions',
  'cookie',
  'cookies',
  'token',
  'tokens',
  'authentication',
  'authorization',
  'ciphertext',
  'plaintext',
  'hashing',
  'hash',
  'clustering',
  'classification',
  'regression',
  'epoch',
  'epochs',
  'dropout',
  'pooling',
  'embedding',
  'embeddings',
  'transformer',
  'transformers',
  'tokenization',
  'pipeline',
  'pipelines',
  'workflow',
  'workflows',
  'refactoring',
  'codebase',
  'stylesheet',
  'rendering',
  'markup',
  'online',
  'offline',
  'upload',
  'download',
  'login',
  'logout',
  'sign-in',
  'sign-out',
  'signup',
  'sign-up',
  'username',
  'password',
  'real-time',
  'realtime',
  'default',
  'tools',
  'error',
  'bug',
  'bugs',
  'input',
  'output',
  'feedback',
  'dashboard',
  'streaming',
  'responsive',
  'hybrid',
  'server-side',
  'client-side',
  'peer-to-peer',
  'overfitting',
  'underfitting',
  'hyperparameter',
  'hyperparameters',
  'devops',
]

/**
 * Escapes special characters in a string for use in RegExp.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Precompiled regex for foreign terms matching.
 * Uses word boundaries so that Indonesian words containing foreign substrings are not affected.
 */
function buildForeignTermsRegex() {
  const sorted = [...FOREIGN_TERMS].sort((a, b) => b.length - a.length)
  const pattern = sorted.map(escapeRegex).join('|')
  return new RegExp(`\\b(${pattern})\\b`, 'gi')
}

const FOREIGN_TERMS_REGEX = buildForeignTermsRegex()

/**
 * Check whether a run (<w:r>) already has italic formatting.
 *
 * @param {Element} r - The <w:r> DOM element or its rPr
 * @returns {boolean} True if the run is already formatted as italic
 */
export function isRunItalic(r) {
  if (!r) return false
  const rPr = r.tagName === 'w:rPr' ? r : r.getElementsByTagNameNS(W_NS, 'rPr')[0]
  if (!rPr) return false

  const iElem = rPr.getElementsByTagNameNS(W_NS, 'i')[0]
  if (!iElem) return false

  const val = iElem.getAttributeNS(W_NS, 'val') || iElem.getAttribute('w:val')
  return val !== '0' && val !== 'false'
}

/**
 * Check whether a paragraph is inside an English section (such as ABSTRACT).
 */
function isEnglishSectionHeader(text) {
  const trimmed = text.trim()
  return /^ABSTRACT$/i.test(trimmed)
}

function isIndonesianSectionHeader(text) {
  const trimmed = text.trim()
  return /^(ABSTRAK|BAB\s+[IVXLCDM\d]+|PENDAHULUAN|DAFTAR\s+)/i.test(trimmed)
}

/**
 * Checks if a paragraph should be protected from text reconstruction.
 */
function isProtectedParagraph(p) {
  // Table cells
  if (p.closest && p.closest('w\\:tc, tc')) return true
  // Contains drawings, charts, formulas, or hyperlinks
  if (p.getElementsByTagNameNS(W_NS, 'drawing').length > 0) return true
  if (p.getElementsByTagNameNS(W_NS, 'hyperlink').length > 0) return true
  if (p.getElementsByTagNameNS(W_NS, 'fldSimple').length > 0) return true
  return false
}

/**
 * Runs the Foreign Terms Normalizer on the Word document XML DOM.
 *
 * @param {Document} doc - parsed document.xml DOM
 * @returns {{
 *   applied: Array<{ type: string, detail: string }>,
 *   count: number,
 *   uniqueTerms: Array<string>
 * }}
 */
export function runForeignTermsNormalizer(doc) {
  const applied = []
  const uniqueTermsSet = new Set()
  let totalFixed = 0

  if (!doc) return { applied, count: 0, uniqueTerms: [] }

  const body = doc.getElementsByTagNameNS(W_NS, 'body')[0]
  if (!body) return { applied, count: 0, uniqueTerms: [] }

  const paragraphs = Array.from(doc.getElementsByTagNameNS(W_NS, 'p'))
  let isInsideEnglishAbstract = false

  for (const p of paragraphs) {
    // Check for section transitions
    const runs = Array.from(p.getElementsByTagNameNS(W_NS, 'r'))
    if (runs.length === 0) continue

    let paraText = ''
    for (const r of runs) {
      const ts = r.getElementsByTagNameNS(W_NS, 't')
      for (let j = 0; j < ts.length; j++) {
        paraText += ts[j].textContent || ''
      }
    }

    if (isEnglishSectionHeader(paraText)) {
      isInsideEnglishAbstract = true
      continue
    }

    if (isIndonesianSectionHeader(paraText)) {
      isInsideEnglishAbstract = false
    }

    if (isInsideEnglishAbstract) continue
    if (isProtectedParagraph(p)) continue

    // Process the paragraph
    const result = normalizeParagraphForeignTerms(doc, p, runs)
    if (result.fixedCount > 0) {
      totalFixed += result.fixedCount
      for (const term of result.terms) {
        uniqueTermsSet.add(term.toLowerCase())
      }
      applied.push({
        type: 'foreign_term_italic',
        detail: `Italicized ${result.fixedCount} foreign term(s) in paragraph (${result.terms.join(', ')})`,
      })
    }
  }

  return {
    applied,
    count: totalFixed,
    uniqueTerms: Array.from(uniqueTermsSet),
  }
}

/**
 * Normalizes foreign terms in a single paragraph by splitting and styling runs.
 */
function normalizeParagraphForeignTerms(doc, p, runs) {
  // Build segments tracking original formatting
  const segments = []
  for (const r of runs) {
    const texts = r.getElementsByTagNameNS(W_NS, 't')
    let text = ''
    for (let i = 0; i < texts.length; i++) {
      text += texts[i].textContent || ''
    }

    const rPr = r.getElementsByTagNameNS(W_NS, 'rPr')[0]
    segments.push({
      text,
      rPr: rPr ? rPr.cloneNode(true) : null,
      isItalic: isRunItalic(r),
    })
  }

  const fullText = segments.map(s => s.text).join('')
  if (!fullText) return { fixedCount: 0, terms: [] }

  // Quick check: does the paragraph contain any foreign terms?
  FOREIGN_TERMS_REGEX.lastIndex = 0
  if (!FOREIGN_TERMS_REGEX.test(fullText)) {
    return { fixedCount: 0, terms: [] }
  }

  // Build character-level map to know if each character was already italic
  const charMap = []
  for (let segIdx = 0; segIdx < segments.length; segIdx++) {
    const seg = segments[segIdx]
    for (let charIdx = 0; charIdx < seg.text.length; charIdx++) {
      charMap.push({
        segIdx,
        rPr: seg.rPr,
        isItalic: seg.isItalic,
      })
    }
  }

  // Find all matches in fullText
  FOREIGN_TERMS_REGEX.lastIndex = 0
  const matches = []
  let match

  while ((match = FOREIGN_TERMS_REGEX.exec(fullText)) !== null) {
    const start = match.index
    const end = match.index + match[0].length
    const term = match[0]

    // Check if any character in this match is NOT italic yet
    let hasNonItalicChar = false
    for (let idx = start; idx < end; idx++) {
      if (charMap[idx] && !charMap[idx].isItalic) {
        hasNonItalicChar = true
        break
      }
    }

    if (hasNonItalicChar) {
      matches.push({ start, end, term })
    }
  }

  if (matches.length === 0) {
    return { fixedCount: 0, terms: [] }
  }

  // Deduplicate / handle overlapping matches (longer match wins)
  const nonOverlapping = []
  let lastEnd = 0
  for (const m of matches) {
    if (m.start >= lastEnd) {
      nonOverlapping.push(m)
      lastEnd = m.end
    }
  }

  // Tokenize text into alternating plain and foreign spans
  const tokens = []
  let cursor = 0
  const termsFixed = []

  for (const m of nonOverlapping) {
    if (cursor < m.start) {
      tokens.push({
        text: fullText.slice(cursor, m.start),
        isForeign: false,
        pos: cursor,
      })
    }
    tokens.push({
      text: fullText.slice(m.start, m.end),
      isForeign: true,
      pos: m.start,
    })
    termsFixed.push(m.term)
    cursor = m.end
  }

  if (cursor < fullText.length) {
    tokens.push({
      text: fullText.slice(cursor),
      isForeign: false,
      pos: cursor,
    })
  }

  // Remove old runs from paragraph
  for (const r of runs) {
    p.removeChild(r)
  }

  // Append new runs
  for (const token of tokens) {
    if (!token.text) continue

    const newRun = doc.createElementNS(W_NS, 'w:r')
    const baseInfo = charMap[token.pos] || (segments[0] ? { rPr: segments[0].rPr } : { rPr: null })

    const newRPr = baseInfo.rPr
      ? baseInfo.rPr.cloneNode(true)
      : doc.createElementNS(W_NS, 'w:rPr')

    if (token.isForeign) {
      ensureItalic(doc, newRPr)
    }

    if (newRPr.childNodes.length > 0) {
      newRun.appendChild(newRPr)
    }

    const newT = doc.createElementNS(W_NS, 'w:t')
    newT.setAttribute('xml:space', 'preserve')
    newT.textContent = token.text
    newRun.appendChild(newT)

    p.appendChild(newRun)
  }

  return {
    fixedCount: nonOverlapping.length,
    terms: termsFixed,
  }
}

/**
 * Ensures <w:i/> and <w:iCs/> exist in <w:rPr>.
 */
function ensureItalic(doc, rPr) {
  let iElem = rPr.getElementsByTagNameNS(W_NS, 'i')[0]
  if (!iElem) {
    iElem = doc.createElementNS(W_NS, 'w:i')
    rPr.appendChild(iElem)
  } else {
    iElem.removeAttribute('w:val')
    iElem.removeAttributeNS(W_NS, 'val')
  }

  let iCsElem = rPr.getElementsByTagNameNS(W_NS, 'iCs')[0]
  if (!iCsElem) {
    iCsElem = doc.createElementNS(W_NS, 'w:iCs')
    rPr.appendChild(iCsElem)
  } else {
    iCsElem.removeAttribute('w:val')
    iCsElem.removeAttributeNS(W_NS, 'val')
  }
}
