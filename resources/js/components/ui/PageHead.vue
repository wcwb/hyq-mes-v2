<template>

    <Head v-bind="headProps" />
</template>

<script setup lang="ts">
import { computed, toRefs } from 'vue'
import { Head } from '@inertiajs/vue3'
import { usePageMeta } from '@/composables/usePageMeta'

// 组件Props接口
interface Props {
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
    structuredDataType?: 'website' | 'article' | 'breadcrumb'
    includeStructuredData?: boolean
}

// 默认Props
const props = withDefaults(defineProps<Props>(), {
    ogType: 'website',
    twitterCard: 'summary_large_image',
    robots: 'index,follow',
    structuredDataType: 'website',
    includeStructuredData: true
})

// 解构Props以便响应式使用
const {
    title,
    description,
    keywords,
    ogTitle,
    ogDescription,
    ogImage,
    ogType,
    twitterCard,
    twitterTitle,
    twitterDescription,
    twitterImage,
    canonical,
    robots,
    structuredDataType,
    includeStructuredData
} = toRefs(props)

// 使用pageMetaComposable
const { metaTags, getStructuredData } = usePageMeta({
    title: title.value,
    description: description.value,
    keywords: keywords.value,
    ogTitle: ogTitle.value,
    ogDescription: ogDescription.value,
    ogImage: ogImage.value,
    ogType: ogType.value,
    twitterCard: twitterCard.value,
    twitterTitle: twitterTitle.value,
    twitterDescription: twitterDescription.value,
    twitterImage: twitterImage.value,
    canonical: canonical.value,
    robots: robots.value
})

// 生成结构化数据
const structuredData = computed(() => {
    if (!includeStructuredData.value) return null
    return getStructuredData(structuredDataType.value)
})

// 构建Head组件的Props
const headProps = computed(() => {
    const baseProps: any = {
        title: metaTags.value.title,
        meta: metaTags.value.meta
    }

    // 添加link标签（如canonical）
    if (metaTags.value.link) {
        baseProps.link = metaTags.value.link
    }

    return baseProps
})
</script>

<script lang="ts">
export default {
    name: 'PageHead'
}
</script>