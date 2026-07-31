/* ==========================================================================
   RestaurantOS Master Application Controller & Navigation Routing
   ========================================================================== */

const App = {
  currentView: 'customer-site',
  recognitionInstance: null,
  isVoiceActive: false,

  init() {
    this.handleInitialSplashScreen();
    this.setupViewSwitcher();
    this.setupModalHandlers();
    
    // Boot Sub-modules safely
    if (typeof CustomerModule !== 'undefined') CustomerModule.init();
    if (typeof KitchenModule !== 'undefined') KitchenModule.init();
    if (typeof AdminModule !== 'undefined') AdminModule.init();

    console.log('RestaurantOS Master App initialized successfully.');
  },

  handleInitialSplashScreen() {
    const splash = document.getElementById('initialSplashScreen');
    if (!splash) return;

    // Check if user has already seen splash screen in this session
    const splashShown = sessionStorage.getItem('restaurantos_splash_shown');
    if (splashShown === 'true') {
      splash.style.display = 'none';
      return;
    }

    // Otherwise show splash loader for 1.6 seconds then fade out smoothly
    setTimeout(() => {
      splash.classList.add('fade-out');
      sessionStorage.setItem('restaurantos_splash_shown', 'true');
      setTimeout(() => {
        splash.style.display = 'none';
      }, 600);
    }, 1600);
  },

  setupViewSwitcher() {
    const navButtons = document.querySelectorAll('.nav-view-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const viewId = btn.getAttribute('data-view');
        this.switchView(viewId);
      });
    });
  },

  switchView(viewId) {
    // Auth Guard for Admin SaaS Dashboard
    if (viewId === 'admin-dashboard' && typeof AdminModule !== 'undefined') {
      AdminModule.checkSession();
      if (!AdminModule.isLoggedIn) {
        return this.switchView('admin-login');
      }
    }

    this.currentView = viewId;

    // Update nav active states
    document.querySelectorAll('.nav-view-btn').forEach(btn => {
      const bView = btn.getAttribute('data-view');
      btn.classList.toggle('active', bView === viewId || (viewId === 'admin-login' && bView === 'admin-dashboard'));
    });

    // Toggle view containers
    document.querySelectorAll('.view-container').forEach(view => {
      view.style.display = view.id === `view-${viewId}` ? 'block' : 'none';
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Refresh view specific components
    if (viewId === 'customer-site' && typeof CustomerModule !== 'undefined') {
      CustomerModule.renderMenuItems();
    }
    if (viewId === 'menu-catalog' && typeof CustomerModule !== 'undefined') {
      CustomerModule.renderFullMenuCardPage();
    }
    if (viewId === 'cart-checkout' && typeof CustomerModule !== 'undefined') {
      CustomerModule.renderCartPage();
    }
    if (viewId === 'admin-dashboard' && typeof AdminModule !== 'undefined') {
      AdminModule.renderDashboard();
    }
    if (viewId === 'kitchen-kds' && typeof KitchenModule !== 'undefined') {
      KitchenModule.renderKDSBoard();
    }
  },

  setupModalHandlers() {
    // Backdrop click close listener
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    });
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'danger') iconClass = 'fa-exclamation-circle';
    if (type === 'warning') iconClass = 'fa-triangle-exclamation';

    toast.innerHTML = `<i class="fas ${iconClass}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  },

  // Voice AI Ordering Assistant
  startVoiceOrdering() {
    this.openModal('voiceOrderModal');
    this.isVoiceActive = true;

    const statusTitle = document.getElementById('voiceStatusTitle');
    const statusSub = document.getElementById('voiceStatusSubtitle');
    const transcriptBox = document.getElementById('voiceTranscriptText');
    const pulserEl = document.getElementById('voiceMicPulser');

    if (pulserEl) pulserEl.classList.add('listening');

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRec) {
      if (statusTitle) statusTitle.textContent = "Web Speech API Not Supported";
      if (statusSub) statusSub.textContent = "Your browser does not support voice input. Type items directly into cart!";
      if (pulserEl) pulserEl.classList.remove('listening');
      return;
    }

    try {
      this.recognitionInstance = new SpeechRec();
      this.recognitionInstance.continuous = false;
      this.recognitionInstance.interimResults = true;
      this.recognitionInstance.lang = 'en-US';

      this.recognitionInstance.onstart = () => {
        if (statusTitle) statusTitle.textContent = "Listening to your voice...";
        if (statusSub) statusSub.textContent = 'Say a dish name (e.g. "Add 2 Mutton Dum Biryani andMajiga")';
      };

      this.recognitionInstance.onresult = (event) => {
        let text = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          text += event.results[i][0].transcript;
        }

        if (transcriptBox) {
          transcriptBox.innerHTML = `<strong>"${text}"</strong>`;
        }

        if (event.results[0].isFinal) {
          this.processVoiceCommand(text);
        }
      };

      this.recognitionInstance.onerror = (e) => {
        console.warn('Speech Recognition error:', e.error);
        if (statusTitle) statusTitle.textContent = "Voice Assistant Paused";
        if (statusSub) statusSub.textContent = "Tap the microphone below to try speaking again.";
        if (pulserEl) pulserEl.classList.remove('listening');
      };

      this.recognitionInstance.onend = () => {
        if (this.isVoiceActive && pulserEl) {
          pulserEl.classList.remove('listening');
        }
      };

      this.recognitionInstance.start();
    } catch(err) {
      console.error('Speech initialization error:', err);
    }
  },

  restartVoiceListening() {
    if (this.recognitionInstance) {
      try { this.recognitionInstance.stop(); } catch(e) {}
    }
    this.startVoiceOrdering();
  },

  processVoiceCommand(transcriptText) {
    const text = transcriptText.toLowerCase();
    const store = getStore();
    const banner = document.getElementById('voiceResponseBanner');

    let matchedItems = [];

    store.menuItems.forEach(item => {
      const name = item.name.toLowerCase();
      if (text.includes(name) || name.split(' ').some(word => word.length > 3 && text.includes(word))) {
        matchedItems.push(item);
      }
    });

    if (matchedItems.length > 0 && typeof CustomerModule !== 'undefined') {
      matchedItems.forEach(item => {
        CustomerModule.addToCart(item.id);
      });

      if (banner) {
        banner.style.display = 'block';
        banner.innerHTML = `<i class="fas fa-check-circle" style="color: #10B981;"></i> Added <strong>${matchedItems.map(i => i.name).join(', ')}</strong> to your cart! 🎉`;
      }
      this.showToast(`Voice AI matched & added ${matchedItems.length} dishes to cart!`, 'success');
    } else {
      if (banner) {
        banner.style.display = 'block';
        banner.innerHTML = `<i class="fas fa-info-circle" style="color: #2563EB;"></i> Could not find exact match for "${transcriptText}". Try "Andhra Chicken Biryani" or "Mutton Biryani"!`;
      }
    }
  },

  finishVoiceOrdering() {
    this.stopVoiceOrdering();
    this.switchView('cart-checkout');
    this.showToast('Voice order finished! Review your cart & checkout.', 'success');
  },

  stopVoiceOrdering() {
    this.isVoiceActive = false;
    if (this.recognitionInstance) {
      try { this.recognitionInstance.stop(); } catch(e) {}
    }
    const pulserEl = document.getElementById('voiceMicPulser');
    if (pulserEl) pulserEl.classList.remove('listening');
    this.closeModal('voiceOrderModal');
  },

  // Authentic WhatsApp Business Integration Flow Simulator
  triggerWhatsAppFlow(order) {
    const modalBody = document.getElementById('whatsAppModalBody');
    if (!modalBody) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    modalBody.innerHTML = `
      <div class="wa-modal-card">
        <!-- WhatsApp Header -->
        <div class="wa-header">
          <div class="wa-header-left">
            <i class="fas fa-arrow-left" style="cursor: pointer;" onclick="App.closeModal('whatsAppSimulatorModal')"></i>
            <div class="wa-avatar-box">
              <i class="fas fa-crown"></i>
              <div class="wa-verified-badge"><i class="fas fa-check"></i></div>
            </div>
            <div class="wa-header-info">
              <h4>
                RestaurantOS Andhra Kitchen
                <i class="fas fa-check-circle" style="color: #25D366; font-size: 0.85rem;"></i>
              </h4>
              <div class="wa-header-sub">Official WhatsApp Business Account • Online</div>
            </div>
          </div>
          <div class="wa-header-actions">
            <i class="fas fa-video" title="Video Call"></i>
            <i class="fas fa-phone" title="Voice Call"></i>
            <i class="fas fa-ellipsis-vertical" title="More Options"></i>
            <i class="fas fa-times" style="margin-left: 0.5rem;" onclick="App.closeModal('whatsAppSimulatorModal')"></i>
          </div>
        </div>

        <!-- WhatsApp Chat Background Wallpaper -->
        <div class="wa-chat-body">
          <div class="wa-date-pill">TODAY</div>

          <div class="wa-encryption-box">
            <i class="fas fa-lock" style="color: #F59E0B; margin-right: 0.3rem;"></i>
            Messages and calls are end-to-end encrypted. No one outside of this chat can read or listen to them.
          </div>

          <!-- Outgoing Message Bubble -->
          <div class="wa-bubble-wrapper">
            <div class="wa-chat-bubble">
              <div class="wa-bubble-header">
                <i class="fas fa-fire-burner" style="color: #DC2626; font-size: 1.1rem;"></i>
                <div class="wa-bubble-title">RestaurantOS Order Dispatch</div>
                <span class="wa-order-badge">${order.id}</span>
              </div>

              <div style="font-size: 0.82rem; color: #475569; margin-bottom: 0.5rem;">
                Dear <strong>${order.customerName}</strong>, your order has been received & sent to the kitchen!
              </div>

              <div style="font-size: 0.78rem; font-weight: 800; color: #075E54; margin-bottom: 0.25rem;">ITEMIZED ORDER DISPATCH</div>
              ${(order.items || []).map(i => `
                <div class="wa-item-row">
                  <span>🟢 ${i.qty}x ${i.name}</span>
                  <strong>₹${i.price * i.qty}</strong>
                </div>
              `).join('')}

              ${order.discount ? `
                <div class="wa-item-row" style="color: #10B981; font-weight: 700;">
                  <span>Coupon Savings</span>
                  <span>-₹${order.discount}</span>
                </div>
              ` : ''}

              <div class="wa-total-box">
                <span>TOTAL AMOUNT PAID</span>
                <span style="font-size: 1rem; color: #075E54;">₹${order.total}</span>
              </div>

              <div class="wa-address-box">
                <strong>📍 Delivery Destination:</strong><br>
                ${order.address || 'Indiranagar, Bengaluru'}
              </div>

              <div class="wa-status-box">
                <i class="fas fa-fire" style="color: #F59E0B;"></i>
                <span>Kitchen Staged & Preparing (15-Min Live Prep)</span>
              </div>

              <div class="wa-timestamp-row">
                <span>Sent ${timeStr}</span>
                <i class="fas fa-check-double" style="color: #34B7F1; font-size: 0.85rem;"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- WhatsApp Interactive Quick Reply / Message Input Bar -->
        <div class="wa-footer-bar">
          <div class="wa-input-box">
            <i class="far fa-face-smile" style="color: #8696A0; font-size: 1.1rem; cursor: pointer;"></i>
            <input type="text" placeholder="Type a message..." value="Track my live order status" readonly>
            <i class="fas fa-paperclip" style="color: #8696A0; font-size: 1rem; cursor: pointer;"></i>
            <i class="fas fa-camera" style="color: #8696A0; font-size: 1rem; cursor: pointer; margin-left: 0.3rem;"></i>
          </div>
          <div class="wa-mic-btn" onclick="App.showToast('Connecting to WhatsApp Web API...', 'success')">
            <i class="fas fa-paper-plane"></i>
          </div>
        </div>
      </div>
    `;

    this.openModal('whatsAppSimulatorModal');
  }
};

// Auto boot on DOM load
document.addEventListener('DOMContentLoaded', () => App.init());
