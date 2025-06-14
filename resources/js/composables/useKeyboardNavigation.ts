import { ref, nextTick } from 'vue'

/**
 * 键盘导航 composable
 * 提供常用的键盘导航功能，特别适用于下拉菜单、列表等
 */
export function useKeyboardNavigation() {
    const currentIndex = ref(-1)
    const isNavigating = ref(false)

    /**
     * 处理键盘事件
     * @param event 键盘事件
     * @param options 配置选项
     */
    const handleKeyNavigation = (
        event: KeyboardEvent,
        options: {
            items: HTMLElement[]
            onSelect?: (index: number) => void
            onEscape?: () => void
            onTab?: () => void
            loop?: boolean // 是否循环导航
            orientation?: 'vertical' | 'horizontal' // 导航方向
        }
    ) => {
        const { items, onSelect, onEscape, onTab, loop = true, orientation = 'vertical' } = options

        if (items.length === 0) return

        // 按键映射
        const keys = {
            vertical: {
                next: ['ArrowDown'],
                prev: ['ArrowUp'],
                first: ['Home'],
                last: ['End']
            },
            horizontal: {
                next: ['ArrowRight'],
                prev: ['ArrowLeft'],
                first: ['Home'],
                last: ['End']
            }
        }

        const currentKeys = keys[orientation]
        const key = event.key

        // 阻止默认行为
        if ([...currentKeys.next, ...currentKeys.prev, ...currentKeys.first, ...currentKeys.last, 'Enter', 'Space', 'Escape', 'Tab'].includes(key)) {
            event.preventDefault()
        }

        switch (key) {
            case 'Escape':
                onEscape?.()
                break

            case 'Tab':
                onTab?.()
                break

            case 'Enter':
            case ' ': // Space key
                if (currentIndex.value >= 0 && currentIndex.value < items.length) {
                    onSelect?.(currentIndex.value)
                }
                break

            case currentKeys.first[0]: // Home
                currentIndex.value = 0
                focusItem(items[0])
                break

            case currentKeys.last[0]: // End
                currentIndex.value = items.length - 1
                focusItem(items[items.length - 1])
                break

            case currentKeys.next[0]: // Arrow Down/Right
                if (currentIndex.value < items.length - 1) {
                    currentIndex.value++
                } else if (loop) {
                    currentIndex.value = 0
                }
                focusItem(items[currentIndex.value])
                break

            case currentKeys.prev[0]: // Arrow Up/Left
                if (currentIndex.value > 0) {
                    currentIndex.value--
                } else if (loop) {
                    currentIndex.value = items.length - 1
                }
                focusItem(items[currentIndex.value])
                break
        }

        isNavigating.value = true
    }

    /**
     * 聚焦到指定元素
     */
    const focusItem = (item: HTMLElement) => {
        if (item) {
            nextTick(() => {
                item.focus()
                // 确保元素在视口中可见
                item.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
            })
        }
    }

    /**
     * 设置当前焦点索引
     */
    const setCurrentIndex = (index: number) => {
        currentIndex.value = index
    }

    /**
     * 重置导航状态
     */
    const resetNavigation = () => {
        currentIndex.value = -1
        isNavigating.value = false
    }

    /**
     * 初始化焦点到第一个项目
     */
    const focusFirst = (items: HTMLElement[]) => {
        if (items.length > 0) {
            currentIndex.value = 0
            focusItem(items[0])
        }
    }

    /**
     * 查找并聚焦匹配字符的项目（类型快速搜索）
     */
    const findAndFocusByChar = (items: HTMLElement[], char: string) => {
        const lowerChar = char.toLowerCase()
        const startIndex = currentIndex.value + 1

        // 从当前位置后开始搜索
        for (let i = 0; i < items.length; i++) {
            const index = (startIndex + i) % items.length
            const item = items[index]
            const text = item.textContent?.toLowerCase().trim()

            if (text && text.startsWith(lowerChar)) {
                currentIndex.value = index
                focusItem(item)
                break
            }
        }
    }

    return {
        // 状态
        currentIndex,
        isNavigating,

        // 方法
        handleKeyNavigation,
        focusItem,
        setCurrentIndex,
        resetNavigation,
        focusFirst,
        findAndFocusByChar
    }
} 