import { useState, useEffect, useRef, useCallback } from 'react'
import { parseDocx } from '../utils/docxParser'
import { checkFormatting } from '../utils/formatChecker'

const SCAN_PHASES = [
  { text: 'Extracting document structure...', icon: '📄', progress: 10 },
  { text: 'Parsing XML content...', icon: '🔍', progress: 25 },
  { text: 'Checking page margins (4-3-3-3)...', icon: '📐', progress: 40 },
  { text: 'Validating font styles & sizes...', icon: '🔤', progress: 55 },
  { text: 'Analyzing line spacing...', icon: '📏', progress: 70 },
  { text: 'Checking paragraph formatting...', icon: '📊', progress: 85 },
  { text: 'Generating format report...', icon: '✨', progress: 95 },
]

export default function ScanningState({ file, onComplete }) {
  const [phase, setPhase] = useState(0)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const onCompleteRef = useRef(onComplete)

  // Keep callback ref fresh without triggering re-runs
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  // Run the actual scan
  useEffect(() => {
    if (!file) return

    let cancelled = false
    let phaseTimer = null

    setPhase(0)
    setProgress(10)
    setError(null)

    async function runScan() {
      try {
        // Start visual phase advancement
        phaseTimer = setInterval(() => {
          if (cancelled) return
          setPhase((prev) => {
            if (prev < 2) return prev + 1
            return prev
          })
        }, 800)

        // Actually parse the document
        const parsedDoc = await parseDocx(file)

        if (cancelled) return

        // Stop the interval, proceed with checking phases
        clearInterval(phaseTimer)
        phaseTimer = null

        setPhase(3)
        setProgress(55)
        await delay(500)
        if (cancelled) return

        setPhase(4)
        setProgress(70)

        // Actually run the format checker
        const scanResult = checkFormatting(parsedDoc)

        await delay(400)
        if (cancelled) return

        setPhase(5)
        setProgress(85)

        await delay(400)
        if (cancelled) return

        setPhase(6)
        setProgress(95)

        await delay(500)
        if (cancelled) return

        setProgress(100)

        await delay(400)
        if (cancelled) return

        // Complete!
        onCompleteRef.current(parsedDoc, scanResult)
      } catch (err) {
        console.error('Scan error:', err)
        if (!cancelled) {
          clearInterval(phaseTimer)
          setError(`Failed to parse document: ${err.message}`)
        }
      }
    }

    runScan()

    return () => {
      cancelled = true
      if (phaseTimer) clearInterval(phaseTimer)
    }
  }, [file]) // Only depend on file, use ref for callback

  // Sync progress with phase (only when phase changes from interval)
  useEffect(() => {
    if (phase < SCAN_PHASES.length && phase <= 2) {
      setProgress(SCAN_PHASES[phase].progress)
    }
  }, [phase])

  if (error) {
    return (
      <div className="fade-enter w-full max-w-xl mx-auto text-center">
        <div className="glass-dark rounded-2xl p-8">
          <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">❌</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Scan Failed</h2>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <p className="text-gray-500 text-xs">
            Make sure you are uploading a valid <strong>.docx</strong> file (Microsoft Word format).
            <br />PDF, .doc (old format), and other file types are not supported.
          </p>
        </div>
      </div>
    )
  }

  const currentPhase = Math.min(phase, SCAN_PHASES.length - 1)

  return (
    <div className="fade-enter w-full max-w-xl mx-auto text-center">
      {/* Blue glow at top */}
      <div className="transition-glow" />

      {/* Animated Scanner Icon */}
      <div className="relative mb-10 flex justify-center">
        <div className="pulse-ring w-28 h-28 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
            <span className="text-4xl animate-pulse">
              {SCAN_PHASES[currentPhase].icon}
            </span>
          </div>
        </div>
      </div>

      {/* Scanning Header */}
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
        Analyzing Your Document
      </h2>
      <p className="text-gray-400 text-sm mb-2">
        {file?.name && (
          <span className="text-gray-300 font-medium">{file.name}</span>
        )}
      </p>
      <p className="text-gray-600 text-xs mb-10">
        Scanning for formatting issues against Telkom University standards
      </p>

      {/* Progress Bar */}
      <div className="glass-dark rounded-2xl p-8">
        <div className="progress-track h-3 rounded-full mb-6">
          <div
            className="progress-fill h-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Phase Text */}
        <div className="h-8 flex items-center justify-center">
          <p className="text-base font-medium text-gray-300 typing-cursor">
            {SCAN_PHASES[currentPhase].text}
          </p>
        </div>

        {/* Progress Percentage */}
        <p className="text-3xl font-bold text-gradient mt-6 mb-2">
          {progress}%
        </p>
        <p className="text-xs text-gray-600">
          Step {currentPhase + 1} of {SCAN_PHASES.length}
        </p>

        {/* Scan Details - mini log */}
        <div className="mt-8 space-y-2.5 text-left">
          {SCAN_PHASES.slice(0, phase + 1).map((p, i) => (
            <div
              key={i}
              className="flex items-center gap-3 text-sm error-item"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
                i < phase
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-blue-500/20 text-blue-400 animate-pulse'
              }`}>
                {i < phase ? '✓' : '⋯'}
              </div>
              <span className={i < phase ? 'text-gray-500' : 'text-gray-300'}>
                {p.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
