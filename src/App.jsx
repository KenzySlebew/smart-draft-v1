import { useState, useCallback } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import UploadState from './components/UploadState'
import ScanningState from './components/ScanningState'
import ReviewState from './components/ReviewState'
import SuccessState from './components/SuccessState'

const STATES = {
  UPLOAD: 0,
  SCANNING: 1,
  REVIEW: 2,
  SUCCESS: 3,
}

// Determine which states use light vs dark theme
const isLightState = (state) => state === STATES.UPLOAD || state === STATES.SUCCESS

export default function App() {
  const [appState, setAppState] = useState(STATES.UPLOAD)
  
  // Real data state
  const [uploadedFile, setUploadedFile] = useState(null)
  const [parsedDoc, setParsedDoc] = useState(null)
  const [scanResult, setScanResult] = useState(null)
  const [fixResult, setFixResult] = useState(null)

  const goToScanning = useCallback((file) => {
    setUploadedFile(file)
    setAppState(STATES.SCANNING)
  }, [])

  const goToReview = useCallback((parsed, result) => {
    setParsedDoc(parsed)
    setScanResult(result)
    setAppState(STATES.REVIEW)
  }, [])

  const goToSuccess = useCallback((fixData) => {
    setFixResult(fixData)
    setAppState(STATES.SUCCESS)
  }, [])

  const resetApp = useCallback(() => {
    setAppState(STATES.UPLOAD)
    setUploadedFile(null)
    setParsedDoc(null)
    setScanResult(null)
    setFixResult(null)
  }, [])

  const themeClass = isLightState(appState) ? 'app-light' : 'app-dark'

  return (
    <div className={`min-h-screen flex flex-col relative ${themeClass}`}>
      {/* Light Scenic Background */}
      <div className="bg-scenic" />
      <div className="bg-scenic-clouds" />

      {/* Dark Background Mesh */}
      <div className="bg-dark-mesh" />

      {/* Header */}
      <Header currentState={appState} isLight={isLightState(appState)} />

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 md:py-14 relative z-10">
        {appState === STATES.UPLOAD && (
          <UploadState onNext={goToScanning} />
        )}
        {appState === STATES.SCANNING && (
          <ScanningState
            file={uploadedFile}
            onComplete={goToReview}
          />
        )}
        {appState === STATES.REVIEW && (
          <ReviewState
            parsedDoc={parsedDoc}
            scanResult={scanResult}
            onNext={goToSuccess}
          />
        )}
        {appState === STATES.SUCCESS && (
          <SuccessState
            fixResult={fixResult}
            scanResult={scanResult}
            originalFileName={uploadedFile?.name}
            onReset={resetApp}
          />
        )}
      </main>

      {/* Footer */}
      <Footer isLight={isLightState(appState)} />
    </div>
  )
}
