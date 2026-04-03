import { FileText, Zap, BookOpen, Github } from 'lucide-react'

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
        <nav className="navbar-glass rounded-2xl px-6 py-3.5 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${
              isLight 
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
                : 'bg-gradient-to-br from-blue-500 to-indigo-600'
            }`}>
              <FileText className="w-4.5 h-4.5 text-white" strokeWidth={2.5} style={{ width: '18px', height: '18px' }} />
            </div>
            <h1 className={`text-lg font-bold tracking-tight flex items-center gap-1 ${
              isLight ? 'text-gray-900' : 'text-white'
            }`}>
              Smart-Draft
              <Zap className="w-3.5 h-3.5 text-amber-400" fill="currentColor" />
            </h1>
          </div>

          {/* Progress Steps (desktop only) */}
          <div className="hidden md:flex items-center gap-1">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-500 ${
                  currentState === step.state
                    ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                    : currentState > step.state
                      ? isLight ? 'text-emerald-600' : 'text-emerald-400'
                      : isLight ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    currentState === step.state
                      ? 'bg-blue-500 text-white'
                      : currentState > step.state
                        ? 'bg-emerald-500/20 text-emerald-500'
                        : isLight ? 'bg-gray-100 text-gray-400' : 'bg-white/5 text-gray-600'
                  }`}>
                    {currentState > step.state ? '✓' : i + 1}
                  </span>
                  {step.label}
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-6 h-px mx-1 ${
                    currentState > step.state 
                      ? 'bg-emerald-500/30' 
                      : isLight ? 'bg-gray-200' : 'bg-white/5'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <a
              href="#"
              className={`hidden sm:flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                isLight 
                  ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/60' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Guide
            </a>
            <a
              href="#"
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                isLight 
                  ? 'text-gray-400 hover:text-gray-700 hover:bg-gray-100/60 border border-gray-200/60' 
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] border border-white/[0.06]'
              }`}
            >
              <Github className="w-4 h-4" />
            </a>
          </div>
        </nav>
      </div>
    </header>
  )
}
