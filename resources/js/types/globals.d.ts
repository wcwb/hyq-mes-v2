import { AppPageProps } from '@/types/index';
import type { SupportedLocale } from '@/i18n';

// Extend ImportMeta interface for Vite...
declare module 'vite/client' {
    interface ImportMetaEnv {
        readonly VITE_APP_NAME: string;
        [key: string]: string | boolean | undefined;
    }

    interface ImportMeta {
        readonly env: ImportMetaEnv;
        readonly glob: <T>(pattern: string) => Record<string, () => Promise<T>>;
    }
}

declare module '@inertiajs/core' {
    interface PageProps extends InertiaPageProps, AppPageProps { }
}

declare module '@vue/runtime-core' {
    interface ComponentCustomProperties {
        $inertia: typeof Router;
        $page: Page;
        $headManager: ReturnType<typeof createHeadManager>;

        // vue-i18n 原生全局属性（已经内置）
        $t: (key: string) => string;
        $tc: (key: string, choice?: number) => string;
        $te: (key: string) => boolean;
        $d: (value: number | Date, key?: string) => string;
        $n: (value: number, key?: string) => string;

        // 我们自定义的全局属性
        $switchLocale: (locale: SupportedLocale) => void;
        $getCurrentLocale: () => SupportedLocale;
        $getSupportedLocales: () => SupportedLocale[];
        $getLocaleDisplayName: (locale: SupportedLocale) => string;
    }
}

// 扩展Window接口以支持i18n开发工具
declare global {
    interface Window {
        __VUE_I18N_MISSING_KEYS__?: Set<string>;
        __showMissingI18nKeys__?: () => string[];
    }
}
