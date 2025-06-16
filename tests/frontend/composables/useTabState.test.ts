/**
 * Tab State Management Tests
 * 标签页状态管理测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { useTabState } from '@/composables/useTabState'
import { TabItem, TabConfig } from '@/types/tab'

describe('useTabState', () => {
  let tabState: ReturnType<typeof useTabState>

  beforeEach(() => {
    // 重置单例实例以确保测试隔离
    vi.clearAllMocks()
    
    // 创建新的标签状态实例
    tabState = useTabState({
      maxTabs: 3, // 设置较小的限制以便测试
      autoCleanup: false, // 禁用自动清理避免干扰测试
      persistent: false // 禁用持久化
    })
    
    // 清理所有现有标签
    tabState.clearAllTabs()
  })

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      expect(tabState.state.tabs).toEqual([])
      expect(tabState.state.activeTabId).toBeNull()
      expect(tabState.state.maxTabs).toBe(3)
      expect(tabState.activeTab).toBeNull()
      expect(tabState.stats.totalTabs).toBe(0)
    })

    it('应该正确计算统计信息', () => {
      const stats = tabState.stats
      expect(stats.totalTabs).toBe(0)
      expect(stats.temporaryTabs).toBe(0)
      expect(stats.mostActiveTabId).toBeNull()
      expect(stats.averageLifetime).toBe(0)
      expect(stats.memoryUsage).toBe(0)
    })
  })

  describe('标签页管理', () => {
    it('应该能够添加标签页', async () => {
      const tabData = {
        title: 'Dashboard',
        route: '/dashboard'
      }

      const newTab = await tabState.addTab(tabData)
      
      expect(newTab).toBeTruthy()
      expect(newTab?.title).toBe('Dashboard')
      expect(newTab?.route).toBe('/dashboard')
      expect(newTab?.closable).toBe(true)
      expect(tabState.state.tabs).toHaveLength(1)
      expect(tabState.state.activeTabId).toBe(newTab?.id)
    })

    it('应该能够添加不激活的标签页', async () => {
      // 先添加一个标签
      const tab1 = await tabState.addTab({
        title: 'Dashboard',
        route: '/dashboard'
      })

      // 添加第二个标签但不激活
      const tab2 = await tabState.addTab({
        title: 'Users',
        route: '/users'
      }, false)

      expect(tabState.state.tabs).toHaveLength(2)
      expect(tabState.state.activeTabId).toBe(tab1?.id) // 第一个标签仍然是激活的
      expect(tab2).toBeTruthy()
    })

    it('应该能够移除标签页', async () => {
      const tab1 = await tabState.addTab({
        title: 'Dashboard',
        route: '/dashboard'
      })

      const tab2 = await tabState.addTab({
        title: 'Users',
        route: '/users'
      })

      expect(tabState.state.tabs).toHaveLength(2)

      // 移除第一个标签
      const removed = await tabState.removeTab(tab1!.id)
      
      expect(removed).toBe(true)
      expect(tabState.state.tabs).toHaveLength(1)
      expect(tabState.state.activeTabId).toBe(tab2?.id) // 应该激活第二个标签
    })

    it('应该能够激活标签页', async () => {
      const tab1 = await tabState.addTab({
        title: 'Dashboard',
        route: '/dashboard'
      })

      const tab2 = await tabState.addTab({
        title: 'Users',
        route: '/users'
      }, false)

      expect(tabState.state.activeTabId).toBe(tab1?.id)

      // 激活第二个标签
      const activated = await tabState.activateTab(tab2!.id)
      
      expect(activated).toBe(true)
      expect(tabState.state.activeTabId).toBe(tab2?.id)
      expect(tabState.activeTab?.id).toBe(tab2?.id)
    })

    it('应该能够更新标签页', async () => {
      const tab = await tabState.addTab({
        title: 'Dashboard',
        route: '/dashboard'
      })

      const updated = await tabState.updateTab(tab!.id, {
        title: 'Updated Dashboard',
        icon: 'dashboard'
      })

      expect(updated).toBe(true)
      
      const updatedTab = tabState.state.tabs.find(t => t.id === tab!.id)
      expect(updatedTab?.title).toBe('Updated Dashboard')
      expect(updatedTab?.icon).toBe('dashboard')
      expect(updatedTab?.route).toBe('/dashboard') // 原有属性应该保持不变
    })
  })

  describe('标签页限制和移除策略', () => {
    it('应该遵守最大标签数限制', async () => {
      // 添加3个标签 (达到限制)
      await tabState.addTab({ title: 'Tab 1', route: '/tab1' })
      await tabState.addTab({ title: 'Tab 2', route: '/tab2' })
      await tabState.addTab({ title: 'Tab 3', route: '/tab3' })

      expect(tabState.state.tabs).toHaveLength(3)
      expect(tabState.isMaxTabsReached).toBe(true)

      // 添加第4个标签应该移除最旧的标签
      const tab4 = await tabState.addTab({ title: 'Tab 4', route: '/tab4' })

      expect(tabState.state.tabs).toHaveLength(3) // 仍然是3个标签
      expect(tab4).toBeTruthy()
      expect(tabState.state.tabs.find(t => t.title === 'Tab 1')).toBeUndefined() // 第一个标签应该被移除
    })

    it('应该正确实施LRU移除策略', async () => {
      // 确保配置为LRU策略和maxTabs
      tabState.updateConfig({ removalStrategy: 'lru', maxTabs: 3 })
      
      // 添加3个标签
      const tab1 = await tabState.addTab({ title: 'Tab 1', route: '/tab1' })
      const tab2 = await tabState.addTab({ title: 'Tab 2', route: '/tab2' })
      const tab3 = await tabState.addTab({ title: 'Tab 3', route: '/tab3' })

      // 等待确保初始时间差异
      await new Promise(resolve => setTimeout(resolve, 5))
      
      // 激活第一个和第三个标签，让tab2保持最久未使用状态
      await tabState.activateTab(tab1!.id)
      await new Promise(resolve => setTimeout(resolve, 5))
      await tabState.activateTab(tab3!.id)
      await new Promise(resolve => setTimeout(resolve, 5))

      // 添加第4个标签，应该移除最少使用的标签 (tab2)
      await tabState.addTab({ title: 'Tab 4', route: '/tab4' })

      expect(tabState.state.tabs).toHaveLength(3)
      expect(tabState.state.tabs.find(t => t.title === 'Tab 2')).toBeUndefined()
      expect(tabState.state.tabs.find(t => t.title === 'Tab 1')).toBeTruthy()
      expect(tabState.state.tabs.find(t => t.title === 'Tab 3')).toBeTruthy()
      expect(tabState.state.tabs.find(t => t.title === 'Tab 4')).toBeTruthy()
    })

    it('应该优先移除临时标签', async () => {
      // 更新配置为临时标签优先策略
      tabState.updateConfig({ removalStrategy: 'temporary' })

      // 添加普通标签和临时标签
      await tabState.addTab({ title: 'Normal Tab', route: '/normal' })
      await tabState.addTab({ title: 'Temp Tab', route: '/temp', temporary: true })
      await tabState.addTab({ title: 'Another Normal', route: '/normal2' })

      expect(tabState.state.tabs).toHaveLength(3)

      // 添加第4个标签，应该移除临时标签
      await tabState.addTab({ title: 'New Tab', route: '/new' })

      expect(tabState.state.tabs).toHaveLength(3)
      expect(tabState.state.tabs.find(t => t.title === 'Temp Tab')).toBeUndefined()
    })
  })

  describe('标签页验证', () => {
    it('应该拒绝无效的标签页', async () => {
      // 测试空标题
      const tab1 = await tabState.addTab({ title: '', route: '/test' })
      expect(tab1).toBeNull()
      expect(tabState.errors.length).toBeGreaterThan(0)

      // 清除错误
      tabState.errors.splice(0)

      // 测试空路由
      const tab2 = await tabState.addTab({ title: 'Test', route: '' })
      expect(tab2).toBeNull()
      expect(tabState.errors.length).toBeGreaterThan(0)
    })

    it('应该拒绝重复的标签页', async () => {
      // 添加第一个标签
      const tab1 = await tabState.addTab({
        title: 'Dashboard',
        route: '/dashboard',
        params: { id: '1' }
      })

      expect(tab1).toBeTruthy()

      // 尝试添加相同的标签
      const tab2 = await tabState.addTab({
        title: 'Dashboard Copy',
        route: '/dashboard',
        params: { id: '1' }
      })

      expect(tab2).toBeNull()
      expect(tabState.errors.length).toBeGreaterThan(0)
      expect(tabState.errors[0].type).toBe('duplicate')
    })
  })

  describe('标签页重排序', () => {
    it('应该能够重新排序标签页', async () => {
      const tab1 = await tabState.addTab({ title: 'Tab 1', route: '/tab1' })
      const tab2 = await tabState.addTab({ title: 'Tab 2', route: '/tab2' })
      const tab3 = await tabState.addTab({ title: 'Tab 3', route: '/tab3' })

      const originalOrder = [tab1!.id, tab2!.id, tab3!.id]
      const newOrder = [tab3!.id, tab1!.id, tab2!.id]

      const reordered = tabState.reorderTabs(newOrder)
      
      expect(reordered).toBe(true)
      expect(tabState.state.tabs[0].id).toBe(tab3!.id)
      expect(tabState.state.tabs[1].id).toBe(tab1!.id)
      expect(tabState.state.tabs[2].id).toBe(tab2!.id)
    })

    it('应该拒绝无效的重排序', async () => {
      await tabState.addTab({ title: 'Tab 1', route: '/tab1' })
      await tabState.addTab({ title: 'Tab 2', route: '/tab2' })

      // 尝试使用错误数量的标签ID重排序
      const reordered = tabState.reorderTabs(['invalid-id'])
      
      expect(reordered).toBe(false)
    })
  })

  describe('标签页查询', () => {
    beforeEach(async () => {
      await tabState.addTab({ title: 'Dashboard', route: '/dashboard' })
      await tabState.addTab({ 
        title: 'User Profile', 
        route: '/users',
        params: { id: '123' }
      })
      await tabState.addTab({ title: 'Settings', route: '/settings' })
    })

    it('应该能够通过路由查找标签页', () => {
      const dashboardTab = tabState.getTabByRoute('/dashboard')
      expect(dashboardTab).toBeTruthy()
      expect(dashboardTab?.title).toBe('Dashboard')

      const userTab = tabState.getTabByRoute('/users', { id: '123' })
      expect(userTab).toBeTruthy()
      expect(userTab?.title).toBe('User Profile')

      const nonExistentTab = tabState.getTabByRoute('/non-existent')
      expect(nonExistentTab).toBeNull()
    })

    it('应该能够检查标签页是否存在', () => {
      const tabs = tabState.state.tabs
      expect(tabState.hasTab(tabs[0].id)).toBe(true)
      expect(tabState.hasTab('non-existent-id')).toBe(false)
    })

    it('应该能够获取相邻标签页', () => {
      const tabs = tabState.state.tabs
      
      // 获取第一个标签的下一个标签
      const nextTab = tabState.getNextTabId(tabs[0].id)
      expect(nextTab).toBe(tabs[1].id)

      // 获取最后一个标签的下一个标签
      const lastNextTab = tabState.getNextTabId(tabs[2].id)
      expect(lastNextTab).toBeNull()

      // 获取第二个标签的上一个标签
      const prevTab = tabState.getPreviousTabId(tabs[1].id)
      expect(prevTab).toBe(tabs[0].id)

      // 获取第一个标签的上一个标签
      const firstPrevTab = tabState.getPreviousTabId(tabs[0].id)
      expect(firstPrevTab).toBeNull()
    })
  })

  describe('钩子函数', () => {
    it('应该执行创建前钩子', async () => {
      const beforeCreateHook = vi.fn((tab) => ({ ...tab, title: 'Modified ' + tab.title }))
      
      tabState.setHooks({
        beforeCreate: beforeCreateHook
      })

      const newTab = await tabState.addTab({ title: 'Test', route: '/test' })
      
      expect(beforeCreateHook).toHaveBeenCalled()
      expect(newTab?.title).toBe('Modified Test')
    })

    it('应该执行激活前钩子并能够阻止激活', async () => {
      // 先添加标签，然后设置钩子
      const tab1 = await tabState.addTab({ title: 'Tab 1', route: '/tab1' }) // 这会自动激活
      const tab2 = await tabState.addTab({ title: 'Tab 2', route: '/tab2' }, false) // 不激活

      // 验证初始状态 - tab1 应该是激活的
      expect(tabState.state.activeTabId).toBe(tab1!.id)

      // 现在设置钩子来阻止后续的激活
      const beforeActivateHook = vi.fn(() => false) // 阻止激活
      tabState.setHooks({
        beforeActivate: beforeActivateHook
      })

      const activated = await tabState.activateTab(tab2!.id)
      
      expect(beforeActivateHook).toHaveBeenCalled()
      expect(activated).toBe(false)
      expect(tabState.state.activeTabId).toBe(tab1!.id) // 仍然是第一个标签
    })

    it('应该执行移除前钩子并能够阻止移除', async () => {
      const beforeRemoveHook = vi.fn(() => false) // 阻止移除
      
      tabState.setHooks({
        beforeRemove: beforeRemoveHook
      })

      const tab = await tabState.addTab({ title: 'Protected Tab', route: '/protected' })
      
      const removed = await tabState.removeTab(tab!.id)
      
      expect(beforeRemoveHook).toHaveBeenCalled()
      expect(removed).toBe(false)
      expect(tabState.state.tabs).toHaveLength(1) // 标签仍然存在
    })
  })

  describe('清理功能', () => {
    it('应该能够清除所有标签页', async () => {
      await tabState.addTab({ title: 'Tab 1', route: '/tab1' })
      await tabState.addTab({ title: 'Tab 2', route: '/tab2' })
      await tabState.addTab({ title: 'Tab 3', route: '/tab3' })

      expect(tabState.state.tabs).toHaveLength(3)

      await tabState.clearAllTabs()

      expect(tabState.state.tabs).toHaveLength(0)
      expect(tabState.state.activeTabId).toBeNull()
    })
  })

  describe('统计和性能', () => {
    it('应该正确计算统计信息', async () => {
      const tab1 = await tabState.addTab({ title: 'Tab 1', route: '/tab1' })
      await tabState.addTab({ title: 'Tab 2', route: '/tab2', temporary: true })
      const tab3 = await tabState.addTab({ title: 'Tab 3', route: '/tab3' })

      // 等待确保时间差异
      await new Promise(resolve => setTimeout(resolve, 5))
      
      // 手动激活tab1使其成为最活跃的标签
      await tabState.activateTab(tab1!.id)

      const stats = tabState.stats
      
      expect(stats.totalTabs).toBe(3)
      expect(stats.temporaryTabs).toBe(1)
      expect(stats.mostActiveTabId).toBe(tab1!.id) // tab1现在是最活跃的（最后激活的）
      expect(stats.memoryUsage).toBeGreaterThan(0)
    })

    it('应该正确计算内存使用', () => {
      const tab = tabState.utils.createDefaultTab({
        title: 'Test Tab',
        route: '/test'
      })

      const memoryUsage = tabState.utils.calculateMemoryUsage?.(tab) || 0
      expect(memoryUsage).toBeGreaterThan(0)
    })
  })
})