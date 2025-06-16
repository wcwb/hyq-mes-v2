import { ref, computed, readonly } from 'vue'
import type { SearchResult } from '@/types'

/**
 * 搜索数据管理组合式函数
 * 提供模拟搜索数据和搜索功能
 */
export function useSearchData() {
    // 搜索状态
    const isLoading = ref(false)
    const searchQuery = ref('')
    
    // 模拟搜索数据
    const mockSearchData: SearchResult[] = [
        // 页面类型
        {
            id: 'page-dashboard',
            type: 'page',
            title: '仪表板',
            description: '查看系统概览和关键指标',
            url: '/dashboard',
            category: '导航'
        },
        {
            id: 'page-orders',
            type: 'page', 
            title: '订单管理',
            description: '管理和查看所有订单信息',
            url: '/orders',
            category: '业务'
        },
        {
            id: 'page-products',
            type: 'page',
            title: '产品管理',
            description: '管理产品信息和库存',
            url: '/products',
            category: '业务'
        },
        {
            id: 'page-customers',
            type: 'page',
            title: '客户管理',
            description: '管理客户信息和关系',
            url: '/customers',
            category: '业务'
        },
        {
            id: 'page-reports',
            type: 'page',
            title: '报表中心',
            description: '查看各类业务报表和分析',
            url: '/reports',
            category: '分析'
        },
        {
            id: 'page-settings',
            type: 'page',
            title: '系统设置',
            description: '配置系统参数和选项',
            url: '/settings',
            category: '系统'
        },
        
        // 订单类型
        {
            id: 'order-12345',
            type: 'order',
            title: '订单 #12345',
            description: '客户张三的采购订单，金额￥1,250.00',
            url: '/orders/12345',
            category: '待处理'
        },
        {
            id: 'order-12346',
            type: 'order', 
            title: '订单 #12346',
            description: '客户李四的服务订单，金额￥850.00',
            url: '/orders/12346',
            category: '已完成'
        },
        {
            id: 'order-12347',
            type: 'order',
            title: '订单 #12347',
            description: '客户王五的维修订单，金额￥320.00',
            url: '/orders/12347',
            category: '进行中'
        },
        
        // 产品类型
        {
            id: 'product-widget-a',
            type: 'product',
            title: 'Widget A',
            description: '高质量的标准组件，适用于多种场景',
            url: '/products/widget-a',
            category: '标准件'
        },
        {
            id: 'product-component-b',
            type: 'product',
            title: 'Component B',
            description: '定制化组件，满足特殊需求',
            url: '/products/component-b',
            category: '定制件'
        },
        {
            id: 'product-tool-c',
            type: 'product',
            title: 'Tool C',
            description: '专业工具，提高工作效率',
            url: '/products/tool-c',
            category: '工具'
        },
        
        // 用户类型
        {
            id: 'user-zhang-san',
            type: 'user',
            title: '张三',
            description: '生产主管 - 负责生产计划和执行',
            url: '/users/zhang-san',
            category: '员工'
        },
        {
            id: 'user-li-si',
            type: 'user',
            title: '李四',
            description: '质量工程师 - 负责质量控制和改进',
            url: '/users/li-si',
            category: '员工'
        },
        {
            id: 'user-wang-wu',
            type: 'user',
            title: '王五',
            description: '设备维护员 - 负责设备保养和维修',
            url: '/users/wang-wu',
            category: '员工'
        },
        
        // 设置类型
        {
            id: 'setting-appearance',
            type: 'setting',
            title: '外观设置',
            description: '配置主题、语言和显示选项',
            url: '/settings/appearance',
            category: '界面'
        },
        {
            id: 'setting-notifications',
            type: 'setting',
            title: '通知设置',
            description: '管理系统通知和提醒',
            url: '/settings/notifications',
            category: '系统'
        },
        {
            id: 'setting-security',
            type: 'setting',
            title: '安全设置',
            description: '配置密码策略和安全选项',
            url: '/settings/security',
            category: '安全'
        },
        {
            id: 'setting-integrations',
            type: 'setting',
            title: '集成设置',
            description: '管理第三方系统集成',
            url: '/settings/integrations',
            category: '集成'
        }
    ]
    
    // 推荐搜索项（最常用的功能）
    const suggestions: SearchResult[] = [
        {
            id: 'suggestion-dashboard',
            type: 'page',
            title: '仪表板',
            description: '快速查看系统概览',
            url: '/dashboard'
        },
        {
            id: 'suggestion-new-order',
            type: 'page',
            title: '新建订单',
            description: '创建新的客户订单',
            url: '/orders/new'
        },
        {
            id: 'suggestion-inventory',
            type: 'page',
            title: '库存查询',
            description: '查看当前库存状态',
            url: '/inventory'
        },
        {
            id: 'suggestion-reports',
            type: 'page',
            title: '销售报表',
            description: '查看销售数据分析',
            url: '/reports/sales'
        }
    ]
    
    // 过滤搜索结果
    const filteredResults = computed(() => {
        if (!searchQuery.value.trim()) {
            return []
        }
        
        const query = searchQuery.value.toLowerCase()
        return mockSearchData.filter(item => 
            item.title.toLowerCase().includes(query) ||
            item.description?.toLowerCase().includes(query) ||
            item.category?.toLowerCase().includes(query)
        )
    })
    
    // 模拟搜索API调用
    const performSearch = async (query: string) => {
        searchQuery.value = query
        
        if (!query.trim()) {
            return []
        }
        
        isLoading.value = true
        
        // 模拟API延迟
        await new Promise(resolve => setTimeout(resolve, 300))
        
        isLoading.value = false
        return filteredResults.value
    }
    
    // 获取搜索建议
    const getSearchSuggestions = () => {
        return suggestions
    }
    
    // 按分类分组结果
    const getGroupedResults = (results: SearchResult[]) => {
        const groups = new Map<string, SearchResult[]>()
        
        results.forEach(result => {
            if (!groups.has(result.type)) {
                groups.set(result.type, [])
            }
            groups.get(result.type)!.push(result)
        })
        
        // 转换为数组并排序
        return Array.from(groups.entries())
            .map(([type, items]) => ({ type, items }))
            .sort((a, b) => {
                // 优先级排序：page > order > product > user > setting
                const priority = { page: 0, order: 1, product: 2, user: 3, setting: 4 }
                return (priority[a.type as keyof typeof priority] || 5) - 
                       (priority[b.type as keyof typeof priority] || 5)
            })
    }
    
    // 清空搜索
    const clearSearch = () => {
        searchQuery.value = ''
        isLoading.value = false
    }
    
    return {
        // 状态
        isLoading: readonly(isLoading),
        searchQuery: readonly(searchQuery),
        
        // 数据
        filteredResults,
        suggestions,
        
        // 方法
        performSearch,
        getSearchSuggestions,
        getGroupedResults,
        clearSearch
    }
}

// 搜索结果高亮工具函数
export function highlightSearchTerm(text: string, searchTerm: string): string {
    if (!searchTerm.trim()) return text
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">$1</mark>')
}

// 防抖搜索钩子
export function useDebouncedSearch(delay: number = 300) {
    const { performSearch } = useSearchData()
    let timeoutId: NodeJS.Timeout | null = null
    
    const debouncedSearch = (query: string) => {
        return new Promise<SearchResult[]>((resolve) => {
            if (timeoutId) {
                clearTimeout(timeoutId)
            }
            
            timeoutId = setTimeout(async () => {
                const results = await performSearch(query)
                resolve(results)
            }, delay)
        })
    }
    
    return {
        debouncedSearch
    }
}