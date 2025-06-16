<template>
  <div class="min-h-screen bg-background p-6">
    <div class="mx-auto max-w-6xl space-y-6">
      <!-- 页面标题 -->
      <div class="text-center">
        <h1 class="text-3xl font-bold tracking-tight">搜索结果分组演示</h1>
        <p class="mt-2 text-muted-foreground">
          展示智能搜索结果分组和过滤功能
        </p>
      </div>

      <!-- 搜索和控制面板 -->
      <div class="rounded-lg border bg-card p-6">
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <!-- 搜索输入 -->
          <div class="space-y-4">
            <h2 class="text-xl font-semibold">搜索设置</h2>
            
            <div>
              <label class="block text-sm font-medium mb-2">搜索关键词</label>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="输入关键词进行搜索..."
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                @input="handleSearch"
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">分组策略</label>
              <select
                v-model="groupingStrategy"
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                @change="handleSearch"
              >
                <option value="intelligent">智能分组</option>
                <option value="type">按类型分组</option>
                <option value="category">按分类分组</option>
                <option value="hybrid">混合分组</option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium mb-2">最大分组数</label>
                <input
                  v-model.number="config.maxGroups"
                  type="number"
                  min="1"
                  max="20"
                  class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  @change="handleSearch"
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-2">每组最大结果</label>
                <input
                  v-model.number="config.maxResultsPerGroup"
                  type="number"
                  min="1"
                  max="50"
                  class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  @change="handleSearch"
                />
              </div>
            </div>
          </div>

          <!-- 过滤器设置 -->
          <div class="space-y-4">
            <h2 class="text-xl font-semibold">过滤器</h2>
            
            <div>
              <label class="block text-sm font-medium mb-2">类型过滤</label>
              <div class="flex flex-wrap gap-2">
                <label
                  v-for="type in availableTypes"
                  :key="type"
                  class="flex items-center space-x-2 text-sm"
                >
                  <input
                    v-model="activeTypeFilters"
                    type="checkbox"
                    :value="type"
                    class="rounded border-input"
                    @change="handleSearch"
                  />
                  <span>{{ getTypeLabel(type) }}</span>
                </label>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">分类过滤</label>
              <div class="flex flex-wrap gap-2">
                <label
                  v-for="category in availableCategories"
                  :key="category"
                  class="flex items-center space-x-2 text-sm"
                >
                  <input
                    v-model="activeCategoryFilters"
                    type="checkbox"
                    :value="category"
                    class="rounded border-input"
                    @change="handleSearch"
                  />
                  <span>{{ category }}</span>
                </label>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">关键词过滤</label>
              <input
                v-model="keywordFilter"
                type="text"
                placeholder="过滤关键词..."
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                @input="handleSearch"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 搜索统计 -->
      <div v-if="groupedResults" class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div class="rounded-lg border bg-card p-4">
          <div class="text-2xl font-bold">{{ groupedResults.totalCount }}</div>
          <div class="text-sm text-muted-foreground">总结果数</div>
        </div>
        <div class="rounded-lg border bg-card p-4">
          <div class="text-2xl font-bold">{{ groupedResults.groupCount }}</div>
          <div class="text-sm text-muted-foreground">分组数量</div>
        </div>
        <div class="rounded-lg border bg-card p-4">
          <div class="text-2xl font-bold">{{ groupedResults.stats.averageGroupSize }}</div>
          <div class="text-sm text-muted-foreground">平均组大小</div>
        </div>
        <div class="rounded-lg border bg-card p-4">
          <div class="text-2xl font-bold">{{ groupedResults.strategy }}</div>
          <div class="text-sm text-muted-foreground">分组策略</div>
        </div>
      </div>

      <!-- 搜索结果分组显示 -->
      <div v-if="groupedResults && groupedResults.groups.length > 0" class="space-y-6">
        <div
          v-for="group in groupedResults.groups"
          :key="group.id"
          class="rounded-lg border bg-card"
        >
          <!-- 分组头部 -->
          <div 
            class="flex items-center justify-between p-4 cursor-pointer hover:bg-accent transition-colors"
            @click="toggleGroup(group.id)"
          >
            <div class="flex items-center space-x-3">
              <span v-if="group.icon" class="text-lg">{{ group.icon }}</span>
              <div>
                <h3 class="font-semibold">{{ group.label }}</h3>
                <p v-if="group.description" class="text-sm text-muted-foreground">
                  {{ group.description }}
                </p>
              </div>
            </div>
            <div class="flex items-center space-x-3">
              <span class="rounded-full bg-secondary px-2 py-1 text-sm font-medium">
                {{ group.count }}
              </span>
              <div 
                :class="[
                  'transition-transform duration-200',
                  expandedGroups.includes(group.id) ? 'rotate-180' : ''
                ]"
              >
                ⌄
              </div>
            </div>
          </div>

          <!-- 分组内容 -->
          <div 
            v-if="expandedGroups.includes(group.id)"
            class="border-t p-4 space-y-3"
          >
            <div
              v-for="item in group.items"
              :key="item.id"
              class="rounded-md border p-3 hover:bg-accent transition-colors"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-2">
                    <h4 class="font-medium">{{ item.title }}</h4>
                    <span v-if="item.icon">{{ item.icon }}</span>
                  </div>
                  <p v-if="item.description" class="text-sm text-muted-foreground mt-1">
                    {{ item.description }}
                  </p>
                  <div class="mt-2 flex items-center space-x-4 text-xs text-muted-foreground">
                    <span>类型: {{ getTypeLabel(item.type) }}</span>
                    <span v-if="item.category">分类: {{ item.category }}</span>
                    <span v-if="item.url">路径: {{ item.url }}</span>
                  </div>
                </div>
                <div class="ml-2 rounded-full bg-secondary px-2 py-1 text-xs">
                  {{ item.type }}
                </div>
              </div>
            </div>

            <!-- 如果有截断的结果 -->
            <div 
              v-if="group.metadata?.truncated"
              class="text-center py-2 text-sm text-muted-foreground"
            >
              显示 {{ group.items.length }} / {{ group.metadata.originalCount }} 个结果
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="searchQuery" class="text-center py-12">
        <div class="text-muted-foreground">
          没有找到匹配的搜索结果
        </div>
      </div>

      <div v-else class="text-center py-12">
        <div class="text-muted-foreground">
          请输入关键词开始搜索
        </div>
      </div>

      <!-- 调试信息 -->
      <div v-if="showDebugInfo && groupedResults" class="rounded-lg border bg-card p-6">
        <h3 class="mb-4 text-lg font-semibold">调试信息</h3>
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <h4 class="font-medium mb-2">分组统计</h4>
            <pre class="overflow-auto rounded bg-secondary p-3 text-xs">{{ JSON.stringify(groupedResults.stats, null, 2) }}</pre>
          </div>
          <div>
            <h4 class="font-medium mb-2">分组大小分布</h4>
            <div class="space-y-1 text-sm">
              <div
                v-for="(count, range) in groupedResults.stats.groupSizeDistribution"
                :key="range"
                class="flex justify-between"
              >
                <span>{{ range }} 个结果:</span>
                <span class="font-mono">{{ count }} 个分组</span>
              </div>
            </div>
          </div>
        </div>
        <div class="mt-4">
          <button
            @click="showDebugInfo = false"
            class="rounded-md bg-secondary px-3 py-1.5 text-sm hover:bg-secondary/80"
          >
            隐藏调试信息
          </button>
        </div>
      </div>

      <!-- 显示调试信息按钮 -->
      <div v-if="!showDebugInfo && groupedResults" class="text-center">
        <button
          @click="showDebugInfo = true"
          class="rounded-md bg-secondary px-3 py-1.5 text-sm hover:bg-secondary/80"
        >
          显示调试信息
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useSearchGrouping, type GroupingConfig, type GroupedResults } from '@/services/searchGrouping'
import type { SearchResult } from '@/types'
import { useDebounceFn } from '@vueuse/core'

// 页面标题
defineOptions({
  name: 'SearchGroupingDemo'
})

// 搜索分组服务
const { groupResults, applyFilters, createFilter } = useSearchGrouping()

// 响应式状态
const searchQuery = ref('')
const groupingStrategy = ref<'intelligent' | 'type' | 'category' | 'hybrid'>('intelligent')
const groupedResults = ref<GroupedResults | null>(null)
const expandedGroups = ref<string[]>([])
const showDebugInfo = ref(false)

// 过滤器配置
const activeTypeFilters = ref<string[]>([])
const activeCategoryFilters = ref<string[]>([])
const keywordFilter = ref('')

// 分组配置
const config = reactive<Partial<GroupingConfig>>({
  maxGroups: 10,
  maxResultsPerGroup: 10,
  showEmptyGroups: false
})

// 模拟数据
const mockData: SearchResult[] = [
  // 页面类型
  { id: '1', type: 'page', title: '仪表板', description: '系统主要数据展示页面', url: '/dashboard', category: '导航', icon: '📊' },
  { id: '2', type: 'page', title: '用户管理', description: '管理系统用户和权限', url: '/users', category: '系统', icon: '👥' },
  { id: '3', type: 'page', title: '订单管理', description: '查看和管理所有订单', url: '/orders', category: '业务', icon: '📋' },
  { id: '4', type: 'page', title: '产品目录', description: '浏览产品和服务目录', url: '/products', category: '业务', icon: '📦' },
  { id: '5', type: 'page', title: '报表中心', description: '各类数据分析报表', url: '/reports', category: '分析', icon: '📈' },
  { id: '6', type: 'page', title: '系统设置', description: '配置系统参数和选项', url: '/settings', category: '系统', icon: '⚙️' },
  
  // 订单类型
  { id: '7', type: 'order', title: '订单 #SO-2024-001', description: '标准件生产订单', url: '/orders/001', category: '标准件', icon: '📋' },
  { id: '8', type: 'order', title: '订单 #SO-2024-002', description: '定制件生产订单', url: '/orders/002', category: '定制件', icon: '📋' },
  { id: '9', type: 'order', title: '订单 #SO-2024-003', description: '紧急加工订单', url: '/orders/003', category: '紧急', icon: '⚡' },
  { id: '10', type: 'order', title: '订单 #SO-2024-004', description: '维修服务订单', url: '/orders/004', category: '维修', icon: '🔧' },
  
  // 产品类型
  { id: '11', type: 'product', title: '标准轴承 SKF-001', description: '高精度标准轴承', url: '/products/skf-001', category: '轴承', icon: '⚙️' },
  { id: '12', type: 'product', title: '定制齿轮 CG-A01', description: '精密定制齿轮组件', url: '/products/cg-a01', category: '齿轮', icon: '⚙️' },
  { id: '13', type: 'product', title: '液压缸 HC-200', description: '工业级液压缸', url: '/products/hc-200', category: '液压', icon: '🔧' },
  { id: '14', type: 'product', title: '传感器 TS-501', description: '温度传感器模块', url: '/products/ts-501', category: '传感器', icon: '📡' },
  { id: '15', type: 'product', title: '电机驱动器 MD-100', description: '步进电机驱动控制器', url: '/products/md-100', category: '驱动器', icon: '⚡' },
  
  // 用户类型
  { id: '16', type: 'user', title: '张三', description: '系统管理员', url: '/users/zhang-san', category: '管理员', icon: '👤' },
  { id: '17', type: 'user', title: '李四', description: '生产主管', url: '/users/li-si', category: '主管', icon: '👤' },
  { id: '18', type: 'user', title: '王五', description: '质量检验员', url: '/users/wang-wu', category: '检验员', icon: '👤' },
  { id: '19', type: 'user', title: '赵六', description: '工艺工程师', url: '/users/zhao-liu', category: '工程师', icon: '👤' },
  
  // 设置类型
  { id: '20', type: 'setting', title: '用户权限设置', description: '配置用户角色和权限', url: '/settings/permissions', category: '安全', icon: '🔒' },
  { id: '21', type: 'setting', title: '邮件通知设置', description: '配置系统邮件通知', url: '/settings/notifications', category: '通知', icon: '📧' },
  { id: '22', type: 'setting', title: '备份恢复设置', description: '数据备份和恢复配置', url: '/settings/backup', category: '备份', icon: '💾' },
  
  // 任务类型
  { id: '23', type: 'task', title: '设备维护任务', description: '定期设备检查和维护', url: '/tasks/maintenance', category: '维护', icon: '🔧' },
  { id: '24', type: 'task', title: '质量检验任务', description: '产品质量检验流程', url: '/tasks/inspection', category: '检验', icon: '🔍' },
  { id: '25', type: 'task', title: '库存盘点任务', description: '月度库存盘点作业', url: '/tasks/inventory', category: '库存', icon: '📋' }
]

// 计算属性
const availableTypes = computed(() => {
  const types = new Set(mockData.map(item => item.type))
  return Array.from(types).sort()
})

const availableCategories = computed(() => {
  const categories = new Set(mockData.map(item => item.category).filter(Boolean))
  return Array.from(categories).sort()
})

const filteredData = computed(() => {
  let results = mockData

  // 应用搜索查询
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    results = results.filter(item =>
      item.title?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.category?.toLowerCase().includes(query)
    )
  }

  // 创建过滤器
  const filters = []

  // 类型过滤器
  if (activeTypeFilters.value.length > 0) {
    activeTypeFilters.value.forEach(type => {
      filters.push(createFilter('type', type, `类型:${type}`))
    })
  }

  // 分类过滤器
  if (activeCategoryFilters.value.length > 0) {
    activeCategoryFilters.value.forEach(category => {
      filters.push(createFilter('category', category, `分类:${category}`))
    })
  }

  // 关键词过滤器
  if (keywordFilter.value.trim()) {
    filters.push(createFilter('keyword', keywordFilter.value, `关键词:${keywordFilter.value}`))
  }

  // 应用所有过滤器
  if (filters.length > 0) {
    results = applyFilters(results, filters)
  }

  return results
})

// 防抖搜索
const debouncedSearch = useDebounceFn(() => {
  performGrouping()
}, 300)

// 方法
const handleSearch = () => {
  debouncedSearch()
}

const performGrouping = () => {
  if (filteredData.value.length === 0) {
    groupedResults.value = null
    return
  }

  const results = groupResults(filteredData.value, groupingStrategy.value, config)
  groupedResults.value = results

  // 默认展开前两个分组
  expandedGroups.value = results.groups.slice(0, 2).map(g => g.id)
}

const toggleGroup = (groupId: string) => {
  const index = expandedGroups.value.indexOf(groupId)
  if (index > -1) {
    expandedGroups.value.splice(index, 1)
  } else {
    expandedGroups.value.push(groupId)
  }
}

const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    page: '页面',
    order: '订单',
    product: '产品',
    user: '用户',
    setting: '设置',
    task: '任务'
  }
  return labels[type] || type
}

// 生命周期
onMounted(() => {
  performGrouping()
  console.log('搜索分组演示页面已加载')
})
</script>