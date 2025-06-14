<script setup lang="ts">
import { Head } from '@inertiajs/vue3';

import AppearanceTabs from '@/components/AppearanceTabs.vue';
import HeadingSmall from '@/components/HeadingSmall.vue';
import { type BreadcrumbItem } from '@/types';

import AppLayout from '@/layouts/AppLayout.vue';
import SettingsLayout from '@/layouts/settings/Layout.vue';
import { useI18n } from '@/composables/useI18n';

const { t } = useI18n();

const breadcrumbItems: BreadcrumbItem[] = [
    {
        title: t('page.settings.appearance.title'),
        href: '/settings/appearance',
    },
];
</script>

<template>
    <AppLayout :breadcrumbs="breadcrumbItems">

        <Head :title="t('page.settings.appearance.pageTitle')" />

        <SettingsLayout>
            <div class="space-y-6">
                <HeadingSmall :title="t('page.settings.appearance.title')"
                    :description="t('page.settings.appearance.description')" />
                <AppearanceTabs />
            </div>
        </SettingsLayout>
    </AppLayout>
</template>
