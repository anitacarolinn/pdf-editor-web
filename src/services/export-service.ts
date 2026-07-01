export function downloadBytes(bytes: Uint8Array, fileName: string): void {
  const blob = new Blob([bytes.slice().buffer], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke after a tick — revoking immediately can cancel the download in some
  // browsers before it starts.
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}
