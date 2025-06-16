const puppeteer = require('puppeteer');

describe('Login Test Only', function() {
    this.timeout(30000);
    
    let browser;
    let page;
    const baseUrl = 'http://localhost:8000';
    const credentials = {
        email: 'james@hyq.com',
        password: 'juWveg-kegnyq-3dewxu'
    };
    
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
    
    it('应该能够成功登录', async function() {
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        
        // 监听网络请求
        await page.setRequestInterception(true);
        page.on('request', request => {
            console.log('请求:', request.method(), request.url());
            request.continue();
        });
        
        page.on('response', response => {
            console.log('响应:', response.status(), response.url());
        });
        
        console.log('导航到登录页面...');
        await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle0' });
        
        // 等待登录表单加载
        await page.waitForSelector('#login');
        
        // 输入凭据
        await page.type('#login', credentials.email);
        await page.type('#password', credentials.password);
        
        console.log('已输入登录凭据');
        
        // 截图
        await page.screenshot({ path: 'before-login.png' });
        
        // 点击登录按钮并等待响应
        const [response] = await Promise.all([
            page.waitForResponse(response => response.url().includes('/login') && response.request().method() === 'POST'),
            page.click('button[type="submit"]')
        ]);
        
        console.log('登录响应状态:', response.status());
        console.log('响应URL:', response.url());
        
        // 等待页面可能的跳转
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('登录后当前URL:', page.url());
        
        // 截图
        await page.screenshot({ path: 'after-login.png' });
        
        // 检查响应内容
        if (response.status() === 422) {
            const responseBody = await response.text();
            console.log('422错误响应:', responseBody);
        }
        
        // 检查页面是否有错误消息
        const errorMessages = await page.$$eval('.alert-danger, .error, .invalid-feedback, [role="alert"]', 
            elements => elements.map(el => el.textContent.trim())
        );
        
        if (errorMessages.length > 0) {
            console.log('页面错误消息:', errorMessages);
        }
        
        // 等待观察
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        await page.close();
    });
});