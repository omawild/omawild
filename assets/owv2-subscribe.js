/* Display-only estimates. The CTA opens the merchant-configured subscription flow. */
if (!customElements.get('owv2-subscribe')) {
  customElements.define('owv2-subscribe', class extends HTMLElement {
    connectedCallback() {
      if (this.onSelectionChange) return;
      this.onSelectionChange = () => this.updateSummary();
      this.addEventListener('change', this.onSelectionChange);
      this.updateSummary();
    }

    disconnectedCallback() {
      this.removeEventListener('change', this.onSelectionChange);
      this.onSelectionChange = null;
    }

    updateSummary() {
      const selected = (group) => this.querySelector(`input[data-group="${group}"]:checked`);
      const roast = selected('roast');
      const size = selected('size');
      const frequency = selected('frequency');
      if (!roast || !size || !frequency) return;
      const finite = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
      const discount = Math.min(100, Math.max(0, finite(this.dataset.discount)));
      const original = Math.max(0, finite(roast.dataset.price) + finite(size.dataset.modifier));
      let formatter;
      try {
        formatter = new Intl.NumberFormat(this.dataset.locale || 'en', {
          style: 'currency', currency: this.dataset.currency || 'USD'
        });
      } catch {
        formatter = new Intl.NumberFormat('en', { style: 'currency', currency: 'USD' });
      }
      const precision = 10 ** formatter.resolvedOptions().maximumFractionDigits;
      const price = Math.round(original * (1 - discount / 100) * precision) / precision;
      this.querySelector('[data-roast]').textContent = roast.dataset.label;
      this.querySelector('[data-description]').textContent = [roast, size, frequency]
        .map((option) => option.dataset.label).join(' · ');
      this.querySelector('[data-total]').textContent = formatter.format(price);
      this.querySelector('[data-original]').textContent = formatter.format(original);
      this.querySelector('[data-original]').hidden = discount === 0;
      this.querySelector('.prices').hidden = false;
      this.querySelector('[data-saving]').textContent = (this.dataset.savings || '')
        .replace('[amount]', formatter.format(original - price));
    }
  });
}
