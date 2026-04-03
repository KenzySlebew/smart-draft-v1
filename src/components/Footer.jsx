export default function Footer({ isLight }) {
  return (
    <footer className="relative z-10 mt-auto">
      <div className={`max-w-6xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-3 border-t ${
        isLight ? 'border-gray-200/50' : 'border-white/[0.04]'
      }`}>
        <p className={`text-xs ${isLight ? 'text-gray-400' : 'text-gray-600'}`}>
          © 2026 Smart-Draft by @riftarhman
        </p>
        <div className={`flex items-center gap-6 text-xs ${isLight ? 'text-gray-400' : 'text-gray-600'}`}>
          <a href="#" className={`transition-colors ${isLight ? 'hover:text-gray-600' : 'hover:text-gray-400'}`}>Privacy</a>
          <a href="#" className={`transition-colors ${isLight ? 'hover:text-gray-600' : 'hover:text-gray-400'}`}>Terms</a>
          <a href="#" className={`transition-colors ${isLight ? 'hover:text-gray-600' : 'hover:text-gray-400'}`}>Help</a>
        </div>
      </div>
    </footer>
  )
}
