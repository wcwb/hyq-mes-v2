import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
    plugins: [vue()],
    test: {
        // 使用happy-dom作为测试环境（比jsdom更快）
        environment: 'happy-dom',

        // 全局测试设置
        globals: true,

        // 测试文件匹配模式
        include: [
            'resources/js/**/*.{test,spec}.{js,ts,vue}',
            'tests/frontend/**/*.{test,spec}.{js,ts,vue}'
        ],

        // 排除文件
        exclude: [
            'node_modules',
            'vendor',
            'storage',
            'bootstrap/cache'
        ],

        // 测试覆盖率配置
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            reportsDirectory: './coverage',
            include: [
                'resources/js/**/*.{js,ts,vue}'
            ],
            exclude: [
                'resources/js/**/*.d.ts',
                'resources/js/**/*.test.{js,ts}',
                'resources/js/**/*.spec.{js,ts}',
                'resources/js/app.ts',
                'resources/js/ssr.ts'
            ],
            // 覆盖率阈值
            thresholds: {
                global: {
                    branches: 80,
                    functions: 80,
                    lines: 80,
                    statements: 80
                }
            }
        },

        // 测试运行配置
        testTimeout: 10000,
        hookTimeout: 10000,

        // 测试设置文件
        setupFiles: ['tests/frontend/setup.ts'],

        // 测试报告器
        reporters: ['verbose', 'json', 'html'],
        outputFile: {
            json: './test-results/results.json',
            html: './test-results/index.html'
        }
    },

    // 解析配置，与主项目保持一致
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './resources/js'),
        },
    },

    // 定义全局变量
    define: {
        __VUE_I18N_FULL_INSTALL__: true,
        __VUE_I18N_LEGACY_API__: false,
        __INTLIFY_PROD_DEVTOOLS__: false,
    }
}) 