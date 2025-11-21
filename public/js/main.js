document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const app = document.querySelector('.app');
  const collapseBtn = document.getElementById('collapseBtn');
  const themeBtn = document.getElementById('themeToggleBtn');

  // Initialize theme
  const savedTheme = localStorage.getItem('theme');
  const defaultTheme = savedTheme || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  root.setAttribute('data-bs-theme', defaultTheme);
  updateThemeButton();

  // Initialize collapsed state
  const isCollapsed = localStorage.getItem('collapsed') === 'true';
  if (isCollapsed) app.setAttribute('data-collapsed', 'true');
  updateCollapseButton();

  collapseBtn.addEventListener('click', () => {
    const collapsed = app.getAttribute('data-collapsed') === 'true';
    if (collapsed) {
      app.removeAttribute('data-collapsed');
      localStorage.setItem('collapsed', 'false');
    } else {
      app.setAttribute('data-collapsed', 'true');
      localStorage.setItem('collapsed', 'true');
    }
    updateCollapseButton();
  });

  themeBtn.addEventListener('click', () => {
    const current = root.getAttribute('data-bs-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-bs-theme', next);
    localStorage.setItem('theme', next);
    updateThemeButton();
  });

  function updateThemeButton() {
    const current = root.getAttribute('data-bs-theme') || 'dark';
    // Show icon that indicates the target theme: sun when switching to light, moon when switching to dark.
    const nextIcon = current === 'dark' ? 'bi-sun' : 'bi-moon';
    themeBtn.innerHTML = `<i class="bi ${nextIcon}"></i>`;
    themeBtn.setAttribute('aria-label', `Toggle theme (current: ${current})`);
    themeBtn.setAttribute('aria-pressed', current === 'light');
    themeBtn.className = 'btn ' + (current === 'dark' ? 'btn-outline-primary' : 'btn-outline-dark');
  }

  function updateCollapseButton() {
    const collapsed = app.getAttribute('data-collapsed') === 'true';
    const icon = collapsed ? 'bi-layout-sidebar' : 'bi-layout-sidebar-inset';
    collapseBtn.innerHTML = `<i class="bi ${icon}"></i>`;
    collapseBtn.setAttribute('aria-pressed', collapsed);
    collapseBtn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    collapseBtn.className = 'btn btn-outline-secondary me-2';
  }
});