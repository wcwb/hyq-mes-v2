# HYQ MES V2 - 制造执行系统

[![Laravel](https://img.shields.io/badge/Laravel-12.x-FF2D20?style=flat-square&logo=laravel)](https://laravel.com)
[![Vue.js](https://img.shields.io/badge/Vue.js-3.x-4FC08D?style=flat-square&logo=vue.js)](https://vuejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Inertia.js](https://img.shields.io/badge/Inertia.js-2.x-9553E9?style=flat-square)](https://inertiajs.com)
[![Reka UI](https://img.shields.io/badge/Reka_UI-2.x-FF6B6B?style=flat-square)](https://reka-ui.com)

现代化的制造执行系统，基于 Laravel + Vue 3 + Inertia.js + TypeScript 构建，支持多语言和团队协作。

## ✨ 核心特性

### 🏗️ 技术架构
- **后端**：Laravel 12.x + Sanctum API认证
- **前端**：Vue 3 + TypeScript + Composition API + Reka UI v2
- **路由**：Inertia.js 单页应用体验  
- **样式**：Tailwind CSS + 无样式组件库架构
- **测试**：Pest PHP + Vitest + Jest + Playwright E2E

### 🎯 新增核心功能 (v2.0)

#### 🗂️ 智能标签页系统
- **标签页状态管理**：`useTabState` - 动态标签页创建、切换、关闭
- **数据持久化**：`useTabPersistence` - 浏览器重启后恢复标签页状态
- **渐进式加载**：`useProgressiveTabLoading` - 按需预加载内容，优化性能
- **上下文菜单**：右键菜单支持关闭、复制、固定等操作

#### 🔍 全局搜索系统
- **智能搜索**：`useGlobalSearch` - 跨模块实时搜索
- **结果分组**：智能分类显示搜索结果（用户、订单、产品等）
- **键盘快捷键**：`Ctrl+K` 快速唤起搜索
- **无障碍支持**：完整的屏幕阅读器支持

#### 🧪 完整测试框架
- **E2E测试**：基于 Jest + Playwright 的端到端测试
- **单元测试**：Vue 组合式函数的完整测试覆盖
- **集成测试**：组件交互和状态管理测试
- **无障碍测试**：WCAG 2.1 合规性自动化测试
- **视觉回归测试**：截图对比确保UI一致性

### 🌍 多语言支持
- 内置中文/英文国际化
- 动态语言切换
- 开发环境热重载
- 自动字体优化
- **严格国际化策略**：禁止硬编码文本，所有UI文本使用i18n

### 🎨 用户体验
- **响应式设计**：移动端友好，支持多断点布局
- **主题系统**：浅色/深色/系统自动切换
- **无障碍访问**：WCAG 2.1 AA 标准，完整键盘导航
- **性能优化**：代码分割、懒加载、树摇优化
- **本地化字体**：Instrument Sans 字体文件本地化，提升加载性能

### 👥 权限管理
- 基于 Spatie Permission 的角色权限系统
- 团队隔离和多团队支持
- 超级管理员机制
- 细粒度权限控制

## 🚀 性能优化

### 字体优化
本项目已完成字体本地化优化，具体包括：

- ✅ **消除外部依赖**：将 Instrument Sans 字体从 CDN 迁移到本地
- ✅ **减少网络请求**：避免外部字体服务的DNS解析和网络延迟
- ✅ **提升加载速度**：使用 `preload` 和 `font-display: swap` 优化策略
- ✅ **隐私保护**：符合 GDPR 要求，不向第三方发送用户数据

详见：[字体优化文档](docs/font-optimization.md)

### 前端性能
- **组件懒加载**：按需加载大型组件
- **状态优化**：使用 `shallowRef` 优化大数据集
- **搜索防抖**：300ms 防抖优化搜索体验
- **虚拟滚动**：大列表性能优化

### 构建优化
- **代码分割**：按需加载组件和页面
- **树摇优化**：移除未使用的代码
- **资源压缩**：GZIP/Brotli 压缩
- **缓存策略**：合理的浏览器缓存配置

## 📦 快速开始

### 环境要求
- PHP 8.2+
- Node.js 18+
- Composer
- MySQL/PostgreSQL

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd hyq-mes-v2
```

2. **安装依赖**
```bash
# 后端依赖
composer install

# 前端依赖
npm install
```

3. **环境配置**
```bash
# 复制环境文件
cp .env.example .env

# 生成应用密钥
php artisan key:generate

# 配置数据库连接
# 编辑 .env 文件中的数据库配置
```

4. **数据库迁移**
```bash
# 运行迁移
php artisan migrate

# 运行种子数据（可选）
php artisan db:seed
```

5. **启动开发服务器**
```bash
# 启动Laravel服务器（端口8000）
php artisan serve

# 启动前端开发服务器
npm run dev
```

6. **访问应用**
- 前端应用：http://localhost:8000
- API文档：http://localhost:8000/api/documentation

## 🛠️ 开发工具

### 代码质量
```bash
# 代码格式化
composer pint          # PHP代码格式化
npm run format         # JavaScript/Vue代码格式化

# 代码检查
composer test          # PHP测试
npm run lint          # 前端代码检查
npm run test          # 前端测试
npm run test:e2e      # E2E测试
```

### 测试命令
```bash
# 前端单元测试
npm run test:unit

# E2E测试
npm run test:e2e

# 综合测试报告
npm run test:comprehensive

# 无障碍测试
npm run test:a11y
```

### 构建部署
```bash
# 生产构建
npm run build         # 前端资源构建
php artisan optimize  # 后端优化
```

## 📁 项目结构

```
hyq-mes-v2/
├── app/                    # Laravel应用代码
│   ├── Http/Controllers/   # 控制器
│   ├── Models/            # 模型
│   └── Policies/          # 权限策略
├── resources/
│   ├── js/                # Vue 3 前端代码
│   │   ├── components/    # 组件库
│   │   │   ├── ui/        # Reka UI样式化组件
│   │   │   ├── demo/      # 演示组件
│   │   │   └── ...        # 业务组件
│   │   ├── composables/   # 组合式函数
│   │   │   ├── useTabState.ts
│   │   │   ├── useGlobalSearch.ts
│   │   │   └── ...
│   │   ├── pages/         # 页面组件
│   │   ├── layouts/       # 布局组件
│   │   ├── services/      # API服务
│   │   ├── types/         # TypeScript类型定义
│   │   └── i18n/          # 国际化
│   ├── css/               # 样式文件
│   └── views/             # Blade模板
├── tests/                 # 测试文件
│   ├── frontend/          # 前端测试
│   │   ├── composables/   # 组合式函数测试
│   │   ├── components/    # 组件测试
│   │   └── e2e/           # E2E测试
│   └── e2e/               # 通用E2E测试
├── test-results/          # 测试结果和截图
├── .cursor/               # Cursor IDE配置
│   ├── rules/             # 开发规则（.mdc格式）
│   └── mcp.json.example   # MCP配置示例
├── public/
│   └── fonts/             # 本地化字体文件
└── docs/                  # 项目文档
```

## 📚 文档

### 开发文档
- [前端开发规则](.cursor/rules/frontend.mdc)
- [后端开发规则](.cursor/rules/laravel-backend.mdc)
- [测试调试策略](.cursor/rules/testing-debugging-strategies.mdc)
- [TypeScript测试模式](.cursor/rules/typescript-testing-patterns.mdc)
- [Vue3组合式函数测试](.cursor/rules/vue3-composable-testing.mdc)

### 功能文档
- [权限与团队管理](docs/权限与团队管理/)
- [认证系统文档](docs/认证系统文档/)
- [环境配置](docs/环境配置/)
- [字体优化](docs/font-optimization.md)

### 测试文档
- [E2E测试指南](tests/e2e/README.md)
- [前端测试指南](tests/frontend/e2e/README.md)

## 🧪 测试策略

本项目采用多层次测试策略：

### 单元测试
- **组合式函数测试**：完整覆盖 `useTabState`、`useGlobalSearch` 等
- **组件测试**：Vue组件的输入输出测试
- **服务测试**：API服务和数据处理逻辑测试

### 集成测试
- **状态管理集成**：多个组合式函数协作测试
- **组件交互测试**：用户交互流程测试
- **API集成测试**：前后端数据流测试

### E2E测试
- **用户流程测试**：完整业务流程自动化测试
- **跨浏览器测试**：Chrome、Firefox、Safari兼容性
- **响应式测试**：多设备屏幕尺寸测试
- **无障碍测试**：自动化a11y合规性检查

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

### 提交规范
```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式化
refactor: 重构代码
test: 添加测试
chore: 构建过程或辅助工具的变动
security: 安全相关更新
```

### 开发规范
- **国际化优先**：所有UI文本必须使用 `t()` 函数
- **TypeScript严格模式**：启用严格类型检查
- **组件设计**：遵循 Reka UI v2 无样式组件设计原则
- **测试驱动**：新功能必须包含相应测试
- **无障碍优先**：所有组件必须支持键盘导航和屏幕阅读器

## 📄 许可证

此项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🆘 支持

如有问题或建议，请：
- 创建 [Issue](../../issues)
- 查看 [文档](docs/)
- 联系开发团队

---

<p align="center">
  <sub>Built with ❤️ by HYQ Development Team</sub>
</p> 