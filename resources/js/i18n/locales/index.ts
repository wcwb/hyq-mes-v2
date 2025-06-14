// 统一导出所有语言包
import type { LocaleMessages } from './types';
import zh from './zh.json';
import en from './en.json';

// 导出所有语言包的消息对象
export const messages = {
    zh,
    en,
} as const;

// 导出类型定义
export { LocaleMessages };

// 默认导出
export default messages; 