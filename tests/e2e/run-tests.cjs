#!/usr/bin/env node

/**
 * E2E 测试运行脚本
 * 提供便捷的测试执行命令
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 颜色输出
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

function colorLog(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// 确保测试结果目录存在
const testResultsDir = path.join(__dirname, '../../test-results');
if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true });
}

// 测试配置
const testConfigs = {
    // 搜索功能核心测试
    core: {
        name: '搜索核心功能测试',
        files: ['search-core.test.cjs'],
        description: '测试搜索功能的基本特性'
    },

    // 完整搜索功能测试
    full: {
        name: '完整搜索功能测试',
        files: ['search-functionality.test.cjs'],
        description: '全面测试搜索功能的所有方面'
    },

    // 所有搜索相关测试
    search: {
        name: '所有搜索测试',
        files: [
            'search-core.test.cjs',
            'search-functionality.test.cjs',
            'dashboard-search-simple.test.cjs'
        ],
        description: '运行所有搜索相关的测试'
    },

    // 所有测试
    all: {
        name: '所有 E2E 测试',
        files: ['*.test.cjs', '*.test.js'],
        description: '运行所有端到端测试'
    }
};

// 解析命令行参数
const args = process.argv.slice(2);
const testType = args[0] || 'core';
const options = {
    headless: args.includes('--headless'),
    verbose: args.includes('--verbose'),
    debug: args.includes('--debug'),
    ci: args.includes('--ci')
};

// 显示帮助信息
if (args.includes('--help') || args.includes('-h')) {
    colorLog('cyan', '\n🧪 E2E 测试运行器');
    colorLog('bright', '\n用法:');
    console.log('  node run-tests.js [测试类型] [选项]');

    colorLog('bright', '\n测试类型:');
    Object.entries(testConfigs).forEach(([key, config]) => {
        console.log(`  ${key.padEnd(8)} - ${config.description}`);
    });

    colorLog('bright', '\n选项:');
    console.log('  --headless  - 无头模式运行（不显示浏览器窗口）');
    console.log('  --verbose   - 详细输出');
    console.log('  --debug     - 调试模式');
    console.log('  --ci        - CI 环境模式');
    console.log('  --help, -h  - 显示此帮助信息');

    colorLog('bright', '\n示例:');
    console.log('  node run-tests.js core              # 运行核心测试');
    console.log('  node run-tests.js search --headless # 无头模式运行搜索测试');
    console.log('  node run-tests.js all --ci          # CI 模式运行所有测试');

    process.exit(0);
}

// 验证测试类型
if (!testConfigs[testType]) {
    colorLog('red', `❌ 未知的测试类型: ${testType}`);
    colorLog('yellow', '可用的测试类型: ' + Object.keys(testConfigs).join(', '));
    process.exit(1);
}

const config = testConfigs[testType];

// 构建 Jest 命令
function buildJestCommand() {
    const jestPath = path.join(__dirname, '../../node_modules/.bin/jest');
    const configPath = path.join(__dirname, 'jest.config.cjs');

    let cmd = [
        '--config', configPath,
        '--testPathPattern', config.files.join('|'),
        '--runInBand', // 串行执行测试
        '--forceExit' // 强制退出
    ];

    if (options.verbose) {
        cmd.push('--verbose');
    }

    if (options.ci) {
        cmd.push('--ci');
        cmd.push('--coverage');
        cmd.push('--watchAll=false');
    }

    return { command: jestPath, args: cmd };
}

// 设置环境变量
function setupEnvironment() {
    const env = { ...process.env };

    if (options.headless || options.ci) {
        env.HEADLESS = 'true';
    }

    if (options.debug) {
        env.DEBUG = 'true';
        env.DEVTOOLS = 'true';
    }

    if (options.ci) {
        env.CI = 'true';
    }

    return env;
}

// 运行测试
async function runTests() {
    colorLog('cyan', `\n🚀 开始运行: ${config.name}`);
    colorLog('blue', `📝 描述: ${config.description}`);
    colorLog('yellow', `📁 测试文件: ${config.files.join(', ')}`);

    if (options.headless) {
        colorLog('magenta', '🖥️  模式: 无头模式');
    } else {
        colorLog('magenta', '🖥️  模式: 有界面模式');
    }

    console.log(''); // 空行

    const { command, args } = buildJestCommand();
    const env = setupEnvironment();

    colorLog('bright', `执行命令: ${command} ${args.join(' ')}`);
    console.log(''); // 空行

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: 'inherit',
            env,
            cwd: __dirname
        });

        child.on('close', (code) => {
            const duration = Date.now() - startTime;
            const minutes = Math.floor(duration / 60000);
            const seconds = Math.floor((duration % 60000) / 1000);

            console.log(''); // 空行

            if (code === 0) {
                colorLog('green', `✅ 测试完成! 耗时: ${minutes}分${seconds}秒`);
                colorLog('cyan', `📊 测试结果保存在: ${testResultsDir}`);
                resolve();
            } else {
                colorLog('red', `❌ 测试失败! 退出代码: ${code}`);
                colorLog('yellow', '💡 提示: 检查上面的错误信息或使用 --verbose 选项获取更多详情');
                reject(new Error(`测试失败，退出代码: ${code}`));
            }
        });

        child.on('error', (error) => {
            colorLog('red', `❌ 启动测试时出错: ${error.message}`);
            reject(error);
        });
    });
}

// 检查依赖
function checkDependencies() {
    const requiredPackages = ['puppeteer', 'jest'];
    const packageJsonPath = path.join(__dirname, '../../package.json');

    if (!fs.existsSync(packageJsonPath)) {
        colorLog('red', '❌ 未找到 package.json 文件');
        return false;
    }

    try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const allDeps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies
        };

        const missingPackages = requiredPackages.filter(pkg => !allDeps[pkg]);

        if (missingPackages.length > 0) {
            colorLog('red', `❌ 缺少必需的依赖包: ${missingPackages.join(', ')}`);
            colorLog('yellow', '💡 请运行: npm install puppeteer jest');
            return false;
        }

        return true;
    } catch (error) {
        colorLog('red', `❌ 读取 package.json 时出错: ${error.message}`);
        return false;
    }
}

// 主函数
async function main() {
    try {
        // 检查依赖
        if (!checkDependencies()) {
            process.exit(1);
        }

        // 运行测试
        await runTests();

    } catch (error) {
        colorLog('red', `❌ 运行测试时出错: ${error.message}`);
        process.exit(1);
    }
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason, promise) => {
    colorLog('red', '❌ 未处理的 Promise 拒绝:');
    console.error(reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    colorLog('red', '❌ 未捕获的异常:');
    console.error(error);
    process.exit(1);
});

// 运行主函数
main(); 