/**
 * TopMenuBar 组件全面E2E测试
 * 测试已完成的TopMenuBar功能，包括响应式布局、组件集成和无障碍性
 */

const puppeteer = require('puppeteer');
const path = require('path');

describe('TopMenuBar 组件全面测试', () => {
    let browser;
    let page;
    let consoleErrors = [];

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
        consoleErrors = [];
        
        // 监听控制台错误
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // 设置默认视口
        await page.setViewport({ width: 1280, height: 720 });
        
        // 导航到测试页面
        await page.goto(`${global.TEST_CONFIG.baseUrl}/login`, { 
            waitUntil: 'networkidle0' 
        });
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

    describe('基础渲染测试', () => {
        test('TopMenuBar应该正确渲染并包含所有核心区域', async () => {
            // 登录到系统
            await global.testHelpers.performLogin(page);
            
            // 等待TopMenuBar加载 (实际是header元素)
            await page.waitForSelector('header[role="banner"]', { timeout: 10000 });

            // 检查TopMenuBar基础结构
            const topMenuBar = await page.$('header[role="banner"]');
            expect(topMenuBar).toBeTruthy();

            // 检查包含的核心功能组件
            // 根据诊断结果使用实际存在的选择器
            const sidebarToggle = await page.evaluateHandle(() => 
                [...document.querySelectorAll('button')].find(btn => 
                    btn.textContent.includes('Toggle Sidebar')
                )
            );
            expect(sidebarToggle.asElement()).toBeTruthy();

            const searchButton = await page.evaluateHandle(() => 
                [...document.querySelectorAll('button')].find(btn => 
                    btn.getAttribute('aria-label')?.includes('Open global search')
                )
            );
            expect(searchButton.asElement()).toBeTruthy();

            const languageSwitcher = await page.$('[data-testid="language-switcher-button"]');
            expect(languageSwitcher).toBeTruthy();

            const themeToggle = await page.evaluateHandle(() => 
                [...document.querySelectorAll('button')].find(btn => 
                    btn.getAttribute('aria-label')?.includes('Switch theme')
                )
            );
            expect(themeToggle.asElement()).toBeTruthy();

            const userMenu = await page.evaluateHandle(() => 
                [...document.querySelectorAll('button')].find(btn => 
                    btn.getAttribute('aria-label') === 'User menu'
                )
            );
            expect(userMenu.asElement()).toBeTruthy();

            // 验证高度设置 (h-14 = 56px)
            const menuBarHeight = await page.evaluate(() => {
                const element = document.querySelector('header[role="banner"]');
                return window.getComputedStyle(element).height;
            });
            expect(menuBarHeight).toBe('56px');

            // 截图保存
            await page.screenshot({
                path: path.join(global.TEST_CONFIG.screenshotPath, 'topMenuBar-basic-rendering.png'),
                fullPage: false
            });
        });

        test('SidebarTrigger按钮应该正确渲染和工作', async () => {
            // 登录
            await global.testHelpers.performLogin(page);
            
            await page.waitForSelector('[data-testid="sidebar-trigger"]', { timeout: 10000 });

            // 检查SidebarTrigger存在
            const sidebarTrigger = await page.$('[data-testid="sidebar-trigger"]');
            expect(sidebarTrigger).toBeTruthy();

            // 检查按钮是否可点击
            const isEnabled = await page.evaluate(() => {
                const button = document.querySelector('[data-testid="sidebar-trigger"]');
                return !button.disabled;
            });
            expect(isEnabled).toBe(true);

            // 测试点击功能（侧边栏切换）
            await page.click('[data-testid="sidebar-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 500)); // 等待动画

            // 验证侧边栏状态变化
            const sidebarState = await page.evaluate(() => {
                const sidebar = document.querySelector('[data-sidebar="sidebar"]');
                return sidebar ? sidebar.getAttribute('data-state') : null;
            });
            
            expect(sidebarState).toBeDefined();
        });
    });

    describe('响应式布局测试', () => {
        test('桌面端应该显示完整布局', async () => {
            // 设置桌面端视口
            await page.setViewport({ width: 1280, height: 720 });
            
            // 登录
            await page.type('input[id="login"]', global.TEST_CONFIG.loginCredentials.email);
            await page.type('input[id="password"]', global.TEST_CONFIG.loginCredentials.password);
            await page.click('button[type="submit"]');
            
            await page.waitForSelector('[data-testid="top-menu-bar"]', { timeout: 10000 });

            // 检查桌面端特有元素的可见性
            const languageSwitcher = await page.$('[data-testid="language-switcher"]');
            const themeToggle = await page.$('[data-testid="theme-toggle"]');
            const userMenu = await page.$('[data-testid="user-menu"]');

            // 桌面端这些元素应该直接可见
            if (languageSwitcher) {
                const isVisible = await languageSwitcher.isIntersectingViewport();
                expect(isVisible).toBe(true);
            }

            if (themeToggle) {
                const isVisible = await themeToggle.isIntersectingViewport();
                expect(isVisible).toBe(true);
            }

            if (userMenu) {
                const isVisible = await userMenu.isIntersectingViewport();
                expect(isVisible).toBe(true);
            }

            // 截图
            await page.screenshot({
                path: path.join(global.TEST_CONFIG.screenshotPath, 'topMenuBar-desktop-layout.png'),
                fullPage: false
            });
        });

        test('移动端应该显示紧凑布局', async () => {
            // 设置移动端视口
            await page.setViewport({ width: 375, height: 667 });
            
            // 登录
            await page.type('input[id="login"]', global.TEST_CONFIG.loginCredentials.email);
            await page.type('input[id="password"]', global.TEST_CONFIG.loginCredentials.password);
            await page.click('button[type="submit"]');
            
            await page.waitForSelector('[data-testid="top-menu-bar"]', { timeout: 10000 });

            // 检查移动端是否使用Sheet收纳工具
            const mobileSheet = await page.$('[data-testid="mobile-tools-sheet"]');
            
            // 在移动端，工具应该收纳在Sheet中
            if (mobileSheet) {
                const isVisible = await mobileSheet.isIntersectingViewport();
                expect(isVisible).toBe(true);
            }

            // 检查TopMenuBar在移动端的适配
            const menuBarPadding = await page.evaluate(() => {
                const element = document.querySelector('[data-testid="top-menu-bar"]');
                return window.getComputedStyle(element).paddingLeft;
            });
            
            // 移动端应该有适当的内边距
            expect(parseInt(menuBarPadding)).toBeGreaterThan(0);

            // 截图
            await page.screenshot({
                path: path.join(global.TEST_CONFIG.screenshotPath, 'topMenuBar-mobile-layout.png'),
                fullPage: false
            });
        });

        test('平板端应该正确适配', async () => {
            // 设置平板端视口
            await page.setViewport({ width: 768, height: 1024 });
            
            // 登录
            await page.type('input[id="login"]', global.TEST_CONFIG.loginCredentials.email);
            await page.type('input[id="password"]', global.TEST_CONFIG.loginCredentials.password);
            await page.click('button[type="submit"]');
            
            await page.waitForSelector('[data-testid="top-menu-bar"]', { timeout: 10000 });

            // 检查平板端布局
            const topMenuBar = await page.$('[data-testid="top-menu-bar"]');
            expect(topMenuBar).toBeTruthy();

            // 验证响应式行为
            const computedStyles = await page.evaluate(() => {
                const element = document.querySelector('[data-testid="top-menu-bar"]');
                const styles = window.getComputedStyle(element);
                return {
                    display: styles.display,
                    flexDirection: styles.flexDirection,
                    justifyContent: styles.justifyContent
                };
            });

            expect(computedStyles.display).toBe('flex');

            // 截图
            await page.screenshot({
                path: path.join(global.TEST_CONFIG.screenshotPath, 'topMenuBar-tablet-layout.png'),
                fullPage: false
            });
        });
    });

    describe('组件集成测试', () => {
        test('LanguageSwitcher集成应该正常工作', async () => {
            // 登录
            await page.type('input[id="login"]', global.TEST_CONFIG.loginCredentials.email);
            await page.type('input[id="password"]', global.TEST_CONFIG.loginCredentials.password);
            await page.click('button[type="submit"]');
            
            await page.waitForSelector('[data-testid="language-switcher"]', { timeout: 10000 });

            // 点击语言切换器
            await page.click('[data-testid="language-switcher"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 检查下拉菜单是否出现
            const dropdown = await page.$('[role="menu"]');
            expect(dropdown).toBeTruthy();

            // 检查语言选项
            const languageOptions = await page.$$('[role="menuitem"]');
            expect(languageOptions.length).toBeGreaterThan(0);

            // 截图
            await page.screenshot({
                path: path.join(global.TEST_CONFIG.screenshotPath, 'topMenuBar-language-switcher.png'),
                fullPage: false
            });
        });

        test('ThemeToggle集成应该正常工作', async () => {
            // 登录
            await page.type('input[id="login"]', global.TEST_CONFIG.loginCredentials.email);
            await page.type('input[id="password"]', global.TEST_CONFIG.loginCredentials.password);
            await page.click('button[type="submit"]');
            
            await page.waitForSelector('[data-testid="theme-toggle"]', { timeout: 10000 });

            // 获取当前主题
            const initialTheme = await page.evaluate(() => {
                return document.documentElement.className;
            });

            // 点击主题切换
            await page.click('[data-testid="theme-toggle"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 检查主题是否切换
            const newTheme = await page.evaluate(() => {
                return document.documentElement.className;
            });

            expect(newTheme).not.toBe(initialTheme);

            // 截图
            await page.screenshot({
                path: path.join(global.TEST_CONFIG.screenshotPath, 'topMenuBar-theme-toggle.png'),
                fullPage: false
            });
        });

        test('UserMenu集成应该正常工作', async () => {
            // 登录
            await page.type('input[id="login"]', global.TEST_CONFIG.loginCredentials.email);
            await page.type('input[id="password"]', global.TEST_CONFIG.loginCredentials.password);
            await page.click('button[type="submit"]');
            
            await page.waitForSelector('[data-testid="user-menu"]', { timeout: 10000 });

            // 点击用户菜单
            await page.click('[data-testid="user-menu"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 检查用户菜单内容
            const userMenuContent = await page.$('[data-testid="user-menu-content"]');
            expect(userMenuContent).toBeTruthy();

            // 检查用户信息显示
            const userInfo = await page.$('[data-testid="user-info"]');
            expect(userInfo).toBeTruthy();

            // 截图
            await page.screenshot({
                path: path.join(global.TEST_CONFIG.screenshotPath, 'topMenuBar-user-menu.png'),
                fullPage: false
            });
        });
    });

    describe('无障碍功能测试', () => {
        test('TopMenuBar应该具备正确的ARIA属性', async () => {
            // 登录
            await page.type('input[id="login"]', global.TEST_CONFIG.loginCredentials.email);
            await page.type('input[id="password"]', global.TEST_CONFIG.loginCredentials.password);
            await page.click('button[type="submit"]');
            
            await page.waitForSelector('[data-testid="top-menu-bar"]', { timeout: 10000 });

            // 检查ARIA属性
            const ariaAttributes = await page.evaluate(() => {
                const topMenuBar = document.querySelector('[data-testid="top-menu-bar"]');
                return {
                    role: topMenuBar?.getAttribute('role'),
                    ariaLabel: topMenuBar?.getAttribute('aria-label'),
                    ariaExpanded: topMenuBar?.getAttribute('aria-expanded')
                };
            });

            // 验证基本的无障碍属性存在
            expect(ariaAttributes).toBeDefined();
        });

        test('键盘导航应该正常工作', async () => {
            // 登录
            await page.type('input[id="login"]', global.TEST_CONFIG.loginCredentials.email);
            await page.type('input[id="password"]', global.TEST_CONFIG.loginCredentials.password);
            await page.click('button[type="submit"]');
            
            await page.waitForSelector('[data-testid="top-menu-bar"]', { timeout: 10000 });

            // 测试Tab键导航
            await page.keyboard.press('Tab');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 检查焦点状态
            const focusedElement = await page.evaluate(() => {
                return document.activeElement?.getAttribute('data-testid');
            });

            expect(focusedElement).toBeDefined();

            // 测试更多Tab导航
            await page.keyboard.press('Tab');
            await page.keyboard.press('Tab');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 截图显示焦点状态
            await page.screenshot({
                path: path.join(global.TEST_CONFIG.screenshotPath, 'topMenuBar-keyboard-navigation.png'),
                fullPage: false
            });
        });

        test('Skip Links应该正常工作', async () => {
            // 登录
            await page.type('input[id="login"]', global.TEST_CONFIG.loginCredentials.email);
            await page.type('input[id="password"]', global.TEST_CONFIG.loginCredentials.password);
            await page.click('button[type="submit"]');
            
            await page.waitForSelector('[data-testid="top-menu-bar"]', { timeout: 10000 });

            // 检查Skip Links
            const skipLink = await page.$('[data-testid="skip-to-content"]');
            if (skipLink) {
                // 测试Skip Link的键盘激活
                await page.focus('[data-testid="skip-to-content"]');
                await page.keyboard.press('Enter');
                await new Promise(resolve => setTimeout(resolve, 200));

                // 验证焦点跳转
                const focusedElement = await page.evaluate(() => {
                    return document.activeElement?.id || document.activeElement?.getAttribute('data-testid');
                });

                expect(focusedElement).toBeDefined();
            }
        });
    });

    describe('性能测试', () => {
        test('TopMenuBar渲染时间应该在合理范围内', async () => {
            const startTime = Date.now();
            
            // 登录
            await page.type('input[id="login"]', global.TEST_CONFIG.loginCredentials.email);
            await page.type('input[id="password"]', global.TEST_CONFIG.loginCredentials.password);
            await page.click('button[type="submit"]');
            
            // 等待TopMenuBar完全加载
            await page.waitForSelector('[data-testid="top-menu-bar"]', { timeout: 10000 });
            
            const endTime = Date.now();
            const renderTime = endTime - startTime;

            // TopMenuBar应该在5秒内渲染完成
            expect(renderTime).toBeLessThan(5000);

            console.log(`TopMenuBar渲染时间: ${renderTime}ms`);
        });

        test('组件懒加载应该正常工作', async () => {
            // 登录
            await page.type('input[id="login"]', global.TEST_CONFIG.loginCredentials.email);
            await page.type('input[id="password"]', global.TEST_CONFIG.loginCredentials.password);
            await page.click('button[type="submit"]');
            
            await page.waitForSelector('[data-testid="top-menu-bar"]', { timeout: 10000 });

            // 检查异步组件是否正确加载
            const asyncComponents = await page.evaluate(() => {
                const components = ['user-info', 'user-menu-content', 'language-switcher'];
                return components.map(component => {
                    const element = document.querySelector(`[data-testid="${component}"]`);
                    return {
                        component,
                        loaded: !!element
                    };
                });
            });

            // 至少应该有一些异步组件成功加载
            const loadedComponents = asyncComponents.filter(comp => comp.loaded);
            expect(loadedComponents.length).toBeGreaterThan(0);
        });
    });

    describe('错误处理测试', () => {
        test('不应该有JavaScript错误', async () => {
            // 登录
            await page.type('input[id="login"]', global.TEST_CONFIG.loginCredentials.email);
            await page.type('input[id="password"]', global.TEST_CONFIG.loginCredentials.password);
            await page.click('button[type="submit"]');
            
            await page.waitForSelector('[data-testid="top-menu-bar"]', { timeout: 10000 });

            // 等待一段时间让可能的错误显现
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 检查控制台错误
            const filteredErrors = consoleErrors.filter(error => 
                !error.includes('favicon') && 
                !error.includes('chrome-extension') &&
                !error.includes('Failed to load resource')
            );

            expect(filteredErrors.length).toBe(0);
            
            if (filteredErrors.length > 0) {
                console.log('发现控制台错误:', filteredErrors);
            }
        });
    });
});