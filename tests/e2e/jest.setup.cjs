/**
 * Jest 设置文件 - E2E 测试环境配置
 * 在每个测试文件运行前执行的全局设置
 */

const fs = require('fs');
const path = require('path');

// 确保测试结果目录存在
const testResultsDir = path.join(__dirname, '../../test-results');
const searchTestsDir = path.join(testResultsDir, 'search-tests');

if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true });
}

if (!fs.existsSync(searchTestsDir)) {
    fs.mkdirSync(searchTestsDir, { recursive: true });
}

// 扩展 Jest 的 expect 断言
expect.extend({
    /**
     * 自定义断言：检查元素是否可见
     */
    async toBeVisible(received) {
        if (!received) {
            return {
                message: () => `期望元素存在但实际为 null 或 undefined`,
                pass: false,
            };
        }

        try {
            const isVisible = await received.isIntersectingViewport();
            return {
                message: () =>
                    this.isNot
                        ? `期望元素不可见但实际可见`
                        : `期望元素可见但实际不可见`,
                pass: isVisible,
            };
        } catch (error) {
            return {
                message: () => `检查元素可见性时出错: ${error.message}`,
                pass: false,
            };
        }
    },

    /**
     * 自定义断言：检查页面是否包含文本
     */
    async toContainText(page, expectedText) {
        try {
            const pageText = await page.evaluate(() => document.body.innerText);
            const contains = pageText.includes(expectedText);

            return {
                message: () =>
                    this.isNot
                        ? `期望页面不包含文本 "${expectedText}" 但实际包含`
                        : `期望页面包含文本 "${expectedText}" 但实际不包含`,
                pass: contains,
            };
        } catch (error) {
            return {
                message: () => `检查页面文本时出错: ${error.message}`,
                pass: false,
            };
        }
    },

    /**
     * 自定义断言：检查响应时间
     */
    toBeFasterThan(received, expectedTime) {
        const pass = received < expectedTime;
        return {
            message: () =>
                this.isNot
                    ? `期望响应时间 ${received}ms 不少于 ${expectedTime}ms`
                    : `期望响应时间 ${received}ms 少于 ${expectedTime}ms`,
            pass,
        };
    }
});

// 全局测试配置
global.TEST_CONFIG = {
    baseUrl: process.env.TEST_BASE_URL || 'http://localhost:8000',
    loginCredentials: {
        email: 'james@hyq.com',
        password: 'juWveg-kegnyq-3dewxu'
    },
    timeout: 30000,
    screenshotPath: searchTestsDir,
    headless: process.env.CI === 'true' || process.env.HEADLESS === 'true',
    slowMo: process.env.CI === 'true' ? 0 : 100,
    devtools: process.env.DEVTOOLS === 'true'
};

// 全局辅助函数
global.testHelpers = {
    /**
     * 等待指定时间
     */
    wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

    /**
     * 生成唯一的测试ID
     */
    generateTestId: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

    /**
     * 格式化时间戳
     */
    formatTimestamp: (date = new Date()) => {
        return date.toISOString().replace(/[:.]/g, '-').slice(0, -5);
    },

    /**
     * 清理测试数据
     */
    cleanupTestData: async (page) => {
        try {
            await page.evaluate(() => {
                // 清除本地存储
                localStorage.clear();
                sessionStorage.clear();

                // 清除所有 cookies（客户端可清除的）
                document.cookie.split(";").forEach(function (c) {
                    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                });
            });
        } catch (error) {
            console.warn('清理测试数据时出现警告:', error.message);
        }
    },

    /**
     * 检查控制台错误
     */
    checkConsoleErrors: (page) => {
        const errors = [];

        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        page.on('pageerror', error => {
            errors.push(error.message);
        });

        return {
            getErrors: () => errors,
            hasErrors: () => errors.length > 0,
            clearErrors: () => errors.length = 0
        };
    }
};

// 测试环境检查
beforeAll(async () => {
    console.log('🚀 开始 E2E 测试环境初始化...');
    console.log(`📍 测试基础URL: ${global.TEST_CONFIG.baseUrl}`);
    console.log(`🖥️  无头模式: ${global.TEST_CONFIG.headless ? '启用' : '禁用'}`);
    console.log(`📸 截图保存路径: ${global.TEST_CONFIG.screenshotPath}`);

    // 检查测试服务器是否可访问
    try {
        const fetch = require('node-fetch');
        const response = await fetch(global.TEST_CONFIG.baseUrl, {
            timeout: 5000,
            method: 'HEAD'
        });

        if (!response.ok) {
            console.warn(`⚠️  测试服务器响应状态: ${response.status}`);
        } else {
            console.log('✅ 测试服务器连接正常');
        }
    } catch (error) {
        console.error('❌ 无法连接到测试服务器:', error.message);
        console.error('请确保开发服务器正在运行: php artisan serve');
    }
});

// 测试完成后清理
afterAll(async () => {
    console.log('🧹 E2E 测试环境清理完成');
});

// 每个测试前的设置
beforeEach(async () => {
    // 可以在这里添加每个测试前的通用设置
});

// 每个测试后的清理
afterEach(async () => {
    // 可以在这里添加每个测试后的通用清理
});

// 未捕获的异常处理
process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的 Promise 拒绝:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
});

console.log('✅ Jest E2E 测试环境设置完成'); 