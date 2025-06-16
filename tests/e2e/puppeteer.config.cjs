module.exports = {
    // 浏览器配置
    browserConfig: {
        headless: false, // 设置为true在CI环境中使用
        slowMo: 50,
        devtools: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    },
    
    // 测试配置
    testConfig: {
        timeout: 30000,
        baseUrl: 'http://localhost:8000',
        viewport: {
            width: 1280,
            height: 720
        }
    },
    
    // 移动端配置
    mobileConfig: {
        width: 375,
        height: 667,
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2
    }
};