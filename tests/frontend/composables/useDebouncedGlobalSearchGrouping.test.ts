import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest'
import { useDebouncedGlobalSearch } from '@/composables/useDebouncedGlobalSearch'
import type { SearchResult } from '@/types'

// Mock global route function
const mockRoute = vi.fn((name: string) => `/api/search`)
global.route = mockRoute

// Mock fetch globally
global.fetch = vi.fn()

// Mock CSRF token
Object.defineProperty(document, 'querySelector', {
  value: vi.fn(() => ({
    getAttribute: vi.fn(() => 'test-csrf-token')
  })),
  configurable: true
})

describe('useDebouncedGlobalSearch 分组功能', () => {
  let mockResults: SearchResult[]

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockResults = [
      {
        id: '1',
        type: 'page',
        title: '仪表板',
        description: '系统主要数据展示页面',
        url: '/dashboard',
        category: '导航'
      },
      {
        id: '2',
        type: 'order',
        title: '订单#12345',
        description: '生产订单信息',
        url: '/orders/12345',
        category: '业务'
      },
      {
        id: '3',
        type: 'product',
        title: '标准件A',
        description: '标准化产品',
        url: '/products/std-a',
        category: '标准件'
      }
    ]
  })

  it('应该提供分组相关的方法和状态', () => {
    const debouncedSearch = useDebouncedGlobalSearch({
      enableGrouping: true
    })

    // 检查分组相关的方法
    expect(typeof debouncedSearch.regroupCurrentResults).toBe('function')
    expect(typeof debouncedSearch.getCurrentGroupedResults).toBe('function')
    expect(typeof debouncedSearch.updateGroupingConfig).toBe('function')
    expect(typeof debouncedSearch.groupResults).toBe('function')

    // 检查配置
    expect(debouncedSearch.config.enableGrouping).toBe(true)
    expect(debouncedSearch.config.groupingConfig).toBeDefined()
  })

  it('应该正确配置分组选项', () => {
    const customConfig = {
      enableGrouping: true,
      groupingConfig: {
        strategy: 'type' as const,
        maxGroups: 5,
        maxResultsPerGroup: 10
      }
    }

    const debouncedSearch = useDebouncedGlobalSearch(customConfig)

    expect(debouncedSearch.config.enableGrouping).toBe(true)
    expect(debouncedSearch.config.groupingConfig?.strategy).toBe('type')
    expect(debouncedSearch.config.groupingConfig?.maxGroups).toBe(5)
    expect(debouncedSearch.config.groupingConfig?.maxResultsPerGroup).toBe(10)
  })

  it('应该能够对提供的结果进行分组', () => {
    const debouncedSearch = useDebouncedGlobalSearch()

    // 直接调用分组方法
    const groupedResults = debouncedSearch.groupResults(mockResults, 'type')

    expect(groupedResults).toBeDefined()
    expect(groupedResults.groups).toHaveLength(3) // page, order, product
    expect(groupedResults.totalCount).toBe(3)
    expect(groupedResults.strategy).toBe('type')

    // 检查分组内容
    const pageGroup = groupedResults.groups.find(g => g.type === 'page')
    expect(pageGroup).toBeDefined()
    expect(pageGroup!.items).toHaveLength(1)
    expect(pageGroup!.label).toBe('页面')
  })

  it('应该支持不同的分组策略', () => {
    const debouncedSearch = useDebouncedGlobalSearch()

    // 按类型分组
    const typeGrouped = debouncedSearch.groupResults(mockResults, 'type')
    expect(typeGrouped.strategy).toBe('type')
    expect(typeGrouped.groups).toHaveLength(3)

    // 按分类分组
    const categoryGrouped = debouncedSearch.groupResults(mockResults, 'category')
    expect(categoryGrouped.strategy).toBe('category')
    expect(categoryGrouped.groups).toHaveLength(3) // 导航, 业务, 标准件

    // 混合分组
    const hybridGrouped = debouncedSearch.groupResults(mockResults, 'hybrid')
    expect(hybridGrouped.strategy).toBe('hybrid')

    // 智能分组
    const intelligentGrouped = debouncedSearch.groupResults(mockResults, 'intelligent')
    expect(intelligentGrouped.strategy).toContain('intelligent')
  })

  it('应该能够更新分组配置', () => {
    const debouncedSearch = useDebouncedGlobalSearch()

    // 设置一些搜索结果到全局数据中
    debouncedSearch.globalSearchData.setSearchResults(mockResults)

    // 模拟当前有搜索结果
    debouncedSearch.searchState.value.groupedResults = debouncedSearch.groupResults(mockResults, 'type')

    // 更新分组配置
    const newGrouped = debouncedSearch.updateGroupingConfig({
      maxGroups: 2,
      maxResultsPerGroup: 5
    })

    expect(debouncedSearch.config.groupingConfig?.maxGroups).toBe(2)
    expect(debouncedSearch.config.groupingConfig?.maxResultsPerGroup).toBe(5)
  })

  it('应该处理空结果的分组', () => {
    const debouncedSearch = useDebouncedGlobalSearch()

    const emptyGrouped = debouncedSearch.groupResults([], 'type')

    expect(emptyGrouped.groups).toHaveLength(0)
    expect(emptyGrouped.totalCount).toBe(0)
    expect(emptyGrouped.groupCount).toBe(0)
  })

  it('应该能够获取当前分组结果', () => {
    const debouncedSearch = useDebouncedGlobalSearch()

    // 初始状态应该为空
    expect(debouncedSearch.getCurrentGroupedResults()).toBeNull()

    // 设置分组结果
    const grouped = debouncedSearch.groupResults(mockResults, 'type')
    debouncedSearch.searchState.value.groupedResults = grouped

    // 获取当前分组结果
    const current = debouncedSearch.getCurrentGroupedResults()
    expect(current).toStrictEqual(grouped)
    expect(current?.groups).toHaveLength(3)
  })

  it('应该在清空搜索时清空分组结果', () => {
    const debouncedSearch = useDebouncedGlobalSearch()

    // 设置分组结果
    debouncedSearch.searchState.value.groupedResults = debouncedSearch.groupResults(mockResults, 'type')
    expect(debouncedSearch.getCurrentGroupedResults()).not.toBeNull()

    // 清空搜索
    debouncedSearch.clearSearch()

    // 分组结果应该被清空
    expect(debouncedSearch.getCurrentGroupedResults()).toBeNull()
  })

  it('应该正确处理分组统计信息', () => {
    const debouncedSearch = useDebouncedGlobalSearch()

    const grouped = debouncedSearch.groupResults(mockResults, 'type')

    expect(grouped.stats).toBeDefined()
    expect(grouped.stats.averageGroupSize).toBeGreaterThan(0)
    expect(grouped.stats.largestGroupSize).toBeGreaterThanOrEqual(grouped.stats.smallestGroupSize)
    expect(grouped.stats.groupSizeDistribution).toBeDefined()
    expect(typeof grouped.stats.groupSizeDistribution).toBe('object')
  })

  it('应该支持禁用分组功能', () => {
    const debouncedSearch = useDebouncedGlobalSearch({
      enableGrouping: false
    })

    expect(debouncedSearch.config.enableGrouping).toBe(false)

    // 即使调用分组方法，在实际搜索时不会设置分组结果
    const grouped = debouncedSearch.groupResults(mockResults, 'type')
    expect(grouped).toBeDefined() // 方法仍然可用

    // 但搜索状态中不会保存分组结果（需要在实际搜索时验证）
    expect(debouncedSearch.getCurrentGroupedResults()).toBeNull()
  })

  it('应该使用默认的智能分组配置', () => {
    const debouncedSearch = useDebouncedGlobalSearch()

    expect(debouncedSearch.config.enableGrouping).toBe(true)
    expect(debouncedSearch.config.groupingConfig?.strategy).toBe('intelligent')
    expect(debouncedSearch.config.groupingConfig?.maxGroups).toBe(8)
    expect(debouncedSearch.config.groupingConfig?.maxResultsPerGroup).toBe(15)
  })
})