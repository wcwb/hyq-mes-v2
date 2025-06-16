/**
 * Tab State Management Composable
 * 标签页状态管理组合式函数
 * 
 * 功能：
 * - 响应式标签页状态管理
 * - 标签页CRUD操作
 * - 智能移除策略
 * - 状态验证和错误处理
 */

import { ref, reactive, computed, watch, nextTick, readonly } from 'vue'
import { 
  TabItem, 
  TabState, 
  TabConfig, 
  TabEvent, 
  TabOperation,
  TabRemovalStrategy,
  TabValidationError,
  TabStats,
  TabHooks,
  DEFAULT_TAB_CONFIG,
  createDefaultTab,
  TabUtils
} from '@/types/tab'
import { useTabPersistence, type TabPersistenceOptions } from '@/composables/useTabPersistence'

/**
 * 全局标签页状态实例（单例模式）
 */
let globalTabStateInstance: ReturnType<typeof createTabState> | null = null

/**
 * 创建标签页状态管理实例
 */
function createTabState(config: Partial<TabConfig> = {}) {
  // 合并配置
  const finalConfig = reactive({ ...DEFAULT_TAB_CONFIG, ...config })
  
  // 响应式状态
  const state = reactive<TabState>({
    tabs: [],
    activeTabId: null,
    maxTabs: finalConfig.maxTabs,
    autoCleanup: finalConfig.autoCleanup
  })

  // 事件历史记录
  const eventHistory = ref<TabEvent[]>([])
  const maxHistorySize = 100

  // 错误状态
  const errors = ref<TabValidationError[]>([])
  const isLoading = ref(false)

  // 钩子函数
  const hooks = ref<TabHooks>({})

  /**
   * 计算属性
   */
  const computedProps = {
    // 当前激活的标签页
    activeTab: computed((): TabItem | null => {
      if (!state.activeTabId) return null;
      return state.tabs.find(tab => tab.id === state.activeTabId) || null;
    }),

    // 可关闭的标签页
    closableTabs: computed((): TabItem[] => {
      return state.tabs.filter(tab => tab.closable !== false)
    }),

    // 临时标签页
    temporaryTabs: computed((): TabItem[] => {
      return state.tabs.filter(tab => tab.temporary === true)
    }),

    // 标签页统计
    stats: computed((): TabStats => {
      const now = Date.now()
      const totalTabs = state.tabs.length
      const temporaryTabs = computedProps.temporaryTabs.value.length
      let mostActiveTabId: string | null = null
      let averageLifetime = 0
      let memoryUsage = 0
      if (totalTabs > 0) {
        // 找最活跃的标签
        const mostActiveTab = state.tabs.reduce((most, current) =>
          current.lastAccessed > most.lastAccessed ? current : most,
          state.tabs[0]
        )
        mostActiveTabId = mostActiveTab?.id || null
        averageLifetime = state.tabs.reduce((sum, tab) => sum + (now - tab.createdAt), 0) / totalTabs
        memoryUsage = state.tabs.reduce((sum, tab) =>
          sum + (TabUtils.calculateMemoryUsage ? TabUtils.calculateMemoryUsage(tab) : 0), 0
        )
      }
      return {
        totalTabs,
        temporaryTabs,
        mostActiveTabId,
        averageLifetime,
        memoryUsage
      }
    }),

    // 是否已达到最大标签数
    isMaxTabsReached: computed((): boolean => {
      return state.tabs.length >= state.maxTabs
    }),

    // 标签页索引映射
    tabIndexMap: computed((): Map<string, number> => {
      const map = new Map<string, number>()
      state.tabs.forEach((tab, index) => {
        map.set(tab.id, index)
      })
      return map
    })
  }

  /**
   * 私有工具函数
   */
  const utils = {
    /**
     * 记录事件
     */
    recordEvent(type: TabOperation, data: Partial<TabEvent> = {}) {
      const event: TabEvent = {
        type,
        timestamp: Date.now(),
        ...data
      }
      
      eventHistory.value.push(event)
      
      // 限制历史记录大小
      if (eventHistory.value.length > maxHistorySize) {
        eventHistory.value.shift()
      }
    },

    /**
     * 添加错误
     */
    addError(error: TabValidationError) {
      errors.value.push(error)
      console.warn('[TabState] Validation Error:', error)
    },

    /**
     * 清除错误
     */
    clearErrors() {
      errors.value.length = 0
    },

    /**
     * 验证标签页
     */
    validateTab(tab: Partial<TabItem>): TabValidationError | null {
      if (!tab.title?.trim()) {
        return {
          type: 'missing_title',
          message: 'Tab title is required',
          tab
        }
      }

      if (!tab.route?.trim()) {
        return {
          type: 'invalid_route',
          message: 'Tab route is required',
          tab
        }
      }

      // 检查重复标签
      const existingTab = state.tabs.find(existing => 
        TabUtils.isEqual(existing, tab as TabItem)
      )
      
      if (existingTab) {
        return {
          type: 'duplicate',
          message: 'Tab with same route and parameters already exists',
          tab
        }
      }

      return null
    },

    /**
     * 获取移除候选标签
     */
    getRemovalCandidate(strategy: TabRemovalStrategy): TabItem | null {
      const candidateTabs = computedProps.closableTabs.value
      
      if (candidateTabs.length === 0) {
        return null
      }

      switch (strategy) {
        case 'lru':
          // 最近最少使用
          return candidateTabs.reduce((oldest, current) => 
            current.lastAccessed < oldest.lastAccessed ? current : oldest
          )
        
        case 'oldest':
          // 最老的标签
          return candidateTabs.reduce((oldest, current) => 
            current.createdAt < oldest.createdAt ? current : oldest
          )
        
        case 'temporary':
          // 临时标签优先
          const temporaryCandidate = candidateTabs.find(tab => tab.temporary)
          return temporaryCandidate || candidateTabs[candidateTabs.length - 1]
        
        case 'manual':
          // 手动模式，返回null让用户选择
          return null
        
        default:
          return candidateTabs[0]
      }
    },

    /**
     * 执行钩子函数
     */
    async executeHook<T extends keyof TabHooks>(
      hookName: T,
      ...args: Parameters<NonNullable<TabHooks[T]>>
    ): Promise<any> {
      const hook = hooks.value[hookName]
      if (typeof hook === 'function') {
        try {
          return await (hook as Function)(...args)
        } catch (error) {
          console.error(`[TabState] Hook ${hookName} error:`, error)
          return hookName.startsWith('before') ? false : undefined
        }
      }
      return hookName.startsWith('before') ? true : undefined
    }
  }

  /**
   * 核心操作方法
   */
  const methods = {
    /**
     * 添加标签页
     */
    async addTab(tabData: Partial<TabItem>, activate = true): Promise<TabItem | null> {
      utils.clearErrors()
      try {
        isLoading.value = true
        // 验证输入
        const validationError = utils.validateTab(tabData)
        if (validationError) {
          utils.addError(validationError)
          return null
        }
        // 创建完整的标签页对象
        let newTab = createDefaultTab(tabData)
        // 执行创建前钩子
        const hookResult = await utils.executeHook('beforeCreate', newTab)
        if (hookResult === null) {
          return null
        }
        if (hookResult && TabUtils.isValidTab(hookResult)) {
          newTab = hookResult
        }
        // 检查是否需要移除旧标签（循环直到未超限）
        while (state.tabs.length >= state.maxTabs) {
          const candidate = utils.getRemovalCandidate(finalConfig.removalStrategy)
          if (candidate) {
            await methods.removeTab(candidate.id)
          } else if (finalConfig.removalStrategy === 'manual') {
            utils.addError({
              type: 'max_tabs_exceeded',
              message: `Maximum ${state.maxTabs} tabs reached. Please close some tabs manually.`,
              tab: newTab
            })
            return null
          } else {
            break
          }
        }
        // 添加到状态
        state.tabs.push(newTab)
        // 激活新标签
        if (activate) {
          await methods.activateTab(newTab.id)
        }
        // 记录事件
        utils.recordEvent('add', { tab: newTab })
        // 执行创建后钩子
        await utils.executeHook('afterCreate', newTab)
        return newTab
      } finally {
        isLoading.value = false
      }
    },

    /**
     * 移除标签页
     */
    async removeTab(tabId: string): Promise<boolean> {
      const tabIndex = computedProps.tabIndexMap.value.get(tabId)
      if (tabIndex === undefined) {
        return false
      }

      const tab = state.tabs[tabIndex]
      
      // 执行移除前钩子
      const canRemove = await utils.executeHook('beforeRemove', tab)
      if (canRemove === false) {
        return false
      }

      // 如果移除的是当前激活标签，需要激活其他标签
      const wasActive = state.activeTabId === tabId
      let newActiveTab: TabItem | null = null

      if (wasActive && state.tabs.length > 1) {
        // 选择新的激活标签（相邻标签）
        const nextIndex = tabIndex < state.tabs.length - 1 ? tabIndex + 1 : tabIndex - 1
        newActiveTab = state.tabs[nextIndex]
      }

      // 从状态中移除
      state.tabs.splice(tabIndex, 1)

      // 更新激活标签
      if (wasActive) {
        state.activeTabId = newActiveTab?.id || null
      }

      // 记录事件
      utils.recordEvent('remove', { 
        tab,
        oldActiveId: wasActive ? tabId : state.activeTabId,
        newActiveId: state.activeTabId
      })

      // 执行移除后钩子
      await utils.executeHook('afterRemove', tab)

      return true
    },

    /**
     * 激活标签页
     */
    async activateTab(tabId: string): Promise<boolean> {
      const tab = state.tabs.find(t => t.id === tabId)
      if (!tab) {
        return false
      }
      const oldTab = computedProps.activeTab.value
      const oldActiveId = state.activeTabId
      const canActivate = await utils.executeHook('beforeActivate', tab, oldTab || undefined)
      if (canActivate === false) {
        // 阻止激活时，保持原activeTabId（不变）
        return false
      }
      state.activeTabId = tabId
      tab.lastAccessed = Date.now()
      utils.recordEvent('activate', {
        tab,
        oldActiveId,
        newActiveId: tabId
      })
      await utils.executeHook('afterActivate', tab, oldTab || undefined)
      return true
    },

    /**
     * 更新标签页
     */
    async updateTab(tabId: string, updates: Partial<TabItem>): Promise<boolean> {
      const tabIndex = computedProps.tabIndexMap.value.get(tabId)
      if (tabIndex === undefined) {
        return false
      }
      const tab = state.tabs[tabIndex]
      // 合并更新
      const updatedTab = { ...tab, ...updates }
      // 只校验id存在即可，允许部分字段为空
      if (!updatedTab.id) {
        utils.addError({ type: 'invalid_route', message: 'Tab id is required', tab: updatedTab })
        return false
      }
      state.tabs[tabIndex] = updatedTab
      utils.recordEvent('update', { tab: updatedTab })
      await utils.executeHook('afterUpdate', updatedTab, tab)
      return true
    },

    /**
     * 重新排序标签页
     */
    reorderTabs(newOrder: string[]): boolean {
      if (newOrder.length !== state.tabs.length) {
        return false
      }

      const reorderedTabs: TabItem[] = []
      const tabMap = new Map(state.tabs.map(tab => [tab.id, tab]))

      for (const tabId of newOrder) {
        const tab = tabMap.get(tabId)
        if (!tab) {
          return false
        }
        reorderedTabs.push(tab)
      }

      // 更新状态
      state.tabs.splice(0, state.tabs.length, ...reorderedTabs)

      // 记录事件
      utils.recordEvent('reorder', { tabs: reorderedTabs })

      return true
    },

    /**
     * 清除所有标签页
     */
    async clearAllTabs(): Promise<void> {
      state.tabs.splice(0, state.tabs.length)
      state.activeTabId = null
      utils.recordEvent('clear')
    },

    /**
     * 清理过期标签页
     */
    async cleanupExpiredTabs(): Promise<number> {
      if (!finalConfig.autoCleanup) {
        return 0
      }

      const expiredTabs = state.tabs.filter(tab => 
        TabUtils.isExpired(tab, finalConfig.tabExpireTime)
      )

      let removedCount = 0
      for (const tab of expiredTabs) {
        if (await methods.removeTab(tab.id)) {
          removedCount++
        }
      }

      return removedCount
    },

    /**
     * 获取标签页通过路由
     */
    getTabByRoute(route: string, params?: Record<string, any>, query?: Record<string, any>): TabItem | null {
      return state.tabs.find(tab => 
        tab.route === route &&
        JSON.stringify(tab.params || {}) === JSON.stringify(params || {}) &&
        JSON.stringify(tab.query || {}) === JSON.stringify(query || {})
      ) || null
    },

    /**
     * 检查标签页是否存在
     */
    hasTab(tabId: string): boolean {
      return computedProps.tabIndexMap.value.has(tabId)
    },

    /**
     * 获取下一个标签页ID
     */
    getNextTabId(tabId: string): string | null {
      const currentIndex = computedProps.tabIndexMap.value.get(tabId)
      if (currentIndex === undefined) {
        return null
      }

      const nextIndex = currentIndex + 1
      return nextIndex < state.tabs.length ? state.tabs[nextIndex].id : null
    },

    /**
     * 获取上一个标签页ID
     */
    getPreviousTabId(tabId: string): string | null {
      const currentIndex = computedProps.tabIndexMap.value.get(tabId)
      if (currentIndex === undefined) {
        return null
      }

      const prevIndex = currentIndex - 1
      return prevIndex >= 0 ? state.tabs[prevIndex].id : null
    },

    /**
     * 设置钩子函数
     */
    setHooks(newHooks: Partial<TabHooks>): void {
      hooks.value = { ...hooks.value, ...newHooks }
    },

    /**
     * 更新配置
     */
    updateConfig(newConfig: Partial<TabConfig>): void {
      Object.assign(finalConfig, newConfig)
      state.maxTabs = finalConfig.maxTabs
      state.autoCleanup = finalConfig.autoCleanup
    },

    /**
     * 启用持久化存储
     * 
     * @param persistenceOptions 持久化配置选项
     * @returns 返回停止持久化同步的函数
     */
    enablePersistence(persistenceOptions: TabPersistenceOptions = {}): () => void {
      // 创建持久化实例
      const persistence = useTabPersistence({
        storageKey: 'hyq-mes-tabs-v2',
        version: '2.0.0',
        autoSync: true,
        expireTime: 7 * 24 * 60 * 60 * 1000, // 7天
        ...persistenceOptions
      });

      // 创建状态引用（用于与持久化层同步）
      const tabsRef = computed({
        get: () => state.tabs,
        set: (newTabs) => {
          state.tabs.splice(0, state.tabs.length, ...newTabs);
        }
      });

      const activeTabIdRef = computed({
        get: () => state.activeTabId,
        set: (newActiveTabId) => {
          state.activeTabId = newActiveTabId;
        }
      });

      // 启动同步器
      const stopSync = persistence.createSynchronizer(tabsRef as any, activeTabIdRef as any);

      return stopSync;
    }
  }

  // 自动清理定时器
  if (finalConfig.autoCleanup && finalConfig.cleanupInterval > 0) {
    setInterval(() => {
      methods.cleanupExpiredTabs()
    }, finalConfig.cleanupInterval)
  }

  // 返回公共API
  return {
    // 只读状态
    state: readonly(state),
    config: readonly(finalConfig),
    // 计算属性（getter，始终返回最新值）
    get activeTab() { return computedProps.activeTab.value },
    get closableTabs() { return computedProps.closableTabs.value },
    get temporaryTabs() { return computedProps.temporaryTabs.value },
    get stats() { return computedProps.stats.value },
    get isMaxTabsReached() { return computedProps.isMaxTabsReached.value },
    get tabIndexMap() { return computedProps.tabIndexMap.value },
    // 错误和加载状态
    get errors() { return errors.value },
    isLoading: readonly(isLoading),
    eventHistory: readonly(eventHistory),
    // 操作方法
    ...methods,
    // 工具方法
    utils: {
      generateId: TabUtils.generateId,
      isValidTab: TabUtils.isValidTab,
      isEqual: TabUtils.isEqual,
      formatTitle: TabUtils.formatTitle,
      createDefaultTab,
      calculateMemoryUsage: TabUtils.calculateMemoryUsage
    }
  }
}

/**
 * 标签页状态管理Hook
 */
export function useTabState(config: Partial<TabConfig> = {}) {
  // 使用单例模式确保全局状态一致性
  if (!globalTabStateInstance) {
    globalTabStateInstance = createTabState(config)
  } else if (Object.keys(config).length > 0) {
    // 如果传入新配置，更新现有实例
    globalTabStateInstance.updateConfig(config)
  }
  
  return globalTabStateInstance
}

// 导出类型以供其他模块使用
export type TabStateInstance = ReturnType<typeof useTabState>