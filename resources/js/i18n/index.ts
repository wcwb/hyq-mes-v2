import { createI18n } from 'vue-i18n'
import { messages } from './locales'

// 支持的语言列表
const supportedLocales = ['zh', 'en'] as const
type SupportedLocale = typeof supportedLocales[number]

// 检测浏览器语言
function detectBrowserLanguage(): SupportedLocale {
    const browserLang = navigator.language.toLowerCase()

    // 检查是否直接匹配支持的语言
    if (supportedLocales.includes(browserLang as SupportedLocale)) {
        return browserLang as SupportedLocale
    }

    // 检查语言前缀（如 zh-CN -> zh）
    const langPrefix = browserLang.split('-')[0] as SupportedLocale
    if (supportedLocales.includes(langPrefix)) {
        return langPrefix
    }

    // 默认返回英文
    return 'en'
}

// 从 localStorage 获取保存的语言，如果没有则检测浏览器语言
function getInitialLocale(): SupportedLocale {
    const savedLocale = localStorage.getItem('locale') as SupportedLocale

    if (savedLocale && supportedLocales.includes(savedLocale)) {
        return savedLocale
    }

    return detectBrowserLanguage()
}

// 开发环境缺失翻译处理器
function missingHandler(locale: string, key: string): string {
    if (import.meta.env.DEV) {
        console.warn(`[i18n] 缺失翻译键: "${key}" (语言: ${locale})`)

        // 记录到开发工具
        if (typeof window !== 'undefined' && window.__VUE_I18N_MISSING_KEYS__) {
            window.__VUE_I18N_MISSING_KEYS__.add(`${locale}.${key}`)
        }
    }

    // 返回键名作为回退显示，便于开发时识别
    return `[${key}]`
}

// 翻译完整性检查工具
export function checkTranslationCompleteness(targetLocale: SupportedLocale = 'zh', referenceLocale: SupportedLocale = 'en') {
    const targetMessages = messages[targetLocale] || {}
    const referenceMessages = messages[referenceLocale] || {}

    const missingKeys: string[] = []
    const extraKeys: string[] = []

    // 递归检查键的完整性
    function checkKeys(refObj: any, targetObj: any, prefix = '') {
        for (const key in refObj) {
            const currentKey = prefix ? `${prefix}.${key}` : key

            if (!(key in targetObj)) {
                missingKeys.push(currentKey)
            } else if (typeof refObj[key] === 'object' && typeof targetObj[key] === 'object') {
                checkKeys(refObj[key], targetObj[key], currentKey)
            }
        }

        // 检查目标语言中多余的键
        for (const key in targetObj) {
            const currentKey = prefix ? `${prefix}.${key}` : key

            if (!(key in refObj)) {
                extraKeys.push(currentKey)
            }
        }
    }

    checkKeys(referenceMessages, targetMessages)

    const result = {
        missingKeys,
        extraKeys,
        completeness: ((Object.keys(referenceMessages).length - missingKeys.length) / Object.keys(referenceMessages).length * 100).toFixed(2)
    }

    if (import.meta.env.DEV) {
        console.group(`[i18n] 翻译完整性检查 (${targetLocale} vs ${referenceLocale})`)
        console.log(`完整性: ${result.completeness}%`)
        if (missingKeys.length > 0) {
            console.warn('缺失的键:', missingKeys)
        }
        if (extraKeys.length > 0) {
            console.info('额外的键:', extraKeys)
        }
        console.groupEnd()
    }

    return result
}

// 初始化开发环境的缺失键追踪
if (import.meta.env.DEV && typeof window !== 'undefined') {
    window.__VUE_I18N_MISSING_KEYS__ = new Set()

    // 提供全局方法查看缺失的键
    window.__showMissingI18nKeys__ = () => {
        const missingKeys = Array.from(window.__VUE_I18N_MISSING_KEYS__ || [])
        if (missingKeys.length === 0) {
            console.log('[i18n] 🎉 没有发现缺失的翻译键！')
        } else {
            console.group('[i18n] 缺失的翻译键列表:')
            missingKeys.forEach(key => console.log(`- ${key}`))
            console.groupEnd()
            console.log(`总计: ${missingKeys.length} 个缺失的键`)
        }
        return missingKeys
    }
}

// 创建 i18n 实例
const i18n = createI18n({
    legacy: false, // 使用 Composition API 模式
    locale: getInitialLocale(), // 智能检测初始语言
    fallbackLocale: 'en', // 回退语言
    messages, // 翻译消息
    missing: missingHandler, // 缺失翻译处理器
    fallbackWarn: import.meta.env.DEV, // 开发环境显示回退警告
    missingWarn: import.meta.env.DEV, // 开发环境显示缺失警告
    silentTranslationWarn: !import.meta.env.DEV, // 生产环境静默翻译警告
    silentFallbackWarn: !import.meta.env.DEV, // 生产环境静默回退警告
})

// 语言切换函数
export function setLocale(locale: SupportedLocale) {
    if (!supportedLocales.includes(locale)) {
        console.warn(`不支持的语言: ${locale}`)
        return
    }

    // 更新 i18n 实例的语言
    i18n.global.locale.value = locale

    // 保存到 localStorage
    localStorage.setItem('locale', locale)

    // 更新 HTML lang 属性
    document.documentElement.lang = locale
}

// 获取当前语言
export function getCurrentLocale(): SupportedLocale {
    return i18n.global.locale.value as SupportedLocale
}

// 获取支持的语言列表
export function getSupportedLocales() {
    return [...supportedLocales]
}

// 安全的翻译函数，提供更好的回退机制
export function safeTranslate(key: string, fallback?: string): string {
    const { t } = i18n.global

    try {
        const translation = t(key)

        // 检查是否返回了键名（表示翻译缺失）
        if (translation === key || translation.startsWith('[') && translation.endsWith(']')) {
            return fallback || key
        }

        return translation
    } catch (error) {
        console.warn(`[i18n] 翻译错误: ${key}`, error)
        return fallback || key
    }
}

// 检查翻译键是否存在
export function hasTranslation(key: string, locale?: SupportedLocale): boolean {
    const checkLocale = locale || getCurrentLocale()
    const localeMessages = messages[checkLocale] as Record<string, any>

    if (!localeMessages) return false

    // 支持嵌套键检查 (如 'page.auth.login.title')
    const keys = key.split('.')
    let current: any = localeMessages

    for (const k of keys) {
        if (typeof current !== 'object' || !(k in current)) {
            return false
        }
        current = current[k]
    }

    return typeof current === 'string'
}

// 初始化时设置 HTML lang 属性
document.documentElement.lang = getInitialLocale()

// 热重载支持
if (import.meta.env.DEV && typeof window !== 'undefined') {
    // 监听locale文件更新事件
    window.addEventListener('i18n-locale-reload', async (event: Event) => {
        const customEvent = event as CustomEvent<{ locale: string }>
        const { locale } = customEvent.detail
        console.log(`🔄 重新加载locale文件: ${locale}`)

        try {
            // 动态重新导入locale文件
            const moduleId = `/resources/js/i18n/locales/${locale}.json`

            // 删除模块缓存，强制重新加载
            if (import.meta.hot) {
                import.meta.hot.invalidate()
            }

            // 重新加载locale数据
            const response = await fetch(`/api/i18n/locales/${locale}.json`)
            if (response.ok) {
                const newMessages = await response.json()

                // 更新i18n实例中的消息
                i18n.global.setLocaleMessage(locale as SupportedLocale, newMessages)

                console.log(`✅ ${locale} locale已更新`)

                // 触发页面重新渲染
                if (getCurrentLocale() === locale) {
                    // 通过临时切换语言来强制更新
                    const currentLocale = getCurrentLocale()
                    const tempLocale = currentLocale === 'zh' ? 'en' : 'zh'
                    i18n.global.locale.value = tempLocale
                    setTimeout(() => {
                        i18n.global.locale.value = currentLocale
                    }, 10)
                }
            }
        } catch (error) {
            console.error(`❌ 重新加载${locale} locale失败:`, error)
        }
    })

    // 导入热重载客户端处理器
    import('../plugins/i18n-client-hmr').then(({ setupI18nHMR }) => {
        setupI18nHMR()
    })
}

// 开发环境自动运行翻译完整性检查
if (import.meta.env.DEV) {
    // 延迟执行，确保所有模块都已加载
    setTimeout(() => {
        checkTranslationCompleteness('zh', 'en')
    }, 1000)
}

export default i18n
export type { SupportedLocale }
