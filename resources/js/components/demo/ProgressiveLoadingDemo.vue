<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useTabNavigation } from '@/composables/useTabNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useI18n } from 'vue-i18n';
import { 
  Zap, 
  Activity, 
  Wifi, 
  WifiOff,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  TrendingUp,
  Gauge
} from 'lucide-vue-next';

// 国际化
const { t } = useI18n();

// 使用标签页导航
const {
  tabs,
  activeTabId,
  progressiveLoading
} = useTabNavigation();

// 演示用的Tab元素引用
const tabElements = ref<Record<string, HTMLElement>>({});

// 模拟加载一个Tab
const simulateTabLoad = (tabId: string) => {
  const element = tabElements.value[tabId];
  if (element) {
    progressiveLoading.registerTab(tabId, element, false, true);
  }
};

// 强制加载Tab
const forceLoadTab = (tabId: string) => {
  progressiveLoading.forceLoadTab(tabId);
};

// 网络状态显示
const networkStatus = computed(() => {
  const network = progressiveLoading.networkInfo;
  if (!network.effectiveType) return { text: '未知', color: 'gray', icon: WifiOff };
  
  const statusMap = {
    'slow-2g': { text: '慢速2G', color: 'red', icon: WifiOff },
    '2g': { text: '2G', color: 'orange', icon: Wifi },
    '3g': { text: '3G', color: 'yellow', icon: Wifi },
    '4g': { text: '4G', color: 'green', icon: Wifi },
  };
  
  return statusMap[network.effectiveType] || { text: '未知', color: 'gray', icon: WifiOff };
});

// 格式化加载时间
const formatLoadTime = (time: number) => {
  return time < 1000 ? `${Math.round(time)}ms` : `${(time / 1000).toFixed(1)}s`;
};

// 计算整体加载进度
const overallProgress = computed(() => {
  const stats = progressiveLoading.loadingStats;
  if (stats.total === 0) return 0;
  return Math.round((stats.loaded / stats.total) * 100);
});

// 优先级颜色映射
const getPriorityColor = (priority: string) => {
  const colorMap = {
    immediate: 'bg-red-500',
    high: 'bg-orange-500',
    normal: 'bg-blue-500',
    low: 'bg-gray-500',
    idle: 'bg-gray-300',
  };
  return colorMap[priority] || 'bg-gray-400';
};

// 优先级文本映射
const getPriorityText = (priority: string) => {
  const textMap = {
    immediate: '立即',
    high: '高',
    normal: '普通',
    low: '低',
    idle: '空闲',
  };
  return textMap[priority] || '未知';
};

// 组件挂载时注册Tab元素
onMounted(() => {
  // 为每个Tab创建虚拟元素用于演示
  tabs.value.forEach(tab => {
    const element = document.createElement('div');
    element.style.height = '100px';
    element.style.width = '200px';
    tabElements.value[tab.id] = element;
    
    // 注册到渐进式加载器
    progressiveLoading.registerTab(tab.id, element, tab.isActive);
  });
});
</script>

<template>
  <div class="container mx-auto p-6 space-y-6">
    <div class="flex items-center gap-3 mb-6">
      <Zap class="h-8 w-8 text-primary" />
      <div>
        <h1 class="text-3xl font-bold">渐进式Tab加载演示</h1>
        <p class="text-muted-foreground">
          基于网络状态和用户行为的智能Tab加载策略
        </p>
      </div>
    </div>

    <!-- 网络状态和总体进度 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- 网络状态 -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <component :is="networkStatus.icon" class="h-5 w-5" />
            网络状态
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-sm">连接类型</span>
            <Badge :class="`bg-${networkStatus.color}-100 text-${networkStatus.color}-800`">
              {{ networkStatus.text }}
            </Badge>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm">下载速度</span>
            <Badge variant="outline">
              {{ progressiveLoading.networkInfo.downlink || 0 }} Mbps
            </Badge>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm">网络延迟</span>
            <Badge variant="outline">
              {{ progressiveLoading.networkInfo.rtt || 0 }}ms
            </Badge>
          </div>
        </CardContent>
      </Card>

      <!-- 总体进度 -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <TrendingUp class="h-5 w-5" />
            加载进度
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span>整体进度</span>
              <span>{{ overallProgress }}%</span>
            </div>
            <Progress :value="overallProgress" class="h-2" />
          </div>
          
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div class="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded">
              <div class="text-lg font-bold text-green-600">
                {{ progressiveLoading.loadingStats.loaded }}
              </div>
              <div class="text-muted-foreground">已加载</div>
            </div>
            <div class="text-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
              <div class="text-lg font-bold text-blue-600">
                {{ progressiveLoading.loadingStats.loading }}
              </div>
              <div class="text-muted-foreground">加载中</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- 性能指标 -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Gauge class="h-5 w-5" />
          性能指标
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
            <div class="text-xl font-bold text-purple-600">
              {{ formatLoadTime(progressiveLoading.loadingStats.performance.averageLoadTime) }}
            </div>
            <div class="text-sm text-muted-foreground">平均加载时间</div>
          </div>
          <div class="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <div class="text-xl font-bold text-green-600">
              {{ formatLoadTime(progressiveLoading.loadingStats.performance.fastestLoad === Infinity ? 0 : progressiveLoading.loadingStats.performance.fastestLoad) }}
            </div>
            <div class="text-sm text-muted-foreground">最快加载</div>
          </div>
          <div class="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
            <div class="text-xl font-bold text-orange-600">
              {{ formatLoadTime(progressiveLoading.loadingStats.performance.slowestLoad) }}
            </div>
            <div class="text-sm text-muted-foreground">最慢加载</div>
          </div>
          <div class="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <div class="text-xl font-bold text-blue-600">
              {{ progressiveLoading.loadingStats.queueLength }}
            </div>
            <div class="text-sm text-muted-foreground">队列长度</div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Tab状态详情 -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Activity class="h-5 w-5" />
          Tab加载状态
        </CardTitle>
        <CardDescription>
          各个标签页的详细加载状态和优先级信息
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="space-y-3">
          <template v-for="tabState in progressiveLoading.allTabStates" :key="tabState.id">
            <div class="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <!-- Tab信息 -->
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-2">
                  <!-- 状态图标 -->
                  <CheckCircle 
                    v-if="tabState.isLoaded" 
                    class="h-4 w-4 text-green-500" 
                  />
                  <Loader2 
                    v-else-if="tabState.isLoading" 
                    class="h-4 w-4 text-blue-500 animate-spin" 
                  />
                  <AlertCircle 
                    v-else-if="tabState.error" 
                    class="h-4 w-4 text-red-500" 
                  />
                  <Clock 
                    v-else 
                    class="h-4 w-4 text-gray-500" 
                  />
                </div>
                
                <div>
                  <div class="font-medium">
                    {{ tabs.find(tab => tab.id === tabState.id)?.title || '未知Tab' }}
                  </div>
                  <div class="text-xs text-muted-foreground">
                    ID: {{ tabState.id.slice(0, 8) }}...
                  </div>
                </div>
              </div>

              <!-- 优先级和操作 -->
              <div class="flex items-center gap-2">
                <Badge 
                  :class="getPriorityColor(tabState.priority)"
                  class="text-white text-xs"
                >
                  {{ getPriorityText(tabState.priority) }}
                </Badge>
                
                <Badge 
                  v-if="tabState.isVisible" 
                  variant="outline"
                  class="text-xs"
                >
                  可见
                </Badge>
                
                <Button
                  v-if="!tabState.isLoaded && !tabState.isLoading"
                  @click="forceLoadTab(tabState.id)"
                  size="sm"
                  variant="outline"
                  class="text-xs"
                >
                  强制加载
                </Button>
                
                <div v-if="tabState.loadEndTime && tabState.loadStartTime" class="text-xs text-muted-foreground">
                  {{ formatLoadTime(tabState.loadEndTime - tabState.loadStartTime) }}
                </div>
              </div>
            </div>
          </template>
          
          <div v-if="progressiveLoading.allTabStates.length === 0" class="text-center py-8 text-muted-foreground">
            <Activity class="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>暂无Tab加载状态数据</p>
            <p class="text-xs">尝试切换标签页或添加新标签页以查看加载状态</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- 配置信息 -->
    <Card>
      <CardHeader>
        <CardTitle>渐进式加载配置</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div class="space-y-2">
            <div class="flex justify-between">
              <span>启用状态:</span>
              <Badge :variant="progressiveLoading.config.enabled ? 'default' : 'secondary'">
                {{ progressiveLoading.config.enabled ? '启用' : '禁用' }}
              </Badge>
            </div>
            <div class="flex justify-between">
              <span>视口边距:</span>
              <span>{{ progressiveLoading.config.rootMargin }}</span>
            </div>
            <div class="flex justify-between">
              <span>交叉阈值:</span>
              <span>{{ progressiveLoading.config.threshold }}</span>
            </div>
          </div>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span>空闲阈值:</span>
              <span>{{ progressiveLoading.config.idleThreshold }}ms</span>
            </div>
            <div class="flex justify-between">
              <span>预加载数量:</span>
              <span>{{ progressiveLoading.config.preloadCount }}</span>
            </div>
            <div class="flex justify-between">
              <span>网络自适应:</span>
              <Badge :variant="progressiveLoading.config.adaptiveNetworkStrategy ? 'default' : 'secondary'">
                {{ progressiveLoading.config.adaptiveNetworkStrategy ? '启用' : '禁用' }}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>