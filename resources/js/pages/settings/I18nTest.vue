<template>
    <!-- SEO优化的Meta标签 -->

    <Head>
        <title>{{ $t('test.title') }}</title>
    </Head>

    <PageHead :title="$t('meta.i18nTest.title')" :description="$t('meta.i18nTest.description')"
        :keywords="$t('meta.i18nTest.keywords')" :canonical="canonical" og-type="website" />

    <div class="min-h-screen bg-gray-50 py-8">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <!-- 页面标题 -->
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-gray-900">{{ $t('test.title') }}</h1>
                <p class="mt-2 text-lg text-gray-600">{{ $t('test.description') }}</p>
            </div>

            <!-- 语言切换器 -->
            <div class="mb-8 bg-white rounded-lg shadow p-6">
                <h2 class="text-xl font-semibold mb-4">{{ $t('test.sections.languageSwitcher') }}</h2>
                <LanguageSwitcher />
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
                                <span class="text-gray-700">{{ t('test.labels.currentLanguage') }}:</span>
                                <span class="font-mono bg-gray-100 px-2 py-1 rounded text-gray-900">{{
                                    getCurrentLocale() }}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-gray-700">减少动画模式:</span>
                                <div class="flex items-center space-x-2">
                                    <span class="font-mono bg-gray-100 px-2 py-1 rounded text-gray-900"
                                        :class="{ 'bg-green-100 text-green-800': isReducedMotionMode, 'bg-red-100 text-red-800': !isReducedMotionMode }">
                                        {{ isReducedMotionMode ? '启用' : '禁用' }}
                                    </span>
                                    <button @click="toggleReducedMotion"
                                        class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                                        切换
                                    </button>
                                </div>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-gray-700">高对比度模式:</span>
                                <div class="flex items-center space-x-2">
                                    <span class="font-mono bg-gray-100 px-2 py-1 rounded text-gray-900"
                                        :class="{ 'bg-green-100 text-green-800': isHighContrastMode, 'bg-red-100 text-red-800': !isHighContrastMode }">
                                        {{ isHighContrastMode ? '启用' : '禁用' }}
                                    </span>
                                    <button @click="toggleHighContrast"
                                        class="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors">
                                        切换
                                    </button>
                                </div>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-700">上次语言切换:</span>
                                <span class="font-mono bg-gray-100 px-2 py-1 rounded text-xs text-gray-900">{{
                                    lastLanguageChange || '无' }}</span>
                            </div>
                        </div>

                        <!-- 系统偏好检测 -->
                        <div class="mt-4 p-3 bg-gray-50 rounded border">
                            <h4 class="text-sm font-medium text-gray-700 mb-2">系统偏好检测</h4>
                            <div class="text-xs space-y-1">
                                <div class="flex justify-between">
                                    <span class="text-gray-600">系统减少动画:</span>
                                    <span class="font-mono">{{ preferReducedMotion() ? '是' : '否' }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">系统高对比度:</span>
                                    <span class="font-mono">{{ preferHighContrast() ? '是' : '否' }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 键盘测试指南 -->
                    <div class="space-y-4">
                        <h3 class="font-medium text-gray-800">键盘测试指南</h3>
                        <div class="text-sm space-y-2">
                            <div class="flex items-center space-x-2">
                                <kbd class="px-2 py-1 text-xs bg-gray-200 rounded border font-mono">Tab</kbd>
                                <span class="text-gray-700">→ 聚焦到语言切换器</span>
                            </div>
                            <div class="flex items-center space-x-2">
                                <kbd class="px-2 py-1 text-xs bg-gray-200 rounded border font-mono">Enter</kbd>
                                <span class="text-gray-700">→ 打开/选择</span>
                            </div>
                            <div class="flex items-center space-x-2">
                                <kbd class="px-2 py-1 text-xs bg-gray-200 rounded border font-mono">↑↓</kbd>
                                <span class="text-gray-700">→ 上下导航</span>
                            </div>
                            <div class="flex items-center space-x-2">
                                <kbd class="px-2 py-1 text-xs bg-gray-200 rounded border font-mono">Esc</kbd>
                                <span class="text-gray-700">→ 关闭菜单</span>
                            </div>
                            <div class="flex items-center space-x-2">
                                <kbd class="px-2 py-1 text-xs bg-gray-200 rounded border font-mono">E/Z</kbd>
                                <span class="text-gray-700">→ 字符快速搜索</span>
                            </div>
                        </div>

                        <!-- 功能测试按钮 -->
                        <div class="mt-6 space-y-3">
                            <h4 class="font-medium text-gray-800">功能测试</h4>
                            <div class="space-y-2">
                                <button @click="testScreenReaderAnnouncement"
                                    class="w-full px-3 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
                                    测试屏幕阅读器公告
                                </button>
                                <button @click="testFocusManagement"
                                    class="w-full px-3 py-2 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors">
                                    测试焦点管理
                                </button>
                                <button @click="testKeyboardNavigation"
                                    class="w-full px-3 py-2 text-sm bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors">
                                    显示键盘导航提示
                                </button>
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

            <!-- 翻译测试区域 -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- 基础翻译测试 -->
                <div class="bg-white rounded-lg shadow p-6">
                    <h2 class="text-xl font-semibold mb-4">{{ $t('test.sections.basicTranslations') }}</h2>
                    <div class="space-y-3">
                        <div>
                            <label class="font-medium text-gray-700">{{ $t('test.labels.greeting') }}:</label>
                            <span class="ml-2 text-gray-900">{{ $t('greeting') }}</span>
                        </div>
                        <div>
                            <label class="font-medium text-gray-700">{{ $t('test.labels.currentLanguage') }}:</label>
                            <span class="ml-2 text-gray-900">{{ getCurrentLocale() }}</span>
                        </div>
                        <div>
                            <label class="font-medium text-gray-700">{{ $t('test.labels.supportedLanguages') }}:</label>
                            <span class="ml-2 text-gray-900">{{ getSupportedLocales().join(', ') }}</span>
                        </div>
                    </div>
                </div>

                <!-- 回退机制测试 -->
                <div class="bg-white rounded-lg shadow p-6">
                    <h2 class="text-xl font-semibold mb-4">{{ $t('test.sections.fallbackTests') }}</h2>
                    <div class="space-y-3">
                        <div>
                            <label class="font-medium text-gray-700">存在的键:</label>
                            <span class="ml-2 text-gray-900">{{ $t('button.submit') }}</span>
                            <span class="ml-2 text-xs text-green-600">✓</span>
                        </div>
                        <div>
                            <label class="font-medium text-gray-700">不存在的键:</label>
                            <span class="ml-2 text-gray-900">{{ $t('nonexistent.key') }}</span>
                            <span class="ml-2 text-xs text-orange-600">⚠️ 回退</span>
                        </div>
                        <div>
                            <label class="font-medium text-gray-700">安全翻译（带自定义回退）:</label>
                            <span class="ml-2 text-gray-900">{{ safeTranslate('missing.key', '默认文本') }}</span>
                            <span class="ml-2 text-xs text-blue-600">🛡️ 安全</span>
                        </div>
                        <div>
                            <label class="font-medium text-gray-700">键存在检查:</label>
                            <span class="ml-2 text-gray-900">
                                button.submit: {{ hasTranslation('button.submit') ? '✅' : '❌' }}
                            </span>
                        </div>
                        <div>
                            <label class="font-medium text-gray-700">键不存在检查:</label>
                            <span class="ml-2 text-gray-900">
                                missing.key: {{ hasTranslation('missing.key') ? '✅' : '❌' }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- 嵌套翻译测试 -->
                <div class="bg-white rounded-lg shadow p-6">
                    <h2 class="text-xl font-semibold mb-4">{{ $t('test.sections.nestedTranslations') }}</h2>
                    <div class="space-y-3">
                        <div>
                            <label class="font-medium text-gray-700">{{ $t('test.labels.menuItems') }}:</label>
                            <ul class="mt-2 list-disc list-inside text-gray-900">
                                <li>{{ $t('menu.home') }}</li>
                                <li>{{ $t('menu.about') }}</li>
                                <li>{{ $t('menu.dashboard') }}</li>
                            </ul>
                        </div>
                        <div>
                            <label class="font-medium text-gray-700">{{ $t('test.labels.formFields') }}:</label>
                            <ul class="mt-2 list-disc list-inside text-gray-900">
                                <li>{{ $t('form.email') }}</li>
                                <li>{{ $t('form.password') }}</li>
                                <li>{{ $t('form.rememberMe') }}</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- 开发工具 -->
                <div class="bg-white rounded-lg shadow p-6">
                    <h2 class="text-xl font-semibold mb-4">{{ $t('test.sections.devTools') }}</h2>
                    <div class="space-y-4">
                        <div>
                            <p class="text-sm text-gray-600 mb-2">在开发环境中，缺失的翻译会记录到控制台</p>
                            <button @click="testMissingTranslations"
                                class="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors">
                                触发缺失翻译测试
                            </button>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600 mb-2">查看翻译完整性报告</p>
                            <button @click="showCompletenessReport"
                                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                                显示完整性报告
                            </button>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600 mb-2">显示所有缺失的翻译键</p>
                            <button @click="showMissingKeys"
                                class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors">
                                显示缺失键列表
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 测试结果显示区域 -->
            <div v-if="testResults.length > 0" class="mt-8 bg-gray-900 text-green-400 rounded-lg p-4">
                <h3 class="text-lg font-semibold mb-2">测试结果:</h3>
                <pre class="text-sm overflow-x-auto">{{ testResults.join('\n') }}</pre>
                <button @click="clearResults" class="mt-2 text-xs text-gray-400 hover:text-white">
                    清除结果
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Head } from '@inertiajs/vue3'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher.vue'
import PageHead from '@/components/ui/PageHead.vue'
import {
    getCurrentLocale,
    getSupportedLocales,
    safeTranslate,
    hasTranslation,
    checkTranslationCompleteness
} from '@/i18n'
import { useAccessibility } from '@/composables/useAccessibility'

// 页面标题设置
defineOptions({
    layout: false
})

const { t, locale } = useI18n()
const { preferReducedMotion, preferHighContrast, announceToScreenReader } = useAccessibility()
const testResults = ref<string[]>([])

// 无障碍功能状态跟踪
const lastLanguageChange = ref<string>('')
const announcements = ref<Array<{ time: string, message: string }>>([])

// 手动控制的无障碍模式状态
const isReducedMotionMode = ref(false)
const isHighContrastMode = ref(false)

// SEO Meta标签配置
const canonical = computed(() => `${window.location.origin}/i18n-test`)

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

// 测试缺失翻译功能
function testMissingTranslations() {
    const testKeys = [
        'test.missing.key1',
        'test.missing.key2',
        'nonexistent.deeply.nested.key',
        'another.missing.translation'
    ]

    testResults.value = []
    testResults.value.push('=== 缺失翻译测试 ===')

    testKeys.forEach(key => {
        const translation = t(key)
        testResults.value.push(`${key}: "${translation}"`)
    })

    testResults.value.push('')
    testResults.value.push('请检查浏览器控制台查看警告信息')
}

// 显示翻译完整性报告
function showCompletenessReport() {
    const report = checkTranslationCompleteness('zh', 'en')

    testResults.value = []
    testResults.value.push('=== 翻译完整性报告 ===')
    testResults.value.push(`完整性: ${report.completeness}%`)

    if (report.missingKeys.length > 0) {
        testResults.value.push('')
        testResults.value.push('缺失的键:')
        report.missingKeys.forEach(key => {
            testResults.value.push(`  - ${key}`)
        })
    }

    if (report.extraKeys.length > 0) {
        testResults.value.push('')
        testResults.value.push('额外的键:')
        report.extraKeys.forEach(key => {
            testResults.value.push(`  - ${key}`)
        })
    }
}

// 显示缺失的翻译键
function showMissingKeys() {
    if (typeof window !== 'undefined' && window.__showMissingI18nKeys__) {
        const missingKeys = window.__showMissingI18nKeys__()

        testResults.value = []
        testResults.value.push('=== 运行时缺失的翻译键 ===')

        if (missingKeys.length === 0) {
            testResults.value.push('🎉 没有发现缺失的翻译键！')
        } else {
            testResults.value.push(`总计: ${missingKeys.length} 个缺失的键`)
            testResults.value.push('')
            missingKeys.forEach(key => {
                testResults.value.push(`  - ${key}`)
            })
        }
    } else {
        testResults.value = ['开发工具不可用 (仅在开发环境)']
    }
}

// 清除测试结果
function clearResults() {
    testResults.value = []
}

// 切换减少动画模式
function toggleReducedMotion() {
    isReducedMotionMode.value = !isReducedMotionMode.value
    const status = isReducedMotionMode.value ? '启用' : '禁用'
    announceToScreenReader(`减少动画模式已${status}`)

    // 将状态应用到页面
    if (isReducedMotionMode.value) {
        document.documentElement.style.setProperty('--animation-duration', '0s')
        document.documentElement.style.setProperty('--transition-duration', '0s')
    } else {
        document.documentElement.style.removeProperty('--animation-duration')
        document.documentElement.style.removeProperty('--transition-duration')
    }
}

// 切换高对比度模式
function toggleHighContrast() {
    isHighContrastMode.value = !isHighContrastMode.value
    const status = isHighContrastMode.value ? '启用' : '禁用'
    announceToScreenReader(`高对比度模式已${status}`)

    // 将状态应用到页面
    if (isHighContrastMode.value) {
        document.documentElement.classList.add('high-contrast-mode')
    } else {
        document.documentElement.classList.remove('high-contrast-mode')
    }
}

// 测试屏幕阅读器公告
function testScreenReaderAnnouncement() {
    const messages = [
        '这是一个测试公告',
        '屏幕阅读器应该能听到这条消息',
        '无障碍功能正常工作'
    ]
    const randomMessage = messages[Math.floor(Math.random() * messages.length)]
    announceToScreenReader(randomMessage)

    // 同时更新视觉日志
    const now = new Date().toLocaleTimeString()
    announcements.value.unshift({
        time: now,
        message: `[测试] ${randomMessage}`
    })

    if (announcements.value.length > 10) {
        announcements.value = announcements.value.slice(0, 10)
    }
}

// 测试焦点管理
function testFocusManagement() {
    const languageSwitcher = document.querySelector('[role="combobox"]') as HTMLElement
    if (languageSwitcher) {
        languageSwitcher.focus()
        announceToScreenReader('焦点已移动到语言切换器')
    } else {
        announceToScreenReader('未找到语言切换器元素')
    }
}

// 显示键盘导航提示
function testKeyboardNavigation() {
    const tips = [
        '请尝试使用 Tab 键导航到语言切换器',
        '按下 Enter 键打开语言菜单',
        '使用上下箭头键选择语言',
        '按 Esc 键关闭菜单',
        '尝试按 E 或 Z 键快速搜索语言'
    ]

    tips.forEach((tip, index) => {
        setTimeout(() => {
            announceToScreenReader(tip)
            const now = new Date().toLocaleTimeString()
            announcements.value.unshift({
                time: now,
                message: `[导航提示] ${tip}`
            })
        }, index * 2000)
    })
}

onMounted(() => {
    // 初始化时检测系统偏好设置
    isReducedMotionMode.value = preferReducedMotion()
    isHighContrastMode.value = preferHighContrast()

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

<style>
/* 高对比度模式样式 */
.high-contrast-mode {
    --tw-bg-white: #000000;
    --tw-text-gray-900: #ffffff;
    --tw-text-gray-700: #ffff00;
    --tw-bg-gray-100: #333333;
    --tw-border-gray-200: #ffffff;
}

.high-contrast-mode .bg-white {
    background-color: #000000 !important;
    color: #ffffff !important;
}

.high-contrast-mode .text-gray-900,
.high-contrast-mode .text-gray-700,
.high-contrast-mode .text-gray-600 {
    color: #ffffff !important;
}

.high-contrast-mode .bg-gray-100 {
    background-color: #333333 !important;
    color: #ffffff !important;
}

.high-contrast-mode .border-gray-200 {
    border-color: #ffffff !important;
}

.high-contrast-mode button {
    border: 2px solid #ffffff !important;
}

/* 减少动画模式CSS变量支持 */
* {
    animation-duration: var(--animation-duration, 0.3s);
    transition-duration: var(--transition-duration, 0.15s);
}

/* 屏幕阅读器专用类 */
.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}
</style>