import { ref, computed, onMounted, onUnmounted, readonly, shallowRef } from 'vue';
import type { BreakpointSize } from '@/types';

/**
 * 防抖函数
 * @param func 要执行的函数
 * @param wait 等待时间(ms)
 * @returns 防抖后的函数
 */
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null;
  
  return ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

/**
 * 响应式断点管理组合式函数
 * 基于Tailwind CSS断点系统
 * 性能优化：使用防抖、缓存计算、减少响应式开销
 */
export function useBreakpoints() {
  // Tailwind CSS默认断点配置
  const breakpoints = {
    sm: 640,   // sm: @media (min-width: 640px)
    md: 768,   // md: @media (min-width: 768px)
    lg: 1024,  // lg: @media (min-width: 1024px)
    xl: 1280,  // xl: @media (min-width: 1280px)
    '2xl': 1536, // 2xl: @media (min-width: 1536px)
  } as const;

  // 性能优化：使用shallowRef减少深度响应式开销
  const windowWidth = shallowRef(0);
  
  // 缓存断点顺序，避免重复创建数组
  const BREAKPOINT_ORDER: BreakpointSize[] = ['sm', 'md', 'lg', 'xl', '2xl'];

  // 获取当前断点 - 优化计算逻辑
  const currentBreakpoint = computed<BreakpointSize>(() => {
    const width = windowWidth.value;
    
    // 从大到小检查，提高性能
    if (width >= breakpoints['2xl']) return '2xl';
    if (width >= breakpoints.xl) return 'xl';
    if (width >= breakpoints.lg) return 'lg';
    if (width >= breakpoints.md) return 'md';
    if (width >= breakpoints.sm) return 'sm';
    
    return 'sm'; // 默认为最小断点
  });

  // 检查是否匹配特定断点
  const isBreakpoint = (size: BreakpointSize) => {
    return currentBreakpoint.value === size;
  };

  // 检查是否大于等于特定断点 - 优化查找性能
  const isBreakpointAndUp = (size: BreakpointSize) => {
    const currentIndex = BREAKPOINT_ORDER.indexOf(currentBreakpoint.value);
    const targetIndex = BREAKPOINT_ORDER.indexOf(size);
    
    return currentIndex >= targetIndex;
  };

  // 检查是否小于特定断点
  const isBreakpointAndDown = (size: BreakpointSize) => {
    const currentIndex = BREAKPOINT_ORDER.indexOf(currentBreakpoint.value);
    const targetIndex = BREAKPOINT_ORDER.indexOf(size);
    
    return currentIndex <= targetIndex;
  };

  // 常用断点检查 - 使用直接比较提高性能
  const isMobile = computed(() => windowWidth.value < breakpoints.lg);
  const isTablet = computed(() => 
    windowWidth.value >= breakpoints.md && windowWidth.value < breakpoints.lg
  );
  const isDesktop = computed(() => windowWidth.value >= breakpoints.lg);
  const isLargeDesktop = computed(() => windowWidth.value >= breakpoints.xl);

  // 更新窗口尺寸的函数
  const updateWindowWidth = () => {
    if (typeof window !== 'undefined') {
      windowWidth.value = window.innerWidth;
    }
  };

  // 性能优化：防抖处理resize事件，避免频繁触发
  const debouncedUpdateWindowWidth = debounce(updateWindowWidth, 150);

  // 监听器设置
  onMounted(() => {
    updateWindowWidth();
    // 使用防抖函数处理resize事件
    window.addEventListener('resize', debouncedUpdateWindowWidth, { passive: true });
  });

  onUnmounted(() => {
    window.removeEventListener('resize', debouncedUpdateWindowWidth);
  });

  return {
    // 原始数据
    windowWidth: readonly(windowWidth),
    breakpoints,
    
    // 当前断点
    currentBreakpoint,
    
    // 断点检查方法
    isBreakpoint,
    isBreakpointAndUp,
    isBreakpointAndDown,
    
    // 常用快捷检查
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    
    // 工具方法
    updateWindowWidth,
  };
}

/**
 * 简化的移动端检测
 */
export function useMobileDetection() {
  const { isMobile, isTablet, isDesktop } = useBreakpoints();
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice: computed(() => 'ontouchstart' in window),
  };
}