import { describe, it, expect } from 'vitest'
import { imageName } from './image-export'

describe('imageName', () => {
  it('maps type to extension, jpeg -> jpg', () => {
    expect(imageName(1, 'png')).toBe('page-1.png')
    expect(imageName(5, 'jpeg')).toBe('page-5.jpg')
  })
})
