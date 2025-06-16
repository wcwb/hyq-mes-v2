import { ref, computed, readonly, onMounted, watch, nextTick, type Ref } from 'vue';
import { router } from '@inertiajs/vue3';
import { usePage } from '@inertiajs/vue3';
import { useI18n } from 'vue-i18n';
import { TabItem as BaseTabItem } from '@/types/tab';
import { useTabState } from '@/composables/useTabState';
import { useProgressiveTabLoading, type ProgressiveLoadingConfig } from '@/composables/useProgressiveTabLoading';

// 扩展标准TabItem接口以兼容现有实现
export interface TabItem extends Omit<BaseTabItem, 'route' | 'closable' | 'createdAt'> {
    href: string; // 兼容现有的href字段，对应BaseTabItem的route字段
    isActive: boolean; // 兼容现有的isActive字段
    isClosable: boolean; // 兼容现有的isClosable字段，对应BaseTabItem的closable字段
    createdAt?: number; // 可选的创建时间字段
}

// 页面元信息接口
export interface PageMeta {
    title?: string;
    icon?: string;
    closable?: boolean;
}

// 全局状态管理（单例模式）
let globalTabsState: {
    tabs: Ref<TabItem[]>;
    activeTabId: Ref<string>;
    initialized: boolean;
} | null = null;

// 持久化存储的键名
const STORAGE_KEY = 'tab-navigation-state';

// 生成唯一Tab ID
function generateTabId(): string {
    return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 保存状态到localStorage
function saveToStorage(tabs: TabItem[], activeTabId: string) {
    try {
        const stateToSave = {
            tabs: tabs.map(tab => ({
                ...tab,
                isActive: false // 重置激活状态，由activeTabId管理
            })),
            activeTabId,
            timestamp: Date.now()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
        console.warn('无法保存Tab状态到localStorage:', error);
    }
}

// 从localStorage加载状态
function loadFromStorage(): { tabs: TabItem[], activeTabId: string } | null {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;

        const parsed = JSON.parse(stored);

        // 检查数据有效性（可选：添加过期检查）
        if (parsed && Array.isArray(parsed.tabs) && parsed.activeTabId) {
            return {
                tabs: parsed.tabs,
                activeTabId: parsed.activeTabId
            };
        }
    } catch (error) {
        console.warn('无法从localStorage加载Tab状态:', error);
    }
    return null;
}

// 初始化全局状态
function initializeGlobalState() {
    if (globalTabsState) return globalTabsState;

    // 从localStorage加载状态
    const stored = loadFromStorage();

    let initialTabs: TabItem[] = [];
    let initialActiveTabId = '';

    if (stored) {
        // 过滤掉不应该在登录后显示的标签页
        const filteredTabs = stored.tabs.filter((tab: TabItem) => {
            // 移除欢迎页和登录页标签
            return !tab.href.includes('/login') &&
                !tab.href.includes('auth/') &&
                tab.href !== '/' &&
                tab.href !== '/welcome';
        });

        // 检查过滤后的标签页中是否有仪表板标签页
        const existingDashboard = filteredTabs.find(tab => tab.href === '/dashboard');

        if (existingDashboard) {
            // 如果已有仪表板标签页，保留所有过滤后的标签页
            initialTabs = filteredTabs;
            initialActiveTabId = existingDashboard.id;
        } else {
            // 如果没有仪表板标签页，创建一个新的仪表板标签页，并保留其他有效标签页
            const dashboardTab: TabItem = {
                id: generateTabId(),
                title: '仪表板',
                icon: 'BarChart3',
                href: '/dashboard',
                isActive: true,
                isClosable: false,
                lastAccessed: Date.now(),
            };
            initialTabs = [dashboardTab, ...filteredTabs];
            initialActiveTabId = dashboardTab.id;
        }
    } else {
        // 默认添加仪表板Tab - 使用硬编码的翻译，避免初始化时的翻译问题
        const dashboardTab: TabItem = {
            id: generateTabId(),
            title: '仪表板', // 先使用硬编码，稍后由组件内的翻译函数处理
            icon: 'BarChart3',
            href: '/dashboard',
            isActive: true,
            isClosable: false,
            lastAccessed: Date.now(),
        };
        initialTabs = [dashboardTab];
        initialActiveTabId = dashboardTab.id;
    }

    // 更新激活状态
    initialTabs.forEach(tab => {
        tab.isActive = tab.id === initialActiveTabId;
    });

    globalTabsState = {
        tabs: ref(initialTabs),
        activeTabId: ref(initialActiveTabId),
        initialized: true
    };

    return globalTabsState;
}

// 动态获取页面信息的函数
function getPageInfo(pathname: string, pageProps?: any, pageComponent?: string): { title: string; icon?: string } {
    // 第一优先级：页面props中的meta信息
    if (pageProps?.meta) {
        const meta = pageProps.meta;
        if (meta.title) {
            return {
                title: meta.title,
                icon: meta.icon
            };
        }
    }

    // 第二优先级：根据组件名称推导
    if (pageComponent) {
        const componentInfo = getInfoFromComponent(pageComponent);
        if (componentInfo.title !== '未知页面') {
            return componentInfo;
        }
    }

    // 第三优先级：根据路径动态生成
    return getInfoFromPath(pathname);
}

// 根据组件名称获取页面信息
function getInfoFromComponent(componentName: string): { title: string; icon?: string } {
    // 移除路径和扩展名，获取纯组件名
    const cleanName = componentName.replace(/^.*[/\\]/, '').replace(/\.(vue|js|ts)$/, '');

    // 使用翻译键的组件映射
    const componentMap: Record<string, { titleKey: string; icon: string }> = {
        'Dashboard': { titleKey: 'page.dashboard.title', icon: 'BarChart3' },
        'Profile': { titleKey: 'page.profile.title', icon: 'User' },
        'Settings': { titleKey: 'page.settings.title', icon: 'Settings' },
        'Users': { titleKey: 'page.users.title', icon: 'Users' },
        'Orders': { titleKey: 'page.orders.title', icon: 'Package' },
        'Products': { titleKey: 'page.products.title', icon: 'ShoppingBag' },
        'Analytics': { titleKey: 'page.analytics.title', icon: 'TrendingUp' },
        'Reports': { titleKey: 'page.reports.title', icon: 'FileText' },
        'I18nTest': { titleKey: 'page.i18nTest.title', icon: 'Globe' },

        'AppearanceSettings': { titleKey: 'page.settings.appearance', icon: 'Palette' },
        'AccountSettings': { titleKey: 'page.settings.account', icon: 'User' },
        'SecuritySettings': { titleKey: 'page.settings.security', icon: 'Lock' },
        'NotificationSettings': { titleKey: 'page.settings.notifications', icon: 'Bell' },
    };

    if (componentMap[cleanName]) {
        // 注意：这里返回titleKey，调用方需要处理翻译
        return {
            title: componentMap[cleanName].titleKey,
            icon: componentMap[cleanName].icon
        };
    }

    // 尝试自动生成图标
    const icon = getIconFromComponentName(cleanName);

    return {
        title: cleanName.replace(/([A-Z])/g, ' $1').trim() || '未知页面',
        icon
    };
}

// 根据组件名称推导图标
function getIconFromComponentName(componentName: string): string {
    const name = componentName.toLowerCase();

    if (name.includes('dashboard')) return 'BarChart3';
    if (name.includes('profile') || name.includes('account')) return 'User';
    if (name.includes('setting')) return 'Settings';
    if (name.includes('user')) return 'Users';
    if (name.includes('order')) return 'Package';
    if (name.includes('product')) return 'ShoppingBag';
    if (name.includes('analytic') || name.includes('chart')) return 'TrendingUp';
    if (name.includes('report')) return 'FileText';
    if (name.includes('notification') || name.includes('message')) return 'Bell';
    if (name.includes('security') || name.includes('auth')) return 'Lock';
    if (name.includes('appearance') || name.includes('theme')) return 'Palette';
    if (name.includes('i18n') || name.includes('language')) return 'Globe';
    if (name.includes('demo') || name.includes('test')) return 'TestTube';
    if (name.includes('home')) return 'Home';
    if (name.includes('help') || name.includes('support')) return 'HelpCircle';
    if (name.includes('document')) return 'FileText';
    if (name.includes('file')) return 'Folder';
    if (name.includes('image') || name.includes('media')) return 'Image';
    if (name.includes('calendar') || name.includes('schedule')) return 'Calendar';
    if (name.includes('task') || name.includes('todo')) return 'CheckSquare';
    if (name.includes('chat') || name.includes('conversation')) return 'MessageCircle';
    if (name.includes('mail') || name.includes('email')) return 'Mail';

    return 'FileText'; // 默认图标
}

// 根据路径获取页面信息
function getInfoFromPath(pathname: string): { title: string; icon?: string } {
    // 移除开头的斜杠并分割路径
    const segments = pathname.replace(/^\/+/, '').split('/').filter(Boolean);

    if (segments.length === 0) {
        return { title: '首页', icon: 'Home' };
    }

    // 特殊路径处理
    if (pathname === '/dashboard') return { title: '仪表板', icon: 'BarChart3' };
    if (pathname.startsWith('/settings/')) return { title: getSettingsPageTitle(segments[1]), icon: 'Settings' };
    if (pathname.startsWith('/test/')) return { title: '测试页面', icon: 'TestTube' };
    if (pathname.startsWith('/demo/')) return { title: '演示页面', icon: 'TestTube' };

    // 动态生成标题
    const lastSegment = segments[segments.length - 1];
    const title = formatTitle(lastSegment);
    const icon = getIconFromPath(segments);

    return { title, icon };
}

// 格式化标题
function formatTitle(segment: string): string {
    return segment
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

// 获取设置页面标题
function getSettingsPageTitle(page: string): string {
    const settingsPages: Record<string, string> = {
        'profile': '个人资料',
        'account': '账户设置',
        'security': '安全设置',
        'notifications': '通知设置',
        'appearance': '外观设置',
        'privacy': '隐私设置',
        'billing': '账单设置',
        'integrations': '集成设置',
    };

    return settingsPages[page] || formatTitle(page) + '设置';
}

// 根据路径段获取图标
function getIconFromPath(segments: string[]): string {
    const pathStr = segments.join('/').toLowerCase();

    if (pathStr.includes('dashboard')) return 'BarChart3';
    if (pathStr.includes('profile') || pathStr.includes('account')) return 'User';
    if (pathStr.includes('settings')) return 'Settings';
    if (pathStr.includes('users')) return 'Users';
    if (pathStr.includes('orders')) return 'Package';
    if (pathStr.includes('products')) return 'ShoppingBag';
    if (pathStr.includes('analytics')) return 'TrendingUp';
    if (pathStr.includes('reports')) return 'FileText';
    if (pathStr.includes('notifications')) return 'Bell';
    if (pathStr.includes('security')) return 'Lock';
    if (pathStr.includes('appearance')) return 'Palette';
    if (pathStr.includes('i18n')) return 'Globe';
    if (pathStr.includes('demo') || pathStr.includes('test')) return 'TestTube';

    return 'FileText'; // 默认图标
}

// 导出useTabNavigation组合式函数
export function useTabNavigation() {
    // 集成 useTabState 核心功能
    const tabState = useTabState({
        maxTabs: 12,
        removalStrategy: 'lru',
        autoCleanup: true,
        persistent: false // 我们使用自己的持久化逻辑
    });

    // 渐进式加载配置
    const progressiveLoadingConfig: ProgressiveLoadingConfig = {
        enabled: true,
        rootMargin: '100px',
        threshold: 0.1,
        idleThreshold: 2000,
        preloadCount: 2,
        adaptiveNetworkStrategy: true,
        lowPriorityDelay: 300,
    };

    // 集成渐进式Tab加载
    const progressiveLoader = useProgressiveTabLoading(progressiveLoadingConfig);

    // 错误处理状态
    const errors = ref<Array<{ message: string; timestamp: number; type: string }>>([]);
    const isLoading = ref(false);

    /**
     * 错误处理工具
     */
    const errorHandler = {
        /**
         * 添加错误记录
         */
        addError(message: string, type: string = 'general', error?: any) {
            const errorRecord = {
                message,
                type,
                timestamp: Date.now()
            };
            errors.value.push(errorRecord);

            // 限制错误记录数量，避免内存泄漏
            if (errors.value.length > 50) {
                errors.value.splice(0, errors.value.length - 50);
            }

            console.warn(`[TabNavigation Error] ${type}: ${message}`, error);
        },

        /**
         * 清除错误记录
         */
        clearErrors() {
            errors.value.splice(0, errors.value.length);
        },

        /**
         * 获取最近的错误
         */
        getRecentErrors(count: number = 5) {
            return errors.value.slice(-count);
        }
    };

    /**
     * 事件历史记录工具
     */
    const eventLogger = {
        /**
         * 记录标签页操作事件
         */
        logEvent(type: string, data: any = {}, tabId?: string) {
            try {
                const eventData = {
                    type,
                    tabId,
                    timestamp: Date.now(),
                    data: JSON.parse(JSON.stringify(data)) // 深拷贝避免引用问题
                };

                console.log(`[TabNavigation Event] ${type}:`, eventData);

                // 可以在这里添加发送到分析系统的逻辑
                // analytics.track('tab_navigation', eventData);

            } catch (error) {
                errorHandler.addError('Failed to log event', 'event_logging', error);
            }
        },

        /**
         * 记录性能指标
         */
        logPerformance(operation: string, startTime: number, additionalData: any = {}) {
            const endTime = Date.now();
            const duration = endTime - startTime;

            this.logEvent('performance', {
                operation,
                duration,
                ...additionalData
            });

            // 如果操作时间过长，记录警告
            if (duration > 100) {
                errorHandler.addError(
                    `Slow operation detected: ${operation} took ${duration}ms`,
                    'performance'
                );
            }
        }
    };

    /**
     * 适配器函数：将标准TabItem转换为兼容TabItem
     */
    const toCompatibleTab = (baseTab: BaseTabItem, isActive: boolean = false): TabItem => {
        return {
            id: baseTab.id,
            title: baseTab.title,
            href: baseTab.route,
            icon: baseTab.icon,
            isActive,
            isClosable: baseTab.closable !== false,
            lastAccessed: baseTab.lastAccessed,
            createdAt: baseTab.createdAt,
            // 保留其他字段
            params: baseTab.params,
            query: baseTab.query,
            temporary: baseTab.temporary,
            status: baseTab.status,
            meta: baseTab.meta,
        };
    };

    /**
     * 适配器函数：将兼容TabItem转换为标准TabItem
     */
    const toStandardTab = (compatTab: Partial<TabItem>): BaseTabItem => {
        const now = Date.now();
        return {
            id: compatTab.id || `tab_${now}_${Math.random().toString(36).substr(2, 9)}`,
            title: compatTab.title || 'New Tab',
            route: compatTab.href || '/',
            icon: compatTab.icon,
            closable: compatTab.isClosable,
            lastAccessed: compatTab.lastAccessed || now,
            createdAt: compatTab.createdAt || now,
            params: compatTab.params || {},
            query: compatTab.query || {},
            temporary: compatTab.temporary || false,
            status: compatTab.status || 'loaded',
            meta: compatTab.meta || {},
        };
    };

    const page = usePage();
    const { t, locale } = useI18n();

    // 获取或初始化全局状态
    const state = initializeGlobalState();
    const tabs = state.tabs;
    const activeTabId = state.activeTabId;

    // 创建路径到翻译键的映射
    const getTranslationKeyForPath = (href: string): string | null => {
        // 直接的路径映射
        const pathMappings: Record<string, string> = {
            '/dashboard': 'page.dashboard.title',
            '/i18n-test': 'page.i18nTest.title',
        };

        // 检查直接映射
        if (pathMappings[href]) {
            return pathMappings[href];
        }

        // 检查路径模式
        if (href.includes('/settings')) {
            return 'page.settings.title';
        }

        if (href.includes('/test/topmenubar')) {
            return 'page.test.topMenuBar.title';
        }

        // 其他测试页面
        if (href.includes('/test/')) {
            return 'page.test.title';
        }

        // 演示页面
        if (href.includes('/demo/')) {
            return 'page.demo.title';
        }

        return null;
    };

    // 智能翻译Tab标题
    const translateTabTitles = () => {
        tabs.value.forEach(tab => {
            const translationKey = getTranslationKeyForPath(tab.href);

            if (translationKey) {
                try {
                    // 尝试翻译
                    const translatedTitle = t(translationKey);
                    // 检查翻译是否成功（不是翻译键本身，也不是以 [ 开始的错误信息）
                    if (translatedTitle && translatedTitle !== translationKey && !translatedTitle.startsWith('[')) {
                        tab.title = translatedTitle;
                    } else {
                        // 如果翻译失败，使用备用翻译或默认值
                        switch (translationKey) {
                            case 'page.dashboard.title':
                                tab.title = t('page.dashboard.title', '仪表板');
                                break;
                            case 'page.i18nTest.title':
                                tab.title = t('page.i18nTest.title', '国际化测试');
                                break;
                            case 'page.settings.title':
                                tab.title = t('page.settings.title', '设置');
                                break;
                            case 'page.test.title':
                                tab.title = t('page.test.title', '测试页面');
                                break;
                            case 'page.test.topMenuBar.title':
                                tab.title = t('page.test.topMenuBar.title', '顶部菜单栏测试');
                                break;
                            case 'page.demo.title':
                                tab.title = t('page.demo.title', '演示页面');
                                break;
                            default:
                                // 保持原标题不变
                                break;
                        }
                    }
                } catch (error) {
                    console.warn('Failed to translate tab title for:', tab.href, error);
                }
            }
            // 如果没有找到翻译键，保持原标题不变
        });

        // 保存更新后的状态到localStorage
        saveToStorage(tabs.value, activeTabId.value);
    };

    // 初始化时翻译现有的tab标题
    translateTabTitles();

    // 监听语言变化，重新翻译所有标签页标题
    watch(locale, () => {
        translateTabTitles();
    }, { immediate: false });

    // 计算属性
    const activeTab = computed(() =>
        tabs.value.find(tab => tab.id === activeTabId.value)
    );

    const closableTabs = computed(() =>
        tabs.value.filter(tab => tab.isClosable)
    );

    // 添加Tab
    const addTab = (tab: Omit<TabItem, 'id' | 'isActive' | 'lastAccessed' | 'createdAt'>) => {
        const startTime = Date.now();

        try {
            isLoading.value = true;
            const now = Date.now();

            // 输入验证
            if (!tab.href || !tab.title) {
                errorHandler.addError('Invalid tab data: href and title are required', 'validation');
                return;
            }

            // 使用 useTabState 的验证功能
            const standardTab = toStandardTab({
                ...tab,
                id: generateTabId(),
                lastAccessed: now,
                createdAt: now,
            });

            const validationResult = tabState.utils.isValidTab(standardTab);
            if (!validationResult) {
                errorHandler.addError('Tab validation failed', 'validation', standardTab);
                eventLogger.logEvent('tab_add_failed', { reason: 'validation_failed', tab: standardTab });
                return;
            }

            // 检查是否已存在相同的标签页
            const existingTab = tabs.value.find(existingTab =>
                tabState.utils.isEqual(toStandardTab(existingTab), standardTab)
            );

            if (existingTab) {
                // 如果已存在，只需激活它
                eventLogger.logEvent('tab_add_duplicate', {
                    existingTabId: existingTab.id,
                    attemptedTab: standardTab
                });
                switchTab(existingTab.id);
                eventLogger.logPerformance('addTab_duplicate', startTime, { tabId: existingTab.id });
                return;
            }

            // 检查Tab数量限制，使用 useTabState 的智能移除策略
            if (tabs.value.length >= tabState.state.maxTabs) {
                // 使用智能移除策略 - 寻找最久未访问的可关闭标签页
                const closableTabsToCheck = tabs.value.filter(t => t.isClosable);
                if (closableTabsToCheck.length > 0) {
                    // 使用 LRU 策略：找到最久未访问的标签页
                    const oldestTab = closableTabsToCheck
                        .sort((a, b) => (a.lastAccessed || 0) - (b.lastAccessed || 0))[0];

                    const removeIndex = tabs.value.findIndex(t => t.id === oldestTab.id);
                    if (removeIndex !== -1) {
                        tabs.value.splice(removeIndex, 1);
                        eventLogger.logEvent('tab_auto_removed', {
                            removedTab: {
                                id: oldestTab.id,
                                title: oldestTab.title,
                                lastAccessed: oldestTab.lastAccessed
                            },
                            reason: 'lru_max_tabs_reached'
                        });
                        console.log('智能移除策略 (LRU): 移除最久未访问的标签页:', oldestTab.title);
                    }
                } else {
                    errorHandler.addError('Cannot add tab: max limit reached and no closable tabs available', 'limit');
                    eventLogger.logEvent('tab_add_failed', { reason: 'max_limit_no_closable', maxTabs: tabState.state.maxTabs });
                    return;
                }
            }

            // 转换为兼容格式并添加标签页
            const newTab = toCompatibleTab(standardTab, true);

            // 重置其他Tab的激活状态
            tabs.value.forEach(tab => {
                tab.isActive = false;
            });

            // 添加新Tab
            tabs.value.push(newTab);
            activeTabId.value = newTab.id;

            // 记录成功事件
            eventLogger.logEvent('tab_added', {
                tab: {
                    id: newTab.id,
                    title: newTab.title,
                    href: newTab.href
                },
                totalTabs: tabs.value.length
            }, newTab.id);

            // 保存状态到localStorage
            try {
                saveToStorage(tabs.value, activeTabId.value);
                eventLogger.logEvent('tab_state_saved', { tabCount: tabs.value.length });
            } catch (storageError) {
                errorHandler.addError('Failed to save tab state to localStorage', 'storage', storageError);
            }

            eventLogger.logPerformance('addTab_success', startTime, {
                tabId: newTab.id,
                totalTabs: tabs.value.length
            });

        } catch (error) {
            errorHandler.addError('Unexpected error in addTab', 'unexpected', error);
            eventLogger.logEvent('tab_add_error', { error: error?.toString() });
        } finally {
            isLoading.value = false;
        }
    };

    // 自动创建或切换到当前路由对应的Tab
    const syncWithCurrentRoute = () => {
        const currentPath = window.location.pathname;

        // 检查当前路径是否是认证相关页面
        const isAuthPage = currentPath.includes('/login') ||
            currentPath.includes('auth/') ||
            currentPath === '/' ||
            currentPath === '/welcome';

        // 如果当前页面是认证页面，不创建标签页
        if (isAuthPage) {
            return;
        }

        // 检查是否已存在当前路径的Tab
        const existingTab = tabs.value.find(tab => tab.href === currentPath);

        if (existingTab) {
            // 如果Tab已存在，只切换激活状态，不改变tab列表
            tabs.value.forEach((tab: TabItem) => {
                tab.isActive = tab.id === existingTab.id;
                if (tab.isActive) {
                    tab.lastAccessed = Date.now();
                }
            });
            activeTabId.value = existingTab.id;
        } else {
            // 如果Tab不存在，创建新Tab（除了仪表板）
            if (currentPath !== '/dashboard') {
                // 动态获取页面信息
                const pageInfo = getPageInfo(
                    currentPath,
                    page.props,
                    page.component
                );

                // 为页面获取正确的翻译
                const translationKey = getTranslationKeyForPath(currentPath);
                let title = pageInfo.title;

                if (translationKey) {
                    try {
                        const translatedTitle = t(translationKey);
                        if (translatedTitle && translatedTitle !== translationKey && !translatedTitle.startsWith('[')) {
                            title = translatedTitle;
                        } else {
                            // 使用备用翻译
                            title = t(translationKey, pageInfo.title);
                        }
                    } catch (error) {
                        // 翻译失败，使用原标题
                        console.warn('Failed to translate page title:', title, error);
                    }
                }
                // 对于其他页面，检查是否是翻译键格式
                else if (title && title.startsWith('page.')) {
                    try {
                        const translatedTitle = t(title);
                        if (translatedTitle && translatedTitle !== title && !translatedTitle.startsWith('[')) {
                            title = translatedTitle;
                        }
                    } catch (error) {
                        // 翻译失败，保持原标题
                        console.warn('Failed to translate page title:', title, error);
                    }
                }

                // 检查页面是否应该可关闭（从 meta 中获取，默认为 true）
                const isClosable = (page.props as any)?.meta?.closable !== false;

                addTab({
                    title,
                    icon: pageInfo.icon,
                    href: currentPath,
                    isClosable,
                });
            }
        }

        // 保存状态到localStorage
        saveToStorage(tabs.value, activeTabId.value);
    };

    // 移除Tab
    const removeTab = (tabId: string) => {
        const startTime = Date.now();

        try {
            isLoading.value = true;

            const tabIndex = tabs.value.findIndex(t => t.id === tabId);
            if (tabIndex === -1) {
                errorHandler.addError(`Tab not found: ${tabId}`, 'not_found');
                eventLogger.logEvent('tab_remove_failed', { reason: 'not_found', tabId });
                return;
            }

            const tabToRemove = tabs.value[tabIndex];

            // 记录移除前的状态
            eventLogger.logEvent('tab_remove_started', {
                tab: {
                    id: tabToRemove.id,
                    title: tabToRemove.title,
                    href: tabToRemove.href
                },
                totalTabsBefore: tabs.value.length
            }, tabId);

            // 如果移除的是激活Tab，需要激活另一个Tab
            if (tabToRemove.isActive && tabs.value.length > 1) {
                let nextActiveTab: TabItem | null = null;

                // 尝试激活同位置的Tab，如果不存在则激活前一个
                if (tabIndex < tabs.value.length - 1) {
                    nextActiveTab = tabs.value[tabIndex + 1];
                } else if (tabIndex > 0) {
                    nextActiveTab = tabs.value[tabIndex - 1];
                }

                if (nextActiveTab) {
                    eventLogger.logEvent('tab_activation_redirect', {
                        fromTabId: tabId,
                        toTabId: nextActiveTab.id
                    });

                    // 激活新Tab
                    tabs.value.forEach(tab => {
                        tab.isActive = tab.id === nextActiveTab!.id;
                    });
                    activeTabId.value = nextActiveTab.id;

                    // 更新路由
                    try {
                        router.visit(nextActiveTab.href, { replace: true });
                    } catch (routingError) {
                        errorHandler.addError('Failed to navigate after tab removal', 'routing', routingError);
                    }
                }
            }

            // 移除Tab
            tabs.value.splice(tabIndex, 1);

            // 如果没有Tab了，重置激活状态
            if (tabs.value.length === 0) {
                activeTabId.value = '';
                eventLogger.logEvent('all_tabs_removed');
            }

            // 保存状态
            try {
                saveToStorage(tabs.value, activeTabId.value);
                eventLogger.logEvent('tab_state_saved_after_removal', { tabCount: tabs.value.length });
            } catch (storageError) {
                errorHandler.addError('Failed to save state after tab removal', 'storage', storageError);
            }

            eventLogger.logEvent('tab_removed_success', {
                removedTabId: tabId,
                totalTabsAfter: tabs.value.length
            });

            eventLogger.logPerformance('removeTab', startTime, {
                tabId,
                totalTabs: tabs.value.length
            });

        } catch (error) {
            errorHandler.addError('Unexpected error in removeTab', 'unexpected', error);
            eventLogger.logEvent('tab_remove_error', { tabId, error: error?.toString() });
        } finally {
            isLoading.value = false;
        }
    };

    // 切换Tab
    const switchTab = (tabId: string) => {
        const startTime = Date.now();

        try {
            isLoading.value = true;

            const targetTab = tabs.value.find(t => t.id === tabId);
            if (!targetTab) {
                errorHandler.addError(`Cannot switch to tab: ${tabId} not found`, 'not_found');
                eventLogger.logEvent('tab_switch_failed', { reason: 'not_found', tabId });
                return;
            }

            const previousActiveTab = tabs.value.find(t => t.isActive);

            eventLogger.logEvent('tab_switch_started', {
                fromTabId: previousActiveTab?.id || null,
                toTabId: tabId
            });

            // 更新激活状态
            tabs.value.forEach(tab => {
                tab.isActive = tab.id === tabId;
                // 更新最后访问时间
                if (tab.id === tabId) {
                    tab.lastAccessed = Date.now();
                }
            });

            activeTabId.value = tabId;

            // 导航到目标页面（关键修复）
            try {
                // 检查当前页面是否已经是目标页面
                if (window.location.pathname !== targetTab.href) {
                    router.visit(targetTab.href, { replace: false });
                }
            } catch (routingError) {
                errorHandler.addError('Failed to navigate to tab URL', 'routing', routingError);
                console.error('路由导航失败:', routingError);
            }

            // 保存状态
            try {
                saveToStorage(tabs.value, activeTabId.value);
            } catch (storageError) {
                errorHandler.addError('Failed to save state after tab switch', 'storage', storageError);
            }

            eventLogger.logEvent('tab_switched_success', {
                tabId,
                tabTitle: targetTab.title,
                targetHref: targetTab.href
            }, tabId);

            // 触发预加载策略 (异步执行，不阻塞主流程)
            nextTick(() => {
                try {
                    // 先清理旧的预取链接
                    const prefetchLinks = document.querySelectorAll('link[rel="prefetch"]');
                    prefetchLinks.forEach(link => link.remove());

                    // 传统预加载相邻标签页
                    const currentIndex = tabs.value.findIndex(tab => tab.id === tabId);
                    if (currentIndex !== -1) {
                        const adjacentTabs = [
                            tabs.value[currentIndex - 1], // 前一个
                            tabs.value[currentIndex + 1]  // 后一个
                        ].filter(Boolean);

                        adjacentTabs.forEach(tab => {
                            if (tab && !tab.href.includes('/login') && !tab.href.includes('auth/')) {
                                const link = document.createElement('link');
                                link.rel = 'prefetch';
                                link.href = tab.href;
                                document.head.appendChild(link);
                                
                                eventLogger.logEvent('tab_auto_prefetch', {
                                    prefetchedTabId: tab.id,
                                    prefetchedHref: tab.href,
                                    triggeredBy: tabId
                                });
                            }
                        });

                        // 渐进式预加载相邻标签页
                        const allTabIds = tabs.value.map(tab => tab.id);
                        progressiveLoader.preloadAdjacentTabs(tabId, allTabIds);

                        eventLogger.logEvent('progressive_preload_triggered', {
                            currentTabId: tabId,
                            adjacentTabsCount: adjacentTabs.length,
                            totalTabs: allTabIds.length
                        });
                    }
                } catch (preloadError) {
                    // 预加载失败不应影响主功能
                    console.warn('Tab preload failed:', preloadError);
                }
            });

            eventLogger.logPerformance('switchTab', startTime, { tabId });

        } catch (error) {
            errorHandler.addError('Unexpected error in switchTab', 'unexpected', error);
            eventLogger.logEvent('tab_switch_error', { tabId, error: error?.toString() });
        } finally {
            isLoading.value = false;
        }
    };

    // 关闭其他Tab
    const closeOtherTabs = (keepTabId: string) => {
        const tabsToRemove = tabs.value.filter((tab: TabItem) =>
            tab.id !== keepTabId && tab.isClosable
        );

        tabsToRemove.forEach((tab: TabItem) => {
            const index = tabs.value.findIndex((t: TabItem) => t.id === tab.id);
            if (index !== -1) {
                tabs.value.splice(index, 1);
            }
        });

        // 如果保留的Tab不是当前激活的，切换到它
        switchTab(keepTabId);
    };

    // 关闭所有可关闭的Tab
    const closeAllTabs = () => {
        const nonClosableTabs = tabs.value.filter((tab: TabItem) => !tab.isClosable);
        tabs.value = nonClosableTabs;

        // 切换到第一个不可关闭的Tab
        if (nonClosableTabs.length > 0) {
            switchTab(nonClosableTabs[0].id);
        }

        // 保存状态到localStorage
        saveToStorage(tabs.value, activeTabId.value);
    };

    // 手动更新标签页信息（用于页面内动态更新）
    const updateTabInfo = (tabId: string, info: Partial<Pick<TabItem, 'title' | 'icon'>>) => {
        const tab = tabs.value.find((t: TabItem) => t.id === tabId);
        if (tab) {
            if (info.title) tab.title = info.title;
            if (info.icon) tab.icon = info.icon;

            // 保存状态到localStorage
            saveToStorage(tabs.value, activeTabId.value);
        }
    };

    // 清理认证相关的标签页（登录后调用）
    const cleanupAuthTabs = () => {
        const tabsToRemove = tabs.value.filter((tab: TabItem) =>
            tab.href.includes('/login') ||
            tab.href.includes('auth/') ||
            tab.href === '/' ||
            tab.href === '/welcome'
        );

        tabsToRemove.forEach((tab: TabItem) => {
            const index = tabs.value.findIndex((t: TabItem) => t.id === tab.id);
            if (index !== -1) {
                tabs.value.splice(index, 1);
            }
        });

        // 如果没有标签页了，添加默认的仪表板标签页
        if (tabs.value.length === 0) {
            const dashboardTab: TabItem = {
                id: generateTabId(),
                title: '仪表板',
                icon: 'BarChart3',
                href: '/dashboard',
                isActive: true,
                isClosable: false,
                lastAccessed: Date.now(),
            };
            tabs.value.push(dashboardTab);
            activeTabId.value = dashboardTab.id;
        } else {
            // 确保有一个激活的标签页
            const hasActiveTab = tabs.value.some((tab: TabItem) => tab.isActive);
            if (!hasActiveTab) {
                tabs.value[0].isActive = true;
                activeTabId.value = tabs.value[0].id;
            }
        }

        // 保存清理后的状态
        saveToStorage(tabs.value, activeTabId.value);
    };

    // 重置为单一仪表板标签页（登录后调用）
    const resetToSingleDashboard = () => {
        // 清空所有现有标签页
        tabs.value = [];

        // 创建单一的仪表板标签页
        const dashboardTab: TabItem = {
            id: generateTabId(),
            title: '仪表板', // 默认标题，稍后会被翻译覆盖
            icon: 'BarChart3',
            href: '/dashboard',
            isActive: true,
            isClosable: false,
            lastAccessed: Date.now(),
        };

        tabs.value.push(dashboardTab);
        activeTabId.value = dashboardTab.id;

        // 尝试翻译仪表板标题
        try {
            const { t } = useI18n();
            const translatedTitle = t('page.dashboard.title');
            if (translatedTitle && !translatedTitle.startsWith('[') && translatedTitle !== 'page.dashboard.title') {
                dashboardTab.title = translatedTitle;
            }
        } catch (error) {
            // 翻译失败，保持默认标题
            console.warn('无法翻译仪表板标题:', error);
        }

        // 保存重置后的状态
        saveToStorage(tabs.value, activeTabId.value);

        // 导航到仪表板（如果当前不在仪表板页面）
        if (window.location.pathname !== '/dashboard') {
            router.get('/dashboard');
        }
    };

    // 监听路由变化（仅在第一次挂载时设置）
    onMounted(() => {
        // 初始同步当前路由
        syncWithCurrentRoute();

        // 监听 Inertia.js 路由变化
        router.on('success', () => {
            syncWithCurrentRoute();
        });
    });

    return {
        // 状态
        tabs: readonly(tabs),
        activeTabId: readonly(activeTabId),
        maxTabs: tabState.state.maxTabs,

        // 计算属性
        activeTab,
        closableTabs: readonly(closableTabs),
        tabCount: computed(() => tabs.value.length),
        canAddMoreTabs: computed(() => tabs.value.length < tabState.state.maxTabs),

        // 核心功能
        addTab,
        removeTab,
        switchTab,
        closeAllTabs,
        closeOtherTabs,
        resetToSingleDashboard,

        // 工具函数
        updateTabInfo,
        cleanupAuthTabs,

        // 路由同步
        syncWithCurrentRoute,
        isCurrentRouteInTabs: computed(() => tabs.value.some(tab => tab.href === window.location.pathname)),

        // 渐进式加载功能
        progressiveLoading: {
            // 状态
            loadingStats: progressiveLoader.loadingStats,
            allTabStates: progressiveLoader.allTabStates,
            networkInfo: progressiveLoader.networkInfo,
            
            // 方法
            registerTab: progressiveLoader.registerTab,
            forceLoadTab: progressiveLoader.forceLoadTab,
            getTabState: progressiveLoader.getTabState,
            
            // 配置
            config: progressiveLoader.config,
        },

        // 预加载功能
        preloadStrategy: {
            // 预加载相邻标签页
            preloadAdjacentTabs: () => {
                const currentIndex = tabs.value.findIndex(tab => tab.id === activeTabId.value);
                if (currentIndex === -1) return;

                const adjacentTabs = [
                    tabs.value[currentIndex - 1], // 前一个
                    tabs.value[currentIndex + 1]  // 后一个
                ].filter(Boolean);

                adjacentTabs.forEach(tab => {
                    if (tab && !tab.href.includes('/login') && !tab.href.includes('auth/')) {
                        // 预取相邻标签页的资源
                        const link = document.createElement('link');
                        link.rel = 'prefetch';
                        link.href = tab.href;
                        document.head.appendChild(link);
                        
                        eventLogger.logEvent('tab_prefetch', {
                            prefetchedTabId: tab.id,
                            prefetchedHref: tab.href,
                            reason: 'adjacent_tab'
                        });
                    }
                });
            },

            // 预加载高频访问的标签页
            preloadFrequentTabs: () => {
                // 基于lastAccessed排序，预加载最近访问的标签页
                const frequentTabs = [...tabs.value]
                    .filter(tab => tab.id !== activeTabId.value)
                    .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))
                    .slice(0, 3); // 预加载前3个高频标签页

                frequentTabs.forEach(tab => {
                    if (tab && !tab.href.includes('/login') && !tab.href.includes('auth/')) {
                        const link = document.createElement('link');
                        link.rel = 'prefetch';
                        link.href = tab.href;
                        document.head.appendChild(link);
                        
                        eventLogger.logEvent('tab_prefetch', {
                            prefetchedTabId: tab.id,
                            prefetchedHref: tab.href,
                            reason: 'frequent_access'
                        });
                    }
                });
            },

            // 智能预测下一个可能访问的标签页
            predictivePreload: () => {
                const currentPath = window.location.pathname;
                
                // 基于用户行为模式预测
                const predictions: Record<string, string[]> = {
                    '/dashboard': ['/orders', '/products', '/analytics'],
                    '/orders': ['/products', '/customers', '/dashboard'],
                    '/products': ['/orders', '/inventory', '/dashboard'],
                    '/customers': ['/orders', '/analytics', '/dashboard'],
                    '/analytics': ['/dashboard', '/reports', '/orders']
                };

                const predictedPaths = predictions[currentPath] || [];
                
                predictedPaths.forEach(path => {
                    const targetTab = tabs.value.find(tab => tab.href === path);
                    if (targetTab) {
                        const link = document.createElement('link');
                        link.rel = 'prefetch';
                        link.href = path;
                        document.head.appendChild(link);
                        
                        eventLogger.logEvent('tab_prefetch', {
                            prefetchedTabId: targetTab.id,
                            prefetchedHref: path,
                            reason: 'predictive'
                        });
                    }
                });
            },

            // 清理预取的链接
            cleanupPrefetchLinks: () => {
                const prefetchLinks = document.querySelectorAll('link[rel="prefetch"]');
                prefetchLinks.forEach(link => link.remove());
                
                eventLogger.logEvent('prefetch_cleanup', {
                    removedLinksCount: prefetchLinks.length
                });
            }
        },

        // 错误处理和监控
        errors: readonly(errors),
        isLoading: readonly(isLoading),
        errorHandler: {
            addError: errorHandler.addError,
            clearErrors: errorHandler.clearErrors,
            getRecentErrors: errorHandler.getRecentErrors
        },

        // 事件监控
        eventLogger: {
            logEvent: eventLogger.logEvent,
            logPerformance: eventLogger.logPerformance
        },

        // 状态监控
        getTabState: () => {
            return {
                tabs: tabs.value.length,
                activeTabId: activeTabId.value,
                maxTabs: tabState.state.maxTabs,
                errors: errors.value.length,
                isLoading: isLoading.value,
                memoryUsage: tabs.value.reduce((total, tab) => {
                    return total + JSON.stringify(tab).length;
                }, 0)
            };
        },

        // 调试工具
        debug: {
            dumpState: () => {
                console.log('=== Tab Navigation State ===');
                console.log('Tabs:', tabs.value);
                console.log('Active Tab ID:', activeTabId.value);
                console.log('Recent Errors:', errorHandler.getRecentErrors());
                console.log('Loading:', isLoading.value);
                console.log('useTabState config:', tabState.config);
                console.log('Tab State Stats:', tabState.stats);
            },

            validateIntegrity: () => {
                const issues: string[] = [];

                // 检查激活状态一致性
                const activeTabs = tabs.value.filter(t => t.isActive);
                if (activeTabs.length > 1) {
                    issues.push('Multiple active tabs found');
                }
                if (activeTabs.length === 1 && activeTabs[0].id !== activeTabId.value) {
                    issues.push('Active tab ID mismatch');
                }

                // 检查重复ID
                const tabIds = tabs.value.map(t => t.id);
                const uniqueIds = new Set(tabIds);
                if (tabIds.length !== uniqueIds.size) {
                    issues.push('Duplicate tab IDs found');
                }

                // 检查必需字段
                for (const tab of tabs.value) {
                    if (!tab.id || !tab.title || !tab.href) {
                        issues.push(`Invalid tab data: ${tab.id}`);
                    }
                }

                if (issues.length === 0) {
                    console.log('✅ Tab navigation integrity check passed');
                } else {
                    console.warn('⚠️ Tab navigation integrity issues:', issues);
                }

                return issues;
            }
        }
    };
} 