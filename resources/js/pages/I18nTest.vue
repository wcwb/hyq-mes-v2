<template>
    <div class="min-h-screen bg-gray-50 py-8">
        <div class="max-w-4xl mx-auto px-4">
            <!-- 页面标题 -->
            <div class="text-center mb-8">
                <h1 class="text-3xl font-bold text-gray-900 mb-2">{{ $t('test.title') }}</h1>
                <p class="text-gray-600">{{ $t('test.description') }}</p>
                <!-- 语言切换器放在标题下方 -->
                <div class="mt-4 flex justify-center">
                    <LanguageSwitcher />
                </div>
            </div>

            <!-- 无障碍功能测试区域 -->
            <div class="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 class="text-xl font-semibold mb-4 text-blue-600">🔧 无障碍功能测试控制台</h2>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- 测试状态显示 -->
                    <div class="space-y-4">
                        <h3 class="font-medium text-gray-800">当前状态</h3>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span>当前语言:</span>
                                <span class="font-mono bg-gray-100 px-2 py-1 rounded">{{ currentLocale }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>减少动画模式:</span>
                                <span class="font-mono bg-gray-100 px-2 py-1 rounded">{{ preferReducedMotion() ? '启用' :
                                    '禁用' }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>高对比度模式:</span>
                                <span class="font-mono bg-gray-100 px-2 py-1 rounded">{{ preferHighContrast() ? '启用' :
                                    '禁用' }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>上次语言切换:</span>
                                <span class="font-mono bg-gray-100 px-2 py-1 rounded text-xs">{{ lastLanguageChange ||
                                    '无' }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- 键盘测试指南 -->
                    <div class="space-y-4">
                        <h3 class="font-medium text-gray-800">键盘测试指南</h3>
                        <div class="text-sm space-y-2">
                            <div class="flex items-center space-x-2">
                                <kbd class="px-2 py-1 text-xs bg-gray-200 rounded border">Tab</kbd>
                                <span>→ 聚焦到语言切换器</span>
                            </div>
                            <div class="flex items-center space-x-2">
                                <kbd class="px-2 py-1 text-xs bg-gray-200 rounded border">Enter</kbd>
                                <span>→ 打开/选择</span>
                            </div>
                            <div class="flex items-center space-x-2">
                                <kbd class="px-2 py-1 text-xs bg-gray-200 rounded border">↑↓</kbd>
                                <span>→ 上下导航</span>
                            </div>
                            <div class="flex items-center space-x-2">
                                <kbd class="px-2 py-1 text-xs bg-gray-200 rounded border">Esc</kbd>
                                <span>→ 关闭菜单</span>
                            </div>
                            <div class="flex items-center space-x-2">
                                <kbd class="px-2 py-1 text-xs bg-gray-200 rounded border">E/Z</kbd>
                                <span>→ 字符快速搜索</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 实时公告日志 -->
                <div class="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 class="font-medium text-gray-800 mb-2">屏幕阅读器公告日志</h3>
                    <div class="text-sm font-mono text-gray-600 min-h-[40px]">
                        <div v-if="announcements.length === 0" class="text-gray-400 italic">
                            等待语言切换事件...
                        </div>
                        <div v-for="(announcement, index) in announcements" :key="index"
                            class="py-1 border-b border-gray-200 last:border-b-0">
                            <span class="text-xs text-gray-400">[{{ announcement.time }}]</span>
                            {{ announcement.message }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- 原有的测试区域 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <!-- 基础翻译测试 -->
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h2 class="text-xl font-semibold mb-4">{{ $t('test.sections.basicTranslations') }}</h2>
                    <div class="space-y-3">
                        <div><strong>{{ $t('test.labels.greeting') }}:</strong> {{ $t('greeting') }}</div>
                        <div><strong>{{ $t('test.labels.currentLanguage') }}:</strong> {{ currentLocale }}</div>
                        <div><strong>{{ $t('test.labels.supportedLanguages') }}:</strong> {{ supportedLocales.join(', ')
                        }}</div>
                    </div>
                </div>

                <!-- 菜单项测试 -->
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h2 class="text-xl font-semibold mb-4">{{ $t('test.labels.menuItems') }}</h2>
                    <ul class="space-y-2">
                        <li v-for="(item, key) in menuItems" :key="key">
                            <strong>{{ key }}:</strong> {{ item }}
                        </li>
                    </ul>
                </div>

                <!-- 表单字段测试 -->
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h2 class="text-xl font-semibold mb-4">{{ $t('test.labels.formFields') }}</h2>
                    <ul class="space-y-2">
                        <li v-for="(item, key) in formFields" :key="key">
                            <strong>{{ key }}:</strong> {{ item }}
                        </li>
                    </ul>
                </div>

                <!-- 回退测试 -->
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h2 class="text-xl font-semibold mb-4">{{ $t('test.sections.fallbackTests') }}</h2>
                    <div class="space-y-3">
                        <div>
                            <strong>不存在的键:</strong>
                            <span class="text-red-500">{{ $t('nonexistent.key') }}</span>
                        </div>
                        <div>
                            <strong>嵌套不存在的键:</strong>
                            <span class="text-red-500">{{ $t('menu.nonexistent.deep.key') }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher.vue'
import { useAccessibility } from '@/composables/useAccessibility'

const { t, locale } = useI18n()
const { preferReducedMotion, preferHighContrast } = useAccessibility()

// 状态跟踪
const lastLanguageChange = ref<string>('')
const announcements = ref<Array<{ time: string, message: string }>>([])

// 计算属性
const currentLocale = computed(() => locale.value)
const supportedLocales = computed(() => ['zh', 'en'])

const menuItems = computed(() => ({
    home: t('menu.home'),
    about: t('menu.about'),
    products: t('menu.products'),
    contact: t('menu.contact')
}))

const formFields = computed(() => ({
    name: t('form.name'),
    email: t('form.email'),
    password: t('form.password'),
    confirmPassword: t('form.confirmPassword')
}))

// 监听语言变更事件
const handleLanguageChange = () => {
    const now = new Date().toLocaleTimeString()
    lastLanguageChange.value = now

    // 添加到公告日志
    announcements.value.unshift({
        time: now,
        message: `语言已切换为 ${locale.value === 'zh' ? '中文' : 'English'}`
    })

    // 保持日志最多10条
    if (announcements.value.length > 10) {
        announcements.value = announcements.value.slice(0, 10)
    }
}

// 监听语言变更
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'lang') {
            handleLanguageChange()
        }
    })
})

onMounted(() => {
    // 监听HTML lang属性变化
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['lang']
    })

    // 监听 Live Region 更新
    const liveRegions = document.querySelectorAll('[aria-live]')
    liveRegions.forEach(region => {
        const regionObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' || mutation.type === 'characterData') {
                    const content = (mutation.target as HTMLElement).textContent?.trim()
                    if (content && content.includes('语言已切换')) {
                        const now = new Date().toLocaleTimeString()
                        announcements.value.unshift({
                            time: now,
                            message: content
                        })

                        if (announcements.value.length > 10) {
                            announcements.value = announcements.value.slice(0, 10)
                        }
                    }
                }
            })
        })

        regionObserver.observe(region, {
            childList: true,
            characterData: true,
            subtree: true
        })
    })
})

onUnmounted(() => {
    observer.disconnect()
})
</script>