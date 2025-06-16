<script setup lang="ts">
import { ref, computed, watch, defineAsyncComponent, markRaw, nextTick, onBeforeUnmount, Suspense, type Component } from 'vue';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Loader2, Clock } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';

// 国际化
const { t } = useI18n();

// 标签页内容项接口
export interface TabContentItem {
  id: string;
  /** 组件 - 可以是组件实例、组件选项或异步组件 */
  component?: Component | (() => Promise<any>);
  /** Props传递给组件 */
  props?: Record<string, any>;
  /** 静态HTML内容 */
  html?: string;
  /** iframe URL */
  iframeUrl?: string;
  /** 内容类型 */
  type?: 'component' | 'html' | 'iframe';
  /** 是否缓存组件实例 */
  cache?: boolean;
  /** 是否预加载 */
  preload?: boolean;
}

// 组件属性
interface Props {
  /** 标签页内容列表 */
  contents: TabContentItem[];
  /** 当前激活的标签页ID */
  activeTabId: string;
  /** 内容切换动画 */
  transition?: 'none' | 'fade' | 'slide';
  /** 是否启用错误边界 */
  enableErrorBoundary?: boolean;
  /** 是否启用内容预加载 */
  enablePreload?: boolean;
  /** 缓存策略 */
  cacheStrategy?: 'none' | 'memory' | 'session';
  /** 最大缓存数量 */
  maxCacheSize?: number;
  /** 是否启用Suspense异步组件支持 */
  enableSuspense?: boolean;
  /** Suspense超时时间（毫秒） */
  suspenseTimeout?: number;
}

// 事件定义
interface Emits {
  /** 内容加载开始 */
  (e: 'loading-start', tabId: string): void;
  /** 内容加载完成 */
  (e: 'loading-complete', tabId: string): void;
  /** 内容加载错误 */
  (e: 'loading-error', tabId: string, error: Error): void;
  /** 内容激活 */
  (e: 'content-activated', tabId: string): void;
  /** 内容缓存更新 */
  (e: 'cache-updated', cacheSize: number): void;
  /** Suspense超时 */
  (e: 'suspense-timeout', tabId: string): void;
  /** Suspense回退状态 */
  (e: 'suspense-fallback', tabId: string): void;
}

// 默认属性
const props = withDefaults(defineProps<Props>(), {
  transition: 'fade',
  enableErrorBoundary: true,
  enablePreload: false,
  cacheStrategy: 'memory',
  maxCacheSize: 10,
  enableSuspense: true,
  suspenseTimeout: 5000
});

// 事件
const emit = defineEmits<Emits>();

// 响应式状态
const loadingStates = ref<Record<string, boolean>>({});
const errorStates = ref<Record<string, Error | null>>({});
const componentCache = ref<Record<string, Component>>({});
const retryAttempts = ref<Record<string, number>>({});
const suspenseStates = ref<Record<string, 'idle' | 'pending' | 'resolved' | 'timeout'>>({});
const suspenseTimeouts = ref<Record<string, NodeJS.Timeout>>({});

// 最大重试次数
const MAX_RETRY_ATTEMPTS = 3;

// 计算属性
const activeContent = computed(() => 
  props.contents.find(content => content.id === props.activeTabId)
);

const isLoading = computed(() => 
  loadingStates.value[props.activeTabId] || false
);

const hasError = computed(() => 
  !!errorStates.value[props.activeTabId]
);

const cacheSize = computed(() => Object.keys(componentCache.value).length);

const isSuspensePending = computed(() => 
  suspenseStates.value[props.activeTabId] === 'pending'
);

const isSuspenseTimeout = computed(() => 
  suspenseStates.value[props.activeTabId] === 'timeout'
);

// 增强的过渡动画类名配置
const transitionClasses = computed(() => {
  switch (props.transition) {
    case 'fade':
      return {
        enterActiveClass: 'transition-all duration-300 ease-out',
        enterFromClass: 'opacity-0 scale-95',
        enterToClass: 'opacity-100 scale-100',
        leaveActiveClass: 'transition-all duration-200 ease-in',
        leaveFromClass: 'opacity-100 scale-100',
        leaveToClass: 'opacity-0 scale-95'
      };
    case 'slide':
      return {
        enterActiveClass: 'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
        enterFromClass: 'opacity-0 translate-x-4 scale-95',
        enterToClass: 'opacity-100 translate-x-0 scale-100',
        leaveActiveClass: 'transition-all duration-200 ease-[cubic-bezier(0.4,0,1,1)]',
        leaveFromClass: 'opacity-100 translate-x-0 scale-100',
        leaveToClass: 'opacity-0 -translate-x-4 scale-95'
      };
    default:
      return {};
  }
});

// 动态过渡效果（基于内容类型优化）
const dynamicTransition = computed(() => {
  if (!activeContent.value) return props.transition;
  
  // 根据内容类型选择最适合的过渡效果
  switch (activeContent.value.type) {
    case 'iframe':
      return 'fade'; // iframe 使用淡入淡出，避免位移导致的闪烁
    case 'html':
      return 'slide'; // HTML 内容使用滑动效果
    case 'component':
    default:
      return props.transition; // 组件使用用户指定的过渡效果
  }
});

// 性能优化的过渡配置
const optimizedTransitionClasses = computed(() => {
  const baseClasses = transitionClasses.value;
  
  // 在移动设备上使用更快的过渡
  const isMobile = window.innerWidth < 768;
  if (isMobile) {
    return {
      ...baseClasses,
      enterActiveClass: baseClasses.enterActiveClass?.replace('duration-300', 'duration-200'),
      leaveActiveClass: baseClasses.leaveActiveClass?.replace('duration-200', 'duration-150')
    };
  }
  
  return baseClasses;
});

// 方法
const setLoadingState = (tabId: string, loading: boolean) => {
  loadingStates.value[tabId] = loading;
  if (loading) {
    emit('loading-start', tabId);
  } else {
    emit('loading-complete', tabId);
  }
};

const setErrorState = (tabId: string, error: Error | null) => {
  errorStates.value[tabId] = error;
  if (error) {
    emit('loading-error', tabId, error);
  }
};

// Suspense状态管理
const setSuspenseState = (tabId: string, state: 'idle' | 'pending' | 'resolved' | 'timeout') => {
  suspenseStates.value[tabId] = state;
  
  // 清理现有的超时定时器
  if (suspenseTimeouts.value[tabId]) {
    clearTimeout(suspenseTimeouts.value[tabId]);
    delete suspenseTimeouts.value[tabId];
  }
  
  if (state === 'pending') {
    emit('suspense-fallback', tabId);
    
    // 设置超时定时器
    if (props.suspenseTimeout > 0) {
      suspenseTimeouts.value[tabId] = setTimeout(() => {
        if (suspenseStates.value[tabId] === 'pending') {
          suspenseStates.value[tabId] = 'timeout';
          emit('suspense-timeout', tabId);
        }
      }, props.suspenseTimeout);
    }
  } else if (state === 'resolved') {
    // 组件成功加载
  }
};

// 创建异步组件包装器以支持Suspense
const createAsyncComponentWrapper = (content: TabContentItem): Component => {
  if (!props.enableSuspense || !content.component || typeof content.component !== 'function') {
    return content.component as Component;
  }
  
  return defineAsyncComponent({
    loader: content.component as () => Promise<any>,
    delay: 200, // 延迟200ms显示加载状态
    timeout: props.suspenseTimeout,
    onError(error, retry, fail, attempts) {
      console.error(`Async component loading failed (attempt ${attempts}):`, error);
      
      if (attempts <= 3) {
        // 最多重试3次
        retry();
      } else {
        fail();
        setErrorState(content.id, error instanceof Error ? error : new Error(String(error)));
      }
    }
  });
};

// 异步组件加载
const loadAsyncComponent = async (content: TabContentItem): Promise<Component> => {
  const { id, component, cache = true } = content;
  
  // 检查缓存
  if (cache && componentCache.value[id]) {
    return componentCache.value[id];
  }
  
  try {
    setLoadingState(id, true);
    setErrorState(id, null);
    
    let loadedComponent: Component;
    
    if (typeof component === 'function') {
      // 异步组件
      loadedComponent = await (component as () => Promise<any>)();
    } else if (component) {
      // 同步组件
      loadedComponent = component;
    } else {
      throw new Error(t('tabContent.noComponentDefined'));
    }
    
    // 缓存组件
    if (cache && props.cacheStrategy !== 'none') {
      // 检查缓存大小限制
      if (cacheSize.value >= props.maxCacheSize) {
        // 清理最老的缓存项（简单的FIFO策略）
        const cacheKeys = Object.keys(componentCache.value);
        const oldestKey = cacheKeys[0];
        delete componentCache.value[oldestKey];
      }
      
      componentCache.value[id] = markRaw(loadedComponent);
      emit('cache-updated', cacheSize.value);
    }
    
    // 重置重试计数
    retryAttempts.value[id] = 0;
    
    return loadedComponent;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    setErrorState(id, err);
    throw err;
  } finally {
    setLoadingState(id, false);
  }
};

// 重试加载
const retryLoad = async (tabId: string) => {
  const content = props.contents.find(c => c.id === tabId);
  if (!content) return;
  
  const attempts = retryAttempts.value[tabId] || 0;
  if (attempts >= MAX_RETRY_ATTEMPTS) {
    setErrorState(tabId, new Error(t('tabContent.maxRetriesExceeded')));
    return;
  }
  
  retryAttempts.value[tabId] = attempts + 1;
  
  try {
    await loadAsyncComponent(content);
  } catch (error) {
    console.error(`Failed to retry loading content for tab ${tabId}:`, error);
  }
};

// 预加载内容
const preloadContent = async (content: TabContentItem) => {
  if (!props.enablePreload || !content.preload || !content.component) return;
  
  try {
    await loadAsyncComponent(content);
  } catch (error) {
    console.warn(`Failed to preload content for tab ${content.id}:`, error);
  }
};

// 清理缓存
const clearCache = (tabId?: string) => {
  if (tabId) {
    delete componentCache.value[tabId];
  } else {
    componentCache.value = {};
  }
  emit('cache-updated', cacheSize.value);
};

// 获取渲染组件
const getRenderComponent = async (content: TabContentItem): Promise<Component | null> => {
  if (!content.component) return null;
  
  try {
    return await loadAsyncComponent(content);
  } catch (error) {
    console.error(`Failed to load component for tab ${content.id}:`, error);
    return null;
  }
};

// 监听激活标签页变化
watch(() => props.activeTabId, (newTabId) => {
  emit('content-activated', newTabId);
}, { immediate: true });

// 预加载所有标记为预加载的内容
watch(() => props.contents, (contents) => {
  contents.forEach(content => {
    if (content.preload) {
      preloadContent(content);
    }
  });
}, { immediate: true, deep: true });

// 组件卸载时清理缓存和定时器
onBeforeUnmount(() => {
  if (props.cacheStrategy === 'memory') {
    componentCache.value = {};
  }
  
  // 清理所有Suspense超时定时器
  Object.values(suspenseTimeouts.value).forEach(timeout => {
    clearTimeout(timeout);
  });
  suspenseTimeouts.value = {};
});

// 暴露方法给父组件
defineExpose({
  clearCache,
  retryLoad,
  preloadContent,
  getCacheSize: () => cacheSize.value,
  getLoadingState: (tabId: string) => loadingStates.value[tabId] || false,
  getErrorState: (tabId: string) => errorStates.value[tabId] || null
});

// 过渡动画事件处理
const onBeforeEnter = (el: Element) => {
  // 确保元素在动画开始前具有正确的初始状态
  if (el instanceof HTMLElement) {
    el.style.willChange = 'transform, opacity';
  }
};

const onEnter = (el: Element, done: () => void) => {
  // 强制重排以确保过渡生效
  if (el instanceof HTMLElement) {
    el.offsetHeight;
  }
  requestAnimationFrame(() => {
    done();
  });
};

const onAfterEnter = (el: Element) => {
  // 清理will-change属性以优化性能
  if (el instanceof HTMLElement) {
    el.style.willChange = '';
  }
  
  // 触发内容激活事件
  emit('content-activated', props.activeTabId);
};

const onBeforeLeave = (el: Element) => {
  // 为离开动画准备元素
  if (el instanceof HTMLElement) {
    el.style.willChange = 'transform, opacity';
  }
};

const onLeave = (el: Element, done: () => void) => {
  // 确保离开动画流畅执行
  requestAnimationFrame(() => {
    done();
  });
};

const onAfterLeave = (el: Element) => {
  // 清理样式
  if (el instanceof HTMLElement) {
    el.style.willChange = '';
  }
};
</script>

<template>
  <div class="relative w-full h-full min-h-0 overflow-hidden">
    <!-- 内容区域 - 增强的过渡动画 -->
    <Transition
      v-bind="optimizedTransitionClasses"
      mode="out-in"
      appear
      @before-enter="onBeforeEnter"
      @enter="onEnter"
      @after-enter="onAfterEnter"
      @before-leave="onBeforeLeave"
      @leave="onLeave"
      @after-leave="onAfterLeave"
    >
      <div
        v-if="activeContent"
        :key="activeTabId"
        class="relative w-full h-full min-h-0 overflow-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-sm [&::-webkit-scrollbar-thumb:hover]:bg-muted-foreground/60"
        :role="'tabpanel'"
        :id="`tabpanel-${activeTabId}`"
        :aria-labelledby="`tab-${activeTabId}`"
      >
        <!-- 加载状态 -->
        <div
          v-if="isLoading"
          class="flex items-center justify-center h-32 text-muted-foreground animate-pulse"
        >
          <Loader2 class="h-6 w-6 animate-spin mr-2" />
          <span>{{ t('tabContent.loading') }}</span>
        </div>

        <!-- 错误状态 -->
        <div
          v-else-if="hasError && enableErrorBoundary"
          class="flex flex-col items-center justify-center h-32 text-center bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 border border-red-200/50 dark:border-red-800/50 rounded-lg p-8 m-4"
        >
          <AlertCircle class="h-8 w-8 text-destructive mb-3" />
          <h3 class="text-lg font-semibold text-foreground mb-2">
            {{ t('tabContent.loadError') }}
          </h3>
          <p class="text-sm text-muted-foreground mb-4 max-w-md">
            {{ errorStates[activeTabId]?.message || t('tabContent.unknownError') }}
          </p>
          <div class="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              @click="retryLoad(activeTabId)"
              :disabled="(retryAttempts[activeTabId] || 0) >= MAX_RETRY_ATTEMPTS"
            >
              <RefreshCw class="h-4 w-4 mr-1" />
              {{ t('tabContent.retry') }}
              <span v-if="retryAttempts[activeTabId]" class="ml-1 text-xs">
                ({{ retryAttempts[activeTabId] }}/{{ MAX_RETRY_ATTEMPTS }})
              </span>
            </Button>
          </div>
        </div>

        <!-- 组件内容 - 带Suspense支持 -->
        <template v-else-if="activeContent.type === 'component' || !activeContent.type">
          <Suspense
            v-if="enableSuspense && typeof activeContent.component === 'function'"
            @pending="setSuspenseState(activeTabId, 'pending')"
            @resolve="setSuspenseState(activeTabId, 'resolved')"
            @fallback="setSuspenseState(activeTabId, 'pending')"
            :timeout="suspenseTimeout"
          >
            <!-- 异步组件内容 -->
            <component
              :is="createAsyncComponentWrapper(activeContent)"
              v-bind="activeContent.props || {}"
              class="w-full h-full min-h-0"
            />
            
            <!-- Suspense回退内容 -->
            <template #fallback>
              <div class="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <div class="relative">
                  <Loader2 class="h-8 w-8 animate-spin text-primary" />
                  <Clock 
                    v-if="isSuspenseTimeout"
                    class="absolute -top-1 -right-1 h-3 w-3 text-warning animate-pulse" 
                  />
                </div>
                <p class="mt-3 text-sm">
                  {{ isSuspenseTimeout ? t('tabContent.loadingTimeout') : t('tabContent.loadingAsync') }}
                </p>
                <div 
                  v-if="suspenseTimeout > 0"
                  class="mt-2 w-32 h-1 bg-muted rounded-full overflow-hidden"
                >
                  <div 
                    class="h-full bg-primary transition-all duration-100 ease-linear"
                    :style="{ width: isSuspenseTimeout ? '100%' : '0%' }"
                  />
                </div>
              </div>
            </template>
          </Suspense>
          
          <!-- 非异步组件或禁用Suspense时 -->
          <component
            v-else
            :is="componentCache[activeTabId] || activeContent.component"
            v-bind="activeContent.props || {}"
            class="w-full h-full min-h-0"
          />
        </template>

        <!-- HTML内容 -->
        <div
          v-else-if="activeContent.type === 'html' && activeContent.html"
          v-html="activeContent.html"
          class="w-full h-full min-h-0 p-4"
        />

        <!-- iframe内容 -->
        <iframe
          v-else-if="activeContent.type === 'iframe' && activeContent.iframeUrl"
          :src="activeContent.iframeUrl"
          class="w-full h-full min-h-0 border-0 block"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          :title="`iframe-${activeTabId}`"
        />

        <!-- 空状态 -->
        <div
          v-else
          class="flex items-center justify-center h-32 text-muted-foreground"
        >
          <p>{{ t('tabContent.noContent') }}</p>
        </div>
      </div>

      <!-- 没有激活内容时的占位符 -->
      <div
        v-else
        class="flex items-center justify-center h-32 text-muted-foreground"
      >
        <p>{{ t('tabContent.selectTab') }}</p>
      </div>
    </Transition>
  </div>
</template> 