<template>
  <div class="max-w-6xl mx-auto p-6 space-y-6">
    <!-- 标题 -->
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">
        Tab State Management Demo
      </h1>
      <p class="text-gray-600 dark:text-gray-400 mt-2">
        演示标签页状态管理系统的各种功能
      </p>
    </div>

    <!-- 控制面板 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 添加标签页 -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">添加标签页</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">标题</label>
            <input
              v-model="newTab.title"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="输入标签标题"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">路由</label>
            <input
              v-model="newTab.route"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="输入路由路径"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">图标</label>
            <input
              v-model="newTab.icon"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="图标名称 (可选)"
            />
          </div>
          <div class="flex items-center space-x-4">
            <label class="flex items-center">
              <input
                v-model="newTab.temporary"
                type="checkbox"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span class="ml-2 text-sm">临时标签</span>
            </label>
            <label class="flex items-center">
              <input
                v-model="newTab.closable"
                type="checkbox"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span class="ml-2 text-sm">可关闭</span>
            </label>
          </div>
          <div class="flex space-x-2">
            <button
              @click="addTab(true)"
              :disabled="isLoading"
              class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              添加并激活
            </button>
            <button
              @click="addTab(false)"
              :disabled="isLoading"
              class="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50"
            >
              仅添加
            </button>
          </div>
        </div>
      </div>

      <!-- 系统状态 -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">系统状态</h2>
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-gray-600">标签总数:</span>
            <span class="font-mono">{{ stats.totalTabs }} / {{ state.maxTabs }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">临时标签:</span>
            <span class="font-mono">{{ stats.temporaryTabs }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">当前激活:</span>
            <span class="font-mono text-blue-600">{{ activeTab?.title || 'None' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">内存使用:</span>
            <span class="font-mono">{{ (stats.memoryUsage / 1024).toFixed(2) }}KB</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">平均生存时间:</span>
            <span class="font-mono">{{ formatDuration(stats.averageLifetime) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">是否达到上限:</span>
            <span :class="isMaxTabsReached ? 'text-red-600' : 'text-green-600'">
              {{ isMaxTabsReached ? 'Yes' : 'No' }}
            </span>
          </div>
        </div>

        <!-- 配置面板 -->
        <div class="mt-6 pt-4 border-t">
          <h3 class="text-lg font-medium mb-3">配置选项</h3>
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium mb-1">最大标签数</label>
              <input
                v-model.number="configForm.maxTabs"
                type="number"
                min="1"
                max="20"
                class="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                @change="updateConfig"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">移除策略</label>
              <select
                v-model="configForm.removalStrategy"
                class="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                @change="updateConfig"
              >
                <option value="lru">最近最少使用 (LRU)</option>
                <option value="oldest">最老标签</option>
                <option value="temporary">临时标签优先</option>
                <option value="manual">手动选择</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 标签页列表 -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div class="p-6 border-b">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold">标签页列表</h2>
          <div class="flex space-x-2">
            <button
              @click="clearAllTabs"
              :disabled="state.tabs.length === 0"
              class="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
            >
              清除所有
            </button>
            <button
              @click="cleanupExpiredTabs"
              class="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
            >
              清理过期
            </button>
          </div>
        </div>
      </div>
      
      <div class="p-6">
        <div v-if="state.tabs.length === 0" class="text-center text-gray-500 py-8">
          暂无标签页
        </div>
        
        <div v-else class="space-y-3">
          <div
            v-for="(tab, index) in state.tabs"
            :key="tab.id"
            :class="[
              'flex items-center justify-between p-4 border rounded-lg',
              tab.id === state.activeTabId 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-gray-200 hover:border-gray-300'
            ]"
          >
            <div class="flex items-center space-x-3">
              <span class="text-sm text-gray-500 font-mono w-8">{{ index + 1 }}</span>
              <div>
                <div class="flex items-center space-x-2">
                  <h3 class="font-medium">{{ tab.title }}</h3>
                  <span v-if="tab.temporary" class="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                    临时
                  </span>
                  <span v-if="!tab.closable" class="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                    不可关闭
                  </span>
                </div>
                <p class="text-sm text-gray-600">{{ tab.route }}</p>
                <p class="text-xs text-gray-400">
                  创建: {{ formatTime(tab.createdAt) }} | 
                  访问: {{ formatTime(tab.lastAccessed) }} |
                  ID: {{ tab.id.split('_').pop() }}
                </p>
              </div>
            </div>
            
            <div class="flex items-center space-x-2">
              <button
                @click="activateTab(tab.id)"
                :disabled="tab.id === state.activeTabId"
                class="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
              >
                {{ tab.id === state.activeTabId ? '已激活' : '激活' }}
              </button>
              <button
                @click="updateTab(tab)"
                class="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                编辑
              </button>
              <button
                @click="removeTab(tab.id)"
                :disabled="!tab.closable"
                class="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 错误信息 -->
    <div v-if="errors.length > 0" class="bg-red-50 border border-red-200 rounded-lg p-4">
      <h3 class="text-red-800 font-medium mb-2">错误信息</h3>
      <ul class="space-y-1">
        <li v-for="(error, index) in errors" :key="index" class="text-red-700 text-sm">
          {{ error.type }}: {{ error.message }}
        </li>
      </ul>
      <button
        @click="clearErrors"
        class="mt-3 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
      >
        清除错误
      </button>
    </div>

    <!-- 事件历史 -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div class="p-6 border-b">
        <h2 class="text-xl font-semibold">事件历史 (最近10条)</h2>
      </div>
      <div class="p-6">
        <div v-if="eventHistory.length === 0" class="text-center text-gray-500 py-4">
          暂无事件记录
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="event in recentEvents"
            :key="`${event.timestamp}-${event.type}`"
            class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded"
          >
            <div class="flex items-center space-x-3">
              <span :class="getEventTypeColor(event.type)" class="px-2 py-1 text-xs rounded font-medium">
                {{ event.type.toUpperCase() }}
              </span>
              <span class="text-sm">
                {{ event.tab?.title || '未知标签' }}
              </span>
            </div>
            <span class="text-xs text-gray-500">
              {{ formatTime(event.timestamp) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useTabState } from '@/composables/useTabState'
import { TabRemovalStrategy } from '@/types/tab'

// 标签页状态管理
const tabState = useTabState()
const { 
  state, 
  activeTab, 
  stats, 
  isMaxTabsReached, 
  errors, 
  isLoading, 
  eventHistory 
} = tabState

// 表单数据
const newTab = reactive({
  title: '',
  route: '',
  icon: '',
  temporary: false,
  closable: true
})

// 配置表单
const configForm = reactive({
  maxTabs: state.maxTabs,
  removalStrategy: 'lru' as TabRemovalStrategy
})

// 计算最近事件
const recentEvents = computed(() => {
  return eventHistory.slice(-10).reverse()
})

/**
 * 添加标签页
 */
const addTab = async (activate = true) => {
  if (!newTab.title || !newTab.route) {
    return
  }

  await tabState.addTab({
    title: newTab.title,
    route: newTab.route,
    icon: newTab.icon || undefined,
    temporary: newTab.temporary,
    closable: newTab.closable
  }, activate)

  // 重置表单
  newTab.title = ''
  newTab.route = ''
  newTab.icon = ''
  newTab.temporary = false
  newTab.closable = true
}

/**
 * 激活标签页
 */
const activateTab = async (tabId: string) => {
  await tabState.activateTab(tabId)
}

/**
 * 移除标签页
 */
const removeTab = async (tabId: string) => {
  await tabState.removeTab(tabId)
}

/**
 * 更新标签页
 */
const updateTab = async (tab: any) => {
  const newTitle = prompt('输入新的标题:', tab.title)
  if (newTitle && newTitle !== tab.title) {
    await tabState.updateTab(tab.id, { title: newTitle })
  }
}

/**
 * 清除所有标签页
 */
const clearAllTabs = async () => {
  if (confirm('确认清除所有标签页？')) {
    await tabState.clearAllTabs()
  }
}

/**
 * 清理过期标签页
 */
const cleanupExpiredTabs = () => {
  const removedCount = tabState.cleanupExpiredTabs()
  alert(`已清理 ${removedCount} 个过期标签页`)
}

/**
 * 清除错误
 */
const clearErrors = () => {
  errors.splice(0)
}

/**
 * 更新配置
 */
const updateConfig = () => {
  tabState.updateConfig(configForm)
}

/**
 * 格式化时间
 */
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString()
}

/**
 * 格式化持续时间
 */
const formatDuration = (ms: number) => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

/**
 * 获取事件类型颜色
 */
const getEventTypeColor = (type: string) => {
  switch (type) {
    case 'add':
      return 'bg-green-100 text-green-800'
    case 'remove':
      return 'bg-red-100 text-red-800'
    case 'activate':
      return 'bg-blue-100 text-blue-800'
    case 'update':
      return 'bg-yellow-100 text-yellow-800'
    case 'reorder':
      return 'bg-purple-100 text-purple-800'
    case 'clear':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// 组件挂载时添加一些示例标签
onMounted(async () => {
  await tabState.addTab({
    title: 'Dashboard',
    route: '/dashboard',
    icon: 'home'
  })
  
  await tabState.addTab({
    title: 'Users',
    route: '/users',
    icon: 'users'
  }, false)
})
</script>