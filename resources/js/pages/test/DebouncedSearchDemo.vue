<template>
  <div class="min-h-screen bg-background p-6">
    <div class="mx-auto max-w-4xl space-y-6">
      <!-- 页面标题 -->
      <div class="text-center">
        <h1 class="text-3xl font-bold tracking-tight">防抖搜索演示</h1>
        <p class="mt-2 text-muted-foreground">
          展示防抖搜索功能的高级特性和性能优化
        </p>
      </div>

      <!-- 搜索输入区域 -->
      <div class="rounded-lg border bg-card p-6">
        <h2 class="mb-4 text-xl font-semibold">搜索测试</h2>
        
        <div class="space-y-4">
          <!-- 搜索输入框 -->
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="输入搜索关键词..."
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              @input="handleSearch"
            />
            <div class="absolute right-3 top-2.5 text-xs text-muted-foreground">
              {{ searchQuery.length }}/{{ debouncedSearch.config.maxQueryLength }}
            </div>
          </div>

          <!-- 搜索状态指示器 -->
          <div class="flex items-center space-x-4 text-sm">
            <div class="flex items-center space-x-2">
              <div
                :class="[
                  'h-2 w-2 rounded-full',
                  debouncedSearch.isSearching.value ? 'bg-orange-500' : 'bg-green-500'
                ]"
              />
              <span>
                {{ debouncedSearch.isSearching.value ? '搜索中...' : '就绪' }}
              </span>
            </div>
            
            <div v-if="debouncedSearch.hasActiveSearch.value" class="text-blue-600">
              有活跃搜索
            </div>
          </div>

          <!-- 控制按钮 -->
          <div class="flex space-x-2">
            <button
              @click="handleImmediateSearch"
              class="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              立即搜索
            </button>
            <button
              @click="handleCancelSearch"
              class="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
            >
              取消搜索
            </button>
            <button
              @click="handleClearCache"
              class="rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
            >
              清空缓存
            </button>
          </div>
        </div>
      </div>

      <!-- 搜索结果 -->
      <div class="rounded-lg border bg-card p-6">
        <h2 class="mb-4 text-xl font-semibold">搜索结果</h2>
        
        <div v-if="globalSearchData.hasResults.value" class="space-y-3">
          <div
            v-for="result in globalSearchData.searchState.results"
            :key="result.id"
            class="rounded-md border p-3 hover:bg-accent"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h3 class="font-medium">{{ result.title }}</h3>
                <p class="text-sm text-muted-foreground">{{ result.description }}</p>
                <div class="mt-1 text-xs text-muted-foreground">
                  类型: {{ result.type }} | URL: {{ result.url }}
                </div>
              </div>
              <div class="ml-2 rounded-full bg-secondary px-2 py-1 text-xs">
                {{ result.type }}
              </div>
            </div>
          </div>
        </div>
        
        <div v-else-if="globalSearchData.searchState.isLoading" class="text-center py-8">
          <div class="text-muted-foreground">正在搜索...</div>
        </div>
        
        <div v-else-if="globalSearchData.searchState.error" class="text-center py-8">
          <div class="text-destructive">{{ globalSearchData.searchState.error }}</div>
        </div>
        
        <div v-else class="text-center py-8">
          <div class="text-muted-foreground">暂无搜索结果</div>
        </div>
      </div>

      <!-- 统计信息 -->
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <!-- 搜索统计 -->
        <div class="rounded-lg border bg-card p-6">
          <h3 class="mb-4 text-lg font-semibold">搜索统计</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span>总搜索次数:</span>
              <span class="font-mono">{{ searchStats.searchState.searchCount }}</span>
            </div>
            <div class="flex justify-between">
              <span>取消次数:</span>
              <span class="font-mono">{{ searchStats.searchState.cancelledCount }}</span>
            </div>
            <div class="flex justify-between">
              <span>缓存命中:</span>
              <span class="font-mono">{{ searchStats.searchState.cacheHitCount }}</span>
            </div>
            <div class="flex justify-between">
              <span>最后搜索时间:</span>
              <span class="font-mono">
                {{ searchStats.searchState.lastSearchTime ? 
                   new Date(searchStats.searchState.lastSearchTime).toLocaleTimeString() : 
                   '未搜索' }}
              </span>
            </div>
          </div>
        </div>

        <!-- 性能指标 -->
        <div class="rounded-lg border bg-card p-6">
          <h3 class="mb-4 text-lg font-semibold">性能指标</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span>总请求数:</span>
              <span class="font-mono">{{ searchStats.metrics.totalRequests }}</span>
            </div>
            <div class="flex justify-between">
              <span>缓存命中率:</span>
              <span class="font-mono">{{ searchStats.cacheHitRate }}%</span>
            </div>
            <div class="flex justify-between">
              <span>平均响应时间:</span>
              <span class="font-mono">{{ searchStats.metrics.averageResponseTime }}ms</span>
            </div>
            <div class="flex justify-between">
              <span>最后响应时间:</span>
              <span class="font-mono">{{ searchStats.metrics.lastSearchDuration }}ms</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 缓存信息 -->
      <div class="rounded-lg border bg-card p-6">
        <h3 class="mb-4 text-lg font-semibold">缓存状态</h3>
        <div class="space-y-2">
          <div class="flex justify-between text-sm">
            <span>缓存大小:</span>
            <span class="font-mono">{{ debouncedSearch.cacheStats.value.size }} 项</span>
          </div>
          <div class="flex justify-between text-sm">
            <span>命中率:</span>
            <span class="font-mono">{{ debouncedSearch.cacheStats.value.hitRate }}%</span>
          </div>
        </div>
      </div>

      <!-- 搜索历史 -->
      <div class="rounded-lg border bg-card p-6">
        <h3 class="mb-4 text-lg font-semibold">搜索历史</h3>
        <div v-if="globalSearchData.recentSearches.value.length > 0" class="space-y-2">
          <div
            v-for="(query, index) in globalSearchData.recentSearches.value"
            :key="index"
            class="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2 text-sm"
          >
            <span>{{ query }}</span>
            <button
              @click="searchQuery = query; handleSearch()"
              class="text-xs text-primary hover:underline"
            >
              重新搜索
            </button>
          </div>
        </div>
        <div v-else class="text-center py-4 text-sm text-muted-foreground">
          暂无搜索历史
        </div>
      </div>

      <!-- 配置信息 -->
      <div class="rounded-lg border bg-card p-6">
        <h3 class="mb-4 text-lg font-semibold">配置信息</h3>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div class="space-y-1">
            <div class="font-medium">防抖延迟</div>
            <div class="font-mono text-muted-foreground">{{ debouncedSearch.config.debounceDelay }}ms</div>
          </div>
          <div class="space-y-1">
            <div class="font-medium">节流延迟</div>
            <div class="font-mono text-muted-foreground">{{ debouncedSearch.config.throttleDelay }}ms</div>
          </div>
          <div class="space-y-1">
            <div class="font-medium">最小查询长度</div>
            <div class="font-mono text-muted-foreground">{{ debouncedSearch.config.minQueryLength }}</div>
          </div>
          <div class="space-y-1">
            <div class="font-medium">缓存过期时间</div>
            <div class="font-mono text-muted-foreground">{{ debouncedSearch.config.cacheExpiry / 1000 }}s</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDebouncedGlobalSearch } from '@/composables/useDebouncedGlobalSearch'
import { getGlobalSearchData } from '@/composables/useGlobalSearchData'

// 页面标题
defineOptions({
  name: 'DebouncedSearchDemo'
})

// 搜索查询
const searchQuery = ref('')

// 防抖搜索实例
const debouncedSearch = useDebouncedGlobalSearch({
  debounceDelay: 500,
  throttleDelay: 100,
  enableCache: true,
  cacheExpiry: 60000 // 1分钟
})

// 全局搜索数据
const globalSearchData = getGlobalSearchData()

// 搜索统计（响应式）
const searchStats = computed(() => debouncedSearch.getSearchStats())

/**
 * 处理搜索输入
 */
const handleSearch = () => {
  if (searchQuery.value.trim()) {
    debouncedSearch.search(searchQuery.value)
  } else {
    debouncedSearch.clearSearch()
  }
}

/**
 * 立即搜索
 */
const handleImmediateSearch = () => {
  if (searchQuery.value.trim()) {
    debouncedSearch.searchImmediate(searchQuery.value)
  }
}

/**
 * 取消搜索
 */
const handleCancelSearch = () => {
  debouncedSearch.cancelCurrentSearch()
}

/**
 * 清空缓存
 */
const handleClearCache = () => {
  debouncedSearch.clearCache()
}

// 组件挂载时的初始化
onMounted(() => {
  // 可以在这里添加一些初始数据
  console.log('防抖搜索演示组件已挂载')
  console.log('配置:', debouncedSearch.config)
})
</script>