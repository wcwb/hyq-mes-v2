import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useIntersectionObserver, useIdle } from '@vueuse/core';

/**
 * 渐进式Tab加载策略配置
 */
export interface ProgressiveLoadingConfig {
  /** 是否启用渐进式加载 */
  enabled?: boolean;
  /** 视口检测的根边距 */
  rootMargin?: string;
  /** 交叉比例阈值 */
  threshold?: number;
  /** 空闲时间阈值（毫秒） */
  idleThreshold?: number;
  /** 预加载的标签页数量 */
  preloadCount?: number;
  /** 是否基于网络状态调整策略 */
  adaptiveNetworkStrategy?: boolean;
  /** 低优先级加载延迟（毫秒） */
  lowPriorityDelay?: number;
}

/**
 * 加载优先级类型
 */
export type LoadingPriority = 'immediate' | 'high' | 'normal' | 'low' | 'idle';

/**
 * Tab加载状态
 */
export interface TabLoadingState {
  id: string;
  priority: LoadingPriority;
  isVisible: boolean;
  isLoaded: boolean;
  isLoading: boolean;
  loadStartTime?: number;
  loadEndTime?: number;
  error?: Error;
}

/**
 * 网络状态信息
 */
interface NetworkInfo {
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g' | undefined;
  downlink: number;
  rtt: number;
}

/**
 * 渐进式Tab加载composable
 */
export function useProgressiveTabLoading(config: ProgressiveLoadingConfig = {}) {
  // 默认配置
  const defaultConfig: Required<ProgressiveLoadingConfig> = {
    enabled: true,
    rootMargin: '50px',
    threshold: 0.1,
    idleThreshold: 1000,
    preloadCount: 2,
    adaptiveNetworkStrategy: true,
    lowPriorityDelay: 500,
  };

  const finalConfig = { ...defaultConfig, ...config };

  // 响应式状态
  const tabStates = ref<Map<string, TabLoadingState>>(new Map());
  const loadingQueue = ref<string[]>([]);
  const isProcessingQueue = ref(false);
  const networkInfo = ref<NetworkInfo>({
    effectiveType: undefined,
    downlink: 0,
    rtt: 0,
  });

  // 用户空闲状态检测
  const { idle } = useIdle(finalConfig.idleThreshold);

  // 性能监控
  const performanceMetrics = ref({
    totalLoaded: 0,
    averageLoadTime: 0,
    fastestLoad: Infinity,
    slowestLoad: 0,
    networkOptimizationEnabled: false,
  });

  /**
   * 获取网络信息
   */
  const getNetworkInfo = (): NetworkInfo => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink || 0,
        rtt: connection?.rtt || 0,
      };
    }
    return { effectiveType: undefined, downlink: 0, rtt: 0 };
  };

  /**
   * 基于网络状态调整加载策略
   */
  const adjustLoadingStrategy = (): LoadingPriority => {
    if (!finalConfig.adaptiveNetworkStrategy) return 'normal';

    const network = networkInfo.value;
    
    // 网络状况差时降低优先级
    if (network.effectiveType === 'slow-2g' || network.effectiveType === '2g') {
      return 'low';
    }
    
    if (network.effectiveType === '3g' || network.downlink < 1.5) {
      return 'normal';
    }
    
    // 网络状况好时可以提高优先级
    if (network.effectiveType === '4g' && network.downlink > 5) {
      return 'high';
    }
    
    return 'normal';
  };

  /**
   * 计算Tab加载优先级
   */
  const calculatePriority = (
    tabId: string,
    isActive: boolean,
    isVisible: boolean,
    userInteraction: boolean = false
  ): LoadingPriority => {
    // 活动Tab具有最高优先级
    if (isActive) return 'immediate';
    
    // 用户交互触发的Tab具有高优先级
    if (userInteraction) return 'high';
    
    // 可见Tab具有普通优先级
    if (isVisible) return adjustLoadingStrategy();
    
    // 用户空闲时可以进行低优先级加载
    if (idle.value) return 'low';
    
    return 'idle';
  };

  /**
   * 注册Tab进行渐进式加载
   */
  const registerTab = (
    tabId: string,
    element: HTMLElement,
    isActive: boolean = false,
    immediate: boolean = false
  ) => {
    if (!finalConfig.enabled) return;

    const initialState: TabLoadingState = {
      id: tabId,
      priority: immediate || isActive ? 'immediate' : 'idle',
      isVisible: false,
      isLoaded: false,
      isLoading: false,
    };

    tabStates.value.set(tabId, initialState);

    // 立即加载的Tab
    if (immediate || isActive) {
      loadTab(tabId, 'immediate');
      return;
    }

    // 设置视口交叉观察器
    const { stop } = useIntersectionObserver(
      element,
      ([{ isIntersecting }]) => {
        const state = tabStates.value.get(tabId);
        if (!state) return;

        const updatedState = {
          ...state,
          isVisible: isIntersecting,
          priority: calculatePriority(tabId, false, isIntersecting),
        };

        tabStates.value.set(tabId, updatedState);

        if (isIntersecting && !state.isLoaded && !state.isLoading) {
          queueForLoading(tabId, updatedState.priority);
        }
      },
      {
        rootMargin: finalConfig.rootMargin,
        threshold: finalConfig.threshold,
      }
    );

    // 组件卸载时停止观察
    return stop;
  };

  /**
   * 将Tab加入加载队列
   */
  const queueForLoading = (tabId: string, priority: LoadingPriority) => {
    if (loadingQueue.value.includes(tabId)) return;

    // 根据优先级插入到队列中的正确位置
    const priorityOrder: LoadingPriority[] = ['immediate', 'high', 'normal', 'low', 'idle'];
    const tabPriorityIndex = priorityOrder.indexOf(priority);
    
    let insertIndex = loadingQueue.value.length;
    for (let i = 0; i < loadingQueue.value.length; i++) {
      const queuedTabId = loadingQueue.value[i];
      const queuedTab = tabStates.value.get(queuedTabId);
      if (queuedTab) {
        const queuedPriorityIndex = priorityOrder.indexOf(queuedTab.priority);
        if (tabPriorityIndex < queuedPriorityIndex) {
          insertIndex = i;
          break;
        }
      }
    }

    loadingQueue.value.splice(insertIndex, 0, tabId);
    processLoadingQueue();
  };

  /**
   * 处理加载队列
   */
  const processLoadingQueue = async () => {
    if (isProcessingQueue.value || loadingQueue.value.length === 0) return;

    isProcessingQueue.value = true;

    while (loadingQueue.value.length > 0) {
      const tabId = loadingQueue.value.shift();
      if (!tabId) break;

      const state = tabStates.value.get(tabId);
      if (!state || state.isLoaded || state.isLoading) continue;

      // 根据优先级添加延迟
      if (state.priority === 'low' || state.priority === 'idle') {
        await new Promise(resolve => setTimeout(resolve, finalConfig.lowPriorityDelay));
      }

      await loadTab(tabId, state.priority);
    }

    isProcessingQueue.value = false;
  };

  /**
   * 加载单个Tab
   */
  const loadTab = async (tabId: string, priority: LoadingPriority): Promise<void> => {
    const state = tabStates.value.get(tabId);
    if (!state || state.isLoaded || state.isLoading) return;

    // 更新加载状态
    const loadingState = {
      ...state,
      isLoading: true,
      loadStartTime: performance.now(),
    };
    tabStates.value.set(tabId, loadingState);

    try {
      // 模拟资源加载过程
      await simulateTabLoading(tabId, priority);

      // 加载完成
      const loadEndTime = performance.now();
      const loadTime = loadEndTime - (loadingState.loadStartTime || 0);

      const completedState = {
        ...loadingState,
        isLoaded: true,
        isLoading: false,
        loadEndTime,
      };
      tabStates.value.set(tabId, completedState);

      // 更新性能指标
      updatePerformanceMetrics(loadTime);

    } catch (error) {
      // 加载失败
      const errorState = {
        ...loadingState,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Unknown loading error'),
      };
      tabStates.value.set(tabId, errorState);
      console.error(`Failed to load tab ${tabId}:`, error);
    }
  };

  /**
   * 模拟Tab加载过程
   */
  const simulateTabLoading = async (tabId: string, priority: LoadingPriority): Promise<void> => {
    // 根据网络状况和优先级调整加载时间
    const network = networkInfo.value;
    let baseDelay = 100;

    switch (network.effectiveType) {
      case 'slow-2g':
        baseDelay = 800;
        break;
      case '2g':
        baseDelay = 500;
        break;
      case '3g':
        baseDelay = 200;
        break;
      case '4g':
        baseDelay = 50;
        break;
      default:
        baseDelay = 100;
    }

    // 优先级影响加载速度
    const priorityMultiplier = {
      immediate: 0.5,
      high: 0.7,
      normal: 1.0,
      low: 1.5,
      idle: 2.0,
    };

    const actualDelay = baseDelay * priorityMultiplier[priority];
    await new Promise(resolve => setTimeout(resolve, actualDelay));
  };

  /**
   * 更新性能指标
   */
  const updatePerformanceMetrics = (loadTime: number) => {
    const metrics = performanceMetrics.value;
    metrics.totalLoaded++;
    
    // 计算平均加载时间
    metrics.averageLoadTime = 
      (metrics.averageLoadTime * (metrics.totalLoaded - 1) + loadTime) / metrics.totalLoaded;
    
    // 更新最快和最慢加载时间
    metrics.fastestLoad = Math.min(metrics.fastestLoad, loadTime);
    metrics.slowestLoad = Math.max(metrics.slowestLoad, loadTime);
  };

  /**
   * 强制加载Tab
   */
  const forceLoadTab = (tabId: string) => {
    loadTab(tabId, 'immediate');
  };

  /**
   * 预加载相邻的Tab
   */
  const preloadAdjacentTabs = (currentTabId: string, allTabIds: string[]) => {
    const currentIndex = allTabIds.indexOf(currentTabId);
    if (currentIndex === -1) return;

    const toPreload = [];
    
    // 预加载前后的Tab
    for (let i = 1; i <= finalConfig.preloadCount; i++) {
      if (currentIndex - i >= 0) {
        toPreload.push(allTabIds[currentIndex - i]);
      }
      if (currentIndex + i < allTabIds.length) {
        toPreload.push(allTabIds[currentIndex + i]);
      }
    }

    toPreload.forEach(tabId => {
      const state = tabStates.value.get(tabId);
      if (state && !state.isLoaded && !state.isLoading) {
        queueForLoading(tabId, 'low');
      }
    });
  };

  /**
   * 获取Tab状态
   */
  const getTabState = (tabId: string): TabLoadingState | undefined => {
    return tabStates.value.get(tabId);
  };

  /**
   * 获取所有Tab状态
   */
  const getAllTabStates = computed(() => {
    return Array.from(tabStates.value.values());
  });

  /**
   * 获取加载统计信息
   */
  const getLoadingStats = computed(() => {
    const states = Array.from(tabStates.value.values());
    return {
      total: states.length,
      loaded: states.filter(s => s.isLoaded).length,
      loading: states.filter(s => s.isLoading).length,
      failed: states.filter(s => s.error).length,
      queueLength: loadingQueue.value.length,
      performance: performanceMetrics.value,
    };
  });

  // 初始化
  onMounted(() => {
    networkInfo.value = getNetworkInfo();
    
    // 监听网络状态变化
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        const updateNetworkInfo = () => {
          networkInfo.value = getNetworkInfo();
        };
        connection.addEventListener('change', updateNetworkInfo);
        
        onUnmounted(() => {
          connection.removeEventListener('change', updateNetworkInfo);
        });
      }
    }
  });

  return {
    // 状态
    tabStates: computed(() => tabStates.value),
    loadingQueue: computed(() => loadingQueue.value),
    networkInfo: computed(() => networkInfo.value),
    isProcessingQueue: computed(() => isProcessingQueue.value),
    
    // 统计信息
    loadingStats: getLoadingStats,
    allTabStates: getAllTabStates,
    
    // 方法
    registerTab,
    forceLoadTab,
    preloadAdjacentTabs,
    getTabState,
    calculatePriority,
    
    // 配置
    config: finalConfig,
  };
}

/**
 * 导出类型定义
 */
export type { TabLoadingState, LoadingPriority, ProgressiveLoadingConfig };