/**
 * Jest 配置文件 - Frontend E2E 测试
 * 用于配置 Puppeteer 端到端测试环境
 */

module.exports = {
    // 测试环境设置
    testEnvironment: 'node',

    // 测试文件匹配模式
    testMatch: [
        '<rootDir>/e2e/**/*.test.cjs'
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
        'default'
    ],

    // 全局变量
    globals: {
        'TEST_CONFIG': {
            baseUrl: 'http://localhost:8000',
            timeout: 30000,
            headless: process.env.CI === 'true' || process.env.HEADLESS === 'true',
            slowMo: process.env.CI === 'true' ? 0 : 100
        }
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
    errorOnDeprecated: false,

    // 根目录
    rootDir: __dirname
};