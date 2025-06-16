import { ref, computed, onUnmounted } from 'vue'
import { useDebounceFn, useThrottleFn } from '@vueuse/core'
import { getGlobalSearchData } from './useGlobalSearchData'
import { useSearchGrouping, type GroupingConfig, type GroupedResults } from '@/services/searchGrouping'
import type { SearchResult } from '@/types'

/**
 * 防抖搜索配置接口
 */
export interface DebouncedSearchOptions {
  /** 防抖延迟时间（毫秒） */
  debounceDelay?: number
  /** 节流延迟时间（毫秒），用于防止过于频繁的UI更新 */
  throttleDelay?: number
  /** 最小查询长度 */
  minQueryLength?: number
  /** 最大查询长度 */
  maxQueryLength?: number
  /** 是否启用缓存 */
  enableCache?: boolean
  /** 缓存过期时间（毫秒） */
  cacheExpiry?: number
  /** 是否在组件卸载时取消搜索 */
  cancelOnUnmount?: boolean
  /** 是否启用搜索结果分组 */
  enableGrouping?: boolean
  /** 搜索分组配置 */
  groupingConfig?: Partial<GroupingConfig>
}

/**
 * 搜索缓存项接口
 */
interface SearchCacheItem {
  results: SearchResult[]
  timestamp: number
  expiry: number
}

/**
 * 防抖搜索状态接口
 */
interface DebouncedSearchState {
  isSearching: boolean
  lastSearchTime: number
  searchCount: number
  cancelledCount: number
  cacheHitCount: number
  averageSearchTime: number
  groupedResults?: GroupedResults | null
}

/**
 * 防抖全局搜索组合式函数
 * 
 * 功能特性：
 * - 智能防抖/节流搜索
 * - 搜索结果缓存
 * - 搜索取消机制
 * - 性能监控和统计
 * - 自动清理过期缓存
 * - 搜索状态管理
 */
export function useDebouncedGlobalSearch(options: DebouncedSearchOptions = {}) {
  // 默认配置
  const config = {
    debounceDelay: 300,
    throttleDelay: 100,
    minQueryLength: 1,
    maxQueryLength: 100,
    enableCache: true,
    cacheExpiry: 5 * 60 * 1000, // 5分钟
    cancelOnUnmount: true,
    enableGrouping: true,
    groupingConfig: {
      strategy: 'intelligent' as const,
      maxGroups: 8,
      maxResultsPerGroup: 15
    },
    ...options
  }

  // 获取全局搜索数据实例
  const globalSearchData = getGlobalSearchData()
  
  // 获取搜索分组服务
  const { groupResults } = useSearchGrouping()

  // 搜索缓存
  const searchCache = new Map<string, SearchCacheItem>()
  
  // 当前搜索控制器
  let currentSearchController: AbortController | null = null
  
  // 防抖搜索状态
  const searchState = ref<DebouncedSearchState>({
    isSearching: false,
    lastSearchTime: 0,
    searchCount: 0,
    cancelledCount: 0,
    cacheHitCount: 0,
    averageSearchTime: 0,
    groupedResults: null
  })

  // 搜索性能指标
  const searchMetrics = ref({
    totalRequests: 0,
    cacheHits: 0,
    averageResponseTime: 0,
    lastSearchDuration: 0
  })

  /**
   * 验证搜索查询
   */
  const validateQuery = (query: string): { isValid: boolean; reason?: string } => {
    if (typeof query !== 'string') {
      return { isValid: false, reason: 'Query must be a string' }
    }

    const trimmedQuery = query.trim()
    
    if (trimmedQuery.length < config.minQueryLength) {
      return { isValid: false, reason: `Query too short (min: ${config.minQueryLength})` }
    }
    
    if (trimmedQuery.length > config.maxQueryLength) {
      return { isValid: false, reason: `Query too long (max: ${config.maxQueryLength})` }
    }

    // 检查恶意内容
    const maliciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\s*\(/i
    ]
    
    if (maliciousPatterns.some(pattern => pattern.test(trimmedQuery))) {
      return { isValid: false, reason: 'Invalid characters detected' }
    }

    return { isValid: true }
  }

  /**
   * 生成缓存键
   */
  const getCacheKey = (query: string): string => {
    return `search:${query.toLowerCase().trim()}`
  }

  /**
   * 检查缓存
   */
  const checkCache = (query: string): SearchResult[] | null => {
    if (!config.enableCache) return null

    const cacheKey = getCacheKey(query)
    const cached = searchCache.get(cacheKey)
    
    if (cached && Date.now() < cached.expiry) {
      searchState.value.cacheHitCount++
      searchMetrics.value.cacheHits++
      return cached.results
    }
    
    // 清理过期缓存
    if (cached && Date.now() >= cached.expiry) {
      searchCache.delete(cacheKey)
    }
    
    return null
  }

  /**
   * 设置缓存
   */
  const setCache = (query: string, results: SearchResult[]) => {
    if (!config.enableCache) return

    const cacheKey = getCacheKey(query)
    searchCache.set(cacheKey, {
      results: [...results], // 深拷贝防止引用问题
      timestamp: Date.now(),
      expiry: Date.now() + config.cacheExpiry
    })
  }

  /**
   * 清理过期缓存
   */
  const cleanupExpiredCache = () => {
    const now = Date.now()
    for (const [key, item] of searchCache.entries()) {
      if (now >= item.expiry) {
        searchCache.delete(key)
      }
    }
  }

  /**
   * 执行实际搜索
   */
  const performActualSearch = async (
    query: string, 
    signal?: AbortSignal
  ): Promise<SearchResult[]> => {
    const startTime = Date.now()
    
    try {
      // 导入搜索API服务
      const { SearchApiService } = await import('@/services/searchApi')
      
      // 执行真实的API搜索
      const results = await SearchApiService.globalSearch(
        {
          query,
          types: ['page', 'order', 'product', 'user', 'setting'],
          limit: 20,
          include_suggestions: false
        },
        {
          timeout: 8000, // 8秒超时
          retries: 1,    // 重试1次
          signal
        }
      )

      const duration = Date.now() - startTime
      
      // 更新性能指标
      searchMetrics.value.totalRequests++
      searchMetrics.value.lastSearchDuration = duration
      searchMetrics.value.averageResponseTime = Math.round(
        ((searchMetrics.value.averageResponseTime * (searchMetrics.value.totalRequests - 1)) + duration) /
        searchMetrics.value.totalRequests
      )

      return results
      
    } catch (error) {
      if (signal?.aborted || (error instanceof Error && error.message.includes('cancelled'))) {
        searchState.value.cancelledCount++
        throw new Error('Search cancelled')
      }
      
      // 处理API错误
      if (error instanceof Error) {
        console.error('搜索API错误:', error.message)
        
        // 对于开发环境，可以降级到模拟数据
        if (import.meta.env.DEV) {
          console.warn('降级到模拟搜索数据')
          return await performMockSearch(query, startTime)
        }
      }
      
      throw error
    }
  }

  /**
   * 模拟搜索（开发环境降级方案）
   */
  const performMockSearch = async (query: string, startTime: number): Promise<SearchResult[]> => {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200))

    const mockResults: SearchResult[] = [
      {
        id: `result-${Date.now()}-1`,
        type: 'page',
        title: `搜索结果: ${query}`,
        description: `找到与"${query}"相关的页面`,
        url: `/search?q=${encodeURIComponent(query)}`
      },
      {
        id: `result-${Date.now()}-2`,
        type: 'order',
        title: `订单搜索: ${query}`,
        description: `包含"${query}"的订单记录`,
        url: `/orders?search=${encodeURIComponent(query)}`
      }
    ]

    const duration = Date.now() - startTime
    
    // 更新性能指标
    searchMetrics.value.totalRequests++
    searchMetrics.value.lastSearchDuration = duration
    searchMetrics.value.averageResponseTime = Math.round(
      ((searchMetrics.value.averageResponseTime * (searchMetrics.value.totalRequests - 1)) + duration) /
      searchMetrics.value.totalRequests
    )

    return mockResults
  }

  /**
   * 取消当前搜索
   */
  const cancelCurrentSearch = () => {
    if (currentSearchController) {
      currentSearchController.abort()
      currentSearchController = null
      searchState.value.isSearching = false
    }
  }

  /**
   * 核心搜索函数（未防抖）
   */
  const searchCore = async (query: string): Promise<SearchResult[]> => {
    // 验证查询
    const validation = validateQuery(query)
    if (!validation.isValid) {
      globalSearchData.setSearchState({ 
        error: validation.reason || 'Invalid query',
        results: []
      })
      return []
    }

    const trimmedQuery = query.trim()
    
    // 检查缓存
    const cachedResults = checkCache(trimmedQuery)
    if (cachedResults) {
      globalSearchData.setSearchResults(cachedResults)
      return cachedResults
    }

    // 取消之前的搜索
    cancelCurrentSearch()

    // 设置搜索状态
    searchState.value.isSearching = true
    searchState.value.lastSearchTime = Date.now()
    searchState.value.searchCount++
    
    globalSearchData.setSearchState({ 
      isLoading: true, 
      currentQuery: trimmedQuery,
      error: null 
    })

    try {
      // 创建新的搜索控制器
      currentSearchController = new AbortController()
      
      // 执行搜索
      const results = await performActualSearch(trimmedQuery, currentSearchController.signal)
      
      // 如果搜索没有被取消，更新结果
      if (!currentSearchController.signal.aborted) {
        globalSearchData.setSearchResults(results)
        globalSearchData.addToHistory(trimmedQuery, results.length)
        setCache(trimmedQuery, results)
        
        // 如果启用分组，对结果进行分组
        if (config.enableGrouping && results.length > 0) {
          const groupedResults = groupResults(
            results, 
            config.groupingConfig?.strategy || 'intelligent',
            config.groupingConfig
          )
          searchState.value.groupedResults = groupedResults
        } else {
          searchState.value.groupedResults = null
        }
        
        globalSearchData.setSearchState({ 
          isLoading: false,
          error: null
        })
        
        searchState.value.isSearching = false
        return results
      }
      
      return []
      
    } catch (error) {
      searchState.value.isSearching = false
      
      if (error instanceof Error && error.message === 'Search cancelled') {
        return []
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Search failed'
      globalSearchData.setSearchState({ 
        isLoading: false, 
        error: errorMessage 
      })
      
      return []
    } finally {
      currentSearchController = null
    }
  }

  /**
   * 防抖搜索函数
   */
  const debouncedSearch = useDebounceFn(searchCore, config.debounceDelay, {
    maxWait: config.debounceDelay * 3 // 最大等待时间防止搜索被无限延迟
  })

  /**
   * 节流更新UI函数
   */
  const throttledUIUpdate = useThrottleFn((query: string) => {
    globalSearchData.setSearchState({ currentQuery: query })
  }, config.throttleDelay)

  /**
   * 公共搜索接口
   */
  const search = async (query: string): Promise<SearchResult[]> => {
    // 立即更新UI显示当前查询
    throttledUIUpdate(query)
    
    // 防抖执行搜索
    return await debouncedSearch(query)
  }

  /**
   * 立即搜索（不防抖）
   */
  const searchImmediate = async (query: string): Promise<SearchResult[]> => {
    return await searchCore(query)
  }

  /**
   * 清空搜索
   */
  const clearSearch = () => {
    cancelCurrentSearch()
    globalSearchData.resetSearchState()
    searchState.value.groupedResults = null
    if (debouncedSearch?.cancel) {
      debouncedSearch.cancel()
    }
  }

  /**
   * 清空缓存
   */
  const clearCache = () => {
    searchCache.clear()
    searchMetrics.value.cacheHits = 0
  }

  /**
   * 获取搜索统计
   */
  const getSearchStats = () => {
    return {
      searchState: { ...searchState.value },
      metrics: { ...searchMetrics.value },
      cacheSize: searchCache.size,
      cacheHitRate: searchMetrics.value.totalRequests > 0 
        ? Math.round((searchMetrics.value.cacheHits / searchMetrics.value.totalRequests) * 100)
        : 0
    }
  }

  /**
   * 重新分组当前搜索结果
   */
  const regroupCurrentResults = (strategy?: GroupingConfig['strategy'], config?: Partial<GroupingConfig>) => {
    const currentResults = globalSearchData.state?.value?.results || []
    if (currentResults.length === 0) {
      searchState.value.groupedResults = null
      return null
    }

    const groupingStrategy = strategy || searchState.value.groupedResults?.strategy || 'intelligent'
    const groupingConfig = { ...config.groupingConfig, ...config }
    
    const groupedResults = groupResults(currentResults, groupingStrategy as any, groupingConfig)
    searchState.value.groupedResults = groupedResults
    return groupedResults
  }

  /**
   * 获取当前分组结果
   */
  const getCurrentGroupedResults = () => searchState.value.groupedResults

  /**
   * 更新分组配置
   */
  const updateGroupingConfig = (newConfig: Partial<GroupingConfig>) => {
    if (!config.groupingConfig) {
      config.groupingConfig = {}
    }
    Object.assign(config.groupingConfig, newConfig)
    return regroupCurrentResults()
  }

  // 计算属性
  const isSearching = computed(() => searchState.value.isSearching)
  const hasActiveSearch = computed(() => currentSearchController !== null)
  const cacheStats = computed(() => ({
    size: searchCache.size,
    hitRate: searchMetrics.value.totalRequests > 0 
      ? Math.round((searchMetrics.value.cacheHits / searchMetrics.value.totalRequests) * 100)
      : 0
  }))

  // 定期清理过期缓存
  const cacheCleanupInterval = config.enableCache 
    ? setInterval(cleanupExpiredCache, 60000) // 每分钟清理一次
    : null

  // 组件卸载时的清理
  onUnmounted(() => {
    if (config.cancelOnUnmount) {
      cancelCurrentSearch()
    }
    
    if (cacheCleanupInterval) {
      clearInterval(cacheCleanupInterval)
    }
    
    debouncedSearch.cancel()
  })

  return {
    // 搜索方法
    search,
    searchImmediate,
    clearSearch,
    cancelCurrentSearch,
    
    // 缓存管理
    clearCache,
    cleanupExpiredCache,
    
    // 分组功能
    regroupCurrentResults,
    getCurrentGroupedResults,
    updateGroupingConfig,
    groupResults,
    
    // 状态
    isSearching,
    hasActiveSearch,
    searchState,
    searchMetrics,
    cacheStats,
    
    // 工具方法
    getSearchStats,
    validateQuery,
    
    // 全局数据
    globalSearchData,
    
    // 配置
    config
  }
}

// 默认防抖搜索实例
let defaultDebouncedSearchInstance: ReturnType<typeof useDebouncedGlobalSearch> | null = null

/**
 * 获取默认防抖搜索实例
 */
export function getDefaultDebouncedSearch(options?: DebouncedSearchOptions) {
  if (!defaultDebouncedSearchInstance) {
    defaultDebouncedSearchInstance = useDebouncedGlobalSearch(options)
  }
  return defaultDebouncedSearchInstance
}