import { useState } from 'react'
import { AlertTriangle, ChevronRight, FileWarning, CheckCircle2, Loader2, ArrowRight, Wrench } from 'lucide-react'
import { fixFormatting } from '../utils/formatFixer'

const severityConfig = {
  high: {
    badge: 'bg-red-50 text-red-600 border-red-100',
    icon: 'bg-red-50 border-red-100',
    iconColor: 'text-red-500',
  },
  medium: {
    badge: 'bg-amber-50 text-amber-600 border-amber-100',
    icon: 'bg-amber-50 border-amber-100',
    iconColor: 'text-amber-500',
  },
  low: {
    badge: 'bg-blue-50 text-blue-600 border-blue-100',
    icon: 'bg-blue-50 border-blue-100',
    iconColor: 'text-blue-500',
  },
}

export default function ReviewState({ parsedDoc, scanResult, onNext }) {
  const [isFixing, setIsFixing] = useState(false)
  const [fixError, setFixError] = useState(null)

  const { issues, stats, complianceScore } = scanResult

  const handleAutoFix = async () => {
    setIsFixing(true)
    setFixError(null)

    try {
      const fixResult = await fixFormatting(parsedDoc, issues)
      onNext(fixResult)
    } catch (err) {
      console.error('Fix error:', err)
      setFixError(`Failed to fix formatting: ${err.message}`)
      setIsFixing(false)
    }
  }

  // No issues found
  if (issues.length === 0) {
    return (
      <div className="fade-enter w-full max-w-xl mx-auto text-center">
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" strokeWidth={1.5} />
          </div>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          No Issues Found
        </h2>
        <p className="text-base text-gray-600 max-w-md mx-auto mb-10 leading-relaxed">
          Your document already meets all Telkom University formatting standards.
        </p>
        <div className="glass-light rounded-xl p-5 max-w-sm mx-auto">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Compliance Score</span>
            <span className="text-xl font-bold text-emerald-500 tabular-nums font-mono">100%</span>
          </div>
        </div>
        <div className="mt-8">
          <button
            className="btn-secondary-light inline-flex items-center gap-2"
            onClick={() => onNext({ blob: null, fixedIssues: [] })}
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  const scoreColor = complianceScore >= 80
    ? 'text-emerald-500'
    : complianceScore >= 50
      ? 'text-amber-500'
      : 'text-red-500'

  const barColor = complianceScore >= 80
    ? 'bg-emerald-500'
    : complianceScore >= 50
      ? 'bg-amber-500'
      : 'bg-red-500'

  return (
    <div className="fade-enter w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-100 text-amber-600 text-sm font-medium mb-5">
          <FileWarning className="w-4 h-4" />
          Format Issues Detected
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          Review Results
        </h2>
        <p className="text-gray-600 max-w-md mx-auto">
          Found <span className="text-gray-900 font-semibold">{stats.issuesFound}</span> formatting {stats.issuesFound !== 1 ? 'issues' : 'issue'} that don&apos;t match Telkom University standards.
        </p>
      </div>

      {/* Compact stats row - no glow effects */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="glass-light rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-gray-800 tabular-nums">{stats.totalPages}</p>
          <p className="text-xs text-gray-500 mt-1">Est. Pages</p>
        </div>
        <div className="glass-light rounded-xl p-4 text-center">
          <p className={`text-xl font-bold tabular-nums ${stats.issuesFound > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{stats.issuesFound}</p>
          <p className="text-xs text-gray-500 mt-1">Issues Found</p>
        </div>
        <div className="glass-light rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-amber-500 tabular-nums">{stats.categories}</p>
          <p className="text-xs text-gray-500 mt-1">Categories</p>
        </div>
        <div className="glass-light rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-emerald-500 tabular-nums">{stats.autoFixablePercent}%</p>
          <p className="text-xs text-gray-500 mt-1">Auto-Fixable</p>
        </div>
      </div>

      {/* Issue list */}
      <div className="glass-light rounded-2xl p-6 md:p-8 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-base text-gray-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Detected Issues
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
              Sorted by severity
            </span>
          </div>
        </div>

        <div className="space-y-2.5">
          {[...issues]
            .sort((a, b) => {
              const order = { high: 0, medium: 1, low: 2 }
              return (order[a.severity] || 2) - (order[b.severity] || 2)
            })
            .map((issue) => {
              const config = severityConfig[issue.severity] || severityConfig.low
              return (
                <div
                  key={issue.id}
                  className="error-item group flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-100 hover:shadow-sm hover:border-gray-200 transition-all cursor-default"
                >
                  {/* Severity icon square */}
                  <div className={`w-9 h-9 rounded-lg ${config.icon} border flex items-center justify-center shrink-0`}>
                    <AlertTriangle className={`w-4 h-4 ${config.iconColor}`} strokeWidth={2} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-gray-800">
                        {issue.description}
                      </span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${config.badge}`}>
                        {issue.severity.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-emerald-600">{issue.expected}</span>
                      <span className="text-gray-400">-</span>
                      <span className="text-gray-500 truncate">{issue.section}</span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors shrink-0" />
                </div>
              )
            })}
        </div>
      </div>

      {/* Compliance bar */}
      <div className="glass-light rounded-xl p-5 mb-8 flex flex-col md:flex-row items-center gap-4">
        <div className="flex-1 w-full">
          <p className="text-sm font-medium text-gray-600 mb-2">Compliance Score</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 progress-track h-2 max-w-xs">
              <div
                className={`h-full rounded-full ${barColor}`}
                style={{ width: `${complianceScore}%`, transition: 'width 0.6s ease' }}
              />
            </div>
            <span className={`text-lg font-bold tabular-nums font-mono ${scoreColor}`}>
              {complianceScore}%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          {stats.autoFixablePercent === 100
            ? 'All issues are auto-fixable'
            : `${stats.autoFixablePercent}% of issues are auto-fixable`}
        </div>
      </div>

      {/* Fix error */}
      {fixError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm text-center">
          {fixError}
        </div>
      )}

      {/* CTA - solid color, no animated gradient, no Sparkles icon */}
      <div className="text-center">
        <button
          className="btn-primary text-base px-8 py-4 rounded-xl inline-flex items-center gap-3"
          onClick={handleAutoFix}
          disabled={isFixing}
          id="auto-fix-btn"
        >
          {isFixing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Fixing Formatting...
            </>
          ) : (
            <>
              <Wrench className="w-5 h-5" />
              Auto-Fix All Formatting
              <ArrowRight className="w-4 h-4 opacity-80" />
            </>
          )}
        </button>
        <p className="text-xs text-gray-500 mt-3">
          Smart-Draft will automatically correct all {stats.issuesFound} formatting {stats.issuesFound !== 1 ? 'issues' : 'issue'}
        </p>
      </div>
    </div>
  )
}
