import { createI18n } from 'vue-i18n'
import type { App } from 'vue'
import { vi } from 'vitest'

// 测试用的简化翻译消息
export const testMessages = {
    zh: {
        greeting: '你好',
        menu: {
            home: '首页',
            about: '关于'
        },
        button: {
            submit: '提交',
            cancel: '取消'
        },
        test: {
            title: '测试标题',
            description: '测试描述'
        }
    },
    en: {
        greeting: 'Hello',
        menu: {
            home: 'Home',
            about: 'About'
        },
        button: {
            submit: 'Submit',
            cancel: 'Cancel'
        },
        test: {
            title: 'Test Title',
            description: 'Test Description'
        }
    }
}

/**
 * 创建测试用的i18n实例
 */
export function createTestI18n(locale = 'zh') {
    return createI18n({
        legacy: false,
        locale,
        fallbackLocale: 'en',
        messages: testMessages,
        silentTranslationWarn: true,
        silentFallbackWarn: true
    })
}

/**
 * 安装i18n到Vue应用实例
 */
export function withI18n(app: App, locale = 'zh') {
    const i18n = createTestI18n(locale)
    app.use(i18n)
    return i18n
}

/**
 * 模拟localStorage
 */
export function mockLocalStorage() {
    const storage: Record<string, string> = {}

    return {
        getItem: vi.fn((key: string) => storage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            storage[key] = value
        }),
        removeItem: vi.fn((key: string) => {
            delete storage[key]
        }),
        clear: vi.fn(() => {
            Object.keys(storage).forEach(key => delete storage[key])
        }),
        get length() {
            return Object.keys(storage).length
        },
        key: vi.fn((index: number) => Object.keys(storage)[index] || null)
    }
}

/**
 * 模拟浏览器语言检测
 */
export function mockNavigatorLanguage(language = 'zh-CN') {
    Object.defineProperty(navigator, 'language', {
        writable: true,
        value: language
    })
}

/**
 * 模拟DOM lang属性
 */
export function mockDocumentLang() {
    Object.defineProperty(document.documentElement, 'lang', {
        writable: true,
        value: 'zh'
    })
}

/**
 * 测试工具：等待DOM更新
 */
export function nextTick() {
    return new Promise(resolve => setTimeout(resolve, 0))
}

/**
 * 测试工具：等待指定时间
 */
export function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 设置测试环境
 */
export function setupTestEnvironment() {
    // 模拟localStorage
    Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage(),
        writable: true
    })

    // 模拟document.documentElement.lang
    mockDocumentLang()

    // 模拟navigator.language
    mockNavigatorLanguage()

    // 模拟window.matchMedia（用于媒体查询检测）
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }))
    })
}

/**
 * 清理测试环境
 */
export function cleanupTestEnvironment() {
    vi.clearAllMocks()
    localStorage.clear()
    document.documentElement.lang = 'zh'
} 