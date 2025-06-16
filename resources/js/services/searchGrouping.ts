import type { SearchResult } from '@/types'

/**
 * 搜索结果分组配置接口
 */
export interface GroupingConfig {
  /** 分组策略 */
  strategy: 'type' | 'category' | 'custom' | 'hybrid'
  /** 类型优先级 */
  typePriority?: Record<string, number>
  /** 分类优先级 */
  categoryPriority?: Record<string, number>
  /** 自定义分组函数 */
  customGrouper?: (results: SearchResult[]) => GroupedResults
  /** 是否显示空分组 */
  showEmptyGroups?: boolean
  /** 最大分组数量 */
  maxGroups?: number
  /** 每组最大结果数 */
  maxResultsPerGroup?: number
}

/**
 * 分组结果接口
 */
export interface SearchGroup {
  /** 分组标识 */
  id: string
  /** 分组类型 */
  type: string
  /** 显示标签 */
  label: string
  /** 分组描述 */
  description?: string
  /** 分组图标 */
  icon?: string
  /** 结果列表 */
  items: SearchResult[]
  /** 结果数量 */
  count: number
  /** 分组优先级 */
  priority: number
  /** 是否可折叠 */
  collapsible?: boolean
  /** 默认是否展开 */
  defaultExpanded?: boolean
  /** 分组元数据 */
  metadata?: Record<string, any>
}

/**
 * 分组结果集合
 */
export interface GroupedResults {
  /** 分组列表 */
  groups: SearchGroup[]
  /** 总结果数 */
  totalCount: number
  /** 分组数量 */
  groupCount: number
  /** 分组策略 */
  strategy: string
  /** 分组统计 */
  stats: {
    averageGroupSize: number
    largestGroupSize: number
    smallestGroupSize: number
    groupSizeDistribution: Record<string, number>
  }
}

/**
 * 过滤器接口
 */
export interface SearchFilter {
  /** 过滤器类型 */
  type: 'type' | 'category' | 'keyword' | 'date' | 'custom'
  /** 过滤器值 */
  value: any
  /** 过滤器标签 */
  label: string
  /** 是否启用 */
  enabled: boolean
  /** 过滤函数 */
  filter: (result: SearchResult) => boolean
}

/**
 * 搜索结果分组服务类
 * 
 * 功能特性：
 * - 多种分组策略（按类型、分类、混合等）
 * - 智能优先级排序
 * - 高级过滤功能
 * - 分组统计和分析
 * - 动态分组配置
 * - 结果去重和合并
 */
export class SearchGroupingService {
  private static readonly DEFAULT_CONFIG: Required<GroupingConfig> = {
    strategy: 'type',
    typePriority: {
      page: 0,
      order: 1,
      product: 2,
      user: 3,
      setting: 4
    },
    categoryPriority: {},
    customGrouper: () => ({ groups: [], totalCount: 0, groupCount: 0, strategy: 'custom', stats: { averageGroupSize: 0, largestGroupSize: 0, smallestGroupSize: 0, groupSizeDistribution: {} } }),
    showEmptyGroups: false,
    maxGroups: 10,
    maxResultsPerGroup: 20
  }

  /**
   * 按类型分组搜索结果
   */
  static groupByType(
    results: SearchResult[], 
    config: Partial<GroupingConfig> = {}
  ): GroupedResults {
    const mergedConfig = { ...this.DEFAULT_CONFIG, ...config }
    const groups = new Map<string, SearchResult[]>()
    
    // 按类型分组
    results.forEach(result => {
      const type = result.type || 'unknown'
      if (!groups.has(type)) {
        groups.set(type, [])
      }
      groups.get(type)!.push(result)
    })

    // 转换为分组对象
    const groupArray: SearchGroup[] = Array.from(groups.entries()).map(([type, items]) => ({
      id: `type-${type}`,
      type,
      label: this.getTypeLabel(type),
      description: this.getTypeDescription(type),
      icon: this.getTypeIcon(type),
      items: items.slice(0, mergedConfig.maxResultsPerGroup),
      count: items.length,
      priority: mergedConfig.typePriority[type] ?? 999,
      collapsible: true,
      defaultExpanded: items.length <= 5,
      metadata: {
        originalCount: items.length,
        truncated: items.length > mergedConfig.maxResultsPerGroup
      }
    }))

    // 按优先级排序
    groupArray.sort((a, b) => a.priority - b.priority)

    // 限制分组数量
    const limitedGroups = groupArray.slice(0, mergedConfig.maxGroups)

    return {
      groups: limitedGroups,
      totalCount: results.length,
      groupCount: limitedGroups.length,
      strategy: 'type',
      stats: this.calculateGroupStats(limitedGroups)
    }
  }

  /**
   * 按分类分组搜索结果
   */
  static groupByCategory(
    results: SearchResult[], 
    config: Partial<GroupingConfig> = {}
  ): GroupedResults {
    const mergedConfig = { ...this.DEFAULT_CONFIG, ...config }
    const groups = new Map<string, SearchResult[]>()
    
    // 按分类分组
    results.forEach(result => {
      const category = result.category || '其他'
      if (!groups.has(category)) {
        groups.set(category, [])
      }
      groups.get(category)!.push(result)
    })

    // 转换为分组对象
    const groupArray: SearchGroup[] = Array.from(groups.entries()).map(([category, items]) => ({
      id: `category-${category}`,
      type: 'category',
      label: category,
      description: `${category}相关结果`,
      icon: this.getCategoryIcon(category),
      items: items.slice(0, mergedConfig.maxResultsPerGroup),
      count: items.length,
      priority: mergedConfig.categoryPriority[category] ?? 999,
      collapsible: true,
      defaultExpanded: items.length <= 3,
      metadata: {
        originalCount: items.length,
        category,
        truncated: items.length > mergedConfig.maxResultsPerGroup
      }
    }))

    // 按结果数量排序（分类分组优先显示结果多的）
    groupArray.sort((a, b) => b.count - a.count)

    const limitedGroups = groupArray.slice(0, mergedConfig.maxGroups)

    return {
      groups: limitedGroups,
      totalCount: results.length,
      groupCount: limitedGroups.length,
      strategy: 'category',
      stats: this.calculateGroupStats(limitedGroups)
    }
  }

  /**
   * 混合分组策略
   */
  static groupByHybrid(
    results: SearchResult[], 
    config: Partial<GroupingConfig> = {}
  ): GroupedResults {
    const mergedConfig = { ...this.DEFAULT_CONFIG, ...config }
    
    // 先按类型分组，然后在每个类型内按分类细分
    const typeGroups = new Map<string, Map<string, SearchResult[]>>()
    
    results.forEach(result => {
      const type = result.type || 'unknown'
      const category = result.category || '默认'
      
      if (!typeGroups.has(type)) {
        typeGroups.set(type, new Map())
      }
      
      const categoryMap = typeGroups.get(type)!
      if (!categoryMap.has(category)) {
        categoryMap.set(category, [])
      }
      
      categoryMap.get(category)!.push(result)
    })

    const groups: SearchGroup[] = []
    
    // 按类型优先级排序
    const sortedTypes = Array.from(typeGroups.keys()).sort((a, b) => 
      (mergedConfig.typePriority[a] ?? 999) - (mergedConfig.typePriority[b] ?? 999)
    )

    sortedTypes.forEach((type, typeIndex) => {
      const categoryMap = typeGroups.get(type)!
      const typeLabel = this.getTypeLabel(type)
      
      if (categoryMap.size === 1) {
        // 如果只有一个分类，直接创建类型分组
        const items = Array.from(categoryMap.values())[0]
        groups.push({
          id: `hybrid-${type}`,
          type,
          label: typeLabel,
          description: this.getTypeDescription(type),
          icon: this.getTypeIcon(type),
          items: items.slice(0, mergedConfig.maxResultsPerGroup),
          count: items.length,
          priority: typeIndex,
          collapsible: true,
          defaultExpanded: typeIndex < 2,
          metadata: {
            originalCount: items.length,
            hybridType: 'single-category',
            truncated: items.length > mergedConfig.maxResultsPerGroup
          }
        })
      } else {
        // 多个分类，创建子分组
        Array.from(categoryMap.entries()).forEach(([category, items], categoryIndex) => {
          groups.push({
            id: `hybrid-${type}-${category}`,
            type: `${type}-${category}`,
            label: `${typeLabel} - ${category}`,
            description: `${typeLabel}中的${category}结果`,
            icon: this.getCategoryIcon(category),
            items: items.slice(0, mergedConfig.maxResultsPerGroup),
            count: items.length,
            priority: typeIndex * 100 + categoryIndex,
            collapsible: true,
            defaultExpanded: typeIndex === 0 && categoryIndex === 0,
            metadata: {
              originalCount: items.length,
              parentType: type,
              category,
              hybridType: 'multi-category',
              truncated: items.length > mergedConfig.maxResultsPerGroup
            }
          })
        })
      }
    })

    const limitedGroups = groups.slice(0, mergedConfig.maxGroups)

    return {
      groups: limitedGroups,
      totalCount: results.length,
      groupCount: limitedGroups.length,
      strategy: 'hybrid',
      stats: this.calculateGroupStats(limitedGroups)
    }
  }

  /**
   * 智能分组（自动选择最佳策略）
   */
  static groupIntelligently(
    results: SearchResult[], 
    config: Partial<GroupingConfig> = {}
  ): GroupedResults {
    if (results.length === 0) {
      return {
        groups: [],
        totalCount: 0,
        groupCount: 0,
        strategy: 'intelligent',
        stats: {
          averageGroupSize: 0,
          largestGroupSize: 0,
          smallestGroupSize: 0,
          groupSizeDistribution: {}
        }
      }
    }

    // 分析结果特征
    const typeCount = new Set(results.map(r => r.type)).size
    const categoryCount = new Set(results.map(r => r.category)).size
    const hasCategories = results.some(r => r.category)

    // 选择最佳分组策略
    let strategy: 'type' | 'category' | 'hybrid'
    
    if (typeCount <= 2 && hasCategories && categoryCount > typeCount) {
      // 类型少但分类多，使用分类分组
      strategy = 'category'
    } else if (typeCount > 3 && hasCategories) {
      // 类型和分类都较多，使用混合分组
      strategy = 'hybrid'
    } else {
      // 默认使用类型分组
      strategy = 'type'
    }

    const result = this.groupByStrategy(results, strategy, config)
    result.strategy = `intelligent-${strategy}`
    
    return result
  }

  /**
   * 根据策略分组
   */
  static groupByStrategy(
    results: SearchResult[], 
    strategy: 'type' | 'category' | 'hybrid' | 'custom' | 'intelligent',
    config: Partial<GroupingConfig> = {}
  ): GroupedResults {
    switch (strategy) {
      case 'type':
        return this.groupByType(results, config)
      case 'category':
        return this.groupByCategory(results, config)
      case 'hybrid':
        return this.groupByHybrid(results, config)
      case 'intelligent':
        return this.groupIntelligently(results, config)
      case 'custom':
        return config.customGrouper ? config.customGrouper(results) : this.groupByType(results, config)
      default:
        return this.groupByType(results, config)
    }
  }

  /**
   * 应用过滤器
   */
  static applyFilters(results: SearchResult[], filters: SearchFilter[]): SearchResult[] {
    const enabledFilters = filters.filter(f => f.enabled)
    
    if (enabledFilters.length === 0) {
      return results
    }

    return results.filter(result => {
      return enabledFilters.every(filter => filter.filter(result))
    })
  }

  /**
   * 创建过滤器
   */
  static createFilter(
    type: SearchFilter['type'],
    value: any,
    label: string,
    enabled: boolean = true
  ): SearchFilter {
    let filter: (result: SearchResult) => boolean

    switch (type) {
      case 'type':
        filter = (result) => result.type === value
        break
      case 'category':
        filter = (result) => result.category === value
        break
      case 'keyword':
        filter = (result) => 
          result.title?.toLowerCase().includes(value.toLowerCase()) ||
          result.description?.toLowerCase().includes(value.toLowerCase())
        break
      default:
        filter = () => true
    }

    return { type, value, label, enabled, filter }
  }

  /**
   * 去重搜索结果
   */
  static deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>()
    return results.filter(result => {
      const key = `${result.type}-${result.id}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  /**
   * 合并搜索结果
   */
  static mergeResults(...resultArrays: SearchResult[][]): SearchResult[] {
    const merged = resultArrays.flat()
    return this.deduplicateResults(merged)
  }

  /**
   * 获取类型标签
   */
  private static getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      page: '页面',
      order: '订单',
      product: '产品',
      user: '用户',
      setting: '设置',
      unknown: '其他'
    }
    return labels[type] || type
  }

  /**
   * 获取类型描述
   */
  private static getTypeDescription(type: string): string {
    const descriptions: Record<string, string> = {
      page: '系统页面和导航',
      order: '订单和交易记录',
      product: '产品和商品信息',
      user: '用户和联系人',
      setting: '系统设置和配置',
      unknown: '其他类型结果'
    }
    return descriptions[type] || `${type}相关结果`
  }

  /**
   * 获取类型图标
   */
  private static getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      page: '📄',
      order: '📋',
      product: '📦',
      user: '👤',
      setting: '⚙️',
      unknown: '📁'
    }
    return icons[type] || '📄'
  }

  /**
   * 获取分类图标
   */
  private static getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      '导航': '🧭',
      '业务': '💼',
      '分析': '📊',
      '系统': '⚙️',
      '界面': '🎨',
      '账户': '👤',
      '安全': '🔒',
      '待处理': '⏳',
      '已完成': '✅',
      '进行中': '🔄',
      '标准件': '🔧',
      '定制件': '🛠️',
      '工具': '🔨',
      '员工': '👥'
    }
    return icons[category] || '📂'
  }

  /**
   * 计算分组统计
   */
  private static calculateGroupStats(groups: SearchGroup[]): GroupedResults['stats'] {
    if (groups.length === 0) {
      return {
        averageGroupSize: 0,
        largestGroupSize: 0,
        smallestGroupSize: 0,
        groupSizeDistribution: {}
      }
    }

    const sizes = groups.map(g => g.count)
    const total = sizes.reduce((sum, size) => sum + size, 0)
    const distribution: Record<string, number> = {}

    // 计算分布
    sizes.forEach(size => {
      const range = this.getSizeRange(size)
      distribution[range] = (distribution[range] || 0) + 1
    })

    return {
      averageGroupSize: Math.round(total / groups.length),
      largestGroupSize: Math.max(...sizes),
      smallestGroupSize: Math.min(...sizes),
      groupSizeDistribution: distribution
    }
  }

  /**
   * 获取大小范围
   */
  private static getSizeRange(size: number): string {
    if (size <= 1) return '1'
    if (size <= 3) return '2-3'
    if (size <= 5) return '4-5'
    if (size <= 10) return '6-10'
    return '10+'
  }
}

/**
 * 搜索分组组合式函数
 */
export function useSearchGrouping() {
  /**
   * 分组搜索结果
   */
  const groupResults = (
    results: SearchResult[],
    strategy: GroupingConfig['strategy'] = 'intelligent',
    config?: Partial<GroupingConfig>
  ): GroupedResults => {
    return SearchGroupingService.groupByStrategy(results, strategy, config)
  }

  /**
   * 应用过滤器
   */
  const applyFilters = (results: SearchResult[], filters: SearchFilter[]): SearchResult[] => {
    return SearchGroupingService.applyFilters(results, filters)
  }

  /**
   * 创建过滤器
   */
  const createFilter = (
    type: SearchFilter['type'],
    value: any,
    label: string,
    enabled: boolean = true
  ): SearchFilter => {
    return SearchGroupingService.createFilter(type, value, label, enabled)
  }

  /**
   * 去重结果
   */
  const deduplicateResults = (results: SearchResult[]): SearchResult[] => {
    return SearchGroupingService.deduplicateResults(results)
  }

  /**
   * 合并结果
   */
  const mergeResults = (...resultArrays: SearchResult[][]): SearchResult[] => {
    return SearchGroupingService.mergeResults(...resultArrays)
  }

  return {
    groupResults,
    applyFilters,
    createFilter,
    deduplicateResults,
    mergeResults,
    SearchGroupingService
  }
}