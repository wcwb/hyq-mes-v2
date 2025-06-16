<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use App\Http\Resources\SearchResultResource;

class SearchController extends Controller
{
    /**
     * 全局搜索API接口
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function globalSearch(Request $request): JsonResponse
    {
        // 验证请求参数
        $validator = Validator::make($request->all(), [
            'query' => 'required|string|min:1|max:100',
            'types' => 'sometimes|array',
            'types.*' => 'string|in:page,order,product,user,setting',
            'limit' => 'sometimes|integer|min:1|max:50',
            'include_suggestions' => 'sometimes|boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => '请求参数无效',
                'errors' => $validator->errors()
            ], 422);
        }

        $query = trim($request->input('query'));
        $types = $request->input('types', ['page', 'order', 'product', 'user', 'setting']);
        $limit = $request->input('limit', 20);
        $includeSuggestions = $request->input('include_suggestions', false);

        try {
            // 执行搜索
            $searchResults = $this->performSearch($query, $types, $limit);
            
            // 获取搜索建议（如果需要）
            $suggestions = $includeSuggestions ? $this->getSearchSuggestions($query) : [];

            return response()->json([
                'success' => true,
                'data' => [
                    'query' => $query,
                    'results' => $searchResults,
                    'total' => collect($searchResults)->sum(fn($group) => count($group['items'])),
                    'suggestions' => $suggestions,
                    'search_time' => microtime(true) - LARAVEL_START,
                    'timestamp' => now()->toISOString()
                ]
            ]);

        } catch (\Exception $e) {
            \Log::error('搜索请求失败', [
                'query' => $query,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => '搜索服务暂时不可用，请稍后重试',
                'error_code' => 'SEARCH_SERVICE_ERROR'
            ], 500);
        }
    }

    /**
     * 执行实际搜索逻辑
     * 
     * @param string $query
     * @param array $types
     * @param int $limit
     * @return array
     */
    protected function performSearch(string $query, array $types, int $limit): array
    {
        $results = [];
        $perTypeLimit = max(1, intval($limit / count($types)));

        foreach ($types as $type) {
            $items = $this->searchByType($query, $type, $perTypeLimit);
            
            if (!empty($items)) {
                $results[] = [
                    'type' => $type,
                    'type_label' => $this->getTypeLabel($type),
                    'items' => SearchResultResource::collection($items)->resolve(),
                    'count' => count($items)
                ];
            }
        }

        // 按类型优先级排序
        $typePriority = ['page' => 0, 'order' => 1, 'product' => 2, 'user' => 3, 'setting' => 4];
        usort($results, function($a, $b) use ($typePriority) {
            $priorityA = $typePriority[$a['type']] ?? 999;
            $priorityB = $typePriority[$b['type']] ?? 999;
            return $priorityA - $priorityB;
        });

        return $results;
    }

    /**
     * 按类型搜索
     * 
     * @param string $query
     * @param string $type
     * @param int $limit
     * @return array
     */
    protected function searchByType(string $query, string $type, int $limit): array
    {
        switch ($type) {
            case 'page':
                return $this->searchPages($query, $limit);
            case 'order':
                return $this->searchOrders($query, $limit);
            case 'product':
                return $this->searchProducts($query, $limit);
            case 'user':
                return $this->searchUsers($query, $limit);
            case 'setting':
                return $this->searchSettings($query, $limit);
            default:
                return [];
        }
    }

    /**
     * 搜索页面
     */
    protected function searchPages(string $query, int $limit): array
    {
        $pages = [
            [
                'id' => 'page-dashboard',
                'type' => 'page',
                'title' => '仪表板',
                'description' => '查看系统概览和关键指标',
                'url' => route('dashboard'),
                'icon' => '📊',
                'category' => '导航',
                'keywords' => ['dashboard', 'overview', '概览', '仪表板']
            ],
            [
                'id' => 'page-orders',
                'type' => 'page',
                'title' => '订单管理',
                'description' => '管理和查看所有订单信息',
                'url' => '/orders',
                'icon' => '📋',
                'category' => '业务',
                'keywords' => ['order', 'orders', '订单', '管理']
            ],
            [
                'id' => 'page-products',
                'type' => 'page',
                'title' => '产品管理',
                'description' => '管理产品信息和库存',
                'url' => '/products',
                'icon' => '📦',
                'category' => '业务',
                'keywords' => ['product', 'products', '产品', '库存']
            ],
            [
                'id' => 'page-customers',
                'type' => 'page',
                'title' => '客户管理',
                'description' => '管理客户信息和关系',
                'url' => '/customers',
                'icon' => '👥',
                'category' => '业务',
                'keywords' => ['customer', 'customers', '客户', '用户']
            ],
            [
                'id' => 'page-reports',
                'type' => 'page',
                'title' => '报表中心',
                'description' => '查看各类业务报表和分析',
                'url' => '/reports',
                'icon' => '📈',
                'category' => '分析',
                'keywords' => ['report', 'reports', '报表', '分析', '统计']
            ],
            [
                'id' => 'page-settings',
                'type' => 'page',
                'title' => '系统设置',
                'description' => '配置系统参数和选项',
                'url' => route('settings.profile'),
                'icon' => '⚙️',
                'category' => '系统',
                'keywords' => ['setting', 'settings', '设置', '配置']
            ]
        ];

        return $this->filterResults($pages, $query, $limit);
    }

    /**
     * 搜索订单（模拟数据）
     */
    protected function searchOrders(string $query, int $limit): array
    {
        $orders = [
            [
                'id' => 'order-12345',
                'type' => 'order',
                'title' => '订单 #12345',
                'description' => '客户张三的采购订单，金额￥1,250.00',
                'url' => '/orders/12345',
                'icon' => '📋',
                'category' => '待处理',
                'keywords' => ['12345', '张三', '采购', 'order']
            ],
            [
                'id' => 'order-12346',
                'type' => 'order',
                'title' => '订单 #12346',
                'description' => '客户李四的服务订单，金额￥850.00',
                'url' => '/orders/12346',
                'icon' => '📋',
                'category' => '已完成',
                'keywords' => ['12346', '李四', '服务', 'order']
            ],
            [
                'id' => 'order-12347',
                'type' => 'order',
                'title' => '订单 #12347',
                'description' => '客户王五的维修订单，金额￥320.00',
                'url' => '/orders/12347',
                'icon' => '📋',
                'category' => '进行中',
                'keywords' => ['12347', '王五', '维修', 'order']
            ]
        ];

        return $this->filterResults($orders, $query, $limit);
    }

    /**
     * 搜索产品（模拟数据）
     */
    protected function searchProducts(string $query, int $limit): array
    {
        $products = [
            [
                'id' => 'product-widget-a',
                'type' => 'product',
                'title' => 'Widget A',
                'description' => '高质量的标准组件，适用于多种场景',
                'url' => '/products/widget-a',
                'icon' => '📦',
                'category' => '标准件',
                'keywords' => ['widget', 'component', '组件', '标准']
            ],
            [
                'id' => 'product-component-b',
                'type' => 'product',
                'title' => 'Component B',
                'description' => '定制化组件，满足特殊需求',
                'url' => '/products/component-b',
                'icon' => '📦',
                'category' => '定制件',
                'keywords' => ['component', '组件', '定制', 'custom']
            ],
            [
                'id' => 'product-tool-c',
                'type' => 'product',
                'title' => 'Tool C',
                'description' => '专业工具，提高工作效率',
                'url' => '/products/tool-c',
                'icon' => '🔧',
                'category' => '工具',
                'keywords' => ['tool', '工具', 'efficiency', '效率']
            ]
        ];

        return $this->filterResults($products, $query, $limit);
    }

    /**
     * 搜索用户（模拟数据）
     */
    protected function searchUsers(string $query, int $limit): array
    {
        $users = [
            [
                'id' => 'user-zhang-san',
                'type' => 'user',
                'title' => '张三',
                'description' => '生产主管 - 负责生产计划和执行',
                'url' => '/users/zhang-san',
                'icon' => '👤',
                'category' => '员工',
                'keywords' => ['张三', '生产', '主管', 'production']
            ],
            [
                'id' => 'user-li-si',
                'type' => 'user',
                'title' => '李四',
                'description' => '质量工程师 - 负责质量控制和改进',
                'url' => '/users/li-si',
                'icon' => '👤',
                'category' => '员工',
                'keywords' => ['李四', '质量', '工程师', 'quality']
            ],
            [
                'id' => 'user-wang-wu',
                'type' => 'user',
                'title' => '王五',
                'description' => '设备维护员 - 负责设备保养和维修',
                'url' => '/users/wang-wu',
                'icon' => '👤',
                'category' => '员工',
                'keywords' => ['王五', '设备', '维护', 'maintenance']
            ]
        ];

        return $this->filterResults($users, $query, $limit);
    }

    /**
     * 搜索设置（模拟数据）
     */
    protected function searchSettings(string $query, int $limit): array
    {
        $settings = [
            [
                'id' => 'setting-appearance',
                'type' => 'setting',
                'title' => '外观设置',
                'description' => '配置主题、语言和显示选项',
                'url' => route('settings.appearance'),
                'icon' => '🎨',
                'category' => '界面',
                'keywords' => ['appearance', '外观', '主题', 'theme', '语言']
            ],
            [
                'id' => 'setting-profile',
                'type' => 'setting',
                'title' => '个人资料',
                'description' => '管理个人信息和账户设置',
                'url' => route('settings.profile'),
                'icon' => '👤',
                'category' => '账户',
                'keywords' => ['profile', '个人', '资料', 'account']
            ],
            [
                'id' => 'setting-password',
                'type' => 'setting',
                'title' => '密码安全',
                'description' => '更改密码和安全设置',
                'url' => route('settings.password'),
                'icon' => '🔒',
                'category' => '安全',
                'keywords' => ['password', '密码', '安全', 'security']
            ]
        ];

        return $this->filterResults($settings, $query, $limit);
    }

    /**
     * 过滤搜索结果
     */
    protected function filterResults(array $items, string $query, int $limit): array
    {
        $query = strtolower($query);
        $filtered = [];

        foreach ($items as $item) {
            $score = 0;
            
            // 标题匹配 (权重最高)
            if (stripos($item['title'], $query) !== false) {
                $score += 100;
            }
            
            // 描述匹配
            if (stripos($item['description'], $query) !== false) {
                $score += 50;
            }
            
            // 关键词匹配
            if (isset($item['keywords'])) {
                foreach ($item['keywords'] as $keyword) {
                    if (stripos($keyword, $query) !== false) {
                        $score += 30;
                        break;
                    }
                }
            }
            
            // 分类匹配
            if (isset($item['category']) && stripos($item['category'], $query) !== false) {
                $score += 20;
            }
            
            if ($score > 0) {
                $item['score'] = $score;
                $filtered[] = $item;
            }
        }
        
        // 按得分排序
        usort($filtered, fn($a, $b) => $b['score'] - $a['score']);
        
        // 移除score字段并限制数量
        return array_slice(array_map(function($item) {
            unset($item['score'], $item['keywords']);
            return $item;
        }, $filtered), 0, $limit);
    }

    /**
     * 获取搜索建议
     */
    protected function getSearchSuggestions(string $query): array
    {
        // 模拟搜索建议
        $suggestions = [
            '仪表板', '订单管理', '产品管理', '客户管理', '报表中心', '系统设置',
            'dashboard', 'orders', 'products', 'customers', 'reports', 'settings'
        ];

        $query = strtolower($query);
        $matched = array_filter($suggestions, fn($s) => stripos($s, $query) !== false);
        
        return array_slice(array_values($matched), 0, 5);
    }

    /**
     * 获取类型标签
     */
    protected function getTypeLabel(string $type): string
    {
        $labels = [
            'page' => '页面',
            'order' => '订单',
            'product' => '产品',
            'user' => '用户',
            'setting' => '设置'
        ];

        return $labels[$type] ?? $type;
    }
}