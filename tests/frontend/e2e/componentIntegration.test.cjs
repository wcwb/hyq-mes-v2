/**
 * 现有组件集成E2E测试
 * 测试SidebarTrigger、LanguageSwitcher、ThemeToggle、UserMenu等组件的集成效果
 */

const puppeteer = require('puppeteer');
const path = require('path');

describe('现有组件集成测试', () => {
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
        
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        await page.setViewport({ width: 1280, height: 720 });
        await page.goto(`${global.TEST_CONFIG.baseUrl}/login`, { waitUntil: 'networkidle0' });
        
        // 执行登录
        await page.type('input[id="login"]', global.TEST_CONFIG.loginCredentials.email);
        await page.type('input[id="password"]', global.TEST_CONFIG.loginCredentials.password);
        await page.click('button[type="submit"]');
        await page.waitForSelector('[data-testid="top-menu-bar"]', { timeout: 10000 });
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

    describe('SidebarTrigger 集成测试', () => {
        test('SidebarTrigger应该正确控制侧边栏显示/隐藏', async () => {
            // 检查初始状态
            const initialSidebarState = await page.evaluate(() => {
                const sidebar = document.querySelector('[data-sidebar="sidebar"]');
                return sidebar ? sidebar.getAttribute('data-state') : null;
            });

            // 点击SidebarTrigger
            await page.click('[data-testid="sidebar-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 500)); // 等待动画完成

            // 检查状态变化
            const newSidebarState = await page.evaluate(() => {
                const sidebar = document.querySelector('[data-sidebar="sidebar"]');
                return sidebar ? sidebar.getAttribute('data-state') : null;
            });

            expect(newSidebarState).not.toBe(initialSidebarState);

            // 截图记录状态
            await page.screenshot({
                path: path.join(global.TEST_CONFIG.screenshotPath, 'sidebar-trigger-integration.png'),
                fullPage: false
            });
        });

        test('SidebarTrigger在不同屏幕尺寸下应该正常工作', async () => {
            // 测试桌面端
            await page.setViewport({ width: 1280, height: 720 });
            await page.reload({ waitUntil: 'networkidle0' });
            await page.waitForSelector('[data-testid="sidebar-trigger"]', { timeout: 5000 });

            let triggerVisible = await page.$eval('[data-testid="sidebar-trigger"]', 
                el => el.offsetWidth > 0 && el.offsetHeight > 0
            );
            expect(triggerVisible).toBe(true);

            // 测试移动端
            await page.setViewport({ width: 375, height: 667 });
            await page.reload({ waitUntil: 'networkidle0' });
            await page.waitForSelector('[data-testid="sidebar-trigger"]', { timeout: 5000 });

            triggerVisible = await page.$eval('[data-testid="sidebar-trigger"]', 
                el => el.offsetWidth > 0 && el.offsetHeight > 0
            );
            expect(triggerVisible).toBe(true);
        });

        test('SidebarTrigger应该具备正确的无障碍属性', async () => {
            const ariaAttributes = await page.evaluate(() => {
                const trigger = document.querySelector('[data-testid="sidebar-trigger"]');
                return {
                    role: trigger?.getAttribute('role'),
                    ariaLabel: trigger?.getAttribute('aria-label'),
                    ariaExpanded: trigger?.getAttribute('aria-expanded'),
                    ariaControls: trigger?.getAttribute('aria-controls')
                };
            });

            // 验证无障碍属性
            expect(ariaAttributes.ariaLabel || ariaAttributes.role).toBeDefined();
        });
    });

    describe('LanguageSwitcher 集成测试', () => {
        test('LanguageSwitcher应该正确显示和切换语言', async () => {
            // 等待语言切换器加载
            await page.waitForSelector('[data-testid="language-switcher"]', { timeout: 5000 });

            // 点击语言切换器
            await page.click('[data-testid="language-switcher"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 检查下拉菜单出现
            const dropdownMenu = await page.$('[role="menu"]');
            expect(dropdownMenu).toBeTruthy();

            // 获取语言选项
            const languageOptions = await page.$$eval('[role="menuitem"]', items => 
                items.map(item => ({
                    text: item.textContent.trim(),
                    value: item.getAttribute('data-value') || item.getAttribute('value')
                }))
            );

            expect(languageOptions.length).toBeGreaterThan(0);
            console.log('可用语言选项:', languageOptions);

            // 测试语言切换
            if (languageOptions.length > 1) {
                await page.click('[role="menuitem"]:first-child');
                await new Promise(resolve => setTimeout(resolve, 500));

                // 验证页面内容是否更新
                const pageTitle = await page.title();
                expect(pageTitle).toBeDefined();
            }

            // 截图
            await page.screenshot({
                path: path.join(global.TEST_CONFIG.screenshotPath, 'language-switcher-integration.png'),
                fullPage: false
            });
        });

        test('LanguageSwitcher应该支持键盘导航', async () => {
            await page.waitForSelector('[data-testid="language-switcher"]', { timeout: 5000 });

            // 使用键盘聚焦
            await page.focus('[data-testid="language-switcher"]');
            
            // 使用Enter键打开
            await page.keyboard.press('Enter');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 检查菜单是否打开
            const menuVisible = await page.$('[role="menu"]');
            expect(menuVisible).toBeTruthy();

            // 使用方向键导航
            await page.keyboard.press('ArrowDown');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 使用Escape关闭
            await page.keyboard.press('Escape');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 验证菜单关闭
            const menuStillVisible = await page.$('[role="menu"]');
            expect(menuStillVisible).toBeFalsy();
        });

        test('LanguageSwitcher在移动端应该正常工作', async () => {
            // 切换到移动端视口
            await page.setViewport({ width: 375, height: 667 });
            await page.reload({ waitUntil: 'networkidle0' });

            // 在移动端可能在Sheet中
            const mobileSheet = await page.$('[data-testid="mobile-tools-sheet"]');
            if (mobileSheet) {
                await page.click('[data-testid="mobile-tools-sheet"]');
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            // 检查语言切换器是否可用
            const languageSwitcher = await page.$('[data-testid="language-switcher"]');
            if (languageSwitcher) {
                const isVisible = await languageSwitcher.isIntersectingViewport();
                expect(isVisible).toBe(true);

                // 测试点击
                await page.click('[data-testid="language-switcher"]');
                await new Promise(resolve => setTimeout(resolve, 300));

                // 截图
                await page.screenshot({
                    path: path.join(global.TEST_CONFIG.screenshotPath, 'language-switcher-mobile.png'),
                    fullPage: false
                });
            }
        });
    });

    describe('ThemeToggle 集成测试', () => {
        test('ThemeToggle应该正确切换主题', async () => {
            await page.waitForSelector('[data-testid="theme-toggle"]', { timeout: 5000 });

            // 获取初始主题
            const initialTheme = await page.evaluate(() => {
                return {
                    htmlClass: document.documentElement.className,
                    bodyClass: document.body.className,
                    dataTheme: document.documentElement.getAttribute('data-theme')
                };
            });

            // 点击主题切换
            await page.click('[data-testid="theme-toggle"]');
            await new Promise(resolve => setTimeout(resolve, 500));

            // 获取切换后的主题
            const newTheme = await page.evaluate(() => {
                return {
                    htmlClass: document.documentElement.className,
                    bodyClass: document.body.className,
                    dataTheme: document.documentElement.getAttribute('data-theme')
                };
            });

            // 验证主题确实发生了变化
            const themeChanged = 
                newTheme.htmlClass !== initialTheme.htmlClass ||
                newTheme.bodyClass !== initialTheme.bodyClass ||
                newTheme.dataTheme !== initialTheme.dataTheme;

            expect(themeChanged).toBe(true);

            console.log('主题切换前:', initialTheme);
            console.log('主题切换后:', newTheme);

            // 截图记录主题切换
            await page.screenshot({
                path: path.join(global.TEST_CONFIG.screenshotPath, 'theme-toggle-integration.png'),
                fullPage: false
            });
        });

        test('ThemeToggle应该支持三种主题模式循环', async () => {
            await page.waitForSelector('[data-testid="theme-toggle"]', { timeout: 5000 });

            const themes = [];

            // 收集3次点击的主题状态
            for (let i = 0; i < 3; i++) {
                const theme = await page.evaluate(() => {
                    return document.documentElement.className;
                });
                themes.push(theme);

                await page.click('[data-testid="theme-toggle"]');
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            // 验证主题确实在循环变化
            const uniqueThemes = [...new Set(themes)];
            expect(uniqueThemes.length).toBeGreaterThan(1);

            console.log('主题循环状态:', themes);
        });

        test('ThemeToggle应该持久化主题偏好', async () => {
            await page.waitForSelector('[data-testid="theme-toggle"]', { timeout: 5000 });

            // 切换主题
            await page.click('[data-testid="theme-toggle"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 获取切换后的主题
            const currentTheme = await page.evaluate(() => {
                return document.documentElement.className;
            });

            // 刷新页面
            await page.reload({ waitUntil: 'networkidle0' });
            await page.waitForSelector('[data-testid="theme-toggle"]', { timeout: 5000 });

            // 检查主题是否持久化
            const persistedTheme = await page.evaluate(() => {
                return document.documentElement.className;
            });

            expect(persistedTheme).toBe(currentTheme);
        });
    });

    describe('UserMenu 集成测试', () => {
        test('UserMenu应该正确显示用户信息', async () => {
            await page.waitForSelector('[data-testid="user-menu"]', { timeout: 5000 });

            // 点击用户菜单
            await page.click('[data-testid="user-menu"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 检查用户菜单内容
            const userMenuContent = await page.$('[data-testid="user-menu-content"]');
            expect(userMenuContent).toBeTruthy();

            // 检查用户信息显示
            const userInfo = await page.evaluate(() => {
                const userInfoElement = document.querySelector('[data-testid="user-info"]');
                if (!userInfoElement) return null;

                return {
                    hasAvatar: !!userInfoElement.querySelector('[data-testid="user-avatar"]'),
                    hasName: !!userInfoElement.querySelector('[data-testid="user-name"]'),
                    hasEmail: !!userInfoElement.querySelector('[data-testid="user-email"]')
                };
            });

            if (userInfo) {
                expect(userInfo.hasName || userInfo.hasEmail).toBe(true);
            }

            // 截图
            await page.screenshot({
                path: path.join(global.TEST_CONFIG.screenshotPath, 'user-menu-integration.png'),
                fullPage: false
            });
        });

        test('UserMenu应该包含正确的菜单选项', async () => {
            await page.waitForSelector('[data-testid="user-menu"]', { timeout: 5000 });

            // 点击用户菜单
            await page.click('[data-testid="user-menu"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 获取菜单项
            const menuItems = await page.$$eval('[role="menuitem"]', items => 
                items.map(item => ({
                    text: item.textContent.trim(),
                    href: item.getAttribute('href'),
                    onClick: item.getAttribute('onclick') !== null
                }))
            );

            expect(menuItems.length).toBeGreaterThan(0);

            // 应该包含基本的用户菜单项
            const menuTexts = menuItems.map(item => item.text.toLowerCase());
            const hasProfileOption = menuTexts.some(text => 
                text.includes('profile') || text.includes('设置') || text.includes('个人资料')
            );
            const hasLogoutOption = menuTexts.some(text => 
                text.includes('logout') || text.includes('登出') || text.includes('退出')
            );

            expect(hasProfileOption || hasLogoutOption).toBe(true);

            console.log('用户菜单项:', menuItems);
        });

        test('UserMenu应该支持键盘导航', async () => {
            await page.waitForSelector('[data-testid="user-menu"]', { timeout: 5000 });

            // 使用键盘聚焦用户菜单
            await page.focus('[data-testid="user-menu"]');
            
            // 使用Enter键打开菜单
            await page.keyboard.press('Enter');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 检查菜单是否打开
            const menuVisible = await page.$('[data-testid="user-menu-content"]');
            expect(menuVisible).toBeTruthy();

            // 使用方向键导航
            await page.keyboard.press('ArrowDown');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 检查焦点是否正确移动
            const focusedElement = await page.evaluate(() => {
                return document.activeElement?.getAttribute('role');
            });

            expect(focusedElement).toBeDefined();

            // 使用Escape关闭菜单
            await page.keyboard.press('Escape');
            await new Promise(resolve => setTimeout(resolve, 300));
        });
    });

    describe('组件协同工作测试', () => {
        test('多个组件应该能够同时正常工作', async () => {
            // 测试同时操作多个组件
            await page.waitForSelector('[data-testid="top-menu-bar"]', { timeout: 5000 });

            // 1. 切换侧边栏
            await page.click('[data-testid="sidebar-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 2. 切换主题
            await page.click('[data-testid="theme-toggle"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 3. 打开语言切换器
            const languageSwitcher = await page.$('[data-testid="language-switcher"]');
            if (languageSwitcher) {
                await page.click('[data-testid="language-switcher"]');
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // 关闭语言菜单
                await page.keyboard.press('Escape');
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            // 4. 打开用户菜单
            await page.click('[data-testid="user-menu"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 验证所有组件仍然正常
            const allComponentsPresent = await page.evaluate(() => {
                const components = [
                    'sidebar-trigger',
                    'theme-toggle', 
                    'user-menu'
                ];

                return components.every(component => {
                    const element = document.querySelector(`[data-testid="${component}"]`);
                    return element && element.offsetWidth > 0 && element.offsetHeight > 0;
                });
            });

            expect(allComponentsPresent).toBe(true);

            // 截图记录最终状态
            await page.screenshot({
                path: path.join(global.TEST_CONFIG.screenshotPath, 'components-cooperative-work.png'),
                fullPage: false
            });
        });

        test('组件状态应该独立管理', async () => {
            // 测试组件状态不会相互干扰
            await page.waitForSelector('[data-testid="top-menu-bar"]', { timeout: 5000 });

            // 获取初始状态
            const initialStates = await page.evaluate(() => {
                return {
                    sidebarState: document.querySelector('[data-sidebar="sidebar"]')?.getAttribute('data-state'),
                    themeClass: document.documentElement.className,
                    userMenuOpen: !!document.querySelector('[data-testid="user-menu-content"]')
                };
            });

            // 操作各个组件
            await page.click('[data-testid="sidebar-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 200));

            await page.click('[data-testid="theme-toggle"]');
            await new Promise(resolve => setTimeout(resolve, 200));

            await page.click('[data-testid="user-menu"]');
            await new Promise(resolve => setTimeout(resolve, 200));

            // 获取变化后的状态
            const finalStates = await page.evaluate(() => {
                return {
                    sidebarState: document.querySelector('[data-sidebar="sidebar"]')?.getAttribute('data-state'),
                    themeClass: document.documentElement.className,
                    userMenuOpen: !!document.querySelector('[data-testid="user-menu-content"]')
                };
            });

            // 验证各组件状态都发生了预期的变化
            expect(finalStates.sidebarState).not.toBe(initialStates.sidebarState);
            expect(finalStates.themeClass).not.toBe(initialStates.themeClass);
            expect(finalStates.userMenuOpen).not.toBe(initialStates.userMenuOpen);

            console.log('初始状态:', initialStates);
            console.log('最终状态:', finalStates);
        });
    });

    describe('错误处理和边界情况', () => {
        test('快速连续点击不应该导致错误', async () => {
            await page.waitForSelector('[data-testid="top-menu-bar"]', { timeout: 5000 });

            // 快速连续点击各个组件
            const components = ['sidebar-trigger', 'theme-toggle', 'user-menu'];
            
            for (let i = 0; i < 5; i++) {
                for (const component of components) {
                    const element = await page.$(`[data-testid="${component}"]`);
                    if (element) {
                        await page.click(`[data-testid="${component}"]`);
                        await new Promise(resolve => setTimeout(resolve, 50)); // 很短的延迟
                    }
                }
            }

            // 检查是否有JavaScript错误
            const errors = consoleErrors.filter(error => 
                !error.includes('favicon') && 
                !error.includes('chrome-extension')
            );

            expect(errors.length).toBe(0);

            if (errors.length > 0) {
                console.log('快速点击过程中的错误:', errors);
            }
        });

        test('网络断开时组件应该优雅降级', async () => {
            await page.waitForSelector('[data-testid="top-menu-bar"]', { timeout: 5000 });

            // 模拟网络断开
            await page.setOfflineMode(true);

            // 尝试操作各个组件
            await page.click('[data-testid="sidebar-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            await page.click('[data-testid="theme-toggle"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 检查组件是否仍然响应（本地状态管理）
            const componentsResponsive = await page.evaluate(() => {
                const sidebar = document.querySelector('[data-sidebar="sidebar"]');
                const themeChanged = document.documentElement.className;
                
                return {
                    sidebarExists: !!sidebar,
                    themeClassExists: !!themeChanged
                };
            });

            expect(componentsResponsive.sidebarExists).toBe(true);
            expect(componentsResponsive.themeClassExists).toBe(true);

            // 恢复网络
            await page.setOfflineMode(false);
        });
    });
});