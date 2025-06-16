<template>
    <div class="search-bar-container">
        <!-- 搜索描述（屏幕阅读器） -->
        <div v-bind="searchDescriptionAriaAttrs">
            {{ t('searchBar.aria.searchInstructions') }}
        </div>
        
        <!-- 搜索触发器按钮 -->
        <button 
            :class="cn(buttonVariants({ variant: 'outline' }), [triggerClasses, getTouchTargetClasses()])"
            role="combobox"
            :aria-expanded="isOpen"
            aria-haspopup="listbox"
            :aria-controls="isOpen ? 'search-results' : undefined"
            :aria-label="t('searchBar.aria.label')"
            :aria-describedby="showShortcut ? 'search-shortcut-hint' : descriptionId"
            @click="openSearch">
            
            <!-- 搜索图标 -->
            <Search :class="iconClasses" aria-hidden="true" />
            
            <!-- 占位符文本 -->
            <span :class="placeholderClasses">
                {{ t('searchBar.placeholder') }}
            </span>
            
            <!-- 键盘快捷键提示 -->
            <kbd 
                v-if="showShortcut"
                id="search-shortcut-hint"
                :class="shortcutClasses"
                :aria-label="`${getSearchShortcutText()} ${t('accessibility.keyboardNavigation')}`">
                {{ getSearchShortcutText() }}
            </kbd>
        </button>
        
        <!-- SearchDialog 搜索对话框 -->
        <SearchDialog 
            id="search-results"
            :open="isOpen"
            :results="searchResults"
            :loading="isSearchLoading"
            :suggestions="searchSuggestions"
            @update:open="handleDialogOpenChange"
            @search="handleDialogSearch"
            @select="handleDialogSelect"
        />
        
        <!-- Live Region 用于屏幕阅读器公告 -->
        <div ref="liveRegionRef" v-bind="liveRegionAriaAttrs"></div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, readonly, nextTick, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Search } from 'lucide-vue-next'
// 导入响应式断点管理
import { useBreakpoints } from '@/composables/useBreakpoints'
// 导入搜索功能
import { useSearchData, useDebouncedSearch } from '@/composables/useSearchData'
// 导入快捷键功能
import { useSearchShortcuts } from '@/composables/useSearchShortcuts'
// 导入无障碍功能
import { useSearchAccessibility } from '@/composables/useSearchAccessibility'
// 导入组件
import SearchDialog from './SearchDialog.vue'
// 导入类型定义
import type { SearchBarProps, SearchBarEmits, SearchResult } from '@/types'

// 设置Props默认值
const props = withDefaults(defineProps<SearchBarProps>(), {
    showShortcut: true,
    class: '',
    placeholder: '',
    compact: false,
    maxWidth: 'md'
})

// 定义Emits
const emit = defineEmits<SearchBarEmits>()

// 国际化
const { t } = useI18n()

// 响应式断点管理
const { isMobile, isTablet } = useBreakpoints()

// 搜索功能
const { 
    isLoading: isSearchLoading, 
    // filteredResults, // 当前未使用，在SearchDialog中处理
    suggestions: searchSuggestions,
    // performSearch, // 使用debouncedSearch替代
    clearSearch
} = useSearchData()

// 防抖搜索
const { debouncedSearch } = useDebouncedSearch(300)

// 快捷键功能
const { onSearchTrigger, getSearchShortcutText } = useSearchShortcuts()

// 无障碍功能
const {
    searchInputAriaAttrs,
    liveRegionRef,
    liveRegionAriaAttrs,
    searchDescriptionAriaAttrs,
    descriptionId,
    announceToScreenReader,
    openSearch: accessibilityOpenSearch,
    closeSearch: accessibilityCloseSearch,
    getTouchTargetClasses,
    prefersReducedMotion
} = useSearchAccessibility()

// 注册搜索触发回调 - 确保在组件挂载后立即注册
onMounted(() => {
    onSearchTrigger(() => {
        openSearch()
    })
})

// 组件状态
const isOpen = ref(false)
const searchQuery = ref('')
const searchResults = ref<SearchResult[]>([])

// 最大宽度映射
const maxWidthMap = {
    xs: 'max-w-xs',
    sm: 'max-w-sm', 
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
} as const

// 计算属性 - 触发器按钮样式
const triggerClasses = computed(() => {
    const baseClasses = [
        'w-full justify-start text-muted-foreground',
        'transition-colors duration-200',
        'hover:bg-accent hover:text-accent-foreground',
        'focus:bg-accent focus:text-accent-foreground',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        maxWidthMap[props.maxWidth]
    ]
    
    // 响应式高度 - 移动端使用最小触摸目标尺寸
    if (props.compact) {
        baseClasses.push('h-8')
    } else if (isMobile.value) {
        baseClasses.push('h-11 min-h-[44px]') // 44px是iOS推荐的最小触摸目标尺寸
    } else {
        baseClasses.push('h-9')
    }
    
    // 减少动画（如果用户偏好）
    if (prefersReducedMotion.value) {
        baseClasses.push('transition-none')
    }
    
    return props.class ? [...baseClasses, props.class] : baseClasses
})

// 计算属性 - 搜索图标样式
const iconClasses = computed(() => {
    if (props.compact || isMobile.value) {
        return 'mr-1 h-3 w-3 flex-shrink-0'
    }
    return 'mr-2 h-4 w-4 flex-shrink-0'
})

// 计算属性 - 占位符文本样式
const placeholderClasses = computed(() => [
    'truncate text-sm flex-1 text-left',
    'text-muted-foreground'
])

// 计算属性 - 快捷键提示样式
const shortcutClasses = computed(() => [
    'ml-auto hidden pointer-events-none select-none items-center gap-1',
    'rounded border bg-muted px-1.5 py-0.5',
    'text-[10px] font-medium text-muted-foreground opacity-100',
    // 只在平板及以上显示
    isTablet.value || (!isMobile.value) ? 'sm:inline-flex' : 'hidden'
])

// 方法 - 打开搜索
const openSearch = () => {
    console.log('SearchBar: openSearch() called')
    isOpen.value = true
    accessibilityOpenSearch()
    emit('search:open')
    
    // 同步无障碍状态
    announceToScreenReader(t('searchBar.aria.opened'))
    console.log('SearchBar: isOpen set to', isOpen.value)
}

// 方法 - 关闭搜索
const closeSearch = () => {
    isOpen.value = false
    searchQuery.value = ''
    accessibilityCloseSearch()
    emit('search:close')
    
    // 同步无障碍状态
    announceToScreenReader(t('searchBar.aria.closed'))
}

// 方法 - 处理搜索查询
const handleSearch = (query: string) => {
    searchQuery.value = query
    emit('search:query', query)
}

// 方法 - 处理对话框开关状态变化
const handleDialogOpenChange = (open: boolean) => {
    console.log('SearchBar: handleDialogOpenChange called with', open)
    isOpen.value = open
    if (open) {
        emit('search:open')
    } else {
        emit('search:close')
        clearSearch()
        searchResults.value = []
    }
}

// 方法 - 处理对话框搜索（使用防抖）
const handleDialogSearch = async (query: string) => {
    searchQuery.value = query
    emit('search:query', query)
    
    if (query.trim()) {
        const results = await debouncedSearch(query)
        searchResults.value = results
        
        // 实时公告搜索结果数量
        nextTick(() => {
            if (results.length === 0) {
                announceToScreenReader(t('searchBar.aria.noResults'))
            } else {
                announceToScreenReader(
                    t('searchBar.aria.resultsCount', { count: results.length })
                )
            }
        })
    } else {
        searchResults.value = []
    }
}

// 方法 - 处理对话框结果选择
const handleDialogSelect = (result: SearchResult) => {
    emit('search:select', result)
    
    // 如果有URL，则导航到对应页面
    if (result.url) {
        // TODO: 这里可以集成路由导航
        console.log('Navigate to:', result.url)
    }
}

// 暴露组件方法供父组件调用
defineExpose({
    openSearch,
    closeSearch,
    handleSearch,
    isOpen: readonly(isOpen),
    searchQuery: readonly(searchQuery)
})
</script>