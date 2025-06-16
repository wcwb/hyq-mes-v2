const puppeteer = require('puppeteer');
const { expect } = require('chai');

describe('SearchBar E2E Tests', function() {
    this.timeout(30000); // 30秒超时
    
    let browser;
    let page;
    const baseUrl = 'http://localhost:8000'; // Laravel应用URL
    const credentials = {
        email: 'james@hyq.com',
        password: 'juWveg-kegnyq-3dewxu'
    };
    
    before(async function() {
        // 启动浏览器
        browser = await puppeteer.launch({
            headless: false, // 设置为true可以在无头模式下运行
            slowMo: 50, // 减慢操作速度便于观察
            devtools: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    });
    
    // 登录辅助函数
    async function login(page) {
        console.log('开始登录流程...');
        
        // 导航到登录页面
        await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle0' });
        
        // 等待登录表单加载
        await page.waitForSelector('#login', { timeout: 10000 });
        
        // 查找用户名输入框（通过ID）
        const emailInput = await page.$('#login');
        
        if (!emailInput) {
            throw new Error('找不到用户名输入框');
        }
        
        // 查找密码输入框（通过ID）
        const passwordInput = await page.$('#password');
        
        if (!passwordInput) {
            throw new Error('找不到密码输入框');
        }
        
        // 输入凭据
        await emailInput.type(credentials.email);
        await passwordInput.type(credentials.password);
        
        console.log('已输入登录凭据');
        
        // 查找并点击登录按钮
        const loginButton = await page.$('button[type="submit"]');
        
        if (!loginButton) {
            throw new Error('找不到登录按钮');
        }
        
        // 点击登录按钮并等待导航
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }),
            loginButton.click()
        ]);
        console.log('已点击登录按钮并等待导航完成');
        
        // 验证登录是否成功（检查当前URL）
        const currentUrl = page.url();
        console.log('当前URL:', currentUrl);
        
        if (currentUrl.includes('/login')) {
            throw new Error('登录失败，仍在登录页面');
        }
        
        // 检查是否重定向到了仪表板或其他认证后的页面
        if (currentUrl.includes('/dashboard') || !currentUrl.includes('/login')) {
            console.log('登录成功，已重定向到:', currentUrl);
        }
        
        console.log('登录验证通过');
    }
    
    beforeEach(async function() {
        // 为每个测试创建新页面
        page = await browser.newPage();
        
        // 设置视口大小
        await page.setViewport({ width: 1280, height: 720 });
        
        // 监听控制台消息（用于调试）
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('页面错误:', msg.text());
            }
        });
        
        // 执行登录
        await login(page);
        
        // 导航到测试页面
        await page.goto(`${baseUrl}/test/topmenubar`, { 
            waitUntil: 'networkidle0' 
        });
        
        // 等待SearchBar组件加载
        await page.waitForSelector('[aria-label="搜索"]', { timeout: 10000 });
        console.log('SearchBar组件已加载');
    });
    
    afterEach(async function() {
        if (page) {
            await page.close();
        }
    });
    
    after(async function() {
        if (browser) {
            await browser.close();
        }
    });
    
    describe('SearchBar 基础功能测试', function() {
        it('应该显示搜索触发器按钮', async function() {
            const searchButton = await page.$('[aria-label="搜索"]');
            expect(searchButton).to.not.be.null;
            
            // 检查按钮文本
            const buttonText = await page.$eval('[aria-label="搜索"]', el => el.textContent);
            expect(buttonText).to.include('搜索页面、订单、产品');
        });
        
        it('应该显示键盘快捷键提示', async function() {
            const shortcutHint = await page.$('kbd');
            expect(shortcutHint).to.not.be.null;
            
            const shortcutText = await page.$eval('kbd', el => el.textContent);
            expect(shortcutText).to.match(/⌘K|Ctrl\+K/);
        });
        
        it('应该有正确的无障碍属性', async function() {
            const searchButton = await page.$('[aria-label="搜索"]');
            
            // 检查ARIA属性
            const role = await page.$eval('[aria-label="搜索"]', el => el.getAttribute('role'));
            const ariaExpanded = await page.$eval('[aria-label="搜索"]', el => el.getAttribute('aria-expanded'));
            const ariaHaspopup = await page.$eval('[aria-label="搜索"]', el => el.getAttribute('aria-haspopup'));
            
            expect(role).to.equal('combobox');
            expect(ariaExpanded).to.equal('false');
            expect(ariaHaspopup).to.equal('listbox');
        });
    });
    
    describe('SearchDialog 交互测试', function() {
        it('点击搜索按钮应该打开搜索对话框', async function() {
            // 点击搜索按钮
            await page.click('[aria-label="搜索"]');
            
            // 等待对话框出现
            await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
            
            // 验证对话框是否可见
            const dialog = await page.$('[role="dialog"]');
            expect(dialog).to.not.be.null;
            
            // 验证搜索输入框是否获得焦点
            const activeElement = await page.evaluateHandle(() => document.activeElement);
            const inputElement = await page.$('input[placeholder*="搜索"]');
            const isFocused = await page.evaluate((active, input) => active === input, activeElement, inputElement);
            expect(isFocused).to.be.true;
        });
        
        it('应该能够输入搜索内容', async function() {
            // 打开搜索对话框
            await page.click('[aria-label="搜索"]');
            await page.waitForSelector('input[placeholder*="搜索"]');
            
            // 输入搜索内容
            const searchTerm = '订单';
            await page.type('input[placeholder*="搜索"]', searchTerm);
            
            // 验证输入内容
            const inputValue = await page.$eval('input[placeholder*="搜索"]', el => el.value);
            expect(inputValue).to.equal(searchTerm);
        });
        
        it('应该显示搜索结果', async function() {
            // 打开搜索对话框
            await page.click('[aria-label="搜索"]');
            await page.waitForSelector('input[placeholder*="搜索"]');
            
            // 输入搜索内容
            await page.type('input[placeholder*="搜索"]', '订单');
            
            // 等待搜索结果
            await new Promise(resolve => setTimeout(resolve, 500)); // 等待防抖延迟
            
            // 检查是否有搜索结果
            const results = await page.$$('[role="option"]');
            expect(results.length).to.be.greaterThan(0);
        });
        
        it('应该能够选择搜索结果', async function() {
            // 打开搜索对话框
            await page.click('[aria-label="搜索"]');
            await page.waitForSelector('input[placeholder*="搜索"]');
            
            // 输入搜索内容
            await page.type('input[placeholder*="搜索"]', '订单');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 等待搜索结果并点击第一个
            await page.waitForSelector('[role="option"]');
            const firstResult = await page.$('[role="option"]');
            await firstResult.click();
            
            // 验证对话框是否关闭
            const dialog = await page.$('[role="dialog"]');
            expect(dialog).to.be.null;
        });
    });
    
    describe('键盘导航测试', function() {
        it('Ctrl+K 应该打开搜索对话框', async function() {
            // 按下 Ctrl+K (在Mac上是Cmd+K)
            await page.keyboard.down('Control');
            await page.keyboard.press('KeyK');
            await page.keyboard.up('Control');
            
            // 等待对话框出现
            await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
            
            const dialog = await page.$('[role="dialog"]');
            expect(dialog).to.not.be.null;
        });
        
        it('方向键应该能够导航搜索结果', async function() {
            // 打开搜索对话框
            await page.click('[aria-label="搜索"]');
            await page.waitForSelector('input[placeholder*="搜索"]');
            
            // 输入搜索内容
            await page.type('input[placeholder*="搜索"]', '订单');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 等待搜索结果
            await page.waitForSelector('[role="option"]');
            
            // 使用方向键导航
            await page.keyboard.press('ArrowDown');
            
            // 检查第一个结果是否被选中
            const selectedResult = await page.$('[role="option"][aria-selected="true"]');
            expect(selectedResult).to.not.be.null;
            
            // 继续向下导航
            await page.keyboard.press('ArrowDown');
            
            // 验证选中状态变化
            const selectedResults = await page.$$('[role="option"][aria-selected="true"]');
            expect(selectedResults.length).to.equal(1);
        });
        
        it('回车键应该选择当前高亮的结果', async function() {
            // 打开搜索对话框
            await page.click('[aria-label="搜索"]');
            await page.waitForSelector('input[placeholder*="搜索"]');
            
            // 输入搜索内容
            await page.type('input[placeholder*="搜索"]', '订单');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 等待搜索结果
            await page.waitForSelector('[role="option"]');
            
            // 使用方向键选择第一个结果
            await page.keyboard.press('ArrowDown');
            
            // 按回车选择
            await page.keyboard.press('Enter');
            
            // 验证对话框关闭
            const dialog = await page.$('[role="dialog"]');
            expect(dialog).to.be.null;
        });
        
        it('Escape键应该关闭搜索对话框', async function() {
            // 打开搜索对话框
            await page.click('[aria-label="搜索"]');
            await page.waitForSelector('[role="dialog"]');
            
            // 按Escape键
            await page.keyboard.press('Escape');
            
            // 验证对话框关闭
            await new Promise(resolve => setTimeout(resolve, 200));
            const dialog = await page.$('[role="dialog"]');
            expect(dialog).to.be.null;
        });
    });
    
    describe('响应式设计测试', function() {
        it('在移动端应该有合适的触摸目标尺寸', async function() {
            // 设置移动端视口
            await page.setViewport({ width: 375, height: 667 });
            
            // 重新加载页面
            await page.reload({ waitUntil: 'networkidle0' });
            await page.waitForSelector('[aria-label="搜索"]');
            
            // 检查按钮尺寸
            const buttonSize = await page.$eval('[aria-label="搜索"]', el => {
                const rect = el.getBoundingClientRect();
                return { width: rect.width, height: rect.height };
            });
            
            // 验证最小触摸目标尺寸 (44px)
            expect(buttonSize.height).to.be.at.least(44);
        });
        
        it('在桌面端应该显示完整的搜索栏', async function() {
            // 设置桌面端视口
            await page.setViewport({ width: 1280, height: 720 });
            
            // 重新加载页面
            await page.reload({ waitUntil: 'networkidle0' });
            await page.waitForSelector('[aria-label="搜索"]');
            
            // 检查搜索栏是否显示完整
            const searchBar = await page.$('[aria-label="搜索"]');
            const isVisible = await page.evaluate(el => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden';
            }, searchBar);
            
            expect(isVisible).to.be.true;
        });
    });
    
    describe('无障碍功能测试', function() {
        it('应该有Live Region用于屏幕阅读器公告', async function() {
            const liveRegion = await page.$('[aria-live="polite"]');
            expect(liveRegion).to.not.be.null;
        });
        
        it('搜索结果应该有正确的ARIA标签', async function() {
            // 打开搜索对话框
            await page.click('[aria-label="搜索"]');
            await page.waitForSelector('input[placeholder*="搜索"]');
            
            // 输入搜索内容
            await page.type('input[placeholder*="搜索"]', '订单');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 等待搜索结果
            await page.waitForSelector('[role="option"]');
            
            // 检查第一个搜索结果的ARIA属性
            const firstResult = await page.$('[role="option"]');
            const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label'), firstResult);
            
            expect(ariaLabel).to.not.be.null;
            expect(ariaLabel).to.include('订单');
        });
        
        it('应该支持焦点陷阱', async function() {
            // 打开搜索对话框
            await page.click('[aria-label="搜索"]');
            await page.waitForSelector('[role="dialog"]');
            
            // 获取对话框内的所有可聚焦元素
            const focusableElements = await page.$$eval('[role="dialog"] input, [role="dialog"] button, [role="dialog"] [tabindex]:not([tabindex="-1"])', elements => 
                elements.map(el => el.tagName.toLowerCase())
            );
            
            expect(focusableElements.length).to.be.greaterThan(0);
            
            // 测试Tab导航
            await page.keyboard.press('Tab');
            
            // 验证焦点仍在对话框内
            const activeElement = await page.evaluate(() => document.activeElement);
            const isInsideDialog = await page.evaluate((active) => {
                const dialog = document.querySelector('[role="dialog"]');
                return dialog && dialog.contains(active);
            }, activeElement);
            
            expect(isInsideDialog).to.be.true;
        });
    });
    
    describe('性能测试', function() {
        it('搜索防抖应该正常工作', async function() {
            // 打开搜索对话框
            await page.click('[aria-label="搜索"]');
            await page.waitForSelector('input[placeholder*="搜索"]');
            
            // 快速输入多个字符
            const startTime = Date.now();
            await page.type('input[placeholder*="搜索"]', '订单管理', { delay: 50 });
            
            // 等待防抖完成
            await new Promise(resolve => setTimeout(resolve, 400));
            
            // 检查是否有搜索结果
            const results = await page.$$('[role="option"]');
            expect(results.length).to.be.greaterThan(0);
            
            const endTime = Date.now();
            console.log(`搜索完成时间: ${endTime - startTime}ms`);
        });
        
        it('组件加载时间应该合理', async function() {
            const startTime = Date.now();
            
            // 重新加载页面
            await page.reload({ waitUntil: 'networkidle0' });
            
            // 等待SearchBar加载
            await page.waitForSelector('[aria-label="搜索"]');
            
            const loadTime = Date.now() - startTime;
            console.log(`SearchBar加载时间: ${loadTime}ms`);
            
            // 加载时间应该少于3秒
            expect(loadTime).to.be.below(3000);
        });
    });
    
    describe('错误处理测试', function() {
        it('应该处理空搜索结果', async function() {
            // 打开搜索对话框
            await page.click('[aria-label="搜索"]');
            await page.waitForSelector('input[placeholder*="搜索"]');
            
            // 输入不存在的搜索内容
            await page.type('input[placeholder*="搜索"]', 'xyz123notfound');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 检查是否显示"未找到结果"消息
            const noResultsMessage = await page.$eval('text="未找到相关结果"', el => el.textContent);
            expect(noResultsMessage).to.include('未找到');
        });
        
        it('应该能清空搜索内容', async function() {
            // 打开搜索对话框
            await page.click('[aria-label="搜索"]');
            await page.waitForSelector('input[placeholder*="搜索"]');
            
            // 输入搜索内容
            await page.type('input[placeholder*="搜索"]', '订单');
            
            // 等待清空按钮出现
            await page.waitForSelector('button[aria-label*="清空"], button .sr-only', { timeout: 1000 });
            
            // 点击清空按钮
            const clearButton = await page.$('button[aria-label*="清空"], button:has(.sr-only)');
            if (clearButton) {
                await clearButton.click();
                
                // 验证输入框已清空
                const inputValue = await page.$eval('input[placeholder*="搜索"]', el => el.value);
                expect(inputValue).to.equal('');
            }
        });
    });
});