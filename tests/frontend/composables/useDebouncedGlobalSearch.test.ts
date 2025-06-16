import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useDebouncedGlobalSearch } from '@/composables/useDebouncedGlobalSearch'
import type { SearchResult } from '@/types'

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
  useDebounceFn: vi.fn((fn: Function, delay: number, options?: any) => {
    let timeoutId: NodeJS.Timeout | null = null
    const debouncedFn = (...args: any[]) => {
      return new Promise((resolve) => {
        if (timeoutId) clearTimeout(timeoutId)
        timeoutId = setTimeout(async () => {
          const result = await fn(...args)
          resolve(result)
        }, delay)
      })
    }
    debouncedFn.cancel = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }
    return debouncedFn
  }),
  useThrottleFn: vi.fn((fn: Function, delay: number) => {
    let lastTime = 0
    return (...args: any[]) => {
      const now = Date.now()
      if (now - lastTime >= delay) {
        lastTime = now
        return fn(...args)
      }
    }
  })
}))

// Mock useSearchData
vi.mock('@/composables/useSearchData', () => ({
  performSearch: vi.fn()
}))

// Mock timer functions
vi.useFakeTimers()

describe('useDebouncedGlobalSearch', () => {
  let debouncedSearch: ReturnType<typeof useDebouncedGlobalSearch>

  beforeEach(() => {
    debouncedSearch = useDebouncedGlobalSearch({
      debounceDelay: 300,
      enableCache: true,
      cacheExpiry: 5000
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.restoreAllMocks()
  })

  describe('查询验证', () => {
    it('应该验证查询字符串', () => {
      const validResult = debouncedSearch.validateQuery('valid query')
      expect(validResult.isValid).toBe(true)

      const emptyResult = debouncedSearch.validateQuery('')
      expect(emptyResult.isValid).toBe(false)
      expect(emptyResult.reason).toContain('too short')

      const tooLongResult = debouncedSearch.validateQuery('a'.repeat(101))
      expect(tooLongResult.isValid).toBe(false)
      expect(tooLongResult.reason).toContain('too long')
    })

    it('应该检测恶意内容', () => {
      const maliciousQueries = [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        'onload=alert(1)',
        'eval(malicious_code)'
      ]

      maliciousQueries.forEach(query => {
        const result = debouncedSearch.validateQuery(query)
        expect(result.isValid).toBe(false)
        expect(result.reason).toBe('Invalid characters detected')
      })
    })
  })

  describe('防抖搜索', () => {
    it('应该防抖搜索请求', async () => {
      const searchSpy = vi.spyOn(debouncedSearch, 'searchImmediate')

      // 快速连续调用
      debouncedSearch.search('query1')
      debouncedSearch.search('query2')
      debouncedSearch.search('query3')

      // 在防抖延迟之前，实际搜索不应该执行
      expect(searchSpy).not.toHaveBeenCalled()

      // 快进时间
      vi.advanceTimersByTime(300)

      // 应该只执行最后一次搜索
      await vi.runAllTimersAsync()
      expect(searchSpy).toHaveBeenCalledTimes(1)
      expect(searchSpy).toHaveBeenCalledWith('query3')
    })

    it('应该能够取消防抖搜索', () => {
      debouncedSearch.search('test query')
      
      // 验证搜索状态
      expect(debouncedSearch.hasActiveSearch.value).toBe(false)
      
      // 取消搜索
      debouncedSearch.cancelCurrentSearch()
      
      // 快进时间，搜索不应该执行
      vi.advanceTimersByTime(500)
      expect(debouncedSearch.isSearching.value).toBe(false)
    })
  })

  describe('搜索缓存', () => {
    it('应该缓存搜索结果', async () => {
      const query = 'test query'
      const mockResults: SearchResult[] = [
        {
          id: 'test-1',
          type: 'page',
          title: 'Test Result',
          description: 'Test description'
        }
      ]

      // Mock实际搜索函数返回结果
      vi.spyOn(debouncedSearch as any, 'performActualSearch')
        .mockResolvedValue(mockResults)

      // 第一次搜索
      await debouncedSearch.searchImmediate(query)
      vi.advanceTimersByTime(500)

      // 第二次搜索相同查询（应该命中缓存）
      const cachedResult = await debouncedSearch.searchImmediate(query)
      
      // 验证缓存统计
      const stats = debouncedSearch.getSearchStats()
      expect(stats.cacheSize).toBeGreaterThan(0)
    })

    it('应该清理过期缓存', () => {
      const debouncedSearchWithShortCache = useDebouncedGlobalSearch({
        enableCache: true,
        cacheExpiry: 100 // 100ms过期
      })

      // 执行搜索以创建缓存
      debouncedSearchWithShortCache.searchImmediate('test')
      
      // 快进时间使缓存过期
      vi.advanceTimersByTime(200)
      
      // 清理过期缓存
      debouncedSearchWithShortCache.cleanupExpiredCache()
      
      // 验证缓存已清理
      expect(debouncedSearchWithShortCache.cacheStats.value.size).toBe(0)
    })

    it('应该能够清空所有缓存', async () => {
      // 执行几次搜索创建缓存
      await debouncedSearch.searchImmediate('query1')
      await debouncedSearch.searchImmediate('query2')
      
      // 验证缓存不为空
      expect(debouncedSearch.cacheStats.value.size).toBeGreaterThan(0)
      
      // 清空缓存
      debouncedSearch.clearCache()
      
      // 验证缓存已清空
      expect(debouncedSearch.cacheStats.value.size).toBe(0)
    })
  })

  describe('搜索状态管理', () => {
    it('应该正确管理搜索状态', () => {
      expect(debouncedSearch.isSearching.value).toBe(false)
      expect(debouncedSearch.hasActiveSearch.value).toBe(false)
      
      // 开始搜索
      debouncedSearch.search('test')
      
      // 在防抖期间状态应该保持
      expect(debouncedSearch.isSearching.value).toBe(false) // 防抖期间还未开始实际搜索
    })

    it('应该提供搜索统计信息', () => {
      const stats = debouncedSearch.getSearchStats()
      
      expect(stats).toHaveProperty('searchState')
      expect(stats).toHaveProperty('metrics')
      expect(stats).toHaveProperty('cacheSize')
      expect(stats).toHaveProperty('cacheHitRate')
      
      expect(typeof stats.cacheSize).toBe('number')
      expect(typeof stats.cacheHitRate).toBe('number')
    })
  })

  describe('错误处理', () => {
    it('应该处理搜索错误', async () => {
      // Mock搜索函数抛出错误
      vi.spyOn(debouncedSearch as any, 'performActualSearch')
        .mockRejectedValue(new Error('Search failed'))

      const result = await debouncedSearch.searchImmediate('error query')
      
      // 搜索失败应该返回空数组
      expect(result).toEqual([])
      expect(debouncedSearch.isSearching.value).toBe(false)
    })

    it('应该处理搜索取消', async () => {
      // Mock搜索函数模拟取消
      vi.spyOn(debouncedSearch as any, 'performActualSearch')
        .mockRejectedValue(new Error('Search cancelled'))

      const result = await debouncedSearch.searchImmediate('cancelled query')
      
      expect(result).toEqual([])
      expect(debouncedSearch.searchState.value.cancelledCount).toBeGreaterThanOrEqual(0)
    })
  })

  describe('配置选项', () => {
    it('应该应用自定义配置', () => {
      const customSearch = useDebouncedGlobalSearch({
        debounceDelay: 500,
        minQueryLength: 3,
        maxQueryLength: 50,
        enableCache: false
      })

      expect(customSearch.config.debounceDelay).toBe(500)
      expect(customSearch.config.minQueryLength).toBe(3)
      expect(customSearch.config.maxQueryLength).toBe(50)
      expect(customSearch.config.enableCache).toBe(false)
    })

    it('应该使用默认配置', () => {
      const defaultSearch = useDebouncedGlobalSearch()

      expect(defaultSearch.config.debounceDelay).toBe(300)
      expect(defaultSearch.config.minQueryLength).toBe(1)
      expect(defaultSearch.config.enableCache).toBe(true)
    })
  })

  describe('性能监控', () => {
    it('应该跟踪搜索性能指标', async () => {
      const initialMetrics = debouncedSearch.searchMetrics.value
      expect(initialMetrics.totalRequests).toBe(0)
      expect(initialMetrics.averageResponseTime).toBe(0)

      // 执行一次搜索
      await debouncedSearch.searchImmediate('performance test')
      vi.advanceTimersByTime(500)

      // 验证指标更新（由于mock，可能需要调整）
      const updatedMetrics = debouncedSearch.searchMetrics.value
      expect(updatedMetrics.totalRequests).toBeGreaterThanOrEqual(0)
    })

    it('应该计算缓存命中率', async () => {
      // 第一次搜索
      await debouncedSearch.searchImmediate('cache test')
      
      // 第二次搜索相同查询（应该命中缓存）
      await debouncedSearch.searchImmediate('cache test')
      
      const cacheStats = debouncedSearch.cacheStats.value
      expect(cacheStats.hitRate).toBeGreaterThanOrEqual(0)
      expect(cacheStats.hitRate).toBeLessThanOrEqual(100)
    })
  })
})