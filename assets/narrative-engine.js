class NarrativeEngine {
  constructor() {
    this.wrapper = document.querySelector('.narrative-wrapper');
    this.sections = document.querySelectorAll('.narrative-section');
    
    if (!this.wrapper || this.sections.length === 0) return;
    
    this.initObserver();
    this.initEvents();
  }

  initObserver() {
    // Detects when a section is at least 60% occupying the viewport
    const options = {
      root: this.wrapper,
      threshold: 0.6
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.setActiveSection(entry.target);
        }
      });
    }, options);

    this.sections.forEach(section => this.observer.observe(section));
  }

  setActiveSection(sectionEl) {
    // Remove active state from all sections
    this.sections.forEach(sec => sec.classList.remove('is-active'));
    
    // Set current active section
    sectionEl.classList.add('is-active');
    
    // Dispatch a global event so individual layout blocks can listen and trigger their specific JS
    const sectionId = sectionEl.getAttribute('data-section-id');
    const blockType = sectionEl.getAttribute('data-block-type');
    
    document.dispatchEvent(new CustomEvent('narrative:section-active', {
      detail: { sectionId, blockType, element: sectionEl }
    }));
  }

  initEvents() {
    // Handle keyboard arrow navigation (smooth UX)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const activeIdx = Array.from(this.sections).findIndex(s => s.classList.contains('is-active'));
        let targetIdx = e.key === 'ArrowDown' ? activeIdx + 1 : activeIdx - 1;
        
        if (targetIdx >= 0 && targetIdx < this.sections.length) {
          this.sections[targetIdx].scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  }
}

// Instantiate on DOM Load
document.addEventListener('DOMContentLoaded', () => {
  window.narrativeEngine = new NarrativeEngine();
});