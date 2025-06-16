<script setup lang="ts">
import { computed, watchEffect, onMounted, ref } from 'vue';
import { usePage } from '@inertiajs/vue3';
import { useI18n } from 'vue-i18n';
import type { TopMenuBarProps } from '@/types';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
// 修复异步组件导入方式 - 支持懒加载
import { defineAsyncComponent, shallowRef } from 'vue';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
// 按需导入图标以减少bundle大小
import { MoreHorizontal, Search, Globe, Moon, Sun, Monitor, User, Settings, LogOut } from 'lucide-vue-next';
// 集成现有组件 - 使用懒加载优化
const UserInfo = defineAsyncComponent(() => import('@/components/UserInfo.vue'));
const UserMenuContent = defineAsyncComponent(() => import('@/components/UserMenuContent.vue'));
const LanguageSwitcher = defineAsyncComponent(() => import('@/components/ui/LanguageSwitcher.vue'));
const LiveRegion = defineAsyncComponent(() => import('@/components/ui/LiveRegion.vue'));
const SearchDialog = defineAsyncComponent(() => import('@/components/SearchDialog.vue'));
// 导入主题切换composable
import { useAppearance } from '@/composables/useAppearance';
// 导入响应式断点管理
import { useBreakpoints } from '@/composables/useBreakpoints';
// 导入无障碍功能增强
import { useAccessibilityFeatures } from '@/composables/useAccessibilityFeatures';
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts';
// 导入样式工具函数
import { cn } from '@/lib/utils';
// 全局搜索功能集成
import { useGlobalSearch } from '@/composables/useGlobalSearch';

// 设置默认Props
const props = withDefaults(defineProps<TopMenuBarProps>(), {
    showSidebarTrigger: true,
    class: '',
});

// 获取页面数据
const page = usePage();

// 国际化
const { t } = useI18n();

// 主题切换功能
const { appearance, updateAppearance } = useAppearance();

// 响应式断点管理
const { isMobile, isTablet, isDesktop, currentBreakpoint } = useBreakpoints();

// 无障碍功能增强
const {
    announceToScreenReader,
    announceThemeChange,
    liveMessage
} = useAccessibilityFeatures();

// 键盘快捷键
const { registerShortcut } = useKeyboardShortcuts();

// 焦点管理 - 已在模板中直接实现Skip Link

// 主题图标映射 - 根据当前主题动态显示不同图标
const themeIcon = computed(() => {
    switch (appearance.value) {
        case 'light':
            return Sun;
        case 'dark':
            return Moon;
        case 'system':
        default:
            return Monitor;
    }
});

// 主题标签映射 - 用于无障碍性标签
const themeLabel = computed(() => {
    switch (appearance.value) {
        case 'light':
            return t('topMenuBar.theme.light');
        case 'dark':
            return t('topMenuBar.theme.dark');
        case 'system':
        default:
            return t('topMenuBar.theme.system');
    }
});

// 切换主题 - 循环切换三种模式（浅色 -> 深色 -> 系统 -> 浅色）
const toggleTheme = () => {
    const nextTheme = appearance.value === 'light' ? 'dark' :
        appearance.value === 'dark' ? 'system' : 'light';
    updateAppearance(nextTheme);

    // 向屏幕阅读器公告主题变化
    const newThemeLabel = nextTheme === 'light' ? t('topMenuBar.theme.light') :
        nextTheme === 'dark' ? t('topMenuBar.theme.dark') : t('topMenuBar.theme.system');
    announceThemeChange(newThemeLabel);
};

// 性能优化：使用shallowRef缓存用户信息以避免深层响应式开销
const auth = computed(() => page.props.auth);
const userInfo = shallowRef<any>(null);

// 使用watchEffect监听用户变化，避免重复计算
watchEffect(() => {
    const user = auth.value?.user;
    if (!user) {
        userInfo.value = null;
        return;
    }

    // 缓存用户头像首字母以避免重复计算
    userInfo.value = {
        ...user,
        avatarFallback: user.name?.charAt(0)?.toUpperCase() || 'U'
    };
});

// 响应式样式计算 - 使用缓存优化
const responsiveStyles = computed(() => {
    const mobile = isMobile.value;
    const tablet = isTablet.value;

    return {
        padding: mobile ? 'px-3' : tablet ? 'px-4' : 'px-6',
        height: mobile ? 'h-12' : 'h-14',
        gap: mobile ? 'gap-2' : tablet ? 'gap-2' : 'gap-3',
        buttonSize: mobile ? 'h-8 w-8' : 'h-9 w-9',
        sidebarTriggerSize: mobile ? 'h-8 w-8' : 'h-9 w-9'
    };
});

// 性能优化：缓存样式计算，只在class prop变化时重新计算
const containerClasses = computed(() => {
    const styles = responsiveStyles.value;
    const baseClasses = [
        // 基础样式 - 响应式高度
        'flex w-full items-center justify-between',
        styles.height,
        // 边框和背景 - 与侧边栏保持一致
        'border-b border-sidebar-border/70 bg-sidebar',
        // 内边距 - 动态响应式调整
        styles.padding,
        // 过渡动画
        'transition-all duration-200 ease-in-out',
    ];

    return props.class ? [...baseClasses, props.class] : baseClasses;
});

// 响应式样式类计算 - 统一管理减少计算开销
const styleClasses = computed(() => {
    const styles = responsiveStyles.value;

    return {
        tabContainer: [
            'border-t border-sidebar-border/30',
            'bg-sidebar/50',
            isMobile.value ? 'h-9' : 'h-10',
            'flex items-center',
            styles.padding,
        ],
        leftSection: [
            'flex items-center',
            styles.gap,
            'flex-1 min-w-0',
        ],
        desktopTools: [
            isDesktop.value ? 'flex' : 'hidden',
            'items-center gap-2',
            'flex-shrink-0',
        ],
        mobileTools: [
            isDesktop.value ? 'hidden' : 'flex',
            'items-center',
            'flex-shrink-0',
        ]
    };
});

// 响应式搜索容器样式 - 优化映射对象避免重复条件判断
const searchMaxWidthMap = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-xl'
} as const;

const searchContainerClasses = computed(() => [
    'flex-1 min-w-0',
    searchMaxWidthMap[currentBreakpoint.value] || 'max-w-xs'
]);


// 搜索功能
const {
    search,
    clearSearch,
    currentResults,
    groupedResults,
    hasResults,
    recentSearches,
    popularSearches,
    getSearchSuggestions,
    getEmptySearchSuggestions,
    searchState,
    selectedResult,
    moveSelection,
    setSelectedIndex
} = useGlobalSearch();

// 搜索对话框状态
const isSearchOpen = ref(false);

// 搜索快捷键处理函数
const handleSearchShortcut = () => {
    console.log('TopMenuBar: handleSearchShortcut called');
    isSearchOpen.value = true;
    announceToScreenReader(t('topMenuBar.search.tooltip'));
};

// 搜索对话框事件处理
const handleSearchDialogOpenChange = (open: boolean) => {
    console.log('TopMenuBar: handleSearchDialogOpenChange called with', open);
    isSearchOpen.value = open;
    if (!open) {
        // 关闭时清理搜索状态
        clearSearch();
    }
};

const handleSearchDialogSearch = (query: string) => {
    console.log('TopMenuBar: search query:', query);
    search(query);
};

const handleSearchDialogSelect = (result: any) => {
    console.log('TopMenuBar: selected result:', result);
    if (result?.url) {
        // 使用Inertia.js导航到结果页面
        try {
            if (result.url.startsWith('http')) {
                // 外部链接
                window.open(result.url, '_blank');
            } else {
                // 内部路由
                window.location.href = result.url;
            }
        } catch (error) {
            console.warn('导航失败，回退到直接跳转:', error);
            window.location.href = result.url;
        }
    }
    isSearchOpen.value = false;
};

// 将搜索建议转换为SearchResult数组格式
const getSuggestionsAsArray = () => {
    if (hasResults.value) {
        return []
    }

    // 安全获取当前查询，确保是有效字符串
    const currentQuery = searchState.value.query || ''
    const suggestionsData = getSearchSuggestions(currentQuery)
    const emptySuggestions = getEmptySearchSuggestions()
    const suggestions: any[] = []

    // 如果没有当前查询，显示最近搜索和热门搜索
    if (!currentQuery.trim()) {
        // 添加最近搜索
        recentSearches.value.slice(0, 3).forEach((query, index) => {
            if (query && typeof query === 'string') {
                suggestions.push({
                    id: `recent-${index}`,
                    title: query,
                    description: '最近搜索',
                    type: 'action',
                    category: 'history',
                    url: '',
                    keywords: [query]
                })
            }
        })

        // 添加热门搜索
        popularSearches.value.slice(0, 3).forEach((query, index) => {
            if (query && typeof query === 'string') {
                suggestions.push({
                    id: `popular-${index}`,
                    title: query,
                    description: '热门搜索',
                    type: 'action',
                    category: 'popular',
                    url: '',
                    keywords: [query]
                })
            }
        })
    }

    // 添加空搜索建议
    if (suggestions.length === 0) {
        emptySuggestions.forEach((suggestion, index) => {
            if (suggestion && typeof suggestion === 'string') {
                suggestions.push({
                    id: `empty-${index}`,
                    title: suggestion,
                    description: '建议搜索',
                    type: 'action',
                    category: 'suggestion',
                    url: '',
                    keywords: [suggestion]
                })
            }
        })
    }

    return suggestions
};

// 组件挂载时注册快捷键
onMounted(() => {
    registerShortcut({
        key: 'k',
        ctrlKey: true,
        handler: handleSearchShortcut,
        description: t('topMenuBar.search.tooltip')
    });
});

// 主菜单区域标识符
const mainContentId = 'main-content';

// Skip Link 点击处理函数
const handleSkipLinkClick = (event: Event) => {
    event.preventDefault();
    const target = document.getElementById(mainContentId);
    if (target) {
        target.setAttribute('tabindex', '-1');
        target.focus();
        target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
    }
};
</script>

<template>
    <!-- Skip Link for accessibility -->
    <a :href="`#${mainContentId}`"
        class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:no-underline focus:outline-none focus:ring-2 focus:ring-primary-foreground"
        @click="handleSkipLinkClick">
        {{ t('accessibility.skipToMain') }}
    </a>

    <!-- 主容器 -->
    <div class="top-menu-bar">
        <!-- 顶部菜单栏 -->
        <header :class="containerClasses" role="banner" :aria-label="t('topMenuBar.aria.mainNavigation')">
            <!-- 左侧功能区 -->
            <div :class="styleClasses.leftSection">
                <!-- Logo和侧边栏触发器 -->
                <div v-if="showSidebarTrigger" :class="['flex items-center flex-shrink-0', responsiveStyles.gap]">

                    <slot name="sidebar-trigger">
                        <!-- 使用真正的SidebarTrigger组件 - 响应式尺寸 -->
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger as-child>
                                    <SidebarTrigger
                                        :class="cn('!h-auto !w-auto', responsiveStyles.sidebarTriggerSize)" />
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    <p>{{ t('topMenuBar.sidebar.toggle') }}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </slot>
                </div>

                <!-- 搜索栏区域 -->
                <div :class="searchContainerClasses">
                    <slot name="search-bar">
                        <!-- 默认搜索栏占位 - 响应式尺寸 -->
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger as-child>
                                    <Button variant="outline"
                                        :class="[isMobile ? 'h-8' : 'h-9', 'w-full justify-start text-muted-foreground']"
                                        role="combobox" :aria-label="t('topMenuBar.search.tooltip')"
                                        :aria-describedby="!isMobile ? 'search-shortcut-hint' : undefined"
                                        aria-expanded="false" aria-haspopup="listbox" tabindex="0"
                                        @click="handleSearchShortcut">
                                        <Search :class="isMobile ? 'mr-1 h-3 w-3' : 'mr-2 h-4 w-4'"
                                            aria-hidden="true" />
                                        <span class="truncate text-sm">{{ t('topMenuBar.search.placeholder') }}</span>
                                        <!-- 键盘快捷键提示 - 只在平板及以上显示 -->
                                        <kbd v-if="!isMobile" id="search-shortcut-hint"
                                            class="ml-auto hidden sm:inline-block pointer-events-none select-none items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground opacity-100"
                                            :aria-label="`${t('topMenuBar.search.shortcut')} ${t('accessibility.keyboardNavigation')}`">
                                            {{ t('topMenuBar.search.shortcut') }}
                                        </kbd>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    <p>{{ t('topMenuBar.search.tooltip') }}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </slot>
                </div>
            </div>

            <!-- 桌面端工具区 -->
            <div :class="styleClasses.desktopTools">
                <!-- 语言切换 -->
                <slot name="language-toggle">
                    <LanguageSwitcher />
                </slot>

                <!-- 主题切换 - 响应式尺寸 -->
                <slot name="theme-toggle">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger as-child>
                                <Button variant="ghost" size="sm" :class="[responsiveStyles.buttonSize, 'p-0']"
                                    :aria-label="`${t('topMenuBar.theme.toggle')} - ${themeLabel}`"
                                    :aria-describedby="'theme-description'" tabindex="0" @click="toggleTheme">
                                    <component :is="themeIcon" :class="isMobile ? 'h-3 w-3' : 'h-4 w-4'"
                                        aria-hidden="true" />
                                    <span id="theme-description" class="sr-only">
                                        {{ t('topMenuBar.theme.changed', { theme: themeLabel }) }}
                                    </span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                                <p>{{ themeLabel }}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </slot>

                <!-- 用户菜单 - 响应式尺寸 -->
                <slot name="user-menu" :user="userInfo">
                    <DropdownMenu v-if="userInfo">
                        <DropdownMenuTrigger as-child>
                            <Button variant="ghost" size="sm"
                                :class="isMobile ? 'h-auto p-0.5 rounded-md' : 'h-auto p-1 rounded-md'"
                                :aria-label="t('topMenuBar.user.menu')">
                                <UserInfo :user="userInfo" :compact="isMobile" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" :class="isMobile ? 'w-56' : 'w-64'">
                            <UserMenuContent :user="userInfo" />
                        </DropdownMenuContent>
                    </DropdownMenu>
                </slot>
            </div>

            <!-- 移动端工具区 - 使用Sheet收纳 -->
            <div :class="styleClasses.mobileTools">
                <Sheet>
                    <SheetTrigger as-child>
                        <Button variant="ghost" size="sm" :class="[responsiveStyles.buttonSize, 'p-0']"
                            :aria-label="t('topMenuBar.mobile.tools')">
                            <MoreHorizontal :class="isMobile ? 'h-3 w-3' : 'h-4 w-4'" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" :class="isMobile ? 'w-64' : 'w-72'">
                        <SheetHeader>
                            <SheetTitle>{{ t('topMenuBar.mobile.tools') }}</SheetTitle>
                            <SheetDescription>{{ t('topMenuBar.mobile.description') }}</SheetDescription>
                        </SheetHeader>

                        <div class="flex flex-col gap-4 pt-6">
                            <!-- 移动端工具选项 - 响应式调整 -->
                            <div class="space-y-1">
                                <!-- 移动端语言切换器 -->
                                <div :class="['flex items-center gap-3', isMobile ? 'p-2' : 'p-3']">
                                    <Globe :class="isMobile ? 'h-3 w-3' : 'h-4 w-4'" class="flex-shrink-0" />
                                    <LanguageSwitcher />
                                </div>

                                <Button variant="ghost"
                                    :class="['w-full justify-start gap-3 h-auto', isMobile ? 'p-2' : 'p-3']"
                                    @click="toggleTheme">
                                    <component :is="themeIcon" :class="isMobile ? 'h-3 w-3' : 'h-4 w-4'" />
                                    <span class="text-sm">{{ themeLabel }}</span>
                                </Button>

                                <Button variant="ghost"
                                    :class="['w-full justify-start gap-3 h-auto', isMobile ? 'p-2' : 'p-3']">
                                    <Settings :class="isMobile ? 'h-3 w-3' : 'h-4 w-4'" />
                                    <span class="text-sm">{{ t('topMenuBar.mobile.system') }}</span>
                                </Button>
                            </div>

                            <Separator class="my-4" />

                            <!-- 移动端用户信息 - 响应式调整 -->
                            <div v-if="userInfo" class="pt-4">
                                <div
                                    :class="['flex items-center gap-3 rounded-lg bg-muted/30', isMobile ? 'p-2' : 'p-3']">
                                    <UserInfo :user="userInfo" :show-email="true" :compact="isMobile" />
                                </div>

                                <div class="mt-3 space-y-1">
                                    <Button variant="ghost" class="w-full justify-start gap-3 h-auto p-2 text-sm">
                                        <User :class="isMobile ? 'h-3 w-3' : 'h-4 w-4'" />
                                        <span>{{ t('topMenuBar.user.profile') }}</span>
                                    </Button>
                                    <Button variant="ghost"
                                        class="w-full justify-start gap-3 h-auto p-2 text-sm text-destructive hover:text-destructive">
                                        <LogOut :class="isMobile ? 'h-3 w-3' : 'h-4 w-4'" />
                                        <span>{{ t('topMenuBar.user.logout') }}</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </header>

        <!-- Tab导航区 - 响应式高度 -->
        <div v-if="$slots['tab-navigation']" :class="styleClasses.tabContainer">
            <slot name="tab-navigation" />
        </div>

        <!-- Live Region for accessibility announcements -->
        <LiveRegion :message="liveMessage" priority="polite" class="sr-only" />

        <!-- 搜索对话框 -->
        <SearchDialog :open="isSearchOpen" :results="currentResults" :loading="searchState.isSearching"
            :suggestions="getSuggestionsAsArray()" @update:open="handleSearchDialogOpenChange"
            @search="handleSearchDialogSearch" @select="handleSearchDialogSelect" />
    </div>
</template>