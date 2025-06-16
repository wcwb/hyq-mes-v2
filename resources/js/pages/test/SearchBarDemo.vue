<template>
    <AppLayout>
        <div class="max-w-4xl mx-auto p-6 space-y-8">
            <div class="text-center">
                <h1 class="text-3xl font-bold text-foreground mb-2">SearchBar 组件演示</h1>
                <p class="text-muted-foreground">测试SearchBar组件的各种配置和响应式行为</p>
            </div>

            <!-- 基本SearchBar -->
            <div class="space-y-4">
                <h2 class="text-xl font-semibold">基本SearchBar</h2>
                <div class="flex justify-center">
                    <SearchBar 
                        @search:open="handleSearchOpen"
                        @search:close="handleSearchClose"
                        @search:query="handleSearchQuery"
                        @search:select="handleSearchSelect"
                    />
                </div>
            </div>

            <!-- 不同尺寸 -->
            <div class="space-y-4">
                <h2 class="text-xl font-semibold">不同尺寸和配置</h2>
                <div class="grid gap-4 md:grid-cols-2">
                    <div class="space-y-2">
                        <h3 class="font-medium">紧凑模式</h3>
                        <SearchBar 
                            :compact="true"
                            max-width="sm"
                            @search:open="handleSearchOpen"
                            @search:select="handleSearchSelect"
                        />
                    </div>
                    <div class="space-y-2">
                        <h3 class="font-medium">无快捷键提示</h3>
                        <SearchBar 
                            :show-shortcut="false"
                            max-width="lg"
                            @search:open="handleSearchOpen"
                            @search:select="handleSearchSelect"
                        />
                    </div>
                </div>
            </div>

            <!-- 自定义样式 -->
            <div class="space-y-4">
                <h2 class="text-xl font-semibold">自定义样式</h2>
                <div class="flex justify-center">
                    <SearchBar 
                        class="border-2 border-primary"
                        placeholder="自定义占位符文本..."
                        max-width="xl"
                        @search:open="handleSearchOpen"
                        @search:select="handleSearchSelect"
                    />
                </div>
            </div>

            <!-- 事件日志 -->
            <div class="space-y-4">
                <h2 class="text-xl font-semibold">事件日志</h2>
                <div class="bg-muted rounded-lg p-4 h-40 overflow-y-auto">
                    <div v-if="events.length === 0" class="text-muted-foreground text-center py-8">
                        点击SearchBar触发事件...
                    </div>
                    <div v-for="(event, index) in events" :key="index" class="text-sm font-mono">
                        <span class="text-muted-foreground">{{ event.time }}</span>
                        <span class="ml-2 font-semibold" :class="getEventColor(event.type)">
                            {{ event.type }}
                        </span>
                        <span v-if="event.data" class="ml-2 text-muted-foreground">
                            {{ JSON.stringify(event.data) }}
                        </span>
                    </div>
                </div>
                <Button variant="outline" size="sm" @click="clearEvents">
                    清空日志
                </Button>
            </div>
        </div>
    </AppLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import SearchBar from '@/components/SearchBar.vue'
import { Button } from '@/components/ui/button'

// 页面元数据
defineOptions({
    layout: AppLayout
})

// 事件日志
interface EventLog {
    time: string
    type: string
    data?: any
}

const events = ref<EventLog[]>([])

// 事件处理器
const addEvent = (type: string, data?: any) => {
    events.value.unshift({
        time: new Date().toLocaleTimeString(),
        type,
        data
    })
    
    // 限制日志数量
    if (events.value.length > 50) {
        events.value = events.value.slice(0, 50)
    }
}

const handleSearchOpen = () => {
    addEvent('search:open')
}

const handleSearchClose = () => {
    addEvent('search:close')
}

const handleSearchQuery = (query: string) => {
    addEvent('search:query', { query })
}

const handleSearchSelect = (result: any) => {
    addEvent('search:select', { result })
}

// 清空事件日志
const clearEvents = () => {
    events.value = []
}

// 获取事件颜色
const getEventColor = (type: string) => {
    switch (type) {
        case 'search:open':
            return 'text-green-600'
        case 'search:close':
            return 'text-red-600'
        case 'search:query':
            return 'text-blue-600'
        case 'search:select':
            return 'text-purple-600'
        default:
            return 'text-foreground'
    }
}
</script>