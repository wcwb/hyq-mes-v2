import { ref, nextTick, onUnmounted } from 'vue'

/**
 * 焦点管理组合式函数
 * 提供焦点陷阱、焦点恢复和跳过链接等无障碍功能
 */
export function useFocusManagement() {
  const lastFocusedElement = ref<HTMLElement | null>(null)
  const focusTrapActive = ref(false)
  
  /**
   * 获取所有可聚焦的元素
   */
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
    
    return Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[]
  }

  /**
   * 设置焦点陷阱
   */
  const setFocusTrap = (container: HTMLElement) => {
    if (focusTrapActive.value) return

    const focusableElements = getFocusableElements(container)
    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // 保存当前焦点元素
    lastFocusedElement.value = document.activeElement as HTMLElement

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      if (event.shiftKey) {
        // Shift + Tab 向前
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab 向后
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }

    // 立即聚焦第一个元素
    nextTick(() => {
      firstElement.focus()
    })

    container.addEventListener('keydown', handleKeyDown)
    focusTrapActive.value = true

    // 返回清理函数
    return () => {
      container.removeEventListener('keydown', handleKeyDown)
      focusTrapActive.value = false
      
      // 恢复之前的焦点
      if (lastFocusedElement.value && lastFocusedElement.value.focus) {
        nextTick(() => {
          lastFocusedElement.value?.focus()
          lastFocusedElement.value = null
        })
      }
    }
  }

  /**
   * 移除焦点陷阱
   */
  const removeFocusTrap = (cleanupFn?: () => void) => {
    if (cleanupFn) {
      cleanupFn()
    }
  }

  /**
   * 安全聚焦元素（带错误处理）
   */
  const safeFocus = (element: HTMLElement | null) => {
    if (!element) return false

    try {
      element.focus()
      return document.activeElement === element
    } catch (error) {
      console.warn('Failed to focus element:', error)
      return false
    }
  }

  /**
   * 寻找并聚焦下一个/上一个可聚焦元素
   */
  const focusNext = (currentElement?: HTMLElement) => {
    const current = currentElement || document.activeElement as HTMLElement
    if (!current) return false

    const container = current.closest('[role="dialog"], [role="menu"], body') as HTMLElement
    if (!container) return false

    const focusableElements = getFocusableElements(container)
    const currentIndex = focusableElements.indexOf(current)
    
    if (currentIndex === -1) return false

    const nextIndex = (currentIndex + 1) % focusableElements.length
    return safeFocus(focusableElements[nextIndex])
  }

  const focusPrevious = (currentElement?: HTMLElement) => {
    const current = currentElement || document.activeElement as HTMLElement
    if (!current) return false

    const container = current.closest('[role="dialog"], [role="menu"], body') as HTMLElement
    if (!container) return false

    const focusableElements = getFocusableElements(container)
    const currentIndex = focusableElements.indexOf(current)
    
    if (currentIndex === -1) return false

    const prevIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1
    return safeFocus(focusableElements[prevIndex])
  }

  /**
   * 创建跳过链接
   */
  const createSkipLink = (targetId: string, label: string) => {
    const skipLink = document.createElement('a')
    skipLink.href = `#${targetId}`
    skipLink.textContent = label
    skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:no-underline'
    
    skipLink.addEventListener('click', (event) => {
      event.preventDefault()
      const target = document.getElementById(targetId)
      if (target) {
        target.setAttribute('tabindex', '-1')
        safeFocus(target)
        
        // 移除临时 tabindex
        target.addEventListener('blur', () => {
          target.removeAttribute('tabindex')
        }, { once: true })
      }
    })

    return skipLink
  }

  // 清理函数
  onUnmounted(() => {
    if (focusTrapActive.value) {
      focusTrapActive.value = false
    }
  })

  return {
    focusTrapActive,
    setFocusTrap,
    removeFocusTrap,
    safeFocus,
    focusNext,
    focusPrevious,
    createSkipLink,
    getFocusableElements
  }
}