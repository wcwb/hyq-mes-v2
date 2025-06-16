import { describe, it, expect, beforeEach } from 'vitest'
import { SearchGroupingService, useSearchGrouping, type GroupingConfig, type SearchFilter } from '@/services/searchGrouping'
import type { SearchResult } from '@/types'

describe('SearchGroupingService', () => {
  let mockResults: SearchResult[]

  beforeEach(() => {
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
        type: 'page',
        title: '用户管理',
        description: '管理系统用户',
        url: '/users',
        category: '系统'
      },
      {
        id: '3',
        type: 'order',
        title: '订单#12345',
        description: '生产订单信息',
        url: '/orders/12345',
        category: '业务'
      },
      {
        id: '4',
        type: 'order',
        title: '订单#67890',
        description: '完成的订单',
        url: '/orders/67890',
        category: '业务'
      },
      {
        id: '5',
        type: 'product',
        title: '标准件A',
        description: '标准化产品',
        url: '/products/std-a',
        category: '标准件'
      },
      {
        id: '6',
        type: 'user',
        title: '张三',
        description: '系统管理员',
        url: '/users/1',
        category: '员工'
      }
    ]
  })

  describe('按类型分组', () => {
    it('应该按类型正确分组搜索结果', () => {
      const result = SearchGroupingService.groupByType(mockResults)

      expect(result.groups).toHaveLength(4) // page, order, product, user
      expect(result.totalCount).toBe(6)
      expect(result.strategy).toBe('type')

      const pageGroup = result.groups.find(g => g.type === 'page')
      expect(pageGroup).toBeDefined()
      expect(pageGroup!.items).toHaveLength(2)
      expect(pageGroup!.label).toBe('页面')
      expect(pageGroup!.count).toBe(2)
    })

    it('应该按优先级排序分组', () => {
      const config: Partial<GroupingConfig> = {
        typePriority: {
          order: 0,
          page: 1,
          product: 2,
          user: 3
        }
      }

      const result = SearchGroupingService.groupByType(mockResults, config)

      expect(result.groups[0].type).toBe('order')
      expect(result.groups[1].type).toBe('page')
      expect(result.groups[2].type).toBe('product')
      expect(result.groups[3].type).toBe('user')
    })

    it('应该限制每组最大结果数', () => {
      const config: Partial<GroupingConfig> = {
        maxResultsPerGroup: 1
      }

      const result = SearchGroupingService.groupByType(mockResults, config)

      const pageGroup = result.groups.find(g => g.type === 'page')
      expect(pageGroup!.items).toHaveLength(1)
      expect(pageGroup!.metadata?.truncated).toBe(true)
      expect(pageGroup!.metadata?.originalCount).toBe(2)
    })

    it('应该限制最大分组数量', () => {
      const config: Partial<GroupingConfig> = {
        maxGroups: 2
      }

      const result = SearchGroupingService.groupByType(mockResults, config)

      expect(result.groups).toHaveLength(2)
      expect(result.groupCount).toBe(2)
    })
  })

  describe('按分类分组', () => {
    it('应该按分类正确分组搜索结果', () => {
      const result = SearchGroupingService.groupByCategory(mockResults)

      expect(result.groups).toHaveLength(5) // 导航, 系统, 业务, 标准件, 员工
      expect(result.strategy).toBe('category')

      const businessGroup = result.groups.find(g => g.label === '业务')
      expect(businessGroup).toBeDefined()
      expect(businessGroup!.items).toHaveLength(2)
      expect(businessGroup!.type).toBe('category')
    })

    it('应该按结果数量降序排序', () => {
      const result = SearchGroupingService.groupByCategory(mockResults)

      // 业务分类有2个结果，应该排在前面
      const firstGroup = result.groups[0]
      expect(firstGroup.label).toBe('业务')
      expect(firstGroup.count).toBe(2)
    })

    it('应该处理无分类的结果', () => {
      const noCategory = [...mockResults, {
        id: '7',
        type: 'setting',
        title: '系统设置',
        description: '配置系统参数',
        url: '/settings'
      }]

      const result = SearchGroupingService.groupByCategory(noCategory)

      const otherGroup = result.groups.find(g => g.label === '其他')
      expect(otherGroup).toBeDefined()
      expect(otherGroup!.items).toHaveLength(1)
    })
  })

  describe('混合分组策略', () => {
    it('应该创建混合分组结构', () => {
      const result = SearchGroupingService.groupByHybrid(mockResults)

      expect(result.strategy).toBe('hybrid')
      expect(result.groups.length).toBeGreaterThan(0)

      // 检查单分类的类型分组
      const productGroup = result.groups.find(g => g.type === 'product')
      expect(productGroup).toBeDefined()
      expect(productGroup!.metadata?.hybridType).toBe('single-category')
    })

    it('应该为多分类类型创建子分组', () => {
      // 添加更多页面以创建多分类情况
      const extendedResults = [...mockResults, {
        id: '8',
        type: 'page',
        title: '报表页面',
        description: '数据分析报表',
        url: '/reports',
        category: '分析'
      }]

      const result = SearchGroupingService.groupByHybrid(extendedResults)

      const pageGroups = result.groups.filter(g => g.type.startsWith('page-'))
      expect(pageGroups.length).toBeGreaterThan(0)

      if (pageGroups.length > 0) {
        expect(pageGroups[0].metadata?.hybridType).toBe('multi-category')
        expect(pageGroups[0].metadata?.parentType).toBe('page')
      }
    })
  })

  describe('智能分组', () => {
    it('应该为空结果返回空分组', () => {
      const result = SearchGroupingService.groupIntelligently([])

      expect(result.groups).toHaveLength(0)
      expect(result.totalCount).toBe(0)
      expect(result.strategy).toBe('intelligent')
    })

    it('应该为少量类型选择分类分组', () => {
      // 只有2种类型但有多个分类
      const fewTypes = mockResults.filter(r => r.type === 'page' || r.type === 'order')
      const result = SearchGroupingService.groupIntelligently(fewTypes)

      expect(result.strategy).toBe('intelligent-category')
    })

    it('应该为多种类型选择混合分组', () => {
      // 添加更多类型
      const manyTypes = [...mockResults, 
        { id: '7', type: 'setting', title: '设置1', category: '系统' },
        { id: '8', type: 'report', title: '报告1', category: '分析' },
        { id: '9', type: 'task', title: '任务1', category: '业务' }
      ]
      
      const result = SearchGroupingService.groupIntelligently(manyTypes)

      expect(result.strategy).toBe('intelligent-hybrid')
    })
  })

  describe('过滤器功能', () => {
    it('应该创建类型过滤器', () => {
      const filter = SearchGroupingService.createFilter('type', 'page', '页面类型')

      expect(filter.type).toBe('type')
      expect(filter.value).toBe('page')
      expect(filter.label).toBe('页面类型')
      expect(filter.enabled).toBe(true)

      const pageResult = mockResults.find(r => r.type === 'page')!
      const orderResult = mockResults.find(r => r.type === 'order')!

      expect(filter.filter(pageResult)).toBe(true)
      expect(filter.filter(orderResult)).toBe(false)
    })

    it('应该创建分类过滤器', () => {
      const filter = SearchGroupingService.createFilter('category', '业务', '业务分类')

      const businessResult = mockResults.find(r => r.category === '业务')!
      const systemResult = mockResults.find(r => r.category === '系统')!

      expect(filter.filter(businessResult)).toBe(true)
      expect(filter.filter(systemResult)).toBe(false)
    })

    it('应该创建关键词过滤器', () => {
      const filter = SearchGroupingService.createFilter('keyword', '订单', '包含订单')

      const orderResult = mockResults.find(r => r.title?.includes('订单'))!
      const pageResult = mockResults.find(r => r.type === 'page')!

      expect(filter.filter(orderResult)).toBe(true)
      expect(filter.filter(pageResult)).toBe(false)
    })

    it('应该正确应用多个过滤器', () => {
      const filters: SearchFilter[] = [
        SearchGroupingService.createFilter('type', 'page', '页面类型'),
        SearchGroupingService.createFilter('category', '系统', '系统分类')
      ]

      const filteredResults = SearchGroupingService.applyFilters(mockResults, filters)

      expect(filteredResults).toHaveLength(1)
      expect(filteredResults[0].id).toBe('2') // 用户管理页面
    })

    it('应该忽略禁用的过滤器', () => {
      const filters: SearchFilter[] = [
        SearchGroupingService.createFilter('type', 'page', '页面类型', false), // 禁用
        SearchGroupingService.createFilter('category', '系统', '系统分类', true)   // 启用
      ]

      const filteredResults = SearchGroupingService.applyFilters(mockResults, filters)

      // 只应用系统分类过滤器，不管类型
      expect(filteredResults).toHaveLength(1)
      expect(filteredResults[0].category).toBe('系统')
    })
  })

  describe('结果处理工具', () => {
    it('应该正确去重搜索结果', () => {
      const duplicatedResults = [
        ...mockResults,
        ...mockResults.slice(0, 2) // 重复前两个结果
      ]

      const deduped = SearchGroupingService.deduplicateResults(duplicatedResults)

      expect(deduped).toHaveLength(mockResults.length)
      expect(deduped.map(r => r.id).sort()).toEqual(mockResults.map(r => r.id).sort())
    })

    it('应该正确合并多个结果数组', () => {
      const array1 = mockResults.slice(0, 3)
      const array2 = mockResults.slice(2, 5) // 有重叠
      const array3 = mockResults.slice(4, 6)

      const merged = SearchGroupingService.mergeResults(array1, array2, array3)

      expect(merged).toHaveLength(mockResults.length)
      expect(merged.map(r => r.id).sort()).toEqual(mockResults.map(r => r.id).sort())
    })
  })

  describe('统计功能', () => {
    it('应该正确计算分组统计', () => {
      const result = SearchGroupingService.groupByType(mockResults)

      expect(result.stats.averageGroupSize).toBeGreaterThan(0)
      expect(result.stats.largestGroupSize).toBeGreaterThanOrEqual(result.stats.smallestGroupSize)
      expect(result.stats.groupSizeDistribution).toBeDefined()

      // 检查具体统计值
      const sizes = result.groups.map(g => g.count)
      const expectedAverage = Math.round(sizes.reduce((sum, size) => sum + size, 0) / sizes.length)
      expect(result.stats.averageGroupSize).toBe(expectedAverage)
      expect(result.stats.largestGroupSize).toBe(Math.max(...sizes))
      expect(result.stats.smallestGroupSize).toBe(Math.min(...sizes))
    })

    it('应该处理空分组的统计', () => {
      const result = SearchGroupingService.groupByType([])

      expect(result.stats.averageGroupSize).toBe(0)
      expect(result.stats.largestGroupSize).toBe(0)
      expect(result.stats.smallestGroupSize).toBe(0)
      expect(result.stats.groupSizeDistribution).toEqual({})
    })
  })

  describe('边界情况', () => {
    it('应该处理无效的搜索结果', () => {
      const invalidResults = [
        { id: '1', type: undefined, title: '无类型' },
        { id: '2', type: 'page', title: undefined, description: '无标题' },
        { id: '3', type: 'order', title: '', description: '空标题' }
      ] as SearchResult[]

      const result = SearchGroupingService.groupByType(invalidResults)

      expect(result.groups.length).toBeGreaterThan(0)
      expect(result.totalCount).toBe(3)
    })

    it('应该处理自定义分组策略', () => {
      const customGrouper = (results: SearchResult[]) => ({
        groups: [{
          id: 'custom-group',
          type: 'custom',
          label: '自定义分组',
          items: results,
          count: results.length,
          priority: 0
        }],
        totalCount: results.length,
        groupCount: 1,
        strategy: 'custom',
        stats: {
          averageGroupSize: results.length,
          largestGroupSize: results.length,
          smallestGroupSize: results.length,
          groupSizeDistribution: { [results.length.toString()]: 1 }
        }
      })

      const config: Partial<GroupingConfig> = {
        strategy: 'custom',
        customGrouper
      }

      const result = SearchGroupingService.groupByStrategy(mockResults, 'custom', config)

      expect(result.groups).toHaveLength(1)
      expect(result.groups[0].label).toBe('自定义分组')
      expect(result.strategy).toBe('custom')
    })
  })
})

describe('useSearchGrouping 组合式函数', () => {
  let mockResults: SearchResult[]

  beforeEach(() => {
    mockResults = [
      {
        id: '1',
        type: 'page',
        title: '测试页面',
        description: '测试描述',
        category: '系统'
      },
      {
        id: '2',
        type: 'order',
        title: '测试订单',
        description: '订单描述',
        category: '业务'
      }
    ]
  })

  it('应该提供分组功能', () => {
    const { groupResults } = useSearchGrouping()

    const result = groupResults(mockResults, 'type')

    expect(result.groups).toHaveLength(2)
    expect(result.strategy).toBe('type')
  })

  it('应该提供过滤功能', () => {
    const { applyFilters, createFilter } = useSearchGrouping()

    const filter = createFilter('type', 'page', '页面')
    const filtered = applyFilters(mockResults, [filter])

    expect(filtered).toHaveLength(1)
    expect(filtered[0].type).toBe('page')
  })

  it('应该提供结果处理功能', () => {
    const { deduplicateResults, mergeResults } = useSearchGrouping()

    const duplicated = [...mockResults, mockResults[0]]
    const deduped = deduplicateResults(duplicated)
    expect(deduped).toHaveLength(2)

    const merged = mergeResults([mockResults[0]], [mockResults[1]])
    expect(merged).toHaveLength(2)
  })

  it('应该暴露服务类', () => {
    const { SearchGroupingService: Service } = useSearchGrouping()

    expect(Service).toBe(SearchGroupingService)
    expect(typeof Service.groupByType).toBe('function')
  })
})