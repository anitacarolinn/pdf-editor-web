// Return a permutation of [0..n-1] with `from` moved to `to`.
export function moveIndex(n: number, from: number, to: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i)
  const [x] = arr.splice(from, 1)
  arr.splice(to, 0, x)
  return arr
}
