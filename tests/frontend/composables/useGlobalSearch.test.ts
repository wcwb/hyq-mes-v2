import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { useGlobalSearch, searchTypeLabels, searchTypeIcons } from '@/composables/useGlobalSearch'

// Mock vue-i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

// Mock @vueuse/core - 重要：让防抖函数立即执行，不要延迟
vi.mock('@vueuse/core', () => ({
  useDebounceFn: (fn: Function, delay: number) => {
    // 返回一个立即执行的函数，而不是防抖函数
    return (...args: any[]) => fn(...args)
  },
  useThrottleFn: (fn: Function, delay: number) => {
    // 返回一个立即执行的函数，而不是节流函数
    return (...args: any[]) => fn(...args)
  },
  useLocalStorage: (key: string, defaultValue: any) => ({
    value: defaultValue
  })
}))

// 模拟搜索数据，与useGlobalSearch中的mockSearchData对应
const mockSearchData = [
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
  }
]

// 模拟搜索函数
const mockSearch = (query: string) => {
  if (!query || !query.trim()) {
    return []
  }

  const lowerQuery = query.toLowerCase()

  return mockSearchData.filter(item => {
    return (
      item.title.toLowerCase().includes(lowerQuery) ||
      item.description.toLowerCase().includes(lowerQuery) ||
      item.keywords.some(keyword => keyword.toLowerCase().includes(lowerQuery))
    )
  })
}

describe('useGlobalSearch', () => {
  let globalSearch: ReturnType<typeof useGlobalSearch>

  beforeEach(() => {
    // 重置所有mocks
    vi.clearAllMocks()

    // 设置fetch mock为全局函数 - 确保在useGlobalSearch初始化之前设置
    global.fetch = vi.fn().mockImplementation((url: string, options: any) => {
      if (url === '/api/search') {
        const body = JSON.parse(options.body)
        const results = mockSearch(body.query)

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ results })
        })
      }
      return Promise.reject(new Error('Unknown endpoint'))
    })

    // 在fetch mock设置完成后初始化globalSearch
    globalSearch = useGlobalSearch()
  })

  describe('基础功能', () => {
    it('应该正确初始化搜索状态', () => {
      expect(globalSearch.hasResults.value).toBe(false)
      expect(globalSearch.currentResults.value).toEqual([])
      expect(globalSearch.searchState.value.query).toBe('')
      expect(globalSearch.searchState.value.isSearching).toBe(false)
    })

    it('应该提供搜索建议功能', () => {
      const suggestions = globalSearch.getSearchSuggestions('dashboard')
      expect(suggestions).toBeDefined()
      expect(Array.isArray(suggestions)).toBe(true)
    })

    it('应该提供空搜索建议', () => {
      const emptySuggestions = globalSearch.getEmptySearchSuggestions()
      expect(Array.isArray(emptySuggestions)).toBe(true)
      expect(emptySuggestions.length).toBeGreaterThan(0)
    })
  })

  describe('搜索功能', () => {
    it('应该能够执行搜索', async () => {
      const searchQuery = 'dashboard'

      await globalSearch.search(searchQuery)
      // 等待多个tick以确保异步操作完成
      await nextTick()
      await nextTick()

      expect(globalSearch.searchState.value.query).toBe(searchQuery)
      expect(globalSearch.hasResults.value).toBe(true)
      expect(globalSearch.currentResults.value.length).toBeGreaterThan(0)
    })

    it('应该对"dashboard"查询返回相关结果', async () => {
      await globalSearch.search('dashboard')
      // 等待多个tick以确保异步操作完成
      await nextTick()
      await nextTick()

      const results = globalSearch.currentResults.value
      expect(results.length).toBeGreaterThan(0)

      // 检查是否包含Dashboard页面
      const dashboardResult = results.find(r => r.title.toLowerCase().includes('dashboard'))
      expect(dashboardResult).toBeDefined()
      expect(dashboardResult?.type).toBe('page')
    })

    it('应该对"order"查询返回订单相关结果', async () => {
      await globalSearch.search('order')
      // 等待多个tick以确保异步操作完成
      await nextTick()
      await nextTick()

      const results = globalSearch.currentResults.value
      expect(results.length).toBeGreaterThan(0)

      // 检查是否包含订单相关结果
      const orderResults = results.filter(r =>
        r.title.toLowerCase().includes('order') ||
        r.keywords.some(k => k.toLowerCase().includes('order'))
      )
      expect(orderResults.length).toBeGreaterThan(0)
    })

    it('应该对"用户"查询返回用户相关结果', async () => {
      await globalSearch.search('用户')
      // 等待多个tick以确保异步操作完成
      await nextTick()
      await nextTick()

      const results = globalSearch.currentResults.value
      expect(results.length).toBeGreaterThan(0)

      // 检查是否包含用户相关结果
      const userResults = results.filter(r =>
        r.title.includes('用户') ||
        r.description.includes('用户') ||
        r.keywords.some(k => k.includes('用户'))
      )
      expect(userResults.length).toBeGreaterThan(0)
    })

    it('应该对"motor"查询返回电机相关结果', async () => {
      await globalSearch.search('motor')
      // 等待多个tick以确保异步操作完成
      await nextTick()
      await nextTick()

      const results = globalSearch.currentResults.value
      expect(results.length).toBeGreaterThan(0)

      // 检查是否包含电机相关结果
      const motorResults = results.filter(r =>
        r.title.toLowerCase().includes('motor') ||
        r.keywords.some(k => k.toLowerCase().includes('motor'))
      )
      expect(motorResults.length).toBeGreaterThan(0)
    })

    it('应该对不存在的内容返回空结果', async () => {
      await globalSearch.search('nonexistent123xyz')
      // 等待多个tick以确保异步操作完成
      await nextTick()
      await nextTick()

      expect(globalSearch.hasResults.value).toBe(false)
      expect(globalSearch.currentResults.value.length).toBe(0)
    })

    it('应该对空查询清空结果', async () => {
      // 先搜索一些内容
      await globalSearch.search('dashboard')
      await nextTick()
      await nextTick()
      expect(globalSearch.hasResults.value).toBe(true)

      // 然后搜索空字符串
      await globalSearch.search('')
      await nextTick()
      await nextTick()

      expect(globalSearch.hasResults.value).toBe(false)
      expect(globalSearch.currentResults.value.length).toBe(0)
    })
  })

  describe('搜索结果分组', () => {
    it('应该正确分组搜索结果', async () => {
      await globalSearch.search('user')
      await nextTick()
      await nextTick()

      const groupedResults = globalSearch.groupedResults.value
      expect(typeof groupedResults).toBe('object')

      // 检查基本分组结构 - 不是所有分类都会有数据，所以只检查结构是否正确
      if (globalSearch.hasResults.value) {
        // 验证分组对象的结构
        expect(groupedResults).toBeDefined()

        // 检查实际存在的分组是否为数组类型
        Object.keys(groupedResults).forEach(key => {
          expect(Array.isArray(groupedResults[key as keyof typeof groupedResults])).toBe(true)
        })

        // 对于 "user" 查询，应该有 pages 分组（因为 page-users 被归类为 pages）
        expect(groupedResults.pages).toBeDefined()
        expect(Array.isArray(groupedResults.pages)).toBe(true)

        // 验证所有结果都被正确分组
        const totalGroupedResults = Object.values(groupedResults).reduce(
          (total, group) => total + (group?.length || 0),
          0
        )
        expect(totalGroupedResults).toBe(globalSearch.currentResults.value.length)
      }
    })
  })

  describe('搜索验证', () => {
    it('应该正确验证搜索查询', () => {
      // 测试空查询
      expect(globalSearch.validateSearchQuery('')).toBe(false)
      expect(globalSearch.validateSearchQuery(null as any)).toBe(false)
      expect(globalSearch.validateSearchQuery(undefined as any)).toBe(false)

      // 测试只包含空白字符的查询 - 根据实际实现，这个会通过验证
      // validateSearchQuery 只检查类型、长度和XSS，不检查是否只有空白字符
      expect(globalSearch.validateSearchQuery('   ')).toBe(true)

      // 测试有效查询
      expect(globalSearch.validateSearchQuery('dashboard')).toBe(true)
      expect(globalSearch.validateSearchQuery('用户管理')).toBe(true)

      // 测试过长查询
      expect(globalSearch.validateSearchQuery('a'.repeat(101))).toBe(false)

      // 测试XSS攻击
      expect(globalSearch.validateSearchQuery('<script>alert("xss")</script>')).toBe(false)
      expect(globalSearch.validateSearchQuery('javascript:alert("xss")')).toBe(false)
    })
  })

  describe('搜索历史和统计', () => {
    it('应该提供搜索历史功能', () => {
      expect(globalSearch.recentSearches).toBeDefined()
      expect(globalSearch.popularSearches).toBeDefined()
      expect(typeof globalSearch.clearHistory).toBe('function')
      expect(typeof globalSearch.removeFromHistory).toBe('function')
    })

    it('应该提供选择管理功能', () => {
      expect(typeof globalSearch.moveSelection).toBe('function')
      expect(typeof globalSearch.setSelectedIndex).toBe('function')
      expect(globalSearch.selectedResult).toBeDefined()
    })
  })

  describe('搜索清理', () => {
    it('应该能够清空搜索结果', async () => {
      // 先搜索一些内容
      await globalSearch.search('dashboard')
      await nextTick()
      await nextTick()
      expect(globalSearch.hasResults.value).toBe(true)

      // 清空搜索
      globalSearch.clearSearch()

      expect(globalSearch.hasResults.value).toBe(false)
      expect(globalSearch.currentResults.value.length).toBe(0)
      expect(globalSearch.searchState.value.query).toBe('')
    })
  })

  describe('分类结果计算属性', () => {
    it('应该提供各分类的结果计算属性', async () => {
      await globalSearch.search('dashboard')
      await nextTick()
      await nextTick()

      expect(globalSearch.pageResults).toBeDefined()
      expect(globalSearch.orderResults).toBeDefined()
      expect(globalSearch.productResults).toBeDefined()
      expect(globalSearch.customerResults).toBeDefined()
      expect(globalSearch.settingResults).toBeDefined()

      expect(Array.isArray(globalSearch.pageResults.value)).toBe(true)
      expect(Array.isArray(globalSearch.orderResults.value)).toBe(true)
      expect(Array.isArray(globalSearch.productResults.value)).toBe(true)
      expect(Array.isArray(globalSearch.customerResults.value)).toBe(true)
      expect(Array.isArray(globalSearch.settingResults.value)).toBe(true)
    })
  })
})

describe('搜索类型映射', () => {
  it('应该提供正确的类型标签映射', () => {
    expect(searchTypeLabels).toBeDefined()
    expect(searchTypeLabels.page).toBe('页面')
    expect(searchTypeLabels.order).toBe('订单')
    expect(searchTypeLabels.product).toBe('产品')
    expect(searchTypeLabels.user).toBe('用户')
    expect(searchTypeLabels.setting).toBe('设置')
    expect(searchTypeLabels.action).toBe('操作')
  })

  it('应该提供正确的类型图标映射', () => {
    expect(searchTypeIcons).toBeDefined()
    expect(searchTypeIcons.page).toBe('file-text')
    expect(searchTypeIcons.order).toBe('clipboard-list')
    expect(searchTypeIcons.product).toBe('package')
    expect(searchTypeIcons.user).toBe('user')
    expect(searchTypeIcons.setting).toBe('settings')
    expect(searchTypeIcons.action).toBe('zap')
  })
})