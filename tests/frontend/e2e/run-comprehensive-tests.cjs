#!/usr/bin/env node

/**
 * 已完成功能的全面E2E测试运行器
 * 按顺序执行所有测试并生成综合报告
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 测试配置
const TEST_CONFIG = {
    baseDir: __dirname,
    resultsDir: path.join(__dirname, '../../../test-results'),
    timeout: 300000, // 5分钟总超时
    maxRetries: 2,
    parallel: false // 串行执行以避免冲突
};

// 测试套件定义
const TEST_SUITES = [
    {
        name: 'TopMenuBar组件测试',
        file: 'topMenuBar.comprehensive.test.cjs',
        description: '测试TopMenuBar组件的渲染、响应式布局和交互功能',
        priority: 'high',
        estimatedTime: '60s'
    },
    {
        name: '组件集成测试',
        file: 'componentIntegration.test.cjs',
        description: '测试SidebarTrigger、LanguageSwitcher、ThemeToggle、UserMenu的集成',
        priority: 'high',
        estimatedTime: '90s'
    },
    {
        name: 'SearchBar组件测试',
        file: 'searchBar.comprehensive.test.cjs',
        description: '测试搜索栏、对话框、键盘快捷键和无障碍功能',
        priority: 'high',
        estimatedTime: '75s'
    },
    {
        name: '全局搜索逻辑测试',
        file: 'globalSearch.comprehensive.test.cjs',
        description: '测试防抖搜索、历史管理、结果分组和性能优化',
        priority: 'high',
        estimatedTime: '120s'
    },
    {
        name: '响应式设计测试',
        file: 'responsiveDesign.test.cjs',
        description: '测试不同设备尺寸下的响应式表现和触摸交互',
        priority: 'medium',
        estimatedTime: '90s'
    },
    {
        name: '无障碍功能测试',
        file: 'accessibility.comprehensive.test.cjs',
        description: '测试ARIA属性、键盘导航、屏幕阅读器支持和焦点管理',
        priority: 'medium',
        estimatedTime: '100s'
    }
];

// 颜色输出函数
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function colorLog(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// 确保结果目录存在
function ensureDirectories() {
    if (!fs.existsSync(TEST_CONFIG.resultsDir)) {
        fs.mkdirSync(TEST_CONFIG.resultsDir, { recursive: true });
    }
    
    const e2eResultsDir = path.join(TEST_CONFIG.resultsDir, 'e2e-comprehensive');
    if (!fs.existsSync(e2eResultsDir)) {
        fs.mkdirSync(e2eResultsDir, { recursive: true });
    }
    
    return e2eResultsDir;
}

// 运行单个测试套件
function runTestSuite(suite, resultsDir) {
    return new Promise((resolve, reject) => {
        colorLog(`\n📋 开始执行: ${suite.name}`, 'cyan');
        colorLog(`   描述: ${suite.description}`, 'blue');
        colorLog(`   预计时间: ${suite.estimatedTime}`, 'blue');
        
        const startTime = Date.now();
        
        // Jest命令配置
        const jestConfig = path.join(__dirname, '../jest.config.cjs');
        const testFile = path.join(__dirname, suite.file);
        
        const jestArgs = [
            '--config', jestConfig,
            '--testTimeout', '60000',
            '--verbose',
            '--no-cache',
            '--forceExit',
            '--detectOpenHandles',
            testFile
        ];
        
        colorLog(`   命令: npx jest ${jestArgs.join(' ')}`, 'blue');
        
        const child = spawn('npx', ['jest', ...jestArgs], {
            stdio: ['inherit', 'pipe', 'pipe'],
            cwd: TEST_CONFIG.baseDir
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
            const output = data.toString();
            stdout += output;
            // 实时输出
            process.stdout.write(output);
        });
        
        child.stderr.on('data', (data) => {
            const output = data.toString();
            stderr += output;
            // 只输出非警告信息
            if (!output.includes('DeprecationWarning') && !output.includes('jest-haste-map')) {
                process.stderr.write(output);
            }
        });
        
        child.on('close', (code) => {
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            const result = {
                suite: suite.name,
                file: suite.file,
                success: code === 0,
                duration: duration,
                estimatedTime: suite.estimatedTime,
                stdout: stdout,
                stderr: stderr,
                timestamp: new Date().toISOString()
            };
            
            // 保存单个测试结果
            const resultFile = path.join(resultsDir, `${suite.file.replace('.cjs', '')}-result.json`);
            fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));
            
            if (code === 0) {
                colorLog(`✅ ${suite.name} 执行成功 (${duration}ms)`, 'green');
            } else {
                colorLog(`❌ ${suite.name} 执行失败 (${duration}ms)`, 'red');
            }
            
            resolve(result);
        });
        
        child.on('error', (error) => {
            colorLog(`❌ ${suite.name} 执行出错: ${error.message}`, 'red');
            reject(error);
        });
        
        // 设置超时
        setTimeout(() => {
            child.kill('SIGTERM');
            colorLog(`⏰ ${suite.name} 执行超时，已终止`, 'yellow');
            resolve({
                suite: suite.name,
                file: suite.file,
                success: false,
                duration: TEST_CONFIG.timeout,
                error: 'Timeout',
                timestamp: new Date().toISOString()
            });
        }, TEST_CONFIG.timeout);
    });
}

// 生成综合报告
function generateComprehensiveReport(results, resultsDir) {
    const report = {
        summary: {
            totalSuites: results.length,
            successfulSuites: results.filter(r => r.success).length,
            failedSuites: results.filter(r => !r.success).length,
            totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
            timestamp: new Date().toISOString(),
            testEnvironment: {
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch
            }
        },
        suites: results.map(result => ({
            name: result.suite,
            file: result.file,
            success: result.success,
            duration: result.duration,
            estimatedTime: result.estimatedTime,
            timestamp: result.timestamp,
            error: result.error || null
        })),
        details: results
    };
    
    // 保存JSON报告
    const reportFile = path.join(resultsDir, 'comprehensive-test-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    // 生成HTML报告
    generateHTMLReport(report, resultsDir);
    
    return report;
}

// 生成HTML报告
function generateHTMLReport(report, resultsDir) {
    const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>已完成功能E2E测试报告</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .title { font-size: 28px; font-weight: bold; margin: 0; }
        .subtitle { font-size: 16px; margin: 10px 0 0 0; opacity: 0.9; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 30px; }
        .metric { text-align: center; padding: 20px; border-radius: 8px; background: #f8f9fa; }
        .metric-value { font-size: 36px; font-weight: bold; margin-bottom: 5px; }
        .metric-label { color: #666; font-size: 14px; }
        .success { color: #28a745; }
        .danger { color: #dc3545; }
        .warning { color: #ffc107; }
        .info { color: #17a2b8; }
        .suites { padding: 0 30px 30px; }
        .suite { border: 1px solid #e9ecef; border-radius: 8px; margin-bottom: 20px; overflow: hidden; }
        .suite-header { background: #f8f9fa; padding: 15px 20px; border-bottom: 1px solid #e9ecef; display: flex; justify-content: space-between; align-items: center; }
        .suite-name { font-weight: bold; font-size: 18px; }
        .suite-status { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .status-success { background: #d4edda; color: #155724; }
        .status-failed { background: #f8d7da; color: #721c24; }
        .suite-details { padding: 20px; }
        .detail-row { display: flex; margin-bottom: 10px; }
        .detail-label { width: 120px; font-weight: bold; color: #666; }
        .detail-value { flex: 1; }
        .timestamp { font-size: 12px; color: #999; }
        .footer { text-align: center; padding: 20px; color: #666; border-top: 1px solid #e9ecef; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">已完成功能E2E测试报告</div>
            <div class="subtitle">HYQ MES V2 - TopMenuBar组件及相关功能测试</div>
            <div class="timestamp">生成时间: ${new Date(report.summary.timestamp).toLocaleString('zh-CN')}</div>
        </div>
        
        <div class="summary">
            <div class="metric">
                <div class="metric-value info">${report.summary.totalSuites}</div>
                <div class="metric-label">总测试套件</div>
            </div>
            <div class="metric">
                <div class="metric-value success">${report.summary.successfulSuites}</div>
                <div class="metric-label">成功套件</div>
            </div>
            <div class="metric">
                <div class="metric-value danger">${report.summary.failedSuites}</div>
                <div class="metric-label">失败套件</div>
            </div>
            <div class="metric">
                <div class="metric-value warning">${Math.round(report.summary.totalDuration / 1000)}s</div>
                <div class="metric-label">总执行时间</div>
            </div>
            <div class="metric">
                <div class="metric-value ${report.summary.successfulSuites === report.summary.totalSuites ? 'success' : 'warning'}">
                    ${Math.round((report.summary.successfulSuites / report.summary.totalSuites) * 100)}%
                </div>
                <div class="metric-label">成功率</div>
            </div>
        </div>
        
        <div class="suites">
            <h2>测试套件详情</h2>
            ${report.suites.map(suite => `
                <div class="suite">
                    <div class="suite-header">
                        <div class="suite-name">${suite.name}</div>
                        <div class="suite-status ${suite.success ? 'status-success' : 'status-failed'}">
                            ${suite.success ? '成功' : '失败'}
                        </div>
                    </div>
                    <div class="suite-details">
                        <div class="detail-row">
                            <div class="detail-label">测试文件:</div>
                            <div class="detail-value">${suite.file}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">执行时间:</div>
                            <div class="detail-value">${Math.round(suite.duration / 1000)}s (预计: ${suite.estimatedTime})</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">完成时间:</div>
                            <div class="detail-value">${new Date(suite.timestamp).toLocaleString('zh-CN')}</div>
                        </div>
                        ${suite.error ? `
                        <div class="detail-row">
                            <div class="detail-label">错误信息:</div>
                            <div class="detail-value" style="color: #dc3545;">${suite.error}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="footer">
            <p>测试环境: Node.js ${report.summary.testEnvironment.nodeVersion} | ${report.summary.testEnvironment.platform} ${report.summary.testEnvironment.arch}</p>
            <p>生成工具: Puppeteer E2E测试套件 | HYQ MES V2项目</p>
        </div>
    </div>
</body>
</html>
    `;
    
    const htmlFile = path.join(resultsDir, 'comprehensive-test-report.html');
    fs.writeFileSync(htmlFile, htmlContent);
    
    colorLog(`📊 HTML报告已生成: ${htmlFile}`, 'cyan');
}

// 主执行函数
async function runComprehensiveTests() {
    colorLog('🚀 开始执行已完成功能的全面E2E测试\n', 'bright');
    
    // 确保目录存在
    const resultsDir = ensureDirectories();
    
    // 显示测试计划
    colorLog('📋 测试计划:', 'bright');
    TEST_SUITES.forEach((suite, index) => {
        colorLog(`   ${index + 1}. ${suite.name} (${suite.priority}) - ${suite.estimatedTime}`, 'blue');
    });
    
    const totalEstimatedTime = TEST_SUITES.reduce((sum, suite) => {
        const time = parseInt(suite.estimatedTime.replace('s', ''));
        return sum + time;
    }, 0);
    
    colorLog(`\n⏱️  预计总执行时间: ${totalEstimatedTime}秒\n`, 'yellow');
    
    // 执行所有测试套件
    const results = [];
    
    for (const suite of TEST_SUITES) {
        try {
            const result = await runTestSuite(suite, resultsDir);
            results.push(result);
            
            // 如果是高优先级测试失败，询问是否继续
            if (!result.success && suite.priority === 'high') {
                colorLog(`⚠️  高优先级测试失败，但继续执行剩余测试`, 'yellow');
            }
            
        } catch (error) {
            colorLog(`❌ 测试套件执行异常: ${error.message}`, 'red');
            results.push({
                suite: suite.name,
                file: suite.file,
                success: false,
                duration: 0,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
        
        // 测试间隔
        if (results.length < TEST_SUITES.length) {
            colorLog('⏸️  等待2秒后执行下一个测试...', 'blue');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    // 生成综合报告
    colorLog('\n📊 生成测试报告...', 'cyan');
    const report = generateComprehensiveReport(results, resultsDir);
    
    // 显示最终结果
    colorLog('\n🏁 测试执行完成!', 'bright');
    colorLog(`📈 成功率: ${Math.round((report.summary.successfulSuites / report.summary.totalSuites) * 100)}%`, 
        report.summary.failedSuites === 0 ? 'green' : 'yellow');
    colorLog(`✅ 成功: ${report.summary.successfulSuites}/${report.summary.totalSuites}`, 'green');
    colorLog(`❌ 失败: ${report.summary.failedSuites}/${report.summary.totalSuites}`, 'red');
    colorLog(`⏱️  总时长: ${Math.round(report.summary.totalDuration / 1000)}秒`, 'blue');
    
    // 显示报告文件位置
    colorLog(`\n📋 详细报告:`, 'cyan');
    colorLog(`   JSON: ${path.join(resultsDir, 'comprehensive-test-report.json')}`, 'blue');
    colorLog(`   HTML: ${path.join(resultsDir, 'comprehensive-test-report.html')}`, 'blue');
    
    // 如果有失败的测试，显示失败列表
    if (report.summary.failedSuites > 0) {
        colorLog('\n❌ 失败的测试套件:', 'red');
        results.filter(r => !r.success).forEach(r => {
            colorLog(`   • ${r.suite} (${r.file})`, 'red');
            if (r.error) {
                colorLog(`     错误: ${r.error}`, 'red');
            }
        });
    }
    
    // 退出码
    process.exit(report.summary.failedSuites > 0 ? 1 : 0);
}

// 处理命令行参数
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
    console.log(`
已完成功能E2E测试运行器

用法: node run-comprehensive-tests.cjs [选项]

选项:
  --help, -h     显示帮助信息
  --version, -v  显示版本信息

测试套件:
${TEST_SUITES.map((suite, i) => `  ${i + 1}. ${suite.name} (${suite.priority})`).join('\n')}

生成的报告:
  • comprehensive-test-report.json - JSON格式详细报告
  • comprehensive-test-report.html - HTML格式可视化报告
  • 各测试套件的截图保存在test-results目录

环境要求:
  • Node.js 16+
  • Puppeteer已安装
  • 开发服务器运行在 http://localhost:8000
    `);
    process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
    console.log('已完成功能E2E测试运行器 v1.0.0');
    process.exit(0);
}

// 捕获未处理的异常
process.on('unhandledRejection', (reason, promise) => {
    colorLog(`❌ 未处理的Promise拒绝: ${reason}`, 'red');
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    colorLog(`❌ 未捕获的异常: ${error.message}`, 'red');
    process.exit(1);
});

// 执行测试
runComprehensiveTests().catch(error => {
    colorLog(`❌ 测试执行失败: ${error.message}`, 'red');
    process.exit(1);
});