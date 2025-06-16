/**
 * Tab Persistence Layer Composable
 * 标签页持久化层组合式函数
 * 
 * 提供标签页状态的持久化存储和同步功能
 * 使用 @vueuse/core 的 useLocalStorage 进行数据持久化
 */

import { ref, watch, computed, nextTick, readonly, type Ref } from 'vue';
import { useLocalStorage, type RemovableRef } from '@vueuse/core';
import type { TabItem } from '@/types/tab';

/**
 * 持久化的标签页状态接口
 */
export interface PersistedTabState {
  /** 标签页列表 */
  tabs: TabItem[];
  /** 激活的标签页ID */
  activeTabId: string | null;
  /** 状态保存时间戳 */
  timestamp: number;
  /** 状态版本号，用于数据迁移 */
  version: string;
}

/**
 * 持久化配置选项
 */
export interface TabPersistenceOptions {
  /** localStorage存储键名 */
  storageKey?: string;
  /** 状态版本号 */
  version?: string;
  /** 是否启用自动同步 */
  autoSync?: boolean;
  /** 数据过期时间（毫秒），0表示永不过期 */
  expireTime?: number;
  /** 是否过滤无效标签页 */
  filterInvalidTabs?: boolean;
  /** 无效标签页过滤函数 */
  tabFilter?: (tab: TabItem) => boolean;
  /** 错误处理回调 */
  onError?: (error: Error, operation: string) => void;
}

/**
 * 默认配置
 */
const DEFAULT_OPTIONS: Required<TabPersistenceOptions> = {
  storageKey: 'hyq-mes-tab-state',
  version: '1.0.0',
  autoSync: true,
  expireTime: 7 * 24 * 60 * 60 * 1000, // 7天
  filterInvalidTabs: true,
  tabFilter: (tab: TabItem) => {
    // 默认过滤掉认证相关和欢迎页面
    const invalidPaths = ['/login', '/auth/', '/', '/welcome'];
    return !invalidPaths.some(path => tab.route?.includes(path));
  },
  onError: (error: Error, operation: string) => {
    console.warn(`[TabPersistence] ${operation} 操作失败:`, error);
  }
};

/**
 * 创建空的持久化状态
 */
function createEmptyState(version: string): PersistedTabState {
  return {
    tabs: [],
    activeTabId: null,
    timestamp: Date.now(),
    version
  };
}

/**
 * 验证持久化状态的有效性
 */
function validatePersistedState(
  state: any, 
  options: Required<TabPersistenceOptions>
): state is PersistedTabState {
  // 基本类型检查
  if (!state || typeof state !== 'object') {
    return false;
  }

  // 检查必需字段
  if (!Array.isArray(state.tabs) || typeof state.timestamp !== 'number') {
    return false;
  }

  // 检查版本兼容性（这里简单检查，可以扩展为复杂的版本迁移逻辑）
  if (state.version && state.version !== options.version) {
    console.info(`[TabPersistence] 检测到版本变化: ${state.version} -> ${options.version}`);
    // 可以在这里添加数据迁移逻辑
  }

  // 检查过期时间
  if (options.expireTime > 0) {
    const now = Date.now();
    const age = now - state.timestamp;
    if (age > options.expireTime) {
      console.info(`[TabPersistence] 数据已过期，清除缓存: 存储时间 ${new Date(state.timestamp).toLocaleString()}`);
      return false;
    }
  }

  return true;
}

/**
 * 过滤和清理标签页数据
 */
function filterTabs(tabs: TabItem[], options: Required<TabPersistenceOptions>): TabItem[] {
  if (!options.filterInvalidTabs) {
    return tabs;
  }

  return tabs.filter(tab => {
    // 基本字段验证
    if (!tab.id || !tab.title || !tab.route) {
      return false;
    }

    // 应用自定义过滤器
    return options.tabFilter(tab);
  });
}

/**
 * 标签页持久化Hook
 */
export function useTabPersistence(options: TabPersistenceOptions = {}) {
  // 合并配置
  const config = { ...DEFAULT_OPTIONS, ...options };

  // 错误处理辅助函数
  const handleError = (error: Error, operation: string) => {
    try {
      config.onError(error, operation);
    } catch (e) {
      console.error('[TabPersistence] 错误处理器本身出现错误:', e);
    }
  };

  // 使用 @vueuse/core 的 useLocalStorage 进行持久化
  const persistedState: RemovableRef<PersistedTabState> = useLocalStorage(
    config.storageKey,
    createEmptyState(config.version),
    {
      serializer: {
        read: (value: string) => {
          try {
            const parsed = JSON.parse(value);
            if (validatePersistedState(parsed, config)) {
              return {
                ...parsed,
                tabs: filterTabs(parsed.tabs, config)
              };
            } else {
              console.info('[TabPersistence] 无效或过期的持久化数据，使用默认状态');
              return createEmptyState(config.version);
            }
          } catch (error) {
            handleError(error as Error, 'read');
            return createEmptyState(config.version);
          }
        },
        write: (value: PersistedTabState) => {
          try {
            return JSON.stringify({
              ...value,
              timestamp: Date.now(),
              version: config.version
            });
          } catch (error) {
            handleError(error as Error, 'write');
            return JSON.stringify(createEmptyState(config.version));
          }
        }
      }
    }
  );

  // 内部状态管理
  const isLoading = ref(false);
  const lastSyncTime = ref<number>(0);
  const syncErrors = ref<Array<{ error: Error; timestamp: number }>>([]);

  // 计算属性
  const hasValidData = computed(() => {
    return persistedState.value.tabs.length > 0;
  });

  const isExpired = computed(() => {
    if (config.expireTime <= 0) return false;
    const age = Date.now() - persistedState.value.timestamp;
    return age > config.expireTime;
  });

  /**
   * 保存标签页状态
   */
  const saveState = async (tabs: TabItem[], activeTabId: string | null): Promise<boolean> => {
    try {
      isLoading.value = true;
      
      // 过滤标签页
      const filteredTabs = filterTabs(tabs, config);
      
      // 更新持久化状态
      persistedState.value = {
        tabs: filteredTabs,
        activeTabId,
        timestamp: Date.now(),
        version: config.version
      };

      lastSyncTime.value = Date.now();
      
      // 清理成功，移除可能的错误记录
      syncErrors.value = syncErrors.value.filter(e => Date.now() - e.timestamp > 60000); // 保留1分钟内的错误
      
      return true;
    } catch (error) {
      const err = error as Error;
      handleError(err, 'save');
      syncErrors.value.push({ error: err, timestamp: Date.now() });
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 加载标签页状态
   */
  const loadState = async (): Promise<{ tabs: TabItem[]; activeTabId: string | null } | null> => {
    try {
      isLoading.value = true;

      if (!hasValidData.value || isExpired.value) {
        return null;
      }

      const state = persistedState.value;
      return {
        tabs: [...state.tabs], // 深拷贝避免引用问题
        activeTabId: state.activeTabId
      };
    } catch (error) {
      handleError(error as Error, 'load');
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 清除持久化数据
   */
  const clearState = async (): Promise<boolean> => {
    try {
      isLoading.value = true;
      persistedState.value = createEmptyState(config.version);
      lastSyncTime.value = Date.now();
      return true;
    } catch (error) {
      handleError(error as Error, 'clear');
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 检查存储状态
   */
  const getStorageInfo = () => {
    return {
      storageKey: config.storageKey,
      version: config.version,
      hasData: hasValidData.value,
      isExpired: isExpired.value,
      timestamp: persistedState.value.timestamp,
      tabCount: persistedState.value.tabs.length,
      lastSyncTime: lastSyncTime.value,
      errorCount: syncErrors.value.length,
      size: JSON.stringify(persistedState.value).length
    };
  };

  /**
   * 创建状态同步器
   * 
   * @param tabsRef 外部标签页状态引用
   * @param activeTabIdRef 外部激活标签页ID引用
   * @returns 返回停止同步的函数
   */
  const createSynchronizer = (
    tabsRef: Ref<TabItem[]>,
    activeTabIdRef: Ref<string | null>
  ) => {
    if (!config.autoSync) {
      return () => {}; // 返回空的停止函数
    }

    // 监听外部状态变化，自动保存
    const stopWatcher = watch(
      [tabsRef, activeTabIdRef],
      async ([newTabs, newActiveTabId]) => {
        await nextTick(); // 确保状态变化完成
        await saveState(newTabs, newActiveTabId);
      },
      { deep: true, flush: 'post' }
    );

    // 初始化时加载状态
    nextTick(async () => {
      const loadedState = await loadState();
      if (loadedState) {
        // 如果有有效的持久化数据，且当前状态为空，则加载持久化数据
        if (tabsRef.value.length === 0) {
          tabsRef.value.splice(0, tabsRef.value.length, ...loadedState.tabs);
          activeTabIdRef.value = loadedState.activeTabId;
        }
      }
    });

    return stopWatcher;
  };

  return {
    // 状态
    isLoading: readonly(isLoading),
    hasValidData,
    isExpired,
    lastSyncTime: readonly(lastSyncTime),
    syncErrors: readonly(syncErrors),

    // 核心方法
    saveState,
    loadState,
    clearState,
    
    // 同步器
    createSynchronizer,
    
    // 工具方法
    getStorageInfo,
    
    // 配置信息
    config: readonly(config)
  };
}

/**
 * 全局持久化实例（单例模式）
 */
let globalPersistenceInstance: ReturnType<typeof useTabPersistence> | null = null;

/**
 * 获取全局标签页持久化实例
 */
export function useGlobalTabPersistence(options: TabPersistenceOptions = {}) {
  if (!globalPersistenceInstance) {
    globalPersistenceInstance = useTabPersistence(options);
  }
  return globalPersistenceInstance;
} 