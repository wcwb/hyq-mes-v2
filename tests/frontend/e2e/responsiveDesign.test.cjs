/**
 * 响应式设计E2E测试
 * 测试已完成功能在不同设备尺寸下的响应式表现
 */

const puppeteer = require('puppeteer');
const path = require('path');

describe('响应式设计测试', () => {
    let browser;
    let page;
    let consoleErrors = [];

    // 定义不同设备尺寸
    const deviceSizes = {
        mobile: { width: 375, height: 667, name: '移动端' },
        mobileLarge: { width: 414, height: 896, name: '大屏手机' },
        tablet: { width: 768, height: 1024, name: '平板端' },
        tabletLarge: { width: 1024, height: 768, name: '大平板端' },
        desktop: { width: 1280, height: 720, name: '桌面端' },
        desktopLarge: { width: 1920, height: 1080, name: '大桌面端' }
    };

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

    describe('TopMenuBar 响应式测试', () => {
        test('TopMenuBar在所有设备尺寸下应该正确显示', async () => {
            for (const [deviceKey, device] of Object.entries(deviceSizes)) {
                console.log(`测试设备: ${device.name} (${device.width}x${device.height})`);
                
                // 设置视口
                await page.setViewport({ width: device.width, height: device.height });
                await new Promise(resolve => setTimeout(resolve, 300));

                // 检查TopMenuBar是否存在且可见
                const topMenuBar = await page.$('[data-testid="top-menu-bar"]');
                expect(topMenuBar).toBeTruthy();

                const isVisible = await topMenuBar.isIntersectingViewport();
                expect(isVisible).toBe(true);

                // 检查高度是否正确（应该是56px）
                const height = await page.evaluate(() => {
                    const element = document.querySelector('[data-testid="top-menu-bar"]');
                    return window.getComputedStyle(element).height;
                });
                expect(height).toBe('56px');

                // 检查flex布局
                const flexStyles = await page.evaluate(() => {
                    const element = document.querySelector('[data-testid="top-menu-bar"]');
                    const styles = window.getComputedStyle(element);
                    return {
                        display: styles.display,
                        flexDirection: styles.flexDirection,
                        justifyContent: styles.justifyContent,
                        alignItems: styles.alignItems
                    };
                });

                expect(flexStyles.display).toBe('flex');
                expect(flexStyles.justifyContent).toBe('space-between');

                // 截图记录
                await page.screenshot({
                    path: path.join(global.TEST_CONFIG.screenshotPath, `topMenuBar-${deviceKey}.png`),
                    fullPage: false
                });
            }
        });

        test('左侧功能区域在不同尺寸下应该正确布局', async () => {
            for (const [deviceKey, device] of Object.entries(deviceSizes)) {
                await page.setViewport({ width: device.width, height: device.height });
                await new Promise(resolve => setTimeout(resolve, 300));

                // 检查左侧区域
                const leftArea = await page.$('[data-testid="top-menu-left"]');
                expect(leftArea).toBeTruthy();

                // 检查SidebarTrigger
                const sidebarTrigger = await page.$('[data-testid="sidebar-trigger"]');
                expect(sidebarTrigger).toBeTruthy();

                // 检查SearchBar
                const searchBar = await page.$('[data-testid="search-bar"]');
                expect(searchBar).toBeTruthy();

                // 在移动端，SearchBar可能有不同的样式
                if (device.width < 768) {
                    // 移动端检查
                    const searchBarStyles = await page.evaluate(() => {
                        const element = document.querySelector('[data-testid="search-bar"]');
                        return {
                            width: window.getComputedStyle(element).width,
                            maxWidth: window.getComputedStyle(element).maxWidth
                        };
                    });
                    console.log(`${device.name} SearchBar样式:`, searchBarStyles);
                }
            }
        });

        test('右侧工具区域在不同尺寸下应该适当显示', async () => {
            for (const [deviceKey, device] of Object.entries(deviceSizes)) {
                await page.setViewport({ width: device.width, height: device.height });
                await new Promise(resolve => setTimeout(resolve, 300));

                // 检查右侧区域
                const rightArea = await page.$('[data-testid="top-menu-right"]');
                expect(rightArea).toBeTruthy();

                if (device.width >= 1024) {
                    // 桌面端：所有工具应该直接可见
                    const languageSwitcher = await page.$('[data-testid="language-switcher"]');
                    const themeToggle = await page.$('[data-testid="theme-toggle"]');
                    const userMenu = await page.$('[data-testid="user-menu"]');

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
                } else {
                    // 移动端/平板端：可能使用Sheet或其他收纳方式
                    const mobileSheet = await page.$('[data-testid="mobile-tools-sheet"]');
                    if (mobileSheet) {
                        const isVisible = await mobileSheet.isIntersectingViewport();
                        expect(isVisible).toBe(true);
                    }
                }

                // 截图记录右侧区域
                await page.screenshot({
                    path: path.join(global.TEST_CONFIG.screenshotPath, `topMenuBar-right-${deviceKey}.png`),
                    fullPage: false
                });
            }
        });
    });

    describe('SearchBar 响应式测试', () => {
        test('SearchBar在不同设备上应该有合适的尺寸', async () => {
            for (const [deviceKey, device] of Object.entries(deviceSizes)) {
                await page.setViewport({ width: device.width, height: device.height });
                await new Promise(resolve => setTimeout(resolve, 300));

                const searchBar = await page.$('[data-testid="search-bar"]');
                const searchBarStyles = await page.evaluate(() => {
                    const element = document.querySelector('[data-testid="search-bar"]');
                    const styles = window.getComputedStyle(element);
                    return {
                        width: parseInt(styles.width),
                        maxWidth: styles.maxWidth,
                        minWidth: styles.minWidth,
                        padding: styles.padding
                    };
                });

                console.log(`${device.name} SearchBar尺寸:`, searchBarStyles);

                // 验证SearchBar不会过宽或过窄
                expect(searchBarStyles.width).toBeGreaterThan(100);
                expect(searchBarStyles.width).toBeLessThan(device.width * 0.8);
            }
        });

        test('搜索对话框在不同设备上应该适配', async () => {
            for (const [deviceKey, device] of Object.entries(deviceSizes)) {
                await page.setViewport({ width: device.width, height: device.height });
                await new Promise(resolve => setTimeout(resolve, 300));

                // 打开搜索对话框
                await page.click('[data-testid="search-trigger"]');
                await new Promise(resolve => setTimeout(resolve, 300));

                // 检查对话框是否适配屏幕
                const dialogStyles = await page.evaluate(() => {
                    const dialog = document.querySelector('[data-testid="search-dialog"]');
                    if (!dialog) return null;
                    
                    const styles = window.getComputedStyle(dialog);
                    return {
                        width: parseInt(styles.width),
                        height: parseInt(styles.height),
                        maxWidth: styles.maxWidth,
                        maxHeight: styles.maxHeight,
                        position: styles.position
                    };
                });

                if (dialogStyles) {
                    console.log(`${device.name} 搜索对话框样式:`, dialogStyles);

                    // 对话框不应该超出屏幕
                    expect(dialogStyles.width).toBeLessThanOrEqual(device.width);
                    expect(dialogStyles.height).toBeLessThanOrEqual(device.height);

                    // 移动端对话框可能占更大比例
                    if (device.width < 768) {
                        expect(dialogStyles.width).toBeGreaterThan(device.width * 0.8);
                    }
                }

                // 截图
                await page.screenshot({
                    path: path.join(global.TEST_CONFIG.screenshotPath, `search-dialog-${deviceKey}.png`),
                    fullPage: false
                });

                // 关闭对话框
                await page.keyboard.press('Escape');
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        });

        test('搜索快捷键提示应该适配设备', async () => {
            for (const [deviceKey, device] of Object.entries(deviceSizes)) {
                await page.setViewport({ width: device.width, height: device.height });
                await new Promise(resolve => setTimeout(resolve, 300));

                const shortcutHint = await page.$('[data-testid="shortcut-hint"]');
                
                if (shortcutHint) {
                    const isVisible = await shortcutHint.isIntersectingViewport();
                    
                    if (device.width < 640) {
                        // 小屏设备可能隐藏快捷键提示
                        console.log(`${device.name} 快捷键提示可见性:`, isVisible);
                    } else {
                        // 大屏设备应该显示快捷键提示
                        expect(isVisible).toBe(true);
                    }
                }
            }
        });
    });

    describe('组件集成响应式测试', () => {
        test('LanguageSwitcher在不同设备上的表现', async () => {
            for (const [deviceKey, device] of Object.entries(deviceSizes)) {
                await page.setViewport({ width: device.width, height: device.height });
                await new Promise(resolve => setTimeout(resolve, 300));

                const languageSwitcher = await page.$('[data-testid="language-switcher"]');
                
                if (languageSwitcher) {
                    // 点击语言切换器
                    await languageSwitcher.click();
                    await new Promise(resolve => setTimeout(resolve, 300));

                    // 检查下拉菜单是否适配屏幕
                    const dropdown = await page.$('[role="menu"]');
                    if (dropdown) {
                        const dropdownBounds = await dropdown.boundingBox();
                        
                        // 下拉菜单不应该超出屏幕边界
                        expect(dropdownBounds.x + dropdownBounds.width).toBeLessThanOrEqual(device.width);
                        expect(dropdownBounds.y + dropdownBounds.height).toBeLessThanOrEqual(device.height);

                        console.log(`${device.name} 语言切换下拉菜单位置:`, dropdownBounds);
                    }

                    // 关闭下拉菜单
                    await page.keyboard.press('Escape');
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
        });

        test('UserMenu在不同设备上的表现', async () => {
            for (const [deviceKey, device] of Object.entries(deviceSizes)) {
                await page.setViewport({ width: device.width, height: device.height });
                await new Promise(resolve => setTimeout(resolve, 300));

                const userMenu = await page.$('[data-testid="user-menu"]');
                
                if (userMenu) {
                    // 点击用户菜单
                    await userMenu.click();
                    await new Promise(resolve => setTimeout(resolve, 300));

                    // 检查用户菜单内容
                    const userMenuContent = await page.$('[data-testid="user-menu-content"]');
                    if (userMenuContent) {
                        const menuBounds = await userMenuContent.boundingBox();
                        
                        // 菜单不应该超出屏幕
                        expect(menuBounds.x + menuBounds.width).toBeLessThanOrEqual(device.width);
                        expect(menuBounds.y + menuBounds.height).toBeLessThanOrEqual(device.height);

                        console.log(`${device.name} 用户菜单位置:`, menuBounds);

                        // 截图
                        await page.screenshot({
                            path: path.join(global.TEST_CONFIG.screenshotPath, `user-menu-${deviceKey}.png`),
                            fullPage: false
                        });
                    }

                    // 关闭菜单
                    await page.keyboard.press('Escape');
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
        });

        test('侧边栏在不同设备上的行为', async () => {
            for (const [deviceKey, device] of Object.entries(deviceSizes)) {
                await page.setViewport({ width: device.width, height: device.height });
                await new Promise(resolve => setTimeout(resolve, 300));

                // 点击侧边栏触发器
                await page.click('[data-testid="sidebar-trigger"]');
                await new Promise(resolve => setTimeout(resolve, 500));

                // 检查侧边栏状态
                const sidebarState = await page.evaluate(() => {
                    const sidebar = document.querySelector('[data-sidebar="sidebar"]');
                    const overlay = document.querySelector('[data-sidebar="overlay"]');
                    return {
                        sidebarState: sidebar?.getAttribute('data-state'),
                        hasOverlay: !!overlay,
                        sidebarWidth: sidebar ? window.getComputedStyle(sidebar).width : null
                    };
                });

                console.log(`${device.name} 侧边栏状态:`, sidebarState);

                if (device.width < 768) {
                    // 移动端可能有遮罩层
                    console.log(`${device.name} 侧边栏模式: 移动端`);
                } else {
                    // 桌面端可能是推拉模式
                    console.log(`${device.name} 侧边栏模式: 桌面端`);
                }

                // 截图记录侧边栏状态
                await page.screenshot({
                    path: path.join(global.TEST_CONFIG.screenshotPath, `sidebar-${deviceKey}.png`),
                    fullPage: false
                });

                // 关闭侧边栏
                await page.click('[data-testid="sidebar-trigger"]');
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        });
    });

    describe('触摸交互测试', () => {
        test('移动端触摸目标应该足够大', async () => {
            const mobileDevices = [deviceSizes.mobile, deviceSizes.mobileLarge];

            for (const device of mobileDevices) {
                await page.setViewport({ 
                    width: device.width, 
                    height: device.height,
                    isMobile: true,
                    hasTouch: true
                });
                await new Promise(resolve => setTimeout(resolve, 300));

                // 检查各个可交互元素的尺寸
                const touchTargets = [
                    '[data-testid="sidebar-trigger"]',
                    '[data-testid="search-trigger"]',
                    '[data-testid="theme-toggle"]',
                    '[data-testid="user-menu"]'
                ];

                for (const selector of touchTargets) {
                    const element = await page.$(selector);
                    if (element) {
                        const bounds = await element.boundingBox();
                        
                        // 触摸目标应该至少44x44px
                        const minTouchSize = 44;
                        expect(bounds.width).toBeGreaterThanOrEqual(minTouchSize);
                        expect(bounds.height).toBeGreaterThanOrEqual(minTouchSize);

                        console.log(`${device.name} ${selector} 尺寸: ${bounds.width}x${bounds.height}`);
                    }
                }
            }
        });

        test('移动端应该支持触摸操作', async () => {
            await page.setViewport({ 
                width: deviceSizes.mobile.width, 
                height: deviceSizes.mobile.height,
                isMobile: true,
                hasTouch: true
            });
            await new Promise(resolve => setTimeout(resolve, 300));

            // 模拟触摸操作
            const searchTrigger = await page.$('[data-testid="search-trigger"]');
            if (searchTrigger) {
                const bounds = await searchTrigger.boundingBox();
                
                // 模拟触摸点击
                await page.touchscreen.tap(
                    bounds.x + bounds.width / 2, 
                    bounds.y + bounds.height / 2
                );
                await new Promise(resolve => setTimeout(resolve, 300));

                // 检查搜索对话框是否打开
                const searchDialog = await page.$('[data-testid="search-dialog"]');
                expect(searchDialog).toBeTruthy();

                // 关闭对话框
                await page.keyboard.press('Escape');
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        });
    });

    describe('断点管理测试', () => {
        test('断点切换应该正确更新布局', async () => {
            // 从桌面端开始
            await page.setViewport({ width: 1280, height: 720 });
            await new Promise(resolve => setTimeout(resolve, 300));

            // 检查桌面端布局
            const desktopLayout = await page.evaluate(() => {
                const topMenuBar = document.querySelector('[data-testid="top-menu-bar"]');
                return {
                    flexDirection: window.getComputedStyle(topMenuBar).flexDirection,
                    justifyContent: window.getComputedStyle(topMenuBar).justifyContent
                };
            });

            console.log('桌面端布局:', desktopLayout);

            // 切换到移动端
            await page.setViewport({ width: 375, height: 667 });
            await new Promise(resolve => setTimeout(resolve, 500)); // 给更多时间进行布局调整

            // 检查移动端布局
            const mobileLayout = await page.evaluate(() => {
                const topMenuBar = document.querySelector('[data-testid="top-menu-bar"]');
                return {
                    flexDirection: window.getComputedStyle(topMenuBar).flexDirection,
                    justifyContent: window.getComputedStyle(topMenuBar).justifyContent
                };
            });

            console.log('移动端布局:', mobileLayout);

            // 布局应该保持一致的flex属性
            expect(mobileLayout.flexDirection).toBe(desktopLayout.flexDirection);
            expect(mobileLayout.justifyContent).toBe(desktopLayout.justifyContent);
        });

        test('媒体查询应该正确触发', async () => {
            const breakpoints = [
                { width: 640, name: 'sm' },
                { width: 768, name: 'md' },
                { width: 1024, name: 'lg' },
                { width: 1280, name: 'xl' }
            ];

            for (const bp of breakpoints) {
                await page.setViewport({ width: bp.width, height: 720 });
                await new Promise(resolve => setTimeout(resolve, 300));

                // 检查当前断点
                const currentBreakpoint = await page.evaluate(() => {
                    // 尝试检测当前生效的断点
                    const element = document.querySelector('[data-testid="top-menu-bar"]');
                    const styles = window.getComputedStyle(element);
                    
                    return {
                        width: window.innerWidth,
                        padding: styles.paddingLeft,
                        gap: styles.gap
                    };
                });

                console.log(`断点 ${bp.name} (${bp.width}px):`, currentBreakpoint);
                expect(currentBreakpoint.width).toBe(bp.width);
            }
        });
    });

    describe('性能和视觉测试', () => {
        test('响应式切换应该流畅', async () => {
            const performanceData = [];

            // 测试多次视口切换的性能
            for (let i = 0; i < 5; i++) {
                const startTime = Date.now();
                
                // 在移动端和桌面端之间切换
                await page.setViewport({ width: 375, height: 667 });
                await new Promise(resolve => setTimeout(resolve, 100));
                
                await page.setViewport({ width: 1280, height: 720 });
                await new Promise(resolve => setTimeout(resolve, 100));
                
                const endTime = Date.now();
                performanceData.push(endTime - startTime);
            }

            const averageTime = performanceData.reduce((a, b) => a + b, 0) / performanceData.length;
            console.log(`响应式切换平均耗时: ${averageTime}ms`);
            console.log('切换时间数据:', performanceData);

            // 切换应该在合理时间内完成
            expect(averageTime).toBeLessThan(500);
        });

        test('不同设备下不应该有布局溢出', async () => {
            for (const [deviceKey, device] of Object.entries(deviceSizes)) {
                await page.setViewport({ width: device.width, height: device.height });
                await new Promise(resolve => setTimeout(resolve, 300));

                // 检查水平滚动条
                const hasHorizontalScroll = await page.evaluate(() => {
                    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
                });

                if (hasHorizontalScroll) {
                    console.warn(`${device.name} 出现水平滚动条`);
                }

                // 检查TopMenuBar是否溢出
                const topMenuBarOverflow = await page.evaluate(() => {
                    const element = document.querySelector('[data-testid="top-menu-bar"]');
                    const rect = element.getBoundingClientRect();
                    return {
                        right: rect.right,
                        viewportWidth: window.innerWidth,
                        overflow: rect.right > window.innerWidth
                    };
                });

                expect(topMenuBarOverflow.overflow).toBe(false);

                if (topMenuBarOverflow.overflow) {
                    console.error(`${device.name} TopMenuBar溢出:`, topMenuBarOverflow);
                }
            }
        });
    });

    describe('错误处理测试', () => {
        test('响应式操作不应该产生JavaScript错误', async () => {
            // 在不同设备间快速切换
            for (let i = 0; i < 3; i++) {
                await page.setViewport({ width: 375, height: 667 });
                await new Promise(resolve => setTimeout(resolve, 100));
                await page.setViewport({ width: 1280, height: 720 });
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // 在移动端执行各种操作
            await page.setViewport({ width: 375, height: 667 });
            await new Promise(resolve => setTimeout(resolve, 300));

            await page.click('[data-testid="search-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 200));
            await page.keyboard.press('Escape');

            await page.click('[data-testid="sidebar-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 200));
            await page.click('[data-testid="sidebar-trigger"]');

            // 检查控制台错误
            const filteredErrors = consoleErrors.filter(error => 
                !error.includes('favicon') && 
                !error.includes('chrome-extension') &&
                !error.includes('Failed to load resource')
            );

            expect(filteredErrors.length).toBe(0);

            if (filteredErrors.length > 0) {
                console.log('响应式操作过程中的错误:', filteredErrors);
            }
        });
    });
});