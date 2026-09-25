/* Omawild — subscription builder for sections/owv2-subscription-builder.liquid.
   Everything rendered here comes from the section's JSON catalogue, which Liquid
   builds from selling plan allocations. Prices arrive pre-formatted by Shopify's
   money filter; this file only chooses between them. */

/* Turns a Shopify selling plan into the pill text ("Every month").
   plan.name is the name set in the Subscriptions app; plan.options holds the
   plan's option values (e.g. delivery interval). */
function owv2FrequencyLabel(plan) {
  // TODO(you): shape the Subscriptions app plan name into the pill label.
  return plan.name;
}

if (!customElements.get('owv2-subscription-builder')) {
  customElements.define('owv2-subscription-builder', class extends HTMLElement {
    connectedCallback() {
      if (this.catalogue) return;
      try {
        this.catalogue = JSON.parse(this.querySelector('[data-catalogue]').textContent);
      } catch {
        return;
      }
      this.selection = { product: null, variant: null, plan: null };
      this.addEventListener('change', (event) => {
        const input = event.target;
        if (!input.dataset.step) return;
        this.select(input.dataset.step, Number(input.value));
      });
      this.select('product', this.catalogue.products[0]?.id);
    }

    /* Choosing a step re-derives every step after it, keeping the previous
       variant title / plan when the new parent still offers it. */
    select(step, id) {
      const { products } = this.catalogue;
      const previous = { ...this.selection };
      if (step === 'product') {
        this.selection.product = products.find((p) => p.id === id) || null;
      }
      if (step === 'product' || step === 'variant') {
        const variants = this.selection.product?.variants || [];
        this.selection.variant = step === 'variant'
          ? variants.find((v) => v.id === id)
          : variants.find((v) => v.title === previous.variant?.title) || variants[0];
      }
      const plans = this.selection.variant?.plans || [];
      this.selection.plan = step === 'plan'
        ? plans.find((p) => p.id === id)
        : plans.find((p) => p.id === previous.plan?.id) || plans[0];
      const hadFocus = this.contains(document.activeElement);
      this.render();
      if (hadFocus) this.querySelector(`input[data-step="${step}"]:checked`)?.focus();
    }

    render() {
      const { product, variant, plan } = this.selection;
      this.renderStep('product', this.catalogue.products, product, (p) => p.title, (p) => p.image);
      this.renderStep('variant', product?.variants || [], variant, (v) => v.title);
      this.renderStep('plan', variant?.plans || [], plan, owv2FrequencyLabel);

      const ready = Boolean(product && variant && plan);
      this.querySelector('[data-variant-input]').value = ready ? variant.id : '';
      this.querySelector('[data-plan-input]').value = ready ? plan.id : '';
      this.querySelector('[data-submit]').disabled = !ready;
      if (!ready) return;

      const frequency = owv2FrequencyLabel(plan);
      this.querySelector('[data-title]').textContent = product.title;
      this.querySelector('[data-description]').textContent =
        [product.title, variant.title, frequency.charAt(0).toLowerCase() + frequency.slice(1)].join(' · ');
      this.querySelector('.prices').hidden = false;
      this.querySelector('[data-price]').textContent = plan.price;
      const compare = this.querySelector('[data-compare]');
      compare.textContent = plan.compare || '';
      compare.hidden = !plan.compare;
      this.querySelector('[data-saving]').textContent = plan.saving
        ? (this.catalogue.savings || '').replace('[amount]', plan.saving)
        : '';
    }

    renderStep(step, items, current, label, image = () => null) {
      const fieldset = this.querySelector(`[data-step="${step}"]`);
      const name = `${step}-${this.closest('[class^="owv2-subbuild-"]')?.className || ''}`;
      fieldset.hidden = items.length === 0;
      fieldset.querySelector('[data-options]').replaceChildren(...items.map((item) => {
        const option = document.createElement('label');
        option.className = 'option';
        const input = document.createElement('input');
        Object.assign(input, { type: 'radio', name, value: item.id, checked: item === current });
        input.dataset.step = step;
        const text = document.createElement('span');
        const src = image(item);
        if (src) {
          const img = Object.assign(document.createElement('img'), { src, alt: '', loading: 'lazy' });
          text.append(img);
        }
        text.append(label(item));
        option.append(input, text);
        return option;
      }));
    }
  });
}
