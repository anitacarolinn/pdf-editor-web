import { describe, it, expect } from 'vitest'
import { moveIndex } from '../services/order-util'

describe('moveIndex', () => {
  it('moves an index to a new position', () => {
    expect(moveIndex(3, 0, 2)).toEqual([1, 2, 0]) // move 0 -> 2 in [0,1,2]
    expect(moveIndex(3, 2, 0)).toEqual([2, 0, 1])
  })
})
