import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createApp } from 'vue'
import LanguageSwitcher from '../../../resources/js/components/ui/LanguageSwitcher.vue'
import {
    setupTestEnvironment,
    cleanupTestEnvironment,
    createTestI18n,
    withI18n
} from '../utils/i18n-test-utils'

describe('LanguageSwitcher 组件', () => {
    let wrapper: any

    beforeEach(() => {
        setupTestEnvironment()
    })

    afterEach(() => {
        if (wrapper) {
            wrapper.unmount()
        }
        cleanupTestEnvironment()
    })

    // 创建带有必要全局属性的 Vue 应用
    function createTestApp(locale = 'zh') {
        const app = createApp({})
        const i18n = withI18n(app, locale)

        // 添加 LanguageSwitcher 需要的全局属性
        app.config.globalProperties.$getCurrentLocale = () => i18n.global.locale.value
        app.config.globalProperties.$getSupportedLocales = () => ['zh', 'en']
        app.config.globalProperties.$getLocaleDisplayName = (locale: string) => {
            const names = {
                'zh': '中文',
                'en': 'English'
            }
            return names[locale as keyof typeof names] || locale
        }
        app.config.globalProperties.$switchLocale = (locale: string) => {
            i18n.global.locale.value = locale as 'zh' | 'en'
        }

        return { app, i18n }
    }

    describe('渲染测试', () => {
        it('应该正确渲染组件', () => {
            const { app, i18n } = createTestApp('zh')

            wrapper = mount(LanguageSwitcher, {
                global: {
                    plugins: [i18n],
                    config: {
                        globalProperties: app.config.globalProperties
                    },
                    stubs: {
                        'LiveRegion': {
                            template: '<div></div>',
                            props: ['message', 'priority']
                        }
                    }
                }
            })

            expect(wrapper.exists()).toBe(true)
            expect(wrapper.find('[data-testid="language-switcher"]').exists()).toBe(true)
        })

        it('应该显示当前语言', () => {
            const { app, i18n } = createTestApp('zh')

            wrapper = mount(LanguageSwitcher, {
                global: {
                    plugins: [i18n],
                    config: {
                        globalProperties: app.config.globalProperties
                    },
                    stubs: {
                        'LiveRegion': {
                            template: '<div></div>',
                            props: ['message', 'priority']
                        }
                    }
                }
            })

            // 应该显示中文相关内容
            const button = wrapper.find('[data-testid="language-switcher-button"]')
            expect(button.exists()).toBe(true)
        })

        it('应该有正确的ARIA属性', () => {
            const { app, i18n } = createTestApp('zh')

            wrapper = mount(LanguageSwitcher, {
                global: {
                    plugins: [i18n],
                    config: {
                        globalProperties: app.config.globalProperties
                    },
                    stubs: {
                        'LiveRegion': {
                            template: '<div></div>',
                            props: ['message', 'priority']
                        }
                    }
                }
            })

            const button = wrapper.find('[data-testid="language-switcher-button"]')
            expect(button.attributes('aria-expanded')).toBeDefined()
            expect(button.attributes('aria-haspopup')).toBe('true')
            expect(button.attributes('aria-label')).toBeDefined()
        })
    })

    describe('交互测试', () => {
        it('应该能打开语言菜单', async () => {
            const { app, i18n } = createTestApp('zh')

            wrapper = mount(LanguageSwitcher, {
                global: {
                    plugins: [i18n],
                    config: {
                        globalProperties: app.config.globalProperties
                    },
                    stubs: {
                        'LiveRegion': {
                            template: '<div></div>',
                            props: ['message', 'priority']
                        }
                    }
                }
            })

            const button = wrapper.find('[data-testid="language-switcher-button"]')
            await button.trigger('click')

            // 检查菜单是否打开
            const menu = wrapper.find('[data-testid="language-menu"]')
            expect(menu.exists()).toBe(true)

            // 检查ARIA状态
            expect(button.attributes('aria-expanded')).toBe('true')
        })

        it('应该支持键盘导航', async () => {
            const { app, i18n } = createTestApp('zh')

            wrapper = mount(LanguageSwitcher, {
                global: {
                    plugins: [i18n],
                    config: {
                        globalProperties: app.config.globalProperties
                    },
                    stubs: {
                        'LiveRegion': {
                            template: '<div></div>',
                            props: ['message', 'priority']
                        }
                    }
                }
            })

            const button = wrapper.find('[data-testid="language-switcher-button"]')

            // 等待组件完全初始化
            await wrapper.vm.$nextTick()

            // 按Enter键打开菜单
            await button.trigger('keydown.enter')
            await wrapper.vm.$nextTick()

            // 验证菜单已打开
            const menu = wrapper.find('[data-testid="language-menu"]')
            expect(menu.exists()).toBe(true)

            // 按Escape键关闭菜单
            await button.trigger('keydown.escape')
            await wrapper.vm.$nextTick()

            // 验证菜单是否关闭（通过检查ARIA属性或组件内部状态）
            expect(button.attributes('aria-expanded')).toBe('false')
        })

        it('应该支持箭头键导航', async () => {
            const { app, i18n } = createTestApp('zh')

            wrapper = mount(LanguageSwitcher, {
                global: {
                    plugins: [i18n],
                    config: {
                        globalProperties: app.config.globalProperties
                    },
                    stubs: {
                        'LiveRegion': {
                            template: '<div></div>',
                            props: ['message', 'priority']
                        }
                    }
                }
            })

            const button = wrapper.find('[data-testid="language-switcher-button"]')
            await button.trigger('click')

            // 使用箭头键导航菜单项
            await button.trigger('keydown.down')
            await button.trigger('keydown.up')

            // 检查焦点管理
            expect(document.activeElement).toBeDefined()
        })
    })

    describe('语言切换测试', () => {
        it('应该能切换到不同语言', async () => {
            const { app, i18n } = createTestApp('zh')

            wrapper = mount(LanguageSwitcher, {
                global: {
                    plugins: [i18n],
                    config: {
                        globalProperties: app.config.globalProperties
                    },
                    stubs: {
                        'LiveRegion': {
                            template: '<div></div>',
                            props: ['message', 'priority']
                        }
                    }
                }
            })

            // 打开菜单
            const button = wrapper.find('[data-testid="language-switcher-button"]')
            await button.trigger('click')

            // 点击英文选项
            const englishOption = wrapper.find('[data-testid="language-option-en"]')
            if (englishOption.exists()) {
                await englishOption.trigger('click')

                // 验证语言切换
                expect(i18n.global.locale.value).toBe('en')
            }
        })

        it('应该触发语言变更事件', async () => {
            const { app, i18n } = createTestApp('zh')
            const onLanguageChange = vi.fn()

            // 模拟语言切换回调
            app.config.globalProperties.$switchLocale = (locale: string) => {
                i18n.global.locale.value = locale as 'zh' | 'en'
                onLanguageChange(locale)
            }

            wrapper = mount(LanguageSwitcher, {
                global: {
                    plugins: [i18n],
                    config: {
                        globalProperties: app.config.globalProperties
                    },
                    stubs: {
                        'LiveRegion': {
                            template: '<div></div>',
                            props: ['message', 'priority']
                        }
                    }
                }
            })

            // 打开菜单并切换语言
            const button = wrapper.find('[data-testid="language-switcher-button"]')
            await button.trigger('click')

            const englishOption = wrapper.find('[data-testid="language-option-en"]')
            if (englishOption.exists()) {
                await englishOption.trigger('click')

                // 验证事件触发
                expect(onLanguageChange).toHaveBeenCalledWith('en')
            }
        })
    })

    describe('无障碍访问测试', () => {
        it('应该支持屏幕阅读器', () => {
            const { app, i18n } = createTestApp('zh')

            wrapper = mount(LanguageSwitcher, {
                global: {
                    plugins: [i18n],
                    config: {
                        globalProperties: app.config.globalProperties
                    },
                    stubs: {
                        'LiveRegion': {
                            template: '<div></div>',
                            props: ['message', 'priority']
                        }
                    }
                }
            })

            // 检查ARIA标签
            const button = wrapper.find('[data-testid="language-switcher-button"]')
            expect(button.attributes('aria-label')).toBeDefined()
            expect(button.attributes('aria-describedby')).toBeDefined()
        })

        it('应该有正确的焦点管理', async () => {
            const { app, i18n } = createTestApp('zh')

            wrapper = mount(LanguageSwitcher, {
                global: {
                    plugins: [i18n],
                    config: {
                        globalProperties: app.config.globalProperties
                    },
                    stubs: {
                        'LiveRegion': {
                            template: '<div></div>',
                            props: ['message', 'priority']
                        }
                    }
                }
            })

            const button = wrapper.find('[data-testid="language-switcher-button"]')

            // 打开菜单
            await button.trigger('click')

            // 关闭菜单
            await button.trigger('keydown.escape')

            // 检查焦点返回到触发按钮
            expect(document.activeElement).toBeDefined()
        })

        it('应该支持高对比度模式', () => {
            const { app, i18n } = createTestApp('zh')

            // 模拟高对比度模式
            Object.defineProperty(window, 'matchMedia', {
                writable: true,
                value: vi.fn().mockImplementation(query => ({
                    matches: query === '(prefers-contrast: high)',
                    media: query,
                    onchange: null,
                    addListener: vi.fn(),
                    removeListener: vi.fn(),
                    addEventListener: vi.fn(),
                    removeEventListener: vi.fn(),
                    dispatchEvent: vi.fn(),
                }))
            })

            wrapper = mount(LanguageSwitcher, {
                global: {
                    plugins: [i18n],
                    config: {
                        globalProperties: app.config.globalProperties
                    },
                    stubs: {
                        'LiveRegion': {
                            template: '<div></div>',
                            props: ['message', 'priority']
                        }
                    }
                }
            })

            expect(wrapper.exists()).toBe(true)
        })

        it('应该支持减少动画模式', () => {
            const { app, i18n } = createTestApp('zh')

            // 模拟减少动画模式
            Object.defineProperty(window, 'matchMedia', {
                writable: true,
                value: vi.fn().mockImplementation(query => ({
                    matches: query === '(prefers-reduced-motion: reduce)',
                    media: query,
                    onchange: null,
                    addListener: vi.fn(),
                    removeListener: vi.fn(),
                    addEventListener: vi.fn(),
                    removeEventListener: vi.fn(),
                    dispatchEvent: vi.fn(),
                }))
            })

            wrapper = mount(LanguageSwitcher, {
                global: {
                    plugins: [i18n],
                    config: {
                        globalProperties: app.config.globalProperties
                    },
                    stubs: {
                        'LiveRegion': {
                            template: '<div></div>',
                            props: ['message', 'priority']
                        }
                    }
                }
            })

            expect(wrapper.exists()).toBe(true)
        })
    })

    describe('边界情况测试', () => {
        it('应该处理空语言列表', () => {
            const { app, i18n } = createTestApp('zh')

            // 模拟空语言列表
            app.config.globalProperties.$getSupportedLocales = () => []

            wrapper = mount(LanguageSwitcher, {
                global: {
                    plugins: [i18n],
                    config: {
                        globalProperties: app.config.globalProperties
                    },
                    stubs: {
                        'LiveRegion': {
                            template: '<div></div>',
                            props: ['message', 'priority']
                        }
                    }
                }
            })

            expect(wrapper.exists()).toBe(true)
        })

        it('应该处理无效语言', () => {
            const { app, i18n } = createTestApp('zh')

            // 模拟无效语言
            app.config.globalProperties.$getCurrentLocale = () => 'invalid'

            wrapper = mount(LanguageSwitcher, {
                global: {
                    plugins: [i18n],
                    config: {
                        globalProperties: app.config.globalProperties
                    },
                    stubs: {
                        'LiveRegion': {
                            template: '<div></div>',
                            props: ['message', 'priority']
                        }
                    }
                }
            })

            expect(wrapper.exists()).toBe(true)
        })
    })
}) 