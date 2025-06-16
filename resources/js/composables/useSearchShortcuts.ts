import { ref, onMounted, onUnmounted } from 'vue'
import { useGlobalShortcuts } from './useGlobalShortcuts'

/**
 * 搜索快捷键专用组合式函数
 * 提供搜索相关的快捷键功能
 */
export function useSearchShortcuts() {
  const { registerShortcut, unregisterShortcut, getShortcutDisplayText } = useGlobalShortcuts()
  
  const searchShortcutId = 'global-search'
  const isSearchOpen = ref(false)
  const searchTriggerCallback = ref<(() => void) | null>(null)
  
  /**
   * 注册搜索触发回调
   */
  const onSearchTrigger = (callback: () => void) => {
    searchTriggerCallback.value = callback
    // 确保快捷键已注册
    registerSearchShortcut()
  }
  
  /**
   * 触发搜索
   */
  const triggerSearch = () => {
    console.log('useSearchShortcuts: triggerSearch() called', !!searchTriggerCallback.value)
    if (searchTriggerCallback.value) {
      isSearchOpen.value = true
      searchTriggerCallback.value()
    } else {
      console.warn('useSearchShortcuts: no callback registered')
    }
  }
  
  /**
   * 关闭搜索
   */
  const closeSearch = () => {
    isSearchOpen.value = false
  }
  
  /**
   * 获取搜索快捷键显示文本
   */
  const getSearchShortcutText = (): string => {
    // 检测平台
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    
    if (isMac) {
      return '⌘K'
    } else {
      return 'Ctrl+K'
    }
  }
  
  /**
   * 注册搜索快捷键
   */
  const registerSearchShortcut = () => {
    const success = registerShortcut({
      id: searchShortcutId,
      key: 'k',
      ctrlKey: true,
      handler: () => {
        triggerSearch()
      },
      description: '打开全局搜索',
      priority: 1, // 高优先级
      context: ['global', 'input'], // 允许在输入框中触发
      preventDefault: true,
      stopPropagation: true
    })
    
    if (success) {
      console.log('搜索快捷键已注册: Ctrl+K / ⌘K')
    } else {
      console.warn('搜索快捷键注册失败')
    }
    
    return success
  }
  
  /**
   * 取消注册搜索快捷键
   */
  const unregisterSearchShortcut = () => {
    return unregisterShortcut(searchShortcutId)
  }
  
  // 组件挂载时自动注册
  onMounted(() => {
    registerSearchShortcut()
  })
  
  // 组件卸载时自动取消注册
  onUnmounted(() => {
    unregisterSearchShortcut()
  })
  
  return {
    // 状态
    isSearchOpen,
    
    // 方法
    onSearchTrigger,
    triggerSearch,
    closeSearch,
    getSearchShortcutText,
    
    // 快捷键管理
    registerSearchShortcut,
    unregisterSearchShortcut
  }
}

/**
 * 全局搜索Provider
 * 在应用顶层使用，提供全局搜索快捷键功能
 */
export function useGlobalSearchProvider() {
  const searchShortcuts = useSearchShortcuts()
  const searchComponents = ref<Array<{ open: () => void }>>([])
  
  /**
   * 注册搜索组件
   */
  const registerSearchComponent = (component: { open: () => void }) => {
    searchComponents.value.push(component)
    
    // 如果是第一个注册的组件，设置为默认触发目标
    if (searchComponents.value.length === 1) {
      searchShortcuts.onSearchTrigger(() => {
        component.open()
      })
    }
  }
  
  /**
   * 取消注册搜索组件
   */
  const unregisterSearchComponent = (component: { open: () => void }) => {
    const index = searchComponents.value.indexOf(component)
    if (index > -1) {
      searchComponents.value.splice(index, 1)
    }
  }
  
  /**
   * 触发全局搜索
   */
  const triggerGlobalSearch = () => {
    // 触发第一个可用的搜索组件
    if (searchComponents.value.length > 0) {
      searchComponents.value[0].open()
    }
  }
  
  return {
    ...searchShortcuts,
    searchComponents,
    registerSearchComponent,
    unregisterSearchComponent,
    triggerGlobalSearch
  }
}