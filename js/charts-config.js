/* ==========================================================================
   RestaurantOS Chart.js Dashboard Configuration
   ========================================================================== */

const ChartEngine = {
  revenueChartInstance: null,
  ordersChartInstance: null,
  peakHoursChartInstance: null,

  initCharts() {
    this.renderRevenueChart();
    this.renderOrdersChart();
    this.renderPeakHoursChart();
  },

  renderRevenueChart() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx || typeof Chart === 'undefined') return;

    if (this.revenueChartInstance) {
      this.revenueChartInstance.destroy();
    }

    const labels = ['11 AM', '1 PM', '3 PM', '5 PM', '7 PM', '9 PM', '11 PM'];
    const revenueData = [4500, 12800, 6200, 9100, 24500, 31200, 14800];

    this.revenueChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Today\'s Revenue (₹)',
          data: revenueData,
          borderColor: '#2563EB',
          backgroundColor: 'rgba(37, 99, 235, 0.08)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#2563EB'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: '#1E293B',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (context) => ` Revenue: ₹${context.raw.toLocaleString('en-IN')}`
            }
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            grid: { color: '#F3F4F6' },
            ticks: {
              callback: (val) => `₹${val / 1000}k`
            }
          }
        }
      }
    });
  },

  renderOrdersChart() {
    const ctx = document.getElementById('ordersChart');
    if (!ctx || typeof Chart === 'undefined') return;

    if (this.ordersChartInstance) {
      this.ordersChartInstance.destroy();
    }

    this.ordersChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Dine-In', 'Takeaway', 'Delivery'],
        datasets: [{
          data: [42, 28, 30],
          backgroundColor: ['#2563EB', '#F59E0B', '#10B981'],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, padding: 15, font: { weight: '600', size: 12 } }
          }
        },
        cutout: '70%'
      }
    });
  },

  renderPeakHoursChart() {
    const ctx = document.getElementById('peakHoursChart');
    if (!ctx || typeof Chart === 'undefined') return;

    if (this.peakHoursChartInstance) {
      this.peakHoursChartInstance.destroy();
    }

    this.peakHoursChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['12 PM', '1 PM', '2 PM', '3 PM', '7 PM', '8 PM', '9 PM', '10 PM'],
        datasets: [{
          label: 'Order Volume',
          data: [14, 28, 22, 10, 32, 45, 38, 19],
          backgroundColor: '#4F46E5',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: '#F3F4F6' } }
        }
      }
    });
  }
};

window.ChartEngine = ChartEngine;
