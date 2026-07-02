import { useRef, useState } from 'react'
import { motion, useReducedMotion, useSpring } from 'motion/react'
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

  // Cursor-follow for the ambient orb: it drifts out of the corner toward the
  // cursor. The farther the cursor from the bottom-right, the more it emerges.
  const orbX = useSpring(0, { stiffness: 45, damping: 18, mass: 0.7 })
  const orbY = useSpring(0, { stiffness: 45, damping: 18, mass: 0.7 })
  // Second orb drifts less (parallax depth) and softer
  const orbX2 = useSpring(0, { stiffness: 32, damping: 20, mass: 0.9 })
  const orbY2 = useSpring(0, { stiffness: 32, damping: 20, mass: 0.9 })

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (prefersReduced) return
    // Distance from the bottom-right corner (always <= 0)
    const dx = e.clientX - window.innerWidth
    const dy = e.clientY - window.innerHeight
    orbX.set(Math.max(-110, dx * 0.07))
    orbY.set(Math.max(-90, dy * 0.07))
    orbX2.set(Math.max(-64, dx * 0.038))
    orbY2.set(Math.max(-54, dy * 0.038))
  }

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
      (f) =>
        ACCEPTED_TYPES.includes(f.type) ||
        f.name.endsWith('.pdf') ||
        f.name.endsWith('.png') ||
        f.name.endsWith('.jpg') ||
        f.name.endsWith('.jpeg'),
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

  // Slower: 6s per feature instead of 3.5s
  const duration = features.length * 6

  return (
    <div
      className="lp-root"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseMove={handleMouseMove}
    >
      {/* Decorative blurred orb — bottom-right ambient glow: gentle idle float
          (wrapper) + cursor-follow drift (inner glow). */}
      <div className="lp-orb" aria-hidden="true">
        <motion.div className="lp-orb-glow" style={{ x: orbX, y: orbY }} />
        <motion.div className="lp-orb-grain" style={{ x: orbX, y: orbY }} />
      </div>
      <div className="lp-orb lp-orb--2" aria-hidden="true">
        <motion.div className="lp-orb-glow lp-orb-glow--rose" style={{ x: orbX2, y: orbY2 }} />
      </div>

      {/* LEFT — Feature filmstrip */}
      <div className="lp-filmstrip" aria-label="Feature overview" aria-hidden="true">
        <div className="lp-filmstrip-mask">
          {prefersReduced ? (
            <div className="lp-loop-static">
              {features.slice(0, 4).map((f, i) => (
                <FeatureCard key={i} icon={FEATURE_ICONS[i % FEATURE_ICONS.length]} name={f.name} desc={f.desc} />
              ))}
            </div>
          ) : (
            <motion.div
              className="lp-loop-track"
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

      {/* RIGHT — Hero */}
      <div className="lp-hero">
        {/* Language toggle — top-right absolute within hero */}
        <div className="lp-lang-toggle" role="group" aria-label="Language">
          <button
            type="button"
            className={`lp-lang-btn${lang === 'en' ? ' lp-lang-btn--active' : ''}`}
            aria-pressed={lang === 'en'}
            onClick={() => setLang('en')}
          >
            {t.langEn}
          </button>
          <span className="lp-lang-sep" aria-hidden="true" />
          <button
            type="button"
            className={`lp-lang-btn${lang === 'zh' ? ' lp-lang-btn--active' : ''}`}
            aria-pressed={lang === 'zh'}
            onClick={() => setLang('zh')}
          >
            {t.langZh}
          </button>
        </div>

        {/* Meta label row */}
        <div className="lp-meta-label">
          <span className="lp-meta-dot" aria-hidden="true" />
          <span className="lp-meta-product">PDF EDITOR</span>
          <span className="lp-meta-divider" aria-hidden="true" />
          <span className="lp-meta-tag">{t.metaTag}</span>
        </div>

        {/* Headline */}
        <h1 className="lp-headline">{t.headline}</h1>

        {/* Subline */}
        <p className="lp-subline">{t.tagline}</p>

        {/* Dropzone card */}
        <motion.div
          className={`lp-dropzone${dragOver ? ' lp-dropzone--active' : ''}`}
          initial={prefersReduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1], delay: 0.12 }}
          role="region"
          aria-label="PDF drop zone"
        >
          {/* Upload icon tile */}
          <div className="lp-dropzone-icon-tile" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4" />
              <path d="M8 8l4-4 4 4" />
              <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
          </div>

          <p className="lp-dropzone-headline">{t.dropHeadline}</p>

          {/* CTA amber pill */}
          <button
            type="button"
            className="lp-choose-btn"
            onClick={() => inputRef.current?.click()}
          >
            <span>{t.chooseFile}</span>
            <span className="lp-choose-arrow" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12L12 4" />
                <path d="M6 4h6v6" />
              </svg>
            </span>
          </button>

          <p className="lp-dropzone-hint">{t.openHint}</p>

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
  return (
    <div className="lp-feature-card">
      <span className="lp-feature-icon">{icon}</span>
      <span className="lp-feature-name">{name}</span>
      <span className="lp-feature-desc">{desc}</span>
    </div>
  )
}
