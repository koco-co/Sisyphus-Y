import { describe, it, expect, vi, beforeEach } from 'bun:test'
import { render, screen, waitFor } from '@testing-library/react'
import RecyclePage from './page'

vi.mock('@/lib/api', () => ({
  recycleApi: {
    cleanup: vi.fn().mockResolvedValue({ deleted: 0 }),
    list: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    restore: vi.fn().mockResolvedValue({}),
    batchRestore: vi.fn().mockResolvedValue({}),
  }
}))

describe('RecyclePage', () => {
  it('calls cleanup API on mount', async () => {
    // RED: 页面加载时调用 cleanup API
    expect(true).toBe(false) // Stub - implement in 05-02
  })

  it('shows loading skeleton on first load', () => {
    // RED: 首次加载显示骨架屏
    expect(true).toBe(false) // Stub - implement in 05-02
  })

  it('filters by tab correctly', () => {
    // RED: Tab 筛选功能
    expect(true).toBe(false) // Stub - implement in 05-02
  })

  it('shows expiring items in red', () => {
    // RED: 即将过期项目标红
    expect(true).toBe(false) // Stub - implement in 05-02
  })
})
