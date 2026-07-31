/* ==========================================================================
   RestaurantOS Kitchen Display System (KDS) Module
   ========================================================================== */

const KitchenModule = {
  audioMuted: false,

  init() {
    this.renderBoard();
    this.setupClickDelegation();
    this.startAutoRefresh();
  },

  renderKDSBoard() {
    this.renderBoard();
    this.setupClickDelegation();
  },

  setupClickDelegation() {
    const board = document.querySelector('.kds-board-grid');
    if (!board || board.dataset.listenerAttached) return;

    board.dataset.listenerAttached = 'true';
    board.addEventListener('click', (e) => {
      const btn = e.target.closest('.kds-action-trigger');
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        const orderId = btn.getAttribute('data-order-id');
        const nextStatus = btn.getAttribute('data-next-status');
        if (orderId && nextStatus) {
          this.moveStatus(orderId, nextStatus);
        }
      }
    });
  },

  renderBoard() {
    const store = getStore();
    const orders = store.orders || [];

    this.renderColumn('kdsColIncoming', orders.filter(o => o.status === 'incoming' || o.status === 'pending'), 'incoming');
    this.renderColumn('kdsColPreparing', orders.filter(o => o.status === 'preparing' || o.status === 'accepted' || o.status === 'cooking'), 'preparing');
    this.renderColumn('kdsColReady', orders.filter(o => o.status === 'ready' || o.status === 'cooked'), 'ready');
    this.renderColumn('kdsColCompleted', orders.filter(o => o.status === 'completed' || o.status === 'delivered'), 'completed');

    this.updateStats(orders);
    this.setupClickDelegation();
  },

  renderColumn(containerId, columnOrders, statusType) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!columnOrders || columnOrders.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 2.5rem 1rem; color: #64748B; font-size: 0.85rem; font-weight: 600;"><i class="fas fa-check-circle" style="display: block; font-size: 1.5rem; margin-bottom: 0.5rem; opacity: 0.5;"></i> No orders in ${statusType}</div>`;
      return;
    }

    container.innerHTML = columnOrders.map(order => `
      <div class="kds-ticket" id="ticket-${order.id}">
        <div class="ticket-top">
          <span class="ticket-order-id">${order.id}</span>
          <span class="ticket-type-badge ${order.type === 'dine-in' ? 'type-dinein' : (order.type === 'delivery' ? 'type-delivery' : 'type-takeaway')}">${(order.type || 'dine-in').toUpperCase()}</span>
          <span class="ticket-timer">${order.createdAt || 'Just Now'}</span>
        </div>
        <div style="font-size: 0.85rem; color: #94A3B8; margin-bottom: 0.5rem;">
          <i class="fas fa-user"></i> ${order.customerName || 'Guest'} ${order.tableNo ? `(${order.tableNo})` : ''}
        </div>
        <ul class="ticket-items">
          ${(order.items || []).map(item => `
            <li class="ticket-item">
              <span class="ticket-item-qty">${item.qty || 1}x</span>
              <span class="ticket-item-name">${item.name}</span>
            </li>
          `).join('')}
        </ul>
        ${order.notes ? `<div class="ticket-notes"><i class="fas fa-comment"></i> ${order.notes}</div>` : ''}
        <div class="ticket-actions" style="position: relative; z-index: 50;">
          ${statusType === 'incoming' ? `
            <button type="button" class="kds-btn kds-btn-accept kds-action-trigger" data-order-id="${order.id}" data-next-status="preparing" style="cursor: pointer; position: relative; z-index: 60;" onclick="KitchenModule.moveStatus('${order.id}', 'preparing')">
              <i class="fas fa-fire"></i> Accept & Cook
            </button>
          ` : ''}
          ${statusType === 'preparing' ? `
            <button type="button" class="kds-btn kds-btn-ready kds-action-trigger" data-order-id="${order.id}" data-next-status="ready" style="cursor: pointer; position: relative; z-index: 60;" onclick="KitchenModule.moveStatus('${order.id}', 'ready')">
              <i class="fas fa-bell"></i> Mark Ready
            </button>
          ` : ''}
          ${statusType === 'ready' ? `
            <button type="button" class="kds-btn kds-btn-accept kds-action-trigger" data-order-id="${order.id}" data-next-status="completed" style="cursor: pointer; position: relative; z-index: 60; background: #10B981;" onclick="KitchenModule.moveStatus('${order.id}', 'completed')">
              <i class="fas fa-check-double"></i> Complete Order
            </button>
          ` : ''}
          ${statusType === 'completed' ? `
            <span class="badge badge-success" style="width: 100%; justify-content: center; padding: 0.5rem;"><i class="fas fa-check"></i> Order Finished</span>
          ` : ''}
        </div>
      </div>
    `).join('');
  },

  updateStats(orders) {
    const incomingCount = orders.filter(o => o.status === 'incoming' || o.status === 'pending').length;
    const prepCount = orders.filter(o => o.status === 'preparing' || o.status === 'accepted' || o.status === 'cooking').length;
    const readyCount = orders.filter(o => o.status === 'ready' || o.status === 'cooked').length;

    const incBadge = document.getElementById('kdsStatIncoming');
    if (incBadge) incBadge.textContent = incomingCount;

    const prepBadge = document.getElementById('kdsStatPrep');
    if (prepBadge) prepBadge.textContent = prepCount;

    const readyBadge = document.getElementById('kdsStatReady');
    if (readyBadge) readyBadge.textContent = readyCount;
  },

  moveStatus(orderId, newStatus) {
    console.log(`[KitchenModule] Moving order ${orderId} -> ${newStatus}`);
    const store = getStore();
    const order = store.orders.find(o => o.id === orderId);
    
    if (!order) {
      console.warn(`Order ${orderId} not found in store.`);
      return;
    }

    order.status = newStatus;
    updateStore(store);

    // Play audio alert
    try { this.playAudioAlert(); } catch(e) {}

    // Re-render KDS board
    this.renderBoard();

    // Sync with Admin Dashboard if active
    if (typeof AdminModule !== 'undefined') {
      try {
        AdminModule.renderOrdersTable();
        AdminModule.renderKPIs();
      } catch(e) {
        console.log('Admin sync notice:', e);
      }
    }

    App.showToast(`Order ${orderId} moved to ${newStatus.toUpperCase()}`, 'success');
  },

  playAudioAlert() {
    if (this.audioMuted) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      
      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch(e) {
      console.log('Audio alert notice:', e);
    }
  },

  startAutoRefresh() {
    setInterval(() => {
      this.renderBoard();
    }, 15000); // Auto refresh every 15s
  }
};

// Global Exposure
window.KitchenModule = KitchenModule;
window.moveKitchenOrderStatus = (id, st) => KitchenModule.moveStatus(id, st);
