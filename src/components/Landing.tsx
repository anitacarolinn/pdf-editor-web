import { useRef, useState } from 'react'

export interface LandingProps {
  onFiles: (files: File[]) => void
}

export default function Landing({ onFiles }: LandingProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave() {
    setDragOver(false)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === 'application/pdf' || f.name.endsWith('.pdf'),
    )
    if (files.length) onFiles(files)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (files && files.length) onFiles(Array.from(files))
    e.target.value = ''
  }

  return (
    <div className="landing-hero">
      {/* Product identity */}
      <div className="landing-identity">
        <span className="landing-logo" aria-hidden="true">🐢</span>
        <h1 className="landing-title">PDF Page Editor</h1>
        <p className="landing-tagline">Rearrange, rotate, and edit PDF pages — privately, offline, in your browser.</p>
      </div>

      {/* Drop zone */}
      <div
        className={`landing-dropzone${dragOver ? ' landing-dropzone--active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="region"
        aria-label="PDF drop zone"
      >
        {/* PDF icon */}
        <svg
          className="landing-dropzone-icon"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect x="8" y="4" width="28" height="36" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M28 4v10h8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
          <path d="M16 22h16M16 28h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M24 36v-8M20 32l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        <p className="landing-dropzone-headline">Drag &amp; drop a PDF here, or</p>

        <button
          type="button"
          className="btn-primary landing-choose-btn"
          onClick={() => inputRef.current?.click()}
        >
          Choose file
        </button>

        {/* Exact text preserved for App.test empty-state assertion */}
        <p className="landing-dropzone-hint">Open a PDF to get started</p>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          aria-label="Choose PDF file"
          style={{ display: 'none' }}
          onChange={handleChange}
        />
      </div>
    </div>
  )
}
