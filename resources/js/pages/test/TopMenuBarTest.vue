<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import { ref, computed } from 'vue';
import TopMenuBar from '@/components/TopMenuBar.vue';
import { Button } from '@/components/ui/button';
import { Search, Moon, User, Sun, Languages } from 'lucide-vue-next';
import { useBreakpoints } from '@/composables/useBreakpoints';

// 组合式函数
const { isMobile, isTablet, isDesktop, currentBreakpoint, windowWidth } = useBreakpoints();

// 页面标题
const pageTitle = 'TopMenuBar 组件测试';

// 响应式状态
const searchQuery = ref('');
const isDarkMode = ref(false);
const currentLanguage = ref('zh-CN');

// 计算设备类型描述
const deviceType = computed(() => {
    if (isMobile.value) return '移动设备';
    if (isTablet.value) return '平板设备';
    if (isDesktop.value) return '桌面设备';
    return '未知设备';
});

// 计算响应式状态信息
const responsiveInfo = computed(() => ({
    windowWidth: windowWidth.value,
    currentBreakpoint: currentBreakpoint.value,
    deviceType: deviceType.value,
    isMobile: isMobile.value,
    isTablet: isTablet.value,
    isDesktop: isDesktop.value,
}));

// 模拟用户数据
const mockUser = {
    id: 1,
    name: '张三',
    email: 'zhangsan@example.com',
    avatar: null
};

// 交互函数
const handleSearch = (event: Event) => {
    const target = event.target as HTMLInputElement;
    searchQuery.value = target.value;
    console.log('搜索查询:', searchQuery.value);
};

const toggleTheme = () => {
    isDarkMode.value = !isDarkMode.value;
    console.log('主题切换:', isDarkMode.value ? '深色模式' : '浅色模式');
};

const toggleLanguage = () => {
    currentLanguage.value = currentLanguage.value === 'zh-CN' ? 'en-US' : 'zh-CN';
    console.log('语言切换:', currentLanguage.value);
};

const handleUserMenu = () => {
    console.log('用户菜单点击');
};

const handleSidebarToggle = () => {
    console.log('侧边栏切换');
};
</script>

<template>

    <Head :title="pageTitle" />

    <div class="min-h-screen bg-background">
        <!-- TopMenuBar 组件测试 -->
        <TopMenuBar>
            <!-- 侧边栏触发器插槽 -->
            <template #sidebar-trigger>
                <Button variant="ghost" size="icon" class="h-6 w-6" @click="handleSidebarToggle">
                    <span class="text-sm">☰</span>
                    <span class="sr-only">切换侧边栏</span>
                </Button>
            </template>

            <!-- 搜索栏插槽 -->
            <template #search-bar>
                <div class="relative w-full">
                    <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input type="text" :value="searchQuery" @input="handleSearch" placeholder="搜索页面、订单、产品..."
                        class="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                </div>
            </template>

            <!-- 语言切换插槽 -->
            <template #language-toggle>
                <Button variant="ghost" size="icon" class="h-9 w-9" @click="toggleLanguage">
                    <Languages class="h-4 w-4" />
                    <span class="sr-only">切换语言 - {{ currentLanguage }}</span>
                </Button>
            </template>

            <!-- 主题切换插槽 -->
            <template #theme-toggle>
                <Button variant="ghost" size="icon" class="h-9 w-9" @click="toggleTheme">
                    <Sun v-if="isDarkMode" class="h-4 w-4" />
                    <Moon v-else class="h-4 w-4" />
                    <span class="sr-only">切换主题 - {{ isDarkMode ? '浅色模式' : '深色模式' }}</span>
                </Button>
            </template>

            <!-- 用户菜单插槽 -->
            <template #user-menu="{ user }">
                <Button variant="ghost" size="icon" class="h-9 w-9 rounded-full" @click="handleUserMenu">
                    <User class="h-4 w-4" />
                    <span class="sr-only">用户菜单 - {{ user?.name || mockUser.name }}</span>
                </Button>
            </template>
        </TopMenuBar>

        <!-- 页面内容 -->
        <main class="container mx-auto p-6">
            <div class="space-y-6">
                <div>
                    <h1 class="text-3xl font-bold tracking-tight">TopMenuBar 组件测试</h1>
                    <p class="text-muted-foreground">
                        这是一个交互式测试页面，用于验证 TopMenuBar 组件的功能。
                    </p>
                </div>

                <!-- 实时状态显示 -->
                <div class="rounded-lg border bg-card p-4">
                    <h2 class="text-lg font-semibold mb-3">实时状态</h2>
                    <div class="grid gap-2 text-sm">
                        <div class="flex items-center gap-2">
                            <span class="font-medium">搜索查询:</span>
                            <code class="rounded bg-muted px-2 py-1">{{ searchQuery || '(空)' }}</code>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="font-medium">主题模式:</span>
                            <code class="rounded bg-muted px-2 py-1">{{ isDarkMode ? '深色模式' : '浅色模式' }}</code>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="font-medium">当前语言:</span>
                            <code class="rounded bg-muted px-2 py-1">{{ currentLanguage }}</code>
                        </div>
                    </div>
                </div>

                <!-- 响应式状态显示 -->
                <div class="rounded-lg border bg-card p-4">
                    <h2 class="text-lg font-semibold mb-3">响应式状态</h2>
                    <div class="grid gap-2 text-sm">
                        <div class="flex items-center gap-2">
                            <span class="font-medium">窗口宽度:</span>
                            <code class="rounded bg-muted px-2 py-1">{{ responsiveInfo.windowWidth }}px</code>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="font-medium">当前断点:</span>
                            <code class="rounded bg-muted px-2 py-1">{{ responsiveInfo.currentBreakpoint }}</code>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="font-medium">设备类型:</span>
                            <code class="rounded bg-muted px-2 py-1">{{ responsiveInfo.deviceType }}</code>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="font-medium">移动端模式:</span>
                            <code class="rounded bg-muted px-2 py-1">{{ responsiveInfo.isMobile ? '是' : '否' }}</code>
                        </div>
                    </div>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                    <div class="rounded-lg border p-4">
                        <h2 class="text-lg font-semibold mb-2">组件特性</h2>
                        <ul class="space-y-1 text-sm text-muted-foreground">
                            <li>✅ 高级响应式布局设计</li>
                            <li>✅ 动态断点检测</li>
                            <li>✅ 移动端优化</li>
                            <li>✅ 插槽系统支持</li>
                            <li>✅ TypeScript 类型安全</li>
                            <li>✅ 无障碍功能支持</li>
                            <li>✅ Tailwind CSS 响应式样式</li>
                            <li>✅ 性能优化缓存</li>
                        </ul>
                    </div>

                    <div class="rounded-lg border p-4">
                        <h2 class="text-lg font-semibold mb-2">响应式特性</h2>
                        <ul class="space-y-1 text-sm text-muted-foreground">
                            <li>📱 移动端紧凑布局</li>
                            <li>💻 桌面端完整功能</li>
                            <li>🎯 触摸友好交互</li>
                            <li>⚡ 动态尺寸调整</li>
                            <li>🔄 实时断点更新</li>
                            <li>📐 智能间距计算</li>
                            <li>🎨 自适应图标大小</li>
                            <li>📋 响应式容器宽度</li>
                        </ul>
                    </div>
                </div>

                <div class="rounded-lg border p-4">
                    <h2 class="text-lg font-semibold mb-2">响应式测试</h2>
                    <p class="text-sm text-muted-foreground mb-3">
                        调整浏览器窗口大小来测试响应式布局：
                    </p>
                    <div class="grid gap-2 text-sm">
                        <div class="flex items-center gap-2">
                            <span class="w-16 font-medium">桌面:</span>
                            <span class="text-muted-foreground">完整布局，所有功能可见</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="w-16 font-medium">平板:</span>
                            <span class="text-muted-foreground">紧凑布局，保持核心功能</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="w-16 font-medium">手机:</span>
                            <span class="text-muted-foreground">移动优化，触摸友好</span>
                        </div>
                    </div>
                </div>

                <div class="rounded-lg border p-4">
                    <h2 class="text-lg font-semibold mb-2">使用示例</h2>
                    <pre class="text-sm bg-muted p-3 rounded overflow-x-auto"><code>&lt;TopMenuBar&gt;
                    &lt;template #search-bar&gt;
                    &lt;!-- 自定义搜索栏 --&gt;
                    &lt;/template&gt;
                    &lt;template #user-menu="{ user }"&gt;
                    &lt;!-- 自定义用户菜单 --&gt;
                    &lt;/template&gt;
                    &lt;/TopMenuBar&gt;</code></pre>
                </div>
            </div>
        </main>
    </div>
</template>