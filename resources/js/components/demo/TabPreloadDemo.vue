<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useTabNavigation } from '@/composables/useTabNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useI18n } from 'vue-i18n';
import { 
  Zap, 
  Target, 
  Brain, 
  Trash2, 
  Eye, 
  Clock,
  Activity,
  BarChart3
} from 'lucide-vue-next';

// 国际化
const { t } = useI18n();

// 使用标签页导航
const {
  tabs,
  activeTabId,
  preloadStrategy,
  eventLogger,
  getTabState
} = useTabNavigation();

// 预加载统计
const preloadStats = ref({
  adjacentPreloads: 0,
  frequentPreloads: 0,
  predictivePreloads: 0,
  totalCleanups: 0
});

// 性能监控
const performanceMetrics = ref({
  avgSwitchTime: 0,
  totalSwitches: 0,
  cacheHitRate: 0
});

// 当前预取链接数量
const currentPrefetchLinks = ref(0);

// 更新预取链接计数
const updatePrefetchCount = () => {
  currentPrefetchLinks.value = document.querySelectorAll('link[rel="prefetch"]').length;
};

// 执行预加载策略
const executePreloadStrategy = (strategy: 'adjacent' | 'frequent' | 'predictive') => {
  const startTime = performance.now();
  
  try {
    switch (strategy) {
      case 'adjacent':
        preloadStrategy.preloadAdjacentTabs();
        preloadStats.value.adjacentPreloads++;
        break;
      case 'frequent':
        preloadStrategy.preloadFrequentTabs();
        preloadStats.value.frequentPreloads++;
        break;
      case 'predictive':
        preloadStrategy.predictivePreload();
        preloadStats.value.predictivePreloads++;
        break;
    }
    
    const endTime = performance.now();
    console.log(`${strategy} preload executed in ${endTime - startTime}ms`);
    
    updatePrefetchCount();
  } catch (error) {
    console.error(`Failed to execute ${strategy} preload:`, error);
  }
};

// 清理预取链接
const cleanupPrefetchLinks = () => {
  preloadStrategy.cleanupPrefetchLinks();
  preloadStats.value.totalCleanups++;
  updatePrefetchCount();
};

// 查看当前预取链接
const viewPrefetchLinks = () => {
  const links = Array.from(document.querySelectorAll('link[rel="prefetch"]'));
  console.log('Current prefetch links:', links.map(link => ({
    href: link.getAttribute('href'),
    element: link
  })));
  
  // 在页面上显示
  const linksList = links.map(link => link.getAttribute('href')).join('\n');
  alert(`当前预取链接 (${links.length}个):\n\n${linksList || '无'}`);
};

// 获取性能指标
const getPerformanceMetrics = () => {
  const tabState = getTabState();
  
  // 模拟计算性能指标
  performanceMetrics.value = {
    avgSwitchTime: Math.round(Math.random() * 50 + 20), // 模拟20-70ms
    totalSwitches: tabState.tabs * 2, // 模拟切换次数
    cacheHitRate: Math.round(Math.random() * 40 + 60) // 模拟60-100%
  };
};

// 组件挂载时初始化
onMounted(() => {
  updatePrefetchCount();
  getPerformanceMetrics();
  
  // 定时更新预取链接计数
  const interval = setInterval(updatePrefetchCount, 1000);
  
  // 组件卸载时清理
  return () => {
    clearInterval(interval);
  };
});
</script>

<template>
  <div class="container mx-auto p-6 space-y-6">
    <div class="flex items-center gap-3 mb-6">
      <Zap class="h-8 w-8 text-primary" />
      <div>
        <h1 class="text-3xl font-bold">标签页预加载策略演示</h1>
        <p class="text-muted-foreground">
          测试和监控Tab内容预加载功能的性能和效果
        </p>
      </div>
    </div>

    <!-- 控制面板 -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Target class="h-5 w-5" />
          预加载策略控制
        </CardTitle>
        <CardDescription>
          执行不同的预加载策略并观察效果
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- 相邻标签页预加载 -->
          <div class="space-y-2">
            <Button 
              @click="executePreloadStrategy('adjacent')"
              class="w-full"
              variant="outline"
            >
              <Target class="h-4 w-4 mr-2" />
              相邻标签页预加载
            </Button>
            <p class="text-xs text-muted-foreground">
              预加载当前标签页前后的相邻标签页
            </p>
          </div>

          <!-- 高频访问标签页预加载 -->
          <div class="space-y-2">
            <Button 
              @click="executePreloadStrategy('frequent')"
              class="w-full"
              variant="outline"
            >
              <Activity class="h-4 w-4 mr-2" />
              高频标签页预加载
            </Button>
            <p class="text-xs text-muted-foreground">
              基于访问频率预加载热门标签页
            </p>
          </div>

          <!-- 智能预测预加载 -->
          <div class="space-y-2">
            <Button 
              @click="executePreloadStrategy('predictive')"
              class="w-full"
              variant="outline"
            >
              <Brain class="h-4 w-4 mr-2" />
              智能预测预加载
            </Button>
            <p class="text-xs text-muted-foreground">
              基于用户行为模式智能预测下一个访问的标签页
            </p>
          </div>
        </div>

        <div class="flex gap-2 pt-4 border-t">
          <Button 
            @click="viewPrefetchLinks"
            variant="secondary"
            size="sm"
          >
            <Eye class="h-4 w-4 mr-2" />
            查看预取链接
          </Button>
          <Button 
            @click="cleanupPrefetchLinks"
            variant="destructive"
            size="sm"
          >
            <Trash2 class="h-4 w-4 mr-2" />
            清理预取链接
          </Button>
          <Button 
            @click="getPerformanceMetrics"
            variant="outline"
            size="sm"
          >
            <BarChart3 class="h-4 w-4 mr-2" />
            刷新指标
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- 统计面板 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- 预加载统计 -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Activity class="h-5 w-5" />
            预加载统计
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {{ preloadStats.adjacentPreloads }}
              </div>
              <div class="text-sm text-muted-foreground">相邻预加载</div>
            </div>
            <div class="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div class="text-2xl font-bold text-green-600 dark:text-green-400">
                {{ preloadStats.frequentPreloads }}
              </div>
              <div class="text-sm text-muted-foreground">高频预加载</div>
            </div>
            <div class="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
              <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {{ preloadStats.predictivePreloads }}
              </div>
              <div class="text-sm text-muted-foreground">预测预加载</div>
            </div>
            <div class="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <div class="text-2xl font-bold text-red-600 dark:text-red-400">
                {{ preloadStats.totalCleanups }}
              </div>
              <div class="text-sm text-muted-foreground">清理次数</div>
            </div>
          </div>

          <div class="pt-4 border-t">
            <div class="flex items-center justify-between">
              <span class="text-sm text-muted-foreground">当前预取链接</span>
              <Badge 
                :variant="currentPrefetchLinks > 0 ? 'default' : 'secondary'"
                class="flex items-center gap-1"
              >
                <Clock class="h-3 w-3" />
                {{ currentPrefetchLinks }}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- 性能指标 -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <BarChart3 class="h-5 w-5" />
            性能指标
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm">平均切换时间</span>
              <Badge variant="outline">
                {{ performanceMetrics.avgSwitchTime }}ms
              </Badge>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm">总切换次数</span>
              <Badge variant="outline">
                {{ performanceMetrics.totalSwitches }}
              </Badge>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm">缓存命中率</span>
              <Badge 
                :variant="performanceMetrics.cacheHitRate > 80 ? 'default' : 'secondary'"
              >
                {{ performanceMetrics.cacheHitRate }}%
              </Badge>
            </div>
          </div>

          <div class="pt-4 border-t">
            <div class="text-xs text-muted-foreground space-y-1">
              <p>• 预加载可以显著提高标签页切换速度</p>
              <p>• 智能策略基于用户行为模式自动优化</p>
              <p>• 资源预取不会影响当前页面性能</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- 当前标签页状态 -->
    <Card>
      <CardHeader>
        <CardTitle>当前标签页状态</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <strong>活动标签页ID:</strong> {{ activeTabId }}
          </div>
          <div>
            <strong>总标签页数:</strong> {{ tabs.length }}
          </div>
          <div>
            <strong>当前路径:</strong> {{ $route?.path || window.location.pathname }}
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>