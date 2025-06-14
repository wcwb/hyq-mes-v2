<template>
    <!-- Live Region - 用于屏幕阅读器公告 -->
    <div :aria-live="priority" :aria-atomic="atomic" :aria-relevant="relevant" class="sr-only" role="log">
        {{ message }}
    </div>
</template>

<script setup lang="ts">
interface Props {
    /** 公告消息 */
    message?: string
    /** 公告优先级 - polite: 等待用户空闲时播报, assertive: 立即打断播报 */
    priority?: 'polite' | 'assertive'
    /** 是否读取整个区域内容而不是只读变更部分 */
    atomic?: boolean
    /** 监听哪些变更类型 */
    relevant?: 'additions' | 'removals' | 'text' | 'all'
}

const props = withDefaults(defineProps<Props>(), {
    message: '',
    priority: 'polite',
    atomic: true,
    relevant: 'all'
})
</script>