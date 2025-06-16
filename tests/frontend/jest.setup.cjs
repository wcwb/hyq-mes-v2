/**
 * Jest 设置文件 - Frontend E2E 测试环境配置
 * 在每个测试文件运行前执行的全局设置
 */

const fs = require('fs');
const path = require('path');

// 确保测试结果目录存在
const testResultsDir = path.join(__dirname, '../../test-results');
const e2eResultsDir = path.join(testResultsDir, 'e2e-comprehensive');

if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true });
}

if (!fs.existsSync(e2eResultsDir)) {
    fs.mkdirSync(e2eResultsDir, { recursive: true });
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
    screenshotPath: e2eResultsDir,
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
     * 检查用户是否已经登录
     */
    isLoggedIn: async (page) => {
        try {
            const currentUrl = page.url();
            // 如果当前页面不是登录页面，并且能访问到dashboard或其他需要认证的页面，说明已经登录
            if (!currentUrl.includes('/login')) {
                // 检查页面是否包含登录用户的标识元素
                try {
                    // 等待一下确保页面加载完成
                    await page.waitForSelector('header[role="banner"], [data-testid="user-menu"], .user-avatar', {
                        timeout: 3000
                    });
                    return true;
                } catch {
                    // 如果没有找到用户相关元素，可能需要重新登录
                    return false;
                }
            }
            return false;
        } catch (error) {
            console.log('检查登录状态时出现错误:', error.message);
            return false;
        }
    },

    /**
     * 通用登录辅助函数 - 带登录状态检查
     */
    performLogin: async (page) => {
        try {
            // 首先检查是否已经登录
            const alreadyLoggedIn = await global.testHelpers.isLoggedIn(page);
            if (alreadyLoggedIn) {
                console.log('用户已经登录，跳过登录流程，当前URL:', page.url());
                return true;
            }

            console.log('开始执行登录流程...');

            // 导航到登录页面
            await page.goto(global.TEST_CONFIG.baseUrl + '/login', {
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            // 等待Vue应用加载
            await page.waitForSelector('#app', { timeout: 10000 });
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 等待并填写登录表单
            await page.waitForSelector('input[id="login"]', { timeout: 10000 });
            await page.waitForSelector('input[id="password"]', { timeout: 5000 });
            await page.waitForSelector('button[type="submit"]', { timeout: 5000 });

            // 清空并填写登录表单
            await page.click('input[id="login"]', { clickCount: 3 });
            await page.type('input[id="login"]', global.TEST_CONFIG.loginCredentials.email);

            await page.click('input[id="password"]', { clickCount: 3 });
            await page.type('input[id="password"]', global.TEST_CONFIG.loginCredentials.password);

            await page.click('button[type="submit"]');
            console.log('已点击登录按钮');

            // 等待页面跳转离开登录页面
            await page.waitForFunction(
                () => !window.location.href.includes('/login'),
                { timeout: 15000 }
            );

            console.log('登录成功，页面已跳转至:', page.url());
            return true;

        } catch (error) {
            console.error('登录失败:', error.message);

            // 调试信息
            const currentUrl = page.url();
            console.log('当前URL:', currentUrl);

            if (currentUrl.includes('/login')) {
                // 检查是否有错误信息
                try {
                    const errorMessages = await page.$$eval(
                        '[role="alert"], .error, .text-red-500, .text-danger',
                        elements => elements.map(el => el.textContent)
                    );
                    if (errorMessages.length > 0) {
                        console.log('发现错误信息:', errorMessages);
                    }
                } catch (e) {
                    // 忽略查找错误信息的异常
                }
            }

            throw error;
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
    console.log('🚀 开始 Frontend E2E 测试环境初始化...');
    console.log(`📍 测试基础URL: ${global.TEST_CONFIG.baseUrl}`);
    console.log(`🖥️  无头模式: ${global.TEST_CONFIG.headless ? '启用' : '禁用'}`);
    console.log(`📸 截图保存路径: ${global.TEST_CONFIG.screenshotPath}`);

    // 检查测试服务器是否可访问
    try {
        const { default: fetch } = await import('node-fetch');
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
    console.log('🧹 Frontend E2E 测试环境清理完成');
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

console.log('✅ Jest Frontend E2E 测试环境设置完成');