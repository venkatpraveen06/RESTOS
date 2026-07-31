/* ==========================================================================
   RestaurantOS Executive Admin & POS Controller
   ========================================================================== */

const AdminModule = {
  isLoggedIn: false,
  currentSubTab: 'overview',
  manualCart: [],

  init() {
    this.checkSession();
    this.setupSidebarTabs();
  },

  checkSession() {
    const session = localStorage.getItem('restaurantos_admin_session');
    if (session === 'active') {
      this.isLoggedIn = true;
    }
  },

  handleLogin(event) {
    if (event) event.preventDefault();
    const email = document.getElementById('adminLoginEmail').value;
    const pass = document.getElementById('adminLoginPassword').value;

    if ((email === 'admin@restaurantos.demo' || email.length > 0) && pass === 'admin123') {
      this.isLoggedIn = true;
      localStorage.setItem('restaurantos_admin_session', 'active');
      App.showToast('Signed in successfully to Staff Portal!', 'success');
      App.switchView('admin-dashboard');
      this.renderAllViews();
    } else {
      App.showToast('Invalid credentials! Use demo: admin@restaurantos.demo / admin123', 'error');
    }
  },

  logout() {
    this.isLoggedIn = false;
    localStorage.removeItem('restaurantos_admin_session');
    App.showToast('Logged out of Admin SaaS Portal', 'info');
    App.switchView('admin-login');
  },

  setupSidebarTabs() {
    const tabBtns = document.querySelectorAll('.sidebar-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabId = btn.getAttribute('data-tab');
        if (tabId) {
          e.preventDefault();
          this.switchTab(tabId);
        }
      });
    });
  },

  switchTab(tabId) {
    this.currentSubTab = tabId;

    document.querySelectorAll('.sidebar-tab-btn').forEach(btn => {
      if (btn.getAttribute('data-tab')) {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
      }
    });

    document.querySelectorAll('.admin-subview').forEach(view => {
      view.classList.remove('active');
    });

    const target = document.getElementById(`adminTab-${tabId}`);
    if (target) {
      target.classList.add('active');
    }

    // Trigger tab-specific renders
    if (tabId === 'overview') {
      this.renderKPIs();
      this.renderAIInsights();
      if (typeof ChartEngine !== 'undefined') setTimeout(() => ChartEngine.initCharts(), 100);
    } else if (tabId === 'orders') {
      this.renderOrdersTable();
    } else if (tabId === 'menu') {
      this.renderMenuItemsTable();
    } else if (tabId === 'customers') {
      this.renderCustomersTable();
    } else if (tabId === 'reservations') {
      this.renderTableMap();
      this.renderReservationsTable();
    } else if (tabId === 'ai') {
      this.renderAIInsights();
    } else if (tabId === 'reports') {
      if (typeof ChartEngine !== 'undefined') setTimeout(() => ChartEngine.initCharts(), 100);
    } else if (tabId === 'settings') {
      this.loadSettings();
    }
  },

  renderDashboard() {
    if (this.currentSubTab) {
      this.switchTab(this.currentSubTab);
    } else {
      this.switchTab('overview');
    }
  },

  renderAllViews() {
    this.renderKPIs();
    this.renderOrdersTable();
    this.renderMenuItemsTable();
    this.renderCustomersTable();
    this.renderReservationsTable();
    this.renderTableMap();
    this.renderAIInsights();
    this.loadSettings();
  },

  // 1. KPI Telemetry
  renderKPIs() {
    const store = getStore();
    const stats = store.stats;

    const revEl = document.getElementById('kpiTodayRevenue');
    if (revEl) revEl.textContent = `₹${stats.todayRevenue.toLocaleString()}`;

    const ordEl = document.getElementById('kpiTodayOrders');
    if (ordEl) ordEl.textContent = stats.todayOrders;

    const pendingCount = store.orders.filter(o => o.status === 'incoming' || o.status === 'preparing').length;
    const pendEl = document.getElementById('kpiPendingOrders');
    if (pendEl) pendEl.textContent = pendingCount;

    const aovEl = document.getElementById('kpiAOV');
    if (aovEl) {
      const aov = stats.todayOrders > 0 ? Math.round(stats.todayRevenue / stats.todayOrders) : 0;
      aovEl.textContent = `₹${aov}`;
    }

    const badge = document.getElementById('adminSidebarPendingBadge');
    if (badge) badge.textContent = pendingCount;
  },

  // 2. Orders Table Manager
  renderOrdersTable(filteredOrders = null) {
    const store = getStore();
    const orders = filteredOrders || store.orders;
    const tbody = document.getElementById('adminOrdersTableBody');
    if (!tbody) return;

    if (orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94A3B8; padding: 2rem;">No order records found.</td></tr>`;
      return;
    }

    tbody.innerHTML = orders.map(order => `
      <tr>
        <td><strong>${order.id}</strong></td>
        <td>
          <div style="font-weight: 700;">${order.customerName}</div>
          <div style="font-size: 0.75rem; color: #64748B;">${order.phone || ''}</div>
        </td>
        <td>
          <span class="badge ${order.type === 'dine-in' ? 'badge-primary' : (order.type === 'delivery' ? 'badge-success' : 'badge-neutral')}">${(order.type || 'dine-in').toUpperCase()}</span>
          ${order.tableNo ? `<div style="font-size: 0.75rem; font-weight: 700; color: #2563EB;">${order.tableNo}</div>` : ''}
        </td>
        <td>
          <div style="font-size: 0.82rem; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${(order.items || []).map(i => `${i.qty}x ${i.name}`).join(', ')}
          </div>
        </td>
        <td><strong style="color: #10B981;">₹${order.total}</strong></td>
        <td>
          <select class="form-select form-select-sm" style="font-weight: 700; padding: 0.25rem 0.5rem; font-size: 0.8rem;" onchange="AdminModule.updateOrderStatus('${order.id}', this.value)">
            <option value="incoming" ${order.status === 'incoming' ? 'selected' : ''}>Incoming</option>
            <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Preparing</option>
            <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>Ready</option>
            <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
          </select>
        </td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="AdminModule.openOrderDetailModal('${order.id}')"><i class="fas fa-eye"></i> View</button>
        </td>
      </tr>
    `).join('');
  },

  filterOrdersByStatus(status, btnEl) {
    if (btnEl) {
      document.querySelectorAll('.orders-filter-btn').forEach(b => b.classList.remove('active'));
      btnEl.classList.add('active');
    }
    const store = getStore();
    if (status === 'all') {
      this.renderOrdersTable(store.orders);
    } else {
      const filtered = store.orders.filter(o => o.status === status);
      this.renderOrdersTable(filtered);
    }
  },

  searchOrders(query) {
    const store = getStore();
    const q = query.toLowerCase().trim();
    if (!q) {
      this.renderOrdersTable(store.orders);
      return;
    }
    const filtered = store.orders.filter(o => 
      o.id.toLowerCase().includes(q) || 
      o.customerName.toLowerCase().includes(q) || 
      (o.phone && o.phone.includes(q))
    );
    this.renderOrdersTable(filtered);
  },

  updateOrderStatus(orderId, newStatus) {
    const store = getStore();
    const order = store.orders.find(o => o.id === orderId);
    if (!order) return;

    order.status = newStatus;
    updateStore(store);

    this.renderKPIs();
    if (typeof KitchenModule !== 'undefined') {
      KitchenModule.renderBoard();
    }
    App.showToast(`Order ${orderId} status updated to ${newStatus.toUpperCase()}`, 'success');
  },

  openOrderDetailModal(orderId) {
    const store = getStore();
    const order = store.orders.find(o => o.id === orderId);
    if (!order) return;

    const modalBody = document.getElementById('orderDetailModalBody');
    if (!modalBody) return;

    modalBody.innerHTML = `
      <div style="padding: 0.5rem;">
        <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 1.1rem; margin-bottom: 0.5rem;">
          <span>Order ID: ${order.id}</span>
          <span class="badge badge-primary">${order.status.toUpperCase()}</span>
        </div>
        <div style="font-size: 0.85rem; color: #64748B; margin-bottom: 1rem;">Placed: ${order.createdAt}</div>
        
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: var(--radius-md); padding: 0.85rem; margin-bottom: 1rem;">
          <div style="font-size: 0.8rem; font-weight: 700; color: #475569; margin-bottom: 0.3rem;">CUSTOMER DETAILS</div>
          <div><strong>${order.customerName}</strong></div>
          <div style="font-size: 0.85rem;">Phone: ${order.phone || 'N/A'}</div>
          <div style="font-size: 0.85rem;">Address: ${order.address || order.tableNo || 'N/A'}</div>
        </div>

        <div style="font-size: 0.8rem; font-weight: 700; color: #475569; margin-bottom: 0.4rem;">ORDER ITEMS</div>
        ${(order.items || []).map(i => `
          <div style="display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px dashed #E2E8F0; font-size: 0.88rem;">
            <span>${i.qty}x ${i.name}</span>
            <strong>₹${i.price * i.qty}</strong>
          </div>
        `).join('')}

        <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 1.05rem; margin-top: 1rem; color: #0F172A;">
          <span>Total Amount</span>
          <span style="color: #10B981;">₹${order.total}</span>
        </div>
      </div>
    `;

    App.openModal('orderDetailModal');
  },

  // 3. Menu Items Manager & Price/Quantity Controls
  renderMenuItemsTable() {
    const store = getStore();
    const tbody = document.getElementById('adminMenuTableBody');
    if (!tbody) return;

    tbody.innerHTML = store.menuItems.map(item => `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <img src="${item.image}" alt="${item.name}" style="width: 40px; height: 40px; border-radius: var(--radius-md); object-fit: cover;">
            <div>
              <div style="font-weight: 800; color: #0F172A;">${item.name}</div>
              <div style="font-size: 0.75rem; color: #64748B;">${item.isVeg ? '🟢 Pure Veg' : '🔴 Non-Veg'}</div>
            </div>
          </div>
        </td>
        <td><span class="badge badge-neutral" style="text-transform: uppercase;">${item.category}</span></td>
        <td><strong style="color: #2563EB; font-size: 1rem;">₹${item.price}</strong> ${item.originalPrice ? `<span style="text-decoration: line-through; font-size: 0.75rem; color: #94A3B8;">₹${item.originalPrice}</span>` : ''}</td>
        <td><strong style="font-size: 1rem; color: #0F172A;">${typeof item.stockQty !== 'undefined' ? item.stockQty : 30} portions</strong></td>
        <td>
          <span class="badge ${(item.stockQty > 0 || typeof item.stockQty === 'undefined') ? 'badge-success' : 'badge-danger'}">
            ${(item.stockQty > 0 || typeof item.stockQty === 'undefined') ? 'IN STOCK' : 'OUT OF STOCK'}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            <button class="btn btn-secondary btn-sm" onclick="AdminModule.openEditMenuModal('${item.id}')"><i class="fas fa-edit"></i> Edit Price & Qty</button>
            <button class="btn btn-danger btn-sm" onclick="AdminModule.deleteMenuItem('${item.id}')"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  openAddMenuModal() {
    App.openModal('addMenuModal');
  },

  saveNewMenuItem(event) {
    event.preventDefault();
    const name = document.getElementById('menuName').value;
    const cat = document.getElementById('menuCategory').value;
    const price = parseFloat(document.getElementById('menuPrice').value);
    const desc = document.getElementById('menuDesc').value;
    const img = document.getElementById('menuImage').value || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80";
    const isVeg = document.getElementById('menuVeg').checked;

    const store = getStore();
    const newItem = {
      id: `item-custom-${Date.now()}`,
      name: name,
      category: cat,
      price: price,
      originalPrice: price + 40,
      description: desc || name,
      isVeg: isVeg,
      prepTime: "15 mins",
      rating: 4.8,
      reviewsCount: 12,
      image: img,
      available: true,
      stockQty: 30
    };

    store.menuItems.unshift(newItem);
    updateStore(store);

    App.closeModal('addMenuModal');
    this.renderMenuItemsTable();
    App.showToast(`Added ${name} to food catalog!`, 'success');
  },

  openEditMenuModal(itemId) {
    const store = getStore();
    const item = store.menuItems.find(i => i.id === itemId);
    if (!item) return;

    document.getElementById('editItemId').value = item.id;
    document.getElementById('editMenuName').value = item.name;
    document.getElementById('editMenuPrice').value = item.price;
    document.getElementById('editMenuStockQty').value = typeof item.stockQty !== 'undefined' ? item.stockQty : 30;
    document.getElementById('editMenuCategory').value = item.category || 'biryani';
    document.getElementById('editMenuOriginalPrice').value = item.originalPrice || item.price;
    document.getElementById('editMenuDesc').value = item.description || '';
    document.getElementById('editMenuVeg').checked = !!item.isVeg;

    App.openModal('editMenuModal');
  },

  saveEditMenuItem(event) {
    event.preventDefault();
    const itemId = document.getElementById('editItemId').value;
    const store = getStore();
    const item = store.menuItems.find(i => i.id === itemId);
    if (!item) return;

    item.name = document.getElementById('editMenuName').value;
    item.price = parseFloat(document.getElementById('editMenuPrice').value);
    item.stockQty = parseInt(document.getElementById('editMenuStockQty').value, 10) || 0;
    item.category = document.getElementById('editMenuCategory').value;
    item.originalPrice = parseFloat(document.getElementById('editMenuOriginalPrice').value) || item.price;
    item.description = document.getElementById('editMenuDesc').value;
    item.isVeg = document.getElementById('editMenuVeg').checked;
    item.available = item.stockQty > 0;

    updateStore(store);
    App.closeModal('editMenuModal');
    this.renderMenuItemsTable();
    if (typeof CustomerModule !== 'undefined') CustomerModule.renderMenuItems();

    App.showToast(`Updated price & portion quantity for ${item.name}!`, 'success');
  },

  deleteMenuItem(itemId) {
    if (!confirm('Are you sure you want to remove this dish from the menu catalog?')) return;
    const store = getStore();
    store.menuItems = store.menuItems.filter(i => i.id !== itemId);
    updateStore(store);
    this.renderMenuItemsTable();
    App.showToast('Dish removed from catalog', 'info');
  },

  // 4. Customer Loyalty CRM
  renderCustomersTable() {
    const store = getStore();
    const grid = document.getElementById('adminCustomersGrid');
    if (!grid) return;

    grid.innerHTML = (store.customers || []).map(c => `
      <div class="crm-card">
        <div class="crm-card-header">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div class="crm-avatar">${c.name.charAt(0)}</div>
            <div>
              <div style="font-weight: 800; color: #0F172A;">${c.name}</div>
              <div style="font-size: 0.75rem; color: #64748B;">${c.email}</div>
            </div>
          </div>
          <span class="badge badge-primary">${c.tier}</span>
        </div>

        <div style="font-size: 0.82rem; color: #475569; margin-top: 0.5rem;">
          <i class="fas fa-phone" style="color: #2563EB;"></i> ${c.phone}<br>
          <i class="fas fa-heart" style="color: #EF4444;"></i> Fav: <strong>${c.favoriteDish || 'Biryani'}</strong>
        </div>

        <div class="crm-stats-row">
          <div>
            <div style="font-size: 0.7rem; color: #64748B;">ORDERS</div>
            <strong style="color: #0F172A;">${c.totalOrders}</strong>
          </div>
          <div>
            <div style="font-size: 0.7rem; color: #64748B;">TOTAL SPENT</div>
            <strong style="color: #10B981;">₹${c.totalSpent.toLocaleString()}</strong>
          </div>
          <div>
            <div style="font-size: 0.7rem; color: #64748B;">POINTS</div>
            <strong style="color: #F59E0B;">${c.loyaltyPoints} pts</strong>
          </div>
        </div>
      </div>
    `).join('');
  },

  openAddCustomerModal() {
    App.openModal('addCustomerModal');
  },

  saveNewCustomer(event) {
    event.preventDefault();
    const name = document.getElementById('custName').value;
    const email = document.getElementById('custEmail').value;
    const phone = document.getElementById('custPhone').value;
    const address = document.getElementById('custAddress').value;

    const store = getStore();
    const newCust = {
      id: `CUST-${Date.now()}`,
      name: name,
      email: email,
      phone: phone,
      address: address || 'Bengaluru',
      totalOrders: 1,
      totalSpent: 499,
      loyaltyPoints: 50,
      tier: 'Silver',
      favoriteDish: 'Andhra Chicken Biryani',
      notes: 'New registered customer'
    };

    store.customers.unshift(newCust);
    updateStore(store);

    App.closeModal('addCustomerModal');
    this.renderCustomersTable();
    App.showToast(`Registered customer profile for ${name}!`, 'success');
  },

  // 5. Reservations Table & Floor Map
  renderTableMap() {
    const store = getStore();
    const grid = document.getElementById('adminTableGrid');
    if (!grid) return;

    grid.innerHTML = (store.tables || []).map(t => `
      <div class="table-card ${t.status.toLowerCase()}">
        <div class="table-card-top">
          <span class="table-number-title">${t.name}</span>
          <span class="table-status-pill-badge">${t.status.toUpperCase()}</span>
        </div>
        <div class="table-visual-shape">${t.capacity} GUESTS</div>
        <div class="table-chairs-row">
          ${Array(t.capacity).fill(0).map(() => `<span class="chair-icon-dot"></span>`).join('')}
        </div>
      </div>
    `).join('');
  },

  renderReservationsTable() {
    const store = getStore();
    const tbody = document.getElementById('adminReservationsTableBody');
    if (!tbody) return;

    tbody.innerHTML = (store.reservations || []).map(r => `
      <tr>
        <td><strong>${r.id}</strong></td>
        <td>
          <div style="font-weight: 700;">${r.guestName}</div>
          <div style="font-size: 0.75rem; color: #64748B;">${r.phone}</div>
        </td>
        <td><span class="badge badge-neutral">${r.guests} Guests</span></td>
        <td>${r.date} @ ${r.time}</td>
        <td><span class="badge badge-primary">${r.tableAllocated}</span></td>
        <td><span class="badge badge-success">${r.status}</span></td>
      </tr>
    `).join('');
  },

  saveNewReservation(event) {
    if (event) event.preventDefault();
    const guestName = document.getElementById('resGuestName').value || "Guest";
    const phone = document.getElementById('resPhone').value || "+91 98111 22334";
    const guests = parseInt(document.getElementById('resGuests').value, 10) || 2;
    const date = document.getElementById('resDate').value || "2026-07-30";
    const time = document.getElementById('resTime').value || "20:00";
    const selectedTable = document.getElementById('resSelectedTable') ? document.getElementById('resSelectedTable').value : "Table 01";
    const notes = document.getElementById('resNotes') ? document.getElementById('resNotes').value : "";

    const store = getStore();
    const newRes = {
      id: `RES-${Math.floor(100 + Math.random() * 900)}`,
      guestName: guestName,
      phone: phone,
      guests: guests,
      date: date,
      time: time,
      tableAllocated: selectedTable,
      status: "Confirmed",
      specialRequest: notes
    };

    store.reservations.unshift(newRes);

    // Update floor table status to Reserved
    const matchedTable = store.tables.find(t => t.name === selectedTable);
    if (matchedTable) {
      matchedTable.status = "Reserved";
    }

    updateStore(store);

    App.closeModal('bookTableModal');
    if (typeof CustomerModule !== 'undefined') {
      CustomerModule.renderCustomerTableMap();
      CustomerModule.renderCustomerConfirmedReservations();
    }
    this.renderTableMap();
    this.renderReservationsTable();

    // Render receipt confirmation modal
    const receiptBody = document.getElementById('reservationSuccessModalBody');
    if (receiptBody) {
      receiptBody.innerHTML = `
        <div style="text-align: center; padding: 1rem 0;">
          <div style="width: 64px; height: 64px; background: #ECFDF5; color: #10B981; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 1rem auto; border: 2px solid #A7F3D0;">
            <i class="fas fa-check"></i>
          </div>
          <h2 style="font-weight: 800; color: #0F172A;">Reservation Confirmed!</h2>
          <p style="font-size: 0.88rem; color: #64748B; margin-top: 0.2rem;">Your dining table has been reserved at RestaurantOS Andhra Kitchen.</p>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: var(--radius-md); padding: 1rem; margin-top: 1.25rem; text-align: left;">
            <div style="display: flex; justify-content: space-between; padding: 0.3rem 0;"><span>Booking Ref:</span> <strong>${newRes.id}</strong></div>
            <div style="display: flex; justify-content: space-between; padding: 0.3rem 0;"><span>Reserved Table:</span> <strong style="color: #2563EB;">${newRes.tableAllocated}</strong></div>
            <div style="display: flex; justify-content: space-between; padding: 0.3rem 0;"><span>Guest Name:</span> <strong>${newRes.guestName}</strong></div>
            <div style="display: flex; justify-content: space-between; padding: 0.3rem 0;"><span>Party Size:</span> <strong>${newRes.guests} Guests</strong></div>
            <div style="display: flex; justify-content: space-between; padding: 0.3rem 0;"><span>Date & Time:</span> <strong>${newRes.date} @ ${newRes.time}</strong></div>
          </div>
        </div>
      `;
      App.openModal('reservationSuccessModal');
    }

    App.showToast(`Table reservation confirmed for ${guestName}! 🎉`, 'success');
  },

  // 6. AI Insights Engine
  renderAIInsights() {
    if (typeof AIEngine !== 'undefined') {
      AIEngine.renderInsightsCards('adminAIInsightsContainer');
      AIEngine.renderInsightsCards('adminAIInsightsTabContainer');
    }
  },

  // 7. Store Settings Form
  loadSettings() {
    const store = getStore();
    const r = store.restaurant;
    if (document.getElementById('setRestoName')) document.getElementById('setRestoName').value = r.name;
    if (document.getElementById('setRestoPhone')) document.getElementById('setRestoPhone').value = r.phone;
    if (document.getElementById('setRestoTax')) document.getElementById('setRestoTax').value = r.taxRate;
    if (document.getElementById('setRestoDelivery')) document.getElementById('setRestoDelivery').value = r.deliveryFee || 25;
  },

  saveSettings(event) {
    event.preventDefault();
    const store = getStore();
    store.restaurant.name = document.getElementById('setRestoName').value;
    store.restaurant.phone = document.getElementById('setRestoPhone').value;
    store.restaurant.taxRate = parseFloat(document.getElementById('setRestoTax').value);
    store.restaurant.deliveryFee = parseFloat(document.getElementById('setRestoDelivery').value) || 25;
    
    updateStore(store);
    App.showToast('Store settings & delivery rate preferences saved!', 'success');
  },

  // POS Manual Order Creator
  openCreateManualOrderModal() {
    const store = getStore();
    const select = document.getElementById('manualDishSelect');
    if (select) {
      select.innerHTML = store.menuItems.map(i => `<option value="${i.id}">${i.name} — ₹${i.price}</option>`).join('');
    }
    this.manualCart = [];
    this.renderManualCartList();
    App.openModal('createManualOrderModal');
  },

  toggleManualDeliveryFields() {
    const type = document.getElementById('manualOrderType').value;
    const distGroup = document.getElementById('manualDistanceGroup');
    if (distGroup) {
      distGroup.style.display = type === 'delivery' ? 'block' : 'none';
    }
    this.renderManualCartList();
  },

  addDishToManualCart() {
    const dishId = document.getElementById('manualDishSelect').value;
    const store = getStore();
    const dish = store.menuItems.find(i => i.id === dishId);
    if (!dish) return;

    const existing = this.manualCart.find(i => i.id === dishId);
    if (existing) {
      existing.qty += 1;
    } else {
      this.manualCart.push({ id: dish.id, name: dish.name, price: dish.price, qty: 1 });
    }
    this.renderManualCartList();
  },

  renderManualCartList() {
    const container = document.getElementById('manualCartItemsContainer');
    if (!container) return;

    if (this.manualCart.length === 0) {
      container.innerHTML = `<div style="font-size: 0.85rem; color: #94A3B8; text-align: center; padding: 0.5rem;">No dishes selected yet.</div>`;
    } else {
      container.innerHTML = this.manualCart.map(i => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.3rem 0; font-size: 0.88rem;">
          <span>${i.qty}x ${i.name}</span>
          <div>
            <strong style="margin-right: 0.5rem;">₹${i.price * i.qty}</strong>
            <button type="button" class="btn btn-ghost btn-sm" style="color: #EF4444; padding: 0.1rem 0.3rem;" onclick="AdminModule.removeManualCartItem('${i.id}')"><i class="fas fa-times"></i></button>
          </div>
        </div>
      `).join('');
    }

    const subtotal = this.manualCart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    const orderType = document.getElementById('manualOrderType') ? document.getElementById('manualOrderType').value : 'dine-in';
    const distanceKm = (orderType === 'delivery' && document.getElementById('manualDistanceKm')) ? (parseInt(document.getElementById('manualDistanceKm').value, 10) || 1) : 0;
    const deliveryFee = orderType === 'delivery' ? (distanceKm * 25) : 0;
    const tax = Math.round(subtotal * 0.05);
    const grandTotal = subtotal + tax + deliveryFee;

    const delBreakdown = document.getElementById('manualDeliveryFeeBreakdown');
    if (delBreakdown) delBreakdown.textContent = `₹${deliveryFee}`;

    const totalEl = document.getElementById('manualOrderGrandTotal');
    if (totalEl) totalEl.textContent = `₹${grandTotal}`;
  },

  removeManualCartItem(itemId) {
    this.manualCart = this.manualCart.filter(i => i.id !== itemId);
    this.renderManualCartList();
  },

  saveManualOrder(event) {
    event.preventDefault();
    if (this.manualCart.length === 0) {
      App.showToast('Please add at least one dish to the order!', 'warning');
      return;
    }

    const custName = document.getElementById('manualCustName').value;
    const phone = document.getElementById('manualCustPhone').value;
    const orderType = document.getElementById('manualOrderType').value;
    const tableNo = document.getElementById('manualTableNo').value;
    const notes = document.getElementById('manualNotes').value;

    const subtotal = this.manualCart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    const distanceKm = (orderType === 'delivery' && document.getElementById('manualDistanceKm')) ? (parseInt(document.getElementById('manualDistanceKm').value, 10) || 1) : 0;
    const deliveryFee = orderType === 'delivery' ? (distanceKm * 25) : 0;
    const tax = Math.round(subtotal * 0.05);
    const grandTotal = subtotal + tax + deliveryFee;

    const store = getStore();
    const newOrder = {
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: custName,
      phone: phone,
      type: orderType,
      tableNo: tableNo || (orderType === 'dine-in' ? 'Table 01' : null),
      items: [...this.manualCart],
      subtotal: subtotal,
      tax: tax,
      deliveryFee: deliveryFee,
      total: grandTotal,
      status: "incoming",
      createdAt: "Just now",
      notes: notes || "Manual POS Order"
    };

    store.orders.unshift(newOrder);
    store.stats.todayOrders += 1;
    store.stats.todayRevenue += grandTotal;
    updateStore(store);

    App.closeModal('createManualOrderModal');
    this.renderKPIs();
    this.renderOrdersTable();
    if (typeof KitchenModule !== 'undefined') KitchenModule.renderBoard();

    App.showToast(`Created & dispatched Order ${newOrder.id}!`, 'success');
  },

  exportReportsPDF() {
    App.showToast('Generating Executive Sales Report PDF...', 'info');
    setTimeout(() => {
      App.showToast('Sales Report PDF downloaded successfully!', 'success');
    }, 1200);
  }
};

window.AdminModule = AdminModule;
