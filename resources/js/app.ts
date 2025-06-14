import '../css/app.css';

import { createInertiaApp } from '@inertiajs/vue3';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import type { DefineComponent } from 'vue';
import { createApp, h } from 'vue';
import { ZiggyVue } from 'ziggy-js';
import { initializeTheme } from './composables/useAppearance';
import i18n, { setLocale, getCurrentLocale, getSupportedLocales, type SupportedLocale } from './i18n';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) => resolvePageComponent(`./pages/${name}.vue`, import.meta.glob<DefineComponent>('./pages/**/*.vue')),
    setup({ el, App, props, plugin }) {
        const app = createApp({ render: () => h(App, props) })
            .use(plugin)
            .use(ZiggyVue)
            .use(i18n);

        // 注册全局属性，让所有组件都能直接使用
        app.config.globalProperties.$switchLocale = setLocale;
        app.config.globalProperties.$getCurrentLocale = getCurrentLocale;
        app.config.globalProperties.$getSupportedLocales = getSupportedLocales;
        app.config.globalProperties.$getLocaleDisplayName = (locale: SupportedLocale) => {
            const displayNames: Record<SupportedLocale, string> = {
                zh: '中文',
                en: 'English'
            };
            return displayNames[locale] || locale;
        };

        app.mount(el);
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on page load...
initializeTheme();
