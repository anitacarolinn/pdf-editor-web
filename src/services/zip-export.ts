import JSZip from 'jszip'

export async function buildZip(
  files: { name: string; bytes: Uint8Array }[],
): Promise<Uint8Array> {
  const zip = new JSZip()
  for (const f of files) zip.file(f.name, f.bytes)
  return zip.generateAsync({ type: 'uint8array' })
}

export async function downloadZip(
  files: { name: string; bytes: Uint8Array }[],
  zipName: string,
): Promise<void> {
  const bytes = await buildZip(files)
  const blob = new Blob([bytes.slice().buffer], { type: 'application/zip' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = zipName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
