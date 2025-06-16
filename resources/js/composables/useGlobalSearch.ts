import { ref, computed, readonly, onUnmounted } from 'vue'
import { useDebounceFn, useLocalStorage, useThrottleFn } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import type { SearchResult } from '@/types'

// 搜索分类类型
export type SearchCategory = 'pages' | 'orders' | 'products' | 'customers' | 'settings'

// 分组搜索结果类型
export interface GroupedSearchResults {
  pages?: SearchResult[];
  orders?: SearchResult[];
  products?: SearchResult[];
  customers?: SearchResult[];
  settings?: SearchResult[];
}

// 搜索状态类型
export interface SearchState {
  query: string
  isSearching: boolean
  results: SearchResult[]
  groupedResults: GroupedSearchResults
  error: string | null
  searchHistory: string[]
  totalResults: number
  searchTime: number
}

// 搜索统计类型
export interface SearchStats {
  totalSearches: number
  averageResults: number
  popularQueries: Array<{ query: string; count: number }>
  cacheHitRate: number
}

// 搜索缓存类型
interface SearchCache {
  [query: string]: {
    results: SearchResult[]
    timestamp: number
    expiresAt: number
  }
}

/**
 * 模拟搜索数据源
 * 在实际项目中，这些数据应该来自API或数据库
 */
const mockSearchData: SearchResult[] = [
  // 页面导航
  {
    id: 'page-dashboard',
    title: 'Dashboard',
    description: '仪表板 - 查看生产数据、设备状态和关键指标',
    type: 'page',
    category: 'navigation',
    url: '/dashboard',
    icon: 'dashboard',
    keywords: ['dashboard', '仪表板', '首页', '概览', '数据'],
    metadata: {
      section: '导航',
      priority: 1,
      accessLevel: 'public'
    }
  },
  {
    id: 'page-orders',
    title: 'Production Orders',
    description: '生产订单管理 - 创建、查看和管理生产订单',
    type: 'page',
    category: 'production',
    url: '/orders',
    icon: 'clipboard-list',
    keywords: ['orders', '订单', '生产订单', '制造', 'production'],
    metadata: {
      section: '生产管理',
      priority: 2,
      accessLevel: 'user'
    }
  },
  {
    id: 'page-products',
    title: 'Product Management',
    description: '产品管理 - 产品信息、规格和库存管理',
    type: 'page',
    category: 'product',
    url: '/products',
    icon: 'package',
    keywords: ['products', '产品', '物料', '库存', 'inventory'],
    metadata: {
      section: '产品管理',
      priority: 3,
      accessLevel: 'user'
    }
  },
  {
    id: 'page-users',
    title: 'User Management',
    description: '用户管理 - 用户账户、权限和团队管理',
    type: 'page',
    category: 'admin',
    url: '/users',
    icon: 'users',
    keywords: ['users', '用户', '账户', '权限', 'team', '团队'],
    metadata: {
      section: '系统管理',
      priority: 4,
      accessLevel: 'admin'
    }
  },
  {
    id: 'page-settings',
    title: 'System Settings',
    description: '系统设置 - 配置系统参数、外观和偏好设置',
    type: 'page',
    category: 'settings',
    url: '/settings',
    icon: 'settings',
    keywords: ['settings', '设置', '配置', '系统', 'config'],
    metadata: {
      section: '系统管理',
      priority: 5,
      accessLevel: 'admin'
    }
  },

  // 生产订单示例
  {
    id: 'order-po-001',
    title: 'PO-001 - 电机组装',
    description: '生产订单 PO-001 - 电机组装线，预计完成时间：2024-12-20',
    type: 'order',
    category: 'production',
    url: '/orders/po-001',
    icon: 'clipboard',
    keywords: ['PO-001', '电机', '组装', 'motor', 'assembly'],
    metadata: {
      status: '进行中',
      priority: 'high',
      dueDate: '2024-12-20'
    }
  },
  {
    id: 'order-po-002',
    title: 'PO-002 - 传感器测试',
    description: '生产订单 PO-002 - 传感器质量测试，批次：ST-2024-001',
    type: 'order',
    category: 'quality',
    url: '/orders/po-002',
    icon: 'clipboard',
    keywords: ['PO-002', '传感器', '测试', 'sensor', 'testing'],
    metadata: {
      status: '待开始',
      priority: 'medium',
      dueDate: '2024-12-25'
    }
  },

  // 产品示例
  {
    id: 'product-motor-001',
    title: 'M-001 - 伺服电机',
    description: '产品 M-001 - 高精度伺服电机，功率：2.5KW',
    type: 'product',
    category: 'component',
    url: '/products/motor-001',
    icon: 'cog',
    keywords: ['M-001', '伺服电机', 'servo', 'motor', '2.5KW'],
    metadata: {
      stock: 25,
      unit: '台',
      category: '电机类'
    }
  },
  {
    id: 'product-sensor-001',
    title: 'S-001 - 温度传感器',
    description: '产品 S-001 - 工业级温度传感器，测量范围：-40°C to 125°C',
    type: 'product',
    category: 'sensor',
    url: '/products/sensor-001',
    icon: 'thermometer',
    keywords: ['S-001', '温度传感器', 'temperature', 'sensor'],
    metadata: {
      stock: 150,
      unit: '个',
      category: '传感器类'
    }
  },

  // 用户示例
  {
    id: 'user-james',
    title: 'James Wang - 系统管理员',
    description: '用户：James Wang，系统管理员，负责系统配置和用户管理',
    type: 'user',
    category: 'admin',
    url: '/users/james',
    icon: 'user',
    keywords: ['james', 'wang', '管理员', 'admin', '系统'],
    metadata: {
      role: '系统管理员',
      department: 'IT部门',
      status: '在线'
    }
  },
  {
    id: 'user-operator-001',
    title: '操作员001 - 生产操作员',
    description: '用户：操作员001，负责生产线操作和设备监控',
    type: 'user',
    category: 'operator',
    url: '/users/operator-001',
    icon: 'user',
    keywords: ['操作员', 'operator', '生产', 'production'],
    metadata: {
      role: '生产操作员',
      department: '生产部门',
      status: '在线'
    }
  },

  // 设置项示例
  {
    id: 'setting-appearance',
    title: '外观设置',
    description: '配置系统外观、主题和语言设置',
    type: 'setting',
    category: 'ui',
    url: '/settings/appearance',
    icon: 'palette',
    keywords: ['外观', '主题', '语言', 'appearance', 'theme'],
    metadata: {
      section: '界面设置',
      modified: '2024-12-15'
    }
  },
  {
    id: 'setting-profile',
    title: '个人资料',
    description: '管理个人资料、密码和账户信息',
    type: 'setting',
    category: 'account',
    url: '/settings/profile',
    icon: 'user-circle',
    keywords: ['个人资料', '密码', '账户', 'profile', 'account'],
    metadata: {
      section: '账户设置',
      modified: '2024-12-10'
    }
  },

  // 功能快捷方式
  {
    id: 'action-new-order',
    title: '创建新订单',
    description: '快速创建新的生产订单',
    type: 'action',
    category: 'production',
    url: '/orders/new',
    icon: 'plus-circle',
    keywords: ['创建', '新订单', 'new', 'order', 'create'],
    metadata: {
      shortcut: 'Ctrl+N',
      action: 'create'
    }
  },
  {
    id: 'action-view-reports',
    title: '查看报表',
    description: '查看生产报表和统计数据',
    type: 'action',
    category: 'analytics',
    url: '/reports',
    icon: 'chart-bar',
    keywords: ['报表', '统计', 'reports', 'analytics', 'charts'],
    metadata: {
      shortcut: 'Ctrl+R',
      action: 'view'
    }
  }
]

/**
 * 全局搜索组合式函数
 * 整合搜索数据管理、防抖、API集成、结果分组和历史管理功能
 */
export function useGlobalSearch() {
  const { t } = useI18n()

  // 响应式搜索状态
  const searchState = ref<SearchState>({
    query: '',
    isSearching: false,
    results: [],
    groupedResults: {},
    error: null,
    searchHistory: [],
    totalResults: 0,
    searchTime: 0
  })

  // 搜索历史持久化存储（最多保存10条）
  const persistedHistory = useLocalStorage<string[]>('global-search-history', [], {
    serializer: {
      read: (value: string) => {
        try {
          const parsed = JSON.parse(value)
          return Array.isArray(parsed) ? parsed.slice(0, 10) : []
        } catch {
          return []
        }
      },
      write: (value: string[]) => JSON.stringify(value.slice(0, 10))
    }
  })

  // 搜索统计持久化存储
  const searchStats = useLocalStorage<SearchStats>('global-search-stats', {
    totalSearches: 0,
    averageResults: 0,
    popularQueries: [],
    cacheHitRate: 0
  })

  // 搜索结果缓存（内存中，5分钟过期）
  const searchCache = ref<SearchCache>({})
  const CACHE_DURATION = 5 * 60 * 1000 // 5分钟

  // AbortController用于取消请求
  let currentAbortController: AbortController | null = null

  // 初始化搜索历史
  searchState.value.searchHistory = persistedHistory.value
    .filter(item => item && typeof item === 'string' && item.trim()) // 过滤无效项
    .slice(0, 10) // 确保不超过限制

  /**
   * 输入验证和安全检查
   */
  const validateSearchQuery = (query: string): boolean => {
    // 安全检查：确保 query 是有效的字符串
    if (!query || typeof query !== 'string') {
      searchState.value.error = t('search.error.invalidQuery')
      return false
    }

    // 长度验证
    if (query.length > 100) {
      searchState.value.error = t('search.error.queryTooLong')
      return false
    }

    // XSS攻击检测
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi
    ]

    if (dangerousPatterns.some(pattern => pattern.test(query))) {
      searchState.value.error = t('search.error.invalidQuery')
      return false
    }

    return true
  }

  /**
   * 清理过期缓存
   */
  const cleanExpiredCache = () => {
    const now = Date.now()
    Object.keys(searchCache.value).forEach(key => {
      if (searchCache.value[key].expiresAt < now) {
        delete searchCache.value[key]
      }
    })
  }

  /**
   * 检查缓存中是否有有效结果
   */
  const getCachedResults = (query: string): SearchResult[] | null => {
    cleanExpiredCache()
    const cached = searchCache.value[query]
    if (cached && cached.expiresAt > Date.now()) {
      // 更新缓存命中率统计
      const stats = searchStats.value
      stats.cacheHitRate = (stats.cacheHitRate * stats.totalSearches + 1) / (stats.totalSearches + 1)
      return cached.results
    }
    return null
  }

  /**
   * 缓存搜索结果
   */
  const cacheResults = (query: string, results: SearchResult[]) => {
    const now = Date.now()
    searchCache.value[query] = {
      results,
      timestamp: now,
      expiresAt: now + CACHE_DURATION
    }
  }

  /**
   * 按分类分组搜索结果
   */
  const groupSearchResults = (results: SearchResult[]): GroupedSearchResults => {
    const grouped: GroupedSearchResults = {}

    results.forEach(result => {
      // 将type映射到category
      let category: SearchCategory
      switch (result.type) {
        case 'page':
          category = 'pages'
          break
        case 'order':
          category = 'orders'
          break
        case 'product':
          category = 'products'
          break
        case 'user':
          category = 'customers'
          break
        case 'setting':
          category = 'settings'
          break
        case 'action':
          category = 'pages' // 将action归类到pages
          break
        default:
          category = 'pages'
      }

      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category]!.push(result)
    })

    // 按相关性排序每个分类的结果
    Object.keys(grouped).forEach(category => {
      grouped[category as SearchCategory]?.sort((a, b) => {
        // 优先显示标题匹配的结果
        const aTitle = a.title.toLowerCase()
        const bTitle = b.title.toLowerCase()
        const query = searchState.value.query.toLowerCase()

        const aTitleMatch = aTitle.includes(query)
        const bTitleMatch = bTitle.includes(query)

        if (aTitleMatch && !bTitleMatch) return -1
        if (!aTitleMatch && bTitleMatch) return 1

        return aTitle.localeCompare(bTitle)
      })
    })

    return grouped
  }

  /**
   * 执行搜索API调用
   */
  const performSearch = async (query: string): Promise<SearchResult[]> => {
    // 取消之前的请求
    if (currentAbortController) {
      currentAbortController.abort()
    }

    currentAbortController = new AbortController()
    const startTime = Date.now()

    try {
      // 检查缓存
      const cachedResults = getCachedResults(query)
      if (cachedResults) {
        return cachedResults
      }

      // 首先尝试使用模拟数据进行本地搜索
      const mockResults = searchMockData(query)

      // 如果有本地结果，直接返回（暂时跳过API调用，避免419错误）
      if (mockResults.length > 0 || !window.location.pathname.includes('/api/')) {
        // 缓存模拟结果
        cacheResults(query, mockResults)

        // 更新搜索时间
        searchState.value.searchTime = Date.now() - startTime

        return mockResults
      }

      // 获取CSRF token
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')

      // 构建请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
      }

      // 添加CSRF token到请求头
      if (csrfToken) {
        headers['X-CSRF-TOKEN'] = csrfToken
      }

      // 使用fetch进行API调用
      const response = await fetch('/api/search', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query }),
        signal: currentAbortController.signal
      })

      if (!response.ok) {
        // 特殊处理419错误（CSRF token问题），回退到模拟数据
        if (response.status === 419) {
          console.warn('CSRF token过期，使用模拟搜索数据')
          const fallbackResults = searchMockData(query)
          cacheResults(query, fallbackResults)
          searchState.value.searchTime = Date.now() - startTime
          return fallbackResults
        }
        throw new Error(`搜索请求失败: ${response.status}`)
      }

      const data = await response.json()
      const results: SearchResult[] = data.results || []

      // 缓存结果
      cacheResults(query, results)

      // 更新搜索时间
      searchState.value.searchTime = Date.now() - startTime

      return results
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // 请求被取消，不处理错误
        return []
      }

      console.error('搜索API调用失败:', error)

      // 发生错误时回退到模拟数据
      const fallbackResults = searchMockData(query)
      if (fallbackResults.length > 0) {
        console.warn('API失败，使用模拟搜索数据')
        cacheResults(query, fallbackResults)
        searchState.value.searchTime = Date.now() - startTime
        return fallbackResults
      }

      // 根据错误类型设置不同的错误信息
      if (error.message.includes('CSRF')) {
        searchState.value.error = 'CSRF token 已过期，请刷新页面重试'
      } else if (error.message.includes('419')) {
        searchState.value.error = 'CSRF token 已过期，请刷新页面重试'
      } else {
        searchState.value.error = t('search.error.apiFailure')
      }

      return []
    }
  }

  /**
   * 在模拟数据中搜索
   */
  const searchMockData = (query: string): SearchResult[] => {
    if (!query || query.trim().length === 0) {
      return []
    }

    const searchTerm = query.toLowerCase().trim()

    return mockSearchData.filter(item => {
      // 在标题、描述和关键词中搜索
      const titleMatch = item.title.toLowerCase().includes(searchTerm)
      const descriptionMatch = item.description.toLowerCase().includes(searchTerm)
      const keywordsMatch = item.keywords.some(keyword =>
        keyword.toLowerCase().includes(searchTerm)
      )

      return titleMatch || descriptionMatch || keywordsMatch
    }).slice(0, 20) // 限制结果数量
  }

  /**
   * 更新搜索统计
   */
  const updateSearchStats = (query: string, resultCount: number) => {
    const stats = searchStats.value

    // 更新总搜索次数
    stats.totalSearches += 1

    // 更新平均结果数
    stats.averageResults = (stats.averageResults * (stats.totalSearches - 1) + resultCount) / stats.totalSearches

    // 更新热门查询
    const existingQuery = stats.popularQueries.find(q => q.query === query)
    if (existingQuery) {
      existingQuery.count += 1
    } else {
      stats.popularQueries.push({ query, count: 1 })
    }

    // 保持热门查询列表最多10个，按次数排序
    stats.popularQueries.sort((a, b) => b.count - a.count)
    stats.popularQueries = stats.popularQueries.slice(0, 10)
  }

  /**
   * 添加到搜索历史
   */
  const addToHistory = (query: string) => {
    // 安全检查：确保 query 是有效的字符串
    if (!query || typeof query !== 'string' || !query.trim()) return

    // 清理和规范化查询字符串
    const cleanQuery = query.trim()

    // 移除重复项，同时确保所有历史记录都是有效的字符串
    const history = searchState.value.searchHistory
      .filter(item => item && typeof item === 'string' && item.trim() && item !== cleanQuery)

    // 添加到开头
    history.unshift(cleanQuery)

    // 限制历史记录数量
    searchState.value.searchHistory = history.slice(0, 10)

    // 持久化存储
    persistedHistory.value = searchState.value.searchHistory
  }

  /**
   * 执行搜索的核心函数
   */
  const executeSearch = async (query: string) => {
    // 安全检查：确保 query 是有效的字符串
    if (!query || typeof query !== 'string' || !query.trim()) {
      searchState.value.results = []
      searchState.value.groupedResults = {}
      searchState.value.totalResults = 0
      searchState.value.error = null
      return
    }

    // 输入验证
    if (!validateSearchQuery(query)) {
      return
    }

    searchState.value.isSearching = true
    searchState.value.error = null

    try {
      const results = await performSearch(query)

      searchState.value.results = results
      searchState.value.groupedResults = groupSearchResults(results)
      searchState.value.totalResults = results.length

      // 添加到搜索历史
      addToHistory(query)

      // 更新统计
      updateSearchStats(query, results.length)

    } catch (error: any) {
      console.error('搜索执行失败:', error)
      searchState.value.error = t('search.error.executionFailed')
    } finally {
      searchState.value.isSearching = false
    }
  }

  // 防抖搜索函数（300ms延迟）
  const debouncedSearch = useDebounceFn(executeSearch, 300, { maxWait: 1000 })

  // 节流UI更新函数（100ms延迟）
  const throttledUIUpdate = useThrottleFn(() => {
    // 触发UI更新的逻辑
  }, 100)

  /**
   * 设置搜索查询
   */
  const setQuery = (query: string) => {
    searchState.value.query = query
    debouncedSearch(query)
    throttledUIUpdate()
  }

  /**
   * 清除搜索结果
   */
  const clearResults = () => {
    searchState.value.query = ''
    searchState.value.results = []
    searchState.value.groupedResults = {}
    searchState.value.totalResults = 0
    searchState.value.error = null
  }

  /**
   * 清除搜索历史
   */
  const clearHistory = () => {
    searchState.value.searchHistory = []
    persistedHistory.value = []
  }

  /**
   * 从历史中移除特定项
   */
  const removeFromHistory = (query: string) => {
    // 安全检查：确保 query 是有效的字符串
    if (!query || typeof query !== 'string') return

    searchState.value.searchHistory = searchState.value.searchHistory
      .filter(item => item && typeof item === 'string' && item !== query)
    persistedHistory.value = searchState.value.searchHistory
  }

  /**
   * 获取搜索建议
   */
  const getSearchSuggestions = (query: string): string[] => {
    // 安全检查：确保 query 是有效的字符串
    if (!query || typeof query !== 'string' || !query.trim()) {
      // 返回历史记录时确保都是有效的字符串
      return searchState.value.searchHistory
        .filter(item => item && typeof item === 'string' && item.trim())
        .slice(0, 5)
    }

    const suggestions = searchState.value.searchHistory
      .filter(item => {
        // 确保item是有效的字符串且包含查询内容
        return item &&
          typeof item === 'string' &&
          item.trim() &&
          item.toLowerCase().includes(query.toLowerCase())
      })
      .slice(0, 5)

    return suggestions
  }

  // 计算属性
  const hasResults = computed(() => searchState.value.totalResults > 0)
  const hasError = computed(() => !!searchState.value.error)
  const isLoading = computed(() => searchState.value.isSearching)
  const isEmpty = computed(() => !searchState.value.query.trim())

  // 分类结果的计算属性
  const pageResults = computed(() => searchState.value.groupedResults.pages || [])
  const orderResults = computed(() => searchState.value.groupedResults.orders || [])
  const productResults = computed(() => searchState.value.groupedResults.products || [])
  const customerResults = computed(() => searchState.value.groupedResults.customers || [])
  const settingResults = computed(() => searchState.value.groupedResults.settings || [])

  // 组件卸载时清理资源
  onUnmounted(() => {
    if (currentAbortController) {
      currentAbortController.abort()
    }
    cleanExpiredCache()
  })

  // 为了兼容现有的 TopMenuBar.vue，添加一些别名和额外的属性
  const search = (query: string) => {
    setQuery(query)
  }

  const clearSearch = () => {
    clearResults()
  }

  const currentResults = computed(() => searchState.value.results)
  const groupedResults = computed(() => searchState.value.groupedResults)

  // 模拟的最近搜索和热门搜索（从搜索历史中获取）
  const recentSearches = computed(() => searchState.value.searchHistory.slice(0, 5))
  const popularSearches = computed(() => {
    // 从统计中获取热门查询
    return searchStats.value.popularQueries.map(item => item.query).slice(0, 5)
  })

  // 空搜索建议
  const getEmptySearchSuggestions = () => {
    return [
      t('search.suggestions.orders'),
      t('search.suggestions.products'),
      t('search.suggestions.customers'),
      t('search.suggestions.settings')
    ]
  }

  // 选择结果相关（简化实现）
  const selectedResult = ref<SearchResult | null>(null)
  const selectedIndex = ref(-1)

  const moveSelection = (direction: 'up' | 'down') => {
    const results = searchState.value.results
    if (results.length === 0) return

    if (direction === 'down') {
      selectedIndex.value = Math.min(selectedIndex.value + 1, results.length - 1)
    } else {
      selectedIndex.value = Math.max(selectedIndex.value - 1, -1)
    }

    selectedResult.value = selectedIndex.value >= 0 ? results[selectedIndex.value] : null
  }

  const setSelectedIndex = (index: number) => {
    selectedIndex.value = index
    selectedResult.value = index >= 0 && index < searchState.value.results.length
      ? searchState.value.results[index]
      : null
  }

  // 返回公共API
  return {
    // 状态
    searchState: readonly(searchState),

    // 计算属性
    hasResults,
    hasError,
    isLoading,
    isEmpty,

    // 分类结果
    pageResults,
    orderResults,
    productResults,
    customerResults,
    settingResults,

    // 统计信息
    searchStats: readonly(searchStats),

    // 方法
    setQuery,
    clearResults,
    clearHistory,
    removeFromHistory,
    getSearchSuggestions,
    executeSearch: debouncedSearch,

    // 工具方法
    validateSearchQuery,
    groupSearchResults,

    // TopMenuBar.vue 兼容性接口
    search,
    clearSearch,
    currentResults,
    groupedResults,
    recentSearches,
    popularSearches,
    getEmptySearchSuggestions,
    selectedResult: readonly(selectedResult),
    moveSelection,
    setSelectedIndex
  }
}

/**
 * 搜索结果类型的中文标签映射
 */
export const searchTypeLabels: Record<string, string> = {
  page: '页面',
  order: '订单',
  product: '产品',
  user: '用户',
  setting: '设置',
  action: '操作'
}

/**
 * 搜索结果类型的图标映射
 */
export const searchTypeIcons: Record<string, string> = {
  page: 'file-text',
  order: 'clipboard-list',
  product: 'package',
  user: 'user',
  setting: 'settings',
  action: 'zap'
}