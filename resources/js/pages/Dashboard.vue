<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue';
import { Head } from '@inertiajs/vue3';
import PlaceholderPattern from '../components/PlaceholderPattern.vue';
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHead from '@/components/ui/PageHead.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { useTabNavigation } from '@/composables/useTabNavigation'

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

// 定义页面 Props 接口，包括 meta 信息
interface Props {
    meta?: {
        title?: string;
        icon?: string;
        closable?: boolean;
    };
}

// 定义 props，不使用默认值（避免在 defineProps 中引用局部变量）
const props = defineProps<Props>();

// 在 setup 内部计算 meta 的默认值，确保国际化
const computedMeta = computed(() => ({
    title: props.meta?.title || t('page.dashboard.title'),
    icon: props.meta?.icon || '📊',
    closable: props.meta?.closable || false
}));

// 获取标签页导航功能
const { resetToSingleDashboard } = useTabNavigation();

// 检查是否是首次使用（仅在特定条件下重置）
onMounted(() => {
    // 检查是否没有存储的标签页状态（首次使用或清除缓存后）
    const hasStoredTabs = localStorage.getItem('tab-navigation-state');

    // 只有在没有存储状态时才重置为单一仪表板标签页
    if (!hasStoredTabs) {
        resetToSingleDashboard();
    }
});
</script>

<template>

    <Head>
        <title>{{ $t('page.dashboard.title') }}</title>
    </Head>

    <!-- 使用新的PageHead组件进行SEO优化 -->
    <PageHead :title="$t('meta.dashboard.title')" :description="$t('meta.dashboard.description')"
        :keywords="$t('meta.dashboard.keywords')" :canonical="canonical" structured-data-type="website" />

    <AppLayout>
        <div class="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
            <!-- SEO Meta标签演示区域 -->
            <div class="rounded-xl border border-sidebar-border p-6 mb-4">
                <h2 class="text-xl font-semibold mb-4">{{ t('page.dashboard.seoDemo.title') }}</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <strong>{{ t('page.dashboard.seoDemo.pageTitle') }}:</strong> {{ formattedTitle }}
                    </div>
                    <div>
                        <strong>{{ t('page.dashboard.seoDemo.description') }}:</strong> {{ pageDescription }}
                    </div>
                    <div>
                        <strong>{{ t('page.dashboard.seoDemo.keywords') }}:</strong> {{ pageKeywords }}
                    </div>
                    <div>
                        <strong>{{ t('page.dashboard.seoDemo.currentLanguage') }}:</strong> {{ currentLocale }}
                    </div>
                    <div>
                        <strong>{{ t('page.dashboard.seoDemo.htmlLang') }}:</strong> {{ htmlLang }}
                    </div>
                    <div>
                        <strong>{{ t('page.dashboard.seoDemo.canonicalUrl') }}:</strong> {{ canonical }}
                    </div>
                </div>
                <p class="mt-4 text-gray-600 text-sm">
                    {{ t('page.dashboard.seoDemo.explanation') }}
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
