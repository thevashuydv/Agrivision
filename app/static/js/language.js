// Language switching functionality
class LanguageManager {
  constructor() {
    this.currentLang = localStorage.getItem('agrivision_lang') || 'en';
    this.translations = translations;
    this.init();
  }

  init() {
    // Apply saved language
    this.setLanguage(this.currentLang);
    
    // Setup language selector dropdown
    this.setupLanguageSelector();
    
    // Translate all elements with data-i18n attribute
    this.translatePage();
  }

  setupLanguageSelector() {
    const selector = document.querySelector('.language-selector');
    if (!selector) return;

    // Create dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'language-dropdown';
    dropdown.style.display = 'none';
    
    // Add language options
    Object.keys(languageNames).forEach(langCode => {
      const option = document.createElement('div');
      option.className = 'language-option';
      if (langCode === this.currentLang) {
        option.classList.add('active');
      }
      option.dataset.lang = langCode;
      option.innerHTML = `
        <span class="language-name">${languageNames[langCode]}</span>
        ${langCode === this.currentLang ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
      `;
      option.addEventListener('click', () => {
        this.setLanguage(langCode);
        dropdown.style.display = 'none';
      });
      dropdown.appendChild(option);
    });

    // Insert dropdown after selector
    selector.parentNode.insertBefore(dropdown, selector.nextSibling);

    // Toggle dropdown on click
    selector.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.style.display === 'block';
      dropdown.style.display = isOpen ? 'none' : 'block';
      
      // Update current language display
      const currentLangText = selector.querySelector('.current-lang-text');
      if (currentLangText) {
        currentLangText.textContent = languageNames[this.currentLang];
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!selector.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });

    // Update selector text - replace "English" text with span
    const textNodes = Array.from(selector.childNodes).filter(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (textNodes.length > 0) {
      const span = document.createElement('span');
      span.className = 'current-lang-text';
      span.textContent = languageNames[this.currentLang];
      textNodes[0].replaceWith(span);
    } else if (!selector.querySelector('.current-lang-text')) {
      // If no text node found, insert after the globe icon
      const span = document.createElement('span');
      span.className = 'current-lang-text';
      span.textContent = languageNames[this.currentLang];
      const globeIcon = selector.querySelector('svg:first-of-type');
      if (globeIcon) {
        globeIcon.after(span);
      } else {
        selector.appendChild(span);
      }
    }
  }

  setLanguage(langCode) {
    if (!this.translations[langCode]) {
      console.warn(`Language ${langCode} not found, falling back to English`);
      langCode = 'en';
    }

    this.currentLang = langCode;
    localStorage.setItem('agrivision_lang', langCode);
    
    // Update HTML lang attribute
    document.documentElement.lang = langCode;
    
    // Update language selector display
    const currentLangText = document.querySelector('.current-lang-text');
    if (currentLangText) {
      currentLangText.textContent = languageNames[langCode];
    }

    // Update active language option
    document.querySelectorAll('.language-option').forEach(option => {
      option.classList.remove('active');
      if (option.dataset.lang === langCode) {
        option.classList.add('active');
        // Update checkmark
        if (!option.querySelector('svg:last-child')) {
          const checkmark = document.createElement('svg');
          checkmark.width = 16;
          checkmark.height = 16;
          checkmark.setAttribute('viewBox', '0 0 24 24');
          checkmark.setAttribute('fill', 'none');
          checkmark.setAttribute('stroke', 'currentColor');
          checkmark.setAttribute('stroke-width', '2');
          checkmark.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';
          option.appendChild(checkmark);
        }
      } else {
        const checkmark = option.querySelector('svg:last-child');
        if (checkmark && checkmark.previousElementSibling && 
            checkmark.previousElementSibling.classList.contains('language-name')) {
          checkmark.remove();
        }
      }
    });

    // Translate the page
    this.translatePage();
  }

  translatePage() {
    const t = this.translations[this.currentLang];
    if (!t) return;

    // Translate elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      if (t[key]) {
        if (element.tagName === 'INPUT' && element.type === 'submit' || 
            element.tagName === 'BUTTON') {
          element.textContent = t[key];
        } else if (element.tagName === 'INPUT' && element.type !== 'submit') {
          element.placeholder = t[key];
        } else {
          element.textContent = t[key];
        }
      }
    });

    // Translate sidebar items
    const sidebarMap = {
      'home': 'home',
      'weather-lens': 'weatherLens',
      'soil-scope': 'soilScope',
      'plant-profile': 'plantProfile',
      'crop-selector': 'cropSelector',
      'fertilizer-guide': 'fertilizerGuide',
      'chatbot': 'chatbot',
      'disease-detection': 'diseaseDetection'
    };

    document.querySelectorAll('.sidebar-item').forEach(item => {
      const section = item.getAttribute('data-section');
      if (section && sidebarMap[section] && t[sidebarMap[section]]) {
        const span = item.querySelector('span');
        if (span) {
          span.textContent = t[sidebarMap[section]];
        }
      }
    });

    // Translate navbar
    const signInBtn = document.querySelector('.btn-login');
    if (signInBtn && t.signIn) {
      signInBtn.textContent = t.signIn;
    }

    const signOutBtn = document.querySelector('#signOutBtn');
    if (signOutBtn && t.signOut) {
      signOutBtn.textContent = t.signOut;
    }
  }

  t(key) {
    return this.translations[this.currentLang]?.[key] || 
           this.translations['en']?.[key] || 
           key;
  }
}

// Initialize language manager when DOM is ready
let languageManager;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    languageManager = new LanguageManager();
  });
} else {
  languageManager = new LanguageManager();
}

