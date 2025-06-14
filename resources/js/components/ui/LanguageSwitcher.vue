<template>
    <div class="relative inline-block" ref="containerRef" data-testid="language-switcher">
        <!-- 当前语言显示按钮 -->
        <button ref="triggerRef" @click="toggleDropdown" @keydown="handleTriggerKeydown"
            class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors focus-visible"
            :class="{
                'high-contrast-border': preferHighContrast(),
                'high-contrast-focus': preferHighContrast()
            }" :aria-expanded="isOpen" :aria-haspopup="true" :aria-controls="dropdownId"
            :aria-describedby="descriptionId" aria-label="语言切换器" data-testid="language-switcher-button">
            <span>{{ currentLocaleDisplay }}</span>
            <svg class="w-4 h-4 transition-transform" :class="{ 'rotate-180': isOpen }" fill="none"
                stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
        </button>

        <!-- 屏幕阅读器描述文本 -->
        <div :id="descriptionId" class="sr-only">
            {{ $t('language.switcher.description') }}
        </div>

        <!-- 语言选择下拉菜单 -->
        <div v-show="isOpen" ref="dropdownRef" :id="dropdownId"
            class="absolute right-0 z-10 mt-2 w-32 bg-white border border-gray-200 rounded-md shadow-lg" :class="{
                'high-contrast-border': preferHighContrast()
            }" role="menu" :aria-orientation="'vertical'" :aria-labelledby="triggerRef?.id"
            @keydown="handleDropdownKeydown" data-testid="language-menu">
            <div class="py-1">
                <button v-for="(locale, index) in supportedLocales" :key="locale" ref="menuItemRefs"
                    @click="handleLocaleChange(locale)" @mouseenter="handleMouseEnter(index)"
                    class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:bg-gray-100 focus-visible"
                    :class="{
                        'bg-blue-50 text-blue-700 font-medium': locale === currentLocale,
                        'high-contrast-focus': preferHighContrast()
                    }" role="menuitem" :tabindex="-1" :aria-current="locale === currentLocale ? 'true' : 'false'"
                    :aria-label="getDisplayName(locale) + (locale === currentLocale ? ' (当前)' : '')"
                    :data-testid="`language-option-${locale}`">
                    <span class="flex-1 text-left">{{ getDisplayName(locale) }}</span>
                    <svg v-if="locale === currentLocale" class="w-4 h-4 text-blue-600" fill="currentColor"
                        viewBox="0 0 20 20" aria-hidden="true">
                        <path fill-rule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>

        <!-- Live Region 用于屏幕阅读器公告 -->
        <LiveRegion :message="liveMessage" priority="polite" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, getCurrentInstance, nextTick, watch } from 'vue'
import type { SupportedLocale } from '@/i18n'
import { useAccessibility } from '@/composables/useAccessibility'
import { useKeyboardNavigation } from '@/composables/useKeyboardNavigation'
import LiveRegion from './LiveRegion.vue'

// 获取当前实例以访问全局属性
const instance = getCurrentInstance()
const globalProperties = instance?.appContext.config.globalProperties

// 组合式函数
const { generateId, preferHighContrast, announceToScreenReader } = useAccessibility()
const {
    currentIndex,
    handleKeyNavigation,
    resetNavigation,
    focusFirst,
    setCurrentIndex
} = useKeyboardNavigation()

// 模板引用
const containerRef = ref<HTMLElement>()
const triggerRef = ref<HTMLButtonElement>()
const dropdownRef = ref<HTMLElement>()
const menuItemRefs = ref<HTMLButtonElement[]>([])

// 状态
const isOpen = ref(false)
const liveMessage = ref('')

// 生成唯一ID用于ARIA标识
const dropdownId = generateId('language-dropdown')
const descriptionId = generateId('language-description')

// 计算属性
const currentLocale = computed(() => globalProperties?.$getCurrentLocale() || 'zh' as SupportedLocale)
const supportedLocales = computed(() => globalProperties?.$getSupportedLocales() || ['zh', 'en'] as SupportedLocale[])
const currentLocaleDisplay = computed(() => globalProperties?.$getLocaleDisplayName(currentLocale.value) || currentLocale.value)

// 获取语言显示名称
const getDisplayName = (locale: SupportedLocale) => {
    return globalProperties?.$getLocaleDisplayName(locale) || locale
}

// 切换下拉菜单
const toggleDropdown = () => {
    if (isOpen.value) {
        closeDropdown()
    } else {
        openDropdown()
    }
}

// 打开下拉菜单
const openDropdown = () => {
    isOpen.value = true
    resetNavigation()

    nextTick(() => {
        // 聚焦到当前选中的选项
        const currentIndex = supportedLocales.value.findIndex(locale => locale === currentLocale.value)
        if (currentIndex >= 0 && menuItemRefs.value[currentIndex]) {
            setCurrentIndex(currentIndex)
            menuItemRefs.value[currentIndex].focus()
        } else if (menuItemRefs.value.length > 0) {
            focusFirst(menuItemRefs.value)
        }
    })
}

// 关闭下拉菜单
const closeDropdown = () => {
    isOpen.value = false
    resetNavigation()

    // 返回焦点到触发按钮
    nextTick(() => {
        triggerRef.value?.focus()
    })
}

// 处理触发按钮的键盘事件
const handleTriggerKeydown = (event: KeyboardEvent) => {
    switch (event.key) {
        case 'ArrowDown':
        case 'ArrowUp':
        case 'Enter':
        case ' ': // Space
            event.preventDefault()
            openDropdown()
            break
        case 'Escape':
            if (isOpen.value) {
                event.preventDefault()
                closeDropdown()
            }
            break
    }
}

// 处理下拉菜单的键盘事件
const handleDropdownKeydown = (event: KeyboardEvent) => {
    handleKeyNavigation(event, {
        items: menuItemRefs.value,
        onSelect: (index) => {
            const locale = supportedLocales.value[index]
            if (locale) {
                handleLocaleChange(locale)
            }
        },
        onEscape: closeDropdown,
        onTab: closeDropdown,
        loop: true,
        orientation: 'vertical'
    })

    // 字符快速搜索
    if (event.key.length === 1 && /[a-zA-Z]/.test(event.key)) {
        const items = menuItemRefs.value
        const char = event.key.toLowerCase()

        for (let i = 0; i < items.length; i++) {
            const text = items[i].textContent?.toLowerCase().trim()
            if (text && text.startsWith(char)) {
                setCurrentIndex(i)
                items[i].focus()
                break
            }
        }
    }
}

// 处理鼠标悬停
const handleMouseEnter = (index: number) => {
    setCurrentIndex(index)
}

// 处理语言切换
const handleLocaleChange = (locale: SupportedLocale) => {
    const previousLocale = currentLocale.value
    const newLocaleName = getDisplayName(locale)

    // 执行语言切换
    globalProperties?.$switchLocale(locale)

    // 关闭下拉菜单
    closeDropdown()

    // 准备屏幕阅读器公告消息
    liveMessage.value = `语言已切换为${newLocaleName}`

    // 清空公告消息（触发后立即清空，避免重复播报）
    setTimeout(() => {
        liveMessage.value = ''
    }, 100)
}

// 点击外部关闭下拉菜单
const handleClickOutside = (event: Event) => {
    const target = event.target as HTMLElement
    if (containerRef.value && !containerRef.value.contains(target)) {
        closeDropdown()
    }
}

// ESC键全局监听
const handleGlobalEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && isOpen.value) {
        closeDropdown()
    }
}

// 生命周期
onMounted(() => {
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleGlobalEscape)
})

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
    document.removeEventListener('keydown', handleGlobalEscape)
})

// 监听下拉菜单打开状态，更新ARIA属性
watch(isOpen, (newValue) => {
    if (triggerRef.value) {
        triggerRef.value.setAttribute('aria-expanded', newValue.toString())
    }
})
</script>