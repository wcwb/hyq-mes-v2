# E2E 测试文档

## 概述

本目录包含 HYQ MES V2 项目的端到端（E2E）测试，主要使用 Puppeteer 进行浏览器自动化测试。

## 测试文件结构

```
tests/e2e/
├── README.md                    # 本文档
├── jest.config.cjs             # Jest 配置文件
├── jest.setup.cjs              # Jest 环境设置
├── jest.sequencer.cjs          # 测试执行顺序控制
├── run-tests.cjs               # 测试运行脚本
├── search-functionality.test.cjs  # 完整搜索功能测试套件
├── search-core.test.cjs        # 搜索核心功能测试
└── [其他测试文件...]
```

## 快速开始

### 1. 安装依赖

确保已安装必要的依赖包：

```bash
npm install puppeteer jest
```

### 2. 启动开发服务器

在运行测试前，确保 Laravel 开发服务器正在运行：

```bash
php artisan serve
```

### 3. 运行测试

使用测试运行脚本：

```bash
# 运行核心搜索功能测试
node tests/e2e/run-tests.cjs core

# 运行完整搜索功能测试
node tests/e2e/run-tests.cjs full

# 运行所有搜索相关测试
node tests/e2e/run-tests.cjs search

# 运行所有 E2E 测试
node tests/e2e/run-tests.cjs all
```

### 4. 测试选项

```bash
# 无头模式运行（不显示浏览器窗口）
node tests/e2e/run-tests.cjs core --headless

# 详细输出模式
node tests/e2e/run-tests.cjs core --verbose

# 调试模式（显示开发者工具）
node tests/e2e/run-tests.cjs core --debug

# CI 环境模式
node tests/e2e/run-tests.cjs all --ci
```

## 测试类型

### 1. 搜索核心功能测试 (`search-core.test.cjs`)

**目的**: 验证搜索功能的基本特性

**测试内容**:
- 用户登录功能
- 搜索按钮存在性检查
- 键盘快捷键功能（Cmd+K / Ctrl+K）
- 搜索输入框功能
- 响应式设计测试
- 页面性能检查

**适用场景**: 快速验证搜索功能是否正常工作

### 2. 完整搜索功能测试 (`search-functionality.test.cjs`)

**目的**: 全面测试搜索功能的所有方面

**测试内容**:
- 搜索对话框的打开和关闭
- 搜索输入和结果显示
- 键盘导航功能
- 搜索建议和历史记录
- 响应式设计测试
- 搜索性能测试
- 错误处理测试

**适用场景**: 完整的搜索功能验证和回归测试

## 登录凭据

测试使用以下登录凭据：
- **邮箱**: james@hyq.com
- **密码**: juWveg-kegnyq-3dewxu

## 测试结果

### 截图保存

测试过程中的截图会自动保存到：
```
test-results/
├── search-tests/           # 搜索测试截图
└── [其他测试结果...]
```

### 测试报告

Jest 会生成详细的测试报告，包括：
- 控制台输出
- HTML 测试报告（如果配置了相应的报告器）
- 测试覆盖率报告（CI 模式下）

## 配置说明

### Jest 配置 (`jest.config.cjs`)

- **测试环境**: Node.js
- **测试超时**: 60秒
- **并发执行**: 禁用（串行执行）
- **测试文件匹配**: `*.test.cjs`, `*.test.js`

### 环境变量

可以通过环境变量控制测试行为：

```bash
# 设置测试基础 URL
export TEST_BASE_URL=http://localhost:8000

# 启用无头模式
export HEADLESS=true

# 启用调试模式
export DEBUG=true

# CI 环境标识
export CI=true
```

## 自定义断言

测试环境提供了以下自定义断言：

```javascript
// 检查元素是否可见
await expect(element).toBeVisible();

// 检查页面是否包含文本
await expect(page).toContainText('期望的文本');

// 检查响应时间
expect(responseTime).toBeFasterThan(2000);
```

## 辅助函数

全局可用的辅助函数：

```javascript
// 等待指定时间
await testHelpers.wait(1000);

// 生成唯一测试 ID
const testId = testHelpers.generateTestId();

// 清理测试数据
await testHelpers.cleanupTestData(page);

// 检查控制台错误
const errorChecker = testHelpers.checkConsoleErrors(page);
```

## 故障排除

### 常见问题

1. **测试服务器连接失败**
   ```
   ❌ 无法连接到测试服务器
   ```
   **解决方案**: 确保 `php artisan serve` 正在运行

2. **Puppeteer 启动失败**
   ```
   Error: Failed to launch the browser process
   ```
   **解决方案**: 
   - 检查 Chrome/Chromium 是否已安装
   - 尝试使用 `--no-sandbox` 参数

3. **测试超时**
   ```
   Timeout - Async callback was not invoked within the 60000 ms timeout
   ```
   **解决方案**: 
   - 检查网络连接
   - 增加测试超时时间
   - 使用 `--verbose` 选项查看详细日志

4. **元素未找到**
   ```
   Error: waiting for selector failed: timeout 5000ms exceeded
   ```
   **解决方案**: 
   - 检查页面是否正确加载
   - 验证选择器是否正确
   - 检查元素是否在预期位置

### 调试技巧

1. **启用调试模式**:
   ```bash
   node tests/e2e/run-tests.cjs core --debug
   ```

2. **查看浏览器界面**:
   ```bash
   # 不使用 --headless 选项
   node tests/e2e/run-tests.cjs core
   ```

3. **添加断点**:
   ```javascript
   await page.waitForTimeout(5000); // 暂停 5 秒观察
   ```

4. **检查页面内容**:
   ```javascript
   const content = await page.content();
   console.log(content);
   ```

## 最佳实践

1. **测试隔离**: 每个测试都应该独立，不依赖其他测试的状态
2. **清理数据**: 测试前后清理浏览器状态（cookies、localStorage 等）
3. **等待策略**: 使用适当的等待策略，避免不稳定的测试
4. **截图记录**: 在关键步骤截图，便于问题诊断
5. **错误处理**: 妥善处理异常情况，提供有意义的错误信息

## 贡献指南

添加新测试时，请遵循以下规范：

1. **文件命名**: 使用描述性的文件名，如 `feature-name.test.cjs`
2. **测试描述**: 使用中文描述测试用例
3. **代码注释**: 为复杂逻辑添加中文注释
4. **错误处理**: 包含适当的错误处理和清理逻辑
5. **文档更新**: 更新相关文档和 README

## 联系信息

如有问题或建议，请联系开发团队或在项目仓库中创建 Issue。 