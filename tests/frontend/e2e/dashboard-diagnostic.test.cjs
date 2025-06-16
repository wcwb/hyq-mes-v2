/**
 * Dashboard页面结构诊断测试
 * 用于检查登录后dashboard页面的实际DOM结构
 */

const puppeteer = require('puppeteer');

describe('Dashboard页面结构诊断', () => {
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

    test('应该能够分析Dashboard页面的DOM结构', async () => {
        // 登录到dashboard
        await global.testHelpers.performLogin(page);
        
        console.log('当前页面URL:', page.url());
        
        // 等待页面完全加载
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 获取页面标题
        const title = await page.title();
        console.log('页面标题:', title);
        
        // 获取页面文本内容
        const bodyText = await page.evaluate(() => document.body.innerText);
        console.log('页面文本内容 (前500字符):', bodyText.substring(0, 500));
        
        // 查找所有带data-testid的元素
        const testIdElements = await page.$$eval('[data-testid]', elements => 
            elements.map(el => ({
                testId: el.getAttribute('data-testid'),
                tagName: el.tagName.toLowerCase(),
                className: el.className,
                textContent: el.textContent.trim().substring(0, 100)
            }))
        );
        console.log('所有data-testid元素:', testIdElements);
        
        // 查找可能的菜单栏元素
        const headerElements = await page.$$eval('header, nav, [role="banner"], [role="navigation"]', elements => 
            elements.map(el => ({
                tagName: el.tagName.toLowerCase(),
                className: el.className,
                id: el.id,
                role: el.getAttribute('role'),
                textContent: el.textContent.trim().substring(0, 100)
            }))
        );
        console.log('可能的菜单栏元素:', headerElements);
        
        // 查找包含常见菜单关键词的元素
        const menuKeywords = ['menu', 'nav', 'header', 'top', 'bar', 'sidebar', 'trigger'];
        for (const keyword of menuKeywords) {
            try {
                const elements = await page.$$eval(`[class*="${keyword}"], [id*="${keyword}"]`, elements => 
                    elements.map(el => ({
                        keyword: keyword,
                        tagName: el.tagName.toLowerCase(),
                        className: el.className,
                        id: el.id,
                        textContent: el.textContent.trim().substring(0, 50)
                    }))
                );
                if (elements.length > 0) {
                    console.log(`包含"${keyword}"的元素:`, elements);
                }
            } catch (e) {
                // 忽略查找错误
            }
        }
        
        // 查找按钮元素
        const buttons = await page.$$eval('button', buttons => 
            buttons.map(button => ({
                textContent: button.textContent.trim(),
                className: button.className,
                id: button.id,
                type: button.type,
                ariaLabel: button.getAttribute('aria-label')
            }))
        );
        console.log('页面中的按钮元素:', buttons);
        
        // 截图保存当前状态
        await page.screenshot({
            path: `${global.TEST_CONFIG.screenshotPath}/dashboard-structure-analysis.png`,
            fullPage: true
        });
        
        // 验证至少登录成功了
        expect(page.url()).toContain('/dashboard');
        expect(bodyText.length).toBeGreaterThan(0);
    });
});