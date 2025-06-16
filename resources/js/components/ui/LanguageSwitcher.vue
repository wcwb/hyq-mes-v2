<template>
    <DropdownMenu>
        <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="sm" class="h-9 w-9 p-0"
                :aria-label="`${t('topMenuBar.language.toggle')} - ${t('topMenuBar.language.current')}: ${currentLocaleDisplay}`"
                data-testid="language-switcher-button">
                <Globe class="h-4 w-4" />
            </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" class="w-32">
            <DropdownMenuLabel>{{ t('topMenuBar.language.label') }}</DropdownMenuLabel>
            <DropdownMenuItem
                v-for="locale in supportedLocales"
                :key="locale"
                @click="handleLocaleChange(locale)"
                :class="locale === currentLocale ? 'bg-accent text-accent-foreground' : ''">
                <span class="flex-1">{{ getDisplayName(locale) }}</span>
                <Check v-if="locale === currentLocale" class="ml-2 h-4 w-4" />
            </DropdownMenuItem>
        </DropdownMenuContent>
        
        <!-- Live Region 用于屏幕阅读器公告 -->
        <LiveRegion :message="liveMessage" priority="polite" />
    </DropdownMenu>
</template>

<script setup lang="ts">
import { ref, computed, getCurrentInstance } from 'vue'
import type { SupportedLocale } from '@/i18n'
import { useI18n } from '@/composables/useI18n'
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuTrigger, 
    DropdownMenuItem,
    DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import LiveRegion from './LiveRegion.vue'
import { Globe, Check } from 'lucide-vue-next'

// 获取当前实例以访问全局属性
const instance = getCurrentInstance()
const globalProperties = instance?.appContext.config.globalProperties

// 组合式函数
const { t } = useI18n()

// 状态
const liveMessage = ref('')

// 计算属性
const currentLocale = computed(() => globalProperties?.$getCurrentLocale() || 'zh' as SupportedLocale)
const supportedLocales = computed(() => globalProperties?.$getSupportedLocales() || ['zh', 'en'] as SupportedLocale[])
const currentLocaleDisplay = computed(() => globalProperties?.$getLocaleDisplayName(currentLocale.value) || currentLocale.value)

// 获取语言显示名称
const getDisplayName = (locale: SupportedLocale) => {
    return globalProperties?.$getLocaleDisplayName(locale) || locale
}

// 处理语言切换
const handleLocaleChange = (locale: SupportedLocale) => {
    const newLocaleName = getDisplayName(locale)

    // 执行语言切换
    globalProperties?.$switchLocale(locale)

    // 准备屏幕阅读器公告消息
    liveMessage.value = t('topMenuBar.language.switched', { language: newLocaleName })

    // 清空公告消息（触发后立即清空，避免重复播报）
    setTimeout(() => {
        liveMessage.value = ''
    }, 100)
}
</script>