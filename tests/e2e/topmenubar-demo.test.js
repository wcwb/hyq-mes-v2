import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建测试结果目录
const testResultsDir = path.join(__dirname, '../../test-results/topmenubar-demo');
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

// 不同的视口大小配置
const viewports = {
  mobile: { width: 375, height: 667, deviceScaleFactor: 2, isMobile: true },
  tablet: { width: 768, height: 1024, deviceScaleFactor: 2, isMobile: false },
  desktop: { width: 1920, height: 1080, deviceScaleFactor: 1, isMobile: false }
};

// 页面URL
const PAGE_URL = 'http://localhost:8000/demo/topmenubar';

// 辅助函数：等待元素加载
async function waitForElement(page, selector, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch (error) {
    console.log(`等待元素 ${selector} 超时`);
    return false;
  }
}

// 辅助函数：截取页面截图
async function takeScreenshot(page, filename, fullPage = false) {
  const filePath = path.join(testResultsDir, filename);
  await page.screenshot({
    path: filePath,
    fullPage: fullPage,
    type: 'png'
  });
  console.log(`截图保存到: ${filePath}`);
}

// 辅助函数：收集页面错误
function collectPageErrors(page) {
  const errors = [];
  const warnings = [];

  page.on('pageerror', (error) => {
    errors.push(`页面错误: ${error.toString()}`);
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`控制台错误: ${msg.text()}`);
    } else if (msg.type() === 'warning') {
      warnings.push(`控制台警告: ${msg.text()}`);
    }
  });

  return { errors, warnings };
}

// 主测试函数
async function runTests() {
  let browser;
  let results = {
    success: true,
    errors: [],
    warnings: [],
    tests: []
  };

  try {
    console.log('启动浏览器...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    console.log(`开始测试 TopMenuBar 组件演示页面: ${PAGE_URL}`);

    // 测试不同视口大小
    for (const [deviceName, viewport] of Object.entries(viewports)) {
      console.log(`\n=== 测试 ${deviceName.toUpperCase()} 视口 (${viewport.width}x${viewport.height}) ===`);

      const page = await browser.newPage();
      const { errors, warnings } = collectPageErrors(page);

      try {
        // 设置视口
        await page.setViewport(viewport);

        // 导航到页面
        console.log('导航到演示页面...');
        const response = await page.goto(PAGE_URL, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        if (!response.ok()) {
          throw new Error(`页面加载失败，状态码: ${response.status()}`);
        }

        console.log('页面加载成功');

        // 等待Vue应用加载完成
        await page.waitForSelector('#app', { timeout: 10000 });
        console.log('Vue应用加载完成');

        // 等待TopMenuBar组件加载
        const topMenuBarLoaded = await waitForElement(page, '.top-menu-bar, header', 10000);
        if (!topMenuBarLoaded) {
          console.log('尝试等待其他可能的TopMenuBar选择器...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // 截取页面加载后的截图
        await takeScreenshot(page, `${deviceName}-initial.png`);

        // 等待页面完全渲染
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 截取完整页面截图
        await takeScreenshot(page, `${deviceName}-full-page.png`, true);

        // 测试响应式断点信息
        const breakpointInfo = await page.evaluate(() => {
          const texts = Array.from(document.querySelectorAll('p')).map(p => p.textContent);
          const breakpointText = texts.find(text => text && text.includes('当前断点:'));
          return breakpointText || '未找到断点信息';
        });
        console.log(`断点信息: ${breakpointInfo}`);

        // 测试搜索栏
        console.log('测试搜索栏...');
        const searchSelectors = [
          'button[role="searchbox"]',
          'input[type="search"]',
          'input[placeholder*="搜索"]',
          'input[placeholder*="Search"]',
          '.search-input',
          '[data-testid="search-input"]',
          'button:has(.lucide-search)',
          'button:has([data-lucide="search"])'
        ];

        let searchFound = false;
        for (const selector of searchSelectors) {
          const searchElement = await page.$(selector);
          if (searchElement) {
            console.log(`找到搜索栏: ${selector}`);
            await searchElement.click();
            await new Promise(resolve => setTimeout(resolve, 500));
            await takeScreenshot(page, `${deviceName}-search-focused.png`);
            searchFound = true;
            break;
          }
        }

        if (!searchFound) {
          console.log('未找到搜索栏元素');
        }

        // 测试移动端特有功能
        let toolMenuFound = false;
        if (viewport.isMobile) {
          console.log('测试移动端功能...');

          // 查找移动端工具菜单按钮
          const toolMenuSelectors = [
            'button[aria-label*="工具"]',
            'button[aria-label*="menu"]',
            'button[aria-label*="tools"]',
            'button:has(.lucide-more-horizontal)',
            'button:has([data-lucide="more-horizontal"])',
            '[data-testid="tools-menu"]',
            'button[title*="工具"]'
          ];
          for (const selector of toolMenuSelectors) {
            try {
              const toolMenuButton = await page.$(selector);
              if (toolMenuButton) {
                console.log(`找到工具菜单按钮: ${selector}`);
                await toolMenuButton.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                await takeScreenshot(page, `${deviceName}-tools-menu-open.png`);
                toolMenuFound = true;
                break;
              }
            } catch (error) {
              // 忽略选择器错误，继续尝试下一个
            }
          }

          if (!toolMenuFound) {
            // 尝试通过更多的选择器查找按钮
            const moreButtons = await page.$$('button');
            for (const button of moreButtons) {
              // 检查按钮是否包含MoreHorizontal图标
              const hasMoreIcon = await page.evaluate(el => {
                const svg = el.querySelector('svg');
                return svg && (svg.classList.contains('lucide-more-horizontal') || svg.getAttribute('data-lucide') === 'more-horizontal');
              }, button);

              if (hasMoreIcon) {
                console.log('通过图标找到工具菜单按钮');
                await button.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                await takeScreenshot(page, `${deviceName}-tools-menu-open.png`);
                toolMenuFound = true;
                break;
              }
            }
          }

          if (!toolMenuFound) {
            console.log('未找到移动端工具菜单按钮');
          }
        }

        // 测试用户菜单
        console.log('测试用户菜单...');
        const userMenuSelectors = [
          '[data-testid="user-menu"]',
          '.user-menu',
          'button[aria-label*="用户"]',
          'button[aria-label*="User"]',
          'button:has(.avatar)',
          'button .avatar',
          'button[data-radix-collection-item]'
        ];

        let userMenuFound = false;
        for (const selector of userMenuSelectors) {
          const userMenuButton = await page.$(selector);
          if (userMenuButton) {
            console.log(`找到用户菜单: ${selector}`);
            await userMenuButton.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            await takeScreenshot(page, `${deviceName}-user-menu-open.png`);
            userMenuFound = true;
            break;
          }
        }

        if (!userMenuFound) {
          console.log('未找到用户菜单元素');
        }

        // 测试主题切换按钮
        console.log('测试主题切换按钮...');
        const themeButtons = await page.$$('button');
        for (const button of themeButtons) {
          const text = await page.evaluate(el => el.textContent, button);
          if (text && (text.includes('深色') || text.includes('浅色') || text.includes('Dark') || text.includes('Light'))) {
            console.log(`找到主题切换按钮: ${text}`);
            await button.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            await takeScreenshot(page, `${deviceName}-theme-switched.png`);
            break;
          }
        }

        // 测试侧边栏触发器切换
        console.log('测试侧边栏触发器切换...');
        const sidebarButtons = await page.$$('button');
        for (const button of sidebarButtons) {
          const text = await page.evaluate(el => el.textContent, button);
          if (text && (text.includes('显示') || text.includes('隐藏'))) {
            console.log(`找到侧边栏切换按钮: ${text}`);
            await button.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            await takeScreenshot(page, `${deviceName}-sidebar-toggled.png`);
            break;
          }
        }

        // 记录测试结果
        results.tests.push({
          device: deviceName,
          viewport: viewport,
          success: true,
          errors: [...errors],
          warnings: [...warnings],
          features: {
            pageLoaded: true,
            searchBar: searchFound,
            toolsMenu: viewport.isMobile ? toolMenuFound : 'N/A',
            userMenu: userMenuFound,
            responsive: true
          }
        });

        console.log(`${deviceName} 测试完成`);

      } catch (error) {
        console.error(`${deviceName} 测试失败:`, error.message);
        results.success = false;
        results.errors.push(`${deviceName}: ${error.message}`);

        // 截取错误截图
        try {
          await takeScreenshot(page, `${deviceName}-error.png`);
        } catch (screenshotError) {
          console.error('截取错误截图失败:', screenshotError.message);
        }

        results.tests.push({
          device: deviceName,
          viewport: viewport,
          success: false,
          errors: [error.message, ...errors],
          warnings: [...warnings]
        });
      }

      await page.close();
    }

    console.log('\n=== 测试完成 ===');

  } catch (error) {
    console.error('测试过程中发生错误:', error.message);
    results.success = false;
    results.errors.push(error.message);
  }

  if (browser) {
    await browser.close();
  }

  // 保存测试结果
  const reportPath = path.join(testResultsDir, 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`测试报告保存到: ${reportPath}`);

  return results;
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().then((results) => {
    console.log('\n=== 测试结果总结 ===');
    console.log(`总体状态: ${results.success ? '成功' : '失败'}`);
    console.log(`测试设备数量: ${results.tests.length}`);
    console.log(`错误数量: ${results.errors.length}`);
    console.log(`警告数量: ${results.warnings.length}`);

    if (results.errors.length > 0) {
      console.log('\n错误详情:');
      results.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    if (results.warnings.length > 0) {
      console.log('\n警告详情:');
      results.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning}`);
      });
    }

    results.tests.forEach((test) => {
      console.log(`\n${test.device} (${test.viewport.width}x${test.viewport.height}): ${test.success ? '✅' : '❌'}`);
      if (test.features) {
        console.log(`  - 页面加载: ${test.features.pageLoaded ? '✅' : '❌'}`);
        console.log(`  - 搜索栏: ${test.features.searchBar ? '✅' : '❌'}`);
        console.log(`  - 工具菜单: ${test.features.toolsMenu === 'N/A' ? 'N/A' : (test.features.toolsMenu ? '✅' : '❌')}`);
        console.log(`  - 用户菜单: ${test.features.userMenu ? '✅' : '❌'}`);
        console.log(`  - 响应式: ${test.features.responsive ? '✅' : '❌'}`);
      }
    });

    process.exit(results.success ? 0 : 1);
  }).catch((error) => {
    console.error('测试脚本执行失败:', error);
    process.exit(1);
  });
}

export { runTests };