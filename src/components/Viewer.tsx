export default function Viewer({ children }: { children?: React.ReactNode }) {
  return (
    <main className="flex-1 overflow-auto bg-slate-200 p-6">{children}</main>
  )
}
