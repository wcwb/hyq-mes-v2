import type { LucideIcon } from 'lucide-vue-next';
import type { Config } from 'ziggy-js';

export interface Auth {
    user: User;
}


export interface NavItem {
    title: string;
    href: string;
    icon?: LucideIcon;
    isActive?: boolean;
}

// TopMenuBar 相关类型定义
export interface TopMenuBarProps {
    /** 是否显示侧边栏触发器 */
    showSidebarTrigger?: boolean;
    /** 自定义CSS类名 */
    class?: string;
    /** 是否启用移动端优化 */
    enableMobileOptimization?: boolean;
    /** 搜索栏最大宽度 */
    searchMaxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export interface MenuBarSlots {
    /** 侧边栏触发器插槽 */
    'sidebar-trigger'?: () => any;
    /** 搜索栏插槽 */
    'search-bar'?: () => any;
    /** 语言切换插槽 */
    'language-toggle'?: () => any;
    /** 主题切换插槽 */
    'theme-toggle'?: () => any;
    /** 用户菜单插槽 */
    'user-menu'?: (props: { user?: User }) => any;
    /** Tab导航插槽 */
    'tab-navigation'?: () => any;
    /** 应用Logo插槽 */
    'app-logo'?: () => any;
}

// 响应式断点类型
export type BreakpointSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// 移动端工具菜单项类型
export interface MobileToolItem {
    id: string;
    label: string;
    icon: string;
    action: () => void;
    visible?: boolean;
}

// SearchBar 相关类型定义
export interface SearchBarProps {
    /** 是否显示键盘快捷键提示 */
    showShortcut?: boolean;
    /** 自定义CSS类名 */
    class?: string;
    /** 占位符文本（可选，会覆盖默认i18n文本） */
    placeholder?: string;
    /** 是否紧凑模式 */
    compact?: boolean;
    /** 最大宽度设置 */
    maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export interface SearchResult {
    id: string;
    type: 'page' | 'order' | 'product' | 'user' | 'setting' | 'action';
    title: string;
    description: string;
    url?: string;
    icon?: string;
    category: string;
    keywords: string[];
    metadata?: Record<string, any>;
}

export interface SearchBarEmits {
    /** 搜索对话框打开事件 */
    (e: 'search:open'): void;
    /** 搜索对话框关闭事件 */
    (e: 'search:close'): void;
    /** 搜索查询事件 */
    (e: 'search:query', query: string): void;
    /** 搜索结果选择事件 */
    (e: 'search:select', result: SearchResult): void;
}

// 全局搜索相关类型定义
export interface SearchHistoryItem {
    id: string;
    query: string;
    timestamp: number;
    resultCount: number;
}

export interface SearchState {
    isLoading: boolean;
    isOpen: boolean;
    currentQuery: string;
    results: SearchResult[];
    groupedResults: Array<{ type: string; items: SearchResult[] }>;
    selectedIndex: number;
    error: string | null;
}

export interface SearchStats {
    totalSearches: number;
    averageResultCount: number;
    popularQueries: Array<{ query: string; count: number }>;
    recentSearchTime: number;
}

export interface SearchSuggestions {
    recent?: string[];
    popular?: string[];
    matching?: string[];
}

export type AppPageProps<T extends Record<string, unknown> = Record<string, unknown>> = T & {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    ziggy: Config & { location: string };
    sidebarOpen: boolean;
};

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
}

