# HYQ MES V2 - 制造执行系统

[![Laravel](https://img.shields.io/badge/Laravel-12.x-FF2D20?style=flat-square&logo=laravel)](https://laravel.com)
[![Vue.js](https://img.shields.io/badge/Vue.js-3.x-4FC08D?style=flat-square&logo=vue.js)](https://vuejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Inertia.js](https://img.shields.io/badge/Inertia.js-2.x-9553E9?style=flat-square)](https://inertiajs.com)

现代化的制造执行系统，基于 Laravel + Vue 3 + Inertia.js + TypeScript 构建，支持多语言和团队协作。

## ✨ 核心特性

### 🏗️ 技术架构
- **后端**：Laravel 12.x + Sanctum API认证
- **前端**：Vue 3 + TypeScript + Composition API
- **路由**：Inertia.js 单页应用体验
- **样式**：Tailwind CSS + Reka UI组件库
- **测试**：Pest PHP + Vitest

### 🌍 多语言支持
- 内置中文/英文国际化
- 动态语言切换
- 开发环境热重载
- 自动字体优化

### 🎨 用户体验
- **响应式设计**：移动端友好
- **主题系统**：浅色/深色/系统自动
- **本地化字体**：Instrument Sans 字体文件本地化，提升加载性能
- **无障碍访问**：WCAG 2.1 AA 标准

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
│   │   ├── components/    # 组件
│   │   ├── pages/         # 页面
│   │   ├── layouts/       # 布局
│   │   └── i18n/          # 国际化
│   ├── css/               # 样式文件
│   └── views/             # Blade模板
├── public/
│   └── fonts/             # 本地化字体文件
├── tests/                 # 测试文件
└── docs/                  # 项目文档
```

## 📚 文档

- [前端开发规则](docs/FRONTEND_RULES.md)
- [后端开发规则](docs/BACKEND_RULES.md)
- [权限与团队管理](docs/权限与团队管理/)
- [认证系统文档](docs/认证系统文档/)
- [环境配置](docs/环境配置/)
- [字体优化](docs/font-optimization.md)

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
```

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