export default function ThumbnailRail({ children }: { children?: React.ReactNode }) {
  return (
    <aside className="w-48 shrink-0 overflow-y-auto border-r bg-slate-50 p-2">
      {children}
    </aside>
  )
}
