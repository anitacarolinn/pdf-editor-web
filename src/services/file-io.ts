export async function readFileAsBytes(file: File): Promise<Uint8Array> {
  const buf = await file.arrayBuffer()
  return new Uint8Array(buf)
}
