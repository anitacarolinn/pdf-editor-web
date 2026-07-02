import { useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useI18n } from '../services/i18n'
import {
  IconMerge,
  IconSplit,
  IconRotateRight,
  IconDelete,
  IconDuplicate,
  IconAddText,
  IconAddPicture,
  IconSign,
  IconWatermark,
  IconPageNumber,
  IconShrink,
  IconLock,
  IconDownload,
  IconOpen,
} from './icons'

export interface LandingProps {
  onFiles: (files: File[]) => void
}

// One icon per feature — reuse existing icon set where semantically appropriate
const FEATURE_ICONS = [
  <IconMerge />,
  <IconSplit />,
  <IconRotateRight />,
  <IconDelete />,
  <IconDuplicate />,
  <IconAddText />,
  <IconAddPicture />,
  <IconSign />,
  <IconWatermark />,
  <IconPageNumber />,
  <IconShrink />,
  <IconLock />,
  <IconDownload />,
  <IconOpen />,
]

export default function Landing({ onFiles }: LandingProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const prefersReduced = useReducedMotion()
  const { lang, setLang, t } = useI18n()

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
    const ACCEPTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg']
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => ACCEPTED_TYPES.includes(f.type) || f.name.endsWith('.pdf') || f.name.endsWith('.png') || f.name.endsWith('.jpg') || f.name.endsWith('.jpeg'),
    )
    if (files.length) onFiles(files)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (files && files.length) onFiles(Array.from(files))
    e.target.value = ''
  }

  // Duplicate list for seamless vertical marquee
  const features = t.features
  const loopItems = [...features, ...features]

  // Animation: y from 0 → -50% (half of total height = one full list)
  // Duration scales with list length so speed is consistent
  const duration = features.length * 3.5 // ~49s for 14 items

  return (
    <div className="landing-hero landing-hero--two-col">
      {/* Language toggle — top-right */}
      <div className="landing-lang-toggle" role="group" aria-label="Language">
        <button
          type="button"
          className={`lang-btn${lang === 'en' ? ' lang-btn--active' : ''}`}
          aria-pressed={lang === 'en'}
          onClick={() => setLang('en')}
        >
          {t.langEn}
        </button>
        <span className="lang-sep" aria-hidden="true">/</span>
        <button
          type="button"
          className={`lang-btn${lang === 'zh' ? ' lang-btn--active' : ''}`}
          aria-pressed={lang === 'zh'}
          onClick={() => setLang('zh')}
        >
          {t.langZh}
        </button>
      </div>

      {/* LEFT — Feature loop showcase */}
      <div className="landing-loop-col" aria-label="Feature overview" aria-hidden="true">
        {/* Fade masks via CSS mask-image */}
        <div className="landing-loop-container">
          {prefersReduced ? (
            // Static list under reduced-motion — show first 6 items
            <div className="landing-loop-static">
              {features.slice(0, 6).map((f, i) => (
                <FeatureCard key={i} icon={FEATURE_ICONS[i % FEATURE_ICONS.length]} name={f.name} desc={f.desc} />
              ))}
            </div>
          ) : (
            <motion.div
              className="landing-loop-track"
              animate={{ y: ['0%', '-50%'] }}
              transition={{
                duration,
                ease: 'linear',
                repeat: Infinity,
                repeatType: 'loop',
              }}
            >
              {loopItems.map((f, i) => (
                <FeatureCard
                  key={i}
                  icon={FEATURE_ICONS[i % FEATURE_ICONS.length]}
                  name={f.name}
                  desc={f.desc}
                />
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* RIGHT — Identity + Dropzone (orchestrated entry) */}
      <div className="landing-right-col">
        {/* Product identity */}
        <motion.div
          className="landing-identity"
          initial={prefersReduced ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1], delay: 0.05 }}
        >
          <img className="landing-logo" src="/favicon.svg" alt="" />
          <h1 className="landing-title">PDF Editor</h1>
          <p className="landing-tagline">{t.tagline}</p>
          <p className="landing-privacy-note">{t.privacyNote}</p>
        </motion.div>

        {/* Drop zone */}
        <motion.div
          className={`landing-dropzone${dragOver ? ' landing-dropzone--active' : ''}`}
          initial={prefersReduced ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: [0.32, 0.72, 0, 1], delay: 0.16 }}
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

          <p className="landing-dropzone-headline">{t.dropHeadline}</p>

          <button
            type="button"
            className="btn-primary landing-choose-btn"
            onClick={() => inputRef.current?.click()}
          >
            <span>{t.chooseFile}</span>
            <span className="choose-arrow" aria-hidden="true">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12L12 4" />
                <path d="M6 4h6v6" />
              </svg>
            </span>
          </button>

          {/* Exact text preserved for App.test empty-state assertion (en default) */}
          <p className="landing-dropzone-hint">{t.openHint}</p>

          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg"
            multiple
            aria-label="Choose PDF file"
            style={{ display: 'none' }}
            onChange={handleChange}
          />
        </motion.div>
      </div>
    </div>
  )
}

function FeatureCard({ icon, name, desc }: { icon: React.ReactNode; name: string; desc: string }) {
  // Double-Bezel: outer shell + inner core, vertical (icon → title → desc)
  return (
    <div className="feature-card">
      <div className="feature-card-inner">
        <span className="feature-card-icon">{icon}</span>
        <span className="feature-card-name">{name}</span>
        <span className="feature-card-desc">{desc}</span>
      </div>
    </div>
  )
}
