import type { Plugin } from 'vite'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

/**
 * Vite插件：i18n文件热重载
 * 监听locale JSON文件变化，自动触发热更新
 * 注意：此插件只在Vite服务器端运行，不会被打包到客户端代码中
 */
export function createI18nHMRPlugin(): Plugin {
    const localeDir = resolve(process.cwd(), 'resources/js/i18n/locales')

    return {
        name: 'i18n-hmr',
        handleHotUpdate(ctx) {
            // 检查是否是locale文件
            if (ctx.file.includes('/i18n/locales/') && ctx.file.endsWith('.json')) {
                console.log(`🌍 i18n文件已更新: ${ctx.file}`)

                // 强制刷新所有使用i18n的模块
                const i18nModules = Array.from(ctx.server.moduleGraph.getModulesByFile('/resources/js/i18n/index.ts') || [])
                const localeModules = Array.from(ctx.server.moduleGraph.urlToModuleMap.keys())
                    .filter(url => url.includes('/i18n/') || url.includes('vue-i18n'))
                    .map(url => ctx.server.moduleGraph.urlToModuleMap.get(url))
                    .filter((module): module is NonNullable<typeof module> => module != null)

                // 发送热更新事件
                ctx.server.ws.send({
                    type: 'custom',
                    event: 'i18n-locale-update',
                    data: {
                        file: ctx.file,
                        locale: ctx.file.match(/\/([^\/]+)\.json$/)?.[1] || 'unknown'
                    }
                })

                const allModules = [...i18nModules, ...localeModules]
                return allModules.length > 0 ? allModules : undefined
            }
        },

        configureServer(server) {
            // 添加自定义中间件处理locale文件请求
            server.middlewares.use('/api/i18n', (req, res, next) => {
                if (req.url?.startsWith('/locales/')) {
                    const locale = req.url.replace('/locales/', '').replace('.json', '')
                    const filePath = resolve(localeDir, `${locale}.json`)

                    if (existsSync(filePath)) {
                        try {
                            const content = readFileSync(filePath, 'utf-8')
                            res.setHeader('Content-Type', 'application/json')
                            res.setHeader('Access-Control-Allow-Origin', '*')
                            res.end(content)
                            return
                        } catch (error) {
                            console.error(`读取locale文件失败: ${filePath}`, error)
                        }
                    }
                }
                next()
            })

            console.log('🌍 i18n HMR插件已启动，监听locale文件变化...')
        }
    }
} 