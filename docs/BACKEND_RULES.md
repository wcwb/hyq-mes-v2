# Laravel 后端开发规则

> 本文档总结了 Laravel 后端开发的技术栈与最佳实践，供 **Cursor AI** 在自动补全、代码生成、重构与回答问题时遵循。

---

## 1. 通用语言规则
1. 所有 AI 输出必须使用 **简体中文**，除非涉及代码、终端命令或官方英文专有名词（保持原文）。
2. **所有代码示例必须包含中文注释**，解释用途与关键逻辑，且遵循 Laravel Pint 规范。
3. **任务管理内容**：所有任务相关的标题、描述、详情和测试策略必须用简体中文，除非技术术语或代码需要保持原文。

## 2. 代码开发前置要求
1. **必须优先查阅官方文档**：在编写任何涉及第三方包或 Laravel 核心功能的代码前，必须访问官方文档了解正确的 API 使用方式。
2. **验证方法存在性**：调用 `parent::方法` 前，确认父类确实有该方法。
3. **遵循框架最佳实践**：使用官方推荐的扩展方式，避免重写核心方法。
4. **检查版本兼容性**：确保使用的 API 与当前版本兼容。
5. **优先使用组合模式**：优先使用组合模式而不是继承来扩展功能。

## 3. Laravel 12.x 架构原则

### 3.1 基础架构
1. 遵循 **Laravel 官方文档**，优先使用内置 Facade / Helper，避免重写核心方法。
2. **模型关系加载**：获取用户角色/权限时使用 `loadMissing('roles')`、`loadMissing('permissions')`，避免 `getAllPermissions()` 导致 N+1 查询。
3. 所有新特性须伴随 **Pest** Feature / Unit 测试；测试文件放置于 `tests/Feature` 或 `tests/Unit`。
4. 代码格式化：执行 `composer pint` 保持 Laravel Pint 风格。

### 3.2 权限系统（Spatie Permission）
1. **超级管理员实现**：
   ```php
   // 在 AuthServiceProvider 中注册 Gate::before
   Gate::before(function (User $user, string $ability) {
       return $user->is_super_admin ? true : null; // 超级管理员绕过所有权限检查
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
4. **API 资源类**：使用 Laravel Resource 类格式化 API 响应
   ```php
   // 正确的资源类实现
   class UserResource extends JsonResource
   {
       public function toArray($request)
       {
           return [
               'id' => $this->id,
               'name' => $this->name,
               'email' => $this->email,
               // 延迟加载权限和角色
               'permissions' => $this->whenLoaded('permissions', function () {
                   return $this->permissions->pluck('name');
               }),
               'roles' => $this->whenLoaded('roles', function () {
                   return $this->roles->pluck('name');
               }),
           ];
       }
   }
   ```

### 3.4 数据库设计
1. **迁移文件**：必须包含回滚方法，保持向后兼容
   ```php
   // 迁移示例
   public function up()
   {
       Schema::create('orders', function (Blueprint $table) {
           $table->id();
           $table->foreignId('team_id')->constrained()->onDelete('cascade'); // 使用 constrained()
           $table->string('order_number')->index(); // 添加索引
           $table->timestamps();
       });
   }
   
   public function down()
   {
       Schema::dropIfExists('orders'); // 确保有回滚方法
   }
   ```
2. **外键约束**：使用 `constrained()` 方法创建外键关系
3. **索引优化**：为经常查询的字段添加索引

### 3.5 模型设计
1. **关系定义**：明确定义模型关系，使用合适的关系类型
   ```php
   class User extends Authenticatable
   {
       // 明确定义关系
       public function team()
       {
           return $this->belongsTo(Team::class);
       }
       
       public function orders()
       {
           return $this->hasMany(Order::class);
       }
   }
   ```
2. **访问器和修改器**：使用 Laravel 12+ 的新语法
3. **模型事件**：合理使用模型事件处理业务逻辑

## 4. 测试策略

### 4.1 测试框架
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
   
   // 测试超级管理员权限
   test('超级管理员可以访问所有资源', function () {
       $superAdmin = User::factory()->create(['is_super_admin' => true]);
       
       $this->assertTrue($superAdmin->can('any.permission'));
   });
   ```

### 4.2 数据库测试
1. **使用 RefreshDatabase trait**：确保测试数据库干净
2. **Factory 使用**：为所有模型创建工厂类
3. **测试数据**：使用 Seeder 创建测试数据

## 5. 性能监控与优化

### 5.1 数据库性能
1. **数据库查询**：避免 N+1 查询，使用 Laravel Telescope/Pail 监控
   ```php
   // 正确的预加载方式
   $users = User::with(['roles', 'permissions', 'team'])->get();
   
   // 使用 loadMissing 避免重复查询
   $user->loadMissing('roles.permissions');
   ```
2. **缓存策略**：合理使用 Redis 缓存，避免缓存穿透
   ```php
   // 缓存查询结果
   $users = Cache::remember('team.users.' . $teamId, 3600, function () use ($teamId) {
       return User::where('team_id', $teamId)->with('roles')->get();
   });
   ```
3. **队列任务**：耗时操作使用队列异步处理

### 5.2 应用性能
1. **配置缓存**：生产环境启用配置缓存
2. **路由缓存**：缓存路由提升性能
3. **视图缓存**：预编译 Blade 模板

## 6. 安全与最佳实践

### 6.1 输入验证与安全
1. **输入验证**：所有用户输入必须验证，使用 Laravel Form Request
   ```php
   class StoreOrderRequest extends FormRequest
   {
       public function rules()
       {
           return [
               'order_number' => 'required|string|max:255|unique:orders',
               'customer_id' => 'required|exists:customers,id',
               'items' => 'required|array|min:1',
               'items.*.product_id' => 'required|exists:products,id',
               'items.*.quantity' => 'required|integer|min:1',
           ];
       }
       
       public function messages()
       {
           return [
               'order_number.required' => '订单号不能为空',
               'order_number.unique' => '订单号已存在',
           ];
       }
   }
   ```
2. **SQL 注入防护**：使用 Eloquent ORM 或参数化查询
3. **XSS 防护**：输出转义，使用 `{{ }}` 而非 `{!! !!}`
4. **CSRF 保护**：API 路由使用 Sanctum token，Web 路由使用 CSRF token

### 6.2 认证与授权
1. **中间件使用**：合理使用认证和授权中间件
   ```php
   // 路由中间件示例
   Route::middleware(['auth:sanctum', 'can:orders.view'])->group(function () {
       Route::get('/orders', [OrderController::class, 'index']);
   });
   ```
2. **API 认证**：使用 Sanctum 进行 API 认证
3. **权限检查**：在控制器中进行权限检查

## 7. 部署与环境

### 7.1 开发环境
1. **本地开发**：使用 `composer dev` 启动并发服务
2. **代码质量**：提交前执行 `composer pint` 格式化代码
3. **环境变量**：使用 `.env.example` 作为模板
4. **调试工具**：集成 Laravel Telescope 进行调试

### 7.2 生产环境
1. **优化配置**：
   ```bash
   # 生产环境优化命令
   php artisan config:cache      # 缓存配置
   php artisan route:cache       # 缓存路由
   php artisan view:cache        # 缓存视图
   php artisan optimize          # 整体优化
   ```
2. **监控系统**：集成 Laravel Horizon（队列）和 Telescope（调试）
3. **日志管理**：使用结构化日志，配置日志轮转
   ```php
   // 日志记录示例
   Log::info('用户登录', [
       'user_id' => $user->id,
       'ip' => request()->ip(),
       'user_agent' => request()->userAgent(),
   ]);
   ```

## 8. 文档与变更管理
1. **API 文档**：使用 Laravel API Documentation 或 Swagger
2. **变更记录**：重大变更更新 `CHANGELOG.md`
3. **数据库迁移**：变更数据库结构时，编写对应迁移与 Seeder
4. **代码注释**：关键业务逻辑必须添加中文注释

## 9. Git 提交约定
使用 **Conventional Commits** 格式：`<type>(<scope>): <subject>`

**常用类型**：
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式化
- `refactor`: 重构代码
- `test`: 添加测试
- `chore`: 构建过程或辅助工具的变动

**后端相关示例**：
- `feat(auth): 新增邮箱验证码登录功能`
- `fix(user): 修复用户权限检查逻辑`
- `docs(api): 更新用户管理 API 文档`
- `test(order): 添加订单创建功能测试`
- `refactor(permission): 重构权限检查逻辑`

---

> 遵循以上规则可确保后端代码质量与团队编码规范一致，提升开发效率与系统稳定性。定期审查和更新这些规则，以适应 Laravel 生态的演进。 