import { useEffect, useRef, useState } from 'react'
import renderedScene from './assets/storycraft-rendered.jpeg'
import sketchScene from './assets/storycraft-sketch.jpeg'
import Game from './game/Game.jsx'
import { DEFAULT_MOCK_GAME_CONFIG } from './game/mockGameConfig.js'
import './App.css'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const VALID_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const EMPTY_GAME_ASSETS = Object.freeze({ characterSpriteUrl: null, backgroundImageUrl: null })

function ArrowIcon() {
  return <span className="arrow-icon" aria-hidden="true">→</span>
}

function Brand({ light = false, onClick }) {
  return (
    <button className={`brand ${light ? 'brand--light' : ''}`} onClick={onClick} type="button">
      <span>STORYCRAFT</span>
    </button>
  )
}

function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button className={`primary-button ${className}`} type="button" {...props}>
      <span>{children}</span>
      <ArrowIcon />
    </button>
  )
}

function ImageComparisonSlider() {
  const [position, setPosition] = useState(50)
  const isDragging = useRef(false)

  const updateFromPointer = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const nextPosition = ((event.clientX - bounds.left) / bounds.width) * 100
    setPosition(Math.min(78, Math.max(22, nextPosition)))
  }

  const startDragging = (event) => {
    isDragging.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    updateFromPointer(event)
  }

  const stopDragging = (event) => {
    isDragging.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <div
      className="comparison"
      onPointerCancel={stopDragging}
      onPointerDown={startDragging}
      onPointerMove={(event) => {
        if (isDragging.current) updateFromPointer(event)
      }}
      onPointerUp={stopDragging}
      style={{ '--split': `${position}%` }}
    >
      <img className="comparison__image" src={renderedScene} alt="Colorful game artwork created from a drawing" />
      <div className="comparison__sketch" aria-hidden="true">
        <img className="comparison__image" src={sketchScene} alt="" />
      </div>
      <div className="comparison__shade" aria-hidden="true" />
      <div className="comparison__line" aria-hidden="true" />
      <input
        aria-label="Compare original drawing and generated game art"
        className="comparison__range"
        max="78"
        min="22"
        onChange={(event) => setPosition(Number(event.target.value))}
        type="range"
        value={position}
      />
      <div className="comparison__handle" aria-hidden="true"><span>‹</span><span>›</span></div>
    </div>
  )
}

function LandingScreen({ onStart }) {
  return (
    <section className="landing-screen" aria-labelledby="hero-heading">
      <ImageComparisonSlider />
      <header className="landing-header">
        <Brand light onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
        <PrimaryButton onClick={onStart}>CREATE YOUR GAME</PrimaryButton>
      </header>
      <div className="hero-copy">
        <h1 id="hero-heading">LET YOUR<br />IMAGINATION<br /><span>CREATE.</span></h1>
        <p>Draw your game on paper, snap a photo and upload it — our AI turns your drawing into a game you can actually play.</p>
        <div className="hero-actions">
          <PrimaryButton onClick={onStart}>CREATE A GAME</PrimaryButton>
        </div>
      </div>
    </section>
  )
}

function AppHeader({ activeStep, onHome, onUpload, onGame }) {
  return (
    <header className="app-header">
      <Brand onClick={onHome} />
      <nav aria-label="Main navigation">
        <button onClick={onHome} type="button">Home</button>
        <button className={activeStep === 'upload' ? 'is-active' : ''} onClick={onUpload} type="button">Drawing</button>
        <button className={activeStep === 'game' ? 'is-active' : ''} onClick={onGame} type="button">Get Started</button>
      </nav>
      <PrimaryButton onClick={onUpload}>CREATE YOUR GAME</PrimaryButton>
    </header>
  )
}

function UploadDropzone({ error, file, previewUrl, onFile, onGenerate }) {
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  const acceptDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)
    onFile(event.dataTransfer.files[0])
  }

  return (
    <>
      <div
        className={`upload-dropzone ${isDragging ? 'is-dragging' : ''} ${file ? 'has-file' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => { event.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={acceptDrop}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click()
        }}
        role="button"
        tabIndex="0"
      >
        {previewUrl ? (
          <img className="upload-dropzone__preview" src={previewUrl} alt={`Preview of ${file.name}`} />
        ) : (
          <>
            <div className="upload-dropzone__content">
              <h2>UPLOAD YOUR<br />DRAWING</h2>
              <span className="camera-symbol" aria-hidden="true">●</span>
              <p>Drag and drop your sketch here, or <u>browse files</u></p>
              <small>Supports JPG, PNG, WebP, up to 5MB</small>
            </div>
            <img className="upload-dropzone__example" src={sketchScene} alt="Example colorful drawing" />
          </>
        )}
      </div>
      <input accept="image/jpeg,image/png,image/webp" className="visually-hidden" onChange={(event) => onFile(event.target.files[0])} ref={inputRef} type="file" />
      {error && <p className="upload-error" role="alert">{error}</p>}
      <div className="upload-actions">
        <button className="upload-action upload-action--primary" onClick={() => inputRef.current?.click()} type="button">BROWSE FILES</button>
        <PrimaryButton className="upload-action generate-button" disabled={!file} onClick={onGenerate}>GENERATE MY GAME</PrimaryButton>
      </div>
    </>
  )
}

const tips = [
  { title: 'Use blank white paper', image: sketchScene },
  { title: 'Outline clearly with dark markers', image: sketchScene },
  { title: 'Capture in good, natural lighting', image: renderedScene },
]

function TipsPanel() {
  return (
    <aside className="tips-panel" aria-labelledby="tips-title">
      <h2 id="tips-title">GUIDELINES &amp; TIPS</h2>
      <ol>
        {tips.map((tip) => (
          <li key={tip.title}><img src={tip.image} alt="" /><p>{tip.title}</p></li>
        ))}
      </ol>
    </aside>
  )
}

function ProgressSteps({ active }) {
  return (
    <ol className="progress-steps" aria-label="Game creation progress">
      <li className={active === 1 ? 'is-active' : ''}>1. Upload Drawing</li>
      <li aria-hidden="true">→</li>
      <li className={active === 2 ? 'is-active' : ''}>2. AI Magic</li>
      <li aria-hidden="true">→</li>
      <li className={active === 3 ? 'is-active' : ''}>3. Play!</li>
    </ol>
  )
}

function UploadScreen({ embedded = false, file, previewUrl, error, onFile, onGenerate, onHome, onGame }) {
  const Root = embedded ? 'section' : 'main'

  return (
    <Root
      className={`workspace-screen ${embedded ? 'workspace-screen--embedded' : ''}`}
      id={embedded ? 'upload-section' : undefined}
    >
      <section className="workspace-main">
        {!embedded && <AppHeader activeStep="upload" onGame={onGame} onHome={onHome} onUpload={() => {}} />}
        <div className="upload-content">
          <h1>UPLOAD DRAWING</h1>
          <UploadDropzone error={error} file={file} onFile={onFile} onGenerate={onGenerate} previewUrl={previewUrl} />
        </div>
      </section>
      <TipsPanel />
      <footer className="workspace-footer"><ProgressSteps active={1} /></footer>
    </Root>
  )
}

function LoadingScreen({ previewUrl, onHome, onUpload }) {
  return (
    <main className="simple-screen">
      <AppHeader activeStep="upload" onGame={() => {}} onHome={onHome} onUpload={onUpload} />
      <section className="loading-card" aria-live="polite">
        <div className="loading-art">
          {previewUrl && <img src={previewUrl} alt="Your uploaded drawing" />}
          <span className="loading-ring" aria-hidden="true" />
        </div>
        <p className="eyebrow">AI MAGIC IN PROGRESS</p>
        <h1>TURNING YOUR DRAWING<br />INTO A GAME</h1>
        <p>Finding heroes, obstacles and a world to explore…</p>
        <ProgressSteps active={2} />
      </section>
    </main>
  )
}

function GameScreen({ backgroundImageUrl, characterSpriteUrl, gameConfig, onHome, onRestart }) {
  const fullTitle = typeof gameConfig.title === 'string' && gameConfig.title.trim() ? gameConfig.title.trim() : 'The Drawing Quest'
  const displayTitle = fullTitle.length > 64 ? `${fullTitle.slice(0, 63).trimEnd()}…` : fullTitle
  return (
    <main className="simple-screen game-screen">
      <AppHeader activeStep="game" onGame={() => {}} onHome={onHome} onUpload={onRestart} />
      <section className="game-content">
        <p className="eyebrow">{gameConfig.theme}</p>
        <h1 title={fullTitle}>{displayTitle}</h1>
        <Game backgroundImageUrl={backgroundImageUrl} characterSpriteUrl={characterSpriteUrl} gameConfig={gameConfig} />
        <div className="game-actions">
          <PrimaryButton onClick={onRestart}>UPLOAD ANOTHER DRAWING</PrimaryButton>
        </div>
        <ProgressSteps active={3} />
      </section>
    </main>
  )
}

function App() {
  const [screen, setScreen] = useState(() => {
    const requestedScreen = new URLSearchParams(window.location.search).get('screen')
    return ['home', 'upload', 'game'].includes(requestedScreen) ? requestedScreen : 'home'
  })
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [error, setError] = useState('')
  const [gameConfig, setGameConfig] = useState(DEFAULT_MOCK_GAME_CONFIG)
  const [gameAssets, setGameAssets] = useState(EMPTY_GAME_ASSETS)

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  useEffect(() => {
    if (screen !== 'loading') return undefined
    const controller = new AbortController()
    let active = true
    const generate = async () => {
      if (!file || !previewUrl) {
        setError('We could not generate the game. Please upload your drawing again.')
        setScreen('upload')
        return
      }
      try {
        const form = new FormData()
        form.append('image', file)
        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/generate`, {
          method: 'POST', body: form, signal: controller.signal,
        })
        const config = await response.json()
        if (!response.ok) throw new Error(config.error || 'Game generation failed. Please try again.')
        if (!config || config.gameType !== 'platformer') throw new Error('The server returned an invalid game configuration.')
        if (!active) return
        setGameConfig(config)
        // The upload remains separate from optional extracted gameplay assets.
        setGameAssets({
          characterSpriteUrl: config.assets?.characterSpriteUrl || config.assets?.playerSpriteUrl || null,
          backgroundImageUrl: config.assets?.backgroundImageUrl || null,
        })
        setScreen('game')
      } catch (error) {
        if (!active) return
        setError(error.message || 'Game generation failed. Please try again.')
        setScreen('upload')
      }
    }
    void generate()
    return () => { active = false; controller.abort() }
  }, [file, previewUrl, screen])

  const handleFile = (nextFile) => {
    if (!nextFile) return
    if (!VALID_FILE_TYPES.includes(nextFile.type)) {
      setError('Please choose a JPG, PNG, or WebP image.')
      return
    }
    if (nextFile.size > MAX_FILE_SIZE) {
      setError('That image is larger than 5MB. Please choose a smaller file.')
      return
    }
    const nextPreviewUrl = URL.createObjectURL(nextFile)
    const image = new Image()
    image.onload = () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setFile(nextFile)
      setPreviewUrl(nextPreviewUrl)
      setGameAssets(EMPTY_GAME_ASSETS)
      setError('')
    }
    image.onerror = () => {
      URL.revokeObjectURL(nextPreviewUrl)
      setError('That file is not a readable image. Please choose another JPG, PNG, or WebP.')
    }
    image.src = nextPreviewUrl
  }

  const generateGame = () => {
    if (!file || !previewUrl) {
      setError('Please upload a valid drawing before generating your game.')
      setScreen('upload')
      return
    }
    setError('')
    setScreen('loading')
  }

  const restart = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl('')
    setGameConfig(DEFAULT_MOCK_GAME_CONFIG)
    setGameAssets(EMPTY_GAME_ASSETS)
    setError('')
    setScreen('upload')
  }

  if (screen === 'home') {
    const scrollToUpload = () => {
      document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    return (
      <main className="home-page">
        <LandingScreen onStart={scrollToUpload} />
        <UploadScreen
          embedded
          error={error}
          file={file}
          onFile={handleFile}
          onGame={generateGame}
          onGenerate={generateGame}
          onHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          previewUrl={previewUrl}
        />
      </main>
    )
  }
  if (screen === 'loading') return <LoadingScreen onHome={() => setScreen('home')} onUpload={() => setScreen('upload')} previewUrl={previewUrl} />
  if (screen === 'game') return <GameScreen {...gameAssets} gameConfig={gameConfig} onHome={() => setScreen('home')} onRestart={restart} />

  return <UploadScreen error={error} file={file} onFile={handleFile} onGame={generateGame} onGenerate={generateGame} onHome={() => setScreen('home')} previewUrl={previewUrl} />
}

export default App
