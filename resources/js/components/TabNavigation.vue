<script setup lang="ts">
import { computed } from 'vue';
import { useTabNavigation } from '@/composables/useTabNavigation';
import TabContainer, { type TabItem } from '@/components/ui/tabs/TabContainer.vue';
import { useI18n } from 'vue-i18n';

// 国际化
const { t } = useI18n();

// 使用Tab导航逻辑
const {
    tabs,
    activeTabId,
    switchTab,
    removeTab,
    closeOtherTabs,
    closeAllTabs
} = useTabNavigation();

// 将Tab数据转换为TabContainer组件需要的格式
const tabItems = computed((): TabItem[] =>
    tabs.value.map(tab => ({
        id: tab.id,
        title: tab.title,
        icon: tab.icon,
        href: tab.href,
        isActive: tab.isActive,
        isClosable: tab.isClosable,
        // 由于当前Tab主要用于导航，暂时不设置内容组件
        // 后续可以根据需要添加内容渲染逻辑
        content: undefined
    }))
);

// 处理Tab点击事件
const handleTabClick = (tabId: string) => {
    switchTab(tabId);
};

// 处理Tab关闭事件
const handleTabClose = (tabId: string) => {
    removeTab(tabId);
};

// 处理关闭其他标签页
const handleCloseOthers = (tabId: string) => {
    closeOtherTabs(tabId);
};

// 处理关闭所有标签页
const handleCloseAll = () => {
    closeAllTabs();
};

// 处理Tab重新排序（如果需要的话）
const handleTabReorder = (fromIndex: number, toIndex: number) => {
    // 这里可以实现Tab重新排序逻辑
    console.log(t('tabs.reorder'), { from: fromIndex, to: toIndex });
};
</script>

<template>
    <!-- 使用基于Reka UI的TabContainer组件 -->
    <!-- 注意：content-class="hidden" 因为我们使用Inertia.js路由，内容由页面组件渲染 -->
    <TabContainer :tabs="tabItems" :active-tab-id="activeTabId" :show-management-menu="tabs.length > 1"
        :enable-drag-sort="false" :max-tab-width="'12rem'" container-class="h-auto"
        tab-bar-class="border-b-0 bg-transparent" content-class="hidden" @tab-click="handleTabClick"
        @tab-close="handleTabClose" @close-others="handleCloseOthers" @close-all="handleCloseAll"
        @tab-reorder="handleTabReorder" />
</template>

<style scoped>
/* 确保Tab容器可以横向滚动 */
.overflow-x-auto {
    scrollbar-width: none;
    /* Firefox */
    -ms-overflow-style: none;
    /* IE and Edge */
}

.overflow-x-auto::-webkit-scrollbar {
    display: none;
    /* Chrome, Safari, Opera */
}
</style>