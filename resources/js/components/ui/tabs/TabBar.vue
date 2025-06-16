<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { 
  ContextMenuRoot,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuPortal,
  ContextMenuSeparator
} from 'reka-ui';
import { Button } from '@/components/ui/button';
import { X, MoreHorizontal } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import Icon from '@/components/Icon.vue';

// 国际化
const { t } = useI18n();

// 定义标签页项接口 - 符合Reka UI要求的简化版本
export interface TabBarItem {
  id: string;
  title: string;
  icon?: string;
  href?: string;
  isActive?: boolean;
  isClosable?: boolean;
}

// 组件属性
interface Props {
  /** 标签页列表 */
  tabs: TabBarItem[];
  /** 当前激活的标签页ID */
  activeTabId: string;
  /** 是否显示标签页管理菜单 */
  showManagementMenu?: boolean;
  /** 标签页最大宽度 */
  maxTabWidth?: string;
  /** 是否启用拖拽排序 */
  enableDragSort?: boolean;
  /** 是否显示滚动阴影 */
  showScrollShadow?: boolean;
}

// 事件定义
interface Emits {
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
}

// 默认属性
const props = withDefaults(defineProps<Props>(), {
  showManagementMenu: true,
  maxTabWidth: '12rem',
  enableDragSort: false,
  showScrollShadow: true
});

// 事件
const emit = defineEmits<Emits>();

// 响应式状态
const scrollContainer = ref<HTMLElement>();
const dragInfo = ref<{
  isDragging: boolean;
  dragIndex: number;
  dropIndex: number;
} | null>(null);

// 计算属性 - 滚动容器类名（增强过渡效果）
const scrollContainerClasses = computed(() => [
  'flex items-center gap-1 overflow-x-auto min-w-0 flex-1',
  // 平滑滚动和过渡效果
  'scroll-smooth transition-all duration-300 ease-out',
  // 隐藏滚动条 - 使用Tailwind任意值语法
  '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
  // 滚动阴影效果 - 增强过渡
  props.showScrollShadow && [
    'relative',
    'before:content-[""] before:absolute before:top-0 before:bottom-0 before:left-0 before:w-2',
    'before:bg-gradient-to-r before:from-white/80 before:to-transparent before:pointer-events-none before:z-10',
    'before:opacity-0 before:transition-opacity before:duration-300',
    'after:content-[""] after:absolute after:top-0 after:bottom-0 after:right-0 after:w-2', 
    'after:bg-gradient-to-l after:from-white/80 after:to-transparent after:pointer-events-none after:z-10',
    'after:opacity-0 after:transition-opacity after:duration-300',
    // 滚动时显示阴影
    'hover:before:opacity-100 hover:after:opacity-100'
  ]
]);

// 计算属性 - 标签页类名（增强的过渡效果）
const getTabClasses = (tab: TabBarItem, index: number) => [
  // 基础样式和增强的过渡效果
  'flex items-center gap-1 px-3 py-1.5 rounded-md cursor-pointer group min-w-max select-none relative',
  'transition-all duration-300 ease-out transform-gpu',
  'hover:scale-[1.02] active:scale-[0.98]',
  // 激活状态样式 - 增强视觉效果
  tab.id === props.activeTabId
    ? [
        'bg-primary/10 text-primary font-medium border border-primary/20 shadow-md',
        'before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/5 before:to-transparent before:rounded-md before:opacity-100',
        'ring-1 ring-primary/10'
      ]
    : [
        'hover:bg-muted/50 text-foreground hover:shadow-sm',
        'before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/5 before:to-transparent before:rounded-md before:opacity-0',
        'hover:before:opacity-50 hover:ring-1 hover:ring-muted/20'
      ],
  // 拖拽状态样式 - 增强视觉反馈
  dragInfo.value?.isDragging && dragInfo.value.dragIndex === index && [
    'opacity-60 rotate-1 z-10 shadow-lg scale-105'
  ],
  dragInfo.value?.dropIndex === index && dragInfo.value.dragIndex !== index && [
    'ring-2 ring-primary/50 bg-primary/5 scale-105'
  ],
  // 拖拽光标和禁用状态
  props.enableDragSort && ['hover:cursor-grab active:cursor-grabbing'],
  // 响应式优化
  'md:transition-all motion-reduce:transition-none',
  // 焦点状态
  'focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none'
];

// 计算属性
const closableTabs = computed(() => 
  props.tabs.filter(tab => tab.isClosable !== false)
);

const hasMultipleTabs = computed(() => props.tabs.length > 1);

// 方法
const handleTabClick = (tabId: string) => {
  emit('tab-click', tabId);
};

const handleTabClose = (tabId: string, event: Event) => {
  event.preventDefault();
  event.stopPropagation();
  emit('tab-close', tabId);
};

const handleCloseOthers = (tabId: string) => {
  emit('close-others', tabId);
};

const handleCloseAll = () => {
  emit('close-all');
};

// 键盘导航处理
const handleKeydown = (event: KeyboardEvent, tabId: string) => {
  const currentIndex = props.tabs.findIndex(tab => tab.id === tabId);
  
  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault();
      if (currentIndex > 0) {
        emit('tab-click', props.tabs[currentIndex - 1].id);
        nextTick(() => {
          focusTab(currentIndex - 1);
        });
      }
      break;
    case 'ArrowRight':
      event.preventDefault();
      if (currentIndex < props.tabs.length - 1) {
        emit('tab-click', props.tabs[currentIndex + 1].id);
        nextTick(() => {
          focusTab(currentIndex + 1);
        });
      }
      break;
    case 'Delete':
    case 'Backspace':
      event.preventDefault();
      const tab = props.tabs[currentIndex];
      if (tab.isClosable !== false) {
        emit('tab-close', tabId);
      }
      break;
    case 'Home':
      event.preventDefault();
      emit('tab-click', props.tabs[0].id);
      nextTick(() => {
        focusTab(0);
      });
      break;
    case 'End':
      event.preventDefault();
      emit('tab-click', props.tabs[props.tabs.length - 1].id);
      nextTick(() => {
        focusTab(props.tabs.length - 1);
      });
      break;
  }
};

// 聚焦标签页
const focusTab = (index: number) => {
  const tabElement = scrollContainer.value?.children[index] as HTMLElement;
  if (tabElement) {
    tabElement.focus();
  }
};

// 拖拽功能
const handleDragStart = (event: DragEvent, index: number) => {
  if (!props.enableDragSort) return;
  
  dragInfo.value = {
    isDragging: true,
    dragIndex: index,
    dropIndex: index
  };
  
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', index.toString());
  }
};

const handleDragOver = (event: DragEvent, index: number) => {
  if (!props.enableDragSort || !dragInfo.value) return;
  
  event.preventDefault();
  dragInfo.value.dropIndex = index;
};

const handleDrop = (event: DragEvent, dropIndex: number) => {
  if (!props.enableDragSort || !dragInfo.value) return;
  
  event.preventDefault();
  const { dragIndex } = dragInfo.value;
  
  if (dragIndex !== dropIndex) {
    emit('tab-reorder', dragIndex, dropIndex);
  }
  
  dragInfo.value = null;
};

const handleDragEnd = () => {
  dragInfo.value = null;
};
</script>

<template>
  <div class="flex items-center w-full min-w-0">
    <!-- 标签页容器 -->
    <div 
      ref="scrollContainer"
      :class="scrollContainerClasses"
      role="tablist"
      :aria-label="t('tabs.tabList')"
    >
      <!-- 渲染所有标签页 - 使用Tailwind过渡类 -->
      <div class="flex gap-1 transition-all duration-300 ease-out">
        <template v-for="(tab, index) in tabs" :key="tab.id">
          <ContextMenuRoot>
            <ContextMenuTrigger as-child>
              <div
                :class="getTabClasses(tab, index)"
                :style="{ maxWidth: maxTabWidth }"
                :tabindex="tab.id === activeTabId ? 0 : -1"
                :role="'tab'"
                :aria-selected="tab.id === activeTabId"
                :aria-controls="`tabpanel-${tab.id}`"
                :title="tab.href || tab.title"
                :draggable="enableDragSort"
                @click="handleTabClick(tab.id)"
                @keydown="handleKeydown($event, tab.id)"
                @dragstart="handleDragStart($event, index)"
                @dragover="handleDragOver($event, index)"
                @drop="handleDrop($event, index)"
                @dragend="handleDragEnd"
              >
              <!-- 标签页图标和标题 -->
              <span class="flex items-center gap-1.5 text-sm min-w-0">
                <!-- 使用统一的Icon组件显示Lucide图标 -->
                <Icon 
                  v-if="tab.icon" 
                  :name="tab.icon" 
                  class="h-3.5 w-3.5 shrink-0 transition-transform duration-200 ease-out group-hover:scale-110" 
                  :aria-hidden="true"
                />
                <span class="truncate min-w-0">{{ tab.title }}</span>
              </span>

              <!-- 关闭按钮 - 增强的过渡效果 -->
              <button
                v-if="tab.isClosable !== false"
                type="button"
                class="ml-1 rounded p-0.5 shrink-0 transition-all duration-200 ease-out transform-gpu"
                :class="[
                  // 基础样式
                  'text-muted-foreground hover:text-foreground',
                  // 背景和悬停效果
                  'hover:bg-muted/70 hover:scale-110 active:scale-95',
                  // 可见性控制
                  tab.id === activeTabId 
                    ? 'opacity-100' 
                    : 'opacity-0 group-hover:opacity-100',
                  // 焦点和交互状态
                  'focus-visible:ring-2 focus-visible:ring-destructive/50 focus-visible:outline-none',
                  'hover:shadow-sm hover:ring-1 hover:ring-destructive/20',
                  // 响应式优化
                  'motion-reduce:transition-none motion-reduce:transform-none'
                ]"
                :aria-label="t('tabs.close') + ' ' + tab.title"
                @click="handleTabClose(tab.id, $event)"
              >
                <X class="h-3 w-3 transition-transform duration-150 group-hover:rotate-90" />
              </button>
            </div>
          </ContextMenuTrigger>

          <!-- 右键上下文菜单 -->
          <ContextMenuPortal>
            <ContextMenuContent
              class="min-w-[180px] bg-popover text-popover-foreground border border-border rounded-md shadow-lg p-1 z-50"
              :side-offset="5"
              :align="'start'"
            >
              <!-- 关闭当前标签页 -->
              <ContextMenuItem
                v-if="tab.isClosable !== false"
                class="flex items-center justify-between px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                @select="handleTabClose(tab.id, $event)"
              >
                <span>{{ t('tabs.close') }}</span>
                <span class="text-xs text-muted-foreground">Ctrl+W</span>
              </ContextMenuItem>

              <!-- 分隔线 -->
              <ContextMenuSeparator 
                v-if="tab.isClosable !== false && hasMultipleTabs"
                class="h-px bg-border my-1" 
              />

              <!-- 关闭其他标签页 -->
              <ContextMenuItem
                v-if="closableTabs.length > 1"
                class="flex items-center px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                @select="handleCloseOthers(tab.id)"
              >
                {{ t('tabs.closeOthers') }}
              </ContextMenuItem>

              <!-- 关闭所有标签页 -->
              <ContextMenuItem
                v-if="closableTabs.length > 0"
                class="flex items-center px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                @select="handleCloseAll"
              >
                {{ t('tabs.closeAll') }}
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenuPortal>
        </ContextMenuRoot>
        </template>
      </div>
    </div>

    <!-- 标签页管理菜单 - 当标签页较多时显示 -->
    <div v-if="showManagementMenu && hasMultipleTabs" class="ml-2 shrink-0">
      <ContextMenuRoot>
        <ContextMenuTrigger as-child>
          <Button 
            variant="ghost" 
            size="sm" 
            class="px-2 py-1.5 h-auto transition-all duration-200 ease-out hover:scale-105 active:scale-95 hover:shadow-sm" 
            :aria-label="t('tabs.management')"
          >
            <MoreHorizontal class="h-3.5 w-3.5 transition-transform duration-200 hover:rotate-90" />
          </Button>
        </ContextMenuTrigger>
        
        <ContextMenuPortal>
          <ContextMenuContent
            class="min-w-[180px] bg-popover text-popover-foreground border border-border rounded-md shadow-lg p-1 z-50"
            align="end"
          >
            <ContextMenuItem
              v-if="closableTabs.length > 0"
              class="flex items-center px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
              @select="handleCloseOthers(activeTabId)"
            >
              {{ t('tabs.closeOthers') }}
            </ContextMenuItem>
            
            <ContextMenuItem
              v-if="closableTabs.length > 0"
              class="flex items-center px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
              @select="handleCloseAll"
            >
              {{ t('tabs.closeAll') }}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenuRoot>
    </div>
  </div>
</template> 