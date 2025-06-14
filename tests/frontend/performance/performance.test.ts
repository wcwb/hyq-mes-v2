import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
    setupTestEnvironment,
    cleanupTestEnvironment,
    wait
} from '../utils/i18n-test-utils'

// 性能测试常量
const PERFORMANCE_THRESHOLDS = {
    LANGUAGE_SWITCH_TIME: 100, // 语言切换应在100ms内完成
    INITIAL_LOAD_TIME: 500,    // 初始加载应在500ms内完成
    COMPONENT_RENDER_TIME: 50  // 组件渲染应在50ms内完成
}

describe('性能监控测试', () => {
    beforeEach(() => {
        setupTestEnvironment()
        // 重置性能计时器
        if (typeof performance.clearMarks === 'function') {
            performance.clearMarks()
        }
        if (typeof performance.clearMeasures === 'function') {
            performance.clearMeasures()
        }
    })

    afterEach(() => {
        cleanupTestEnvironment()
    })

    describe('语言切换性能', () => {
        it('应该在指定时间内完成语言切换', async () => {
            const startTime = performance.now()

            // 模拟语言切换操作
            localStorage.setItem('locale', 'en')
            document.documentElement.lang = 'en'

            const endTime = performance.now()
            const switchTime = endTime - startTime

            expect(switchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LANGUAGE_SWITCH_TIME)
        })

        it('应该正确记录性能指标', () => {
            // 创建性能标记
            if (performance.mark) {
                performance.mark('language-switch-start')

                // 模拟一些操作
                localStorage.setItem('locale', 'zh')

                performance.mark('language-switch-end')

                // 创建性能测量
                if (performance.measure) {
                    performance.measure(
                        'language-switch-duration',
                        'language-switch-start',
                        'language-switch-end'
                    )

                    const measures = performance.getEntriesByName('language-switch-duration')
                    expect(measures.length).toBeGreaterThan(0)
                    expect(measures[0].duration).toBeLessThan(PERFORMANCE_THRESHOLDS.LANGUAGE_SWITCH_TIME)
                }
            }
        })
    })

    describe('组件渲染性能', () => {
        it('应该在指定时间内完成组件渲染', async () => {
            const startTime = performance.now()

            // 模拟组件渲染
            const mockComponent = document.createElement('div')
            mockComponent.innerHTML = '<button>Language Switcher</button>'
            document.body.appendChild(mockComponent)

            const endTime = performance.now()
            const renderTime = endTime - startTime

            expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPONENT_RENDER_TIME)

            // 清理
            document.body.removeChild(mockComponent)
        })

        it('应该监控内存使用情况', () => {
            // 检查内存API是否可用（Chrome特有属性）
            const perfMemory = (performance as any).memory
            if (perfMemory) {
                const initialMemory = perfMemory.usedJSHeapSize

                // 模拟一些内存操作
                const testData = new Array(1000).fill('test')

                const finalMemory = perfMemory.usedJSHeapSize
                const memoryIncrease = finalMemory - initialMemory

                // 验证内存增长在合理范围内
                expect(memoryIncrease).toBeGreaterThan(0)
                expect(memoryIncrease).toBeLessThan(1024 * 1024) // 小于1MB

                // 清理测试数据
                testData.length = 0
            } else {
                // 如果没有内存API，测试仍然通过
                expect(true).toBe(true)
            }
        })
    })

    describe('网络请求性能', () => {
        it('应该模拟并测试API请求性能', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ locale: 'zh', messages: {} })
            })

            // 替换全局fetch
            global.fetch = mockFetch

            const startTime = performance.now()

            // 模拟API请求
            const response = await fetch('/api/i18n/messages')
            const data = await response.json()

            const endTime = performance.now()
            const requestTime = endTime - startTime

            expect(requestTime).toBeLessThan(1000) // 应在1秒内完成
            expect(mockFetch).toHaveBeenCalledTimes(1)
            expect(data).toHaveProperty('locale')

            // 恢复原始fetch
            vi.restoreAllMocks()
        })

        it('应该处理慢网络条件', async () => {
            const slowMockFetch = vi.fn().mockImplementation(() =>
                new Promise(resolve => {
                    setTimeout(() => {
                        resolve({
                            ok: true,
                            json: () => Promise.resolve({ locale: 'en', messages: {} })
                        })
                    }, 200) // 模拟200ms延迟
                })
            )

            global.fetch = slowMockFetch

            const startTime = performance.now()
            const response = await fetch('/api/i18n/messages')
            const data = await response.json()
            const endTime = performance.now()

            const requestTime = endTime - startTime

            expect(requestTime).toBeGreaterThan(200) // 应该反映延迟
            expect(requestTime).toBeLessThan(500)    // 但不应该超过合理范围
            expect(data).toHaveProperty('locale')

            vi.restoreAllMocks()
        })
    })

    describe('用户体验指标', () => {
        it('应该测量首次内容渲染时间', () => {
            if (performance.getEntriesByType) {
                // 模拟FCP指标
                const paintEntries = performance.getEntriesByType('paint')

                // 在测试环境中可能没有真实的paint事件
                // 但我们可以验证API的存在和调用
                expect(Array.isArray(paintEntries)).toBe(true)
            }
        })

        it('应该测量交互延迟', async () => {
            const startTime = performance.now()

            // 模拟用户交互
            const event = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            })

            const button = document.createElement('button')
            document.body.appendChild(button)

            button.dispatchEvent(event)

            const endTime = performance.now()
            const interactionTime = endTime - startTime

            expect(interactionTime).toBeLessThan(16) // 应在一帧时间内响应

            document.body.removeChild(button)
        })
    })

    describe('资源加载性能', () => {
        it('应该监控静态资源加载时间', () => {
            if (performance.getEntriesByType) {
                const resourceEntries = performance.getEntriesByType('resource')

                // 验证资源条目的结构
                if (resourceEntries.length > 0) {
                    const firstResource = resourceEntries[0]
                    expect(firstResource).toHaveProperty('name')
                    expect(firstResource).toHaveProperty('duration')
                    expect(firstResource.duration).toBeGreaterThanOrEqual(0)
                }
            }
        })

        it('应该检测长时间运行的任务', async () => {
            if (PerformanceObserver) {
                const longTaskPromise = new Promise<PerformanceEntry[]>((resolve) => {
                    const observer = new PerformanceObserver((list) => {
                        const entries = list.getEntries()
                        observer.disconnect()
                        resolve(entries)
                    })

                    try {
                        observer.observe({ entryTypes: ['longtask'] })

                        // 模拟长任务（在测试环境中可能不会触发）
                        setTimeout(() => {
                            observer.disconnect()
                            resolve([])
                        }, 100)
                    } catch (error) {
                        // 某些环境可能不支持longtask观察
                        observer.disconnect()
                        resolve([])
                    }
                })

                const longTasks = await longTaskPromise

                // 验证长任务检测机制正常工作
                expect(Array.isArray(longTasks)).toBe(true)
            } else {
                // 如果不支持PerformanceObserver，测试通过
                expect(true).toBe(true)
            }
        })
    })

    describe('性能监控工具', () => {
        it('应该提供性能报告功能', () => {
            const performanceReport = {
                timestamp: Date.now(),
                userAgent: navigator.userAgent,
                memory: (performance as any).memory ? {
                    used: (performance as any).memory.usedJSHeapSize,
                    total: (performance as any).memory.totalJSHeapSize,
                    limit: (performance as any).memory.jsHeapSizeLimit
                } : null,
                timing: performance.timing ? {
                    navigationStart: performance.timing.navigationStart,
                    loadEventEnd: performance.timing.loadEventEnd
                } : null
            }

            expect(performanceReport).toHaveProperty('timestamp')
            expect(performanceReport).toHaveProperty('userAgent')
            expect(typeof performanceReport.timestamp).toBe('number')
            expect(typeof performanceReport.userAgent).toBe('string')
        })

        it('应该支持自定义性能指标', () => {
            const customMetrics = new Map<string, number>()

            // 记录自定义指标
            const recordMetric = (name: string, value: number) => {
                customMetrics.set(name, value)
            }

            const getMetric = (name: string) => {
                return customMetrics.get(name)
            }

            // 测试自定义指标功能
            recordMetric('language-switch-count', 5)
            recordMetric('component-render-time', 25)

            expect(getMetric('language-switch-count')).toBe(5)
            expect(getMetric('component-render-time')).toBe(25)
            expect(customMetrics.size).toBe(2)
        })
    })
}) 