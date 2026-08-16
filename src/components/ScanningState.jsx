import { useState, useEffect, useRef } from 'react'
import { FileSearch, FileCode, Ruler, Type, AlignJustify, BarChart3, FileCheck, XCircle, CheckCircle2, Loader2, Sparkles, Wand2, BookOpen } from 'lucide-react'
import { parseDocx } from '../utils/docxParser'
import { checkFormatting } from '../utils/formatChecker'

const SCAN_PHASES = [
  { text: 'Extracting document structure & XML', Icon: FileSearch, progress: 10 },
  { text: 'Scanning raw markdown syntax (###, **, >)', Icon: Wand2, progress: 25 },
  { text: 'Detecting noise & visual artifacts (//, -----)', Icon: Sparkles, progress: 40 },
  { text: 'Analyzing chapter structure & list bullets', Icon: BookOpen, progress: 55 },
  { text: 'Checking page margins (4-3-3-3 cm)', Icon: Ruler, progress: 70 },
  { text: 'Validating typography, spacing & indent', Icon: AlignJustify, progress: 85 },
  { text: 'Generating smart compliance report', Icon: FileCheck, progress: 95 },
]

export default function ScanningState({ file, onComplete }) {
  const [phase, setPhase] = useState(0)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    if (!file) return

    let cancelled = false
    let phaseTimer = null

    setPhase(0)
    setProgress(10)
    setError(null)

    async function runScan() {
      try {
        phaseTimer = setInterval(() => {
          if (cancelled) return
          setPhase((prev) => {
            if (prev < 2) return prev + 1
            return prev
          })
        }, 800)

        const parsedDoc = await parseDocx(file)

        if (cancelled) return

        clearInterval(phaseTimer)
        phaseTimer = null

        setPhase(3)
        setProgress(55)
        await delay(500)
        if (cancelled) return

        setPhase(4)
        setProgress(70)

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
  }, [file])

  useEffect(() => {
    if (phase < SCAN_PHASES.length && phase <= 2) {
      setProgress(SCAN_PHASES[phase].progress)
    }
  }, [phase])

  if (error) {
    return (
      <div className="fade-enter w-full max-w-xl mx-auto text-center">
        <div className="glass-light rounded-2xl p-8">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-red-500" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Scan Failed</h2>
          <p className="text-gray-600 text-sm mb-6">{error}</p>
          <p className="text-gray-500 text-xs">
            Make sure you are uploading a valid <strong>.docx</strong> file (Microsoft Word format).
            <br />PDF, .doc (old format), and other file types are not supported.
          </p>
        </div>
      </div>
    )
  }

  const currentPhase = Math.min(phase, SCAN_PHASES.length - 1)
  const CurrentIcon = SCAN_PHASES[currentPhase].Icon

  return (
    <div className="fade-enter w-full max-w-xl mx-auto text-center">
      {/* Header icon - clean, no pulse ring */}
      <div className="relative mb-8 flex justify-center">
        <div className="w-20 h-20 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
          <CurrentIcon className="w-9 h-9 text-blue-500" strokeWidth={1.5} />
        </div>
      </div>

      {/* Title */}
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
        Analyzing Your Document
      </h2>
      {file?.name && (
        <p className="text-gray-600 text-sm font-medium mb-1">
          {file.name}
        </p>
      )}
      <p className="text-gray-500 text-xs mb-8">
        Scanning for formatting issues against Telkom University standards
      </p>

      {/* Progress card */}
      <div className="glass-light rounded-2xl p-8">
        {/* Progress bar */}
        <div className="progress-track h-2 rounded-full mb-5">
          <div
            className="progress-fill h-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Phase text */}
        <p className="text-sm font-medium text-gray-600 mb-1">
          {SCAN_PHASES[currentPhase].text}
        </p>

        {/* Progress counter - monospace, no gradient */}
        <p className="text-2xl font-bold text-gray-900 tabular-nums font-mono mt-4 mb-1">
          {progress}%
        </p>
        <p className="text-xs text-gray-500">
          Step {currentPhase + 1} of {SCAN_PHASES.length}
        </p>

        {/* Step log */}
        <div className="mt-6 space-y-2 text-left">
          {SCAN_PHASES.slice(0, phase + 1).map((p, i) => {
            const isDone = i < phase
            return (
              <div
                key={i}
                className="flex items-center gap-3 text-sm error-item"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" strokeWidth={2} />
                  ) : (
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" strokeWidth={2} />
                  )}
                </div>
                <span className={isDone ? 'text-gray-400' : 'text-gray-700 font-medium'}>
                  {p.text}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
