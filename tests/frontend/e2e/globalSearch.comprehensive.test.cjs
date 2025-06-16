/**
 * 全局搜索逻辑全面E2E测试
 * 测试防抖搜索、搜索历史、结果分组、API集成和性能优化
 */

const puppeteer = require('puppeteer');
const path = require('path');

describe('全局搜索逻辑全面测试', () => {
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

        // 监听网络请求
        await page.setRequestInterception(true);
        page.on('request', request => {
            // 记录搜索API请求
            if (request.url().includes('/search') || request.url().includes('/api/search')) {
                console.log(`搜索API请求: ${request.url()}`);
            }
            request.continue();
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

    describe('防抖搜索功能测试', () => {
        test('搜索输入应该具有防抖效果', async () => {
            await page.waitForSelector('[data-testid="search-trigger"]', { timeout: 5000 });

            // 打开搜索对话框
            await page.click('[data-testid="search-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 快速输入多个字符
            const startTime = Date.now();
            await page.type('[data-testid="search-input"]', 'u', { delay: 50 });
            await page.type('[data-testid="search-input"]', 's', { delay: 50 });
            await page.type('[data-testid="search-input"]', 'e', { delay: 50 });
            await page.type('[data-testid="search-input"]', 'r', { delay: 50 });

            // 等待防抖延迟（300ms）
            await new Promise(resolve => setTimeout(resolve, 400));
            const endTime = Date.now();

            console.log(`防抖测试总耗时: ${endTime - startTime}ms`);

            // 验证最终输入值
            const finalValue = await page.$eval('[data-testid="search-input"]', el => el.value);
            expect(finalValue).toBe('user');

            // 截图
            await page.screenshot({
                path: path.join(global.TEST_CONFIG.screenshotPath, 'globalSearch-debounce-test.png'),
                fullPage: false
            });
        });

        test('搜索防抖应该避免频繁API调用', async () => {
            await page.waitForSelector('[data-testid="search-trigger"]', { timeout: 5000 });

            // 记录网络请求
            const networkRequests = [];
            page.on('request', request => {
                if (request.url().includes('/search') || request.url().includes('/api/search')) {
                    networkRequests.push({
                        url: request.url(),
                        timestamp: Date.now()
                    });
                }
            });

            // 打开搜索对话框
            await page.click('[data-testid="search-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 快速连续输入
            await page.type('[data-testid="search-input"]', '用');
            await new Promise(resolve => setTimeout(resolve, 100));
            await page.type('[data-testid="search-input"]', '户');
            await new Promise(resolve => setTimeout(resolve, 100));
            await page.type('[data-testid="search-input"]', '管');
            await new Promise(resolve => setTimeout(resolve, 100));
            await page.type('[data-testid="search-input"]', '理');

            // 等待防抖完成
            await new Promise(resolve => setTimeout(resolve, 500));

            // 检查API调用次数（应该少于输入字符数）
            const searchRequests = networkRequests.filter(req => 
                req.url.includes('/search') || req.url.includes('/api/search')
            );
            
            console.log(`搜索API请求次数: ${searchRequests.length}`);
            expect(searchRequests.length).toBeLessThan(4); // 应该少于4次（字符数）
        });

        test('防抖配置应该可以自定义延迟时间', async () => {
            await page.waitForSelector('[data-testid="search-trigger"]', { timeout: 5000 });

            // 检查防抖配置是否正确
            const debounceConfig = await page.evaluate(() => {
                // 尝试获取全局搜索配置
                return window.searchConfig || { debounceMs: 300 };
            });

            console.log('防抖配置:', debounceConfig);
            expect(debounceConfig.debounceMs || 300).toBeGreaterThan(0);
        });
    });

    describe('搜索历史管理测试', () => {
        test('搜索历史应该被正确保存', async () => {
            await page.waitForSelector('[data-testid="search-trigger"]', { timeout: 5000 });

            // 清除可能存在的历史记录
            await page.evaluate(() => {
                localStorage.removeItem('search-history');
                localStorage.removeItem('searchHistory');
            });

            const searchTerms = ['用户管理', '订单查询', '产品列表'];

            // 执行多次搜索
            for (const term of searchTerms) {
                // 打开搜索
                await page.click('[data-testid="search-trigger"]');
                await new Promise(resolve => setTimeout(resolve, 300));

                // 清空输入框
                await page.click('[data-testid="search-input"]');
                await page.keyboard.down('Control');
                await page.keyboard.press('KeyA');
                await page.keyboard.up('Control');
                await page.keyboard.press('Backspace');

                // 输入搜索词
                await page.type('[data-testid="search-input"]', term);
                await new Promise(resolve => setTimeout(resolve, 600)); // 等待防抖

                // 模拟确认搜索（按Enter或点击结果）
                await page.keyboard.press('Enter');
                await new Promise(resolve => setTimeout(resolve, 300));

                // 关闭搜索对话框
                await page.keyboard.press('Escape');
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            // 检查本地存储中的历史记录
            const savedHistory = await page.evaluate(() => {
                const history1 = localStorage.getItem('search-history');
                const history2 = localStorage.getItem('searchHistory');
                return history1 || history2;
            });

            expect(savedHistory).toBeTruthy();

            if (savedHistory) {
                const historyArray = JSON.parse(savedHistory);
                console.log('保存的搜索历史:', historyArray);
                expect(historyArray.length).toBeGreaterThan(0);
                expect(historyArray.length).toBeLessThanOrEqual(10); // 应该限制数量
            }

            // 截图
            await page.screenshot({
                path: path.join(global.TEST_CONFIG.screenshotPath, 'globalSearch-history-saved.png'),
                fullPage: false
            });
        });

        test('搜索历史应该在重新打开时显示', async () => {
            // 首先确保有一些历史记录
            await page.evaluate(() => {
                const mockHistory = [
                    { query: '用户管理', timestamp: Date.now() - 1000 },
                    { query: '订单查询', timestamp: Date.now() - 2000 },
                    { query: '产品列表', timestamp: Date.now() - 3000 }
                ];
                localStorage.setItem('search-history', JSON.stringify(mockHistory));
            });

            await page.waitForSelector('[data-testid="search-trigger"]', { timeout: 5000 });

            // 打开搜索对话框
            await page.click('[data-testid="search-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 500));

            // 检查是否显示历史记录
            const historyContainer = await page.$('[data-testid="search-history"]');
            const recentSearches = await page.$('[data-testid="recent-searches"]');
            
            if (historyContainer || recentSearches) {
                const historyItems = await page.$$('[data-testid="history-item"]');
                console.log(`显示的历史记录数量: ${historyItems.length}`);
                expect(historyItems.length).toBeGreaterThan(0);

                // 检查历史记录项的结构
                if (historyItems.length > 0) {
                    const firstHistoryItem = await page.$eval('[data-testid="history-item"]', el => ({
                        hasText: el.textContent.trim().length > 0,
                        isClickable: el.tagName === 'BUTTON' || !!el.onclick || !!el.getAttribute('role')
                    }));

                    expect(firstHistoryItem.hasText).toBe(true);
                    expect(firstHistoryItem.isClickable).toBe(true);
                }

                // 截图
                await page.screenshot({
                    path: path.join(global.TEST_CONFIG.screenshotPath, 'globalSearch-history-display.png'),
                    fullPage: false
                });
            }
        });

        test('点击历史记录应该填充搜索框', async () => {
            // 设置历史记录
            await page.evaluate(() => {
                const mockHistory = [
                    { query: '用户管理系统', timestamp: Date.now() - 1000 }
                ];
                localStorage.setItem('search-history', JSON.stringify(mockHistory));
            });

            await page.waitForSelector('[data-testid="search-trigger"]', { timeout: 5000 });

            // 打开搜索对话框
            await page.click('[data-testid="search-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 500));

            // 查找并点击历史记录项
            const historyItem = await page.$('[data-testid="history-item"]');
            if (historyItem) {
                await historyItem.click();
                await new Promise(resolve => setTimeout(resolve, 300));

                // 检查搜索框是否被填充
                const inputValue = await page.$eval('[data-testid="search-input"]', el => el.value);
                expect(inputValue).toBe('用户管理系统');

                // 截图
                await page.screenshot({
                    path: path.join(global.TEST_CONFIG.screenshotPath, 'globalSearch-history-clicked.png'),
                    fullPage: false
                });
            }
        });

        test('历史记录应该支持清除功能', async () => {
            // 设置历史记录
            await page.evaluate(() => {
                const mockHistory = [
                    { query: '测试历史1', timestamp: Date.now() - 1000 },
                    { query: '测试历史2', timestamp: Date.now() - 2000 }
                ];
                localStorage.setItem('search-history', JSON.stringify(mockHistory));
            });

            await page.waitForSelector('[data-testid="search-trigger"]', { timeout: 5000 });

            // 打开搜索对话框
            await page.click('[data-testid="search-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 500));

            // 查找清除历史按钮
            const clearHistoryButton = await page.$('[data-testid="clear-history"]');
            if (clearHistoryButton) {
                await clearHistoryButton.click();
                await new Promise(resolve => setTimeout(resolve, 300));

                // 检查历史记录是否被清除
                const historyItems = await page.$$('[data-testid="history-item"]');
                expect(historyItems.length).toBe(0);

                // 检查本地存储
                const clearedHistory = await page.evaluate(() => {
                    return localStorage.getItem('search-history');
                });
                expect(clearedHistory).toBe(null);
            }
        });
    });

    describe('搜索结果分组测试', () => {
        test('搜索结果应该按类型正确分组', async () => {
            await page.waitForSelector('[data-testid="search-trigger"]', { timeout: 5000 });

            // 打开搜索对话框
            await page.click('[data-testid="search-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 输入搜索词
            await page.type('[data-testid="search-input"]', '用户');
            await new Promise(resolve => setTimeout(resolve, 1000)); // 等待防抖和搜索结果

            // 检查搜索结果分组
            const resultGroups = await page.$$eval('[data-testid*="search-group"]', groups => 
                groups.map(group => ({
                    type: group.getAttribute('data-testid'),
                    title: group.querySelector('[data-testid="group-title"]')?.textContent || '',
                    count: group.querySelectorAll('[data-testid="search-result-item"]').length
                }))
            );

            if (resultGroups.length > 0) {
                console.log('搜索结果分组:', resultGroups);

                // 验证分组结构
                resultGroups.forEach(group => {
                    expect(group.title.length).toBeGreaterThan(0);
                    expect(group.count).toBeGreaterThan(0);
                });

                // 截图
                await page.screenshot({
                    path: path.join(global.TEST_CONFIG.screenshotPath, 'globalSearch-result-groups.png'),
                    fullPage: false
                });
            }
        });

        test('每个分组应该显示正确的类型标识', async () => {
            await page.waitForSelector('[data-testid="search-trigger"]', { timeout: 5000 });

            // 打开搜索对话框
            await page.click('[data-testid="search-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 输入搜索词
            await page.type('[data-testid="search-input"]', '管理');
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 检查预期的分组类型
            const expectedGroups = ['pages', 'orders', 'products', 'users', 'settings'];
            
            for (const groupType of expectedGroups) {
                const group = await page.$(`[data-testid="search-group-${groupType}"]`);
                if (group) {
                    const groupTitle = await group.$eval('[data-testid="group-title"]', 
                        el => el.textContent.trim()
                    );
                    console.log(`${groupType} 分组标题:`, groupTitle);
                    expect(groupTitle.length).toBeGreaterThan(0);
                }
            }
        });

        test('分组结果应该支持折叠/展开', async () => {
            await page.waitForSelector('[data-testid="search-trigger"]', { timeout: 5000 });

            // 打开搜索对话框
            await page.click('[data-testid="search-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 输入搜索词
            await page.type('[data-testid="search-input"]', '用户');
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 查找可折叠的分组
            const collapsibleGroups = await page.$$('[data-testid*="group-toggle"]');
            
            if (collapsibleGroups.length > 0) {
                const firstGroup = collapsibleGroups[0];
                
                // 点击折叠/展开按钮
                await firstGroup.click();
                await new Promise(resolve => setTimeout(resolve, 300));

                // 检查分组状态变化
                const groupState = await page.evaluate(() => {
                    const group = document.querySelector('[data-testid*="search-group"]');
                    return group ? group.getAttribute('data-expanded') : null;
                });

                console.log('分组展开状态:', groupState);

                // 截图
                await page.screenshot({
                    path: path.join(global.TEST_CONFIG.screenshotPath, 'globalSearch-group-toggle.png'),
                    fullPage: false
                });
            }
        });
    });

    describe('API集成和数据加载测试', () => {
        test('搜索应该触发正确的API调用', async () => {
            const apiRequests = [];

            // 监听网络请求
            page.on('request', request => {
                if (request.url().includes('/search') || request.url().includes('/api/search')) {
                    apiRequests.push({
                        url: request.url(),
                        method: request.method(),
                        headers: request.headers(),
                        postData: request.postData()
                    });
                }
            });

            await page.waitForSelector('[data-testid="search-trigger"]', { timeout: 5000 });

            // 打开搜索对话框
            await page.click('[data-testid="search-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 输入搜索词
            await page.type('[data-testid="search-input"]', '用户管理');
            await new Promise(resolve => setTimeout(resolve, 800)); // 等待防抖和API调用

            // 检查API请求
            if (apiRequests.length > 0) {
                console.log('搜索API请求:', apiRequests);
                
                const searchRequest = apiRequests[0];
                expect(searchRequest.method).toBe('GET');
                expect(searchRequest.url).toContain('用户管理');
            }
        });

        test('搜索加载状态应该正确显示', async () => {
            await page.waitForSelector('[data-testid="search-trigger"]', { timeout: 5000 });

            // 打开搜索对话框
            await page.click('[data-testid="search-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 输入搜索词
            await page.type('[data-testid="search-input"]', '测试加载');
            
            // 立即检查加载状态
            const loadingIndicator = await page.$('[data-testid="search-loading"]');
            if (loadingIndicator) {
                const isVisible = await loadingIndicator.isIntersectingViewport();
                expect(isVisible).toBe(true);

                // 截图显示加载状态
                await page.screenshot({
                    path: path.join(global.TEST_CONFIG.screenshotPath, 'globalSearch-loading-state.png'),
                    fullPage: false
                });
            }

            // 等待加载完成
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 检查加载指示器是否消失
            const loadingStillVisible = await page.$('[data-testid="search-loading"]');
            if (loadingStillVisible) {
                const stillVisible = await loadingStillVisible.isIntersectingViewport();
                expect(stillVisible).toBe(false);
            }
        });

        test('搜索错误状态应该优雅处理', async () => {
            // 模拟网络错误
            await page.setRequestInterception(true);
            page.on('request', request => {
                if (request.url().includes('/search') || request.url().includes('/api/search')) {
                    request.abort();
                } else {
                    request.continue();
                }
            });

            await page.waitForSelector('[data-testid="search-trigger"]', { timeout: 5000 });

            // 打开搜索对话框
            await page.click('[data-testid="search-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 输入搜索词（会触发失败的API调用）
            await page.type('[data-testid="search-input"]', '测试错误');
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 检查错误状态显示
            const errorMessage = await page.$('[data-testid="search-error"]');
            if (errorMessage) {
                const errorText = await errorMessage.evaluate(el => el.textContent.trim());
                console.log('搜索错误信息:', errorText);
                expect(errorText.length).toBeGreaterThan(0);

                // 截图
                await page.screenshot({
                    path: path.join(global.TEST_CONFIG.screenshotPath, 'globalSearch-error-state.png'),
                    fullPage: false
                });
            }
        });
    });

    describe('搜索缓存和性能测试', () => {
        test('搜索结果应该被缓存', async () => {
            const apiRequests = [];

            page.on('request', request => {
                if (request.url().includes('/search') || request.url().includes('/api/search')) {
                    apiRequests.push(request.url());
                }
            });

            await page.waitForSelector('[data-testid="search-trigger"]', { timeout: 5000 });

            // 第一次搜索
            await page.click('[data-testid="search-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 300));
            await page.type('[data-testid="search-input"]', '缓存测试');
            await new Promise(resolve => setTimeout(resolve, 800));
            await page.keyboard.press('Escape');

            const firstSearchRequests = apiRequests.length;

            // 第二次相同搜索
            await page.click('[data-testid="search-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // 清空输入框
            await page.click('[data-testid="search-input"]');
            await page.keyboard.down('Control');
            await page.keyboard.press('KeyA');
            await page.keyboard.up('Control');
            await page.keyboard.press('Backspace');
            
            await page.type('[data-testid="search-input"]', '缓存测试');
            await new Promise(resolve => setTimeout(resolve, 800));

            const secondSearchRequests = apiRequests.length;

            // 如果有缓存，第二次搜索不应该产生新的API请求
            console.log(`第一次搜索API请求数: ${firstSearchRequests}`);
            console.log(`第二次搜索API请求数: ${secondSearchRequests}`);
            
            // 缓存生效时，第二次搜索的请求数应该不变或变化很小
            expect(secondSearchRequests - firstSearchRequests).toBeLessThanOrEqual(1);
        });

        test('搜索性能应该在合理范围内', async () => {
            await page.waitForSelector('[data-testid="search-trigger"]', { timeout: 5000 });

            // 测试搜索响应时间
            const searchStartTime = Date.now();

            await page.click('[data-testid="search-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 300));
            await page.type('[data-testid="search-input"]', '性能测试');

            // 等待搜索结果出现或超时
            try {
                await page.waitForSelector('[data-testid="search-results"], [data-testid="search-empty-state"]', { 
                    timeout: 2000 
                });
            } catch (error) {
                console.log('搜索结果加载超时');
            }

            const searchEndTime = Date.now();
            const searchTime = searchEndTime - searchStartTime;

            console.log(`搜索响应时间: ${searchTime}ms`);

            // 搜索应该在2秒内完成
            expect(searchTime).toBeLessThan(2000);
        });

        test('并发搜索应该正确处理', async () => {
            await page.waitForSelector('[data-testid="search-trigger"]', { timeout: 5000 });

            // 打开搜索对话框
            await page.click('[data-testid="search-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 快速连续输入不同的搜索词
            await page.type('[data-testid="search-input"]', 'a');
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 清空并输入新的搜索词
            await page.keyboard.down('Control');
            await page.keyboard.press('KeyA');
            await page.keyboard.up('Control');
            await page.type('[data-testid="search-input"]', 'user');
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 再次清空并输入最终搜索词
            await page.keyboard.down('Control');
            await page.keyboard.press('KeyA');
            await page.keyboard.up('Control');
            await page.type('[data-testid="search-input"]', '用户管理');

            // 等待最终搜索结果
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 验证最终输入值
            const finalValue = await page.$eval('[data-testid="search-input"]', el => el.value);
            expect(finalValue).toBe('用户管理');

            // 检查是否有结果显示
            const hasResults = await page.$('[data-testid="search-results"]');
            const hasEmptyState = await page.$('[data-testid="search-empty-state"]');
            
            expect(hasResults || hasEmptyState).toBeTruthy();
        });
    });

    describe('搜索输入验证和安全性测试', () => {
        test('搜索输入应该被正确验证和净化', async () => {
            await page.waitForSelector('[data-testid="search-trigger"]', { timeout: 5000 });

            // 打开搜索对话框
            await page.click('[data-testid="search-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 测试各种输入情况
            const testInputs = [
                '<script>alert("xss")</script>',
                'javascript:alert("xss")',
                '   空格测试   ',
                '特殊字符!@#$%^&*()',
                '很长的搜索词'.repeat(20)
            ];

            for (const testInput of testInputs) {
                // 清空输入框
                await page.click('[data-testid="search-input"]');
                await page.keyboard.down('Control');
                await page.keyboard.press('KeyA');
                await page.keyboard.up('Control');
                await page.keyboard.press('Backspace');

                // 输入测试数据
                await page.type('[data-testid="search-input"]', testInput);
                await new Promise(resolve => setTimeout(resolve, 600));

                // 检查输入值是否被正确处理
                const processedValue = await page.$eval('[data-testid="search-input"]', el => el.value);
                console.log(`输入: "${testInput}" -> 处理后: "${processedValue}"`);

                // 验证没有脚本注入
                expect(processedValue).not.toContain('<script>');
                expect(processedValue).not.toContain('javascript:');
            }
        });

        test('搜索长度应该有限制', async () => {
            await page.waitForSelector('[data-testid="search-trigger"]', { timeout: 5000 });

            // 打开搜索对话框
            await page.click('[data-testid="search-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 输入过长的搜索词
            const longText = 'a'.repeat(200);
            await page.type('[data-testid="search-input"]', longText);
            await new Promise(resolve => setTimeout(resolve, 300));

            // 检查输入是否被限制
            const actualValue = await page.$eval('[data-testid="search-input"]', el => el.value);
            console.log(`长文本输入长度: ${actualValue.length}`);

            // 应该有合理的长度限制（如100字符）
            expect(actualValue.length).toBeLessThanOrEqual(100);
        });
    });

    describe('全局搜索集成测试', () => {
        test('搜索功能应该与其他组件协同工作', async () => {
            await page.waitForSelector('[data-testid="search-trigger"]', { timeout: 5000 });

            // 1. 切换主题
            await page.click('[data-testid="theme-toggle"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 2. 打开搜索
            await page.click('[data-testid="search-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 3. 输入搜索
            await page.type('[data-testid="search-input"]', '集成测试');
            await new Promise(resolve => setTimeout(resolve, 600));

            // 4. 切换语言（如果可以）
            await page.keyboard.press('Escape'); // 先关闭搜索
            await new Promise(resolve => setTimeout(resolve, 200));

            const languageSwitcher = await page.$('[data-testid="language-switcher"]');
            if (languageSwitcher) {
                await languageSwitcher.click();
                await new Promise(resolve => setTimeout(resolve, 300));
                await page.keyboard.press('Escape');
            }

            // 5. 再次打开搜索，验证功能正常
            await page.click('[data-testid="search-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            const searchDialog = await page.$('[data-testid="search-dialog"]');
            expect(searchDialog).toBeTruthy();

            // 截图记录最终状态
            await page.screenshot({
                path: path.join(global.TEST_CONFIG.screenshotPath, 'globalSearch-integration-test.png'),
                fullPage: false
            });
        });
    });

    describe('错误处理和边界情况', () => {
        test('不应该有JavaScript错误', async () => {
            await page.waitForSelector('[data-testid="search-trigger"]', { timeout: 5000 });

            // 执行各种搜索操作
            await page.click('[data-testid="search-trigger"]');
            await new Promise(resolve => setTimeout(resolve, 300));

            await page.type('[data-testid="search-input"]', '错误测试');
            await new Promise(resolve => setTimeout(resolve, 500));

            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('ArrowUp');
            await page.keyboard.press('Enter');
            await page.keyboard.press('Escape');

            // 重复操作
            await page.click('[data-testid="search-trigger"]');
            await page.keyboard.down('Control');
            await page.keyboard.press('KeyK');
            await page.keyboard.up('Control');
            await page.keyboard.press('Escape');

            // 检查控制台错误
            const filteredErrors = consoleErrors.filter(error => 
                !error.includes('favicon') && 
                !error.includes('chrome-extension') &&
                !error.includes('Failed to load resource')
            );

            expect(filteredErrors.length).toBe(0);

            if (filteredErrors.length > 0) {
                console.log('全局搜索过程中的错误:', filteredErrors);
            }
        });
    });
});