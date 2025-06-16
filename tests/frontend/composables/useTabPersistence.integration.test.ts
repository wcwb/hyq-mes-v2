/**
 * Tab Persistence Integration Tests
 * 标签页持久化集成测试 - 直接测试接口匹配性
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useTabPersistence } from '../../../resources/js/composables/useTabPersistence';
import type { TabItem } from '../../../resources/js/types/tab';

describe('useTabPersistence - 接口集成测试', () => {
  let testTabs: TabItem[];
  
  beforeEach(() => {
    // 创建测试标签页数据
    testTabs = [
      {
        id: 'tab-1',
        title: '仪表板',
        route: '/dashboard',
        icon: 'BarChart3',
        closable: false,
        lastAccessed: Date.now() - 1000,
        createdAt: Date.now() - 5000,
        params: {},
        query: {},
        temporary: false,
        status: 'loaded',
        meta: {}
      },
      {
        id: 'tab-2',
        title: '用户管理',
        route: '/users',
        icon: 'Users',
        closable: true,
        lastAccessed: Date.now() - 500,
        createdAt: Date.now() - 3000,
        params: {},
        query: {},
        temporary: false,
        status: 'loaded',
        meta: {}
      }
    ];
  });

  it('应该能够创建持久化实例并暴露正确的接口', () => {
    const persistence = useTabPersistence({
      storageKey: 'integration-test',
      autoSync: false,
      expireTime: 0
    });

    // ✅ 验证接口存在性和类型
    expect(typeof persistence.saveState).toBe('function');
    expect(typeof persistence.loadState).toBe('function');
    expect(typeof persistence.clearState).toBe('function');
    expect(typeof persistence.createSynchronizer).toBe('function');
    expect(typeof persistence.getStorageInfo).toBe('function');

    // ✅ 验证响应式属性 - 这些是计算属性，需要.value访问
    expect(typeof persistence.hasValidData.value).toBe('boolean');
    expect(typeof persistence.isExpired.value).toBe('boolean');
    expect(Array.isArray(persistence.syncErrors.value)).toBe(true);
    expect(typeof persistence.isLoading.value).toBe('boolean');

    // ✅ 验证配置信息
    expect(persistence.config.storageKey).toBe('integration-test');
    expect(persistence.config.autoSync).toBe(false);
    expect(persistence.config.expireTime).toBe(0);
  });

  it('应该能够调用所有方法而不抛出错误', async () => {
    const persistence = useTabPersistence({
      storageKey: 'method-test',
      autoSync: false,
      expireTime: 0
    });

    // ✅ 直接调用方法并验证返回值类型
    const saveResult = await persistence.saveState(testTabs, 'tab-1');
    const loadResult = await persistence.loadState();
    const clearResult = await persistence.clearState();
    const storageInfo = persistence.getStorageInfo();

    // ✅ 验证返回值类型
    expect(typeof saveResult).toBe('boolean');
    expect(typeof clearResult).toBe('boolean');
    expect(typeof storageInfo).toBe('object');
    expect(storageInfo.storageKey).toBe('method-test');
    
    // ✅ 加载结果可能为null或对象
    expect(loadResult === null || typeof loadResult === 'object').toBe(true);
  });

  it('应该能够创建状态同步器而不抛出错误', () => {
    const persistence = useTabPersistence({
      storageKey: 'sync-test',
      autoSync: false,
      expireTime: 0
    });

    const tabsRef = ref<TabItem[]>([]);
    const activeTabIdRef = ref<string | null>(null);

    // ✅ 同步器创建不应该抛出错误
    let stopSync: () => void;
    expect(() => {
      stopSync = persistence.createSynchronizer(tabsRef, activeTabIdRef);
    }).not.toThrow();

    // ✅ 验证返回的停止函数
    expect(typeof stopSync!).toBe('function');

    // ✅ 停止同步不应该抛出错误
    expect(() => {
      stopSync();
    }).not.toThrow();
  });

  it('应该能够与useTabState的enablePersistence接口兼容', () => {
    // ✅ 模拟useTabState中enablePersistence方法的调用方式
    const persistence = useTabPersistence({
      storageKey: 'hyq-mes-tabs-v2',
      version: '2.0.0',
      autoSync: true,
      expireTime: 7 * 24 * 60 * 60 * 1000, // 7天
    });

    // ✅ 这模拟了useTabState.enablePersistence中的代码
    const mockTabsState: TabItem[] = [];
    const mockActiveTabId: string | null = null;

    // 模拟computed refs（与useTabState中的实现相同）
    const tabsRef = {
      get value() { return mockTabsState; },
      set value(newTabs: TabItem[]) { 
        mockTabsState.splice(0, mockTabsState.length, ...newTabs);
      }
    };

    const activeTabIdRef = {
      get value() { return mockActiveTabId; },
      set value(newActiveTabId: string | null) {
        // mockActiveTabId = newActiveTabId; // 在真实场景中这里会更新状态
      }
    };

    // ✅ 这应该能够正常工作，即使有类型转换
    let stopSync: () => void;
    expect(() => {
      stopSync = persistence.createSynchronizer(tabsRef as any, activeTabIdRef as any);
    }).not.toThrow();

    expect(typeof stopSync!).toBe('function');
  });

  it('应该正确处理配置选项的默认值', () => {
    // ✅ 测试默认配置
    const persistence1 = useTabPersistence();
    expect(persistence1.config.storageKey).toBe('hyq-mes-tab-state');
    expect(persistence1.config.version).toBe('1.0.0');
    expect(persistence1.config.autoSync).toBe(true);

    // ✅ 测试自定义配置
    const persistence2 = useTabPersistence({
      storageKey: 'custom-key',
      version: '2.0.0',
      autoSync: false,
      expireTime: 1000
    });
    
    expect(persistence2.config.storageKey).toBe('custom-key');
    expect(persistence2.config.version).toBe('2.0.0');
    expect(persistence2.config.autoSync).toBe(false);
    expect(persistence2.config.expireTime).toBe(1000);
  });

  it('应该提供一致的存储信息接口', () => {
    const persistence = useTabPersistence({
      storageKey: 'storage-info-test',
      autoSync: false
    });

    const storageInfo = persistence.getStorageInfo();

    // ✅ 验证存储信息结构
    expect(typeof storageInfo.storageKey).toBe('string');
    expect(typeof storageInfo.version).toBe('string');
    expect(typeof storageInfo.hasData).toBe('boolean');
    expect(typeof storageInfo.isExpired).toBe('boolean');
    expect(typeof storageInfo.timestamp).toBe('number');
    expect(typeof storageInfo.tabCount).toBe('number');
    expect(typeof storageInfo.lastSyncTime).toBe('number');
    expect(typeof storageInfo.errorCount).toBe('number');
    expect(typeof storageInfo.size).toBe('number');

    expect(storageInfo.storageKey).toBe('storage-info-test');
  });
}); 