# Cursor AI 协作规则

> 本文档总结了项目技术栈与最佳实践，供 **Cursor AI** 在自动补全、代码生成、重构与回答问题时遵循。

---

## 1. 通用语言规则
1. 所有 AI 输出必须使用 **简体中文**，除非涉及代码、终端命令或官方英文专有名词（保持原文）。
2. **所有代码示例必须包含中文注释**，解释用途与关键逻辑，且遵循 ESLint / Prettier 规范。
3. **任务管理内容**：所有任务相关的标题、描述、详情和测试策略必须用简体中文，除非技术术语或代码需要保持原文。

## 2. 代码开发前置要求
1. **必须优先查阅官方文档**：在编写任何涉及第三方包或 Laravel 核心功能的代码前，必须访问官方文档了解正确的 API 使用方式。
2. **验证方法存在性**：调用 `parent::方法` 前，确认父类确实有该方法。
3. **遵循框架最佳实践**：使用官方推荐的扩展方式，避免重写核心方法。
4. **检查版本兼容性**：确保使用的 API 与当前版本兼容。
5. **优先使用组合模式**：优先使用组合模式而不是继承来扩展功能。

## 3. 后端 (Laravel 12.x)

### 3.1 架构原则
1. 遵循 **Laravel 官方文档**，优先使用内置 Facade / Helper，避免重写核心方法。
2. **模型关系加载**：获取用户角色/权限时使用 `loadMissing('roles')`、`loadMissing('permissions')`，避免 `getAllPermissions()` 导致 N+1 查询。
3. 所有新特性须伴随 **Pest** Feature / Unit 测试；测试文件放置于 `tests/Feature` 或 `tests/Unit`。
4. 代码格式化：执行 `composer pint` 保持 Laravel Pint 风格。

### 3.2 权限系统（Spatie Permission）
1. **超级管理员实现**：
   ```php
   // 在 AuthServiceProvider 中注册 Gate::before
   Gate::before(function (User $user, string $ability) {
       return $user->is_super_admin ? true : null;
   });
   ```
2. **权限命名格式**：`{team_name}.{action}`（如 `orders.view`、`users.create`、`teams.addMembers`）
3. **权限缓存**：
   - **严禁创建自定义权限缓存实现**
   - 直接依赖 **Spatie Permission** 内置缓存机制
   - 使用 `forgetCachedPermissions()` 方法手动清除缓存
   - 通过 `PERMISSION_CACHE_EXPIRATION_TIME` 等配置调整缓存策略
4. **团队切换功能**：
   ```php
   // 清除 Eloquent 关系缓存（官方推荐）
   $user->unsetRelation('roles')->unsetRelation('permissions');
   
   // 设置新团队上下文
   app(PermissionRegistrar::class)->setPermissionsTeamId($teamId);
   ```

### 3.3 API 设计
1. **资源获取**：
   ```php
   // 正确方式：使用 loadMissing 避免 N+1 查询
   $this->resource->loadMissing('permissions')->permissions->pluck('name')->toArray();
   $this->resource->loadMissing('roles')->roles->pluck('name')->toArray();
   
   // 避免使用：
   // - getAllPermissions()->pluck('name')
   // - getPermissionNames()->toArray()
   ```
2. **团队隔离**：确保所有 API 在团队隔离架构下的性能最优化
3. **认证系统**：使用 Laravel Sanctum 进行 API 认证

### 3.4 数据库设计
1. **迁移文件**：必须包含回滚方法，保持向后兼容
2. **外键约束**：使用 `constrained()` 方法创建外键关系
3. **索引优化**：为经常查询的字段添加索引

## 4. 前端 (Vue 3 + Inertia.js + TypeScript + Tailwind CSS 4)

### 4.1 组件开发规范
1. **组件写法**：统一使用 `<script setup lang="ts">`，启用 TypeScript 严格模式
2. **类型定义**：Props / Emits 必须完整类型化
   ```vue
   <script setup lang="ts">
   interface Props {
     title: string;
     isActive?: boolean;
   }
   
   interface Emits {
     (e: 'update', value: string): void;
   }
   
   const props = defineProps<Props>();
   const emit = defineEmits<Emits>();
   </script>
   ```
3. **目录组织**：
   - 页面：`resources/js/pages/**`
   - 布局：`resources/js/layouts/**`
   - 共享逻辑：`resources/js/composables/**`
   - UI 组件：`resources/js/components/ui/**`

### 4.2 样式与 UI 组件
1. **样式系统**：统一使用 **Tailwind CSS** 工具类，禁止裸写 CSS
2. **复杂样式**：使用 `@apply` 或 `class-variance-authority` 变体工具
3. **UI 组件库**：基于 `reka-ui`（类 shadcn 套件）进行扩展
4. **响应式设计**：移动优先，使用 Tailwind 断点系统

### 4.3 状态管理与数据流
1. **全局状态**：封装到 Vue composable 中，避免跨层级 prop drilling
2. **响应式优化**：避免深层次 `watch`，优先使用 `computed`
3. **主题切换**：使用 `useAppearance` composable，支持浅色/深色/系统主题

### 4.4 SSR 与性能
1. **SSR 支持**：涉及服务器端渲染的代码，需同时修改 `app.ts` 与 `ssr.ts`
2. **代码分割**：大型组件使用动态导入 `defineAsyncComponent`
3. **资源优化**：图片使用 WebP 格式，合理使用懒加载

### 4.5 代码质量
1. **依赖管理**：新增依赖后，确保更新 `package.json` 并执行 `npm run lint && npm run format`
2. **ESLint 配置**：遵循项目 ESLint 9 配置，不得忽略警告
3. **类型安全**：避免使用 `any` 类型，必要时使用 `unknown` 或具体联合类型

## 5. 测试策略

### 5.1 后端测试
1. **测试框架**：使用 Pest PHP 进行单元测试和功能测试
2. **权限测试**：重点测试 Gate::before 超级管理员功能和团队隔离
3. **测试覆盖**：
   ```php
   // 测试团队切换功能
   test('用户可以切换到有权限的团队', function () {
       $user = User::factory()->create();
       $team = Team::factory()->create();
       
       // 验证团队切换逻辑
       $response = $this->actingAs($user)->post('/api/auth/switch-team', [
           'team_id' => $team->id
       ]);
       
       $response->assertOk();
   });
   ```

### 5.2 前端测试
1. **组件测试**：使用 Vitest + Vue Test Utils
2. **E2E 测试**：使用 Playwright 或 Cypress（推荐 Playwright）
3. **可访问性测试**：确保组件符合 WCAG 2.1 AA 标准

## 6. 性能监控与优化

### 6.1 后端性能
1. **数据库查询**：避免 N+1 查询，使用 Laravel Telescope/Pail 监控
2. **缓存策略**：合理使用 Redis 缓存，避免缓存穿透
3. **队列任务**：耗时操作使用队列异步处理

### 6.2 前端性能
1. **Bundle 分析**：定期分析 bundle 大小，移除未使用的依赖
2. **首屏加载**：关键路径资源内联，非关键资源延迟加载
3. **内存管理**：及时清理事件监听器和定时器

## 7. 安全与最佳实践

### 7.1 后端安全
1. **输入验证**：所有用户输入必须验证，使用 Laravel Form Request
2. **SQL 注入防护**：使用 Eloquent ORM 或参数化查询
3. **XSS 防护**：输出转义，使用 `{{ }}` 而非 `{!! !!}`
4. **CSRF 保护**：API 路由使用 Sanctum token，Web 路由使用 CSRF token

### 7.2 前端安全
1. **XSS 防护**：避免使用 `v-html`，必要时进行内容清理
2. **HTTPS 强制**：生产环境强制使用 HTTPS
3. **敏感信息**：不在前端代码中暴露 API 密钥或敏感配置

## 8. 部署与环境

### 8.1 开发环境
1. **本地开发**：使用 `composer dev` 启动并发服务
2. **代码质量**：提交前执行 `composer pint && npm run lint`
3. **环境变量**：使用 `.env.example` 作为模板

### 8.2 生产环境
1. **优化配置**：
   ```bash
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   npm run build
   ```
2. **监控系统**：集成 Laravel Horizon（队列）和 Telescope（调试）
3. **日志管理**：使用结构化日志，配置日志轮转

## 9. 文档与变更管理
1. **API 文档**：使用 Laravel API Documentation 或 Swagger
2. **组件文档**：UI 组件提供 Storybook 文档
3. **变更记录**：重大变更更新 `CHANGELOG.md`
4. **数据库迁移**：变更数据库结构时，编写对应迁移与 Seeder

## 10. Git 提交约定
使用 **Conventional Commits** 格式：`<type>(<scope>): <subject>`

**常用类型**：
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式化
- `refactor`: 重构代码
- `test`: 添加测试
- `chore`: 构建过程或辅助工具的变动

**示例**：
- `feat(auth): 新增邮箱验证码登录功能`
- `fix(user): 修复用户权限检查逻辑`
- `docs(api): 更新用户管理 API 文档`

---

> 遵循以上规则可确保 AI 输出与团队编码规范一致，提升协作效率与代码质量。定期审查和更新这些规则，以适应技术栈的演进。 