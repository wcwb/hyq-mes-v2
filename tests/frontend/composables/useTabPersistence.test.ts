/**
 * Tab Persistence Tests
 * 标签页持久化测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ref, nextTick } from 'vue';
import { useTabPersistence, type TabPersistenceOptions } from '@/composables/useTabPersistence';
import type { TabItem } from '@/types/tab';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null)
  };
})();

// Mock @vueuse/core
vi.mock('@vueuse/core', () => ({
  useLocalStorage: vi.fn((key: string, defaultValue: any, options?: any) => {
    const storageRef = ref(defaultValue);
    
    // 模拟序列化器行为
    const serializer = options?.serializer || {
      read: (value: string) => JSON.parse(value),
      write: (value: any) => JSON.stringify(value)
    };
    
    // 初始化时从 localStorage 读取
    const stored = mockLocalStorage.getItem(key);
    if (stored) {
      try {
        storageRef.value = serializer.read(stored);
      } catch (e) {
        // 读取失败，使用默认值
        storageRef.value = defaultValue;
      }
    }
    
    // 创建响应式的setter来触发序列化和存储
    let currentValue = storageRef.value;
    
    const proxyRef = {
      get value() {
        return currentValue;
      },
      set value(newValue) {
        currentValue = newValue;
        try {
          const serialized = serializer.write(newValue);
          mockLocalStorage.setItem(key, serialized);
        } catch (e) {
          console.warn('Failed to save to localStorage:', e);
        }
      }
    };
    
    // 添加移除方法（RemovableRef 特性）
    (proxyRef as any).remove = () => {
      mockLocalStorage.removeItem(key);
      currentValue = defaultValue;
    };
    
    return proxyRef;
  })
}));

describe('useTabPersistence', () => {
  let persistence: ReturnType<typeof useTabPersistence>;
  let testTabs: TabItem[];
  
  beforeEach(() => {
    // 清理 localStorage mock
    mockLocalStorage.clear();
    vi.clearAllMocks();
    
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
    
    // 创建持久化实例
    persistence = useTabPersistence({
      storageKey: 'test-tab-state',
      autoSync: false, // 测试时禁用自动同步
      expireTime: 0 // 禁用过期检查
    });
  });
  
  afterEach(() => {
    mockLocalStorage.clear();
  });

  describe('基本功能', () => {
    it('应该能够保存标签页状态', async () => {
      const result = await persistence.saveState(testTabs, 'tab-1');
      
      expect(result).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('应该能够加载标签页状态', async () => {
      // 先保存状态
      await persistence.saveState(testTabs, 'tab-1');
      
      // 再加载状态
      const loadedState = await persistence.loadState();
      
      expect(loadedState).not.toBeNull();
      expect(loadedState?.tabs).toHaveLength(2);
      expect(loadedState?.activeTabId).toBe('tab-1');
      expect(loadedState?.tabs[0].title).toBe('仪表板');
    });

    it('应该能够清除持久化状态', async () => {
      // 先保存状态
      await persistence.saveState(testTabs, 'tab-1');
      // ✅ 修复：正确访问计算属性的 .value
      expect(persistence.hasValidData.value).toBe(true);
      
      // 清除状态
      const result = await persistence.clearState();
      
      expect(result).toBe(true);
      // ✅ 修复：正确访问计算属性的 .value
      expect(persistence.hasValidData.value).toBe(false);
    });
  });

  describe('数据过滤', () => {
    it('应该过滤掉无效的标签页', async () => {
      const tabsWithInvalid = [
        ...testTabs,
        {
          id: 'tab-login',
          title: '登录',
          route: '/login',
          icon: 'LogIn',
          closable: true,
          lastAccessed: Date.now(),
          createdAt: Date.now(),
          params: {},
          query: {},
          temporary: false,
          status: 'loaded' as const,
          meta: {}
        }
      ];
      
      await persistence.saveState(tabsWithInvalid, 'tab-1');
      const loadedState = await persistence.loadState();
      
      // 登录页面应该被过滤掉
      expect(loadedState?.tabs).toHaveLength(2);
      expect(loadedState?.tabs.find(tab => tab.route === '/login')).toBeUndefined();
    });

    it('应该支持自定义过滤器', async () => {
      const customPersistence = useTabPersistence({
        storageKey: 'test-custom-filter',
        autoSync: false,
        expireTime: 0,
        tabFilter: (tab) => tab.title !== '用户管理' // 过滤掉用户管理标签页
      });
      
      await customPersistence.saveState(testTabs, 'tab-1');
      const loadedState = await customPersistence.loadState();
      
      expect(loadedState?.tabs).toHaveLength(1);
      expect(loadedState?.tabs[0].title).toBe('仪表板');
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的JSON数据', async () => {
      // 直接设置无效的JSON到localStorage
      mockLocalStorage.setItem('test-tab-state', 'invalid-json');
      
      const loadedState = await persistence.loadState();
      
      expect(loadedState).toBeNull();
      // ✅ 修复：正确访问只读 ref 的 .value
      expect(persistence.syncErrors.value.length).toBeGreaterThan(0);
    });

    it('应该处理缺失的必需字段', async () => {
      const invalidTabs = [
        {
          id: 'tab-invalid',
          // title: '缺失标题', // 故意缺失标题
          route: '/invalid',
          lastAccessed: Date.now(),
          createdAt: Date.now()
        }
      ] as TabItem[];
      
      await persistence.saveState(invalidTabs, 'tab-invalid');
      const loadedState = await persistence.loadState();
      
      // 无效标签页应该被过滤掉
      expect(loadedState?.tabs).toHaveLength(0);
    });
  });

  describe('状态同步', () => {
    it('应该能够创建状态同步器', async () => {
      const tabsRef = ref<TabItem[]>([]);
      const activeTabIdRef = ref<string | null>(null);
      
      // 先保存一些测试数据
      await persistence.saveState(testTabs, 'tab-1');
      
      // 创建同步器
      const stopSync = persistence.createSynchronizer(tabsRef, activeTabIdRef);
      
      // 等待初始化加载 - 增加更多等待时间确保异步操作完成
      await nextTick();
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 50)); // 额外等待50ms
      
      // 验证数据已加载到ref中
      expect(tabsRef.value).toHaveLength(2);
      expect(activeTabIdRef.value).toBe('tab-1');
      
      // 清理
      stopSync();
    });
  });

  describe('存储信息', () => {
    it('应该提供准确的存储信息', async () => {
      await persistence.saveState(testTabs, 'tab-1');
      
      const storageInfo = persistence.getStorageInfo();
      
      expect(storageInfo.storageKey).toBe('test-tab-state');
      expect(storageInfo.hasData).toBe(true);
      expect(storageInfo.tabCount).toBe(2);
      expect(storageInfo.size).toBeGreaterThan(0);
      expect(typeof storageInfo.timestamp).toBe('number');
    });
  });

  describe('版本控制', () => {
    it('应该处理版本变化', async () => {
      // 使用旧版本保存数据
      const oldVersionPersistence = useTabPersistence({
        storageKey: 'test-version',
        version: '0.9.0',
        autoSync: false,
        expireTime: 0
      });
      
      await oldVersionPersistence.saveState(testTabs, 'tab-1');
      
      // 使用新版本加载数据
      const newVersionPersistence = useTabPersistence({
        storageKey: 'test-version',
        version: '1.0.0',
        autoSync: false,
        expireTime: 0
      });
      
      const loadedState = await newVersionPersistence.loadState();
      
      // 应该能够正常加载（版本兼容性处理）
      expect(loadedState).not.toBeNull();
      expect(loadedState?.tabs).toHaveLength(2);
    });
  });

  describe('数据过期', () => {
    it('应该正确处理过期数据', async () => {
      const expirablePersistence = useTabPersistence({
        storageKey: 'test-expirable',
        autoSync: false,
        expireTime: 1000 // 1秒过期
      });
      
      // 模拟旧的时间戳
      const oldTimestamp = Date.now() - 2000; // 2秒前
      mockLocalStorage.setItem('test-expirable', JSON.stringify({
        tabs: testTabs,
        activeTabId: 'tab-1',
        timestamp: oldTimestamp,
        version: '1.0.0'
      }));
      
      const loadedState = await expirablePersistence.loadState();
      
      // 过期数据应该返回null
      expect(loadedState).toBeNull();
      // ✅ 修复：正确访问计算属性的 .value
      expect(expirablePersistence.isExpired.value).toBe(true);
    });
  });
}); 