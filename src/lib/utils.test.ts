import { describe, it, expect } from 'vitest'

describe('Sample Test Suite', () => {
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should handle string operations', () => {
    const str = 'Hello, World!'
    expect(str).toContain('World')
    expect(str.length).toBe(13)
  })

  it('should handle array operations', () => {
    const arr = [1, 2, 3, 4, 5]
    expect(arr).toHaveLength(5)
    expect(arr).toContain(3)
  })
})
