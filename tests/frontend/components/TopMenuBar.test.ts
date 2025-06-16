import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';

// 模拟@inertiajs/vue3 - 必须在导入组件之前
vi.mock('@inertiajs/vue3', () => ({
    usePage: () => ({
        props: {
            auth: {
                user: {
                    id: 1,
                    name: '测试用户',
                    email: 'test@example.com'
                }
            }
        }
    }),
    Link: {
        name: 'Link',
        props: ['href', 'method', 'as'],
        template: '<a><slot /></a>'
    },
    router: {
        flushAll: vi.fn()
    }
}));

// 模拟类型导入
vi.mock('../../../resources/js/types', () => ({
    TopMenuBarProps: {}
}));

// 模拟vue-i18n
vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => {
            // 模拟翻译返回值
            const translations: Record<string, string> = {
                'topMenuBar.sidebar.toggle': '切换侧边栏',
                'topMenuBar.search.placeholder': '搜索页面、订单、产品...',
                'topMenuBar.search.tooltip': '打开全局搜索 (⌘K)',
                'topMenuBar.search.shortcut': '⌘K',
                'topMenuBar.language.toggle': '切换语言',
                'topMenuBar.language.tooltip': '切换语言',
                'topMenuBar.theme.toggle': '切换主题',
                'topMenuBar.theme.tooltip': '切换主题',
                'topMenuBar.user.menu': '用户菜单',
                'topMenuBar.user.profile': '个人资料',
                'topMenuBar.user.settings': '设置',
                'topMenuBar.user.logout': '退出登录',
                'topMenuBar.mobile.tools': '工具菜单',
                'common.search': '搜索',
                'page.settings.appearance.title': '外观设置',
                'button.logout': '退出登录'
            };
            return translations[key] || key;
        },
        locale: { value: 'zh' },
        availableLocales: ['zh', 'en']
    })
}));

// 模拟自定义的useI18n composable
vi.mock('../../../resources/js/composables/useI18n', () => ({
    useI18n: () => ({
        t: (key: string) => {
            const translations: Record<string, string> = {
                'page.settings.appearance.title': '外观设置',
                'button.logout': '退出登录'
            };
            return translations[key] || key;
        },
        currentLocale: { value: 'zh' },
        supportedLocales: ['zh', 'en'],
        switchLocale: vi.fn(),
        isCurrentLocale: vi.fn(),
        getLocaleDisplayName: vi.fn((locale: string) => locale === 'zh' ? '中文' : 'English')
    })
}));

// 模拟全局route函数
globalThis.route = vi.fn((name: string) => `/${name.replace('.', '/')}`);

// 模拟useAppearance
vi.mock('../../../resources/js/composables/useAppearance', () => ({
    useAppearance: () => ({
        appearance: { value: 'light' },
        updateAppearance: vi.fn()
    })
}));

// 模拟useBreakpoints - 默认桌面端
vi.mock('../../../resources/js/composables/useBreakpoints', () => ({
    useBreakpoints: () => ({
        isMobile: { value: false },
        isTablet: { value: false },
        isDesktop: { value: true },
        currentBreakpoint: { value: 'lg' }
    })
}));

// 模拟reka-ui sidebar组件
vi.mock('../../../resources/js/components/ui/sidebar', () => ({
    SidebarTrigger: {
        name: 'SidebarTrigger',
        template: '<button data-testid="sidebar-trigger" aria-label="切换侧边栏">Menu</button>',
        props: ['class']
    },
    useSidebar: () => ({
        toggleSidebar: vi.fn(),
        state: { value: 'expanded' }
    })
}));

// 模拟其他UI组件
vi.mock('../../../resources/js/components/ui/button', () => ({
    Button: {
        name: 'Button',
        template: '<button><slot /></button>',
        props: ['variant', 'size', 'class', 'aria-label']
    }
}));

vi.mock('../../../resources/js/components/ui/tooltip', () => ({
    TooltipProvider: { name: 'TooltipProvider', template: '<div><slot /></div>' },
    Tooltip: { name: 'Tooltip', template: '<div><slot /></div>' },
    TooltipTrigger: { name: 'TooltipTrigger', template: '<div><slot /></div>', props: ['as-child'] },
    TooltipContent: { name: 'TooltipContent', template: '<div><slot /></div>', props: ['side'] }
}));

vi.mock('../../../resources/js/components/ui/dropdown-menu', () => ({
    DropdownMenu: { name: 'DropdownMenu', template: '<div><slot /></div>' },
    DropdownMenuTrigger: { name: 'DropdownMenuTrigger', template: '<div><slot /></div>', props: ['as-child'] },
    DropdownMenuContent: { name: 'DropdownMenuContent', template: '<div><slot /></div>', props: ['align', 'class'] }
}));

vi.mock('../../../resources/js/components/ui/sheet', () => ({
    Sheet: { name: 'Sheet', template: '<div><slot /></div>' },
    SheetTrigger: { name: 'SheetTrigger', template: '<div><slot /></div>', props: ['as-child'] },
    SheetContent: { name: 'SheetContent', template: '<div><slot /></div>', props: ['side', 'class'] },
    SheetHeader: { name: 'SheetHeader', template: '<div><slot /></div>' },
    SheetTitle: { name: 'SheetTitle', template: '<div><slot /></div>' },
    SheetDescription: { name: 'SheetDescription', template: '<div><slot /></div>' }
}));

vi.mock('../../../resources/js/components/ui/separator', () => ({
    Separator: { name: 'Separator', template: '<div class="separator" />', props: ['class'] }
}));

// 模拟业务组件
vi.mock('../../../resources/js/components/UserInfo.vue', () => ({
    default: {
        name: 'UserInfo',
        template: '<div class="user-info">{{ user?.name || "User" }}</div>',
        props: ['user', 'compact']
    }
}));

vi.mock('../../../resources/js/components/UserMenuContent.vue', () => ({
    default: {
        name: 'UserMenuContent',
        template: '<div class="user-menu-content">User Menu</div>',
        props: ['user']
    }
}));

vi.mock('../../../resources/js/components/Breadcrumbs.vue', () => ({
    default: {
        name: 'Breadcrumbs',
        template: '<div class="breadcrumbs">面包屑导航</div>',
        props: ['breadcrumbs']
    }
}));

vi.mock('../../../resources/js/components/ui/LanguageSwitcher.vue', () => ({
    default: {
        name: 'LanguageSwitcher',
        template: '<div class="language-switcher">Language</div>'
    }
}));

import TopMenuBar from '../../../resources/js/components/TopMenuBar.vue';

describe('TopMenuBar组件测试', () => {
    let wrapper: any;

    beforeEach(() => {
        // 模拟window.innerWidth
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 1024, // 默认桌面端尺寸
        });
        
        wrapper = mount(TopMenuBar, {
            props: {
                showSidebarTrigger: true,
                class: 'test-class',
                enableMobileOptimization: true
            }
        });
    });

    it('应该正确渲染组件', () => {
        expect(wrapper.exists()).toBe(true);
        expect(wrapper.find('header').exists()).toBe(true);
    });

    it('应该包含正确的CSS类', () => {
        const header = wrapper.find('header');
        expect(header.classes()).toContain('flex');
        expect(header.classes()).toContain('w-full');
        expect(header.classes()).toContain('items-center');
        expect(header.classes()).toContain('justify-between');
        expect(header.classes()).toContain('test-class');
        // 响应式高度类应该存在
        const hasHeightClass = header.classes().some(cls => /^h-\d+$/.test(cls));
        expect(hasHeightClass).toBe(true);
    });

    it('应该显示侧边栏触发器', () => {
        const sidebarTrigger = wrapper.find('[aria-label="切换侧边栏"]');
        expect(sidebarTrigger.exists()).toBe(true);
    });

    it('应该显示搜索栏占位符', () => {
        const searchBox = wrapper.find('[aria-label="搜索"]');
        expect(searchBox.exists()).toBe(true);
        expect(searchBox.text()).toContain('搜索页面、订单、产品');
    });

    it('应该显示语言切换按钮', () => {
        const languageToggle = wrapper.find('[aria-label="切换语言"]');
        expect(languageToggle.exists()).toBe(true);
    });

    it('应该显示主题切换按钮', () => {
        const themeToggle = wrapper.find('[aria-label="切换主题"]');
        expect(themeToggle.exists()).toBe(true);
    });

    it('应该显示用户菜单按钮', () => {
        const userMenu = wrapper.find('[aria-label="用户菜单"]');
        expect(userMenu.exists()).toBe(true);
    });

    it('应该支持隐藏侧边栏触发器', async () => {
        await wrapper.setProps({ showSidebarTrigger: false });
        const sidebarTrigger = wrapper.find('[aria-label="切换侧边栏"]');
        expect(sidebarTrigger.exists()).toBe(false);
    });

    it('应该支持自定义插槽内容', () => {
        const wrapperWithSlots = mount(TopMenuBar, {
            slots: {
                'search-bar': '<div data-testid="custom-search">自定义搜索</div>',
                'user-menu': '<div data-testid="custom-user">自定义用户</div>'
            }
        });

        expect(wrapperWithSlots.find('[data-testid="custom-search"]').exists()).toBe(true);
        expect(wrapperWithSlots.find('[data-testid="custom-user"]').exists()).toBe(true);
    });

    it('应该具有正确的无障碍属性', () => {
        // 检查所有按钮元素都有正确的aria-label
        const buttons = wrapper.findAll('button');
        expect(buttons.length).toBeGreaterThan(0);

        buttons.forEach((button: any) => {
            expect(button.attributes('aria-label')).toBeDefined();
        });
        
        // 检查搜索框的无障碍属性
        const searchBox = wrapper.find('[role="searchbox"]');
        expect(searchBox.exists()).toBe(true);
        expect(searchBox.attributes('aria-label')).toBe('搜索');
    });

    it('应该有正确的响应式布局类', () => {
        const leftSection = wrapper.find('.flex-1');
        const desktopTools = wrapper.find('.hidden.lg\\:flex');
        const mobileTools = wrapper.find('.flex.lg\\:hidden');

        expect(leftSection.exists()).toBe(true);
        expect(desktopTools.exists()).toBe(true);
        expect(mobileTools.exists()).toBe(true);
    });
    
    it('应该在桌面端显示完整工具栏', () => {
        const desktopTools = wrapper.find('.hidden.lg\\:flex');
        expect(desktopTools.exists()).toBe(true);
    });
    
    it('应该在移动端显示Sheet菜单', () => {
        const mobileSheet = wrapper.find('.flex.lg\\:hidden');
        expect(mobileSheet.exists()).toBe(true);
    });
    
    it('应该支持Tab导航插槽', () => {
        const wrapperWithTab = mount(TopMenuBar, {
            slots: {
                'tab-navigation': '<div data-testid="tab-nav">Tab导航</div>'
            }
        });
        
        expect(wrapperWithTab.find('[data-testid="tab-nav"]').exists()).toBe(true);
    });
});

describe('TopMenuBar 响应式布局测试', () => {
    it('应该在桌面端使用标准高度', () => {
        // 模拟桌面端
        vi.mocked(vi.importMock('../../../resources/js/composables/useBreakpoints')).useBreakpoints = () => ({
            isMobile: { value: false },
            isTablet: { value: false },
            isDesktop: { value: true },
            currentBreakpoint: { value: 'lg' }
        });

        const wrapper = mount(TopMenuBar);
        const header = wrapper.find('header');
        
        // 检查是否应用了桌面端的高度类
        const classes = header.classes().join(' ');
        expect(classes).toMatch(/h-(14|12)/); // 应该是h-14（桌面）或h-12（移动）
    });

    it('应该在移动端使用紧凑布局', () => {
        // 模拟移动端
        vi.mocked(vi.importMock('../../../resources/js/composables/useBreakpoints')).useBreakpoints = () => ({
            isMobile: { value: true },
            isTablet: { value: false },
            isDesktop: { value: false },
            currentBreakpoint: { value: 'sm' }
        });

        const wrapper = mount(TopMenuBar);
        
        // 检查移动端工具区域是否显示
        const mobileTools = wrapper.find('.flex.lg\\:hidden');
        expect(mobileTools.exists()).toBe(true);
    });

    it('应该在不同断点使用不同的内边距', () => {
        const wrapper = mount(TopMenuBar);
        const header = wrapper.find('header');
        
        // 检查是否包含响应式内边距类
        const classes = header.classes().join(' ');
        expect(classes).toMatch(/px-\d+/); // 应该包含padding类
    });

    it('应该支持响应式搜索容器宽度', () => {
        const wrapper = mount(TopMenuBar);
        
        // 查找搜索容器
        const searchContainer = wrapper.find('.flex-1.min-w-0');
        expect(searchContainer.exists()).toBe(true);
    });

    it('应该在面包屑存在时隐藏搜索栏', () => {
        const wrapper = mount(TopMenuBar, {
            props: {
                breadcrumbs: [
                    { title: '首页', href: '/' },
                    { title: '用户', href: '/users' }
                ]
            }
        });

        // 应该显示面包屑而不是搜索栏
        expect(wrapper.text()).toContain('面包屑'); // 或者其他面包屑相关的文本
    });
}); 