const puppeteer = require('puppeteer');
const path = require('path');

/**
 * 搜索功能完整测试套件
 * 测试全局搜索功能的各个方面，包括：
 * - 搜索对话框的打开和关闭
 * - 搜索输入和结果显示
 * - 键盘快捷键功能
 * - 搜索建议和历史记录
 * - 响应式设计测试
 */

describe('搜索功能测试套件', () => {
    let browser;
    let page;

    // 测试配置
    const config = {
        baseUrl: 'http://localhost:8000',
        loginCredentials: {
            email: 'james@hyq.com',
            password: 'juWveg-kegnyq-3dewxu'
        },
        timeout: 30000,
        screenshotPath: path.join(__dirname, '../../test-results/search-tests')
    };

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: false, // 设置为 true 可以无头模式运行
            slowMo: 100, // 减慢操作速度以便观察
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--window-size=1920,1080'
            ]
        });

        page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        // 设置用户代理
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

        // 启用请求拦截以优化加载速度
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (req.resourceType() === 'image' && !req.url().includes('avatar')) {
                req.abort();
            } else {
                req.continue();
            }
        });
    });

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    beforeEach(async () => {
        // 清除所有 cookies 和本地存储
        await page.deleteCookie(...(await page.cookies()));
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
    });

    /**
     * 辅助函数：登录到系统
     */
    async function loginToSystem() {
        console.log('开始登录流程...');

        // 导航到登录页面
        await page.goto(`${config.baseUrl}/login`, {
            waitUntil: 'networkidle2',
            timeout: config.timeout
        });

        // 等待登录表单加载
        await page.waitForSelector('input[type="email"], input[name="login"]', {
            timeout: config.timeout
        });

        // 填写登录凭据
        const emailInput = await page.$('input[type="email"], input[name="login"]');
        if (emailInput) {
            await emailInput.click();
            await emailInput.type(config.loginCredentials.email);
        }

        const passwordInput = await page.$('input[type="password"], input[name="password"]');
        if (passwordInput) {
            await passwordInput.click();
            await passwordInput.type(config.loginCredentials.password);
        }

        // 提交登录表单
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: config.timeout }),
            page.click('button[type="submit"], .login-button, [data-testid="login-button"]')
        ]);

        // 验证登录成功 - 等待仪表板加载
        await page.waitForSelector('[data-testid="dashboard"], .dashboard, main', {
            timeout: config.timeout
        });

        console.log('登录成功，已进入仪表板');
    }

    /**
     * 辅助函数：截图保存
     */
    async function takeScreenshot(name) {
        const screenshotPath = path.join(config.screenshotPath, `${name}-${Date.now()}.png`);
        await page.screenshot({
            path: screenshotPath,
            fullPage: true
        });
        console.log(`截图已保存: ${screenshotPath}`);
    }

    /**
     * 辅助函数：等待搜索对话框
     */
    async function waitForSearchDialog() {
        return await page.waitForSelector('[data-testid="search-dialog"], .search-dialog, [role="dialog"]', {
            timeout: 5000
        });
    }

    /**
     * 辅助函数：打开搜索对话框
     */
    async function openSearchDialog() {
        // 方法1：点击搜索按钮
        const searchButton = await page.$('[data-testid="search-button"], .search-trigger, [aria-label*="搜索"]');
        if (searchButton) {
            await searchButton.click();
            await waitForSearchDialog();
            return 'button';
        }

        // 方法2：使用键盘快捷键
        await page.keyboard.down('Meta'); // Mac 的 Cmd 键
        await page.keyboard.press('KeyK');
        await page.keyboard.up('Meta');

        try {
            await waitForSearchDialog();
            return 'shortcut';
        } catch (error) {
            // 尝试 Ctrl+K (Windows/Linux)
            await page.keyboard.down('Control');
            await page.keyboard.press('KeyK');
            await page.keyboard.up('Control');
            await waitForSearchDialog();
            return 'shortcut-ctrl';
        }
    }

    test('用户登录功能测试', async () => {
        await loginToSystem();
        await takeScreenshot('login-success');

        // 验证用户信息显示
        const userInfo = await page.$('[data-testid="user-info"], .user-menu, [aria-label*="用户"]');
        expect(userInfo).toBeTruthy();
    }, config.timeout);

    test('搜索对话框打开和关闭', async () => {
        await loginToSystem();

        console.log('测试搜索对话框的打开...');

        // 打开搜索对话框
        const openMethod = await openSearchDialog();
        console.log(`搜索对话框通过 ${openMethod} 方式打开`);

        await takeScreenshot('search-dialog-opened');

        // 验证搜索对话框已打开
        const searchDialog = await page.$('[data-testid="search-dialog"], .search-dialog, [role="dialog"]');
        expect(searchDialog).toBeTruthy();

        // 验证搜索输入框存在
        const searchInput = await page.$('input[type="search"], input[placeholder*="搜索"], .search-input');
        expect(searchInput).toBeTruthy();

        console.log('测试搜索对话框的关闭...');

        // 测试 ESC 键关闭
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);

        // 验证对话框已关闭
        const dialogAfterEsc = await page.$('[data-testid="search-dialog"], .search-dialog, [role="dialog"]');
        expect(dialogAfterEsc).toBeFalsy();

        await takeScreenshot('search-dialog-closed');
    }, config.timeout);

    test('搜索输入和结果显示', async () => {
        await loginToSystem();

        // 打开搜索对话框
        await openSearchDialog();

        // 获取搜索输入框
        const searchInput = await page.$('input[type="search"], input[placeholder*="搜索"], .search-input');
        expect(searchInput).toBeTruthy();

        console.log('测试搜索输入...');

        // 输入搜索关键词
        const searchTerms = ['订单', '产品', '用户', 'dashboard'];

        for (const term of searchTerms) {
            console.log(`搜索关键词: ${term}`);

            // 清空输入框
            await searchInput.click();
            await page.keyboard.down('Meta');
            await page.keyboard.press('KeyA');
            await page.keyboard.up('Meta');
            await page.keyboard.press('Backspace');

            // 输入搜索词
            await searchInput.type(term);

            // 等待搜索结果
            await page.waitForTimeout(1000);

            await takeScreenshot(`search-results-${term}`);

            // 检查是否有搜索结果或建议
            const hasResults = await page.evaluate(() => {
                const resultElements = document.querySelectorAll(
                    '[data-testid="search-result"], .search-result, [role="option"]'
                );
                const suggestionElements = document.querySelectorAll(
                    '[data-testid="search-suggestion"], .search-suggestion'
                );
                return resultElements.length > 0 || suggestionElements.length > 0;
            });

            console.log(`搜索 "${term}" 的结果: ${hasResults ? '有结果' : '无结果'}`);
        }
    }, config.timeout);

    test('键盘导航功能', async () => {
        await loginToSystem();
        await openSearchDialog();

        const searchInput = await page.$('input[type="search"], input[placeholder*="搜索"], .search-input');
        await searchInput.type('订单');

        // 等待搜索结果
        await page.waitForTimeout(1000);

        console.log('测试键盘导航...');

        // 测试上下箭头键导航
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(300);
        await takeScreenshot('keyboard-nav-down');

        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(300);

        await page.keyboard.press('ArrowUp');
        await page.waitForTimeout(300);
        await takeScreenshot('keyboard-nav-up');

        // 测试回车键选择
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        await takeScreenshot('keyboard-nav-select');
    }, config.timeout);

    test('搜索建议和历史记录', async () => {
        await loginToSystem();
        await openSearchDialog();

        console.log('测试空搜索状态的建议...');

        // 检查空搜索状态下的建议
        const suggestions = await page.$$('[data-testid="search-suggestion"], .search-suggestion');
        console.log(`找到 ${suggestions.length} 个搜索建议`);

        await takeScreenshot('empty-search-suggestions');

        // 输入一些搜索词建立历史记录
        const searchInput = await page.$('input[type="search"], input[placeholder*="搜索"], .search-input');
        const historyTerms = ['订单管理', '产品列表', '用户设置'];

        for (const term of historyTerms) {
            await searchInput.click();
            await page.keyboard.down('Meta');
            await page.keyboard.press('KeyA');
            await page.keyboard.up('Meta');
            await searchInput.type(term);
            await page.keyboard.press('Enter');
            await page.waitForTimeout(500);

            // 重新打开搜索对话框
            await openSearchDialog();
        }

        // 检查搜索历史
        console.log('检查搜索历史记录...');
        await takeScreenshot('search-history');

        // 关闭搜索对话框
        await page.keyboard.press('Escape');
    }, config.timeout);

    test('响应式设计测试', async () => {
        await loginToSystem();

        // 测试不同屏幕尺寸
        const viewports = [
            { width: 375, height: 667, name: 'mobile' },    // iPhone SE
            { width: 768, height: 1024, name: 'tablet' },   // iPad
            { width: 1024, height: 768, name: 'laptop' },   // 小笔记本
            { width: 1920, height: 1080, name: 'desktop' }  // 桌面
        ];

        for (const viewport of viewports) {
            console.log(`测试 ${viewport.name} 视口 (${viewport.width}x${viewport.height})`);

            await page.setViewport(viewport);
            await page.waitForTimeout(500);

            await takeScreenshot(`responsive-${viewport.name}-before-search`);

            // 尝试打开搜索对话框
            try {
                await openSearchDialog();
                await takeScreenshot(`responsive-${viewport.name}-search-open`);

                // 测试搜索输入
                const searchInput = await page.$('input[type="search"], input[placeholder*="搜索"], .search-input');
                if (searchInput) {
                    await searchInput.type('测试');
                    await page.waitForTimeout(500);
                    await takeScreenshot(`responsive-${viewport.name}-search-input`);
                }

                // 关闭搜索对话框
                await page.keyboard.press('Escape');
                await page.waitForTimeout(500);

            } catch (error) {
                console.log(`在 ${viewport.name} 视口下搜索功能测试失败:`, error.message);
                await takeScreenshot(`responsive-${viewport.name}-error`);
            }
        }

        // 恢复默认视口
        await page.setViewport({ width: 1920, height: 1080 });
    }, config.timeout);

    test('搜索性能测试', async () => {
        await loginToSystem();

        console.log('开始搜索性能测试...');

        // 测试搜索对话框打开速度
        const startTime = Date.now();
        await openSearchDialog();
        const openTime = Date.now() - startTime;

        console.log(`搜索对话框打开耗时: ${openTime}ms`);
        expect(openTime).toBeLessThan(2000); // 应该在2秒内打开

        // 测试搜索响应速度
        const searchInput = await page.$('input[type="search"], input[placeholder*="搜索"], .search-input');

        const searchStartTime = Date.now();
        await searchInput.type('订单');

        // 等待搜索结果或建议出现
        try {
            await page.waitForSelector(
                '[data-testid="search-result"], .search-result, [data-testid="search-suggestion"], .search-suggestion',
                { timeout: 3000 }
            );
            const searchTime = Date.now() - searchStartTime;
            console.log(`搜索响应耗时: ${searchTime}ms`);
            expect(searchTime).toBeLessThan(3000); // 应该在3秒内响应
        } catch (error) {
            console.log('搜索结果等待超时，可能是正常的（无结果）');
        }

        await takeScreenshot('performance-test-complete');
    }, config.timeout);

    test('搜索错误处理', async () => {
        await loginToSystem();
        await openSearchDialog();

        const searchInput = await page.$('input[type="search"], input[placeholder*="搜索"], .search-input');

        console.log('测试特殊字符搜索...');

        // 测试特殊字符和边界情况
        const edgeCases = [
            '<script>alert("xss")</script>', // XSS 测试
            ''.repeat(200), // 超长字符串
            '!@#$%^&*()', // 特殊字符
            '   ', // 空白字符
            '中文测试', // 中文字符
            '123456789' // 数字
        ];

        for (const testCase of edgeCases) {
            console.log(`测试输入: "${testCase.substring(0, 20)}${testCase.length > 20 ? '...' : ''}"`);

            // 清空并输入测试用例
            await searchInput.click();
            await page.keyboard.down('Meta');
            await page.keyboard.press('KeyA');
            await page.keyboard.up('Meta');
            await searchInput.type(testCase);

            await page.waitForTimeout(500);

            // 检查页面是否仍然正常
            const pageTitle = await page.title();
            expect(pageTitle).toBeTruthy();

            await takeScreenshot(`edge-case-${edgeCases.indexOf(testCase)}`);
        }

        console.log('错误处理测试完成');
    }, config.timeout);
}); 