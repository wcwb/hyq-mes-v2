/**
 * 登录辅助函数测试
 * 验证新的 performLogin 函数是否正常工作
 */

const puppeteer = require('puppeteer');

describe('登录辅助函数测试', () => {
    let browser;
    let page;

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: global.TEST_CONFIG.headless,
            slowMo: global.TEST_CONFIG.slowMo,
            devtools: global.TEST_CONFIG.devtools,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    });

    beforeEach(async () => {
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
    });

    afterEach(async () => {
        if (page) {
            await page.close();
        }
    });

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    test('登录辅助函数应该成功执行登录流程', async () => {
        // 使用登录辅助函数
        const loginSuccess = await global.testHelpers.performLogin(page);
        
        expect(loginSuccess).toBe(true);
        
        // 验证已跳转离开登录页面
        const currentUrl = page.url();
        expect(currentUrl).not.toContain('/login');
        
        console.log('登录成功，当前页面URL:', currentUrl);
    });
});