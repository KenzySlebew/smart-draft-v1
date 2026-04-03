import { useState, useCallback, useRef } from 'react'
import { Upload, FileText, X, AlertCircle, ArrowUp } from 'lucide-react'
import { formatFileSize } from '../utils/docxParser'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export default function UploadState({ onNext }) {
  const [file, setFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const validateFile = useCallback((f) => {
    setError(null)

    if (!f) return false

    // Check file type
    const isDocx = f.name.toLowerCase().endsWith('.docx') ||
      f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    
    if (!isDocx) {
      setError('Only .docx files are supported. Please upload a Word document.')
      return false
    }

    // Check file size
    if (f.size > MAX_FILE_SIZE) {
      setError(`File is too large (${formatFileSize(f.size)}). Maximum size is 50 MB.`)
      return false
    }

    if (f.size === 0) {
      setError('File is empty. Please upload a valid .docx document.')
      return false
    }

    return true
  }, [])

  const handleFileSelect = useCallback((f) => {
    if (validateFile(f)) {
      setFile(f)
      setError(null)
    }
  }, [validateFile])

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragIn = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragOut = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFile = e.dataTransfer?.files?.[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }, [handleFileSelect])

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleInputChange = (e) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  const removeFile = (e) => {
    e.stopPropagation()
    setFile(null)
    setError(null)
  }

  const handleSubmit = () => {
    if (file) {
      onNext(file)
    }
  }

  return (
    <div className="fade-enter w-full max-w-2xl mx-auto">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleInputChange}
        className="hidden"
        id="file-input"
      />

      {/* Hero Text */}
      <div className="text-center mb-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/70 border border-gray-200/50 shadow-sm mb-6">
          <span className="text-xs font-semibold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
            Formatting Skripsi/TA otomatis
          </span>
          <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
            <ArrowUp className="w-3 h-3 text-gray-500 rotate-45" />
          </span>
        </div>

        <h1 className="text-4xl md:text-[3.25rem] font-extrabold tracking-tight text-gray-900 leading-tight mb-5">
          Format Skripsi/TA mu <br />
          <span className="text-gradient">dalam hitungan detik</span>
        </h1>
        <p className="text-base text-gray-500 max-w-xl mx-auto leading-relaxed">
          Upload dokumenmu dan biarkan Smart-Draft mendeteksi serta memperbaiki masalah format secara otomatis berdasarkan standar akademik <span className="text-gray-700 font-medium">Telkom University</span>.
        </p>
      </div>

      {/* Dropzone — Webild-style clean white card */}
      <div
        className={`dropzone-light cursor-pointer text-center p-10 md:p-14 ${isDragging ? 'active' : ''} ${file ? 'has-file' : ''} ${error ? 'has-error' : ''}`}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={!file ? handleClick : undefined}
        id="upload-dropzone"
      >
        {!file ? (
          <div className="flex flex-col items-center gap-5">
            <div className={`w-16 h-16 rounded-2xl ${error ? 'bg-red-50 border-red-200' : 'icon-bg-blue'} border border-blue-200/50 flex items-center justify-center`}>
              {error ? (
                <AlertCircle className="w-8 h-8 text-red-400" strokeWidth={1.5} />
              ) : (
                <Upload className="w-8 h-8 text-blue-500" strokeWidth={1.5} />
              )}
            </div>
            <div>
              <p className="text-base font-semibold text-gray-800 mb-1.5">
                Upload file <span className="text-blue-600">.docx</span> mu disini
              </p>
              <p className="text-sm text-gray-400">atau klik untuk browse dari komputermu</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">.docx only</span>
              <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">Max 50 MB</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-50 border border-blue-200/50 flex items-center justify-center">
              <FileText className="w-7 h-7 text-blue-500" />
            </div>
            <div>
              <p className="text-base font-semibold text-gray-800">{file.name}</p>
              <p className="text-sm text-gray-400 mt-1">{formatFileSize(file.size)} — Ready to check</p>
            </div>
            <button
              onClick={removeFile}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors mt-1"
              id="remove-file-btn"
            >
              <X className="w-3.5 h-3.5" />
              Remove file
            </button>
          </div>
        )}
      </div>

      {/* Enhance prompt style bottom bar */}
      {!file && (
        <div className="dropzone-light mt-[-1px] rounded-t-none px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 17l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-xs font-medium">Auto-detect format rules</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                file 
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40' 
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'
              }`}
              disabled={!file}
              onClick={handleSubmit}
              id="check-format-btn"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Action Button (when file is selected) */}
      {file && (
        <div className="mt-8 text-center">
          <button
            className="btn-primary text-base px-8 py-4 rounded-xl inline-flex items-center gap-3"
            onClick={handleSubmit}
            id="check-format-btn-main"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Check Document Format
          </button>
        </div>
      )}

      {/* Features Bar — Pastel cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-14">
        {[
          { icon: '📐', title: 'Margin Check', desc: '4-3-3-3 cm standard', bgClass: 'icon-bg-peach' },
          { icon: '🔤', title: 'Font Validation', desc: 'Times New Roman 12pt', bgClass: 'icon-bg-blue' },
          { icon: '📏', title: 'Spacing Analysis', desc: '1.5 line spacing', bgClass: 'icon-bg-green' },
        ].map((feature, i) => (
          <div
            key={i}
            className="feature-card-light rounded-xl p-5 flex items-start gap-4"
          >
            <div className={`w-10 h-10 rounded-lg ${feature.bgClass} flex items-center justify-center shrink-0`}>
              <span className="text-lg">{feature.icon}</span>
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-800">{feature.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{feature.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
