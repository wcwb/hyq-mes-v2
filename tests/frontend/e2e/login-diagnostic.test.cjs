/**
 * 简单的登录测试 - 验证测试环境和登录流程
 */

const puppeteer = require('puppeteer');

describe('登录流程测试', () => {
    let browser;
    let page;

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: false,
            slowMo: 100,
            devtools: false,
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

    test('应该能够访问登录页面并找到表单元素', async () => {
        console.log('访问登录页面...');
        await page.goto('http://localhost:8000/login', { 
            waitUntil: 'networkidle0',
            timeout: 30000 
        });

        console.log('等待页面渲染...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 等待Vue应用加载
        await page.waitForSelector('#app', { timeout: 10000 });
        console.log('Vue应用已加载');

        // 等待表单渲染
        try {
            // 使用实际的选择器
            const emailSelector = await page.waitForSelector('input[id="login"]', { 
                timeout: 10000 
            });
            console.log('找到登录输入框');

            const passwordSelector = await page.waitForSelector('input[id="password"]', { 
                timeout: 5000 
            });
            console.log('找到密码输入框');

            const submitSelector = await page.waitForSelector('button[type="submit"]', { 
                timeout: 5000 
            });
            console.log('找到提交按钮');

            expect(emailSelector).toBeTruthy();
            expect(passwordSelector).toBeTruthy();
            expect(submitSelector).toBeTruthy();

        } catch (error) {
            console.error('查找表单元素失败:', error.message);
            
            // 输出页面内容用于调试
            const pageContent = await page.content();
            console.log('页面HTML长度:', pageContent.length);
            
            const bodyText = await page.evaluate(() => document.body.innerText);
            console.log('页面文本内容:', bodyText.substring(0, 500));

            // 查找所有input元素
            const inputs = await page.$$eval('input', inputs => 
                inputs.map(input => ({
                    type: input.type,
                    name: input.name,
                    id: input.id,
                    placeholder: input.placeholder,
                    className: input.className
                }))
            );
            console.log('页面中的所有input元素:', inputs);

            // 查找所有button元素
            const buttons = await page.$$eval('button', buttons => 
                buttons.map(button => ({
                    type: button.type,
                    textContent: button.textContent.trim(),
                    className: button.className,
                    id: button.id
                }))
            );
            console.log('页面中的所有button元素:', buttons);

            throw error;
        }
    });

    test('应该能够执行登录流程', async () => {
        await page.goto('http://localhost:8000/login', { 
            waitUntil: 'networkidle0',
            timeout: 30000 
        });

        // 等待Vue应用和表单加载
        await page.waitForSelector('#app', { timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 查找登录输入框
        const emailInput = await page.waitForSelector('input[id="login"]', { 
            timeout: 10000 
        });

        // 查找密码输入框
        const passwordInput = await page.waitForSelector('input[id="password"]', { 
            timeout: 5000 
        });

        // 输入登录凭据
        await emailInput.type('james@hyq.com');
        await passwordInput.type('juWveg-kegnyq-3dewxu');

        console.log('已输入登录凭据');

        // 点击登录按钮
        const submitButton = await page.waitForSelector('button[type="submit"]', { 
            timeout: 5000 
        });
        
        await submitButton.click();
        console.log('已点击登录按钮');

        // 等待页面跳转
        try {
            await page.waitForNavigation({ 
                waitUntil: 'networkidle0', 
                timeout: 15000 
            });
            console.log('登录成功，页面已跳转');

            // 检查是否跳转到dashboard
            const currentUrl = page.url();
            console.log('当前URL:', currentUrl);
            
            expect(currentUrl).not.toContain('/login');
            
        } catch (navigationError) {
            console.log('等待页面跳转超时，检查当前页面状态...');
            
            const currentUrl = page.url();
            console.log('当前URL:', currentUrl);
            
            // 检查是否有错误信息
            const errorMessages = await page.$$eval('[role="alert"], .error, .text-red-500, .text-danger', 
                elements => elements.map(el => el.textContent)
            );
            
            if (errorMessages.length > 0) {
                console.log('发现错误信息:', errorMessages);
            }

            // 如果仍在登录页面，可能是凭据错误或其他问题
            if (currentUrl.includes('/login')) {
                throw new Error('登录失败，仍在登录页面');
            }
        }
    });
});