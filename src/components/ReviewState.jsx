import { useState } from 'react'
import { AlertTriangle, ChevronRight, Sparkles, FileWarning, CheckCircle2, Loader2 } from 'lucide-react'
import { fixFormatting } from '../utils/formatFixer'

const severityColor = {
  high: 'bg-red-500/15 text-red-400 border-red-500/20',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  low: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
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

  const STATS = [
    { label: 'Est. Pages', value: String(stats.totalPages), color: 'text-gray-300' },
    { label: 'Issues Found', value: String(stats.issuesFound), color: stats.issuesFound > 0 ? 'text-red-400' : 'text-emerald-400' },
    { label: 'Categories', value: String(stats.categories), color: 'text-amber-400' },
    { label: 'Auto-Fixable', value: `${stats.autoFixablePercent}%`, color: 'text-emerald-400' },
  ]

  // If no issues found
  if (issues.length === 0) {
    return (
      <div className="fade-enter w-full max-w-xl mx-auto text-center">
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400" strokeWidth={2} />
          </div>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          <span className="text-gradient-success">Perfect!</span> No Issues Found
        </h2>
        <p className="text-lg text-gray-400 max-w-md mx-auto mb-10 leading-relaxed">
          Your document already meets all Telkom University formatting standards. Great work!
        </p>
        <div className="glass-dark rounded-xl p-5 max-w-sm mx-auto">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Compliance Score</span>
            <span className="text-2xl font-bold text-emerald-400">100%</span>
          </div>
        </div>
        <div className="mt-8">
          <button
            className="btn-secondary-dark inline-flex items-center gap-2"
            onClick={() => onNext({ blob: null, fixedIssues: [] })}
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-enter w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium mb-5">
          <FileWarning className="w-4 h-4" />
          Format Issues Detected
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Review Dashboard
        </h2>
        <p className="text-gray-400 max-w-md mx-auto">
          We found <span className="text-red-400 font-semibold">{stats.issuesFound} formatting issue{stats.issuesFound !== 1 ? 's' : ''}</span> in your document that don&apos;t match Telkom University standards.
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {STATS.map((stat, i) => (
          <div
            key={i}
            className="stat-badge glass-dark rounded-xl p-4 text-center"
          >
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Error List */}
      <div className="glass-dark-strong rounded-2xl p-6 md:p-8 mb-8 scan-line">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-lg text-gray-200 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Detected Issues
          </h3>
          <span className="text-xs text-gray-600 bg-white/5 px-3 py-1 rounded-full">
            Sorted by severity
          </span>
        </div>

        <div className="space-y-3">
          {/* Sort by severity: high, medium, low */}
          {[...issues]
            .sort((a, b) => {
              const order = { high: 0, medium: 1, low: 2 }
              return (order[a.severity] || 2) - (order[b.severity] || 2)
            })
            .map((issue) => (
            <div
              key={issue.id}
              className="error-item group flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] hover:border-white/[0.08] transition-all cursor-default"
            >
              {/* Icon */}
              <span className="text-xl shrink-0">{issue.icon}</span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-semibold text-gray-200">
                    ❌ {issue.description}
                  </span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${severityColor[issue.severity]}`}>
                    {issue.severity.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-emerald-400/80">{issue.expected}</span>
                  <span className="text-gray-700">•</span>
                  <span className="text-gray-600">{issue.section}</span>
                </div>
              </div>

              {/* Arrow */}
              <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-gray-500 transition-colors shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Compliance Summary */}
      <div className="glass-dark rounded-xl p-5 mb-8 flex flex-col md:flex-row items-center gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-300 mb-1">Compliance Score</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 progress-track h-2.5 max-w-xs">
              <div
                className={`h-full rounded-full ${
                  complianceScore >= 80
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                    : complianceScore >= 50
                      ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                      : 'bg-gradient-to-r from-red-500 via-amber-500 to-amber-400'
                }`}
                style={{ width: `${complianceScore}%` }}
              />
            </div>
            <span className={`text-lg font-bold ${
              complianceScore >= 80 ? 'text-emerald-400' 
                : complianceScore >= 50 ? 'text-amber-400' 
                  : 'text-red-400'
            }`}>{complianceScore}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          {stats.autoFixablePercent === 100
            ? 'All issues are auto-fixable'
            : `${stats.autoFixablePercent}% of issues are auto-fixable`}
        </div>
      </div>

      {/* Fix Error */}
      {fixError && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
          {fixError}
        </div>
      )}

      {/* CTA Button */}
      <div className="text-center">
        <button
          className="btn-cta text-lg px-10 py-5 rounded-2xl inline-flex items-center gap-3"
          onClick={handleAutoFix}
          disabled={isFixing}
          id="auto-fix-btn"
        >
          {isFixing ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Fixing Formatting...
            </>
          ) : (
            <>
              <Sparkles className="w-6 h-6" />
              Auto-Fix All Formatting
            </>
          )}
        </button>
        <p className="text-xs text-gray-600 mt-4">
          Smart-Draft will automatically correct all {stats.issuesFound} formatting issue{stats.issuesFound !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  )
}
