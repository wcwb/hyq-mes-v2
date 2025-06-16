/**
 * Jest 测试序列化器
 * 控制测试执行顺序，确保依赖关系正确
 */

const Sequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends Sequencer {
    /**
     * 对测试文件进行排序
     * @param {Array} tests - 测试文件数组
     * @returns {Array} 排序后的测试文件数组
     */
    sort(tests) {
        // 定义测试优先级顺序
        const testOrder = [
            // 1. 基础功能测试（登录等）
            'login-only.test.cjs',

            // 2. 搜索功能完整测试套件
            'search-functionality.test.cjs',

            // 3. 具体搜索功能测试
            'dashboard-search.test.cjs',
            'dashboard-search-simple.test.cjs',

            // 4. 搜索栏组件测试
            'searchbar.test.cjs',
            'searchbar-simple.test.cjs',
            'searchbar-final.test.cjs',

            // 5. 顶部菜单栏测试
            'topmenubar-demo.test.js',

            // 6. 调试和交互测试
            'debug-interaction.test.cjs',
            'debug-login.test.cjs'
        ];

        // 按照定义的顺序排序测试文件
        const sortedTests = tests.sort((testA, testB) => {
            const fileNameA = this.getFileName(testA.path);
            const fileNameB = this.getFileName(testB.path);

            const indexA = testOrder.indexOf(fileNameA);
            const indexB = testOrder.indexOf(fileNameB);

            // 如果文件在预定义列表中，按列表顺序排序
            if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB;
            }

            // 如果只有一个文件在列表中，优先执行列表中的文件
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;

            // 如果都不在列表中，按文件名字母顺序排序
            return fileNameA.localeCompare(fileNameB);
        });

        console.log('📋 测试执行顺序:');
        sortedTests.forEach((test, index) => {
            const fileName = this.getFileName(test.path);
            console.log(`  ${index + 1}. ${fileName}`);
        });

        return sortedTests;
    }

    /**
     * 从完整路径中提取文件名
     * @param {string} filePath - 完整文件路径
     * @returns {string} 文件名
     */
    getFileName(filePath) {
        return filePath.split('/').pop() || filePath.split('\\').pop();
    }
}

module.exports = CustomSequencer; 