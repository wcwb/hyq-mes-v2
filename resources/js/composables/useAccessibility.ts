import { ref, nextTick } from 'vue'

/**
 * 无障碍支持 composable
 * 提供常用的无障碍功能和工具
 */
export function useAccessibility() {
    // 焦点管理
    const focusElement = (element: HTMLElement | null) => {
        if (element) {
            nextTick(() => {
                element.focus()
            })
        }
    }

    // 获取可聚焦元素
    const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
        const focusableSelectors = [
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            'a[href]',
            '[tabindex]:not([tabindex="-1"])',
            '[contenteditable="true"]'
        ].join(', ')

        return Array.from(container.querySelectorAll(focusableSelectors))
    }

    // 检测用户偏好设置
    const preferReducedMotion = () => {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }

    const preferHighContrast = () => {
        return window.matchMedia('(prefers-contrast: high)').matches
    }

    // 生成唯一ID用于ARIA标识
    const generateId = (prefix: string = 'accessible') => {
        return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
    }

    // ARIA工具函数
    const setAriaAttribute = (element: HTMLElement, attribute: string, value: string | boolean) => {
        element.setAttribute(`aria-${attribute}`, value.toString())
    }

    const removeAriaAttribute = (element: HTMLElement, attribute: string) => {
        element.removeAttribute(`aria-${attribute}`)
    }

    // 屏幕阅读器公告
    const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
        const announcement = document.createElement('div')
        announcement.setAttribute('aria-live', priority)
        announcement.setAttribute('aria-atomic', 'true')
        announcement.className = 'sr-only' // 视觉隐藏但对屏幕阅读器可见
        announcement.textContent = message

        document.body.appendChild(announcement)

        // 短暂延迟后移除元素
        setTimeout(() => {
            document.body.removeChild(announcement)
        }, 1000)
    }

    return {
        // 焦点管理
        focusElement,
        getFocusableElements,

        // 用户偏好
        preferReducedMotion,
        preferHighContrast,

        // ID生成
        generateId,

        // ARIA工具
        setAriaAttribute,
        removeAriaAttribute,

        // 屏幕阅读器
        announceToScreenReader
    }
} 