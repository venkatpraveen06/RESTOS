/* ==========================================================================
   RestaurantOS Intelligence - AI Recommendation & Sales Insights Engine
   ========================================================================== */

const AIEngine = {
  // Frequently Bought Together pairs
  combos: [
    {
      primaryItem: "Andhra Chicken Biryani",
      suggestedItems: ["Buttermilk (Majjiga)", "Double Ka Meetha"],
      reason: "89% of biryani orders add chilled Majjiga & classic dessert.",
      discountBonus: "Save ₹50 as a combo"
    },
    {
      primaryItem: "Mutton Dum Biryani",
      suggestedItems: ["Gongura Chicken", "Mirchi Bajji"],
      reason: "Popular spicy starter pair for family dining.",
      discountBonus: "Save ₹60 as a starter pair"
    }
  ],

  // AI Insights generated dynamically for admin
  generateInsights() {
    return [
      {
        title: "⚡ Peak Demand Alert (Andhra Biryanis)",
        description: "Order velocity for Andhra Chicken & Mutton Biryanis spikes by 38% between 7:30 PM - 9:30 PM. Ensure KDS rice dum staging is ready by 7:00 PM.",
        impact: "High Margin Boost",
        actionText: "Stage Kitchen Dum Prep"
      },
      {
        title: "💡 Smart Menu Pricing Recommendation",
        description: "'Buttermilk (Majjiga)' has a 4.9 star rating with a 92% re-order rate. Price elasticity allows a price adjustment to ₹69 (+₹10) without volume drop.",
        impact: "+₹14,200 Monthly Profit",
        actionText: "Apply Recommended Price"
      },
      {
        title: "🎯 Customer Retention Signal",
        description: "12 VIP Gold customers haven't ordered in 14 days. Trigger automated WhatsApp loyalty discount coupon (WELCOME50) to recover ₹18,000 spend.",
        impact: "Automated CRM Campaign",
        actionText: "Send WhatsApp Promo"
      }
    ];
  },

  // Dynamic cart cross-sell recommendation
  getCrossSellForCart(cartItems) {
    if (!cartItems || cartItems.length === 0) return null;
    
    // Pick the first item's name
    const mainItem = cartItems[0].name;
    const combo = this.combos.find(c => c.primaryItem === mainItem) || this.combos[0];
    
    return {
      title: "AI Smart Combo Recommendation",
      suggestedItem: combo.suggestedItems[0],
      reason: combo.reason,
      bonus: combo.discountBonus
    };
  },

  renderInsightsCards(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const insights = this.generateInsights();
    container.innerHTML = insights.map(i => `
      <div class="ai-card" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: var(--radius-md); padding: 1rem;">
        <div style="font-weight: 800; font-size: 0.95rem; color: white; margin-bottom: 0.35rem;">${i.title}</div>
        <p style="font-size: 0.82rem; color: #C7D2FE; line-height: 1.45; margin-bottom: 0.75rem;">${i.description}</p>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="badge" style="background: rgba(255,255,255,0.15); color: #FCD34D;">${i.impact}</span>
          <button class="btn btn-ghost btn-sm" style="color: #60A5FA; font-size: 0.78rem;" onclick="App.showToast('${i.actionText} executed successfully!', 'success')">${i.actionText} →</button>
        </div>
      </div>
    `).join('');
  }
};

window.AIEngine = AIEngine;
