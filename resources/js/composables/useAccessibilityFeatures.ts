import { ref, computed, nextTick } from 'vue'
import { useI18n } from './useI18n'

/**
 * 无障碍功能增强组合式函数
 * 提供屏幕阅读器支持、状态公告、错误处理等功能
 */
export function useAccessibilityFeatures() {
  const { t } = useI18n()
  
  // 状态公告
  const liveMessage = ref('')
  const liveMessagePriority = ref<'polite' | 'assertive'>('polite')
  
  // 加载状态
  const isLoading = ref(false)
  const loadingMessage = ref('')
  
  // 错误状态
  const hasError = ref(false)
  const errorMessage = ref('')

  /**
   * 向屏幕阅读器公告消息
   */
  const announceToScreenReader = (
    message: string, 
    priority: 'polite' | 'assertive' = 'polite'
  ) => {
    liveMessage.value = ''
    liveMessagePriority.value = priority
    
    nextTick(() => {
      liveMessage.value = message
      
      // 3秒后清空消息
      setTimeout(() => {
        if (liveMessage.value === message) {
          liveMessage.value = ''
        }
      }, 3000)
    })
  }

  /**
   * 公告主题切换
   */
  const announceThemeChange = (themeName: string) => {
    const message = t('topMenuBar.theme.changed', { theme: themeName })
    announceToScreenReader(message, 'polite')
  }

  /**
   * 公告语言切换
   */
  const announceLanguageChange = (languageName: string) => {
    const message = t('topMenuBar.language.switched', { language: languageName })
    announceToScreenReader(message, 'polite')
  }

  /**
   * 设置加载状态
   */
  const setLoadingState = (loading: boolean, message?: string) => {
    isLoading.value = loading
    loadingMessage.value = message || (loading ? t('accessibility.loading') : '')
    
    if (loading && message) {
      announceToScreenReader(message, 'polite')
    }
  }

  /**
   * 设置错误状态
   */
  const setErrorState = (error: boolean, message?: string) => {
    hasError.value = error
    errorMessage.value = message || (error ? t('accessibility.error') : '')
    
    if (error && message) {
      announceToScreenReader(message, 'assertive')
    }
  }

  /**
   * 清除所有状态
   */
  const clearAllStates = () => {
    liveMessage.value = ''
    isLoading.value = false
    loadingMessage.value = ''
    hasError.value = false
    errorMessage.value = ''
  }

  /**
   * 生成 ARIA 属性对象
   */
  const getAriaAttributes = (options: {
    label?: string
    describedBy?: string
    expanded?: boolean
    hasPopup?: boolean | string
    controls?: string
    invalid?: boolean
    required?: boolean
    busy?: boolean
  }) => {
    const attrs: Record<string, string | boolean> = {}
    
    if (options.label) attrs['aria-label'] = options.label
    if (options.describedBy) attrs['aria-describedby'] = options.describedBy
    if (options.expanded !== undefined) attrs['aria-expanded'] = options.expanded
    if (options.hasPopup) attrs['aria-haspopup'] = options.hasPopup
    if (options.controls) attrs['aria-controls'] = options.controls
    if (options.invalid) attrs['aria-invalid'] = options.invalid
    if (options.required) attrs['aria-required'] = options.required
    if (options.busy) attrs['aria-busy'] = options.busy
    
    return attrs
  }

  /**
   * 检查颜色对比度是否足够（简化版本）
   * TODO: 实现真正的颜色对比度检查算法
   */
  const checkColorContrast = (/* foreground: string, background: string */): boolean => {
    // 这里应该实现真正的颜色对比度检查算法
    // 简化版本，实际应用中应该使用专门的库
    return true // 暂时返回 true
  }

  /**
   * 计算元素的触摸目标大小是否符合标准
   */
  const checkTouchTargetSize = (element: HTMLElement): boolean => {
    const rect = element.getBoundingClientRect()
    const minSize = 44 // WCAG 2.1 AAA 标准：最小 44x44px
    
    return rect.width >= minSize && rect.height >= minSize
  }

  /**
   * 验证焦点可见性
   */
  const isFocusVisible = (element: HTMLElement): boolean => {
    // 检查元素是否有可见的焦点指示器
    const computedStyle = getComputedStyle(element, ':focus')
    const outline = computedStyle.outline
    const boxShadow = computedStyle.boxShadow
    
    return outline !== 'none' || boxShadow !== 'none'
  }

  // 计算属性
  const accessibilityStatus = computed(() => ({
    hasLiveMessage: Boolean(liveMessage.value),
    isLoading: isLoading.value,
    hasError: hasError.value,
    canAnnounce: !isLoading.value && !hasError.value
  }))

  const ariaLiveRegionProps = computed(() => ({
    'aria-live': liveMessagePriority.value,
    'aria-atomic': 'true',
    'aria-relevant': 'additions text'
  }))

  return {
    // 状态
    liveMessage,
    liveMessagePriority,
    isLoading,
    loadingMessage,
    hasError,
    errorMessage,
    accessibilityStatus,
    ariaLiveRegionProps,
    
    // 方法
    announceToScreenReader,
    announceThemeChange,
    announceLanguageChange,
    setLoadingState,
    setErrorState,
    clearAllStates,
    getAriaAttributes,
    checkColorContrast,
    checkTouchTargetSize,
    isFocusVisible
  }
}