import { onMounted, onUnmounted } from 'vue'

export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  handler: (event: KeyboardEvent) => void
  description?: string
}

/**
 * 键盘快捷键管理组合式函数
 * 支持注册和管理全局键盘快捷键
 */
export function useKeyboardShortcuts() {
  const shortcuts = new Map<string, KeyboardShortcut>()

  /**
   * 生成快捷键唯一标识符
   */
  const generateShortcutId = (shortcut: KeyboardShortcut): string => {
    const modifiers = []
    if (shortcut.ctrlKey) modifiers.push('ctrl')
    if (shortcut.shiftKey) modifiers.push('shift')
    if (shortcut.altKey) modifiers.push('alt')
    if (shortcut.metaKey) modifiers.push('meta')
    
    return `${modifiers.join('+')}+${shortcut.key.toLowerCase()}`
  }

  /**
   * 检查事件是否匹配快捷键
   */
  const matchesShortcut = (event: KeyboardEvent, shortcut: KeyboardShortcut): boolean => {
    return (
      event.key.toLowerCase() === shortcut.key.toLowerCase() &&
      Boolean(event.ctrlKey) === Boolean(shortcut.ctrlKey) &&
      Boolean(event.shiftKey) === Boolean(shortcut.shiftKey) &&
      Boolean(event.altKey) === Boolean(shortcut.altKey) &&
      Boolean(event.metaKey) === Boolean(shortcut.metaKey)
    )
  }

  /**
   * 处理键盘事件
   */
  const handleKeyDown = (event: KeyboardEvent) => {
    for (const shortcut of shortcuts.values()) {
      if (matchesShortcut(event, shortcut)) {
        event.preventDefault()
        event.stopPropagation()
        shortcut.handler(event)
        break
      }
    }
  }

  /**
   * 注册快捷键
   */
  const registerShortcut = (shortcut: KeyboardShortcut) => {
    const id = generateShortcutId(shortcut)
    shortcuts.set(id, shortcut)
  }

  /**
   * 取消注册快捷键
   */
  const unregisterShortcut = (shortcut: KeyboardShortcut) => {
    const id = generateShortcutId(shortcut)
    shortcuts.delete(id)
  }

  /**
   * 清除所有快捷键
   */
  const clearShortcuts = () => {
    shortcuts.clear()
  }

  /**
   * 获取所有已注册的快捷键
   */
  const getShortcuts = (): KeyboardShortcut[] => {
    return Array.from(shortcuts.values())
  }

  // 组件挂载时注册事件监听器
  onMounted(() => {
    document.addEventListener('keydown', handleKeyDown, { capture: true })
  })

  // 组件卸载时清理事件监听器
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown, { capture: true })
    clearShortcuts()
  })

  return {
    registerShortcut,
    unregisterShortcut,
    clearShortcuts,
    getShortcuts
  }
}