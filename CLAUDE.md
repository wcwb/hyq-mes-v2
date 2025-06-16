# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个现代化的制造执行系统（MES），基于 Laravel 12.x + Vue 3 + Inertia.js + TypeScript 构建，支持多语言和团队协作。

### 核心技术栈
- **后端**: Laravel 12.x + Sanctum API认证
- **前端**: Vue 3 + TypeScript + Composition API
- **路由**: Inertia.js 单页应用体验
- **样式**: Tailwind CSS + Reka UI组件库
- **测试**: Pest PHP + Vitest
- **国际化**: Vue I18n + 热重载支持

## 常用开发命令

### 环境启动
```bash
# 启动开发环境（并发运行所有服务）
composer dev

# 分别启动服务
php artisan serve          # Laravel 服务器 (8000端口)
npm run dev                # 前端开发服务器
php artisan queue:listen   # 队列处理
php artisan pail           # 日志监控
```

### 构建和部署
```bash
# 前端构建
npm run build              # 生产环境构建
npm run build:ssr         # SSR构建

# 后端优化
php artisan optimize      # Laravel优化
php artisan config:cache  # 缓存配置
php artisan route:cache   # 缓存路由
php artisan view:cache    # 缓存视图
```

### 代码质量
```bash
# PHP代码格式化和测试
composer pint             # Laravel Pint 格式化
composer test             # Pest PHP 测试

# 前端代码质量
npm run lint              # ESLint 检查和修复
npm run format            # Prettier 格式化
npm run format:check      # 检查格式化
npm run test              # Vitest 测试
npm run test:run          # 运行所有测试
npm run test:coverage     # 生成覆盖率报告
npm run test:ui           # 测试UI界面
```

### IDE支持
```bash
# Laravel IDE Helper（自动运行在composer update后）
php artisan ide-helper:generate
php artisan ide-helper:meta
```

## 架构设计

### 前后端交互模式
- **Inertia.js 全栈路由**: 服务器端路由控制，客户端单页应用体验
- **Ziggy路由生成**: 在前端使用类型安全的 Laravel 路由
- **Sanctum API认证**: 基于令牌的API认证系统

### 权限与团队管理
- **基于 Spatie Permission**: 使用官方包实现角色权限系统
- **团队隔离架构**: 多团队支持，数据完全隔离
- **超级管理员机制**: 通过 `Gate::before()` 实现权限绕过
- **权限命名规范**: `{team_name}.{action}` 格式

### 多语言系统
- **Vue I18n 9+**: 支持中文/英文切换
- **热重载支持**: 开发环境下自动重载翻译文件
- **类型安全**: 完整的TypeScript类型定义

## 开发规范

### 前端开发
- **组件规范**: 统一使用 `<script setup lang="ts">`
- **样式系统**: 必须使用 Tailwind CSS，禁用自定义CSS
- **UI组件**: 基于 Reka UI (shadcn-vue 风格)
- **状态管理**: 使用 Vue 3 Composition API + Composables
- **路径别名**: `@/` 指向 `resources/js/`

### 后端开发
- **代码格式**: 自动运行 Laravel Pint
- **性能优化**: 使用 `loadMissing()` 避免 N+1 查询
- **权限检查**: 避免使用 `getAllPermissions()`，使用预加载关系
- **API资源**: 使用 Laravel Resource 类格式化响应

### 测试策略
- **PHP测试**: Pest框架，测试文件位于 `tests/Feature` 和 `tests/Unit`
- **前端测试**: Vitest + Vue Test Utils，测试文件位于 `tests/frontend`
- **测试覆盖**: 重点测试权限系统、团队隔离、国际化功能

## 项目结构要点

### 关键目录
```
resources/js/
├── components/          # Vue组件
│   ├── ui/             # 基础UI组件 (Reka UI)
│   └── ...             # 业务组件
├── composables/        # 可复用的组合式函数
├── layouts/            # 页面布局
├── pages/              # Inertia.js 页面组件
├── i18n/               # 国际化文件
└── plugins/            # Vue插件 (如i18n热重载)

app/
├── Http/Controllers/   # Laravel控制器
├── Models/            # Eloquent模型
├── Policies/          # 授权策略
└── ...

.cursor/rules/         # Cursor AI开发规则
```

### 配置文件
- `vite.config.ts`: Vite构建配置，包含别名和插件
- `components.json`: Reka UI组件配置
- `tsconfig.json`: TypeScript配置
- `vitest.config.ts`: 前端测试配置

## 重要注意事项

### 权限系统限制
- **禁止自定义权限缓存**: 直接使用 Spatie Permission 内置缓存
- **团队切换时清理缓存**: 使用 `unsetRelation()` 清理 Eloquent 关系缓存
- **避免 N+1 查询**: 使用 `loadMissing(['roles', 'permissions'])` 预加载

### 样式开发限制
- **严格使用 Tailwind**: 不允许 `<style>` 标签或内联样式
- **响应式优先**: 移动端优先设计，使用标准断点
- **避免任意值**: 不使用 `w-[333px]` 这类任意值

### 代码提交规范
使用 Conventional Commits 格式：
- `feat(component): 新增用户头像组件`
- `fix(auth): 修复登录表单验证逻辑`
- `style(button): 调整按钮样式和响应式布局`

### 字体优化
项目已完成字体本地化优化，Instrument Sans 字体文件位于 `public/fonts/` 目录，避免外部CDN依赖。

## 开发工作流

1. **启动环境**: `composer dev` 启动所有服务
2. **开发功能**: 遵循组件化和模块化原则
3. **代码质量**: 提交前运行 `composer pint` 和 `npm run lint`
4. **测试验证**: 运行相关测试确保功能正常
5. **提交代码**: 使用规范的提交信息格式

## 最近活动记录

### 2024-12-15 浏览器控制台错误修复

**问题描述：**
用户报告了多个浏览器控制台错误，主要影响搜索功能的正常使用

**修复内容：**

1. **419 CSRF Token 错误修复**
   - 在搜索API请求中添加CSRF token支持
   - 实现模拟数据回退机制，在API不可用时使用本地搜索
   - 改善错误处理，提供用户友好的错误信息

2. **国际化翻译缺失修复**
   - 在中文翻译文件中添加 `search.error.apiFailure` 翻译
   - 在英文翻译文件中添加完整的 `search` 对象及所有子翻译
   - 确保国际化回退机制正常工作

3. **JavaScript类型安全修复**
   - 修复 `getSearchSuggestions` 函数中的 `item.toLowerCase` 错误
   - 在所有搜索历史处理函数中添加类型安全检查
   - 确保搜索历史数据的一致性和有效性

4. **错误处理改善**
   - 添加更详细的错误分类和处理
   - 实现渐进式降级：API → 模拟数据 → 错误提示
   - 减少未处理的渲染错误

**技术细节：**
- 文件修改：`resources/js/composables/useGlobalSearch.ts`
- 翻译更新：`resources/js/i18n/locales/zh.json`, `resources/js/i18n/locales/en.json`
- 错误类型：419 CSRF错误、类型安全错误、翻译缺失
- 解决方案：CSRF token支持、类型检查强化、模拟数据回退

**测试建议：**
1. 测试搜索功能在不同网络状态下的表现
2. 验证语言切换时的错误信息显示
3. 确认搜索历史功能的稳定性
4. 检查控制台是否还有相关错误

---

## 错误经验总结与最佳实践

### Vue响应式状态管理

#### ❌ 常见错误
```javascript
// 错误：直接修改只读状态
searchState.currentQuery = '';  // readonly状态不可直接修改
```

#### ✅ 正确做法
```javascript
// 正确：使用提供的方法修改状态
clearSearch();  // 通过composable的方法修改
```

**核心原则**:
- 永远不要直接修改通过 `readonly()` 包装的响应式状态
- 始终使用composable提供的方法来修改状态
- 在设计composable时，明确区分只读属性和可修改方法

### TypeScript类型安全

#### ❌ 常见错误
```javascript
// 错误：传递错误的prop类型
:suggestions="getSearchSuggestions()"  // 返回对象，但组件期望数组
```

#### ✅ 正确做法
```javascript
// 正确：确保类型匹配
:suggestions="getSuggestionsAsArray()"  // 转换为正确的数组类型
```

**核心原则**:
- 在传递props前，仔细检查接收组件期望的类型
- 不要忽视Vue的类型检查警告，立即修复
- 当API返回的数据格式与组件期望不匹配时，创建转换函数

### Composable架构设计

#### ❌ 常见错误
```javascript
// 错误：过度复杂的嵌套
const debouncedSearch = useDebouncedGlobalSearch({
  searchFunction: performSearch,  // 不支持的参数
  debounceMs: 300,  // 错误的参数名
});
```

#### ✅ 正确做法
```javascript
// 正确：简化直接的解决方案
const searchWithCustomData = useDebounceFn(performSearch, 300);
```

**核心原则**:
- 优先选择简单直接的解决方案
- 避免过度工程化和不必要的复杂性
- 使用API前仔细阅读文档和类型定义

### E2E测试最佳实践

#### ❌ 常见错误
```javascript
// 错误：测试间状态污染
await searchInput.type(query);  // 在已有内容后追加，导致测试失败
```

#### ✅ 正确做法
```javascript
// 正确：确保测试独立性
await searchInput.clear();      // 先清空
await searchInput.type(query);  // 再输入
```

**核心原则**:
- 确保每个测试用例的独立性和可重复性
- 测试前后都要正确清理状态
- 提供足够的测试数据覆盖真实业务场景

### 开发防错清单

在开发时必须检查：

- [ ] **状态修改**: 是否使用正确的方法修改响应式状态？
- [ ] **类型匹配**: props传递前是否验证了类型兼容性？
- [ ] **API使用**: 是否查看了完整的接口定义和参数要求？
- [ ] **数据准备**: UI功能是否有对应的数据源支持？
- [ ] **测试清理**: E2E测试是否确保了状态清理和独立性？
- [ ] **警告处理**: 是否立即修复了所有TypeScript和Vue警告？

### 核心开发原则

**"简单、类型安全、状态清晰"**

1. **简单性**: 优先选择简单直接的解决方案，避免过度设计
2. **类型安全**: 重视TypeScript类型检查，确保类型匹配
3. **状态清晰**: 使用正确的API修改状态，保持数据流清晰

### 紧急修复指南

当遇到以下错误时的快速修复方法：

| 错误类型 | 症状 | 快速修复 |
|---------|------|---------|
| 只读状态错误 | `readonly target` 警告 | 使用composable提供的修改方法 |
| 类型不匹配 | Vue props类型警告 | 创建类型转换函数 |
| 搜索无结果 | UI正常但无数据 | 检查数据源和搜索逻辑 |
| 测试失败 | E2E测试不稳定 | 添加状态清理和等待机制 |

这些经验教训将指导所有后续开发，确保代码质量和开发效率。

## E2E测试开发错误分析与防范

> 基于Puppeteer + Jest E2E测试套件开发过程中的错误总结

### 元素选择器错误

#### ❌ 最严重错误：盲目假设DOM结构
```javascript
// 错误：未验证实际DOM结构就使用假设的选择器
await page.type('input[type="email"]', email);  // 实际元素是input[id="login"]
await page.type('input[name="password"]', password);  // 实际元素是input[id="password"]
```

#### ✅ 正确做法：先诊断后编码
```javascript
// 正确：创建诊断测试验证实际DOM结构
const inputs = await page.$$eval('input', inputs => 
    inputs.map(input => ({
        type: input.type,
        id: input.id,
        name: input.name,
        placeholder: input.placeholder
    }))
);
console.log('页面中的所有input元素:', inputs);

// 然后使用正确的选择器
await page.type('input[id="login"]', email);
await page.type('input[id="password"]', password);
```

**关键教训**:
- **永远不要假设DOM结构**，特别是在Vue SPA环境中
- **先写诊断测试，再写功能测试**
- **表单元素可能使用id而非type或name属性**

### Vue SPA渲染时序错误

#### ❌ 常见错误：忽视SPA渲染延迟
```javascript
// 错误：立即查找元素，忽视Vue应用加载时间
await page.goto('/login');
await page.type('input[id="login"]', email);  // 元素可能还未渲染
```

#### ✅ 正确做法：等待应用和元素就绪
```javascript
// 正确：等待Vue应用加载
await page.goto('/login', { waitUntil: 'networkidle0' });
await page.waitForSelector('#app', { timeout: 10000 });
await new Promise(resolve => setTimeout(resolve, 2000));

// 然后等待具体元素
await page.waitForSelector('input[id="login"]', { timeout: 10000 });
await page.type('input[id="login"]', email);
```

**关键教训**:
- **Vue SPA需要双重等待**：应用容器 + 具体元素
- **使用waitForSelector确保元素存在**，不要直接操作
- **networkidle0比domcontentloaded更可靠**

### Puppeteer API使用错误

#### ❌ API方法混淆错误
```javascript
// 错误：使用已弃用或不存在的方法
await page.waitForTimeout(2000);  // 已弃用
await loginInput.clear();  // 元素句柄没有clear方法
```

#### ✅ 正确做法：使用当前API
```javascript
// 正确：使用Promise延迟和页面级操作
await new Promise(resolve => setTimeout(resolve, 2000));
await page.click('input[id="login"]', { clickCount: 3 });  // 选中全部文本
await page.type('input[id="login"]', email);
```

**关键教训**:
- **优先使用page级别的方法**而非元素句柄方法
- **查阅最新Puppeteer文档**，避免使用弃用方法
- **三次点击选中文本比clear()更可靠**

### 测试架构设计错误

#### ❌ 代码重复和维护困难
```javascript
// 错误：每个测试都重复登录代码
test('测试1', async () => {
    await page.type('input[id="login"]', email);
    await page.type('input[id="password"]', password);
    await page.click('button[type="submit"]');
    // ... 测试逻辑
});

test('测试2', async () => {
    await page.type('input[id="login"]', email);  // 重复代码
    await page.type('input[id="password"]', password);
    await page.click('button[type="submit"]');
    // ... 测试逻辑
});
```

#### ✅ 正确做法：创建可复用辅助函数
```javascript
// 正确：在jest.setup.cjs中创建通用辅助函数
global.testHelpers = {
    performLogin: async (page) => {
        await page.goto(global.TEST_CONFIG.baseUrl + '/login', { 
            waitUntil: 'networkidle0',
            timeout: 30000 
        });
        await page.waitForSelector('#app', { timeout: 10000 });
        await page.waitForSelector('input[id="login"]', { timeout: 10000 });
        
        await page.click('input[id="login"]', { clickCount: 3 });
        await page.type('input[id="login"]', global.TEST_CONFIG.loginCredentials.email);
        await page.click('input[id="password"]', { clickCount: 3 });
        await page.type('input[id="password"]', global.TEST_CONFIG.loginCredentials.password);
        await page.click('button[type="submit"]');
        
        await page.waitForFunction(
            () => !window.location.href.includes('/login'),
            { timeout: 15000 }
        );
        return true;
    }
};

// 在测试中使用
test('测试功能', async () => {
    await global.testHelpers.performLogin(page);
    // ... 测试逻辑
});
```

**关键教训**:
- **创建可复用的辅助函数**，避免代码重复
- **在jest.setup.cjs中定义全局工具**
- **包含完整的错误处理和调试信息**

### 配置和依赖错误

#### ❌ 模块导入和配置问题
```javascript
// 错误：在CommonJS环境中使用ES6导入
const fetch = require('node-fetch');  // 在Jest中导致模块错误
```

#### ✅ 正确做法：使用正确的导入方式
```javascript
// 正确：使用动态导入处理ES模块
const { default: fetch } = await import('node-fetch');
```

**关键教训**:
- **注意CommonJS与ES模块的兼容性问题**
- **Jest环境需要特殊处理ES模块导入**
- **添加必要的配置标志或使用动态导入**

### 测试执行策略错误

#### ❌ 并发执行导致状态污染
```javascript
// 错误：多个测试并发访问同一登录状态
maxWorkers: 4  // 可能导致测试间相互干扰
```

#### ✅ 正确做法：串行执行E2E测试
```javascript
// 正确：E2E测试串行执行
maxWorkers: 1,  // 避免状态污染
```

**关键教训**:
- **E2E测试必须串行执行**，避免浏览器状态冲突
- **每个测试后清理状态**（localStorage、cookies等）
- **提供充分的等待时间**，避免竞态条件

### 调试和错误诊断策略

#### ❌ 缺乏调试信息的错误
```javascript
// 错误：测试失败时没有足够调试信息
await page.waitForSelector('input[type="email"]');  // 失败时无法知道页面实际状态
```

#### ✅ 正确做法：提供详细调试信息
```javascript
// 正确：失败时输出详细调试信息
try {
    await page.waitForSelector('input[id="login"]', { timeout: 10000 });
} catch (error) {
    console.error('查找元素失败:', error.message);
    
    // 输出页面内容调试
    const pageContent = await page.content();
    console.log('页面HTML长度:', pageContent.length);
    
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('页面文本内容:', bodyText.substring(0, 500));
    
    // 输出所有相关元素
    const inputs = await page.$$eval('input', inputs => 
        inputs.map(input => ({ type: input.type, id: input.id, name: input.name }))
    );
    console.log('页面中的所有input元素:', inputs);
    
    throw error;
}
```

**关键教训**:
- **失败时总是输出调试信息**：页面内容、元素列表、当前URL
- **使用截图保存失败状态**用于后续分析
- **创建专门的诊断测试**来验证假设

### E2E测试防错检查清单

在编写E2E测试时必须验证：

- [ ] **DOM结构验证**: 是否通过诊断测试确认了实际的元素选择器？
- [ ] **SPA渲染等待**: 是否等待了Vue应用容器和具体元素加载？
- [ ] **API方法正确性**: 是否使用了最新的Puppeteer API方法？
- [ ] **辅助函数复用**: 是否提取了可复用的登录和操作函数？
- [ ] **模块导入兼容**: 是否正确处理了CommonJS/ES模块导入问题？
- [ ] **串行执行配置**: 是否设置了maxWorkers: 1避免状态污染？
- [ ] **调试信息充分**: 是否在关键步骤添加了足够的调试输出？
- [ ] **错误处理完整**: 是否包含了try-catch和详细错误信息？
- [ ] **状态清理机制**: 是否在测试间清理了浏览器状态？
- [ ] **超时时间合理**: 是否为Vue SPA设置了足够的等待时间？

### 关键原则总结

**"先诊断，再测试，多等待，详调试"**

1. **诊断优先**: 永远先写诊断测试确认DOM结构，再编写功能测试
2. **SPA特殊性**: Vue SPA需要额外的渲染等待时间和策略
3. **API准确性**: 使用最新、正确的Puppeteer API方法
4. **代码复用**: 创建可靠的辅助函数避免重复代码
5. **调试友好**: 提供充分的调试信息帮助快速定位问题

这些E2E测试错误分析将确保后续Puppeteer测试开发的高质量和高效率。