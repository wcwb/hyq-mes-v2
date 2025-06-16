<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import TabBar, { type TabBarItem } from './TabBar.vue';
import TabContent, { type TabContentItem } from './TabContent.vue';

// 国际化
const { t } = useI18n();

// 标签页完整数据项接口
export interface TabItem extends TabBarItem {
  /** 内容配置 */
  content?: Omit<TabContentItem, 'id'>;
}

// 组件属性
interface Props {
  /** 标签页列表 */
  tabs: TabItem[];
  /** 当前激活的标签页ID */
  activeTabId?: string;
  /** 布局方向 */
  orientation?: 'horizontal' | 'vertical';
  /** 标签页栏位置 */
  tabPosition?: 'top' | 'bottom' | 'left' | 'right';
  /** 标签页栏样式类 */
  tabBarClass?: string;
  /** 内容区域样式类 */
  contentClass?: string;
  /** 容器样式类 */
  containerClass?: string;
  /** 标签页最大宽度 */
  maxTabWidth?: string;
  /** 是否显示标签页管理菜单 */
  showManagementMenu?: boolean;
  /** 是否启用拖拽排序 */
  enableDragSort?: boolean;
  /** 内容切换动画 */
  contentTransition?: 'none' | 'fade' | 'slide';
  /** 是否启用错误边界 */
  enableErrorBoundary?: boolean;
  /** 是否启用内容预加载 */
  enablePreload?: boolean;
  /** 缓存策略 */
  cacheStrategy?: 'none' | 'memory' | 'session';
  /** 最大缓存数量 */
  maxCacheSize?: number;
  /** 是否自动聚焦激活标签页 */
  autoFocus?: boolean;
}

// 事件定义
interface Emits {
  /** 更新激活的标签页ID */
  (e: 'update:activeTabId', tabId: string): void;
  /** 标签页点击事件 */
  (e: 'tab-click', tabId: string): void;
  /** 标签页关闭事件 */
  (e: 'tab-close', tabId: string): void;
  /** 关闭其他标签页事件 */
  (e: 'close-others', tabId: string): void;
  /** 关闭所有标签页事件 */
  (e: 'close-all'): void;
  /** 标签页重新排序事件 */
  (e: 'tab-reorder', fromIndex: number, toIndex: number): void;
  /** 内容加载开始 */
  (e: 'content-loading-start', tabId: string): void;
  /** 内容加载完成 */
  (e: 'content-loading-complete', tabId: string): void;
  /** 内容加载错误 */
  (e: 'content-loading-error', tabId: string, error: Error): void;
  /** 内容激活 */
  (e: 'content-activated', tabId: string): void;
  /** 缓存更新 */
  (e: 'cache-updated', cacheSize: number): void;
}

// 默认属性
const props = withDefaults(defineProps<Props>(), {
  orientation: 'horizontal',
  tabPosition: 'top',
  maxTabWidth: '12rem',
  showManagementMenu: true,
  enableDragSort: false,
  contentTransition: 'fade',
  enableErrorBoundary: true,
  enablePreload: false,
  cacheStrategy: 'memory',
  maxCacheSize: 10,
  autoFocus: true
});

// 事件
const emit = defineEmits<Emits>();

// 内部状态
const internalActiveTabId = ref(props.activeTabId || (props.tabs.length > 0 ? props.tabs[0].id : ''));
const tabContentRef = ref<InstanceType<typeof TabContent>>();

// 计算属性
const currentActiveTabId = computed({
  get: () => props.activeTabId || internalActiveTabId.value,
  set: (value: string) => {
    internalActiveTabId.value = value;
    emit('update:activeTabId', value);
  }
});

// 标签页栏数据（仅包含显示相关信息）
const tabBarItems = computed((): TabBarItem[] =>
  props.tabs.map(tab => ({
    id: tab.id,
    title: tab.title,
    icon: tab.icon,
    href: tab.href,
    isActive: tab.id === currentActiveTabId.value,
    isClosable: tab.isClosable
  }))
);

// 标签页内容数据
const tabContentItems = computed((): TabContentItem[] =>
  props.tabs
    .filter(tab => tab.content)
    .map(tab => ({
      id: tab.id,
      ...tab.content!
    }))
);

// 容器样式类 - 使用Tailwind工具类
const containerClasses = computed(() => [
  'w-full h-full min-h-0 flex',
  props.orientation === 'horizontal' ? 'flex-col' : 'flex-row',
  // 响应式设计：在小屏幕上强制垂直布局
  'md:flex-col',
  props.containerClass
]);

// 标签页栏样式类
const tabBarClasses = computed(() => [
  'bg-background shrink-0',
  // 排序控制
  props.tabPosition === 'bottom' || props.tabPosition === 'right' ? 'order-1' : 'order-0',
  // 边框控制
  props.tabPosition === 'top' && 'border-b border-border',
  props.tabPosition === 'bottom' && 'border-t border-border',
  props.tabPosition === 'left' && 'border-r border-border',
  props.tabPosition === 'right' && 'border-l border-border',
  // 垂直布局时的最小宽度
  props.orientation === 'vertical' && 'min-w-max',
  // 响应式：移动端取消右边框，添加下边框
  'md:border-r-0 md:border-b',
  props.tabBarClass
]);

// 内容区域样式类
const contentClasses = computed(() => [
  'bg-background flex-1 min-h-0 min-w-0',
  // 排序控制
  props.tabPosition === 'bottom' || props.tabPosition === 'right' ? 'order-0' : 'order-1',
  // 响应式：移动端总是 order-1
  'md:order-1',
  props.contentClass
]);

// 方法
const handleTabClick = (tabId: string) => {
  currentActiveTabId.value = tabId;
  emit('tab-click', tabId);
};

const handleTabClose = (tabId: string) => {
  emit('tab-close', tabId);
  
  // 如果关闭的是当前激活的标签页，需要切换到其他标签页
  if (tabId === currentActiveTabId.value) {
    const remainingTabs = props.tabs.filter(tab => tab.id !== tabId);
    if (remainingTabs.length > 0) {
      // 优先选择下一个标签页，如果没有则选择上一个
      const currentIndex = props.tabs.findIndex(tab => tab.id === tabId);
      const nextTab = remainingTabs[Math.min(currentIndex, remainingTabs.length - 1)];
      currentActiveTabId.value = nextTab.id;
    } else {
      currentActiveTabId.value = '';
    }
  }
};

const handleCloseOthers = (keepTabId: string) => {
  emit('close-others', keepTabId);
  currentActiveTabId.value = keepTabId;
};

const handleCloseAll = () => {
  emit('close-all');
  currentActiveTabId.value = '';
};

const handleTabReorder = (fromIndex: number, toIndex: number) => {
  emit('tab-reorder', fromIndex, toIndex);
};

// 内容事件处理
const handleContentLoadingStart = (tabId: string) => {
  emit('content-loading-start', tabId);
};

const handleContentLoadingComplete = (tabId: string) => {
  emit('content-loading-complete', tabId);
};

const handleContentLoadingError = (tabId: string, error: Error) => {
  emit('content-loading-error', tabId, error);
};

const handleContentActivated = (tabId: string) => {
  emit('content-activated', tabId);
};

const handleCacheUpdated = (cacheSize: number) => {
  emit('cache-updated', cacheSize);
};

// 监听激活标签页变化
watch(() => props.activeTabId, (newActiveTabId) => {
  if (newActiveTabId && newActiveTabId !== internalActiveTabId.value) {
    internalActiveTabId.value = newActiveTabId;
  }
}, { immediate: true });

// 暴露方法给父组件
defineExpose({
  // 标签页操作
  switchTab: (tabId: string) => {
    currentActiveTabId.value = tabId;
  },
  getActiveTab: () => props.tabs.find(tab => tab.id === currentActiveTabId.value),
  getAllTabs: () => props.tabs,
  
  // 内容操作
  clearCache: (tabId?: string) => {
    tabContentRef.value?.clearCache(tabId);
  },
  retryLoad: (tabId: string) => {
    tabContentRef.value?.retryLoad(tabId);
  },
  preloadContent: (tabId: string) => {
    const tab = props.tabs.find(t => t.id === tabId);
    if (tab?.content) {
      tabContentRef.value?.preloadContent({ id: tabId, ...tab.content });
    }
  },
  
  // 状态查询
  getCacheSize: () => tabContentRef.value?.getCacheSize() || 0,
  getLoadingState: (tabId: string) => tabContentRef.value?.getLoadingState(tabId) || false,
  getErrorState: (tabId: string) => tabContentRef.value?.getErrorState(tabId) || null
});
</script>

<template>
  <div 
    :class="containerClasses"
    class="focus-within:outline-none motion-reduce:*:transition-none contrast-more:border-2"
  >
    <!-- 标签页栏 -->
    <div :class="tabBarClasses">
      <TabBar
        :tabs="tabBarItems"
        :active-tab-id="currentActiveTabId"
        :max-tab-width="maxTabWidth"
        :show-management-menu="showManagementMenu"
        :enable-drag-sort="enableDragSort"
        @tab-click="handleTabClick"
        @tab-close="handleTabClose"
        @close-others="handleCloseOthers"
        @close-all="handleCloseAll"
        @tab-reorder="handleTabReorder"
      />
    </div>

    <!-- 内容区域 -->
    <div :class="contentClasses">
      <TabContent
        ref="tabContentRef"
        :contents="tabContentItems"
        :active-tab-id="currentActiveTabId"
        :transition="contentTransition"
        :enable-error-boundary="enableErrorBoundary"
        :enable-preload="enablePreload"
        :cache-strategy="cacheStrategy"
        :max-cache-size="maxCacheSize"
        @loading-start="handleContentLoadingStart"
        @loading-complete="handleContentLoadingComplete"
        @loading-error="handleContentLoadingError"
        @content-activated="handleContentActivated"
        @cache-updated="handleCacheUpdated"
      />
    </div>
  </div>
</template> 