import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * 搜索无障碍增强组合式函数
 * 提供搜索相关的无障碍功能支持
 */
export function useSearchAccessibility() {
  const { t } = useI18n()
  
  // 状态管理
  const isSearchOpen = ref(false)
  const searchResultsCount = ref(0)
  const selectedIndex = ref(-1)
  const liveRegionRef = ref<HTMLElement>()
  const searchInputRef = ref<HTMLInputElement>()
  
  // 生成唯一ID
  const searchId = `search-${Math.random().toString(36).substr(2, 9)}`
  const resultsId = `${searchId}-results`
  const descriptionId = `${searchId}-description`
  const liveRegionId = `${searchId}-live`
  
  /**
   * ARIA属性计算
   */
  
  // 搜索输入框ARIA属性
  const searchInputAriaAttrs = computed(() => ({
    'role': 'combobox',
    'aria-expanded': isSearchOpen.value,
    'aria-haspopup': 'listbox',
    'aria-controls': resultsId,
    'aria-describedby': descriptionId,
    'aria-autocomplete': 'list',
    'aria-activedescendant': selectedIndex.value >= 0 ? `result-${selectedIndex.value}` : undefined
  }))
  
  // 搜索结果容器ARIA属性
  const searchResultsAriaAttrs = computed(() => ({
    'id': resultsId,
    'role': 'listbox',
    'aria-label': t('searchBar.aria.resultsLabel'),
    'aria-live': 'polite' as const,
    'aria-atomic': 'false' as const
  }))
  
  // 搜索描述ARIA属性
  const searchDescriptionAriaAttrs = computed(() => ({
    'id': descriptionId,
    'class': 'sr-only'
  }))
  
  // Live Region ARIA属性
  const liveRegionAriaAttrs = computed(() => ({
    'id': liveRegionId,
    'aria-live': 'polite' as const,
    'aria-atomic': 'true' as const,
    'class': 'sr-only'
  }))
  
  /**
   * 状态管理方法
   */
  
  // 打开搜索
  const openSearch = () => {
    isSearchOpen.value = true
    
    // 延迟聚焦以确保DOM更新完成
    nextTick(() => {
      searchInputRef.value?.focus()
    })
  }
  
  // 关闭搜索
  const closeSearch = () => {
    isSearchOpen.value = false
    selectedIndex.value = -1
    searchResultsCount.value = 0
  }
  
  // 更新搜索结果数量
  const updateResultsCount = (count: number) => {
    searchResultsCount.value = count
    
    if (count === 0) {
      announceToScreenReader(t('searchBar.aria.noResults'))
    } else {
      announceToScreenReader(
        t('searchBar.aria.resultsCount', { count })
      )
    }
  }
  
  // 更新选中索引
  const updateSelectedIndex = (index: number) => {
    selectedIndex.value = index
    
    if (index >= 0 && searchResultsCount.value > 0) {
      announceToScreenReader(
        t('searchBar.aria.resultSelected', { 
          current: index + 1, 
          total: searchResultsCount.value 
        })
      )
    }
  }
  
  /**
   * 屏幕阅读器公告
   */
  const announceToScreenReader = (message: string) => {
    if (!liveRegionRef.value) return
    
    // 清空然后设置新消息，确保屏幕阅读器能检测到变化
    liveRegionRef.value.textContent = ''
    
    // 使用setTimeout确保消息更新被检测到
    setTimeout(() => {
      if (liveRegionRef.value) {
        liveRegionRef.value.textContent = message
      }
    }, 10)
  }
  
  /**
   * 键盘导航支持
   */
  
  // 处理键盘事件
  const handleKeyboardNavigation = (event: KeyboardEvent) => {
    if (!isSearchOpen.value) return false
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (selectedIndex.value < searchResultsCount.value - 1) {
          updateSelectedIndex(selectedIndex.value + 1)
        }
        return true
        
      case 'ArrowUp':
        event.preventDefault()
        if (selectedIndex.value > 0) {
          updateSelectedIndex(selectedIndex.value - 1)
        } else if (selectedIndex.value === 0) {
          updateSelectedIndex(-1) // 回到输入框
        }
        return true
        
      case 'Home':
        event.preventDefault()
        if (searchResultsCount.value > 0) {
          updateSelectedIndex(0)
        }
        return true
        
      case 'End':
        event.preventDefault()
        if (searchResultsCount.value > 0) {
          updateSelectedIndex(searchResultsCount.value - 1)
        }
        return true
        
      case 'Escape':
        event.preventDefault()
        closeSearch()
        return true
        
      default:
        return false
    }
  }
  
  /**
   * 焦点管理
   */
  
  // 焦点陷阱状态
  const focusTrapActive = ref(false)
  const focusableElements = ref<HTMLElement[]>([])
  
  // 激活焦点陷阱
  const activateFocusTrap = () => {
    focusTrapActive.value = true
    updateFocusableElements()
  }
  
  // 停用焦点陷阱
  const deactivateFocusTrap = () => {
    focusTrapActive.value = false
    focusableElements.value = []
  }
  
  // 更新可聚焦元素列表
  const updateFocusableElements = () => {
    if (!isSearchOpen.value) {
      focusableElements.value = []
      return
    }
    
    const container = document.querySelector(`#${resultsId}`)?.parentElement
    if (!container) return
    
    const focusable = container.querySelectorAll<HTMLElement>(
      'input, button, [tabindex]:not([tabindex="-1"]), [role="option"]'
    )
    
    focusableElements.value = Array.from(focusable)
  }
  
  // 处理焦点陷阱
  const handleFocusTrap = (event: KeyboardEvent) => {
    if (!focusTrapActive.value || event.key !== 'Tab') return
    
    const elements = focusableElements.value
    if (elements.length === 0) return
    
    const currentIndex = elements.indexOf(event.target as HTMLElement)
    
    if (event.shiftKey) {
      // Shift+Tab - 向前
      if (currentIndex <= 0) {
        event.preventDefault()
        elements[elements.length - 1].focus()
      }
    } else {
      // Tab - 向后
      if (currentIndex >= elements.length - 1) {
        event.preventDefault()
        elements[0].focus()
      }
    }
  }
  
  /**
   * 触摸和移动端支持
   */
  
  // 检测触摸设备
  const isTouchDevice = computed(() => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  })
  
  // 触摸友好的目标尺寸
  const getTouchTargetClasses = () => {
    return isTouchDevice.value 
      ? 'min-h-[44px] min-w-[44px]' 
      : 'min-h-[32px] min-w-[32px]'
  }
  
  /**
   * 辅助功能偏好
   */
  
  // 检测用户偏好
  const prefersReducedMotion = ref(false)
  const prefersHighContrast = ref(false)
  
  // 更新用户偏好
  const updateAccessibilityPreferences = () => {
    prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    prefersHighContrast.value = window.matchMedia('(prefers-contrast: high)').matches
  }
  
  // 监听媒体查询变化
  let reducedMotionMQL: MediaQueryList
  let highContrastMQL: MediaQueryList
  
  const setupMediaQueryListeners = () => {
    reducedMotionMQL = window.matchMedia('(prefers-reduced-motion: reduce)')
    highContrastMQL = window.matchMedia('(prefers-contrast: high)')
    
    reducedMotionMQL.addEventListener('change', updateAccessibilityPreferences)
    highContrastMQL.addEventListener('change', updateAccessibilityPreferences)
    
    updateAccessibilityPreferences()
  }
  
  const cleanupMediaQueryListeners = () => {
    reducedMotionMQL?.removeEventListener('change', updateAccessibilityPreferences)
    highContrastMQL?.removeEventListener('change', updateAccessibilityPreferences)
  }
  
  /**
   * 生命周期钩子
   */
  onMounted(() => {
    setupMediaQueryListeners()
    
    // 添加全局键盘事件监听器
    document.addEventListener('keydown', handleFocusTrap)
  })
  
  onUnmounted(() => {
    cleanupMediaQueryListeners()
    document.removeEventListener('keydown', handleFocusTrap)
  })
  
  return {
    // 状态
    isSearchOpen,
    searchResultsCount,
    selectedIndex,
    focusTrapActive,
    isTouchDevice,
    prefersReducedMotion,
    prefersHighContrast,
    
    // 引用
    liveRegionRef,
    searchInputRef,
    
    // ID
    searchId,
    resultsId,
    descriptionId,
    liveRegionId,
    
    // ARIA属性
    searchInputAriaAttrs,
    searchResultsAriaAttrs,
    searchDescriptionAriaAttrs,
    liveRegionAriaAttrs,
    
    // 方法
    openSearch,
    closeSearch,
    updateResultsCount,
    updateSelectedIndex,
    announceToScreenReader,
    handleKeyboardNavigation,
    activateFocusTrap,
    deactivateFocusTrap,
    updateFocusableElements,
    getTouchTargetClasses,
    updateAccessibilityPreferences
  }
}

/**
 * 搜索结果项无障碍属性生成器
 */
export function useSearchResultAccessibility(index: number, isSelected: boolean, result: any) {
  const { t } = useI18n()
  
  const resultId = `result-${index}`
  
  const ariaAttrs = computed(() => ({
    'id': resultId,
    'role': 'option',
    'aria-selected': isSelected,
    'aria-label': t('searchBar.aria.resultLabel', {
      title: result.title,
      type: result.type,
      position: index + 1
    }),
    'aria-describedby': result.description ? `${resultId}-desc` : undefined,
    'tabindex': isSelected ? 0 : -1
  }))
  
  return {
    resultId,
    ariaAttrs
  }
}