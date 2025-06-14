---
description: 
globs: 
alwaysApply: true
---
# Vue 3 前端开发规则。

---

## 1. 通用语言规则
1. 所有 AI 输出必须使用 **简体中文**，除非涉及代码、终端命令或官方英文专有名词（保持原文）。
2. **所有代码示例必须包含中文注释**，解释用途与关键逻辑，且遵循 ESLint / Prettier 规范。
3. **任务管理内容**：所有任务相关的标题、描述、详情和测试策略必须用简体中文，除非技术术语或代码需要保持原文。

## 2. 代码开发前置要求
1. **必须优先查阅官方文档**：在编写任何涉及第三方包或 Vue 3 核心功能的代码前，必须访问官方文档了解正确的 API 使用方式。
2. **验证 API 存在性**：使用第三方组件库时，确认方法和属性确实存在。
3. **遵循框架最佳实践**：使用 Vue 3 官方推荐的 Composition API 和 script setup 语法。
4. **检查版本兼容性**：确保使用的 API 与当前 Vue 版本兼容。
5. **优先使用组合模式**：优先使用 composables 而不是 mixins 来复用逻辑。

## 3. Vue 3 + Inertia.js + TypeScript 开发规范

### 3.1 组件开发规范
1. **组件写法**：统一使用 `<script setup lang="ts">`，启用 TypeScript 严格模式
2. **类型定义**：Props / Emits 必须完整类型化
   ```vue
   <script setup lang="ts">
   // 定义 Props 接口
   interface Props {
     title: string;
     isActive?: boolean;
     items?: Array<{ id: number; name: string }>;
   }
   
   // 定义 Emits 接口
   interface Emits {
     (e: 'update', value: string): void;
     (e: 'close'): void;
   }
   
   // 使用类型化的 Props 和 Emits
   const props = defineProps<Props>();
   const emit = defineEmits<Emits>();
   
   // 计算属性示例
   const displayTitle = computed(() => {
     return props.isActive ? `[激活] ${props.title}` : props.title;
   });
   </script>
   ```

3. **目录组织**：
   - 页面：`resources/js/pages/**` - Inertia.js 页面组件
   - 布局：`resources/js/layouts/**` - 页面布局组件
   - 共享逻辑：`resources/js/composables/**` - 可复用的组合式函数
   - UI 组件：`resources/js/components/ui/**` - 原子级 UI 组件
   - 业务组件：`resources/js/components/**` - 业务逻辑组件

4. **组件命名**：
   ```vue
   <!-- 使用 PascalCase 命名 -->
   <UserProfile :user="user" @update="handleUpdate" />
   
   <!-- 避免使用 kebab-case -->
   <user-profile :user="user" @update="handleUpdate" />
   ```

### 3.2 样式与 UI 组件

1. **样式系统**：统一使用 **Tailwind CSS** 工具类，禁止裸写 CSS
   ```vue
   <template>
     <!-- 正确：使用 Tailwind 工具类 -->
     <div class="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
       <h2 class="text-lg font-semibold text-gray-900">标题</h2>
       <button class="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">
         按钮
       </button>
     </div>
   </template>
   
   <style scoped>
   /* 避免：裸写 CSS */
   .custom-style {
     background-color: #f3f4f6;
     padding: 1rem;
   }
   </style>
   ```

2. **复杂样式**：使用 `@apply` 或 `class-variance-authority` 变体工具
   ```vue
   <script setup lang="ts">
   import { cva } from 'class-variance-authority';
   
   // 使用 CVA 定义按钮变体
   const buttonVariants = cva(
     'inline-flex items-center justify-center rounded-md font-medium transition-colors',
     {
       variants: {
         variant: {
           default: 'bg-primary text-primary-foreground hover:bg-primary/90',
           destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
           outline: 'border border-input bg-background hover:bg-accent',
         },
         size: {
           default: 'h-10 px-4 py-2',
           sm: 'h-9 px-3',
           lg: 'h-11 px-8',
         },
       },
       defaultVariants: {
         variant: 'default',
         size: 'default',
       },
     }
   );
   </script>
   ```

3. **UI 组件库**：基于 `reka-ui`（类 shadcn 套件）进行扩展
   ```vue
   <script setup lang="ts">
   import { Button } from '@/components/ui/button';
   import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
   import { Input } from '@/components/ui/input';
   </script>
   
   <template>
     <Dialog>
       <DialogContent>
         <DialogHeader>
           <DialogTitle>对话框标题</DialogTitle>
         </DialogHeader>
         <div class="space-y-4">
           <Input placeholder="请输入内容" />
           <Button @click="handleSubmit">确认</Button>
         </div>
       </DialogContent>
     </Dialog>
   </template>
   ```

4. **响应式设计**：移动优先，使用 Tailwind 断点系统
   ```vue
   <template>
     <!-- 响应式布局示例 -->
     <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
       <div class="p-4 bg-white rounded-lg shadow">
         <!-- 卡片内容 -->
       </div>
     </div>
   </template>
   ```

### 3.3 状态管理与数据流

1. **全局状态**：封装到 Vue composable 中，避免跨层级 prop drilling
   ```typescript
   // composables/useAuth.ts
   export function useAuth() {
     const user = ref<User | null>(null);
     const isAuthenticated = computed(() => !!user.value);
     
     const login = async (credentials: LoginCredentials) => {
       // 登录逻辑
       const response = await router.post('/login', credentials);
       user.value = response.user;
     };
     
     const logout = () => {
       router.post('/logout');
       user.value = null;
     };
     
     return {
       user: readonly(user),
       isAuthenticated,
       login,
       logout,
     };
   }
   ```

2. **响应式优化**：避免深层次 `watch`，优先使用 `computed`
   ```vue
   <script setup lang="ts">
   // 正确：使用 computed
   const filteredItems = computed(() => {
     return items.value.filter(item => 
       item.name.toLowerCase().includes(searchTerm.value.toLowerCase())
     );
   });
   
   // 避免：深度 watch
   watch(
     () => [items.value, searchTerm.value],
     () => {
       // 复杂的计算逻辑
     },
     { deep: true }
   );
   </script>
   ```

3. **主题切换**：使用 `useAppearance` composable，支持浅色/深色/系统主题
   ```vue
   <script setup lang="ts">
   import { useAppearance } from '@/composables/useAppearance';
   
   const { appearance, updateAppearance } = useAppearance();
   
   const toggleTheme = () => {
     const nextTheme = appearance.value === 'light' ? 'dark' : 'light';
     updateAppearance(nextTheme);
   };
   </script>
   
   <template>
     <button @click="toggleTheme" class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
       <Icon :name="appearance === 'light' ? 'moon' : 'sun'" />
     </button>
   </template>
   ```

### 3.4 Inertia.js 集成

1. **页面组件**：Inertia.js 页面组件的标准结构
   ```vue
   <script setup lang="ts">
   import AppLayout from '@/layouts/AppLayout.vue';
   import { Head, useForm } from '@inertiajs/vue3';
   
   // 定义页面 Props 类型
   interface Props {
     users: Array<{
       id: number;
       name: string;
       email: string;
     }>;
     pagination: {
       current_page: number;
       last_page: number;
       total: number;
     };
   }
   
   const props = defineProps<Props>();
   
   // 使用 Inertia 表单
   const form = useForm({
     name: '',
     email: '',
   });
   
   const submit = () => {
     form.post('/users', {
       onSuccess: () => {
         form.reset();
       },
     });
   };
   </script>
   
   <template>
     <Head title="用户管理" />
     
     <AppLayout>
       <div class="max-w-7xl mx-auto py-6">
         <h1 class="text-2xl font-bold mb-6">用户管理</h1>
         
         <!-- 用户列表 -->
         <div class="bg-white shadow rounded-lg">
           <div v-for="user in users" :key="user.id" class="p-4 border-b">
             {{ user.name }} - {{ user.email }}
           </div>
         </div>
       </div>
     </AppLayout>
   </template>
   ```

2. **路由处理**：使用 Ziggy 生成的路由
   ```vue
   <script setup lang="ts">
   import { router } from '@inertiajs/vue3';
   import { route } from 'ziggy-js';
   
   const navigateToUser = (userId: number) => {
     router.get(route('users.show', { user: userId }));
   };
   
   const updateUser = (userId: number, data: UserData) => {
     router.put(route('users.update', { user: userId }), data, {
       onSuccess: () => {
         // 成功回调
       },
       onError: (errors) => {
         // 错误处理
       },
     });
   };
   </script>
   ```

### 3.5 SSR 与性能

1. **SSR 支持**：涉及服务器端渲染的代码，需同时修改 `app.ts` 与 `ssr.ts`
   ```typescript
   // app.ts - 客户端入口
   createInertiaApp({
     title: (title) => (title ? `${title} - ${appName}` : appName),
     resolve: (name) => resolvePageComponent(`./pages/${name}.vue`, import.meta.glob('./pages/**/*.vue')),
     setup({ el, App, props, plugin }) {
       createApp({ render: () => h(App, props) })
         .use(plugin)
         .use(ZiggyVue)
         .mount(el);
     },
   });
   
   // ssr.ts - 服务器端入口
   createServer((page) =>
     createInertiaApp({
       page,
       render: renderToString,
       resolve: (name) => resolvePageComponent(`./pages/${name}.vue`, import.meta.glob('./pages/**/*.vue')),
       setup: ({ App, props, plugin }) =>
         createSSRApp({ render: () => h(App, props) })
           .use(plugin)
           .use(ZiggyVue),
     })
   );
   ```

2. **代码分割**：大型组件使用动态导入 `defineAsyncComponent`
   ```vue
   <script setup lang="ts">
   import { defineAsyncComponent } from 'vue';
   
   // 动态导入大型组件
   const HeavyChart = defineAsyncComponent(() => import('@/components/HeavyChart.vue'));
   const DataTable = defineAsyncComponent({
     loader: () => import('@/components/DataTable.vue'),
     loadingComponent: () => h('div', '加载中...'),
     errorComponent: () => h('div', '加载失败'),
     delay: 200,
     timeout: 3000,
   });
   </script>
   ```

3. **资源优化**：图片使用 WebP 格式，合理使用懒加载
   ```vue
   <template>
     <!-- 图片懒加载 -->
     <img 
       v-lazy="imageUrl" 
       :alt="imageAlt"
       class="w-full h-48 object-cover rounded-lg"
       loading="lazy"
     />
     
     <!-- 使用 Intersection Observer 的自定义懒加载 -->
     <LazyImage :src="imageUrl" :alt="imageAlt" />
   </template>
   ```

### 3.6 代码质量

1. **依赖管理**：新增依赖后，确保更新 `package.json` 并执行 `npm run lint && npm run format`
   ```json
   {
     "scripts": {
       "dev": "vite",
       "build": "vite build",
       "lint": "eslint . --fix",
       "format": "prettier --write resources/",
       "type-check": "vue-tsc --noEmit"
     }
   }
   ```

2. **ESLint 配置**：遵循项目 ESLint 9 配置，不得忽略警告
   ```typescript
   // .eslintrc.js 示例配置
   module.exports = {
     extends: [
       '@vue/eslint-config-typescript',
       '@vue/eslint-config-prettier',
     ],
     rules: {
       'vue/multi-word-component-names': 'off',
       '@typescript-eslint/no-unused-vars': 'error',
       'prefer-const': 'error',
     },
   };
   ```

3. **类型安全**：避免使用 `any` 类型，必要时使用 `unknown` 或具体联合类型
   ```typescript
   // 正确：使用具体类型
   interface ApiResponse<T> {
     data: T;
     message: string;
     status: 'success' | 'error';
   }
   
   // 避免：使用 any
   const handleResponse = (response: any) => {
     // ...
   };
   
   // 正确：使用泛型
   const handleResponse = <T>(response: ApiResponse<T>) => {
     // ...
   };
   ```

## 4. 测试策略

### 4.1 组件测试
1. **测试框架**：使用 Vitest + Vue Test Utils
   ```typescript
   // UserCard.test.ts
   import { mount } from '@vue/test-utils';
   import { describe, it, expect } from 'vitest';
   import UserCard from '@/components/UserCard.vue';
   
   describe('UserCard', () => {
     it('应该正确显示用户信息', () => {
       const user = {
         id: 1,
         name: '张三',
         email: 'zhangsan@example.com',
       };
       
       const wrapper = mount(UserCard, {
         props: { user },
       });
       
       expect(wrapper.text()).toContain('张三');
       expect(wrapper.text()).toContain('zhangsan@example.com');
     });
     
     it('点击编辑按钮应该触发编辑事件', async () => {
       const wrapper = mount(UserCard, {
         props: { user: { id: 1, name: '张三' } },
       });
       
       await wrapper.find('[data-testid="edit-button"]').trigger('click');
       
       expect(wrapper.emitted('edit')).toBeTruthy();
       expect(wrapper.emitted('edit')[0]).toEqual([1]);
     });
   });
   ```

2. **E2E 测试**：使用 Playwright（推荐）或 Cypress
   ```typescript
   // tests/e2e/login.spec.ts
   import { test, expect } from '@playwright/test';
   
   test('用户可以成功登录', async ({ page }) => {
     await page.goto('/login');
     
     // 填写登录表单
     await page.fill('[data-testid="email"]', 'user@example.com');
     await page.fill('[data-testid="password"]', 'password');
     
     // 点击登录按钮
     await page.click('[data-testid="login-button"]');
     
     // 验证登录成功
     await expect(page).toHaveURL('/dashboard');
     await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
   });
   ```

3. **可访问性测试**：确保组件符合 WCAG 2.1 AA 标准
   ```vue
   <template>
     <!-- 正确的可访问性实践 -->
     <button
       type="button"
       :aria-label="isExpanded ? '收起菜单' : '展开菜单'"
       :aria-expanded="isExpanded"
       @click="toggleMenu"
     >
       <Icon :name="isExpanded ? 'chevron-up' : 'chevron-down'" />
     </button>
     
     <div 
       v-show="isExpanded"
       role="menu"
       :aria-hidden="!isExpanded"
     >
       <!-- 菜单内容 -->
     </div>
   </template>
   ```

## 5. 性能监控与优化

### 5.1 Bundle 优化
1. **Bundle 分析**：定期分析 bundle 大小，移除未使用的依赖
   ```bash
   # 安装 bundle 分析工具
   npm install --save-dev vite-bundle-analyzer
   
   # 分析 bundle
   npm run build && npx vite-bundle-analyzer
   ```

2. **首屏加载**：关键路径资源内联，非关键资源延迟加载
   ```typescript
   // vite.config.ts 优化配置
   export default defineConfig({
     build: {
       rollupOptions: {
         output: {
           manualChunks: {
             'vendor': ['vue', '@inertiajs/vue3'],
             'ui': ['@/components/ui'],
           },
         },
       },
     },
   });
   ```

3. **内存管理**：及时清理事件监听器和定时器
   ```vue
   <script setup lang="ts">
   import { onMounted, onBeforeUnmount } from 'vue';
   
   let timer: NodeJS.Timeout;
   
   onMounted(() => {
     // 添加事件监听器
     window.addEventListener('resize', handleResize);
     
     // 设置定时器
     timer = setInterval(() => {
       // 定时任务
     }, 1000);
   });
   
   onBeforeUnmount(() => {
     // 清理事件监听器
     window.removeEventListener('resize', handleResize);
     
     // 清理定时器
     if (timer) {
       clearInterval(timer);
     }
   });
   </script>
   ```

## 6. 安全与最佳实践

### 6.1 前端安全
1. **XSS 防护**：避免使用 `v-html`，必要时进行内容清理
   ```vue
   <script setup lang="ts">
   import DOMPurify from 'dompurify';
   
   const sanitizedHtml = computed(() => {
     return DOMPurify.sanitize(props.htmlContent);
   });
   </script>
   
   <template>
     <!-- 避免直接使用 v-html -->
     <div v-html="htmlContent"></div>
     
     <!-- 正确：清理后再使用 -->
     <div v-html="sanitizedHtml"></div>
   </template>
   ```

2. **敏感信息**：不在前端代码中暴露 API 密钥或敏感配置
   ```typescript
   // 错误：在前端暴露敏感信息
   const API_SECRET = 'secret-key-123';
   
   // 正确：使用环境变量，只暴露公开信息
   const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
   ```

## 7. 文档与变更管理
1. **组件文档**：UI 组件提供 Storybook 文档
2. **变更记录**：重大变更更新 `CHANGELOG.md`
3. **类型定义**：为复杂类型创建独立的类型定义文件

## 8. Git 提交约定
使用 **Conventional Commits** 格式：`<type>(<scope>): <subject>`

**前端相关示例**：
- `feat(ui): 新增用户头像组件`
- `fix(auth): 修复登录表单验证逻辑`
- `style(button): 调整按钮样式和响应式布局`
- `test(user): 添加用户组件单元测试`
- `refactor(composables): 重构用户状态管理逻辑`

---

> 遵循以上规则可确保前端代码质量与用户体验的最佳平衡，提升开发效率与应用性能。定期审查和更新这些规则，以适应 Vue 3 生态的演进。 