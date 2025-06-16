import { reactive, computed, readonly } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import type { SearchResult } from '@/types'

/**
 * 搜索历史记录接口
 */
export interface SearchHistoryItem {
  id: string
  query: string
  timestamp: number
  resultCount: number
}

/**
 * 搜索状态接口
 */
export interface SearchState {
  isLoading: boolean
  isOpen: boolean
  currentQuery: string
  results: SearchResult[]
  groupedResults: Array<{ type: string; items: SearchResult[] }>
  selectedIndex: number
  error: string | null
}

/**
 * 搜索统计接口
 */
export interface SearchStats {
  totalSearches: number
  averageResultCount: number
  popularQueries: Array<{ query: string; count: number }>
  recentSearchTime: number
}

/**
 * 全局搜索数据管理组合式函数
 * 
 * 功能特性：
 * - 响应式搜索状态管理
 * - 搜索历史持久化（本地存储）
 * - 搜索结果分组和过滤
 * - 搜索统计和分析
 * - 自动清理过期历史记录
 */
export function useGlobalSearchData() {
  // 常量配置
  const MAX_HISTORY_SIZE = 10
  const HISTORY_EXPIRY_DAYS = 30
  const STATS_STORAGE_KEY = 'global-search-stats'
  const HISTORY_STORAGE_KEY = 'global-search-history'

  // 搜索状态（响应式）
  const searchState = reactive<SearchState>({
    isLoading: false,
    isOpen: false,
    currentQuery: '',
    results: [],
    groupedResults: [],
    selectedIndex: -1,
    error: null
  })

  // 搜索历史（持久化到本地存储）
  const searchHistory = useLocalStorage<SearchHistoryItem[]>(
    HISTORY_STORAGE_KEY,
    [],
    {
      serializer: {
        read: (value: string) => {
          try {
            const parsed = JSON.parse(value)
            // 清理过期的历史记录
            const cutoffTime = Date.now() - (HISTORY_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
            return parsed.filter((item: SearchHistoryItem) => item.timestamp > cutoffTime)
          } catch {
            return []
          }
        },
        write: (value: SearchHistoryItem[]) => JSON.stringify(value)
      }
    }
  )

  // 搜索统计（持久化到本地存储）
  const searchStats = useLocalStorage<SearchStats>(
    STATS_STORAGE_KEY,
    {
      totalSearches: 0,
      averageResultCount: 0,
      popularQueries: [],
      recentSearchTime: 0
    }
  )

  // 计算属性：最近搜索
  const recentSearches = computed(() => {
    return searchHistory.value
      .slice(0, 5)
      .map(item => item.query)
  })

  // 计算属性：热门搜索
  const popularSearches = computed(() => {
    return searchStats.value.popularQueries
      .slice(0, 8)
      .map(item => item.query)
  })

  // 计算属性：是否有搜索结果
  const hasResults = computed(() => {
    return searchState.results.length > 0
  })

  // 计算属性：当前选中的搜索结果
  const selectedResult = computed(() => {
    if (searchState.selectedIndex >= 0 && searchState.selectedIndex < searchState.results.length) {
      return searchState.results[searchState.selectedIndex]
    }
    return null
  })

  /**
   * 设置搜索状态
   */
  const setSearchState = (updates: Partial<SearchState>) => {
    Object.assign(searchState, updates)
  }

  /**
   * 重置搜索状态
   */
  const resetSearchState = () => {
    searchState.isLoading = false
    searchState.isOpen = false
    searchState.currentQuery = ''
    searchState.results = []
    searchState.groupedResults = []
    searchState.selectedIndex = -1
    searchState.error = null
  }

  /**
   * 添加搜索历史记录
   */
  const addToHistory = (query: string, resultCount: number) => {
    if (!query.trim()) return

    const historyItem: SearchHistoryItem = {
      id: `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      query: query.trim(),
      timestamp: Date.now(),
      resultCount
    }

    // 移除重复的查询
    const filteredHistory = searchHistory.value.filter(item => 
      item.query.toLowerCase() !== query.toLowerCase()
    )

    // 添加新记录到开头
    searchHistory.value = [historyItem, ...filteredHistory].slice(0, MAX_HISTORY_SIZE)

    // 更新统计信息
    updateSearchStats(query, resultCount)
  }

  /**
   * 更新搜索统计
   */
  const updateSearchStats = (query: string, resultCount: number) => {
    const stats = searchStats.value
    
    // 更新总搜索次数
    stats.totalSearches += 1
    
    // 更新平均结果数
    stats.averageResultCount = Math.round(
      ((stats.averageResultCount * (stats.totalSearches - 1)) + resultCount) / stats.totalSearches
    )
    
    // 更新最近搜索时间
    stats.recentSearchTime = Date.now()
    
    // 更新热门查询
    const existingQuery = stats.popularQueries.find(item => 
      item.query.toLowerCase() === query.toLowerCase()
    )
    
    if (existingQuery) {
      existingQuery.count += 1
    } else {
      stats.popularQueries.push({ query, count: 1 })
    }
    
    // 按次数排序并限制数量
    stats.popularQueries = stats.popularQueries
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
    
    searchStats.value = stats
  }

  /**
   * 删除历史记录
   */
  const removeFromHistory = (historyId: string) => {
    searchHistory.value = searchHistory.value.filter(item => item.id !== historyId)
  }

  /**
   * 清空所有历史记录
   */
  const clearHistory = () => {
    searchHistory.value = []
  }

  /**
   * 清空搜索统计
   */
  const clearStats = () => {
    searchStats.value = {
      totalSearches: 0,
      averageResultCount: 0,
      popularQueries: [],
      recentSearchTime: 0
    }
  }

  /**
   * 设置搜索结果
   */
  const setSearchResults = (results: SearchResult[]) => {
    searchState.results = results
    searchState.groupedResults = groupResultsByType(results)
    searchState.selectedIndex = results.length > 0 ? 0 : -1
  }

  /**
   * 按类型分组搜索结果
   */
  const groupResultsByType = (results: SearchResult[]) => {
    const groups = new Map<string, SearchResult[]>()
    
    results.forEach(result => {
      if (!groups.has(result.type)) {
        groups.set(result.type, [])
      }
      groups.get(result.type)!.push(result)
    })
    
    // 类型优先级排序
    const typePriority = { 
      page: 0, 
      order: 1, 
      product: 2, 
      user: 3, 
      setting: 4 
    }
    
    return Array.from(groups.entries())
      .map(([type, items]) => ({ type, items }))
      .sort((a, b) => {
        const priorityA = typePriority[a.type as keyof typeof typePriority] ?? 999
        const priorityB = typePriority[b.type as keyof typeof typePriority] ?? 999
        return priorityA - priorityB
      })
  }

  /**
   * 移动选中索引
   */
  const moveSelection = (direction: 'up' | 'down') => {
    const totalResults = searchState.results.length
    if (totalResults === 0) return

    if (direction === 'up') {
      searchState.selectedIndex = searchState.selectedIndex <= 0 
        ? totalResults - 1 
        : searchState.selectedIndex - 1
    } else {
      searchState.selectedIndex = searchState.selectedIndex >= totalResults - 1 
        ? 0 
        : searchState.selectedIndex + 1
    }
  }

  /**
   * 设置选中索引
   */
  const setSelectedIndex = (index: number) => {
    if (index >= 0 && index < searchState.results.length) {
      searchState.selectedIndex = index
    }
  }

  /**
   * 获取搜索建议（基于历史记录）
   */
  const getSearchSuggestions = (currentQuery: string = '') => {
    const query = currentQuery.toLowerCase()
    
    if (!query) {
      return {
        recent: recentSearches.value.slice(0, 3),
        popular: popularSearches.value.slice(0, 3)
      }
    }
    
    // 过滤匹配的历史记录
    const matchingHistory = searchHistory.value
      .filter(item => item.query.toLowerCase().includes(query))
      .slice(0, 5)
      .map(item => item.query)
    
    return {
      matching: matchingHistory,
      recent: recentSearches.value.filter(q => q !== currentQuery).slice(0, 2),
      popular: popularSearches.value.filter(q => q !== currentQuery).slice(0, 2)
    }
  }

  // 返回公共API
  return {
    // 响应式状态
    searchState: readonly(searchState),
    searchHistory: readonly(searchHistory),
    searchStats: readonly(searchStats),
    
    // 计算属性
    recentSearches,
    popularSearches,
    hasResults,
    selectedResult,
    
    // 状态管理方法
    setSearchState,
    resetSearchState,
    setSearchResults,
    
    // 历史记录管理
    addToHistory,
    removeFromHistory,
    clearHistory,
    clearStats,
    
    // 选择管理
    moveSelection,
    setSelectedIndex,
    
    // 搜索建议
    getSearchSuggestions,
    
    // 工具方法
    groupResultsByType
  }
}

// 单例模式：全局搜索数据实例
let globalSearchDataInstance: ReturnType<typeof useGlobalSearchData> | null = null

/**
 * 获取全局搜索数据实例（单例模式）
 */
export function getGlobalSearchData() {
  if (!globalSearchDataInstance) {
    globalSearchDataInstance = useGlobalSearchData()
  }
  return globalSearchDataInstance
}