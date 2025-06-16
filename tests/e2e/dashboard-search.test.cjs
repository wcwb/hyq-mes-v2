const puppeteer = require('puppeteer');
const path = require('path');

describe('Dashboard 搜索功能测试', () => {
  let browser;
  let page;
  const baseUrl = 'http://localhost:8000';

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: false, // 设置为 false 可以看到浏览器操作
      slowMo: 50, // 减慢操作速度以便观察
      defaultViewport: {
        width: 1920,
        height: 1080
      },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
    page = await browser.newPage();
    
    // 启用控制台日志
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    await page.goto(`${baseUrl}/login`);
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  });

  test('登录并测试仪表板搜索功能', async () => {
    // 1. 登录
    console.log('开始登录流程...');
    await page.type('input[type="email"]', 'test@example.com');
    await page.type('input[type="password"]', 'password');
    
    // 查找并点击登录按钮
    const loginButton = await page.$('button[type="submit"]') || await page.$('button:contains("登录")') || await page.$('button:contains("Login")');
    if (loginButton) {
      await loginButton.click();
    } else {
      // 如果找不到按钮，尝试按回车
      await page.keyboard.press('Enter');
    }

    // 等待登录成功，导航到仪表板
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
    } catch (error) {
      console.log('导航等待超时，继续测试...');
    }

    // 确保在仪表板页面
    await page.goto(`${baseUrl}/dashboard`);
    await page.waitForSelector('body', { timeout: 10000 });
    
    console.log('成功访问仪表板页面');

    // 2. 查找搜索输入框
    console.log('查找搜索功能...');
    
    // 尝试多种可能的搜索框选择器
    const searchSelectors = [
      'input[type="search"]',
      'input[placeholder*="搜索"]',
      'input[placeholder*="search"]',
      'input[placeholder*="Search"]',
      '[data-testid="search-input"]',
      '[data-testid="search"]',
      '.search-input',
      '#search',
      'input[name="search"]',
      // TopMenuBar 中的搜索框
      '.top-menu-bar input',
      'header input',
      // 可能在对话框中的搜索
      '[role="dialog"] input',
      // 通用输入框（作为后备）
      'input[type="text"]'
    ];

    let searchInput = null;
    for (const selector of searchSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        searchInput = await page.$(selector);
        if (searchInput) {
          console.log(`找到搜索框: ${selector}`);
          break;
        }
      } catch (error) {
        // 继续尝试下一个选择器
      }
    }

    // 如果没有找到搜索框，尝试触发搜索功能
    if (!searchInput) {
      console.log('未找到可见的搜索框，尝试触发搜索功能...');
      
      // 尝试键盘快捷键
      try {
        await page.keyboard.down('Control');
        await page.keyboard.press('k');
        await page.keyboard.up('Control');
        
        await page.waitForTimeout(1000);
        
        // 再次查找搜索框
        for (const selector of searchSelectors) {
          try {
            searchInput = await page.$(selector);
            if (searchInput) {
              console.log(`通过快捷键找到搜索框: ${selector}`);
              break;
            }
          } catch (error) {
            // 继续
          }
        }
      } catch (error) {
        console.log('快捷键尝试失败:', error.message);
      }

      // 尝试点击可能的搜索按钮或图标
      if (!searchInput) {
        const searchTriggers = [
          'button[aria-label*="搜索"]',
          'button[aria-label*="search"]',
          '[data-testid="search-trigger"]',
          'button:contains("搜索")',
          'button:contains("Search")',
          '.search-button',
          '.search-icon',
          'svg[data-icon="search"]',
          '[role="button"]:contains("搜索")'
        ];

        for (const trigger of searchTriggers) {
          try {
            const element = await page.$(trigger);
            if (element) {
              console.log(`点击搜索触发器: ${trigger}`);
              await element.click();
              await page.waitForTimeout(1000);
              
              // 再次查找搜索框
              for (const selector of searchSelectors) {
                try {
                  searchInput = await page.$(selector);
                  if (searchInput) {
                    console.log(`点击触发器后找到搜索框: ${selector}`);
                    break;
                  }
                } catch (error) {
                  // 继续
                }
              }
              if (searchInput) break;
            }
          } catch (error) {
            // 继续尝试下一个触发器
          }
        }
      }
    }

    // 3. 测试搜索功能
    if (searchInput) {
      console.log('开始测试搜索功能...');
      
      // 测试搜索输入
      await searchInput.click();
      await page.waitForTimeout(500);
      
      const searchQueries = ['仪表板', 'dashboard', '订单', 'order', '用户'];
      
      for (const query of searchQueries) {
        console.log(`测试搜索查询: ${query}`);
        
        // 清空输入框
        await searchInput.click();
        await page.keyboard.down('Control');
        await page.keyboard.press('a');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        
        // 输入搜索词
        await searchInput.type(query);
        await page.waitForTimeout(1000); // 等待防抖

        // 检查是否有搜索结果出现
        const resultSelectors = [
          '.search-results',
          '[data-testid="search-results"]',
          '.search-dropdown',
          '.search-suggestions',
          '[role="listbox"]',
          '[role="menu"]',
          '.dropdown-menu',
          '.search-result-item'
        ];

        let foundResults = false;
        for (const selector of resultSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 2000 });
            const results = await page.$$(selector);
            if (results.length > 0) {
              console.log(`✅ 找到搜索结果 (${query}): ${selector}, 数量: ${results.length}`);
              foundResults = true;
              break;
            }
          } catch (error) {
            // 继续尝试
          }
        }

        if (!foundResults) {
          console.log(`⚠️  未找到搜索结果 (${query})`);
        }

        // 截图记录
        await page.screenshot({
          path: path.join(__dirname, `../test-results/dashboard-search-${query}.png`),
          fullPage: true
        });
      }

      // 测试搜索结果交互
      console.log('测试搜索结果交互...');
      
      // 清空并输入一个通用搜索词
      await searchInput.click();
      await page.keyboard.down('Control');
      await page.keyboard.press('a');
      await page.keyboard.up('Control');
      await searchInput.type('测试');
      await page.waitForTimeout(1500);

      // 尝试点击第一个搜索结果
      const firstResultSelectors = [
        '.search-result-item:first-child',
        '.search-results > *:first-child',
        '[data-testid="search-result"]:first-child',
        '[role="option"]:first-child',
        '.dropdown-item:first-child'
      ];

      for (const selector of firstResultSelectors) {
        try {
          const firstResult = await page.$(selector);
          if (firstResult) {
            console.log(`点击第一个搜索结果: ${selector}`);
            await firstResult.click();
            await page.waitForTimeout(1000);
            break;
          }
        } catch (error) {
          // 继续尝试
        }
      }

      // 测试键盘导航
      console.log('测试键盘导航...');
      await searchInput.click();
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(500);
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(500);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);

    } else {
      console.log('❌ 未找到搜索功能');
      
      // 截图记录当前页面状态
      await page.screenshot({
        path: path.join(__dirname, '../test-results/dashboard-no-search.png'),
        fullPage: true
      });
      
      // 输出页面HTML用于调试
      const html = await page.content();
      console.log('页面HTML片段:', html.substring(0, 1000));
    }

    // 4. 最终截图
    await page.screenshot({
      path: path.join(__dirname, '../test-results/dashboard-search-final.png'),
      fullPage: true
    });

    console.log('测试完成');
  }, 60000); // 60秒超时

  test('检查页面搜索相关元素', async () => {
    // 先登录
    await page.type('input[type="email"]', 'test@example.com');
    await page.type('input[type="password"]', 'password');
    
    const loginButton = await page.$('button[type="submit"]');
    if (loginButton) {
      await loginButton.click();
    }

    try {
      await page.waitForNavigation({ timeout: 5000 });
    } catch (error) {
      // 继续
    }

    await page.goto(`${baseUrl}/dashboard`);
    await page.waitForSelector('body');

    // 分析页面结构
    console.log('分析页面搜索相关元素...');
    
    // 获取所有可能的搜索相关元素
    const searchElements = await page.evaluate(() => {
      const elements = [];
      
      // 查找所有输入框
      const inputs = document.querySelectorAll('input');
      inputs.forEach((input, index) => {
        elements.push({
          type: 'input',
          index,
          tagName: input.tagName,
          type_attr: input.type,
          placeholder: input.placeholder,
          id: input.id,
          className: input.className,
          name: input.name
        });
      });

      // 查找所有按钮
      const buttons = document.querySelectorAll('button');
      buttons.forEach((button, index) => {
        elements.push({
          type: 'button',
          index,
          tagName: button.tagName,
          textContent: button.textContent?.trim(),
          className: button.className,
          ariaLabel: button.getAttribute('aria-label'),
          dataTestId: button.getAttribute('data-testid')
        });
      });

      // 查找搜索相关的文本
      const searchTexts = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent.trim().toLowerCase();
        if (text.includes('搜索') || text.includes('search')) {
          searchTexts.push({
            type: 'text',
            content: node.textContent.trim(),
            parentTag: node.parentElement?.tagName,
            parentClass: node.parentElement?.className
          });
        }
      }

      return { elements, searchTexts };
    });

    console.log('找到的输入框:', searchElements.elements.filter(e => e.type === 'input'));
    console.log('找到的按钮:', searchElements.elements.filter(e => e.type === 'button'));
    console.log('找到的搜索相关文本:', searchElements.searchTexts);

    // 截图
    await page.screenshot({
      path: path.join(__dirname, '../test-results/dashboard-elements-analysis.png'),
      fullPage: true
    });
  }, 30000);
});