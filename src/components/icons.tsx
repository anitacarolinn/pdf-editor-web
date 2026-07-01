// Inline SVG icon set for the PDF editor toolbar.
// All icons: 16×16, viewBox="0 0 16 16", stroke="currentColor",
// stroke-width="1.5", fill="none", round caps/joins, aria-hidden.

const BASE = {
  xmlns: 'http://www.w3.org/2000/svg',
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export function IconOpen() {
  return (
    <svg {...BASE}>
      {/* folder */}
      <path d="M1.5 4.5a1 1 0 0 1 1-1h3.4l1.2 1.6H13.5a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V4.5z" />
    </svg>
  )
}

export function IconInsertBlank() {
  return (
    <svg {...BASE}>
      {/* file outline */}
      <path d="M3 2h7l3 3v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
      <path d="M10 2v3h3" />
      {/* plus sign */}
      <path d="M6 8.5h4M8 6.5v4" />
    </svg>
  )
}

export function IconMerge() {
  return (
    <svg {...BASE}>
      {/* back sheet */}
      <path d="M5 4h5.5l2.5 2.5V13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
      <path d="M10.5 4v2.5H13" />
      {/* front sheet (offset) */}
      <path d="M2 2h5l2 2v6.5a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
      <path d="M7 2v2.5H9" />
    </svg>
  )
}

export function IconDelete() {
  return (
    <svg {...BASE}>
      {/* lid */}
      <path d="M2 4.5h12" />
      {/* handle */}
      <path d="M5.5 4.5V3a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5v1.5" />
      {/* body */}
      <path d="M3 4.5l.8 8a1 1 0 0 0 1 .9h6.4a1 1 0 0 0 1-.9l.8-8" />
      {/* cross lines */}
      <path d="M6.5 7.5v3M9.5 7.5v3" />
    </svg>
  )
}

export function IconDuplicate() {
  return (
    <svg {...BASE}>
      {/* back sheet */}
      <path d="M5.5 4.5h6a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z" />
      {/* front sheet */}
      <path d="M3.5 2.5h6a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z" />
    </svg>
  )
}

export function IconRotateLeft() {
  return (
    <svg {...BASE}>
      {/* arc ccw */}
      <path d="M3.5 8a4.5 4.5 0 1 1 1.3 3.2" />
      {/* arrowhead */}
      <path d="M3.5 11.5V8h3.5" />
    </svg>
  )
}

export function IconRotateRight() {
  return (
    <svg {...BASE}>
      {/* arc cw */}
      <path d="M12.5 8a4.5 4.5 0 1 0-1.3 3.2" />
      {/* arrowhead */}
      <path d="M12.5 11.5V8H9" />
    </svg>
  )
}

export function IconExtract() {
  return (
    <svg {...BASE}>
      {/* sheet */}
      <path d="M3 2h7l3 3v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
      <path d="M10 2v3h3" />
      {/* up arrow */}
      <path d="M8 12V7" />
      <path d="M5.5 9.5L8 7l2.5 2.5" />
    </svg>
  )
}

export function IconReplace() {
  return (
    <svg {...BASE}>
      {/* two-arrow swap */}
      <path d="M4 5.5h8" />
      <path d="M10 3.5l2 2-2 2" />
      <path d="M12 10.5H4" />
      <path d="M6 8.5l-2 2 2 2" />
    </svg>
  )
}

export function IconSplit() {
  return (
    <svg {...BASE}>
      {/* scissors body */}
      <circle cx="4.5" cy="4.5" r="1.5" />
      <circle cx="4.5" cy="11.5" r="1.5" />
      {/* blades */}
      <path d="M6 4.5L13.5 8 6 11.5" />
      {/* pivot cross */}
      <path d="M8.5 7.2L10.5 8l-2 .8" />
    </svg>
  )
}

export function IconPageNumber() {
  return (
    <svg {...BASE}>
      {/* circle */}
      <circle cx="8" cy="8" r="6" />
      {/* hash */}
      <path d="M5.5 6.5h5M5.5 9.5h5M7 5v6M9 5v6" />
    </svg>
  )
}

export function IconWatermark() {
  return (
    <svg {...BASE}>
      {/* droplet */}
      <path d="M8 2.5C8 2.5 3.5 7.5 3.5 10a4.5 4.5 0 0 0 9 0C12.5 7.5 8 2.5 8 2.5z" />
      {/* inner line to suggest text/mark */}
      <path d="M6 10.5a2.5 2.5 0 0 0 4 0" />
    </svg>
  )
}

export function IconShrink() {
  return (
    <svg {...BASE}>
      {/* four inward-pointing arrows */}
      <path d="M3 3l3.5 3.5M3 3h3M3 3v3" />
      <path d="M13 3l-3.5 3.5M13 3h-3M13 3v3" />
      <path d="M3 13l3.5-3.5M3 13h3M3 13v-3" />
      <path d="M13 13l-3.5-3.5M13 13h-3M13 13v-3" />
    </svg>
  )
}

export function IconInfo() {
  return (
    <svg {...BASE}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 7.5v4" />
      <circle cx="8" cy="5.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconUndo() {
  return (
    <svg {...BASE}>
      <path d="M3.5 8a4.5 4.5 0 1 1 0 2" />
      <path d="M3.5 5.5V8.5H6.5" />
    </svg>
  )
}

export function IconRedo() {
  return (
    <svg {...BASE}>
      <path d="M12.5 8a4.5 4.5 0 1 0 0 2" />
      <path d="M12.5 5.5V8.5H9.5" />
    </svg>
  )
}

export function IconDownload() {
  return (
    <svg {...BASE}>
      {/* tray */}
      <path d="M2 12h12v2H2z" />
      {/* down arrow */}
      <path d="M8 3v7" />
      <path d="M5 8l3 3 3-3" />
    </svg>
  )
}
