<template>
    <Dialog :open="isOpen" @update:open="handleOpenChange">
        <DialogContent 
            class="search-dialog max-w-2xl p-0 overflow-hidden">
            <!-- 搜索对话框头部 -->
            <DialogHeader>
                <DialogTitle class="sr-only">{{ t('searchBar.dialog.title') }}</DialogTitle>
                <DialogDescription class="sr-only">{{ t('searchBar.aria.description') }}</DialogDescription>
            </DialogHeader>
            
            <!-- 搜索输入区域 -->
            <div class="flex items-center border-b px-3" :class="searchInputClasses">
                <Search class="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <Input
                    ref="searchInputRef"
                    v-model="searchQuery"
                    class="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none border-0 ring-0 focus:ring-0 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
                    :placeholder="t('searchBar.dialog.placeholder')"
                    @input="handleSearchInput"
                    @keydown="handleKeyDown"
                />
                <!-- 清空按钮 -->
                <Button
                    v-if="searchQuery"
                    variant="ghost"
                    size="sm"
                    class="h-8 w-8 p-0 shrink-0"
                    @click="clearSearch">
                    <X class="h-3 w-3" />
                    <span class="sr-only">{{ t('common.clear') }}</span>
                </Button>
            </div>
            
            <!-- 搜索结果区域 -->
            <div class="max-h-[300px] overflow-y-auto overflow-x-hidden" v-bind="searchResultsAriaAttrs">
                <!-- 加载状态 -->
                <div v-if="isLoading" class="flex items-center justify-center py-6">
                    <div class="flex items-center space-x-2 text-sm text-muted-foreground">
                        <div class="h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent"></div>
                        <span>{{ t('searchBar.dialog.loading') }}</span>
                    </div>
                </div>
                
                <!-- 搜索结果 -->
                <div v-else-if="filteredResults.length > 0" class="p-1">
                    <!-- 按分类显示结果 -->
                    <div v-for="category in groupedResults" :key="category.type" class="mb-2 last:mb-0">
                        <div class="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {{ getCategoryName(category.type) }}
                        </div>
                        <div class="space-y-1">
                            <div
                                v-for="(result, index) in category.items"
                                :key="result.id"
                                :id="`result-${filteredResults.findIndex(r => r.id === result.id)}`"
                                :ref="(el) => setResultRef(el, category.type, index)"
                                class="search-result-item"
                                :class="getResultItemClasses(result, isSelected(result))"
                                role="option"
                                :aria-selected="isSelected(result)"
                                :aria-label="t('searchBar.aria.resultLabel', {
                                    title: result.title,
                                    type: getCategoryName(result.type),
                                    position: filteredResults.findIndex(r => r.id === result.id) + 1
                                })"
                                :aria-describedby="result.description ? `result-${filteredResults.findIndex(r => r.id === result.id)}-desc` : undefined"
                                :tabindex="isSelected(result) ? 0 : -1"
                                @click="selectResult(result)"
                                @mouseenter="setSelectedResult(result)"
                                @focus="setSelectedResult(result)">
                                
                                <!-- 结果图标 -->
                                <div class="flex h-4 w-4 shrink-0 items-center justify-center">
                                    <component 
                                        :is="getResultIcon(result.type)" 
                                        class="h-3 w-3" 
                                        :class="getIconClasses(result.type)" />
                                </div>
                                
                                <!-- 结果内容 -->
                                <div class="flex-1 min-w-0 ml-2">
                                    <div class="font-medium text-sm" v-html="highlightMatch(result.title, searchQuery)"></div>
                                    <div v-if="result.description" 
                                         :id="`result-${filteredResults.findIndex(r => r.id === result.id)}-desc`"
                                         class="text-xs text-muted-foreground truncate" 
                                         v-html="highlightMatch(result.description, searchQuery)"></div>
                                </div>
                                
                                <!-- 快捷键提示 -->
                                <div v-if="isSelected(result)" class="shrink-0 ml-2">
                                    <kbd class="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground opacity-100">
                                        <span class="text-xs">↵</span>
                                    </kbd>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 无结果状态 -->
                <div v-else-if="searchQuery && !isLoading" class="flex flex-col items-center justify-center py-8 text-center">
                    <Search class="h-8 w-8 text-muted-foreground mb-2" />
                    <p class="text-sm text-muted-foreground">{{ t('searchBar.dialog.noResults') }}</p>
                    <p class="text-xs text-muted-foreground mt-1">
                        {{ t('searchBar.dialog.noResultsHint', { query: searchQuery }) }}
                    </p>
                </div>
                
                <!-- 初始状态 - 显示最近搜索或推荐 -->
                <div v-else class="p-4">
                    <div class="space-y-3">
                        <div class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {{ t('searchBar.dialog.suggestions') }}
                        </div>
                        <div class="grid gap-1">
                            <div
                                v-for="suggestion in suggestions"
                                :key="suggestion.id"
                                class="search-result-item"
                                :class="getResultItemClasses(suggestion, false)"
                                @click="selectResult(suggestion)">
                                
                                <div class="flex h-4 w-4 shrink-0 items-center justify-center">
                                    <component 
                                        :is="getResultIcon(suggestion.type)" 
                                        class="h-3 w-3" 
                                        :class="getIconClasses(suggestion.type)" />
                                </div>
                                
                                <div class="flex-1 min-w-0 ml-2">
                                    <div class="font-medium text-sm">{{ suggestion.title }}</div>
                                    <div v-if="suggestion.description" class="text-xs text-muted-foreground truncate">
                                        {{ suggestion.description }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 底部快捷键提示 -->
            <div class="border-t px-3 py-2 text-xs text-muted-foreground bg-muted/50">
                <div class="flex items-center justify-between">
                    <span>{{ t('searchBar.dialog.keyboardHints.navigate') }}</span>
                    <div class="flex items-center space-x-1">
                        <kbd class="inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium opacity-100">
                            ↑↓
                        </kbd>
                        <span>{{ t('searchBar.dialog.keyboardHints.select') }}</span>
                        <kbd class="inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium opacity-100">
                            ↵
                        </kbd>
                    </div>
                </div>
                
                <!-- 屏幕阅读器快捷键提示 -->
                <div class="sr-only" aria-label="keyboard shortcuts">
                    {{ t('searchBar.aria.keyboardShortcuts') }}
                </div>
            </div>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
// 导入无障碍功能
import { useSearchAccessibility, useSearchResultAccessibility } from '@/composables/useSearchAccessibility'
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogHeader, 
    DialogTitle 
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { 
    Search, 
    X, 
    FileText, 
    Package, 
    ShoppingCart, 
    Users, 
    Settings, 
    Home,
    Activity,
    Database
} from 'lucide-vue-next'
// 导入类型定义
import type { SearchResult } from '@/types'

// 组件Props
export interface SearchDialogProps {
    /** 是否打开对话框 */
    open: boolean
    /** 搜索结果数据 */
    results?: SearchResult[]
    /** 是否加载中 */
    loading?: boolean
    /** 建议搜索项 */
    suggestions?: SearchResult[]
}

// 组件Emits
export interface SearchDialogEmits {
    /** 对话框开关状态变化 */
    (e: 'update:open', open: boolean): void
    /** 搜索查询变化 */
    (e: 'search', query: string): void
    /** 选择搜索结果 */
    (e: 'select', result: SearchResult): void
}

// Props和Emits
const props = withDefaults(defineProps<SearchDialogProps>(), {
    open: false,
    results: () => [],
    loading: false,
    suggestions: () => []
})

const emit = defineEmits<SearchDialogEmits>()

// 国际化
const { t } = useI18n()

// 无障碍功能
const {
    searchResultsAriaAttrs,
    updateResultsCount,
    updateSelectedIndex,
    announceToScreenReader,
    handleKeyboardNavigation,
    activateFocusTrap,
    deactivateFocusTrap,
    updateFocusableElements,
    prefersReducedMotion,
    prefersHighContrast
} = useSearchAccessibility()

// 组件状态
const isOpen = ref(props.open)
const searchQuery = ref('')
const isLoading = ref(props.loading)
const selectedResult = ref<SearchResult | null>(null)
const selectedIndex = ref(0)
const searchInputRef = ref<HTMLInputElement>()

// 监听props变化
watch(() => props.open, (newValue) => {
    console.log('SearchDialog: props.open changed to', newValue)
    if (isOpen.value !== newValue) {
        isOpen.value = newValue
        console.log('SearchDialog: isOpen updated to', isOpen.value)
    }
    
    if (newValue) {
        console.log('SearchDialog: opening dialog')
        activateFocusTrap()
        nextTick(() => {
            const inputElement = searchInputRef.value?.$el || searchInputRef.value
            if (inputElement && typeof inputElement.focus === 'function') {
                inputElement.focus()
            }
            updateFocusableElements()
        })
    } else {
        console.log('SearchDialog: closing dialog')
        deactivateFocusTrap()
        // 重置状态
        searchQuery.value = ''
        selectedResult.value = null
        selectedIndex.value = 0
    }
}, { immediate: true })

watch(() => props.loading, (newValue) => {
    isLoading.value = newValue
})

// 搜索输入样式
const searchInputClasses = computed(() => [
    'border-border/50',
    'focus-within:border-border'
])

// 过滤搜索结果
const filteredResults = computed(() => {
    if (!searchQuery.value.trim()) return []
    
    const query = searchQuery.value.toLowerCase()
    const results = props.results.filter(result => 
        result.title.toLowerCase().includes(query) ||
        result.description?.toLowerCase().includes(query) ||
        result.category?.toLowerCase().includes(query)
    )
    
    // 更新结果数量用于无障碍公告
    nextTick(() => {
        updateResultsCount(results.length)
    })
    
    return results
})

// 按分类分组结果
const groupedResults = computed(() => {
    const groups = new Map<string, SearchResult[]>()
    
    filteredResults.value.forEach(result => {
        if (!groups.has(result.type)) {
            groups.set(result.type, [])
        }
        groups.get(result.type)!.push(result)
    })
    
    // 转换为数组并排序
    return Array.from(groups.entries())
        .map(([type, items]) => ({ type, items }))
        .sort((a, b) => {
            // 优先级排序：page > order > product > user > setting
            const priority = { page: 0, order: 1, product: 2, user: 3, setting: 4 }
            return (priority[a.type as keyof typeof priority] || 5) - 
                   (priority[b.type as keyof typeof priority] || 5)
        })
})

// 获取分类名称
const getCategoryName = (type: string) => {
    const categoryNames = {
        page: t('searchBar.categories.pages'),
        order: t('searchBar.categories.orders'),
        product: t('searchBar.categories.products'),
        user: t('searchBar.categories.users'),
        setting: t('searchBar.categories.settings')
    }
    return categoryNames[type as keyof typeof categoryNames] || type
}

// 获取结果图标
const getResultIcon = (type: string) => {
    const icons = {
        page: FileText,
        order: ShoppingCart,
        product: Package,
        user: Users,
        setting: Settings,
        dashboard: Home,
        report: Activity,
        database: Database
    }
    return icons[type as keyof typeof icons] || FileText
}

// 获取图标样式
const getIconClasses = (type: string) => {
    const iconClasses = {
        page: 'text-blue-500',
        order: 'text-green-500',
        product: 'text-purple-500',
        user: 'text-orange-500',
        setting: 'text-gray-500',
        dashboard: 'text-primary',
        report: 'text-indigo-500',
        database: 'text-red-500'
    }
    return iconClasses[type as keyof typeof iconClasses] || 'text-muted-foreground'
}

// 获取结果项样式
const getResultItemClasses = (result: SearchResult, selected: boolean) => {
    const baseClasses = [
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none min-h-[44px]'
    ]
    
    // 过渡动画（根据用户偏好）
    if (!prefersReducedMotion.value) {
        baseClasses.push('transition-colors duration-150')
    }
    
    // 高对比度支持
    if (prefersHighContrast.value) {
        baseClasses.push(
            selected 
                ? 'bg-black text-white border-2 border-white' 
                : 'hover:bg-gray-800 hover:text-white border border-gray-400'
        )
    } else {
        baseClasses.push(
            selected 
                ? 'bg-accent text-accent-foreground' 
                : 'hover:bg-accent hover:text-accent-foreground'
        )
    }
    
    return baseClasses
}

// 判断是否选中
const isSelected = (result: SearchResult) => {
    return selectedResult.value?.id === result.id
}

// 高亮匹配文本
const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">$1</mark>')
}

// 设置选中结果
const setSelectedResult = (result: SearchResult) => {
    selectedResult.value = result
    // 找到结果的索引并更新无障碍状态
    const flatResults = filteredResults.value
    const index = flatResults.findIndex(r => r.id === result.id)
    if (index >= 0) {
        updateSelectedIndex(index)
    }
}

// 事件处理
const handleOpenChange = (open: boolean) => {
    isOpen.value = open
    emit('update:open', open)
}

const handleSearchInput = () => {
    emit('search', searchQuery.value)
    // 重置选中状态
    selectedResult.value = null
    selectedIndex.value = 0
}

const clearSearch = () => {
    searchQuery.value = ''
    selectedResult.value = null
    selectedIndex.value = 0
    emit('search', '')
    nextTick(() => {
        const inputElement = searchInputRef.value?.$el || searchInputRef.value
        if (inputElement && typeof inputElement.focus === 'function') {
            inputElement.focus()
        }
    })
}

const selectResult = (result: SearchResult) => {
    emit('select', result)
    handleOpenChange(false)
}

// 键盘导航
const handleKeyDown = (event: KeyboardEvent) => {
    // 首先尝试处理无障碍键盘导航
    if (handleKeyboardNavigation(event)) {
        return
    }
    
    const results = filteredResults.value
    if (results.length === 0) return
    
    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault()
            if (selectedIndex.value < results.length - 1) {
                selectedIndex.value++
                selectedResult.value = results[selectedIndex.value]
                updateSelectedIndex(selectedIndex.value)
            }
            break
            
        case 'ArrowUp':
            event.preventDefault()
            if (selectedIndex.value > 0) {
                selectedIndex.value--
                selectedResult.value = results[selectedIndex.value]
                updateSelectedIndex(selectedIndex.value)
            }
            break
            
        case 'Enter':
            event.preventDefault()
            if (selectedResult.value) {
                selectResult(selectedResult.value)
            } else if (results.length > 0) {
                selectResult(results[0])
            }
            break
            
        case 'Escape':
            event.preventDefault()
            handleOpenChange(false)
            break
    }
}

// 设置结果引用（用于滚动到视图）
const setResultRef = (_el: any, _category: string, _index: number) => {
    // TODO: 实现滚动到视图逻辑
}
</script>