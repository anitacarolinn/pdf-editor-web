export default function Toolbar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="flex items-center gap-2 border-b bg-white px-4 py-2 shadow-sm">
      <span className="font-semibold text-slate-800">PDF Editor</span>
      <div className="ml-4 flex items-center gap-2">{children}</div>
    </header>
  )
}
