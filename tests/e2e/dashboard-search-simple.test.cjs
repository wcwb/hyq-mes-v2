const puppeteer = require('puppeteer');
const path = require('path');

describe('Dashboard 搜索功能简化测试', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: false,
      slowMo: 100,
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    
    // 监听控制台输出
    page.on('console', msg => {
      if (msg.type() === 'log') console.log('🔍 PAGE:', msg.text());
      if (msg.type() === 'error') console.error('❌ PAGE ERROR:', msg.text());
    });
  });

  afterAll(async () => {
    if (browser) await browser.close();
  });

  test('访问 Dashboard 并测试搜索', async () => {
    console.log('📍 开始测试 Dashboard 搜索功能...');

    // 1. 直接访问 dashboard（假设已登录或无需登录）
    try {
      await page.goto('http://localhost:8000/dashboard', { 
        waitUntil: 'networkidle0', 
        timeout: 15000 
      });
      console.log('✅ 成功访问 Dashboard');
    } catch (error) {
      console.log('❌ 访问 Dashboard 失败，尝试先登录...');
      
      // 尝试登录
      await page.goto('http://localhost:8000/login');
      await page.waitForSelector('input[type="email"]', { timeout: 10000 });
      
      await page.type('input[type="email"]', 'test@example.com');
      await page.type('input[type="password"]', 'password');
      
      // 尝试找到登录按钮并点击
      const loginSelectors = [
        'button[type="submit"]',
        'button:contains("登录")',
        'button:contains("Login")',
        'input[type="submit"]'
      ];
      
      for (const selector of loginSelectors) {
        try {
          const loginBtn = await page.$(selector);
          if (loginBtn) {
            await loginBtn.click();
            break;
          }
        } catch (e) {
          // 继续尝试
        }
      }
      
      // 等待登录后跳转
      await page.waitForTimeout(3000);
      await page.goto('http://localhost:8000/dashboard');
    }

    // 截图记录当前状态
    await page.screenshot({ 
      path: path.join(__dirname, '../test-results/dashboard-initial.png'),
      fullPage: true 
    });

    // 2. 查找和测试搜索功能
    console.log('🔍 查找搜索功能...');

    // 检查页面是否包含 TopMenuBar 组件
    const hasTopMenuBar = await page.evaluate(() => {
      return document.querySelector('.top-menu-bar') !== null ||
             document.querySelector('[data-component="TopMenuBar"]') !== null ||
             document.body.innerHTML.includes('TopMenuBar');
    });

    console.log('TopMenuBar 组件存在:', hasTopMenuBar);

    // 尝试多种方式找到搜索功能
    const searchStrategies = [
      {
        name: '键盘快捷键 Ctrl+K',
        action: async () => {
          await page.keyboard.down('Control');
          await page.keyboard.press('k');
          await page.keyboard.up('Control');
          await page.waitForTimeout(1000);
        }
      },
      {
        name: '键盘快捷键 Cmd+K (Mac)',
        action: async () => {
          await page.keyboard.down('Meta');
          await page.keyboard.press('k');
          await page.keyboard.up('Meta');
          await page.waitForTimeout(1000);
        }
      },
      {
        name: '点击搜索图标',
        action: async () => {
          const searchIcons = [
            '[data-testid="search-trigger"]',
            'button[aria-label*="搜索"]',
            'button[aria-label*="search"]',
            '.search-icon',
            '.search-button',
            'svg[data-icon="search"]'
          ];
          
          for (const selector of searchIcons) {
            try {
              const element = await page.$(selector);
              if (element) {
                await element.click();
                await page.waitForTimeout(1000);
                console.log(`点击了: ${selector}`);
                return;
              }
            } catch (e) {
              // 继续
            }
          }
        }
      }
    ];

    let searchFound = false;
    
    for (const strategy of searchStrategies) {
      console.log(`尝试策略: ${strategy.name}`);
      
      try {
        await strategy.action();
        
        // 检查是否出现搜索界面
        const searchIndicators = [
          'input[type="search"]',
          'input[placeholder*="搜索"]',
          'input[placeholder*="search"]',
          '[data-testid="search-input"]',
          '.search-input',
          '[role="dialog"] input',
          '[role="combobox"]'
        ];
        
        for (const indicator of searchIndicators) {
          try {
            await page.waitForSelector(indicator, { timeout: 2000 });
            console.log(`✅ 找到搜索界面: ${indicator}`);
            searchFound = true;
            break;
          } catch (e) {
            // 继续
          }
        }
        
        if (searchFound) break;
        
      } catch (error) {
        console.log(`策略 ${strategy.name} 失败:`, error.message);
      }
    }

    // 3. 如果找到搜索功能，进行测试
    if (searchFound) {
      console.log('🎉 成功找到搜索功能，开始测试...');
      
      // 找到搜索输入框
      const searchSelectors = [
        'input[type="search"]',
        'input[placeholder*="搜索"]',
        'input[placeholder*="search"]',
        '[data-testid="search-input"]',
        '.search-input',
        '[role="dialog"] input:first-of-type',
        '[role="combobox"]'
      ];
      
      let searchInput = null;
      for (const selector of searchSelectors) {
        try {
          searchInput = await page.$(selector);
          if (searchInput) {
            console.log(`使用搜索输入框: ${selector}`);
            break;
          }
        } catch (e) {
          // 继续
        }
      }
      
      if (searchInput) {
        // 测试搜索查询
        const testQueries = ['dashboard', '仪表板', 'order', '订单'];
        
        for (const query of testQueries) {
          console.log(`测试搜索: "${query}"`);
          
          // 清空并输入搜索词
          await searchInput.click();
          await page.keyboard.down('Control');
          await page.keyboard.press('a');
          await page.keyboard.up('Control');
          await searchInput.type(query);
          
          // 等待搜索结果
          await page.waitForTimeout(1500);
          
          // 截图记录搜索结果
          await page.screenshot({
            path: path.join(__dirname, `../test-results/search-${query}.png`),
            fullPage: true
          });
          
          // 检查是否有结果显示
          const hasResults = await page.evaluate(() => {
            const resultSelectors = [
              '.search-results',
              '.search-result-item',
              '[data-testid="search-result"]',
              '.dropdown-item',
              '[role="option"]',
              '[role="listbox"] > *'
            ];
            
            return resultSelectors.some(selector => {
              const elements = document.querySelectorAll(selector);
              return elements.length > 0;
            });
          });
          
          console.log(`搜索 "${query}" 结果:`, hasResults ? '有结果' : '无结果');
        }
        
        // 测试 ESC 键关闭搜索
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        
      } else {
        console.log('❌ 找到搜索界面但无法定位输入框');
      }
      
    } else {
      console.log('❌ 未找到搜索功能');
      
      // 分析页面内容
      const pageInfo = await page.evaluate(() => {
        return {
          title: document.title,
          hasInputs: document.querySelectorAll('input').length,
          hasButtons: document.querySelectorAll('button').length,
          bodyClasses: document.body.className,
          headContent: document.head.innerHTML.substring(0, 500)
        };
      });
      
      console.log('页面信息:', pageInfo);
    }

    // 4. 最终截图
    await page.screenshot({
      path: path.join(__dirname, '../test-results/dashboard-final.png'),
      fullPage: true
    });

    console.log('🏁 测试完成');
    
  }, 60000);
});