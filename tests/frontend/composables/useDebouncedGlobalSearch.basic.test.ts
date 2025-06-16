import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useDebouncedGlobalSearch } from '@/composables/useDebouncedGlobalSearch'

// Mock @vueuse/core
vi.mock('@vueuse/core', () => ({
  useLocalStorage: vi.fn((key: string, defaultValue: any) => {
    const storage = new Map()
    return {
      get value() {
        return storage.get(key) ?? defaultValue
      },
      set value(val: any) {
        storage.set(key, val)
      }
    }
  }),
  useDebounceFn: vi.fn((fn: Function, delay: number) => {
    // 简化的防抖实现用于测试
    return Object.assign(fn, { cancel: vi.fn() })
  }),
  useThrottleFn: vi.fn((fn: Function) => fn)
}))

describe('useDebouncedGlobalSearch 基础功能', () => {
  let debouncedSearch: ReturnType<typeof useDebouncedGlobalSearch>

  beforeEach(() => {
    debouncedSearch = useDebouncedGlobalSearch({
      debounceDelay: 100,
      enableCache: true,
      cacheExpiry: 1000
    })
  })

  describe('配置和初始化', () => {
    it('应该使用默认配置', () => {
      const defaultSearch = useDebouncedGlobalSearch()
      expect(defaultSearch.config.debounceDelay).toBe(300)
      expect(defaultSearch.config.enableCache).toBe(true)
      expect(defaultSearch.config.minQueryLength).toBe(1)
    })

    it('应该应用自定义配置', () => {
      const customSearch = useDebouncedGlobalSearch({
        debounceDelay: 500,
        minQueryLength: 3,
        enableCache: false
      })

      expect(customSearch.config.debounceDelay).toBe(500)
      expect(customSearch.config.minQueryLength).toBe(3)
      expect(customSearch.config.enableCache).toBe(false)
    })
  })

  describe('查询验证', () => {
    it('应该验证有效查询', () => {
      const result = debouncedSearch.validateQuery('valid query')
      expect(result.isValid).toBe(true)
    })

    it('应该拒绝空查询', () => {
      const result = debouncedSearch.validateQuery('')
      expect(result.isValid).toBe(false)
      expect(result.reason).toContain('too short')
    })

    it('应该拒绝过长查询', () => {
      const longQuery = 'a'.repeat(101)
      const result = debouncedSearch.validateQuery(longQuery)
      expect(result.isValid).toBe(false)
      expect(result.reason).toContain('too long')
    })

    it('应该检测恶意内容', () => {
      const maliciousQueries = [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        'onload=alert(1)'
      ]

      maliciousQueries.forEach(query => {
        const result = debouncedSearch.validateQuery(query)
        expect(result.isValid).toBe(false)
        expect(result.reason).toBe('Invalid characters detected')
      })
    })
  })

  describe('状态管理', () => {
    it('应该初始化正确的状态', () => {
      expect(debouncedSearch.isSearching.value).toBe(false)
      expect(debouncedSearch.hasActiveSearch.value).toBe(false)
      expect(debouncedSearch.searchState.value.searchCount).toBe(0)
    })

    it('应该提供搜索统计', () => {
      const stats = debouncedSearch.getSearchStats()
      expect(stats).toHaveProperty('searchState')
      expect(stats).toHaveProperty('metrics')
      expect(stats).toHaveProperty('cacheSize')
      expect(stats).toHaveProperty('cacheHitRate')
    })

    it('应该正确计算缓存统计', () => {
      const cacheStats = debouncedSearch.cacheStats.value
      expect(cacheStats.size).toBe(0)
      expect(cacheStats.hitRate).toBe(0)
    })
  })

  describe('搜索功能', () => {
    it('应该能够执行搜索', async () => {
      const results = await debouncedSearch.searchImmediate('test query')
      expect(Array.isArray(results)).toBe(true)
    })

    it('应该在无效查询时返回空结果', async () => {
      const results = await debouncedSearch.searchImmediate('')
      expect(results).toEqual([])
    })
  })

  describe('缓存管理', () => {
    it('应该提供缓存清理功能', () => {
      expect(typeof debouncedSearch.clearCache).toBe('function')
      expect(typeof debouncedSearch.cleanupExpiredCache).toBe('function')
    })

    it('应该能够清空缓存', () => {
      debouncedSearch.clearCache()
      expect(debouncedSearch.cacheStats.value.size).toBe(0)
    })
  })

  describe('工具方法', () => {
    it('应该提供搜索取消功能', () => {
      expect(typeof debouncedSearch.cancelCurrentSearch).toBe('function')
      expect(typeof debouncedSearch.clearSearch).toBe('function')
    })

    it('应该提供配置访问', () => {
      expect(debouncedSearch.config).toBeDefined()
      expect(typeof debouncedSearch.config.debounceDelay).toBe('number')
    })
  })
})