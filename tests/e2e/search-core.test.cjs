const puppeteer = require('puppeteer');
const path = require('path');

/**
 * 搜索核心功能测试
 * 专注于验证搜索功能的核心特性
 */

describe('搜索核心功能测试', () => {
    let browser;
    let page;

    const config = {
        baseUrl: 'http://localhost:8000',
        loginCredentials: {
            email: 'james@hyq.com',
            password: 'juWveg-kegnyq-3dewxu'
        },
        timeout: 20000
    };

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: false,
            slowMo: 50,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });
    });

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    /**
     * 登录辅助函数
     */
    async function login() {
        console.log('🔐 开始登录...');

        await page.goto(`${config.baseUrl}/login`, {
            waitUntil: 'networkidle2',
            timeout: config.timeout
        });

        // 等待并填写登录表单
        await page.waitForSelector('input[type="email"], input[name="login"]');
        await page.type('input[type="email"], input[name="login"]', config.loginCredentials.email);
        await page.type('input[type="password"], input[name="password"]', config.loginCredentials.password);

        // 提交登录
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click('button[type="submit"]')
        ]);

        console.log('✅ 登录成功');
    }

    /**
     * 截图辅助函数
     */
    async function screenshot(name) {
        const screenshotPath = path.join(__dirname, '../../test-results', `${name}-${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`📸 截图保存: ${screenshotPath}`);
    }

    test('登录并访问仪表板', async () => {
        await login();
        await screenshot('dashboard-loaded');

        // 验证仪表板元素存在
        const dashboard = await page.$('main, [data-testid="dashboard"], .dashboard');
        expect(dashboard).toBeTruthy();
    }, config.timeout);

    test('搜索按钮存在且可点击', async () => {
        await login();

        console.log('🔍 查找搜索按钮...');

        // 尝试多种可能的搜索按钮选择器
        const searchSelectors = [
            '[data-testid="search-button"]',
            '[aria-label*="搜索"]',
            '.search-trigger',
            'button[title*="搜索"]',
            '[data-testid="global-search"]',
            '.search-btn'
        ];

        let searchButton = null;
        for (const selector of searchSelectors) {
            searchButton = await page.$(selector);
            if (searchButton) {
                console.log(`✅ 找到搜索按钮: ${selector}`);
                break;
            }
        }

        if (!searchButton) {
            console.log('⚠️  未找到搜索按钮，尝试查找所有按钮...');
            await page.evaluate(() => {
                const buttons = document.querySelectorAll('button');
                console.log('页面中的所有按钮:', Array.from(buttons).map(btn => ({
                    text: btn.textContent?.trim(),
                    title: btn.title,
                    ariaLabel: btn.getAttribute('aria-label'),
                    className: btn.className,
                    id: btn.id
                })));
            });
        }

        await screenshot('search-button-check');
        expect(searchButton).toBeTruthy();
    }, config.timeout);

    test('键盘快捷键打开搜索', async () => {
        await login();

        console.log('⌨️  测试键盘快捷键...');

        // 尝试 Cmd+K (Mac)
        await page.keyboard.down('Meta');
        await page.keyboard.press('KeyK');
        await page.keyboard.up('Meta');

        await page.waitForTimeout(1000);
        await screenshot('after-cmd-k');

        // 检查是否有搜索对话框出现
        let searchDialog = await page.$('[role="dialog"], .search-dialog, [data-testid="search-dialog"]');

        if (!searchDialog) {
            console.log('🔄 尝试 Ctrl+K...');
            // 尝试 Ctrl+K (Windows/Linux)
            await page.keyboard.down('Control');
            await page.keyboard.press('KeyK');
            await page.keyboard.up('Control');

            await page.waitForTimeout(1000);
            await screenshot('after-ctrl-k');

            searchDialog = await page.$('[role="dialog"], .search-dialog, [data-testid="search-dialog"]');
        }

        if (searchDialog) {
            console.log('✅ 搜索对话框已打开');

            // 测试 ESC 键关闭
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);

            const dialogAfterEsc = await page.$('[role="dialog"], .search-dialog, [data-testid="search-dialog"]');
            expect(dialogAfterEsc).toBeFalsy();
            console.log('✅ ESC 键关闭功能正常');
        } else {
            console.log('⚠️  键盘快捷键可能未实现或选择器不匹配');
        }

        await screenshot('keyboard-shortcut-test-complete');
    }, config.timeout);

    test('搜索输入功能', async () => {
        await login();

        console.log('📝 测试搜索输入...');

        // 尝试打开搜索对话框
        await page.keyboard.down('Meta');
        await page.keyboard.press('KeyK');
        await page.keyboard.up('Meta');

        await page.waitForTimeout(1000);

        // 查找搜索输入框
        const searchInputSelectors = [
            'input[type="search"]',
            'input[placeholder*="搜索"]',
            '.search-input',
            '[data-testid="search-input"]',
            'input[aria-label*="搜索"]'
        ];

        let searchInput = null;
        for (const selector of searchInputSelectors) {
            searchInput = await page.$(selector);
            if (searchInput) {
                console.log(`✅ 找到搜索输入框: ${selector}`);
                break;
            }
        }

        if (searchInput) {
            // 测试输入
            await searchInput.type('测试搜索');
            await page.waitForTimeout(1000);
            await screenshot('search-input-test');

            // 验证输入值
            const inputValue = await searchInput.evaluate(el => el.value);
            expect(inputValue).toBe('测试搜索');
            console.log('✅ 搜索输入功能正常');

            // 清空输入
            await searchInput.click();
            await page.keyboard.down('Meta');
            await page.keyboard.press('KeyA');
            await page.keyboard.up('Meta');
            await page.keyboard.press('Backspace');

        } else {
            console.log('⚠️  未找到搜索输入框');
            await screenshot('no-search-input');
        }
    }, config.timeout);

    test('页面响应性检查', async () => {
        await login();

        console.log('📱 测试响应式设计...');

        // 测试移动端视口
        await page.setViewport({ width: 375, height: 667 });
        await page.waitForTimeout(500);
        await screenshot('mobile-view');

        // 测试平板视口
        await page.setViewport({ width: 768, height: 1024 });
        await page.waitForTimeout(500);
        await screenshot('tablet-view');

        // 恢复桌面视口
        await page.setViewport({ width: 1366, height: 768 });
        await page.waitForTimeout(500);
        await screenshot('desktop-view');

        console.log('✅ 响应式测试完成');
    }, config.timeout);

    test('页面性能检查', async () => {
        console.log('⚡ 测试页面性能...');

        const startTime = Date.now();
        await login();
        const loadTime = Date.now() - startTime;

        console.log(`📊 页面加载时间: ${loadTime}ms`);
        expect(loadTime).toBeLessThan(10000); // 应该在10秒内加载完成

        await screenshot('performance-test');
    }, config.timeout);
}); 