import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getCurrentLocale } from '@/i18n'

// 页面Meta信息接口
interface PageMetaOptions {
    title?: string
    description?: string
    keywords?: string
    ogTitle?: string
    ogDescription?: string
    ogImage?: string
    ogType?: string
    twitterCard?: string
    twitterTitle?: string
    twitterDescription?: string
    twitterImage?: string
    canonical?: string
    robots?: string
}

// 默认的Meta信息
const defaultMeta: Required<PageMetaOptions> = {
    title: '',
    description: '',
    keywords: '',
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
    ogType: 'website',
    twitterCard: 'summary_large_image',
    twitterTitle: '',
    twitterDescription: '',
    twitterImage: '',
    canonical: '',
    robots: 'index,follow'
}

// 全局Meta状态
const globalMeta = ref<PageMetaOptions>({})

/**
 * 页面Meta管理组合式函数
 * 提供响应式的页面Meta信息管理，支持i18n
 */
export function usePageMeta(options: PageMetaOptions = {}) {
    const { t } = useI18n()
    const locale = ref(getCurrentLocale())

    // 监听语言变化，更新locale引用
    watch(
        () => getCurrentLocale(),
        (newLocale) => {
            locale.value = newLocale
            updateDocumentMeta()
        }
    )

    // 合并默认Meta和传入的选项
    const mergedMeta = computed(() => ({
        ...defaultMeta,
        ...globalMeta.value,
        ...options
    }))

    // 生成最终的Meta信息，支持i18n翻译
    const finalMeta = computed(() => {
        const meta = mergedMeta.value

        return {
            title: meta.title ? (meta.title.startsWith('meta.') ? t(meta.title) : meta.title) : '',
            description: meta.description ? (meta.description.startsWith('meta.') ? t(meta.description) : meta.description) : '',
            keywords: meta.keywords ? (meta.keywords.startsWith('meta.') ? t(meta.keywords) : meta.keywords) : '',
            ogTitle: meta.ogTitle || meta.title,
            ogDescription: meta.ogDescription || meta.description,
            ogImage: meta.ogImage,
            ogType: meta.ogType,
            twitterCard: meta.twitterCard,
            twitterTitle: meta.twitterTitle || meta.ogTitle || meta.title,
            twitterDescription: meta.twitterDescription || meta.ogDescription || meta.description,
            twitterImage: meta.twitterImage || meta.ogImage,
            canonical: meta.canonical,
            robots: meta.robots
        }
    })

    // 格式化页面标题（添加站点名称）
    const formattedTitle = computed(() => {
        const pageTitle = finalMeta.value.title
        const siteName = t('site.name')

        if (!pageTitle) return siteName
        return `${pageTitle} - ${siteName}`
    })

    // 生成Meta标签对象，适用于Inertia.js Head组件
    const metaTags = computed(() => ({
        title: formattedTitle.value,
        meta: [
            // 基础Meta标签
            { name: 'description', content: finalMeta.value.description },
            { name: 'keywords', content: finalMeta.value.keywords },
            { name: 'robots', content: finalMeta.value.robots },

            // Open Graph Meta标签
            { property: 'og:type', content: finalMeta.value.ogType },
            { property: 'og:title', content: finalMeta.value.ogTitle },
            { property: 'og:description', content: finalMeta.value.ogDescription },
            { property: 'og:image', content: finalMeta.value.ogImage },
            { property: 'og:locale', content: locale.value === 'zh' ? 'zh_CN' : 'en_US' },

            // Twitter Card Meta标签
            { name: 'twitter:card', content: finalMeta.value.twitterCard },
            { name: 'twitter:title', content: finalMeta.value.twitterTitle },
            { name: 'twitter:description', content: finalMeta.value.twitterDescription },
            { name: 'twitter:image', content: finalMeta.value.twitterImage },

            // 语言和编码
            { 'http-equiv': 'Content-Language', content: locale.value },
        ].filter(tag => tag.content), // 过滤掉空内容的标签

        // Canonical链接
        ...(finalMeta.value.canonical ? { link: [{ rel: 'canonical', href: finalMeta.value.canonical }] } : {})
    }))

    // 更新文档的Meta信息（用于非Inertia.js场景）
    function updateDocumentMeta() {
        if (typeof document === 'undefined') return

        // 更新页面标题
        document.title = formattedTitle.value

        // 更新HTML lang属性
        document.documentElement.lang = locale.value

        // 更新Meta标签
        updateMetaTag('description', finalMeta.value.description)
        updateMetaTag('keywords', finalMeta.value.keywords)
        updateMetaTag('robots', finalMeta.value.robots)

        // 更新Open Graph标签
        updateMetaTag('og:type', finalMeta.value.ogType, 'property')
        updateMetaTag('og:title', finalMeta.value.ogTitle, 'property')
        updateMetaTag('og:description', finalMeta.value.ogDescription, 'property')
        updateMetaTag('og:image', finalMeta.value.ogImage, 'property')
        updateMetaTag('og:locale', locale.value === 'zh' ? 'zh_CN' : 'en_US', 'property')

        // 更新Twitter Card标签
        updateMetaTag('twitter:card', finalMeta.value.twitterCard)
        updateMetaTag('twitter:title', finalMeta.value.twitterTitle)
        updateMetaTag('twitter:description', finalMeta.value.twitterDescription)
        updateMetaTag('twitter:image', finalMeta.value.twitterImage)

        // 更新Canonical链接
        updateCanonicalLink(finalMeta.value.canonical)
    }

    // 辅助函数：更新或创建Meta标签
    function updateMetaTag(name: string, content: string, attribute: 'name' | 'property' = 'name') {
        if (!content) return

        let meta = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement

        if (!meta) {
            meta = document.createElement('meta')
            meta.setAttribute(attribute, name)
            document.head.appendChild(meta)
        }

        meta.setAttribute('content', content)
    }

    // 辅助函数：更新Canonical链接
    function updateCanonicalLink(href: string) {
        let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement

        if (href) {
            if (!link) {
                link = document.createElement('link')
                link.setAttribute('rel', 'canonical')
                document.head.appendChild(link)
            }
            link.setAttribute('href', href)
        } else if (link) {
            link.remove()
        }
    }

    // 设置全局Meta信息
    function setGlobalMeta(meta: PageMetaOptions) {
        globalMeta.value = { ...globalMeta.value, ...meta }
    }

    // 获取结构化数据（JSON-LD）
    function getStructuredData(type: 'website' | 'article' | 'breadcrumb' = 'website') {
        const baseData = {
            '@context': 'https://schema.org',
            '@type': type === 'website' ? 'WebSite' : 'Article',
            name: finalMeta.value.title,
            description: finalMeta.value.description,
            url: finalMeta.value.canonical || window.location.href,
            inLanguage: locale.value,
        }

        if (type === 'website') {
            return {
                ...baseData,
                potentialAction: {
                    '@type': 'SearchAction',
                    target: `${window.location.origin}/search?q={search_term_string}`,
                    'query-input': 'required name=search_term_string'
                }
            }
        }

        return baseData
    }

    // 初始更新
    updateDocumentMeta()

    return {
        // 响应式Meta信息
        meta: finalMeta,
        metaTags,
        formattedTitle,
        locale,

        // 方法
        updateDocumentMeta,
        setGlobalMeta,
        getStructuredData,

        // 原始数据（用于调试）
        rawOptions: computed(() => options),
        globalMeta: computed(() => globalMeta.value)
    }
}

// 便捷函数：设置页面标题
export function setPageTitle(title: string) {
    const { setGlobalMeta } = usePageMeta()
    setGlobalMeta({ title })
}

// 便捷函数：设置页面描述
export function setPageDescription(description: string) {
    const { setGlobalMeta } = usePageMeta()
    setGlobalMeta({ description })
}

// 便捷函数：设置页面关键词
export function setPageKeywords(keywords: string) {
    const { setGlobalMeta } = usePageMeta()
    setGlobalMeta({ keywords })
} 