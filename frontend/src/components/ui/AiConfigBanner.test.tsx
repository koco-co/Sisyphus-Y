import { describe, it, expect } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { AiConfigBanner } from './AiConfigBanner'

describe('AiConfigBanner', () => {
  it('shows warning when AI not configured', () => {
    // RED: AI 未配置时显示警告横幅
    expect(true).toBe(false) // Stub - implement in 05-05
  })

  it('hides when AI is configured', () => {
    expect(true).toBe(false) // Stub - implement in 05-05
  })

  it('contains link to settings', () => {
    expect(true).toBe(false) // Stub - implement in 05-05
  })
})
