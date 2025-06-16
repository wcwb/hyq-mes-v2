<template>
  <div class="min-h-screen bg-background p-6">
    <div class="mx-auto max-w-4xl space-y-6">
      <!-- 页面标题 -->
      <div class="text-center">
        <h1 class="text-3xl font-bold tracking-tight">搜索API集成演示</h1>
        <p class="mt-2 text-muted-foreground">
          展示搜索API与防抖功能的完整集成
        </p>
      </div>

      <!-- 搜索测试区域 -->
      <div class="rounded-lg border bg-card p-6">
        <h2 class="mb-4 text-xl font-semibold">API搜索测试</h2>
        
        <div class="space-y-4">
          <!-- 搜索输入框 -->
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="输入搜索关键词测试API..."
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              @input="handleSearch"
              @keydown.enter="handleImmediateSearch"
            />
            <div class="absolute right-3 top-2.5 text-xs text-muted-foreground">
              {{ searchQuery.length }}/100
            </div>
          </div>

          <!-- 搜索状态 -->
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4 text-sm">
              <div class="flex items-center space-x-2">
                <div
                  :class="[
                    'h-2 w-2 rounded-full',
                    isSearching ? 'bg-orange-500 animate-pulse' : 'bg-green-500'
                  ]"
                />
                <span>
                  {{ isSearching ? '搜索中...' : '就绪' }}
                </span>
              </div>
              
              <div v-if="lastError" class="text-red-600">
                错误: {{ lastError }}
              </div>
            </div>

            <div class="flex space-x-2">
              <button
                @click="handleImmediateSearch"
                :disabled="!searchQuery.trim() || isSearching"
                class="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                立即搜索
              </button>
              <button
                @click="handleCancelSearch"
                :disabled="!isSearching"
                class="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                取消搜索
              </button>
            </div>
          </div>

          <!-- API配置 -->
          <div class="rounded-md bg-secondary/50 p-3">
            <h3 class="mb-2 text-sm font-medium">API配置</h3>
            <div class="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label class="block font-medium">超时时间(ms)</label>
                <input
                  v-model.number="apiConfig.timeout"
                  type="number"
                  class="mt-1 w-full rounded border px-2 py-1"
                  min="1000"
                  max="30000"
                />
              </div>
              <div>
                <label class="block font-medium">重试次数</label>
                <input
                  v-model.number="apiConfig.retries"
                  type="number"
                  class="mt-1 w-full rounded border px-2 py-1"
                  min="0"
                  max="5"
                />
              </div>
              <div>
                <label class="block font-medium">搜索类型</label>
                <select
                  v-model="apiConfig.types"
                  multiple
                  class="mt-1 w-full rounded border px-2 py-1"
                >
                  <option value="page">页面</option>
                  <option value="order">订单</option>
                  <option value="product">产品</option>
                  <option value="user">用户</option>
                  <option value="setting">设置</option>
                </select>
              </div>
              <div>
                <label class="block font-medium">结果限制</label>
                <input
                  v-model.number="apiConfig.limit"
                  type="number"
                  class="mt-1 w-full rounded border px-2 py-1"
                  min="1"
                  max="50"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 搜索结果 -->
      <div class="rounded-lg border bg-card p-6">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-xl font-semibold">搜索结果</h2>
          <div v-if="searchResults.length > 0" class="text-sm text-muted-foreground">
            找到 {{ searchResults.length }} 条结果
          </div>
        </div>
        
        <div v-if="searchResults.length > 0" class="space-y-3">
          <div
            v-for="result in searchResults"
            :key="result.id"
            class="rounded-md border p-3 hover:bg-accent transition-colors"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center space-x-2">
                  <h3 class="font-medium">{{ result.title }}</h3>
                  <span v-if="result.icon">{{ result.icon }}</span>
                </div>
                <p class="text-sm text-muted-foreground">{{ result.description }}</p>
                <div class="mt-1 flex items-center space-x-4 text-xs text-muted-foreground">
                  <span>类型: {{ result.type_label || result.type }}</span>
                  <span v-if="result.category">分类: {{ result.category }}</span>
                  <span v-if="result.url">URL: {{ result.url }}</span>
                </div>
              </div>
              <div class="ml-2 rounded-full bg-secondary px-2 py-1 text-xs">
                {{ result.type }}
              </div>
            </div>
          </div>
        </div>
        
        <div v-else-if="isSearching" class="text-center py-8">
          <div class="inline-flex items-center space-x-2 text-muted-foreground">
            <div class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
            <span>正在搜索...</span>
          </div>
        </div>
        
        <div v-else-if="lastError" class="text-center py-8">
          <div class="text-destructive">{{ lastError }}</div>
        </div>
        
        <div v-else class="text-center py-8">
          <div class="text-muted-foreground">
            {{ searchQuery ? '未找到搜索结果' : '请输入关键词开始搜索' }}
          </div>
        </div>
      </div>

      <!-- API统计 -->
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <!-- 搜索统计 -->
        <div class="rounded-lg border bg-card p-6">
          <h3 class="mb-4 text-lg font-semibold">搜索统计</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span>总搜索次数:</span>
              <span class="font-mono">{{ searchStats.totalSearches }}</span>
            </div>
            <div class="flex justify-between">
              <span>成功次数:</span>
              <span class="font-mono">{{ searchStats.successCount }}</span>
            </div>
            <div class="flex justify-between">
              <span>失败次数:</span>
              <span class="font-mono">{{ searchStats.errorCount }}</span>
            </div>
            <div class="flex justify-between">
              <span>取消次数:</span>
              <span class="font-mono">{{ searchStats.cancelCount }}</span>
            </div>
            <div class="flex justify-between">
              <span>平均响应时间:</span>
              <span class="font-mono">{{ searchStats.averageResponseTime }}ms</span>
            </div>
          </div>
        </div>

        <!-- API状态 -->
        <div class="rounded-lg border bg-card p-6">
          <h3 class="mb-4 text-lg font-semibold">API状态</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span>API端点:</span>
              <span class="font-mono text-xs">{{ apiEndpoint }}</span>
            </div>
            <div class="flex justify-between">
              <span>最后请求时间:</span>
              <span class="font-mono text-xs">
                {{ lastRequestTime ? new Date(lastRequestTime).toLocaleTimeString() : '未发起请求' }}
              </span>
            </div>
            <div class="flex justify-between">
              <span>最后响应时间:</span>
              <span class="font-mono">{{ lastResponseTime }}ms</span>
            </div>
            <div class="flex justify-between">
              <span>连接状态:</span>
              <span :class="[
                'font-mono',
                connectionStatus === 'online' ? 'text-green-600' : 'text-red-600'
              ]">
                {{ connectionStatus === 'online' ? '在线' : '离线' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 原始响应数据 -->
      <div v-if="rawResponse" class="rounded-lg border bg-card p-6">
        <h3 class="mb-4 text-lg font-semibold">原始响应数据</h3>
        <pre class="overflow-auto rounded bg-secondary p-4 text-xs"><code>{{ JSON.stringify(rawResponse, null, 2) }}</code></pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useSearchApi, SearchApiError, type SearchApiParams } from '@/services/searchApi'
import type { SearchResult } from '@/types'

// 页面标题
defineOptions({
  name: 'SearchApiDemo'
})

// 搜索API服务
const { search } = useSearchApi()

// 搜索状态
const searchQuery = ref('')
const isSearching = ref(false)
const searchResults = ref<SearchResult[]>([])
const lastError = ref<string>('')
const lastRequestTime = ref<number>(0)
const lastResponseTime = ref<number>(0)
const rawResponse = ref<any>(null)

// 搜索配置
const apiConfig = reactive({
  timeout: 8000,
  retries: 1,
  types: ['page', 'order', 'product', 'user', 'setting'] as Array<'page' | 'order' | 'product' | 'user' | 'setting'>,
  limit: 20
})

// 搜索统计
const searchStats = reactive({
  totalSearches: 0,
  successCount: 0,
  errorCount: 0,
  cancelCount: 0,
  averageResponseTime: 0
})

// 取消控制器
let currentController: AbortController | null = null

// 计算属性
const apiEndpoint = computed(() => {
  try {
    return route('api.search')
  } catch {
    return '/api/search'
  }
})

const connectionStatus = computed(() => {
  return navigator.onLine ? 'online' : 'offline'
})

/**
 * 处理搜索输入
 */
const handleSearch = () => {
  if (searchQuery.value.trim()) {
    performDebouncedSearch(searchQuery.value)
  } else {
    clearResults()
  }
}

/**
 * 立即搜索
 */
const handleImmediateSearch = async () => {
  if (!searchQuery.value.trim()) return
  await performSearch(searchQuery.value)
}

/**
 * 取消搜索
 */
const handleCancelSearch = () => {
  if (currentController) {
    currentController.abort()
    currentController = null
    isSearching.value = false
    searchStats.cancelCount++
  }
}

/**
 * 防抖搜索
 */
let debounceTimer: NodeJS.Timeout | null = null
const performDebouncedSearch = (query: string) => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  
  debounceTimer = setTimeout(() => {
    performSearch(query)
  }, 300)
}

/**
 * 执行搜索
 */
const performSearch = async (query: string) => {
  if (isSearching.value) {
    handleCancelSearch()
  }

  const startTime = Date.now()
  lastRequestTime.value = startTime
  isSearching.value = true
  lastError.value = ''
  rawResponse.value = null

  // 创建新的取消控制器
  currentController = new AbortController()

  try {
    const params: SearchApiParams = {
      query,
      types: apiConfig.types,
      limit: apiConfig.limit,
      include_suggestions: true
    }

    searchStats.totalSearches++

    const results = await search(params, {
      timeout: apiConfig.timeout,
      retries: apiConfig.retries,
      signal: currentController.signal
    })

    const responseTime = Date.now() - startTime
    lastResponseTime.value = responseTime

    // 更新平均响应时间
    searchStats.averageResponseTime = Math.round(
      ((searchStats.averageResponseTime * (searchStats.successCount)) + responseTime) /
      (searchStats.successCount + 1)
    )

    searchStats.successCount++
    searchResults.value = results
    
    // 设置原始响应数据（模拟）
    rawResponse.value = {
      success: true,
      data: {
        query,
        total: results.length,
        results: results,
        search_time: responseTime / 1000,
        timestamp: new Date(startTime).toISOString()
      }
    }

  } catch (error) {
    const responseTime = Date.now() - startTime
    lastResponseTime.value = responseTime

    if (error instanceof SearchApiError) {
      if (error.code === 'CANCELLED') {
        searchStats.cancelCount++
        lastError.value = '搜索已取消'
      } else {
        searchStats.errorCount++
        lastError.value = error.message
      }
    } else {
      searchStats.errorCount++
      lastError.value = '未知错误'
    }

    console.error('搜索错误:', error)
    searchResults.value = []
    
    // 设置错误响应数据
    rawResponse.value = {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date(startTime).toISOString()
    }
  } finally {
    isSearching.value = false
    currentController = null
  }
}

/**
 * 清空结果
 */
const clearResults = () => {
  searchResults.value = []
  lastError.value = ''
  rawResponse.value = null
}

// 组件挂载
onMounted(() => {
  console.log('搜索API演示页面已加载')
  console.log('API端点:', apiEndpoint.value)
})
</script>