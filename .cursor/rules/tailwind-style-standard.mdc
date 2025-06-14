---
description: 
globs: resources/js/components/**/*.vue,resources/js/layouts/**/*.vue,resources/js/pages/**/*.vue
alwaysApply: false
---
---
description: Tailwind CSS 样式规范
globs:
  - resources/js/components/**/*.vue
  - resources/js/layouts/**/*.vue
  - resources/js/pages/**/*.vue

autoAttach: true
---

- 所有布局与样式必须使用 Tailwind CSS 类名。
- 不允许使用 <style> 标签或 style="" 内联样式。
- 所有组件需保持响应式设计，例如 grid-cols-1 sm:grid-cols-2。
- 所有间距、字体、颜色必须使用 Tailwind 预设类。
- 避免使用 magic number（如 px-13、w-[333px]）。
- 推荐使用组件化的 class 提取方案，例如 @apply btn-base。
- 只用 Tailwind CSS 类名，不要在 <style> 或者 <style scoped> 里写 @apply。