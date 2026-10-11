/**
 * Chart View
 * Role: Responsible exclusively for rendering and updating Chart.js visualizations:
 * 1. Category Breakdown (Doughnut / Pie Chart)
 * 2. Spending Trend across the last 6 months (Bar Chart)
 * Decoupled from data models and network calls.
 */

// Color palette corresponding to expense categories
const CATEGORY_COLORS = {
  Food: '#f59e0b',          // Amber
  Transport: '#3b82f6',     // Blue
  Rent: '#8b5cf6',          // Purple
  Shopping: '#ec4899',      // Pink
  Bills: '#06b6d4',         // Cyan
  Health: '#10b981',        // Emerald
  Entertainment: '#6366f1', // Indigo
  Other: '#64748b'          // Slate
};

export class ChartView {
  constructor() {
    // Category Breakdown Chart elements
    this.canvas = document.getElementById('expenseChart');
    this.chartContainer = document.getElementById('chartCanvasWrapper');
    this.emptyChartState = document.getElementById('emptyChartState');
    this.chartInstance = null;

    // Spending Trend (6 Months) Bar Chart elements
    this.trendCanvas = document.getElementById('trendChart');
    this.trendContainer = document.getElementById('trendCanvasWrapper');
    this.emptyTrendState = document.getElementById('emptyTrendState');
    this.trendChartInstance = null;

    this.currencyFormatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    });
  }

  /**
   * Renders or updates the doughnut chart with expense category breakdown.
   * @param {Object} categoryBreakdown - { 'Food': 1200, 'Transport': 450, ... }
   */
  renderChart(categoryBreakdown = {}) {
    // Filter categories with values > 0
    const activeEntries = Object.entries(categoryBreakdown).filter(([_, amount]) => amount > 0);
    const totalExpense = activeEntries.reduce((sum, [_, amt]) => sum + amt, 0);

    // If no expense data, show empty state
    if (activeEntries.length === 0 || totalExpense === 0) {
      if (this.emptyChartState) this.emptyChartState.classList.remove('hidden');
      if (this.chartContainer) this.chartContainer.classList.add('hidden');
      if (this.chartInstance) {
        this.chartInstance.destroy();
        this.chartInstance = null;
      }
      return;
    }

    // Display chart canvas and hide empty message
    if (this.emptyChartState) this.emptyChartState.classList.add('hidden');
    if (this.chartContainer) this.chartContainer.classList.remove('hidden');

    const labels = activeEntries.map(([cat]) => cat);
    const dataValues = activeEntries.map(([_, amt]) => amt);
    const backgroundColors = labels.map(cat => CATEGORY_COLORS[cat] || '#64748b');

    // Check if Chart.js is loaded
    if (typeof window.Chart === 'undefined' || !this.canvas) {
      return;
    }

    if (this.chartInstance) {
      this.chartInstance.data.labels = labels;
      this.chartInstance.data.datasets[0].data = dataValues;
      this.chartInstance.data.datasets[0].backgroundColor = backgroundColors;
      this.chartInstance.update();
      return;
    }

    const ctx = this.canvas.getContext('2d');
    this.chartInstance = new window.Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: dataValues,
            backgroundColor: backgroundColors,
            borderColor: '#ffffff',
            borderWidth: 2,
            hoverOffset: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 12,
              font: {
                family: 'system-ui, -apple-system, sans-serif',
                size: 11
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed || 0;
                const percentage = ((value / totalExpense) * 100).toFixed(1);
                return ` ${label}: ${this.currencyFormatter.format(value)} (${percentage}%)`;
              }
            }
          }
        },
        cutout: '62%'
      }
    });
  }

  /**
   * Renders or updates the 6-Month Spending Trend Bar Chart (matching Screenshot 1).
   * @param {Array<{ monthKey: string, label: string, expense: number }>} trendData
   */
  renderTrendChart(trendData = []) {
    if (!this.trendCanvas || typeof window.Chart === 'undefined') return;

    const totalInWindow = trendData.reduce((sum, item) => sum + (item.expense || 0), 0);

    // If no expense in any of the last 6 months
    if (trendData.length === 0 || totalInWindow === 0) {
      if (this.emptyTrendState) this.emptyTrendState.classList.remove('hidden');
      if (this.trendContainer) this.trendContainer.classList.add('hidden');
      if (this.trendChartInstance) {
        this.trendChartInstance.destroy();
        this.trendChartInstance = null;
      }
      return;
    }

    if (this.emptyTrendState) this.emptyTrendState.classList.add('hidden');
    if (this.trendContainer) this.trendContainer.classList.remove('hidden');

    const labels = trendData.map(d => d.label);
    const dataValues = trendData.map(d => d.expense);

    if (this.trendChartInstance) {
      this.trendChartInstance.data.labels = labels;
      this.trendChartInstance.data.datasets[0].data = dataValues;
      this.trendChartInstance.update();
      return;
    }

    const ctx = this.trendCanvas.getContext('2d');
    this.trendChartInstance = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Monthly Expense',
            data: dataValues,
            backgroundColor: '#3b82f6',
            hoverBackgroundColor: '#2563eb',
            borderRadius: 6,
            maxBarThickness: 42
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed.y || 0;
                return ` Spent: ${this.currencyFormatter.format(value)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: {
                family: 'system-ui, -apple-system, sans-serif',
                size: 12,
                weight: '500'
              },
              color: '#64748b'
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: '#f1f5f9'
            },
            ticks: {
              font: {
                family: 'system-ui, -apple-system, sans-serif',
                size: 11
              },
              color: '#94a3b8',
              callback: (val) => '₹' + val
            }
          }
        }
      }
    });
  }
}
