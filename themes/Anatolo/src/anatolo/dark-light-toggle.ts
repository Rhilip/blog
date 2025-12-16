// 缓存HTML元素引用
const htmlEl = document.documentElement;

// 获取系统主题状态
function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// 获取当前主题（处理默认值）
function getCurrentTheme() {
  return htmlEl.getAttribute('theme') ?? 'light';
}

// 应用主题设置
function applyTheme() {
  const savedTheme = localStorage.getItem('theme') ?? "light";
  savedTheme ? htmlEl.setAttribute('theme', savedTheme) : htmlEl.removeAttribute('theme');
}

// 初始化主题
applyTheme();

// 主题切换逻辑
export function toggleDarkLightTheme() {
  const currentTheme = getCurrentTheme();

  // 确定实际使用主题
  const effectiveTheme = currentTheme === 'default' ? getSystemTheme() : currentTheme;

  // 切换并存储新主题
  const newTheme = effectiveTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', newTheme);

  applyTheme();
}
