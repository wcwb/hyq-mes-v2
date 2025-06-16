import { onMounted, onUnmounted, ref, reactive } from 'vue'

export interface GlobalShortcut {
  id: string
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  handler: (event: KeyboardEvent) => void
  description?: string
  /** 是否阻止默认行为 */
  preventDefault?: boolean
  /** 是否阻止事件冒泡 */
  stopPropagation?: boolean
  /** 是否启用 */
  enabled?: boolean
  /** 优先级（数字越小优先级越高） */
  priority?: number
  /** 上下文限制 */
  context?: string[]
}

export interface ShortcutGroup {
  id: string
  name: string
  description?: string
  shortcuts: GlobalShortcut[]
}

/**
 * 全局键盘快捷键管理组合式函数
 * 支持快捷键注册、冲突检测、上下文管理等高级功能
 */
export function useGlobalShortcuts() {
  const shortcuts = reactive(new Map<string, GlobalShortcut>())
  const shortcutGroups = reactive(new Map<string, ShortcutGroup>())
  const isEnabled = ref(true)
  
  // 平台检测
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const isWindows = navigator.platform.toUpperCase().indexOf('WIN') >= 0
  
  /**
   * 生成快捷键唯一标识符
   */
  const generateShortcutKey = (shortcut: Omit<GlobalShortcut, 'id' | 'handler' | 'description'>): string => {
    const modifiers = []
    if (shortcut.ctrlKey) modifiers.push('ctrl')
    if (shortcut.shiftKey) modifiers.push('shift')
    if (shortcut.altKey) modifiers.push('alt')
    if (shortcut.metaKey) modifiers.push('meta')
    
    return `${modifiers.join('+')}+${shortcut.key.toLowerCase()}`
  }
  
  /**
   * 标准化快捷键（处理跨平台差异）
   */
  const normalizeShortcut = (shortcut: GlobalShortcut): GlobalShortcut => {
    // 在Mac上，Cmd键通常用于替代Ctrl键
    if (isMac && shortcut.ctrlKey && !shortcut.metaKey) {
      return {
        ...shortcut,
        ctrlKey: false,
        metaKey: true
      }
    }
    
    return shortcut
  }
  
  /**
   * 检查事件是否匹配快捷键
   */
  const matchesShortcut = (event: KeyboardEvent, shortcut: GlobalShortcut): boolean => {
    // 检查是否在输入元素中（可选择性忽略）
    const target = event.target as HTMLElement
    const isInputElement = target?.tagName === 'INPUT' || 
                          target?.tagName === 'TEXTAREA' || 
                          target?.contentEditable === 'true'
    
    // 某些快捷键（如搜索）即使在输入元素中也要响应
    const allowInInput = shortcut.id === 'global-search' || shortcut.context?.includes('input')
    
    if (isInputElement && !allowInInput) {
      return false
    }
    
    return (
      event.key.toLowerCase() === shortcut.key.toLowerCase() &&
      Boolean(event.ctrlKey) === Boolean(shortcut.ctrlKey) &&
      Boolean(event.shiftKey) === Boolean(shortcut.shiftKey) &&
      Boolean(event.altKey) === Boolean(shortcut.altKey) &&
      Boolean(event.metaKey) === Boolean(shortcut.metaKey)
    )
  }
  
  /**
   * 检查快捷键冲突
   */
  const checkConflict = (newShortcut: GlobalShortcut): GlobalShortcut | null => {
    const key = generateShortcutKey(newShortcut)
    
    for (const [, existingShortcut] of shortcuts) {
      if (existingShortcut.id !== newShortcut.id && 
          generateShortcutKey(existingShortcut) === key) {
        return existingShortcut
      }
    }
    
    return null
  }
  
  /**
   * 处理键盘事件
   */
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isEnabled.value) return
    
    // 按优先级排序的快捷键列表
    const sortedShortcuts = Array.from(shortcuts.values())
      .filter(shortcut => shortcut.enabled !== false)
      .sort((a, b) => (a.priority || 100) - (b.priority || 100))
    
    for (const shortcut of sortedShortcuts) {
      if (matchesShortcut(event, shortcut)) {
        // 阻止默认行为和事件冒泡
        if (shortcut.preventDefault !== false) {
          event.preventDefault()
        }
        if (shortcut.stopPropagation !== false) {
          event.stopPropagation()
        }
        
        // 执行处理器
        try {
          shortcut.handler(event)
        } catch (error) {
          console.error(`快捷键 ${shortcut.id} 执行失败:`, error)
        }
        
        // 只执行第一个匹配的快捷键
        break
      }
    }
  }
  
  /**
   * 注册单个快捷键
   */
  const registerShortcut = (shortcut: GlobalShortcut): boolean => {
    // 标准化快捷键
    const normalizedShortcut = normalizeShortcut(shortcut)
    
    // 检查冲突
    const conflict = checkConflict(normalizedShortcut)
    if (conflict) {
      console.warn(`快捷键冲突: ${shortcut.id} 与 ${conflict.id} 使用相同的组合键`)
      return false
    }
    
    // 注册快捷键
    shortcuts.set(shortcut.id, normalizedShortcut)
    
    console.log(`已注册快捷键: ${shortcut.id} (${generateShortcutKey(normalizedShortcut)})`)
    return true
  }
  
  /**
   * 注册快捷键组
   */
  const registerShortcutGroup = (group: ShortcutGroup): boolean => {
    let allSuccessful = true
    
    // 注册组中的所有快捷键
    for (const shortcut of group.shortcuts) {
      const success = registerShortcut(shortcut)
      if (!success) {
        allSuccessful = false
      }
    }
    
    // 只有所有快捷键都注册成功才添加组
    if (allSuccessful) {
      shortcutGroups.set(group.id, group)
    }
    
    return allSuccessful
  }
  
  /**
   * 取消注册快捷键
   */
  const unregisterShortcut = (id: string): boolean => {
    const existed = shortcuts.has(id)
    shortcuts.delete(id)
    
    if (existed) {
      console.log(`已取消注册快捷键: ${id}`)
    }
    
    return existed
  }
  
  /**
   * 取消注册快捷键组
   */
  const unregisterShortcutGroup = (groupId: string): boolean => {
    const group = shortcutGroups.get(groupId)
    if (!group) return false
    
    // 取消注册组中的所有快捷键
    for (const shortcut of group.shortcuts) {
      unregisterShortcut(shortcut.id)
    }
    
    shortcutGroups.delete(groupId)
    console.log(`已取消注册快捷键组: ${groupId}`)
    return true
  }
  
  /**
   * 启用/禁用快捷键
   */
  const toggleShortcut = (id: string, enabled?: boolean): boolean => {
    const shortcut = shortcuts.get(id)
    if (!shortcut) return false
    
    shortcut.enabled = enabled ?? !shortcut.enabled
    return true
  }
  
  /**
   * 启用/禁用全局快捷键系统
   */
  const toggleGlobalShortcuts = (enabled?: boolean) => {
    isEnabled.value = enabled ?? !isEnabled.value
  }
  
  /**
   * 获取快捷键显示文本
   */
  const getShortcutDisplayText = (shortcut: GlobalShortcut): string => {
    const parts = []
    
    if (isMac) {
      if (shortcut.metaKey) parts.push('⌘')
      if (shortcut.altKey) parts.push('⌥')
      if (shortcut.shiftKey) parts.push('⇧')
      if (shortcut.ctrlKey) parts.push('⌃')
    } else {
      if (shortcut.ctrlKey) parts.push('Ctrl')
      if (shortcut.altKey) parts.push('Alt')
      if (shortcut.shiftKey) parts.push('Shift')
      if (shortcut.metaKey) parts.push('Win')
    }
    
    parts.push(shortcut.key.toUpperCase())
    
    return parts.join(isMac ? '' : '+')
  }
  
  /**
   * 获取所有已注册的快捷键
   */
  const getAllShortcuts = (): GlobalShortcut[] => {
    return Array.from(shortcuts.values())
  }
  
  /**
   * 获取所有快捷键组
   */
  const getAllShortcutGroups = (): ShortcutGroup[] => {
    return Array.from(shortcutGroups.values())
  }
  
  /**
   * 清除所有快捷键
   */
  const clearAllShortcuts = () => {
    shortcuts.clear()
    shortcutGroups.clear()
    console.log('已清除所有快捷键')
  }
  
  // 组件挂载时注册事件监听器
  onMounted(() => {
    document.addEventListener('keydown', handleKeyDown, { 
      capture: true,
      passive: false 
    })
    console.log('全局快捷键系统已启动')
  })
  
  // 组件卸载时清理
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown, { capture: true })
    clearAllShortcuts()
    console.log('全局快捷键系统已关闭')
  })
  
  return {
    // 状态
    isEnabled,
    isMac,
    isWindows,
    
    // 注册方法
    registerShortcut,
    registerShortcutGroup,
    unregisterShortcut,
    unregisterShortcutGroup,
    
    // 控制方法
    toggleShortcut,
    toggleGlobalShortcuts,
    
    // 查询方法
    getAllShortcuts,
    getAllShortcutGroups,
    getShortcutDisplayText,
    checkConflict,
    
    // 工具方法
    clearAllShortcuts,
    generateShortcutKey
  }
}

/**
 * 搜索快捷键专用钩子
 */
export function useSearchShortcut(onTrigger: () => void) {
  const { registerShortcut, unregisterShortcut } = useGlobalShortcuts()
  
  const shortcutId = 'global-search'
  
  onMounted(() => {
    registerShortcut({
      id: shortcutId,
      key: 'k',
      ctrlKey: true,
      handler: () => {
        onTrigger()
      },
      description: '打开全局搜索',
      priority: 1, // 高优先级
      context: ['global', 'input'] // 允许在输入框中触发
    })
  })
  
  onUnmounted(() => {
    unregisterShortcut(shortcutId)
  })
  
  return {
    shortcutId
  }
}