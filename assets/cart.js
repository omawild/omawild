class CartRemoveButton extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('click', (event) => {
      event.preventDefault();
      this.closest('cart-items').updateQuantity(this.dataset.index, 0);
    });
  }
}
customElements.define('cart-remove-button', CartRemoveButton);
if (!customElements.get('cart-items')) {
  customElements.define('cart-items', class CartItems extends HTMLElement {
    cartUpdateUnsubscriber = undefined;
    
    constructor() {
      super();

      this.lineItemStatusElement = document.getElementById('shopping-cart-line-item-status');
      this.cartErrors = document.getElementById('cart-errors');

      this.currentItemCount = Array.from(this.querySelectorAll('[name="updates[]"]'))
        .reduce((total, quantityInput) => total + parseInt(quantityInput.value), 0);

      this.debouncedOnChange = debounce((event) => {
        this.onChange(event);
      }, 300);

      this.addEventListener('change', this.debouncedOnChange.bind(this));
      this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, this.onCartUpdate.bind(this));
    }

    disconnectedCallback() {
      if (this.cartUpdateUnsubscriber) {
        this.cartUpdateUnsubscriber();
      }
    }

    onCartUpdate(event) {
      const sections = event.sections; 
      const parsedState = event.cart; 
      
      this.classList.toggle('is-empty', parsedState.item_count === 0);
      const cartFooter = document.getElementById('main-cart-footer');

      if (cartFooter) cartFooter.classList.toggle('is-empty', parsedState.item_count === 0);
      if (parsedState.errors) {
        this.updateErrorLiveRegions(event.line, parsedState.errors);
      }
      this.getSectionsToRender().forEach((section => {
        const element = document.getElementById(section.id);
        
        if (element) {
          const elementToReplace = element.querySelector(section.selector) || element;
          if (elementToReplace && parsedState.sections[section.section]) {
            elementToReplace.innerHTML =
              this.getSectionInnerHTML(parsedState.sections[section.section], section.selector);
          }
        }
      }));
      
      this.updateQuantityLiveRegions(event.line, parsedState.item_count);
      
      const lineItem = document.getElementById(`CartItem-${event.line}`);
      if (lineItem && event.name) lineItem.querySelector(`[name="${event.name}"]`).focus();
      this.disableLoading();

      document.dispatchEvent(new CustomEvent('cart:updated', {
        detail: {
          cart: parsedState
        }
      }));
    }

    updateQuantity(line, quantity, name, target) {
      const sections = this.getSectionsToRender().map((section) => section.section).filter(Boolean);
      const body = JSON.stringify({
        line,
        quantity,
        sections: sections,
        sections_url: window.location.pathname
      });

      fetch(`${theme.routes.cart_change_url}`, {...fetchConfig(), ...{ body }})
        .then((response) => {
          return response.text();
        })
        .then((state) => {
          const parsedState = JSON.parse(state);
          publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-items', cart: parsedState,  target, line, name, sections  });
        })
        .catch(() => {
          this.querySelectorAll('.loading-overlay').forEach((overlay) => overlay.classList.add('hidden'));
          this.disableLoading();
          if (this.cartErrors) {
            this.cartErrors.textContent = theme.cartStrings.error;
          }
        });
    }

    onChange(event) {
      if (event.target === null) return;
      this.updateQuantity(event.target.dataset.index, event.target.value, document.activeElement.getAttribute('name'));
    }

    // mini-cart and cart-icon-bubble dropped: sections/header.liquid, the
    // only file that ever rendered either of them, is dead code since
    // sections/ow-header.liquid replaced it, so #mini-cart and
    // #cart-icon-bubble don't exist anywhere on the live page. Requesting
    // them still made Shopify fully server-render both sections on every
    // single AJAX cart action for zero benefit, since nothing consumed the
    // result. mobile-cart-icon-bubble stays: sections/mobile-dock.liquid
    // (rendered globally via the overlay-group section group) has a real
    // #mobile-cart-icon-bubble target. So does cart-live-region-text:
    // oma-cart-items.liquid's own #cart-live-region-text element depends on
    // it for the "New subtotal: $X" screen-reader announcement.
    getSectionsToRender() {
      let sections = [
        {
          id: 'main-cart-items',
          section: document.getElementById('main-cart-items')?.dataset.id,
          selector: '.js-contents',
        },
        {
          id: 'mobile-cart-icon-bubble',
          section: 'mobile-cart-icon-bubble',
          selector: '.shopify-section'
        },
        {
          id: 'cart-live-region-text',
          section: 'cart-live-region-text',
          selector: '.shopify-section'
        },
        {
          id: 'main-cart-footer',
          section: document.getElementById('main-cart-footer')?.dataset.id,
          selector: '.js-contents',
        }
      ];
      if (document.querySelector('#main-cart-footer .free-shipping')) {
        sections.push({
          id: 'main-cart-footer',
          section: document.getElementById('main-cart-footer')?.dataset.id,
          selector: '.free-shipping',
        });
      }
      return sections;
    }

    updateErrorLiveRegions(line, message) {
      const lineItemError =
        document.getElementById(`Line-item-error-${line}`) || document.getElementById(`CartDrawer-LineItemError-${line}`);
      if (lineItemError) lineItemError.querySelector('.cart-item__error-text').innerHTML = message;
    
      this.lineItemStatusElement.setAttribute('aria-hidden', true);
    
      const cartStatus =
        document.getElementById('cart-live-region-text') || document.getElementById('CartDrawer-LiveRegionText');
      cartStatus.setAttribute('aria-hidden', false);
    
      setTimeout(() => {
        cartStatus.setAttribute('aria-hidden', true);
      }, 1000);
    }
    
    updateQuantityLiveRegions(line, itemCount) {
      if (this.currentItemCount === itemCount) {
        const quantityError = document.getElementById(`Line-item-error-${line}`);
        if (quantityError) {
          quantityError.querySelector('.cart-item__error-text')
            .innerHTML = theme.cartStrings.quantityError.replace(
              '[quantity]',
              document.getElementById(`Quantity-${line}`).value
            ); 
        }
      }

      this.currentItemCount = itemCount;
      
      if (this.lineItemStatusElement) this.lineItemStatusElement.setAttribute('aria-hidden', true);

      const cartStatus = document.getElementById('cart-live-region-text');
      if (cartStatus) {
        cartStatus.setAttribute('aria-hidden', false);

        setTimeout(() => {
          cartStatus.setAttribute('aria-hidden', true);
        }, 1e3);
      }
    }

    getSectionInnerHTML(html, selector) {
      return new DOMParser()
        .parseFromString(html, 'text/html')
        .querySelector(selector)?.innerHTML;
    }

    enableLoading(line) {
      const cartItems = document.getElementById('main-cart-items');
      if (cartItems) cartItems.classList.add('cart__items--disabled');

      const loadingOverlay = this.querySelectorAll('.loading-overlay')[line - 1];
      if (loadingOverlay) loadingOverlay.classList.remove('hidden');
      
      document.activeElement.blur();
      if (this.lineItemStatusElement) this.lineItemStatusElement.setAttribute('aria-hidden', false);
    }

    disableLoading() {
      const cartItems = document.getElementById('main-cart-items');
      if (cartItems) cartItems.classList.remove('cart__items--disabled');
    }

    renderContents(parsedState) {
      this.getSectionsToRender().forEach((section => {
        const element = document.getElementById(section.id);

        if (element) {
          element.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
        }
      }));
    }
  });
}

class CartNote extends HTMLElement {
  constructor() {
    super();

    this.textarea = this.querySelector('[data-cart-note-textarea]');
    if (!this.textarea) return;

    this.counter = this.querySelector('[data-cart-note-count]');
    this.editorView = this.querySelector('[data-cart-note-editor]');
    this.savedView = this.querySelector('[data-cart-note-saved-view]');
    this.savedText = this.querySelector('[data-cart-note-saved-text]');
    this.saveBtn = this.querySelector('[data-cart-note-save]');
    this.cancelBtn = this.querySelector('[data-cart-note-cancel]');
    this.editBtn = this.querySelector('[data-cart-note-edit]');
    this.removeBtn = this.querySelector('[data-cart-note-remove]');
    this.accordion = this.closest('[data-oci-note-accordion]');
    this.maxLength = parseInt(this.dataset.maxLength || '150', 10);

    this.savedValue = this.textarea.value.trim();

    this.updateCounter();
    this.updateSaveState();

    this.textarea.addEventListener('input', () => {
      this.updateCounter();
      this.updateSaveState();
    });

    if (this.saveBtn) this.saveBtn.addEventListener('click', () => this.save());
    if (this.cancelBtn) this.cancelBtn.addEventListener('click', () => this.cancel());
    if (this.editBtn) this.editBtn.addEventListener('click', () => this.edit());
    if (this.removeBtn) this.removeBtn.addEventListener('click', () => this.remove());
  }

  updateCounter() {
    if (this.counter) this.counter.textContent = `${this.textarea.value.length}/${this.maxLength}`;
  }

  updateSaveState() {
    const hasValue = this.textarea.value.trim().length > 0;
    if (this.saveBtn) {
      this.saveBtn.disabled = !hasValue;
      this.saveBtn.textContent = this.savedValue ? 'Update note' : 'Add to order';
    }
  }

  showEditor() {
    if (this.editorView) this.editorView.hidden = false;
    if (this.savedView) this.savedView.hidden = true;
  }

  showSaved() {
    if (this.editorView) this.editorView.hidden = true;
    if (this.savedView) this.savedView.hidden = false;
  }

  setHeaderChip(show) {
    const chip = this.accordion ? this.accordion.querySelector('[data-oci-note-chip]') : null;
    if (chip) chip.hidden = !show;
  }

  save() {
    const value = this.textarea.value.trim();
    if (!value) return;
    this.savedValue = value;
    if (this.savedText) this.savedText.textContent = value;
    if (this.cancelBtn) this.cancelBtn.hidden = false;
    this.persist(value);
    this.updateSaveState();
    this.showSaved();
    this.setHeaderChip(true);
  }

  cancel() {
    this.textarea.value = this.savedValue;
    this.updateCounter();
    this.updateSaveState();
    this.showSaved();
  }

  edit() {
    this.showEditor();
    this.textarea.focus();
  }

  remove() {
    this.savedValue = '';
    this.textarea.value = '';
    if (this.savedText) this.savedText.textContent = '';
    if (this.cancelBtn) this.cancelBtn.hidden = true;
    this.persist('');
    this.updateCounter();
    this.updateSaveState();
    this.showEditor();
    this.setHeaderChip(false);
  }

  persist(value) {
    const body = JSON.stringify({ note: value });
    fetch(`${theme.routes.cart_update_url}`, { ...fetchConfig(), ...{ body } });
  }
}
customElements.define('cart-note', CartNote);

if (!customElements.get('cart-discount')) {
  customElements.define('cart-discount', class CartDiscount extends HTMLElement {
    constructor() {
      super();
      this.onApplyDiscount = this.applyDiscount.bind(this);
    }

    get sectionId() {
      return this.getAttribute('data-section-id');
    }
    
    connectedCallback() {
      this.submitButton = this.querySelector('[data-discount-btn]');
      this.resultsElement = this.lastElementChild;
      this.submitButton.addEventListener('click', this.onApplyDiscount);

      this.discountInput = this.querySelector('[name="discount"]');
      if (this.discountInput) {
        this.onDiscountKeydown = (event) => {
          if (event.key === 'Enter') this.applyDiscount(event);
        };
        this.discountInput.addEventListener('keydown', this.onDiscountKeydown);
      }
    }

    disconnectedCallback() {
      this.abortController?.abort();
      this.submitButton.removeEventListener('click', this.onApplyDiscount);
      if (this.discountInput) this.discountInput.removeEventListener('keydown', this.onDiscountKeydown);
    }

    // mini-cart and cart-icon-bubble dropped: sections/header.liquid, the
    // only file that ever rendered either of them, is dead code since
    // sections/ow-header.liquid replaced it, so #mini-cart and
    // #cart-icon-bubble don't exist anywhere on the live page. Requesting
    // them still made Shopify fully server-render both sections on every
    // single AJAX cart action for zero benefit, since nothing consumed the
    // result. mobile-cart-icon-bubble stays: sections/mobile-dock.liquid
    // (rendered globally via the overlay-group section group) has a real
    // #mobile-cart-icon-bubble target. So does cart-live-region-text:
    // oma-cart-items.liquid's own #cart-live-region-text element depends on
    // it for the "New subtotal: $X" screen-reader announcement.
    getSectionsToRender() {
      let sections = [
        {
          id: 'main-cart-items',
          section: document.getElementById('main-cart-items')?.dataset.id,
          selector: '.js-contents',
        },
        {
          id: 'mobile-cart-icon-bubble',
          section: 'mobile-cart-icon-bubble',
          selector: '.shopify-section'
        },
        {
          id: 'cart-live-region-text',
          section: 'cart-live-region-text',
          selector: '.shopify-section'
        },
        {
          id: 'main-cart-footer',
          section: document.getElementById('main-cart-footer')?.dataset.id,
          selector: '.js-contents',
        }
      ];
      if (document.querySelector('#main-cart-footer .free-shipping')) {
        sections.push({
          id: 'main-cart-footer',
          section: document.getElementById('main-cart-footer')?.dataset.id,
          selector: '.free-shipping',
        });
      }
      return sections;
    }

    applyDiscount(event) {
      event.preventDefault();

      const discountCode = this.querySelector('[name="discount"]');
      if (!(discountCode instanceof HTMLInputElement) || typeof this.getAttribute('data-section-id') !== 'string') return;

      this.abortController?.abort();
      this.abortController = new AbortController();

      const discountCodeValue = discountCode.value.trim();
      if (discountCodeValue === '') {
        this.setDiscountError(theme.discountStrings.empty);
        return;
      }

      const existingDiscounts = this.existingDiscounts();
      if (existingDiscounts.includes(discountCodeValue)) {
        this.setDiscountError(theme.discountStrings.duplicate.replace('[code]', discountCodeValue));
        return;
      }

      this.setDiscountError('');
      this.submitButton.setAttribute('aria-busy', 'true');
      
      const sections = this.getSectionsToRender().map((section) => section.section).filter(Boolean);
      const body = JSON.stringify({
        discount: [...existingDiscounts, discountCodeValue].join(','),
        sections: sections,
        sections_url: window.location.pathname
      });

      fetch(`${theme.routes.cart_update_url}`, {...fetchConfig('json'), ...{ body }, signal: this.abortController.signal })
        .then((response) => response.json())
        .then((parsedState) => {
          if (
            parsedState.discount_codes.find((discount) => {
              return discount.code === discountCodeValue && discount.applicable === false;
            })
          ) {
            discountCode.value = '';
            this.setDiscountError(theme.discountStrings.error);
            return;
          }
          
          const newHtml = parsedState.sections[this.sectionId];
          const parsedHtml = new DOMParser().parseFromString(newHtml, 'text/html');
          const section = parsedHtml.getElementById(`shopify-section-${this.sectionId}`);

          if (section) {
            const discountCodes = section?.querySelectorAll('button[is="discount-remove"]') || [];
            const codes = Array.from(discountCodes)
              .map((element) => (element instanceof HTMLButtonElement ? element.getAttribute('data-discount') : null))
              .filter(Boolean);

            if (
              codes.length === existingDiscounts.length &&
              codes.every((code) => existingDiscounts.includes(code)) &&
              parsedState.discount_codes.find((discount) => {
                return discount.code === discountCodeValue && discount.applicable === true;
              })
            ) {
              discountCode.value = '';
              this.setDiscountError(theme.discountStrings.shippingError);
              return;
            }
          }

          publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-discount', cart: parsedState });
        })
        .catch((error) => {
          if (error.name === 'AbortError') {
            console.log('Fetch aborted by user');
          }
          else {
            console.error(error);
            this.setDiscountError(theme.discountStrings.network.replace('[code]', discountCodeValue));
          }
        })
        .finally(() => {
          this.submitButton.removeAttribute('aria-busy');
        });
    }

    removeDiscount(event) {
      if ((event instanceof KeyboardEvent && event.key !== 'Enter') || !(event instanceof MouseEvent)) {
        return;
      }

      const discountCode = event.currentTarget.getAttribute('data-discount');
      
      if (!discountCode) return;

      const existingDiscounts = this.existingDiscounts();
      const index = existingDiscounts.indexOf(discountCode);
      if (index === -1) return;

      existingDiscounts.splice(index, 1);

      this.abortController?.abort();
      this.abortController = new AbortController();

      this.setDiscountError('');
      event.currentTarget.setAttribute('loading', '');

      const sections = this.getSectionsToRender().map((section) => section.section).filter(Boolean);
      const body = JSON.stringify({
        discount: existingDiscounts.join(','),
        sections: sections,
        sections_url: window.location.pathname
      });
      
      fetch(theme.routes.cart_update_url, { ...fetchConfig(), ...{ body }, signal: this.abortController.signal })
        .then((response) => response.json())
        .then((parsedState) => {
          publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-discount', cart: parsedState });
        })
        .catch((error) => {
          if (error.name === 'AbortError') {
            console.log('Fetch aborted by user');
          }
          else {
            console.error(error);
          }
        })
        .finally(() => {
          event.target.removeAttribute('loading');
        });
    }

    existingDiscounts() {
      const discountCodes = [];
      const discountPills = this.querySelectorAll('button[is="discount-remove"]');
      for (const pill of discountPills) {
        if (pill.hasAttribute('data-discount')) {
          discountCodes.push(pill.getAttribute('data-discount'));
        }
      }
      return discountCodes;
    }

    setDiscountError(error) {
      this.resultsElement.lastElementChild.textContent = error;
      if(error.length === 0) {
        this.resultsElement.classList.add('hidden');
      } else {
        this.resultsElement.classList.remove('hidden');
      }
    }
  });
}

class DiscountRemove extends HTMLButtonElement {
  constructor() {
    super();
     this.addEventListener('click', (event) => {
        const cartDiscount = this.closest('cart-discount') || document.querySelector('cart-discount');
        if (cartDiscount) {
          event.preventDefault();
          cartDiscount.removeDiscount(event);
        }
      });
  }
}
customElements.define('discount-remove', DiscountRemove, { extends: 'button' });

class ShippingCalculator extends HTMLElement {
  constructor() {
    super();

    this.setupCountries();
    
    this.errors = this.querySelector('#ShippingCalculatorErrors');
    this.success = this.querySelector('#ShippingCalculatorSuccess');
    this.zip = this.querySelector('#ShippingCalculatorZip');
    this.country = this.querySelector('#ShippingCalculatorCountry');
    this.province = this.querySelector('#ShippingCalculatorProvince');
    this.button = this.querySelector('button');
    this.button.addEventListener('click', this.onSubmitHandler.bind(this));
  }

  setupCountries() {
    if (Shopify && Shopify.CountryProvinceSelector) {
      // eslint-disable-next-line no-new
      new Shopify.CountryProvinceSelector('ShippingCalculatorCountry', 'ShippingCalculatorProvince', {
        hideElement: 'ShippingCalculatorProvinceContainer'
      });
    }
  }

  onSubmitHandler(event) {
    event.preventDefault();

    this.errors.classList.add('hidden');
    this.success.classList.add('hidden');
    this.zip.classList.remove('invalid');
    this.country.classList.remove('invalid');
    this.province.classList.remove('invalid');
    this.button.classList.add('loading');
    this.button.setAttribute('disabled', true);

    const body = JSON.stringify({
      shipping_address: {
        zip: this.zip.value,
        country: this.country.value,
        province: this.province.value
      }
    });
    let sectionUrl = `${theme.routes.cart_url}/shipping_rates.json`;

    // remove double `/` in case shop might have /en or language in URL
    sectionUrl = sectionUrl.replace('//', '/');

    fetch(sectionUrl, { ...fetchConfig('javascript'), body })
      .then((response) => response.json())
      .then((parsedState) => {
        if (parsedState.shipping_rates && parsedState.shipping_rates.length > 0) {
          this.renderRates(parsedState.shipping_rates);
        }
        else if (parsedState.shipping_rates) {
          this.renderError(theme.shippingCalculatorStrings.noRates);
        }
        else {
          this.renderError(this.formatApiErrors(parsedState));
        }
      })
      .catch((e) => {
        console.error(e);
        this.renderError(theme.shippingCalculatorStrings.networkError);
      })
      .finally(() => {
        this.button.classList.remove('loading');
        this.button.removeAttribute('disabled');
      });
  }

  formatApiErrors(parsedState) {
    return Object.entries(parsedState)
      .map(([attribute, messages]) => `${attribute.charAt(0).toUpperCase() + attribute.slice(1)} ${messages[0]}`)
      .join('; ');
  }

  renderError(message) {
    this.errors.classList.remove('hidden');
    const inner = this.errors.querySelector('.errors');
    if (inner) inner.textContent = message;
  }

  // Only renders an ETA line when the real rate actually carries delivery-time
  // data — never fabricates a delivery estimate the API didn't return.
  formatDeliveryEstimate(rate) {
    if (Array.isArray(rate.delivery_range) && rate.delivery_range.length === 2) {
      const fmt = (iso) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      return `${fmt(rate.delivery_range[0])}–${fmt(rate.delivery_range[1])}`;
    }
    if (Array.isArray(rate.delivery_days) && rate.delivery_days.length === 2) {
      const [min, max] = rate.delivery_days;
      return `${min}–${max} business days`;
    }
    return null;
  }

  renderRates(rates) {
    this.success.classList.remove('hidden');
    this.success.innerHTML = '';

    const sectionId = this.closest('[data-id]') ? this.closest('[data-id]').dataset.id : '';
    const country = this.country.options[this.country.selectedIndex] ? this.country.options[this.country.selectedIndex].text : this.country.value;
    const zip = this.zip.value.trim();

    const heading = document.createElement('div');
    heading.className = `ocf-ship-rates-head-${sectionId}`;
    heading.textContent = `${rates.length} option${rates.length === 1 ? '' : 's'} for ${country}${zip ? ' ' + zip : ''}`;
    this.success.appendChild(heading);

    rates.forEach((rate) => {
      const card = document.createElement('div');
      card.className = `ocf-ship-rate-card-${sectionId}`;

      const info = document.createElement('div');
      const name = document.createElement('div');
      name.className = `ocf-ship-rate-name-${sectionId}`;
      name.textContent = rate.name;
      info.appendChild(name);

      const eta = this.formatDeliveryEstimate(rate);
      if (eta) {
        const etaEl = document.createElement('div');
        etaEl.className = `ocf-ship-rate-eta-${sectionId}`;
        etaEl.textContent = eta;
        info.appendChild(etaEl);
      }
      card.appendChild(info);

      const price = document.createElement('div');
      price.className = `ocf-ship-rate-price-${sectionId}`;
      const cents = Math.round(parseFloat(rate.price) * 100);
      price.textContent = theme.Currency.formatMoney(cents, theme.shopSettings.moneyFormat);
      card.appendChild(price);

      this.success.appendChild(card);
    });

    const note = document.createElement('p');
    note.className = `ocf-ship-rates-note-${sectionId}`;
    note.textContent = theme.shippingCalculatorStrings.chooseMethod;
    this.success.appendChild(note);
  }
}

customElements.define('shipping-calculator', ShippingCalculator);
