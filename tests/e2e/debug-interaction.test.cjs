const puppeteer = require('puppeteer');

describe('Debug SearchBar Interaction', function() {
    this.timeout(60000);
    
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
            slowMo: 200,
            devtools: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        
        // 监听控制台消息
        page.on('console', msg => {
            console.log(`浏览器控制台 [${msg.type()}]:`, msg.text());
        });
        
        // 执行登录
        console.log('执行登录...');
        await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle0' });
        await page.waitForSelector('#login');
        await page.type('#login', credentials.email);
        await page.type('#password', credentials.password);
        
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }),
            page.click('button[type="submit"]')
        ]);
        
        console.log('登录完成，当前URL:', page.url());
        
        // 导航到包含SearchBar的页面
        if (page.url().includes('/login')) {
            console.log('仍在登录页面，尝试导航到仪表板...');
            await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle0' });
            console.log('导航后URL:', page.url());
        }
    });
    
    after(async function() {
        if (browser) {
            await browser.close();
        }
    });
    
    it('应该能够调试SearchBar交互', async function() {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('查找SearchBar按钮...');
        
        // 查找所有可能的搜索按钮
        const searchButtons = await page.$$eval('button, [role="button"], [role="combobox"]', buttons =>
            buttons.map(btn => ({
                tagName: btn.tagName,
                role: btn.getAttribute('role'),
                ariaLabel: btn.getAttribute('aria-label'),
                textContent: btn.textContent.trim().substring(0, 50),
                className: btn.className.substring(0, 100)
            }))
        );
        
        console.log('找到的按钮元素:', searchButtons);
        
        // 查找具体的搜索按钮
        const searchButton = await page.$('[aria-label="Open global search (⌘K)"]');
        
        if (searchButton) {
            console.log('找到搜索按钮，准备点击...');
            
            // 获取按钮的详细信息
            const buttonInfo = await page.evaluate((element) => {
                return {
                    role: element.getAttribute('role'),
                    ariaExpanded: element.getAttribute('aria-expanded'),
                    ariaHaspopup: element.getAttribute('aria-haspopup'),
                    ariaControls: element.getAttribute('aria-controls'),
                    onclick: element.onclick ? 'has onclick' : 'no onclick',
                    eventListeners: element.getEventListeners ? 'can check listeners' : 'cannot check listeners'
                };
            }, searchButton);
            
            console.log('按钮详细信息:', buttonInfo);
            
            // 点击按钮
            await searchButton.click();
            console.log('已点击搜索按钮');
            
            // 等待一段时间
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 检查页面状态
            console.log('检查页面状态...');
            
            // 查找所有可能的对话框元素
            const dialogs = await page.$$eval('[role="dialog"], .dialog, .search-dialog, .modal', elements =>
                elements.map(el => ({
                    tagName: el.tagName,
                    role: el.getAttribute('role'),
                    className: el.className,
                    id: el.id,
                    visible: window.getComputedStyle(el).display !== 'none' && 
                            window.getComputedStyle(el).visibility !== 'hidden'
                }))
            );
            
            console.log('找到的对话框元素:', dialogs);
            
            // 检查是否有任何输入框出现
            const inputs = await page.$$eval('input', inputs =>
                inputs.map(input => ({
                    type: input.type,
                    placeholder: input.placeholder,
                    visible: window.getComputedStyle(input).display !== 'none'
                }))
            );
            
            console.log('页面上的输入框:', inputs);
            
            // 截图保存状态
            await page.screenshot({ path: 'debug-after-click.png' });
            
        } else {
            console.log('未找到搜索按钮');
        }
        
        // 等待观察
        await new Promise(resolve => setTimeout(resolve, 5000));
    });
});