// Dark Mode Toggle Functionality
class DarkModeManager {
  constructor() {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('agrivision_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    this.isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    this.init();
  }

  init() {
    // Apply theme immediately to prevent flash
    this.applyTheme();
    
    // Setup toggle button
    this.setupToggle();
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('agrivision_theme')) {
        this.isDark = e.matches;
        this.applyTheme();
      }
    });
  }

  setupToggle() {
    // Create or find toggle button
    let toggleBtn = document.querySelector('.dark-mode-toggle');
    
    if (!toggleBtn) {
      toggleBtn = document.createElement('button');
      toggleBtn.className = 'dark-mode-toggle';
      toggleBtn.setAttribute('aria-label', 'Toggle dark mode');
      toggleBtn.innerHTML = `
        <svg class="sun-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
        <svg class="moon-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      `;
      
      // Insert toggle button in navbar (before language selector)
      const navbarRight = document.querySelector('.top-navbar-right');
      if (navbarRight) {
        navbarRight.insertBefore(toggleBtn, navbarRight.firstChild);
      }
    }

    // Update button state
    this.updateToggleButton();

    // Add click event
    toggleBtn.addEventListener('click', () => {
      this.toggle();
    });
  }

  toggle() {
    this.isDark = !this.isDark;
    localStorage.setItem('agrivision_theme', this.isDark ? 'dark' : 'light');
    this.applyTheme();
    this.updateToggleButton();
  }

  applyTheme() {
    if (this.isDark) {
      document.documentElement.classList.add('dark-mode');
      document.body.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
      document.body.classList.remove('dark-mode');
    }
  }

  updateToggleButton() {
    const toggleBtn = document.querySelector('.dark-mode-toggle');
    if (!toggleBtn) return;

    const sunIcon = toggleBtn.querySelector('.sun-icon');
    const moonIcon = toggleBtn.querySelector('.moon-icon');

    if (this.isDark) {
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
      toggleBtn.setAttribute('aria-label', 'Switch to light mode');
    } else {
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
      toggleBtn.setAttribute('aria-label', 'Switch to dark mode');
    }
  }
}

// Initialize dark mode manager when DOM is ready
let darkModeManager;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    darkModeManager = new DarkModeManager();
  });
} else {
  darkModeManager = new DarkModeManager();
}

