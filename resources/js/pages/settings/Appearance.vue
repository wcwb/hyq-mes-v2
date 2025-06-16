<script setup lang="ts">
import { Head } from '@inertiajs/vue3';

import AppearanceTabs from '@/components/AppearanceTabs.vue';
import HeadingSmall from '@/components/HeadingSmall.vue';

import AppLayout from '@/layouts/AppLayout.vue';
import SettingsLayout from '@/layouts/settings/Layout.vue';
import { useI18n } from '@/composables/useI18n';

const { t } = useI18n();
</script>

<template>
    <AppLayout>

        <Head :title="t('page.settings.appearance.pageTitle')" />

        <SettingsLayout>
            <div class="space-y-6">
                <HeadingSmall :title="t('page.settings.appearance.title')"
                    :description="t('page.settings.appearance.description')" />
                
                <!-- 主题设置 -->
                <div class="space-y-2">
                    <h3 class="text-lg font-medium">{{ t('topMenuBar.theme.toggle') }}</h3>
                    <AppearanceTabs />
                </div>
                
            </div>
        </SettingsLayout>
    </AppLayout>
</template>
