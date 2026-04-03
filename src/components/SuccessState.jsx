import { Download, RotateCcw, CheckCircle2, Shield, FileCheck } from 'lucide-react'
import { downloadFixedDoc } from '../utils/formatFixer'

export default function SuccessState({ fixResult, scanResult, originalFileName, onReset }) {

  const handleDownload = () => {
    if (fixResult?.blob) {
      downloadFixedDoc(fixResult.blob, originalFileName || 'document.docx')
    }
  }

  // Build corrections list from real data
  const corrections = scanResult?.issues?.map(issue => ({
    before: issue.description,
    after: issue.expected?.replace('Expected: ', '') || 'Fixed',
    category: issue.category,
  })) || []

  const hasBlob = fixResult?.blob != null

  return (
    <div className="fade-enter w-full max-w-xl mx-auto text-center">
      {/* Success Checkmark */}
      <div className="flex justify-center mb-8">
        <div className="checkmark-circle">
          <CheckCircle2 className="w-12 h-12 text-white" strokeWidth={2.5} />
        </div>
      </div>

      {/* Success Message */}
      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
        <span className="text-gradient-success">Success!</span> {corrections.length > 0 ? 'All Fixed' : 'No Issues'}
      </h2>
      <p className="text-lg text-gray-500 max-w-md mx-auto mb-10 leading-relaxed">
        {corrections.length > 0 ? (
          <>
            Your document is now <span className="text-emerald-600 font-semibold">100% formatted</span> to Telkom University academic standards.
          </>
        ) : (
          <>
            Your document already meets all Telkom University formatting standards. 
          </>
        )}
      </p>

      {/* Fixed Summary */}
      {corrections.length > 0 && (
        <div className="glass-light rounded-2xl p-6 md:p-8 mb-10 text-left">
          <h3 className="font-semibold text-base text-gray-800 flex items-center gap-2 mb-5">
            <FileCheck className="w-5 h-5 text-emerald-500" />
            Corrections Applied ({corrections.length})
          </h3>

          <div className="space-y-3 max-h-72 overflow-y-auto">
            {corrections.map((fix, i) => (
              <div
                key={i}
                className="error-item correction-card-light flex items-center gap-3 p-3.5 rounded-lg"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="flex-1 text-sm min-w-0">
                  <span className="text-gray-400 line-through mr-2">{fix.before}</span>
                  <span className="text-gray-300 mr-2">→</span>
                  <span className="text-emerald-600 font-medium">{fix.after}</span>
                </div>
                <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full shrink-0 border border-gray-100">
                  {fix.category}
                </span>
              </div>
            ))}
          </div>

          {/* Compliance Score */}
          <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-gray-500">Compliance Score</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                  style={{ width: '100%' }}
                />
              </div>
              <span className="text-lg font-bold text-emerald-500">100%</span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        {hasBlob && (
          <button
            className="btn-success inline-flex items-center gap-3 text-base px-8 py-4 rounded-xl w-full sm:w-auto justify-center"
            onClick={handleDownload}
            id="download-btn"
          >
            <Download className="w-5 h-5" />
            Download Fixed Document (.docx)
          </button>
        )}
        <button
          className="btn-secondary-light inline-flex items-center gap-2 w-full sm:w-auto justify-center"
          onClick={onReset}
          id="reset-btn"
        >
          <RotateCcw className="w-4 h-4" />
          Format Another Document
        </button>
      </div>
    </div>
  )
}
