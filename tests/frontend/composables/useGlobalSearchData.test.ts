import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useGlobalSearchData, getGlobalSearchData } from '@/composables/useGlobalSearchData'
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
  })
}))

describe('useGlobalSearchData', () => {
  let searchData: ReturnType<typeof useGlobalSearchData>

  beforeEach(() => {
    searchData = useGlobalSearchData()
  })

  describe('搜索状态管理', () => {
    it('应该初始化默认搜索状态', () => {
      expect(searchData.searchState.isLoading).toBe(false)
      expect(searchData.searchState.isOpen).toBe(false)
      expect(searchData.searchState.currentQuery).toBe('')
      expect(searchData.searchState.results).toEqual([])
      expect(searchData.searchState.selectedIndex).toBe(-1)
      expect(searchData.searchState.error).toBeNull()
    })

    it('应该能够设置搜索状态', () => {
      searchData.setSearchState({
        isLoading: true,
        currentQuery: 'test query',
        isOpen: true
      })

      expect(searchData.searchState.isLoading).toBe(true)
      expect(searchData.searchState.currentQuery).toBe('test query')
      expect(searchData.searchState.isOpen).toBe(true)
    })

    it('应该能够重置搜索状态', () => {
      // 先设置一些状态
      searchData.setSearchState({
        isLoading: true,
        currentQuery: 'test',
        isOpen: true,
        error: 'some error'
      })

      // 重置状态
      searchData.resetSearchState()

      expect(searchData.searchState.isLoading).toBe(false)
      expect(searchData.searchState.currentQuery).toBe('')
      expect(searchData.searchState.isOpen).toBe(false)
      expect(searchData.searchState.error).toBeNull()
    })
  })

  describe('搜索结果管理', () => {
    const mockResults: SearchResult[] = [
      {
        id: 'result-1',
        type: 'page',
        title: '测试页面',
        description: '这是一个测试页面'
      },
      {
        id: 'result-2',
        type: 'order',
        title: '订单 #123',
        description: '测试订单'
      },
      {
        id: 'result-3',
        type: 'user',
        title: '张三',
        description: '测试用户'
      }
    ]

    it('应该能够设置搜索结果', () => {
      searchData.setSearchResults(mockResults)

      expect(searchData.searchState.results).toEqual(mockResults)
      expect(searchData.searchState.selectedIndex).toBe(0)
      expect(searchData.hasResults.value).toBe(true)
    })

    it('应该能够按类型分组搜索结果', () => {
      searchData.setSearchResults(mockResults)

      const grouped = searchData.searchState.groupedResults
      expect(grouped).toHaveLength(3)
      
      // 验证分组顺序（page 优先级最高）
      expect(grouped[0].type).toBe('page')
      expect(grouped[1].type).toBe('order')
      expect(grouped[2].type).toBe('user')
    })

    it('应该能够管理选中索引', () => {
      searchData.setSearchResults(mockResults)

      // 测试向下移动
      searchData.moveSelection('down')
      expect(searchData.searchState.selectedIndex).toBe(1)

      // 测试向上移动
      searchData.moveSelection('up')
      expect(searchData.searchState.selectedIndex).toBe(0)

      // 测试设置特定索引
      searchData.setSelectedIndex(2)
      expect(searchData.searchState.selectedIndex).toBe(2)
      expect(searchData.selectedResult.value).toEqual(mockResults[2])
    })
  })

  describe('搜索历史管理', () => {
    it('应该能够添加搜索历史', () => {
      searchData.addToHistory('测试查询', 5)

      expect(searchData.searchHistory.value).toHaveLength(1)
      expect(searchData.searchHistory.value[0].query).toBe('测试查询')
      expect(searchData.searchHistory.value[0].resultCount).toBe(5)
    })

    it('应该去除重复的搜索历史', () => {
      searchData.addToHistory('测试查询', 5)
      searchData.addToHistory('测试查询', 3)

      expect(searchData.searchHistory.value).toHaveLength(1)
      expect(searchData.searchHistory.value[0].resultCount).toBe(3) // 最新的记录
    })

    it('应该能够删除特定历史记录', () => {
      searchData.addToHistory('查询1', 5)
      searchData.addToHistory('查询2', 3)

      const historyId = searchData.searchHistory.value[0].id
      searchData.removeFromHistory(historyId)

      expect(searchData.searchHistory.value).toHaveLength(1)
      expect(searchData.searchHistory.value[0].query).toBe('查询1')
    })

    it('应该能够清空所有历史记录', () => {
      searchData.addToHistory('查询1', 5)
      searchData.addToHistory('查询2', 3)

      searchData.clearHistory()

      expect(searchData.searchHistory.value).toHaveLength(0)
    })
  })

  describe('搜索统计', () => {
    it('应该能够更新搜索统计', () => {
      searchData.addToHistory('测试查询', 5)

      expect(searchData.searchStats.value.totalSearches).toBe(1)
      expect(searchData.searchStats.value.averageResultCount).toBe(5)
      expect(searchData.searchStats.value.popularQueries).toHaveLength(1)
      expect(searchData.searchStats.value.popularQueries[0].query).toBe('测试查询')
      expect(searchData.searchStats.value.popularQueries[0].count).toBe(1)
    })

    it('应该能够统计热门查询', () => {
      searchData.addToHistory('查询A', 5)
      searchData.addToHistory('查询B', 3)
      searchData.addToHistory('查询A', 7) // 重复查询

      const popularQueries = searchData.searchStats.value.popularQueries
      expect(popularQueries).toHaveLength(2)
      expect(popularQueries[0].query).toBe('查询A') // 最热门
      expect(popularQueries[0].count).toBe(2)
      expect(popularQueries[1].count).toBe(1)
    })
  })

  describe('搜索建议', () => {
    beforeEach(() => {
      searchData.clearHistory()
      searchData.clearStats()
    })

    it('应该能够获取搜索建议', () => {
      searchData.addToHistory('历史查询1', 5)
      searchData.addToHistory('历史查询2', 3)

      const suggestions = searchData.getSearchSuggestions()

      expect(suggestions.recent).toContain('历史查询2')
      expect(suggestions.recent).toContain('历史查询1')
    })

    it('应该能够基于当前查询过滤建议', () => {
      searchData.addToHistory('用户管理', 5)
      searchData.addToHistory('用户设置', 3)
      searchData.addToHistory('订单管理', 2)

      const suggestions = searchData.getSearchSuggestions('用户')

      expect(suggestions.matching).toContain('用户管理')
      expect(suggestions.matching).toContain('用户设置')
      expect(suggestions.matching).not.toContain('订单管理')
    })
  })

  describe('单例模式', () => {
    it('getGlobalSearchData应该返回同一个实例', () => {
      const instance1 = getGlobalSearchData()
      const instance2 = getGlobalSearchData()

      expect(instance1).toBe(instance2)
    })
  })
})