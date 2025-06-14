import { useI18n as useVueI18n } from 'vue-i18n'
import { computed } from 'vue'
import { setLocale, getCurrentLocale, getSupportedLocales, type SupportedLocale } from '@/i18n'

/**
 * 国际化 composable
 * 提供翻译、语言切换等功能
 */
export function useI18n() {
    const { t, locale } = useVueI18n()

    // 当前语言
    const currentLocale = computed(() => getCurrentLocale())

    // 支持的语言列表
    const supportedLocales = getSupportedLocales()

    // 语言切换函数
    const switchLocale = (newLocale: SupportedLocale) => {
        setLocale(newLocale)
    }

    // 检查是否为当前语言
    const isCurrentLocale = (locale: SupportedLocale) => {
        return currentLocale.value === locale
    }

    // 获取语言显示名称
    const getLocaleDisplayName = (locale: SupportedLocale) => {
        const displayNames: Record<SupportedLocale, string> = {
            zh: '中文',
            en: 'English'
        }
        return displayNames[locale] || locale
    }

    return {
        // vue-i18n 原生功能
        t,
        locale,

        // 扩展功能
        currentLocale,
        supportedLocales,
        switchLocale,
        isCurrentLocale,
        getLocaleDisplayName,
    }
} 