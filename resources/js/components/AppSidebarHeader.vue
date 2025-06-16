<script setup lang="ts">
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import UserMenuContent from '@/components/UserMenuContent.vue';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { getInitials } from '@/composables/useInitials';
import { useI18n } from '@/composables/useI18n';
import { useAppearance } from '@/composables/useAppearance';
import { usePage } from '@inertiajs/vue3';
import { Search, Command, Moon, Sun, Monitor, Languages, Check } from 'lucide-vue-next';
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';


const { t, currentLocale, supportedLocales, switchLocale, getLocaleDisplayName } = useI18n();
const page = usePage();
const auth = computed(() => page.props.auth);

// 主题相关逻辑 - 使用现有的useAppearance
const { appearance, updateAppearance } = useAppearance();

// 主题图标映射
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

// 主题标签映射 - 英文版本用于 aria-label
const themeLabel = computed(() => {
    switch (appearance.value) {
        case 'light':
            return 'Light theme';
        case 'dark':
            return 'Dark theme';
        case 'system':
        default:
            return 'System theme';
    }
});

// 主题标签映射 - 中文版本用于显示
const themeLabelZh = computed(() => {
    switch (appearance.value) {
        case 'light':
            return '浅色主题';
        case 'dark':
            return '深色主题';
        case 'system':
        default:
            return '系统主题';
    }
});

// 切换主题 - 循环切换三种模式
const toggleTheme = () => {
    const nextTheme = appearance.value === 'light' ? 'dark' :
        appearance.value === 'dark' ? 'system' : 'light';
    updateAppearance(nextTheme);
};

// 搜索相关状态
const searchQuery = ref('');
const isSearchFocused = ref(false);

// 处理搜索快捷键 - 全局监听器
const handleSearchShortcut = (event: KeyboardEvent) => {
    // 检查是否按了 Ctrl+K 或 Cmd+K
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        // 阻止默认行为（如浏览器搜索）
        event.preventDefault();

        // 查找搜索输入框并聚焦
        const searchInput = document.querySelector('#global-search') as HTMLInputElement;
        if (searchInput) {
            searchInput.focus();
            searchInput.select(); // 选中现有文本，方便直接输入新内容
        }
    }
};

// 搜索处理函数
const handleSearch = () => {
    if (searchQuery.value.trim()) {
        console.log('搜索内容:', searchQuery.value);
        // TODO: 实现实际搜索逻辑
    }
};

// 组件挂载时添加全局键盘事件监听器
onMounted(() => {
    document.addEventListener('keydown', handleSearchShortcut, { passive: true });
});

// 组件卸载时移除事件监听器，防止内存泄漏
onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleSearchShortcut);
});
</script>

<template>
    <header class="flex h-16 shrink-0 items-center gap-2 
               px-6 md:px-4 
               bg-sidebar border-b border-sidebar-border/70 
               transition-all ease-linear duration-200 
               group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <!-- 左侧区域：侧边栏触发器和搜索栏 -->
        <div class="flex flex-1 min-w-0 items-center gap-3">
            <SidebarTrigger class="-ml-1" />

            <!-- 搜索栏 -->
            <div class="flex-1 min-w-0 max-w-md ml-4">
                <div class="relative">
                    <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="global-search" v-model="searchQuery" type="search"
                        :placeholder="t('common.search') + '... (Ctrl+K)'" class="h-9 w-full pl-9 pr-4 
                               bg-muted/50 border-muted/50 
                               transition-colors 
                               focus:bg-background focus:border-border" @focus="isSearchFocused = true"
                        @blur="isSearchFocused = false" @keydown.enter="handleSearch" />
                    <div v-if="!isSearchFocused" class="absolute right-3 top-1/2 hidden -translate-y-1/2 
                               sm:flex items-center gap-1 
                               text-xs text-muted-foreground">
                        <kbd class="pointer-events-none inline-flex h-5 select-none items-center gap-1 
                                   px-1.5 
                                   font-mono text-xs font-medium 
                                   bg-muted border rounded 
                                   opacity-100">
                            <Command class="h-3 w-3" />K
                        </kbd>
                    </div>
                </div>
            </div>
        </div>

        <!-- 右侧工具区 -->
        <div class="flex shrink-0 items-center gap-2">
            <!-- 语言切换 -->
            <DropdownMenu>
                <DropdownMenuTrigger as-child>
                    <Button variant="ghost" size="icon" class="h-9 w-9"
                        :aria-label="`Switch language - Current: ${getLocaleDisplayName(currentLocale)}`">
                        <Languages class="h-4 w-4" />
                        <span class="sr-only">{{ getLocaleDisplayName(currentLocale) }}</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent class="w-40" align="end" :side-offset="4">
                    <DropdownMenuItem v-for="locale in supportedLocales" :key="locale" @click="switchLocale(locale)"
                        class="flex items-center justify-between cursor-pointer"
                        :class="{ 'bg-accent text-accent-foreground': locale === currentLocale }">
                        <span>{{ getLocaleDisplayName(locale) }}</span>
                        <Check v-if="locale === currentLocale" class="h-4 w-4 text-primary" />
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <!-- 主题切换 -->
            <Button variant="ghost" size="icon" class="h-9 w-9" @click="toggleTheme"
                :aria-label="`Toggle theme - Current: ${themeLabel}`">
                <component :is="themeIcon" class="h-4 w-4" />
                <span class="sr-only">{{ themeLabelZh }}</span>
            </Button>

            <!-- 用户菜单 -->
            <DropdownMenu>
                <DropdownMenuTrigger as-child>
                    <Button variant="ghost" class="relative h-9 w-9 rounded-full p-0">
                        <Avatar class="h-9 w-9">
                            <AvatarImage v-if="auth?.user?.avatar" :src="auth.user.avatar"
                                :alt="auth?.user?.name || ''" />
                            <AvatarFallback class="text-sm">
                                {{ auth?.user ? getInitials(auth.user.name) : 'U' }}
                            </AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent class="w-56" align="end" :side-offset="4">
                    <UserMenuContent v-if="auth?.user" :user="auth.user" />
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    </header>
</template>
