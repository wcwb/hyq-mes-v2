/**
 * 客户端热重载处理器
 * 在客户端代码中使用，响应locale文件变化
 * 此文件不包含任何Node.js特定的模块，确保浏览器兼容性
 */
export function setupI18nHMR() {
    if (import.meta.hot) {
        import.meta.hot.on('i18n-locale-update', (data) => {
            console.log(`🔄 重新加载locale: ${data.locale}`)

            // 触发自定义事件，让i18n实例重新加载
            window.dispatchEvent(new CustomEvent('i18n-locale-reload', {
                detail: { locale: data.locale }
            }))
        })
    }
} 