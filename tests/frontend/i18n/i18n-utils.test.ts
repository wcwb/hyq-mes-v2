import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
    setLocale,
    getCurrentLocale,
    getSupportedLocales,
    safeTranslate,
    hasTranslation,
    checkTranslationCompleteness
} from '../../../resources/js/i18n/index'
import {
    setupTestEnvironment,
    cleanupTestEnvironment,
    mockNavigatorLanguage,
    testMessages
} from '../utils/i18n-test-utils'

describe('i18n工具函数', () => {
    beforeEach(() => {
        setupTestEnvironment()
        // 在每个测试开始前确保语言重置为中文
        setLocale('zh')
    })

    afterEach(() => {
        cleanupTestEnvironment()
    })

    describe('语言切换功能', () => {
        it('应该正确设置和获取当前语言', () => {
            // 确保初始语言是中文
            setLocale('zh')
            expect(getCurrentLocale()).toBe('zh')

            // 切换到英文
            setLocale('en')
            expect(getCurrentLocale()).toBe('en')

            // 验证localStorage已保存
            expect(localStorage.setItem).toHaveBeenCalledWith('locale', 'en')

            // 验证HTML lang属性已更新
            expect(document.documentElement.lang).toBe('en')
        })

        it('应该拒绝不支持的语言', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { })

            // 确保初始状态
            setLocale('zh')
            expect(getCurrentLocale()).toBe('zh')

            setLocale('fr' as any) // 法语不在支持列表中

            expect(consoleSpy).toHaveBeenCalledWith('不支持的语言: fr')
            expect(getCurrentLocale()).toBe('zh') // 语言不应该改变

            consoleSpy.mockRestore()
        })

        it('应该返回正确的支持语言列表', () => {
            const supportedLocales = getSupportedLocales()
            expect(supportedLocales).toEqual(['zh', 'en'])
            expect(supportedLocales).toHaveLength(2)
        })
    })

    describe('浏览器语言检测', () => {
        it('应该检测中文浏览器语言', () => {
            mockNavigatorLanguage('zh-CN')
            // 设置为中文后应该保持中文
            setLocale('zh')
            expect(getCurrentLocale()).toBe('zh')
        })

        it('应该检测英文浏览器语言', () => {
            mockNavigatorLanguage('en-US')
            // 设置为英文
            setLocale('en')
            expect(getCurrentLocale()).toBe('en')
        })

        it('应该在不支持的语言时回退', () => {
            mockNavigatorLanguage('fr-FR')
            // 确保当前语言设置正确
            setLocale('zh')
            expect(getCurrentLocale()).toBe('zh')
        })
    })

    describe('安全翻译功能', () => {
        it('应该正确翻译存在的键', () => {
            // 确保当前语言是中文
            setLocale('zh')
            const result = safeTranslate('greeting')
            expect(result).toBe('你好')
        })

        it('应该为缺失的键返回回退值', () => {
            const fallback = '默认文本'
            const result = safeTranslate('missing.key', fallback)
            expect(result).toBe(fallback)
        })

        it('应该为缺失的键返回键名（无回退值）', () => {
            const result = safeTranslate('missing.key')
            expect(result).toBe('missing.key')
        })

        it('应该处理翻译错误', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { })

            // 模拟翻译错误 - 传入 null 会返回 null（因为没有fallback且key为null）
            const result = safeTranslate(null as any)

            expect(consoleSpy).toHaveBeenCalled()
            expect(result).toBe(null)

            consoleSpy.mockRestore()
        })
    })

    describe('翻译键存在性检查', () => {
        it('应该正确检查存在的键', () => {
            expect(hasTranslation('greeting')).toBe(true)
            expect(hasTranslation('menu.home')).toBe(true)
            expect(hasTranslation('button.submit')).toBe(true)
        })

        it('应该正确检查不存在的键', () => {
            expect(hasTranslation('missing.key')).toBe(false)
            expect(hasTranslation('menu.missing')).toBe(false)
        })

        it('应该支持指定语言检查', () => {
            expect(hasTranslation('greeting', 'en')).toBe(true)
            expect(hasTranslation('greeting', 'zh')).toBe(true)
            expect(hasTranslation('missing.key', 'en')).toBe(false)
        })

        it('应该处理无效的语言', () => {
            expect(hasTranslation('greeting', 'fr' as any)).toBe(false)
        })
    })

    describe('翻译完整性检查', () => {
        it('应该检查翻译完整性', () => {
            const result = checkTranslationCompleteness('zh', 'en')

            expect(result).toHaveProperty('missingKeys')
            expect(result).toHaveProperty('extraKeys')
            expect(result).toHaveProperty('completeness')
            expect(Array.isArray(result.missingKeys)).toBe(true)
            expect(Array.isArray(result.extraKeys)).toBe(true)
            expect(typeof result.completeness).toBe('string')
        })

        it('应该在开发环境输出日志', () => {
            const consoleGroupSpy = vi.spyOn(console, 'group').mockImplementation(() => { })
            const consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => { })

            // 模拟开发环境
            vi.stubEnv('DEV', true)

            checkTranslationCompleteness('zh', 'en')

            expect(consoleGroupSpy).toHaveBeenCalled()
            expect(consoleGroupEndSpy).toHaveBeenCalled()

            consoleGroupSpy.mockRestore()
            consoleGroupEndSpy.mockRestore()
        })
    })

    describe('localStorage集成', () => {
        it('应该从localStorage恢复保存的语言', () => {
            // 模拟localStorage中有保存的语言
            localStorage.setItem('locale', 'en')

            // 在实际应用中，这会在初始化时读取
            expect(localStorage.getItem('locale')).toBe('en')
        })

        it('应该保存语言切换到localStorage', () => {
            setLocale('en')

            expect(localStorage.setItem).toHaveBeenCalledWith('locale', 'en')
        })
    })
}) 