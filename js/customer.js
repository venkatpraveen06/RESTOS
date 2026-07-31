/* ==========================================================================
   RestaurantOS Commercial Customer Storefront & Dedicated Cart Logic
   ========================================================================== */

const CustomerModule = {
  cart: [],
  appliedCoupon: null,
  activeCategory: 'all',
  selectedTableForReservation: 'Table 01',

  init() {
    this.loadCart();
    this.renderCategoryAvatars();
    this.renderMenuItems();
    this.renderCustomerTableMap();
    this.renderCustomerConfirmedReservations();
    this.renderCustomerFeedback();
    this.setupFilters();
  },

  loadCart() {
    const saved = localStorage.getItem('restaurantos_cart');
    if (saved !== null) {
      try {
        this.cart = JSON.parse(saved);
      } catch (err) {
        this.cart = [];
      }
    } else {
      // Clean empty cart on fresh start
      this.cart = [];
      this.saveCart();
    }
  },

  saveCart() {
    localStorage.setItem('restaurantos_cart', JSON.stringify(this.cart));
    this.updateCartBar();
  },

  // 1. Mind Category Avatars ("What's on your mind?")
  renderCategoryAvatars() {
    const store = getStore();
    const container = document.getElementById('mindCategoryGrid');
    if (!container) return;

    const fallbackImg = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80";

    container.innerHTML = store.categories.map(cat => `
      <div class="mind-item ${cat.id === this.activeCategory ? 'active' : ''}" onclick="CustomerModule.selectCategory('${cat.id}')">
        <div class="mind-avatar-box mind-avatar-wrap">
          <img src="${cat.image}" alt="${cat.name}" class="mind-avatar-img mind-avatar" onerror="this.onerror=null; this.src='${fallbackImg}';">
        </div>
        <span class="mind-item-name mind-name">${cat.name}</span>
      </div>
    `).join('');
  },

  selectCategory(catId) {
    this.activeCategory = catId;
    this.renderCategoryAvatars();
    if (typeof window !== 'undefined' && window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
      window.location.href = 'menu.html';
      return;
    }
    this.renderMenuItems();
    if (typeof App !== 'undefined' && App.currentView === 'menu-catalog') {
      this.renderFullMenuCardPage();
    }
  },

  // 2. RENDER 10-TABLE FLOOR GRID ON CUSTOMER PAGE (Table 01 to Table 10)
  renderCustomerTableMap() {
    const store = getStore();
    const container = document.getElementById('customerTableGrid');
    const modalSelectContainer = document.getElementById('customerModalTableGrid');
    
    if (container) {
      container.innerHTML = store.tables.map(t => {
        const isSelected = this.selectedTableForReservation === t.name;

        return `
          <div class="table-card ${t.status.toLowerCase()} ${isSelected ? 'selected' : ''}" style="cursor: pointer;" onclick="CustomerModule.selectCustomerTable('${t.name}', '${t.status}')">
            <div class="table-card-top">
              <div class="table-number-title">${t.name}</div>
              <span class="table-capacity" style="font-size: 0.8rem; font-weight: 700; color: #64748B;"><i class="fas fa-chair" style="color: #2563EB;"></i> ${t.capacity} Seats</span>
            </div>

            <div class="table-visual-shape" style="background: ${t.status === 'Available' ? '#ECFDF5' : (t.status === 'Occupied' ? '#FEF2F2' : '#FFFBEB')}; color: ${t.status === 'Available' ? '#047857' : (t.status === 'Occupied' ? '#DC2626' : '#B45309')}; font-size: 0.75rem; font-weight: 800; padding: 0.35rem 0.5rem; border-radius: var(--radius-sm); margin: 0.5rem 0;">
              ${t.status.toUpperCase()}
            </div>

            <div class="table-chairs-row">
              ${Array(t.capacity).fill('<span class="chair-icon-dot"></span>').join('')}
            </div>

            <div style="margin-top: 0.6rem; font-size: 0.75rem; font-weight: 700;">
              ${t.status === 'Available' ? `
                <span style="color: #10B981;"><i class="fas fa-calendar-plus"></i> Tap to Reserve</span>
              ` : `
                <span style="color: #64748B;"><i class="fas fa-lock"></i> ${t.status}</span>
              `}
            </div>
          </div>
        `;
      }).join('');
    }

    if (modalSelectContainer) {
      modalSelectContainer.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.5rem;">
          ${store.tables.map(t => `
            <button type="button" class="table-selector-btn ${t.name === this.selectedTableForReservation ? 'selected' : ''} ${t.status !== 'Available' ? 'disabled' : ''}" 
                    onclick="${t.status === 'Available' ? `CustomerModule.setModalSelectedTable('${t.name}')` : ''}">
              <strong>${t.name}</strong>
              <span class="table-status-subtag">${t.capacity}P • ${t.status}</span>
            </button>
          `).join('')}
        </div>
      `;
    }
  },

  selectCustomerTable(tableName, status) {
    if (status !== 'Available') {
      App.showToast(`${tableName} is currently ${status}. Please select an empty green table!`, 'warning');
      return;
    }
    this.selectedTableForReservation = tableName;
    const hiddenIn = document.getElementById('resSelectedTable');
    if (hiddenIn) hiddenIn.value = tableName;

    this.renderCustomerTableMap();
    App.openModal('bookTableModal');
    App.showToast(`Selected ${tableName} for booking!`, 'success');
  },

  setModalSelectedTable(tableName) {
    this.selectedTableForReservation = tableName;
    const hiddenIn = document.getElementById('resSelectedTable');
    if (hiddenIn) hiddenIn.value = tableName;
    this.renderCustomerTableMap();
  },

  // 3. Render Confirmed Reservations Table on Customer Page
  renderCustomerConfirmedReservations() {
    const store = getStore();
    const container = document.getElementById('customerConfirmedReservationsCard');
    if (!container) return;

    if (!store.reservations || store.reservations.length === 0) {
      container.innerHTML = ``;
      return;
    }

    container.innerHTML = `
      <div style="background: #FFFFFF; border: 1px solid var(--border-color); border-radius: var(--radius-xl); padding: 1.25rem 1.5rem;">
        <div style="font-size: 1.05rem; font-weight: 800; color: #0F172A; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
          <i class="fas fa-calendar-check" style="color: #10B981;"></i> Active Confirmed Table Reservations
        </div>

        <div style="overflow-x: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Booking Ref</th>
                <th>Guest Name</th>
                <th>Party Size</th>
                <th>Date & Time</th>
                <th>Allocated Table</th>
                <th>Booking Status</th>
              </tr>
            </thead>
            <tbody>
              ${store.reservations.map(r => `
                <tr>
                  <td style="padding: 0.65rem;"><strong>${r.id}</strong></td>
                  <td style="padding: 0.65rem; font-weight: 700; color: #0F172A;">${r.guestName}</td>
                  <td style="padding: 0.65rem;"><span class="badge badge-neutral">${r.guests} Guests</span></td>
                  <td style="padding: 0.65rem;">${r.date} @ ${r.time}</td>
                  <td style="padding: 0.65rem;"><span class="badge badge-primary" style="font-weight: 800;">${r.tableAllocated}</span></td>
                  <td style="padding: 0.65rem;">
                    <span class="badge ${r.status === 'Confirmed' ? 'badge-success' : 'badge-warning'}">
                      <i class="fas ${r.status === 'Confirmed' ? 'fa-check-circle' : 'fa-clock'}"></i> ${r.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // 4. Food Menu Catalog Cards
  renderMenuItems() {
    const store = getStore();
    const container = document.getElementById('customerMenuGrid');
    if (!container) return;

    let items = store.menuItems;

    if (this.activeCategory !== 'all') {
      items = items.filter(i => i.category === this.activeCategory);
    }

    const searchInput = document.getElementById('customerMenuSearch');
    if (searchInput && searchInput.value.trim()) {
      const q = searchInput.value.toLowerCase().trim();
      items = items.filter(i => i.name.toLowerCase().includes(q) || (i.description && i.description.toLowerCase().includes(q)));
    }

    const fallbackImg = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80";

    container.innerHTML = items.map(item => {
      const inCartItem = this.cart.find(c => c.id === item.id);
      const qty = inCartItem ? inCartItem.qty : 0;
      const stockQty = typeof item.stockQty !== 'undefined' ? item.stockQty : 30;

      return `
        <div class="resto-dish-card">
          <div class="dish-img-box">
            <img src="${item.image}" alt="${item.name}" class="dish-img" onerror="this.onerror=null; this.src='${fallbackImg}';">
            ${item.badge ? `<span class="dish-badge-overlay">${item.badge}</span>` : ''}
            ${item.discount ? `<span class="dish-discount-tag">${item.discount}% OFF</span>` : ''}
          </div>

          <div class="dish-card-body">
            <div>
              <div class="dish-veg-row">
                <span class="veg-icon-box ${item.isVeg ? '' : 'non-veg'}">
                  <span class="veg-icon-dot-inner"></span>
                </span>
                <span style="font-size: 0.75rem; font-weight: 700; color: #F59E0B;">
                  <i class="fas fa-star"></i> ${item.rating} (${item.reviewsCount}+)
                </span>
              </div>

              <h3 class="dish-title">${item.name}</h3>
              <p class="dish-desc">${item.description}</p>
            </div>

            <div class="dish-footer-row">
              <div class="dish-price-box">
                <span class="dish-price-current">₹${item.price}</span>
                ${item.originalPrice ? `<span class="dish-price-original">₹${item.originalPrice}</span>` : ''}
              </div>

              ${qty > 0 ? `
                <div class="resto-qty-pill">
                  <button type="button" class="resto-qty-btn" onclick="CustomerModule.updateCartQty('${item.id}', -1)">-</button>
                  <span class="resto-qty-val">${qty}</span>
                  <button type="button" class="resto-qty-btn" onclick="CustomerModule.updateCartQty('${item.id}', 1)">+</button>
                </div>
              ` : `
                <button type="button" class="resto-add-btn" onclick="CustomerModule.addToCart('${item.id}')" ${stockQty === 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                  ${stockQty > 0 ? 'ADD <i class="fas fa-plus" style="font-size: 0.72rem; margin-left: 0.25rem;"></i>' : 'OUT OF STOCK'}
                </button>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.updateCartBar();
  },

  // Dedicated Standalone Digital Menu Card Page
  renderFullMenuCardPage() {
    const container = document.getElementById('view-menu-catalog');
    if (!container) return;

    const store = getStore();
    let items = store.menuItems || [];

    if (this.activeCategory !== 'all') {
      items = items.filter(i => i.category === this.activeCategory);
    }

    const searchInput = document.getElementById('menuCardSearch');
    if (searchInput && searchInput.value.trim()) {
      const q = searchInput.value.toLowerCase().trim();
      items = items.filter(i => i.name.toLowerCase().includes(q) || (i.description && i.description.toLowerCase().includes(q)));
    }

    const fallbackImg = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80";

    container.innerHTML = `
      <div style="max-width: 1200px; margin: 0 auto; padding-bottom: 3rem;">
        
        <!-- Menu Card Header Banner -->
        <div style="background: #FFFFFF; border: 1px solid var(--border-color); border-radius: var(--radius-xl); padding: 1.5rem 1.75rem; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; box-shadow: 0 2px 10px rgba(0,0,0,0.03);">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); color: white; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; font-size: 1.6rem; border: 2px solid #FCA5A5;">
              <i class="fas fa-book-open"></i>
            </div>
            <div>
              <h1 style="font-size: 1.5rem; font-weight: 800; color: #0F172A; margin: 0;">Digital Menu Card</h1>
              <p style="font-size: 0.85rem; color: #64748B; margin-top: 0.15rem;">Explore our full chef-curated 43 Andhra delicacies with instant AI Voice Ordering & Cart adding.</p>
            </div>
          </div>

          <div style="display: flex; gap: 0.75rem;">
            <button class="btn btn-secondary btn-sm" onclick="window.print()"><i class="fas fa-print"></i> Print Menu Card</button>
            <button class="btn btn-primary btn-sm" onclick="App.startVoiceOrdering()"><i class="fas fa-microphone"></i> Voice AI Order</button>
          </div>
        </div>

        <!-- Category Selector Bar -->
        <div style="background: #FFFFFF; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 0.85rem 1.25rem; margin-bottom: 1.5rem;">
          <div style="font-size: 0.78rem; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.65rem;">Filter by Food Category</div>
          <div class="filter-pills-group" style="display: flex; gap: 0.5rem; overflow-x: auto;">
            ${store.categories.map(c => `
              <button class="resto-filter-btn ${c.id === this.activeCategory ? 'active' : ''}" onclick="CustomerModule.selectCategory('${c.id}')">
                <i class="fas ${c.icon}" style="font-size: 0.8rem;"></i> ${c.name}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Search Bar Strip -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap;">
          <div style="font-size: 1.15rem; font-weight: 800; color: #0F172A;">
            Showing ${items.length} Dishes
          </div>

          <div class="search-box" style="width: 340px;">
            <i class="fas fa-search"></i>
            <input type="text" id="menuCardSearch" class="form-input" placeholder="Search biryani, gravies, beverages..." oninput="CustomerModule.renderFullMenuCardPage()">
          </div>
        </div>

        <!-- Full Menu Card Grid -->
        <div class="resto-menu-grid">
          ${items.map(item => {
            const inCartItem = this.cart.find(c => c.id === item.id);
            const qty = inCartItem ? inCartItem.qty : 0;
            const stockQty = typeof item.stockQty !== 'undefined' ? item.stockQty : 30;

            return `
              <div class="resto-dish-card">
                <div class="dish-img-box">
                  <img src="${item.image}" alt="${item.name}" class="dish-img" onerror="this.onerror=null; this.src='${fallbackImg}';">
                  ${item.badge ? `<span class="dish-badge-overlay">${item.badge}</span>` : ''}
                  ${item.discount ? `<span class="dish-discount-tag">${item.discount}% OFF</span>` : ''}
                </div>

                <div class="dish-card-body">
                  <div>
                    <div class="dish-veg-row">
                      <span class="veg-icon-box ${item.isVeg ? '' : 'non-veg'}">
                        <span class="veg-icon-dot-inner"></span>
                      </span>
                      <span style="font-size: 0.75rem; font-weight: 700; color: #F59E0B;">
                        <i class="fas fa-star"></i> ${item.rating} (${item.reviewsCount}+)
                      </span>
                    </div>

                    <h3 class="dish-title">${item.name}</h3>
                    <p class="dish-desc">${item.description}</p>
                  </div>

                  <div class="dish-footer-row">
                    <div class="dish-price-box">
                      <span class="dish-price-current">₹${item.price}</span>
                      ${item.originalPrice ? `<span class="dish-price-original">₹${item.originalPrice}</span>` : ''}
                    </div>

                    ${qty > 0 ? `
                      <div class="resto-qty-pill">
                        <button type="button" class="resto-qty-btn" onclick="CustomerModule.updateCartQty('${item.id}', -1)">-</button>
                        <span class="resto-qty-val">${qty}</span>
                        <button type="button" class="resto-qty-btn" onclick="CustomerModule.updateCartQty('${item.id}', 1)">+</button>
                      </div>
                    ` : `
                      <button type="button" class="resto-add-btn" onclick="CustomerModule.addToCart('${item.id}')" ${stockQty === 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                        ${stockQty > 0 ? 'ADD <i class="fas fa-plus" style="font-size: 0.72rem; margin-left: 0.25rem;"></i>' : 'OUT OF STOCK'}
                      </button>
                    `}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  setupFilters() {
    const searchIn = document.getElementById('customerMenuSearch');
    if (searchIn) {
      searchIn.oninput = () => this.renderMenuItems();
    }
  },

  addToCart(itemId) {
    const store = getStore();
    const item = store.menuItems.find(i => i.id === itemId);
    if (!item) return;

    const existing = this.cart.find(c => c.id === itemId);
    if (existing) {
      existing.qty += 1;
    } else {
      this.cart.push({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        qty: 1
      });
    }

    this.saveCart();
    App.showToast(`Added "${item.name}" to cart!`, 'success');
    this.renderMenuItems();
    if (typeof App !== 'undefined' && App.currentView === 'menu-catalog') {
      this.renderFullMenuCardPage();
    }
  },

  updateCartQty(itemId, delta) {
    const item = this.cart.find(c => c.id === itemId);
    if (!item) return;

    item.qty += delta;
    if (item.qty <= 0) {
      this.cart = this.cart.filter(c => c.id !== itemId);
    }

    this.saveCart();
    this.renderMenuItems();
    if (typeof App !== 'undefined' && App.currentView === 'menu-catalog') {
      this.renderFullMenuCardPage();
    }
    if (typeof App !== 'undefined' && App.currentView === 'cart-checkout') {
      this.renderCartPage();
    }
  },

  updateCartBar() {
    const bar = document.getElementById('floatingCartBar');
    const countText = document.getElementById('floatingCartCountText');
    const priceText = document.getElementById('floatingCartPriceText');
    const badge = document.getElementById('cartBadgeCount');

    const totalQty = this.cart.reduce((sum, i) => sum + i.qty, 0);
    const subtotal = this.cart.reduce((sum, i) => sum + (i.price * i.qty), 0);

    if (badge) {
      badge.textContent = totalQty;
      badge.style.display = totalQty > 0 ? 'inline-block' : 'none';
    }

    if (!bar) return;

    if (totalQty > 0) {
      bar.classList.add('active');
      bar.style.display = 'flex';
      if (countText) countText.textContent = `${totalQty} ITEM${totalQty > 1 ? 'S' : ''} ADDED`;
      if (priceText) priceText.textContent = `₹${subtotal}`;
    } else {
      bar.classList.remove('active');
      bar.style.display = 'none';
    }
  },

  applyCoupon(code) {
    this.appliedCoupon = code;
    App.showToast(`Coupon "${code}" applied! Discount will calculate at checkout.`, 'success');
    if (App.currentView === 'cart-checkout') {
      this.renderCartPage();
    }
  },

  // 5. Dedicated Cart & Checkout Page View
  renderCartPage() {
    const container = document.getElementById('cartPageContent');
    if (!container) return;

    if (this.cart.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 4rem 1rem; background: #FFFFFF; border-radius: var(--radius-xl); border: 1px solid var(--border-color);">
          <div style="font-size: 3.5rem; color: #CBD5E1; margin-bottom: 1rem;"><i class="fas fa-shopping-bag"></i></div>
          <h2 style="font-size: 1.5rem; font-weight: 800; color: #0F172A;">Your Cart is Empty</h2>
          <p style="font-size: 0.9rem; color: #64748B; margin-top: 0.3rem; margin-bottom: 1.5rem;">Explore our gourmet Andhra menu catalog and add your favorite dishes!</p>
          <button class="btn btn-primary btn-lg" onclick="App.switchView('customer-site')">Explore Menu Catalog</button>
        </div>
      `;
      return;
    }

    const store = getStore();
    const subtotal = this.cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    
    let discount = 0;
    if (this.appliedCoupon === 'WELCOME50') discount = Math.min(100, Math.round(subtotal * 0.5));
    if (this.appliedCoupon === 'RESTO20') discount = Math.round(subtotal * 0.2);
    if (this.appliedCoupon === 'RESTO100') discount = 100;

    const tax = Math.round((subtotal - discount) * (store.restaurant.taxRate / 100));
    
    // Distance delivery fee calculation (1 km = 25 rs)
    const distanceKm = 2; // Default 2km delivery range
    const deliveryFee = distanceKm * 25; // ₹50 delivery fee
    
    const grandTotal = Math.max(0, subtotal - discount + tax + deliveryFee);

    container.innerHTML = `
      <div class="cart-grid-layout">
        <div>
          <!-- Cart Items Card -->
          <div class="checkout-card">
            <div class="checkout-card-title">
              <i class="fas fa-list-check" style="color: #2563EB;"></i> Order Items (${this.cart.length})
            </div>
            ${this.cart.map(item => `
              <div class="cart-item-row">
                <div class="cart-item-left">
                  <img src="${item.image}" alt="${item.name}" class="cart-item-img">
                  <div class="cart-item-details">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price-calc">₹${item.price} × ${item.qty} = <strong style="color: #0F172A;">₹${item.price * item.qty}</strong></div>
                  </div>
                </div>
                <div class="resto-qty-pill">
                  <button type="button" class="resto-qty-btn" onclick="CustomerModule.updateCartQty('${item.id}', -1)">-</button>
                  <span class="resto-qty-val">${item.qty}</span>
                  <button type="button" class="resto-qty-btn" onclick="CustomerModule.updateCartQty('${item.id}', 1)">+</button>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Customer Address Details Card -->
          <div class="checkout-card">
            <div class="checkout-card-title">
              <i class="fas fa-location-dot" style="color: #2563EB;"></i> Delivery Details
            </div>
            <form id="checkoutDetailsForm">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                  <label class="form-label">Full Name *</label>
                  <input type="text" id="checkoutCustName" class="form-input" required value="Vikramaditya Rao">
                </div>
                <div class="form-group">
                  <label class="form-label">Phone Number *</label>
                  <input type="tel" id="checkoutCustPhone" class="form-input" required value="+91 98450 12345">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Delivery Address *</label>
                <input type="text" id="checkoutCustAddress" class="form-input" required value="Flat 402, Sunset Heights, Indiranagar, Bengaluru">
              </div>
            </form>
          </div>

          <!-- Payment Options Card -->
          <div class="checkout-card">
            <div class="checkout-card-title">
              <i class="fas fa-credit-card" style="color: #2563EB;"></i> Select Payment Method
            </div>
            <div class="payment-options-grid">
              <div class="payment-option-card active" onclick="CustomerModule.selectPaymentOption(this, 'upi')">
                <i class="fas fa-qrcode" style="color: #2563EB;"></i>
                <div class="payment-option-name">UPI / GPay</div>
              </div>
              <div class="payment-option-card" onclick="CustomerModule.selectPaymentOption(this, 'card')">
                <i class="fas fa-credit-card" style="color: #10B981;"></i>
                <div class="payment-option-name">Credit / Debit</div>
              </div>
              <div class="payment-option-card" onclick="CustomerModule.selectPaymentOption(this, 'cod')">
                <i class="fas fa-money-bill-wave" style="color: #F59E0B;"></i>
                <div class="payment-option-name">Cash on Delivery</div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <!-- Coupon Code Promo Card -->
          <div class="checkout-card">
            <div class="checkout-card-title">
              <i class="fas fa-percent" style="color: #2563EB;"></i> Apply Coupon Code
            </div>
            <div style="display: flex; gap: 0.5rem;">
              <input type="text" id="couponInput" class="form-input" placeholder="e.g. WELCOME50" value="${this.appliedCoupon || ''}">
              <button class="btn btn-primary" onclick="CustomerModule.applyCoupon(document.getElementById('couponInput').value.trim())">Apply</button>
            </div>
            ${this.appliedCoupon ? `<div style="font-size: 0.8rem; color: #10B981; font-weight: 700; margin-top: 0.5rem;">✓ Coupon ${this.appliedCoupon} Active</div>` : ''}
          </div>

          <!-- Bill Summary Card -->
          <div class="checkout-card">
            <div class="checkout-card-title">
              <i class="fas fa-receipt" style="color: #2563EB;"></i> Itemized Bill Summary
            </div>

            <div class="bill-row">
              <span>Items Subtotal</span>
              <span>₹${subtotal}</span>
            </div>

            ${discount > 0 ? `
              <div class="bill-row" style="color: #10B981; font-weight: 700;">
                <span>Coupon Discount (${this.appliedCoupon})</span>
                <span>-₹${discount}</span>
              </div>
            ` : ''}

            <div class="bill-row">
              <span>GST Tax (5%)</span>
              <span>₹${tax}</span>
            </div>

            <div class="bill-row" style="color: #2563EB; font-weight: 700;">
              <span>Delivery Fee (${distanceKm} km @ ₹25/km)</span>
              <span>₹${deliveryFee}</span>
            </div>

            <div class="bill-row total">
              <span>Grand Total</span>
              <span style="color: #10B981;">₹${grandTotal}</span>
            </div>

            <button class="btn btn-primary btn-lg" style="width: 100%; margin-top: 1.5rem; font-weight: 800; background: #10B981; border: none;" onclick="CustomerModule.placeOrder()">
              Place Order Now • ₹${grandTotal} <i class="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  selectPaymentOption(el, method) {
    document.querySelectorAll('.payment-option-card').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
  },

  placeOrder() {
    if (this.cart.length === 0) return;

    const custName = document.getElementById('checkoutCustName') ? document.getElementById('checkoutCustName').value : "Customer";
    const custPhone = document.getElementById('checkoutCustPhone') ? document.getElementById('checkoutCustPhone').value : "+91 98450 12345";
    const custAddress = document.getElementById('checkoutCustAddress') ? document.getElementById('checkoutCustAddress').value : "Indiranagar, Bengaluru";

    const store = getStore();
    const subtotal = this.cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    
    let discount = 0;
    if (this.appliedCoupon === 'WELCOME50') discount = Math.min(100, Math.round(subtotal * 0.5));
    if (this.appliedCoupon === 'RESTO20') discount = Math.round(subtotal * 0.2);
    if (this.appliedCoupon === 'RESTO100') discount = 100;

    const tax = Math.round((subtotal - discount) * (store.restaurant.taxRate / 100));
    
    const distanceKm = 2; // Default 2km delivery range
    const deliveryFee = distanceKm * 25; // ₹50 delivery fee
    
    const grandTotal = Math.max(0, subtotal - discount + tax + deliveryFee);

    const newOrder = {
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: custName,
      email: `${custName.toLowerCase().replace(/\s+/g, '')}@example.com`,
      phone: custPhone,
      address: custAddress,
      type: "delivery",
      distanceKm: distanceKm,
      deliveryFee: deliveryFee,
      items: [...this.cart],
      subtotal: subtotal,
      discount: discount,
      tax: tax,
      total: grandTotal,
      status: "incoming",
      createdAt: "Just now",
      notes: "Online Customer Order"
    };

    store.orders.unshift(newOrder);
    store.stats.todayOrders += 1;
    store.stats.todayRevenue += grandTotal;
    updateStore(store);

    // Reset Cart & Persist Clean State
    this.cart = [];
    this.appliedCoupon = null;
    this.saveCart();

    // Re-render Food Menu Cards & Reset Floating Cart Bar
    this.renderMenuItems();
    this.updateCartBar();

    App.showToast(`Order ${newOrder.id} placed successfully! 🎉`, 'success');
    App.triggerWhatsAppFlow(newOrder);
    App.switchView('customer-site');
  },

  // 6. Customer Feedback & Review Methods
  renderCustomerFeedback() {
    const store = getStore();
    const container = document.getElementById('feedbackGridContainer');
    if (!container) return;

    const reviews = store.reviews || [
      {
        id: "rev-1",
        name: "Ananya Sharma",
        rating: 5,
        date: "2 days ago",
        comment: "The Andhra Chicken Biryani is absolutely mind-blowing! Authentic spices, generous quantity, and ultra-fast hot delivery. 10/10 recommended!",
        dish: "Andhra Chicken Biryani",
        verified: true
      },
      {
        id: "rev-2",
        name: "Karthik Raja",
        rating: 5,
        date: "1 week ago",
        comment: "Best Andhra Meals in Indiranagar! The Avakaya pickle and Majjiga buttermilk taste exactly like home in Vijayawada.",
        dish: "Andhra Royal Thali Meal",
        verified: true
      },
      {
        id: "rev-3",
        name: "Priya Varma",
        rating: 5,
        date: "2 weeks ago",
        comment: "Outstanding customer service and hygienic packing. The WhatsApp order updates made tracking super smooth!",
        dish: "Chicken Fry Piece Biryani",
        verified: true
      }
    ];

    container.innerHTML = reviews.map(r => `
      <div style="background: #FFFFFF; border: 1px solid var(--border-color); border-radius: var(--radius-xl); padding: 1.35rem; box-shadow: 0 4px 14px rgba(15,23,42,0.03); display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <div style="width: 42px; height: 42px; background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1rem;">
                ${r.name.charAt(0)}
              </div>
              <div>
                <div style="font-weight: 800; font-size: 0.95rem; color: #0F172A;">${r.name}</div>
                <div style="font-size: 0.75rem; color: #64748B;">${r.dish || 'Verified Customer'} • ${r.date}</div>
              </div>
            </div>
            <span class="badge badge-success"><i class="fas fa-check-circle"></i> Verified</span>
          </div>

          <div style="color: #F59E0B; font-size: 0.85rem; margin-bottom: 0.6rem;">
            ${Array(r.rating).fill('<i class="fas fa-star"></i>').join('')}
          </div>

          <p style="font-size: 0.88rem; color: #334155; line-height: 1.5; font-style: italic;">"${r.comment}"</p>
        </div>
      </div>
    `).join('');
  },

  submitCustomerFeedback(e) {
    if (e && e.preventDefault) e.preventDefault();
    const nameIn = document.getElementById('feedbackCustName');
    const commentIn = document.getElementById('feedbackComment');
    const ratingIn = document.getElementById('feedbackRating');
    const dishIn = document.getElementById('feedbackDish');

    if (!nameIn || !commentIn) return;

    const name = nameIn.value.trim();
    const comment = commentIn.value.trim();
    const rating = ratingIn ? (parseInt(ratingIn.value) || 5) : 5;
    const dish = dishIn ? dishIn.value.trim() : 'Special Order';

    if (!name || !comment) {
      App.showToast('Please enter your name and feedback message.', 'warning');
      return;
    }

    const store = getStore();
    if (!store.reviews) store.reviews = [];

    const newRev = {
      id: `rev-${Date.now()}`,
      name: name,
      rating: rating,
      date: 'Just now',
      comment: comment,
      dish: dish || 'Special Order',
      verified: true
    };

    store.reviews.unshift(newRev);
    updateStore(store);

    App.closeModal('feedbackModal');
    App.showToast('Thank you! Your feedback has been published 🎉', 'success');
    this.renderCustomerFeedback();

    if (document.getElementById('feedbackForm')) {
      document.getElementById('feedbackForm').reset();
    }
  },

  openGalleryPreview(imgUrl, title) {
    const modalImg = document.getElementById('galleryModalImg');
    const modalTitle = document.getElementById('galleryModalTitle');
    if (modalImg) modalImg.src = imgUrl;
    if (modalTitle) modalTitle.textContent = title;
    App.openModal('galleryLightBoxModal');
  },

  openDirections() {
    window.open('https://maps.google.com/?q=Indiranagar+Double+Road+Bengaluru', '_blank');
  }
};

window.CustomerModule = CustomerModule;
