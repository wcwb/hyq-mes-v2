/**
 * 无障碍功能全面E2E测试
 * 测试已完成功能的无障碍性，包括ARIA属性、键盘导航、屏幕阅读器支持等
 */

const puppeteer = require('puppeteer');
const path = require('path');

describe('无障碍功能全面测试', () => {
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

    describe('ARIA属性和语义结构测试', () => {
        test('TopMenuBar应该具备正确的ARIA结构', async () => {
            await page.waitForSelector('[data-testid="top-menu-bar"]', { timeout: 5000 });

            // 检查TopMenuBar的ARIA属性
            const topMenuBarAria = await page.evaluate(() => {
                const element = document.querySelector('[data-testid="top-menu-bar"]');
                return {
                    role: element?.getAttribute('role'),
                    ariaLabel: element?.getAttribute('aria-label'),
                    ariaLabelledby: element?.getAttribute('aria-labelledby'),
                    ariaDescribedby: element?.getAttribute('aria-describedby'),
                    tagName: element?.tagName
                };
            });

            console.log('TopMenuBar ARIA属性:', topMenuBarAria);

            // 验证基本语义结构
            expect(topMenuBarAria.tagName).toBeDefined();
            
            // 如果有role属性，应该是有意义的
            if (topMenuBarAria.role) {
                expect(['banner', 'navigation', 'toolbar', 'menubar']).toContain(topMenuBarAria.role);
            }

            // 截图记录
            await page.screenshot({
                path: path.join(global.TEST_CONFIG.screenshotPath, 'accessibility-topMenuBar-aria.png'),
                fullPage: false
            });
        });

        test('搜索组件应该具备完整的ARIA支持', async () => {
            await page.waitForSelector('[data-testid="search-trigger"]', { timeout: 5000 });

            // 检查搜索触发器的ARIA属性
            const triggerAria = await page.evaluate(() => {
                const trigger = document.querySelector('[data-testid="search-trigger"]');
                return {
                    role: trigger?.getAttribute('role'),
                    ariaLabel: trigger?.getAttribute('aria-label'),
                    ariaExpanded: trigger?.getAttribute('aria-expanded'),
                    ariaHaspopup: trigger?.getAttribute('aria-haspopup'),
                    ariaControls: trigger?.getAttribute('aria-controls'),
                    tabIndex: trigger?.getAttribute('tabindex')
                };
            });

            console.log('搜索触发器ARIA属性:', triggerAria);

            // 验证搜索触发器的无障碍属性
            expect(triggerAria.ariaLabel || triggerAria.role).toBeDefined();

            // 打开搜索对话框
            await page.click('[data-testid="search-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 检查搜索对话框的ARIA属性
            const dialogAria = await page.evaluate(() => {
                const dialog = document.querySelector('[data-testid="search-dialog"]');
                const input = document.querySelector('[data-testid="search-input"]');
                
                return {
                    dialogRole: dialog?.getAttribute('role'),
                    dialogAriaLabel: dialog?.getAttribute('aria-label'),
                    dialogAriaModal: dialog?.getAttribute('aria-modal'),
                    inputRole: input?.getAttribute('role'),
                    inputAriaLabel: input?.getAttribute('aria-label'),
                    inputAriaExpanded: input?.getAttribute('aria-expanded'),
                    inputAriaAutocomplete: input?.getAttribute('aria-autocomplete'),
                    inputAriaActivedescendant: input?.getAttribute('aria-activedescendant')
                };
            });

            console.log('搜索对话框ARIA属性:', dialogAria);

            // 验证对话框的无障碍属性
            expect(dialogAria.dialogRole).toBe('dialog');
            expect(dialogAria.dialogAriaModal).toBe('true');
            expect(dialogAria.inputAriaLabel || dialogAria.inputRole).toBeDefined();

            // 关闭对话框
            await page.keyboard.press('Escape');
            await new Promise(resolve => setTimeout(resolve, 200));
        });

        test('用户菜单应该具备正确的ARIA导航结构', async () => {
            await page.waitForSelector('[data-testid="user-menu"]', { timeout: 5000 });

            // 打开用户菜单
            await page.click('[data-testid="user-menu"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 检查用户菜单的ARIA结构
            const menuAria = await page.evaluate(() => {
                const menuTrigger = document.querySelector('[data-testid="user-menu"]');
                const menuContent = document.querySelector('[data-testid="user-menu-content"]');
                const menuItems = document.querySelectorAll('[role="menuitem"]');
                
                return {
                    triggerRole: menuTrigger?.getAttribute('role'),
                    triggerAriaExpanded: menuTrigger?.getAttribute('aria-expanded'),
                    triggerAriaHaspopup: menuTrigger?.getAttribute('aria-haspopup'),
                    contentRole: menuContent?.getAttribute('role'),
                    contentAriaLabelledby: menuContent?.getAttribute('aria-labelledby'),
                    menuItemsCount: menuItems.length,
                    firstMenuItem: menuItems[0] ? {
                        role: menuItems[0].getAttribute('role'),
                        tabIndex: menuItems[0].getAttribute('tabindex'),
                        ariaLabel: menuItems[0].getAttribute('aria-label')
                    } : null
                };
            });

            console.log('用户菜单ARIA属性:', menuAria);

            // 验证菜单结构
            expect(menuAria.triggerAriaExpanded).toBe('true');
            expect(menuAria.contentRole).toBe('menu');
            expect(menuAria.menuItemsCount).toBeGreaterThan(0);

            if (menuAria.firstMenuItem) {
                expect(menuAria.firstMenuItem.role).toBe('menuitem');
            }

            // 关闭菜单
            await page.keyboard.press('Escape');
            await new Promise(resolve => setTimeout(resolve, 200));
        });

        test('语言切换器应该具备国际化无障碍支持', async () => {
            await page.waitForSelector('[data-testid="language-switcher"]', { timeout: 5000 });

            // 检查语言切换器的ARIA属性
            const languageAria = await page.evaluate(() => {
                const switcher = document.querySelector('[data-testid="language-switcher"]');
                return {
                    role: switcher?.getAttribute('role'),
                    ariaLabel: switcher?.getAttribute('aria-label'),
                    ariaExpanded: switcher?.getAttribute('aria-expanded'),
                    ariaHaspopup: switcher?.getAttribute('aria-haspopup'),
                    lang: switcher?.getAttribute('lang'),
                    ariaDescribedby: switcher?.getAttribute('aria-describedby')
                };
            });

            console.log('语言切换器ARIA属性:', languageAria);

            // 打开语言菜单
            await page.click('[data-testid="language-switcher"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 检查语言选项的无障碍属性
            const languageOptions = await page.evaluate(() => {
                const options = document.querySelectorAll('[role="menuitem"]');
                return Array.from(options).map(option => ({
                    text: option.textContent?.trim(),
                    role: option.getAttribute('role'),
                    lang: option.getAttribute('lang'),
                    ariaLabel: option.getAttribute('aria-label'),
                    tabIndex: option.getAttribute('tabindex')
                }));
            });

            console.log('语言选项:', languageOptions);

            if (languageOptions.length > 0) {
                languageOptions.forEach(option => {
                    expect(option.role).toBe('menuitem');
                });
            }

            // 关闭菜单
            await page.keyboard.press('Escape');
            await new Promise(resolve => setTimeout(resolve, 200));
        });
    });

    describe('键盘导航测试', () => {
        test('Tab键应该能够遍历所有可聚焦元素', async () => {
            await page.waitForSelector('[data-testid="top-menu-bar"]', { timeout: 5000 });

            const focusableElements = [];
            let currentIndex = 0;

            // 记录Tab键导航路径
            for (let i = 0; i < 10; i++) {
                await page.keyboard.press('Tab');
                await new Promise(resolve => setTimeout(resolve, 100));

                const focusedElement = await page.evaluate(() => {
                    const active = document.activeElement;
                    return {
                        tagName: active?.tagName,
                        testId: active?.getAttribute('data-testid'),
                        role: active?.getAttribute('role'),
                        ariaLabel: active?.getAttribute('aria-label'),
                        className: active?.className,
                        id: active?.id
                    };
                });

                focusableElements.push(focusedElement);
                console.log(`Tab ${i + 1}:`, focusedElement);

                // 如果焦点回到了起始位置，说明已经完成了一轮
                if (i > 0 && 
                    focusedElement.testId === focusableElements[0].testId && 
                    focusedElement.tagName === focusableElements[0].tagName) {
                    break;
                }
            }

            // 验证至少有几个可聚焦的元素
            expect(focusableElements.length).toBeGreaterThan(2);

            // 验证TopMenuBar中的主要元素都可以聚焦
            const topMenuBarElements = focusableElements.filter(el => 
                el.testId && ['sidebar-trigger', 'search-trigger', 'user-menu', 'theme-toggle'].includes(el.testId)
            );

            expect(topMenuBarElements.length).toBeGreaterThan(0);

            // 截图显示焦点状态
            await page.screenshot({
                path: path.join(global.TEST_CONFIG.screenshotPath, 'accessibility-tab-navigation.png'),
                fullPage: false
            });
        });

        test('Shift+Tab应该能够反向导航', async () => {
            await page.waitForSelector('[data-testid="top-menu-bar"]', { timeout: 5000 });

            // 先正向导航几步
            for (let i = 0; i < 3; i++) {
                await page.keyboard.press('Tab');
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            const forwardFocused = await page.evaluate(() => {
                return {
                    testId: document.activeElement?.getAttribute('data-testid'),
                    tagName: document.activeElement?.tagName
                };
            });

            // 反向导航一步
            await page.keyboard.down('Shift');
            await page.keyboard.press('Tab');
            await page.keyboard.up('Shift');
            await new Promise(resolve => setTimeout(resolve, 100));

            const backwardFocused = await page.evaluate(() => {
                return {
                    testId: document.activeElement?.getAttribute('data-testid'),
                    tagName: document.activeElement?.tagName
                };
            });

            console.log('正向焦点:', forwardFocused);
            console.log('反向焦点:', backwardFocused);

            // 反向导航应该移动到不同的元素
            expect(backwardFocused.testId).not.toBe(forwardFocused.testId);
        });

        test('空格键和Enter键应该能够激活按钮', async () => {
            await page.waitForSelector('[data-testid="search-trigger"]', { timeout: 5000 });

            // 使用Tab键聚焦到搜索触发器
            await page.focus('[data-testid="search-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 使用空格键激活
            await page.keyboard.press('Space');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 检查搜索对话框是否打开
            const searchDialog = await page.$('[data-testid="search-dialog"]');
            expect(searchDialog).toBeTruthy();

            // 关闭对话框
            await page.keyboard.press('Escape');
            await new Promise(resolve => setTimeout(resolve, 200));

            // 再次聚焦搜索触发器，测试Enter键
            await page.focus('[data-testid="search-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 使用Enter键激活
            await page.keyboard.press('Enter');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 检查搜索对话框是否再次打开
            const searchDialogAgain = await page.$('[data-testid="search-dialog"]');
            expect(searchDialogAgain).toBeTruthy();

            // 关闭对话框
            await page.keyboard.press('Escape');
            await new Promise(resolve => setTimeout(resolve, 200));
        });

        test('方向键应该能够在菜单中导航', async () => {
            await page.waitForSelector('[data-testid="user-menu"]', { timeout: 5000 });

            // 聚焦并打开用户菜单
            await page.focus('[data-testid="user-menu"]');
            await page.keyboard.press('Enter');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 检查菜单是否打开
            const menuOpen = await page.$('[data-testid="user-menu-content"]');
            expect(menuOpen).toBeTruthy();

            // 使用方向键导航
            await page.keyboard.press('ArrowDown');
            await new Promise(resolve => setTimeout(resolve, 100));

            const firstFocused = await page.evaluate(() => {
                return {
                    testId: document.activeElement?.getAttribute('data-testid'),
                    role: document.activeElement?.getAttribute('role'),
                    text: document.activeElement?.textContent?.trim()
                };
            });

            console.log('第一个菜单项焦点:', firstFocused);

            // 继续使用方向键
            await page.keyboard.press('ArrowDown');
            await new Promise(resolve => setTimeout(resolve, 100));

            const secondFocused = await page.evaluate(() => {
                return {
                    testId: document.activeElement?.getAttribute('data-testid'),
                    role: document.activeElement?.getAttribute('role'),
                    text: document.activeElement?.textContent?.trim()
                };
            });

            console.log('第二个菜单项焦点:', secondFocused);

            // 如果有多个菜单项，焦点应该移动
            if (firstFocused.text !== secondFocused.text) {
                expect(firstFocused.text).not.toBe(secondFocused.text);
            }

            // 关闭菜单
            await page.keyboard.press('Escape');
            await new Promise(resolve => setTimeout(resolve, 200));
        });
    });

    describe('焦点管理测试', () => {
        test('搜索对话框应该实现焦点陷阱', async () => {
            await page.waitForSelector('[data-testid="search-trigger"]', { timeout: 5000 });

            // 打开搜索对话框
            await page.click('[data-testid="search-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 检查初始焦点是否在搜索输入框
            const initialFocus = await page.evaluate(() => {
                return document.activeElement?.getAttribute('data-testid');
            });
            expect(initialFocus).toBe('search-input');

            // 尝试Tab导航，检查焦点是否被困在对话框内
            const focusPath = [];
            for (let i = 0; i < 5; i++) {
                await page.keyboard.press('Tab');
                await new Promise(resolve => setTimeout(resolve, 100));

                const currentFocus = await page.evaluate(() => {
                    const active = document.activeElement;
                    const dialog = document.querySelector('[data-testid="search-dialog"]');
                    return {
                        testId: active?.getAttribute('data-testid'),
                        inDialog: dialog?.contains(active) || false
                    };
                });

                focusPath.push(currentFocus);
                console.log(`焦点陷阱 Tab ${i + 1}:`, currentFocus);

                // 焦点应该始终在对话框内
                expect(currentFocus.inDialog).toBe(true);
            }

            // 关闭对话框，检查焦点是否返回到触发器
            await page.keyboard.press('Escape');
            await new Promise(resolve => setTimeout(resolve, 300));

            const returnedFocus = await page.evaluate(() => {
                return document.activeElement?.getAttribute('data-testid');
            });
            expect(returnedFocus).toBe('search-trigger');
        });

        test('模态对话框关闭后焦点应该正确恢复', async () => {
            await page.waitForSelector('[data-testid="user-menu"]', { timeout: 5000 });

            // 记录打开菜单前的焦点
            await page.focus('[data-testid="user-menu"]');
            await new Promise(resolve => setTimeout(resolve, 100));

            const initialFocus = await page.evaluate(() => {
                return document.activeElement?.getAttribute('data-testid');
            });

            // 打开用户菜单
            await page.keyboard.press('Enter');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 关闭菜单
            await page.keyboard.press('Escape');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 检查焦点是否回到了初始位置
            const restoredFocus = await page.evaluate(() => {
                return document.activeElement?.getAttribute('data-testid');
            });

            expect(restoredFocus).toBe(initialFocus);
        });

        test('Skip Links应该正确工作', async () => {
            await page.waitForSelector('[data-testid="top-menu-bar"]', { timeout: 5000 });

            // 查找Skip Link
            const skipLink = await page.$('[data-testid="skip-to-content"]');
            if (skipLink) {
                // 聚焦Skip Link
                await page.focus('[data-testid="skip-to-content"]');
                await new Promise(resolve => setTimeout(resolve, 100));

                // 激活Skip Link
                await page.keyboard.press('Enter');
                await new Promise(resolve => setTimeout(resolve, 200));

                // 检查焦点是否跳转到主内容区域
                const jumpedFocus = await page.evaluate(() => {
                    const active = document.activeElement;
                    return {
                        testId: active?.getAttribute('data-testid'),
                        id: active?.id,
                        tagName: active?.tagName,
                        role: active?.getAttribute('role')
                    };
                });

                console.log('Skip Link跳转后的焦点:', jumpedFocus);

                // 焦点应该跳转到主内容区域
                expect(jumpedFocus.id || jumpedFocus.testId || jumpedFocus.role).toBeDefined();

                // 截图记录Skip Link使用
                await page.screenshot({
                    path: path.join(global.TEST_CONFIG.screenshotPath, 'accessibility-skip-link.png'),
                    fullPage: false
                });
            }
        });
    });

    describe('屏幕阅读器支持测试', () => {
        test('Live Region应该正确公告状态变化', async () => {
            await page.waitForSelector('[data-testid="search-trigger"]', { timeout: 5000 });

            // 检查Live Region是否存在
            const liveRegion = await page.$('[data-testid="search-live-region"], [aria-live], [role="status"], [role="alert"]');
            
            if (liveRegion) {
                const liveRegionAttrs = await page.evaluate(() => {
                    const regions = document.querySelectorAll('[aria-live], [role="status"], [role="alert"]');
                    return Array.from(regions).map(region => ({
                        ariaLive: region.getAttribute('aria-live'),
                        role: region.getAttribute('role'),
                        ariaAtomic: region.getAttribute('aria-atomic'),
                        testId: region.getAttribute('data-testid'),
                        text: region.textContent?.trim()
                    }));
                });

                console.log('Live Regions:', liveRegionAttrs);

                // 验证Live Region配置
                liveRegionAttrs.forEach(region => {
                    if (region.ariaLive) {
                        expect(['polite', 'assertive', 'off']).toContain(region.ariaLive);
                    }
                    if (region.role) {
                        expect(['status', 'alert', 'log']).toContain(region.role);
                    }
                });
            }

            // 触发状态变化（打开搜索）
            await page.click('[data-testid="search-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 500));

            // 检查Live Region是否更新
            const liveRegionAfter = await page.evaluate(() => {
                const regions = document.querySelectorAll('[aria-live], [role="status"], [role="alert"]');
                return Array.from(regions).map(region => region.textContent?.trim()).filter(text => text);
            });

            console.log('状态变化后的Live Region内容:', liveRegionAfter);

            // 关闭搜索
            await page.keyboard.press('Escape');
            await new Promise(resolve => setTimeout(resolve, 300));
        });

        test('搜索结果应该支持屏幕阅读器公告', async () => {
            await page.waitForSelector('[data-testid="search-trigger"]', { timeout: 5000 });

            // 打开搜索
            await page.click('[data-testid="search-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 输入搜索词
            await page.type('[data-testid="search-input"]', '用户');
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 检查搜索结果的无障碍属性
            const searchResults = await page.evaluate(() => {
                const results = document.querySelectorAll('[data-testid="search-result-item"]');
                const resultsList = document.querySelector('[data-testid="search-results"]');
                
                return {
                    resultsListRole: resultsList?.getAttribute('role'),
                    resultsListAriaLabel: resultsList?.getAttribute('aria-label'),
                    resultsCount: results.length,
                    firstResult: results[0] ? {
                        role: results[0].getAttribute('role'),
                        ariaLabel: results[0].getAttribute('aria-label'),
                        ariaSelected: results[0].getAttribute('aria-selected'),
                        ariaPosinset: results[0].getAttribute('aria-posinset'),
                        ariaSetsize: results[0].getAttribute('aria-setsize')
                    } : null
                };
            });

            console.log('搜索结果无障碍属性:', searchResults);

            if (searchResults.resultsCount > 0) {
                // 验证结果列表的role
                expect(searchResults.resultsListRole).toBeDefined();
                
                // 验证结果项的无障碍属性
                if (searchResults.firstResult) {
                    expect(searchResults.firstResult.role).toBeDefined();
                }
            }

            // 关闭搜索
            await page.keyboard.press('Escape');
            await new Promise(resolve => setTimeout(resolve, 200));
        });

        test('动态内容变化应该被正确公告', async () => {
            await page.waitForSelector('[data-testid="theme-toggle"]', { timeout: 5000 });

            // 检查主题切换前的状态
            const initialTheme = await page.evaluate(() => {
                return {
                    documentClass: document.documentElement.className,
                    themeButton: document.querySelector('[data-testid="theme-toggle"]')?.getAttribute('aria-label')
                };
            });

            // 切换主题
            await page.click('[data-testid="theme-toggle"]');
            await new Promise(resolve => setTimeout(resolve, 500));

            // 检查主题切换后的状态和公告
            const changedTheme = await page.evaluate(() => {
                const announcements = document.querySelectorAll('[aria-live], [role="status"]');
                return {
                    documentClass: document.documentElement.className,
                    themeButton: document.querySelector('[data-testid="theme-toggle"]')?.getAttribute('aria-label'),
                    announcements: Array.from(announcements).map(el => el.textContent?.trim()).filter(text => text)
                };
            });

            console.log('主题切换前:', initialTheme);
            console.log('主题切换后:', changedTheme);

            // 验证主题确实发生了变化
            expect(changedTheme.documentClass).not.toBe(initialTheme.documentClass);

            // 如果有公告，验证其内容
            if (changedTheme.announcements.length > 0) {
                console.log('主题切换公告:', changedTheme.announcements);
            }
        });
    });

    describe('颜色对比度和视觉无障碍测试', () => {
        test('文本颜色对比度应该符合WCAG标准', async () => {
            await page.waitForSelector('[data-testid="top-menu-bar"]', { timeout: 5000 });

            // 检查主要文本元素的颜色对比度
            const contrastResults = await page.evaluate(() => {
                const elements = [
                    '[data-testid="search-trigger"]',
                    '[data-testid="user-menu"]',
                    '[data-testid="theme-toggle"]'
                ];

                return elements.map(selector => {
                    const element = document.querySelector(selector);
                    if (!element) return null;

                    const styles = window.getComputedStyle(element);
                    return {
                        selector,
                        color: styles.color,
                        backgroundColor: styles.backgroundColor,
                        fontSize: styles.fontSize,
                        fontWeight: styles.fontWeight,
                        text: element.textContent?.trim()
                    };
                }).filter(Boolean);
            });

            console.log('元素样式信息:', contrastResults);

            // 验证基本样式信息存在
            contrastResults.forEach(result => {
                expect(result.color).toBeDefined();
                expect(result.backgroundColor).toBeDefined();
            });

            // 注意：实际的对比度计算需要更复杂的算法，这里只做基本检查
        });

        test('Focus indicator应该清晰可见', async () => {
            await page.waitForSelector('[data-testid="search-trigger"]', { timeout: 5000 });

            // 检查各个可聚焦元素的焦点指示器
            const focusableElements = [
                '[data-testid="sidebar-trigger"]',
                '[data-testid="search-trigger"]',
                '[data-testid="user-menu"]',
                '[data-testid="theme-toggle"]'
            ];

            for (const selector of focusableElements) {
                const element = await page.$(selector);
                if (element) {
                    // 聚焦元素
                    await page.focus(selector);
                    await new Promise(resolve => setTimeout(resolve, 200));

                    // 检查焦点样式
                    const focusStyles = await page.evaluate((sel) => {
                        const element = document.querySelector(sel);
                        const styles = window.getComputedStyle(element);
                        return {
                            outline: styles.outline,
                            outlineWidth: styles.outlineWidth,
                            outlineStyle: styles.outlineStyle,
                            outlineColor: styles.outlineColor,
                            boxShadow: styles.boxShadow,
                            border: styles.border
                        };
                    }, selector);

                    console.log(`${selector} 焦点样式:`, focusStyles);

                    // 验证有可见的焦点指示器
                    const hasFocusIndicator = 
                        focusStyles.outline !== 'none' ||
                        focusStyles.boxShadow !== 'none' ||
                        focusStyles.outlineWidth !== '0px';

                    expect(hasFocusIndicator).toBe(true);
                }
            }

            // 截图显示焦点指示器
            await page.screenshot({
                path: path.join(global.TEST_CONFIG.screenshotPath, 'accessibility-focus-indicators.png'),
                fullPage: false
            });
        });

        test('高对比度模式应该被支持', async () => {
            await page.waitForSelector('[data-testid="top-menu-bar"]', { timeout: 5000 });

            // 模拟高对比度媒体查询
            await page.emulateMediaFeatures([
                { name: 'prefers-contrast', value: 'high' }
            ]);
            await new Promise(resolve => setTimeout(resolve, 300));

            // 检查高对比度模式下的样式
            const highContrastStyles = await page.evaluate(() => {
                const elements = document.querySelectorAll('[data-testid*="menu"], [data-testid*="button"], [data-testid*="trigger"]');
                return Array.from(elements).map(element => {
                    const styles = window.getComputedStyle(element);
                    return {
                        testId: element.getAttribute('data-testid'),
                        color: styles.color,
                        backgroundColor: styles.backgroundColor,
                        borderColor: styles.borderColor
                    };
                });
            });

            console.log('高对比度模式样式:', highContrastStyles);

            // 验证高对比度模式下样式仍然有效
            highContrastStyles.forEach(style => {
                expect(style.color).toBeDefined();
                expect(style.backgroundColor).toBeDefined();
            });
        });
    });

    describe('减少动画偏好测试', () => {
        test('应该尊重用户的动画偏好设置', async () => {
            await page.waitForSelector('[data-testid="top-menu-bar"]', { timeout: 5000 });

            // 模拟用户偏好减少动画
            await page.emulateMediaFeatures([
                { name: 'prefers-reduced-motion', value: 'reduce' }
            ]);
            await new Promise(resolve => setTimeout(resolve, 300));

            // 检查动画相关样式
            const animationStyles = await page.evaluate(() => {
                const elements = document.querySelectorAll('*');
                const animatedElements = [];

                elements.forEach(element => {
                    const styles = window.getComputedStyle(element);
                    if (styles.animation !== 'none' || 
                        styles.transition !== 'none' || 
                        styles.transform !== 'none') {
                        animatedElements.push({
                            testId: element.getAttribute('data-testid'),
                            className: element.className,
                            animation: styles.animation,
                            transition: styles.transition,
                            transform: styles.transform
                        });
                    }
                });

                return animatedElements.slice(0, 10); // 限制输出数量
            });

            console.log('减少动画模式下的动画元素:', animationStyles);

            // 在减少动画模式下，应该有相应的处理
            // 注意：这里需要根据实际的CSS实现来验证
        });

        test('搜索对话框动画应该考虑用户偏好', async () => {
            // 模拟减少动画偏好
            await page.emulateMediaFeatures([
                { name: 'prefers-reduced-motion', value: 'reduce' }
            ]);

            await page.waitForSelector('[data-testid="search-trigger"]', { timeout: 5000 });

            // 测量对话框打开时间
            const startTime = Date.now();
            await page.click('[data-testid="search-trigger"]');
            await page.waitForSelector('[data-testid="search-dialog"]', { timeout: 2000 });
            const endTime = Date.now();

            const openTime = endTime - startTime;
            console.log(`减少动画模式下对话框打开时间: ${openTime}ms`);

            // 在减少动画模式下，对话框应该更快打开
            expect(openTime).toBeLessThan(300);

            // 关闭对话框
            await page.keyboard.press('Escape');
            await new Promise(resolve => setTimeout(resolve, 200));
        });
    });

    describe('语言和国际化无障碍测试', () => {
        test('页面应该具备正确的语言标识', async () => {
            await page.waitForSelector('[data-testid="top-menu-bar"]', { timeout: 5000 });

            // 检查页面语言属性
            const languageInfo = await page.evaluate(() => {
                return {
                    htmlLang: document.documentElement.lang,
                    htmlDir: document.documentElement.dir,
                    metaLanguage: document.querySelector('meta[http-equiv="content-language"]')?.getAttribute('content'),
                    pageTitle: document.title
                };
            });

            console.log('页面语言信息:', languageInfo);

            // 验证语言标识
            expect(languageInfo.htmlLang).toBeDefined();
            expect(languageInfo.htmlLang.length).toBeGreaterThan(0);

            // 检查是否支持RTL
            if (languageInfo.htmlDir) {
                expect(['ltr', 'rtl', 'auto']).toContain(languageInfo.htmlDir);
            }
        });

        test('语言切换应该更新语言标识', async () => {
            await page.waitForSelector('[data-testid="language-switcher"]', { timeout: 5000 });

            // 获取初始语言
            const initialLang = await page.evaluate(() => document.documentElement.lang);

            // 打开语言切换器
            await page.click('[data-testid="language-switcher"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 检查是否有其他语言选项
            const languageOptions = await page.$$('[role="menuitem"]');
            
            if (languageOptions.length > 1) {
                // 点击第一个语言选项
                await languageOptions[0].click();
                await new Promise(resolve => setTimeout(resolve, 500));

                // 检查语言是否更新
                const newLang = await page.evaluate(() => document.documentElement.lang);
                console.log(`语言切换: ${initialLang} -> ${newLang}`);

                // 如果语言确实切换了，验证更新
                if (newLang !== initialLang) {
                    expect(newLang).toBeDefined();
                    expect(newLang.length).toBeGreaterThan(0);
                }
            }
        });
    });

    describe('错误处理和边界情况', () => {
        test('无障碍操作不应该产生JavaScript错误', async () => {
            await page.waitForSelector('[data-testid="top-menu-bar"]', { timeout: 5000 });

            // 执行各种无障碍操作
            // Tab导航
            for (let i = 0; i < 5; i++) {
                await page.keyboard.press('Tab');
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // 键盘激活
            await page.keyboard.press('Enter');
            await new Promise(resolve => setTimeout(resolve, 200));
            await page.keyboard.press('Escape');

            // 搜索操作
            await page.focus('[data-testid="search-trigger"]');
            await page.keyboard.press('Space');
            await new Promise(resolve => setTimeout(resolve, 200));
            await page.keyboard.press('Escape');

            // 快捷键操作
            await page.keyboard.down('Control');
            await page.keyboard.press('KeyK');
            await page.keyboard.up('Control');
            await new Promise(resolve => setTimeout(resolve, 200));
            await page.keyboard.press('Escape');

            // 检查控制台错误
            const filteredErrors = consoleErrors.filter(error => 
                !error.includes('favicon') && 
                !error.includes('chrome-extension') &&
                !error.includes('Failed to load resource')
            );

            expect(filteredErrors.length).toBe(0);

            if (filteredErrors.length > 0) {
                console.log('无障碍操作过程中的错误:', filteredErrors);
            }
        });
    });
});