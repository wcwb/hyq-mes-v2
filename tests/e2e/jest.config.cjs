/**
 * Jest 配置文件 - E2E 测试专用
 * 用于配置 Puppeteer 端到端测试环境
 */

module.exports = {
    // 测试环境设置
    testEnvironment: 'node',

    // 测试文件匹配模式
    testMatch: [
        '<rootDir>/**/*.test.cjs',
        '<rootDir>/**/*.test.js'
    ],

    // 测试超时设置（毫秒）
    testTimeout: 60000, // 60秒超时，适合 E2E 测试

    // 设置和清理
    setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],

    // 覆盖率收集（E2E 测试通常不需要）
    collectCoverage: false,

    // 详细输出
    verbose: true,

    // 并发测试数量（E2E 测试建议串行执行）
    maxWorkers: 1,

    // 失败时停止
    bail: false,

    // 测试结果报告
    reporters: [
        'default',
        ['jest-html-reporters', {
            publicPath: './test-results',
            filename: 'e2e-test-report.html',
            expand: true,
            hideIcon: false,
            pageTitle: 'HYQ MES V2 E2E 测试报告'
        }]
    ],

    // 全局变量
    globals: {
        'TEST_CONFIG': {
            baseUrl: 'http://localhost:8000',
            timeout: 30000,
            headless: process.env.CI === 'true', // CI 环境下使用无头模式
            slowMo: process.env.CI === 'true' ? 0 : 100
        }
    },

    // 模块路径映射
    moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/../../resources/js/$1'
    },

    // 忽略的文件和目录
    testPathIgnorePatterns: [
        '/node_modules/',
        '/vendor/',
        '/storage/',
        '/bootstrap/cache/'
    ],

    // 转换配置（如果需要）
    transform: {},

    // 清理模拟
    clearMocks: true,
    restoreMocks: true,

    // 错误处理
    errorOnDeprecated: true,

    // 测试序列化
    testSequencer: '<rootDir>/jest.sequencer.cjs'
}; 