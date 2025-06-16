<script setup lang="ts">
import AppContent from '@/components/AppContent.vue';
import AppShell from '@/components/AppShell.vue';
import AppSidebar from '@/components/AppSidebar.vue';
import TopMenuBar from '@/components/TopMenuBar.vue';
import TabNavigation from '@/components/TabNavigation.vue';
</script>

<template>
    <AppShell variant="sidebar">
        <AppSidebar />
        <AppContent variant="sidebar">
            <TopMenuBar class="sticky top-0 z-50">
                <template #tab-navigation>
                    <TabNavigation />
                </template>
            </TopMenuBar>

            <slot />
        </AppContent>
    </AppShell>
</template>
