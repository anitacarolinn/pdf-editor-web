import { useRef } from 'react'

export default function Toolbar({
  onOpen,
  children,
}: {
  onOpen: (file: File) => void
  children?: React.ReactNode
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <header className="flex items-center gap-2 border-b bg-white px-4 py-2 shadow-sm">
      <span className="font-semibold text-slate-800">PDF Editor</span>
      <button
        className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
        onClick={() => inputRef.current?.click()}
      >
        Open PDF
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onOpen(f)
          e.target.value = ''
        }}
      />
      <div className="ml-4 flex items-center gap-2">{children}</div>
    </header>
  )
}
