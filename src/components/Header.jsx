import { FileText, BookOpen, Tag } from 'lucide-react'

export default function Header({ currentState, isLight }) {
  const steps = [
    { label: 'Upload', state: 0 },
    { label: 'Scanning', state: 1 },
    { label: 'Review', state: 2 },
    { label: 'Done', state: 3 },
  ]

  return (
    <header className="relative z-20 px-4 pt-4">
      <div className="max-w-5xl mx-auto">
        <nav className="navbar-glass rounded-2xl px-4 md:px-6 py-3.5 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm bg-blue-600">
              <FileText className="w-4.5 h-4.5 text-white" strokeWidth={2.5} style={{ width: '18px', height: '18px' }} />
            </div>
            <h1 className="text-lg font-bold tracking-tight flex items-center gap-1 text-gray-900 hidden sm:flex">
              Smart-Draft
            </h1>
          </div>

          {/* Progress Steps (desktop only) */}
          <div className="hidden md:flex items-center gap-1">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-500 ${currentState === step.state
                    ? 'bg-blue-50 text-blue-600 border border-blue-100'
                    : currentState > step.state
                      ? 'text-emerald-600'
                      : 'text-gray-400'
                  }`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${currentState === step.state
                      ? 'bg-blue-600 text-white'
                      : currentState > step.state
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                    {currentState > step.state ? '✓' : i + 1}
                  </span>
                  {step.label}
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-6 h-px mx-1 ${currentState > step.state
                      ? 'bg-emerald-200'
                      : 'bg-gray-200'
                    }`} />
                )}
              </div>
            ))}
          </div>

          {/* Mobile Progress */}
          <div className="md:hidden flex items-center gap-2">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
              {currentState + 1} / {steps.length}
            </span>
            <span className="text-sm font-semibold text-gray-800">
              {steps[currentState]?.label}
            </span>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <a
              href="#"
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all text-gray-500 hover:text-gray-700 hover:bg-gray-100/60"
            >
              <Tag className="w-3.5 h-3.5" />
              Pricing
            </a>
          </div>
        </nav>
      </div>
    </header>
  )
}
