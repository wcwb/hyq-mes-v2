import { beforeAll, afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/vue'
import { config } from '@vue/test-utils'

// 测试前的全局设置
beforeAll(() => {
    // 设置Vue Test Utils全局配置
    config.global.stubs = {
        // 处理路由组件
        'router-link': true,
        'router-view': true,

        // 处理Inertia组件
        'Head': true,
        'Link': true
    }

    // 模拟console方法以减少测试中的噪音
    if (process.env.NODE_ENV !== 'development') {
        global.console = {
            ...console,
            warn: () => { },
            error: () => { },
            log: () => { }
        }
    }

    // 设置全局matchMedia mock（如果还没有设置）
    if (!window.matchMedia) {
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: (query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: () => { },
                removeListener: () => { },
                addEventListener: () => { },
                removeEventListener: () => { },
                dispatchEvent: () => { },
            }),
        })
    }

    // 设置ResizeObserver mock
    global.ResizeObserver = class ResizeObserver {
        constructor(callback: ResizeObserverCallback) { }
        observe() { }
        unobserve() { }
        disconnect() { }
    }

    // 设置IntersectionObserver mock
    global.IntersectionObserver = class IntersectionObserver {
        root = null
        rootMargin = '0px'
        thresholds = [0]

        constructor(callback: IntersectionObserverCallback) { }
        observe() { }
        unobserve() { }
        disconnect() { }
        takeRecords(): IntersectionObserverEntry[] { return [] }
    } as any
})

// 每个测试前的设置
beforeEach(() => {
    // 重置DOM
    document.head.innerHTML = ''
    document.body.innerHTML = '<div id="app"></div>'

    // 重置HTML lang属性
    document.documentElement.lang = 'zh'
})

// 每个测试后的清理
afterEach(() => {
    // 清理渲染的组件
    cleanup()

    // 清理所有定时器
    vi.clearAllTimers()

    // 清理所有模拟
    vi.clearAllMocks()

    // 清理localStorage和sessionStorage
    localStorage.clear()
    sessionStorage.clear()
}) 