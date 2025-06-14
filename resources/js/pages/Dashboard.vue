<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/vue3';
import PlaceholderPattern from '../components/PlaceholderPattern.vue';
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHead from '@/components/ui/PageHead.vue'
import { usePageMeta } from '@/composables/usePageMeta'

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

const { t } = useI18n()

// 获取当前页面的Meta信息用于显示
const { formattedTitle, meta, locale } = usePageMeta({
    title: t('meta.dashboard.title'),
    description: t('meta.dashboard.description'),
    keywords: t('meta.dashboard.keywords')
})

// 计算属性用于显示
const pageDescription = computed(() => t('meta.dashboard.description'))
const pageKeywords = computed(() => t('meta.dashboard.keywords'))
const currentLocale = computed(() => locale.value)
const canonical = computed(() => `${window.location.origin}/dashboard`)
const htmlLang = computed(() => {
    if (typeof document !== 'undefined') {
        return document.documentElement.lang
    }
    return locale.value
})
</script>

<template>

    <Head>
        <title>{{ $t('page.dashboard.title') }}</title>
    </Head>

    <!-- 使用新的PageHead组件进行SEO优化 -->
    <PageHead :title="$t('meta.dashboard.title')" :description="$t('meta.dashboard.description')"
        :keywords="$t('meta.dashboard.keywords')" :canonical="canonical" structured-data-type="website" />

    <AppLayout :breadcrumbs="breadcrumbs">
        <div class="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
            <!-- SEO Meta标签演示区域 -->
            <div class="rounded-xl border border-sidebar-border p-6 mb-4">
                <h2 class="text-xl font-semibold mb-4">SEO Meta标签演示</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <strong>页面标题:</strong> {{ formattedTitle }}
                    </div>
                    <div>
                        <strong>描述:</strong> {{ pageDescription }}
                    </div>
                    <div>
                        <strong>关键词:</strong> {{ pageKeywords }}
                    </div>
                    <div>
                        <strong>当前语言:</strong> {{ currentLocale }}
                    </div>
                    <div>
                        <strong>HTML lang属性:</strong> {{ htmlLang }}
                    </div>
                    <div>
                        <strong>Canonical URL:</strong> {{ canonical }}
                    </div>
                </div>
                <p class="mt-4 text-gray-600 text-sm">
                    页面标题、Meta描述和关键词会根据当前语言设置自动更新。切换语言时，所有SEO相关元素都会实时更新。
                </p>
            </div>

            <div class="grid auto-rows-min gap-4 md:grid-cols-3">
                <div
                    class="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                    <PlaceholderPattern />
                </div>
                <div
                    class="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                    <PlaceholderPattern />
                </div>
                <div
                    class="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                    <PlaceholderPattern />
                </div>
            </div>
            <div
                class="relative min-h-screen flex-1 rounded-xl border border-sidebar-border/70 md:min-h-min dark:border-sidebar-border">
                <PlaceholderPattern />
            </div>
        </div>
    </AppLayout>
</template>
