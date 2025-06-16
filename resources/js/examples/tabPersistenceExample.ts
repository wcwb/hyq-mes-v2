/**
 * Tab Persistence Usage Example
 * 标签页持久化使用示例
 * 
 * 此文件演示如何在HYQ MES V2项目中使用标签页持久化功能
 */

import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useTabState } from '@/composables/useTabState';
import { useTabPersistence } from '@/composables/useTabPersistence';
import type { TabItem } from '@/types/tab';

/**
 * 基础持久化使用示例
 */
export function useBasicTabPersistence() {
  const tabState = useTabState({
    maxTabs: 10,
    persistent: true,
    persistentKey: 'hyq-mes-tabs-basic'
  });

  // 启用持久化（推荐方式）
  const stopPersistence = tabState.enablePersistence({
    storageKey: 'hyq-mes-tabs-basic-v2',
    version: '2.0.0',
    expireTime: 7 * 24 * 60 * 60 * 1000, // 7天过期
    autoSync: true
  });

  // 在组件卸载时停止持久化
  onBeforeUnmount(() => {
    stopPersistence();
  });

  return {
    tabState,
    stopPersistence
  };
}

/**
 * 高级持久化使用示例
 * 
 * 展示如何使用自定义过滤器、错误处理等高级功能
 */
export function useAdvancedTabPersistence() {
  const tabState = useTabState();

  // 创建持久化实例（直接使用方式）
  const persistence = useTabPersistence({
    storageKey: 'hyq-mes-tabs-advanced',
    version: '2.0.0',
    autoSync: false, // 手动控制同步
    expireTime: 30 * 24 * 60 * 60 * 1000, // 30天过期
    
    // 自定义标签页过滤器
    tabFilter: (tab: TabItem) => {
      // 过滤掉临时标签页和某些特殊路由
      return !tab.temporary && 
             !tab.route.startsWith('/auth/') &&
             !tab.route.startsWith('/error/');
    }
  });

  // 手动保存状态
  const saveTabState = async () => {
    try {
      const success = await persistence.saveState(
        [...tabState.state.tabs],
        tabState.state.activeTabId
      );
      
      if (success) {
        console.log('✅ 标签页状态保存成功');
      } else {
        console.warn('⚠️ 标签页状态保存失败');
      }
    } catch (error) {
      console.error('❌ 保存标签页状态时出错:', error);
    }
  };

  // 手动加载状态
  const loadTabState = async () => {
    try {
      const state = await persistence.loadState();
      
      if (state && state.tabs.length > 0) {
        // 清除当前标签页
        await tabState.clearAllTabs();
        
        // 恢复保存的标签页
        for (const tab of state.tabs) {
          await tabState.addTab(tab, false);
        }
        
        // 恢复激活状态
        if (state.activeTabId) {
          await tabState.activateTab(state.activeTabId);
        }
        
        console.log(`✅ 成功恢复 ${state.tabs.length} 个标签页`);
      } else {
        console.log('ℹ️ 没有找到需要恢复的标签页状态');
      }
    } catch (error) {
      console.error('❌ 加载标签页状态时出错:', error);
    }
  };

  // 获取存储信息
  const getStorageInfo = () => {
    const info = persistence.getStorageInfo();
    console.log('📊 存储信息:', {
      存储键: info.storageKey,
      有数据: info.hasData ? '是' : '否',
      标签页数量: info.tabCount,
      数据大小: `${(info.size / 1024).toFixed(2)} KB`,
      时间戳: new Date(info.timestamp).toLocaleString()
    });
    return info;
  };

  // 清除存储
  const clearStorage = async () => {
    try {
      const success = await persistence.clearState();
      if (success) {
        console.log('✅ 标签页存储已清除');
      }
    } catch (error) {
      console.error('❌ 清除存储时出错:', error);
    }
  };

  return {
    tabState,
    persistence,
    saveTabState,
    loadTabState,
    getStorageInfo,
    clearStorage
  };
}

/**
 * 自动同步示例
 * 
 * 展示如何设置自动同步，让标签页状态实时保存到localStorage
 */
export function useAutoSyncTabPersistence() {
  const tabState = useTabState();
  let stopSync: (() => void) | null = null;

  // 启动自动同步
  const startAutoSync = () => {
    stopSync = tabState.enablePersistence({
      storageKey: 'hyq-mes-tabs-autosync',
      version: '2.0.0',
      autoSync: true,
      expireTime: 14 * 24 * 60 * 60 * 1000, // 14天过期
    });

    console.log('🔄 标签页自动同步已启动');
  };

  // 停止自动同步
  const stopAutoSync = () => {
    if (stopSync) {
      stopSync();
      stopSync = null;
      console.log('⏸️ 标签页自动同步已停止');
    }
  };

  // 组件挂载时启动，卸载时停止
  onMounted(() => {
    startAutoSync();
  });

  onBeforeUnmount(() => {
    stopAutoSync();
  });

  return {
    tabState,
    startAutoSync,
    stopAutoSync
  };
}

/**
 * 开发调试示例
 * 
 * 展示如何在开发时监控持久化状态和错误
 */
export function useDebugTabPersistence() {
  const tabState = useTabState();
  const persistence = useTabPersistence({
    storageKey: 'hyq-mes-tabs-debug',
    version: '2.0.0-debug',
    autoSync: true
  });

  // 监控同步错误
  const errors = ref(persistence.syncErrors);

  // 监控持久化状态
  const status = ref({
    hasValidData: persistence.hasValidData,
    isExpired: persistence.isExpired,
    lastSync: Date.now()
  });

  // 定期更新状态（仅开发环境）
  let statusInterval: NodeJS.Timeout | null = null;
  
  if (import.meta.env.DEV) {
    statusInterval = setInterval(() => {
      status.value = {
        hasValidData: persistence.hasValidData,
        isExpired: persistence.isExpired,
        lastSync: Date.now()
      };
    }, 5000);
  }

  // 导出调试方法到全局（仅开发环境）
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    (window as any).tabPersistenceDebug = {
      getStorageInfo: () => persistence.getStorageInfo(),
      clearStorage: () => persistence.clearState(),
      getErrors: () => persistence.syncErrors,
      getTabState: () => tabState.state,
      saveState: () => persistence.saveState([...tabState.state.tabs], tabState.state.activeTabId),
      loadState: () => persistence.loadState()
    };
    
    console.log('🐛 调试工具已添加到 window.tabPersistenceDebug');
  }

  // 清理
  onBeforeUnmount(() => {
    if (statusInterval) {
      clearInterval(statusInterval);
    }
  });

  return {
    tabState,
    persistence,
    errors,
    status
  };
}

/**
 * 实际项目使用建议
 */
export const TabPersistenceUsageGuide = {
  /**
   * 推荐的生产环境配置
   */
  productionConfig: {
    storageKey: 'hyq-mes-v2-tabs',
    version: '2.0.0',
    autoSync: true,
    expireTime: 7 * 24 * 60 * 60 * 1000, // 7天
    tabFilter: (tab: TabItem) => {
      // 过滤敏感或临时页面
      const excludedRoutes = ['/login', '/logout', '/error/', '/auth/'];
      return !tab.temporary && 
             !excludedRoutes.some(route => tab.route.startsWith(route));
    }
  },

  /**
   * 开发环境配置
   */
  developmentConfig: {
    storageKey: 'hyq-mes-v2-tabs-dev',
    version: '2.0.0-dev',
    autoSync: true,
    expireTime: 1 * 24 * 60 * 60 * 1000, // 1天（开发时较短）
  },

  /**
   * 最佳实践说明
   */
  bestPractices: [
    '1. 在应用启动时启用持久化',
    '2. 使用自定义过滤器排除敏感页面',
    '3. 设置合理的过期时间',
    '4. 在组件卸载时清理资源',
    '5. 监控和处理持久化错误',
    '6. 开发环境启用调试功能'
  ]
}; 