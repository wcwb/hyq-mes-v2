const puppeteer = require('puppeteer');

describe('Debug Login Page', function() {
    this.timeout(30000);
    
    let browser;
    let page;
    const baseUrl = 'http://localhost:8000';
    
    before(async function() {
        browser = await puppeteer.launch({
            headless: false,
            slowMo: 100,
            devtools: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    });
    
    after(async function() {
        if (browser) {
            await browser.close();
        }
    });
    
    it('应该能够访问登录页面并检查表单元素', async function() {
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        
        console.log('导航到登录页面...');
        await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle0' });
        
        console.log('当前URL:', page.url());
        
        // 截图保存
        await page.screenshot({ path: 'login-page-debug.png' });
        
        // 获取页面HTML结构
        const html = await page.content();
        console.log('页面HTML长度:', html.length);
        
        // 查找所有输入框
        const inputs = await page.$$eval('input', elements => 
            elements.map(el => ({
                type: el.type,
                name: el.name,
                placeholder: el.placeholder,
                id: el.id,
                className: el.className
            }))
        );
        
        console.log('找到的输入框:', inputs);
        
        // 查找所有按钮
        const buttons = await page.$$eval('button, input[type="submit"]', elements => 
            elements.map(el => ({
                type: el.type,
                textContent: el.textContent.trim(),
                className: el.className,
                id: el.id
            }))
        );
        
        console.log('找到的按钮:', buttons);
        
        // 查找表单
        const forms = await page.$$eval('form', elements => 
            elements.map(el => ({
                action: el.action,
                method: el.method,
                className: el.className
            }))
        );
        
        console.log('找到的表单:', forms);
        
        // 等待用户观察页面
        await page.waitForTimeout(5000);
        
        await page.close();
    });
});