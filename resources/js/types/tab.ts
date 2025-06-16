/**
 * Tab Navigation Type Definitions
 * 标签页导航的TypeScript类型定义
 */

/**
 * 标签页项目接口
 */
export interface TabItem {
  /** 唯一标识符 */
  id: string
  /** 显示标题 */
  title: string
  /** 路由路径 */
  route: string
  /** 路由参数 */
  params?: Record<string, any>
  /** 查询参数 */
  query?: Record<string, any>
  /** 图标名称 (lucide图标) */
  icon?: string
  /** 是否可关闭 */
  closable?: boolean
  /** 是否为临时标签 */
  temporary?: boolean
  /** 最后访问时间 */
  lastAccessed: number
  /** 创建时间 */
  createdAt: number
  /** 标签状态 */
  status?: 'loading' | 'loaded' | 'error'
  /** 自定义数据 */
  meta?: Record<string, any>
}

/**
 * 标签页状态接口
 */
export interface TabState {
  /** 所有标签页列表 */
  tabs: TabItem[]
  /** 当前激活的标签页ID */
  activeTabId: string | null
  /** 标签页限制数量 */
  maxTabs: number
  /** 是否启用自动清理 */
  autoCleanup: boolean
}

/**
 * 标签页操作类型
 */
export type TabOperation = 
  | 'add'
  | 'remove' 
  | 'activate'
  | 'update'
  | 'reorder'
  | 'clear'

/**
 * 标签页事件接口
 */
export interface TabEvent {
  /** 事件类型 */
  type: TabOperation
  /** 相关标签页 */
  tab?: TabItem
  /** 标签页列表 */
  tabs?: TabItem[]
  /** 旧的激活标签ID */
  oldActiveId?: string | null
  /** 新的激活标签ID */
  newActiveId?: string | null
  /** 事件时间戳 */
  timestamp: number
}

/**
 * 标签页移除策略
 */
export type TabRemovalStrategy = 
  | 'lru'        // 最近最少使用
  | 'oldest'     // 最老的标签
  | 'temporary'  // 临时标签优先
  | 'manual'     // 手动选择

/**
 * 标签页配置选项
 */
export interface TabConfig {
  /** 最大标签数量 */
  maxTabs?: number
  /** 移除策略 */
  removalStrategy?: TabRemovalStrategy
  /** 是否启用自动清理 */
  autoCleanup?: boolean
  /** 自动清理间隔(毫秒) */
  cleanupInterval?: number
  /** 标签过期时间(毫秒) */
  tabExpireTime?: number
  /** 是否持久化状态 */
  persistent?: boolean
  /** 持久化键名 */
  persistentKey?: string
}

/**
 * 标签页验证错误
 */
export interface TabValidationError {
  /** 错误类型 */
  type: 'duplicate' | 'invalid_route' | 'missing_title' | 'max_tabs_exceeded'
  /** 错误消息 */
  message: string
  /** 相关标签页 */
  tab?: Partial<TabItem>
}

/**
 * 标签页统计信息
 */
export interface TabStats {
  /** 总标签数 */
  totalTabs: number
  /** 临时标签数 */
  temporaryTabs: number
  /** 最活跃的标签ID */
  mostActiveTabId: string | null
  /** 平均标签生存时间 */
  averageLifetime: number
  /** 内存使用估计 */
  memoryUsage: number
}

/**
 * 标签页历史记录
 */
export interface TabHistory {
  /** 操作历史 */
  operations: TabEvent[]
  /** 最大历史记录数 */
  maxHistory: number
  /** 当前历史位置 */
  currentPosition: number
}

/**
 * 标签页钩子函数类型
 */
export interface TabHooks {
  /** 标签创建前 */
  beforeCreate?: (tab: Partial<TabItem>) => Promise<TabItem | null> | TabItem | null
  /** 标签创建后 */
  afterCreate?: (tab: TabItem) => Promise<void> | void
  /** 标签激活前 */
  beforeActivate?: (tab: TabItem, oldTab?: TabItem) => Promise<boolean> | boolean
  /** 标签激活后 */
  afterActivate?: (tab: TabItem, oldTab?: TabItem) => Promise<void> | void
  /** 标签移除前 */
  beforeRemove?: (tab: TabItem) => Promise<boolean> | boolean
  /** 标签移除后 */
  afterRemove?: (tab: TabItem) => Promise<void> | void
  /** 标签更新前 */
  beforeUpdate?: (tab: TabItem, updates: Partial<TabItem>) => Promise<TabItem | null> | TabItem | null
  /** 标签更新后 */
  afterUpdate?: (tab: TabItem, oldTab: TabItem) => Promise<void> | void
}

/**
 * 默认标签配置
 */
export const DEFAULT_TAB_CONFIG: Required<TabConfig> = {
  maxTabs: 12,
  removalStrategy: 'lru',
  autoCleanup: true,
  cleanupInterval: 5 * 60 * 1000, // 5分钟
  tabExpireTime: 7 * 24 * 60 * 60 * 1000, // 7天
  persistent: true,
  persistentKey: 'hyq_mes_tabs'
}

/**
 * 创建默认标签项
 */
export function createDefaultTab(overrides: Partial<TabItem> = {}): TabItem {
  const now = Date.now()
  return {
    id: `tab_${now}_${Math.random().toString(36).substr(2, 9)}`,
    title: 'New Tab',
    route: '/dashboard',
    params: {},
    query: {},
    closable: true,
    temporary: false,
    lastAccessed: now,
    createdAt: now,
    status: 'loaded',
    meta: {},
    ...overrides
  }
}

/**
 * 标签页工具函数
 */
export const TabUtils = {
  /**
   * 生成唯一标签ID
   */
  generateId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },

  /**
   * 检查标签是否有效
   */
  isValidTab(tab: Partial<TabItem>): tab is TabItem {
    return !!(
      tab.id &&
      tab.title &&
      tab.route &&
      typeof tab.lastAccessed === 'number' &&
      typeof tab.createdAt === 'number'
    )
  },

  /**
   * 比较两个标签是否相同
   */
  isEqual(tab1: TabItem, tab2: TabItem): boolean {
    return (
      tab1.route === tab2.route &&
      JSON.stringify(tab1.params || {}) === JSON.stringify(tab2.params || {}) &&
      JSON.stringify(tab1.query || {}) === JSON.stringify(tab2.query || {})
    )
  },

  /**
   * 计算标签内存使用
   */
  calculateMemoryUsage(tab: TabItem): number {
    return JSON.stringify(tab).length * 2 // 粗略估计字节数
  },

  /**
   * 格式化标签显示标题
   */
  formatTitle(tab: TabItem, maxLength: number = 20): string {
    if (tab.title.length <= maxLength) {
      return tab.title
    }
    return tab.title.substring(0, maxLength - 3) + '...'
  },

  /**
   * 检查标签是否过期
   */
  isExpired(tab: TabItem, expireTime: number): boolean {
    return Date.now() - tab.lastAccessed > expireTime
  }
}