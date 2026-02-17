// public/js/dashboard_charts.js
console.log("Dashboard Charts script initialized.");

// Global state to avoid duplicate charts
if (!window.chartInstances) {
    window.chartInstances = {};
}
let isInitializing = false;

// Premium Solid Color Palettes
const CHART_COLORS = {
    blue: '#3498db',
    purple: '#9b59b6',
    orange: '#f39c12',
    green: '#2ecc71',
    red: '#e74c3c',
    teal: '#1abc9c',
    sky: '#5DADE2',
    pink: '#EB9486',
    mint: '#76D7C4'
};

const FONT_FAMILY = "'Poppins', sans-serif";

window.initDashboardCharts = async function () {
    if (isInitializing) return;
    isInitializing = true;
    console.log("initDashboardCharts starting...");
    const token = localStorage.getItem('token');

    // Ensure Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error("Chart.js not loaded. Retrying in 500ms...");
        setTimeout(window.initDashboardCharts, 500);
        return;
    }

    if (!token) {
        console.warn("No token found for charts.");
        return;
    }

    try {
        const response = await fetch('/api/reports/charts', {
            headers: { 'Authorization': token }
        });

        if (!response.ok) {
            console.error("Chart API Error:", response.status);
            return;
        }

        const data = await response.json();
        console.log("Chart data loaded successfully:", data);

        renderPie('todaySalesChart', data.todaySales || [], "Today's Products", 'itemName', 'totalQty', false);
        renderBar('weeklySalesChart', data.weeklySales || [], 'Weekly Revenue ($)', 'day', 'amount', 'purple');
        renderLine('monthlySalesChart', data.monthlySales || [], 'Monthly Revenue Trend ($)', 'day', 'amount', 'blue');
        renderBar('yearlySalesChart', data.yearlySales || [], 'Yearly Revenue ($)', 'year', 'amount', 'orange');
        renderPie('expenseDistChart', data.expenseDistribution || [], "Expenses Distribution", 'category', 'total', false);

        if (data.monthlyWeeklyStats && data.monthlyWeeklyStats.length > 0) {
            renderMonthlyProfitAnalysis(data.monthlyWeeklyStats);
        } else if (data.financialOverview) {
            renderFinancialOverview(data.financialOverview);
        }

    } catch (err) {
        console.error("Fatal error in charts:", err);
    }
};

function safeRender(id, type, data, options) {
    const canvas = document.getElementById(id);
    if (!canvas) return;

    // Reset styles
    canvas.style.display = 'block';

    if (window.chartInstances[id]) {
        window.chartInstances[id].destroy();
        delete window.chartInstances[id];
    }

    const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 10, bottom: 10, left: 10, right: 10 } },
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: {
                    font: { family: FONT_FAMILY, size: 12 },
                    usePointStyle: true,
                    padding: 15
                }
            },
            tooltip: {
                backgroundColor: 'rgba(44, 62, 80, 0.9)',
                titleFont: { family: FONT_FAMILY, size: 14, weight: '600' },
                bodyFont: { family: FONT_FAMILY, size: 13 },
                padding: 12,
                cornerRadius: 10,
                displayColors: true
            }
        },
        scales: type !== 'pie' && type !== 'doughnut' ? {
            x: {
                grid: { display: false },
                ticks: { font: { family: FONT_FAMILY, size: 11 }, color: '#95a5a6' }
            },
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(0,0,0,0.03)', drawBorder: false },
                ticks: { font: { family: FONT_FAMILY, size: 11 }, color: '#95a5a6' }
            }
        } : {}
    };

    try {
        window.chartInstances[id] = new Chart(canvas, {
            type: type,
            data: data,
            options: { ...defaultOptions, ...options }
        });
    } catch (e) {
        console.error(`Chart.js error on ${id}:`, e);
    }
}

function renderPie(id, rawData, title, labelKey, valueKey, isDoughnut = false) {
    const hasData = rawData && rawData.length > 0;
    const labels = hasData ? rawData.map(d => d[labelKey] || 'Other') : ["Empty"];
    const values = hasData ? rawData.map(d => d[valueKey] || 0) : [1];
    const colors = [
        '#3498db', '#9b59b6', '#f39c12', '#e74c3c', '#1abc9c', '#f1c40f', '#34495e', '#2ecc71'
    ];

    safeRender(id, isDoughnut ? 'doughnut' : 'pie', {
        labels: labels,
        datasets: [{
            data: values,
            backgroundColor: colors,
            hoverOffset: 15,
            borderWidth: 2,
            borderColor: '#ffffff'
        }]
    }, {
        plugins: {
            title: {
                display: true,
                text: title,
                font: { family: FONT_FAMILY, size: 16, weight: '700' },
                color: '#2c3e50',
                padding: { bottom: 20 }
            }
        }
    });
}

function renderBar(id, rawData, label, labelKey, valueKey, colorKey) {
    const barColor = CHART_COLORS[colorKey] || CHART_COLORS.blue;
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const isMonth = (rawData || []).some(d => d[labelKey] && d[labelKey].length <= 2);

    safeRender(id, 'bar', {
        labels: (rawData || []).map(d => isMonth ? (monthNames[parseInt(d[labelKey]) - 1] || d[labelKey]) : d[labelKey]),
        datasets: [{
            label: label,
            data: (rawData || []).map(d => d[valueKey] || 0),
            backgroundColor: barColor,
            borderRadius: 8,
            borderSkipped: false,
            barThickness: 25
        }]
    }, {
        plugins: {
            title: {
                display: true,
                text: label,
                font: { family: FONT_FAMILY, size: 16, weight: '700' },
                color: '#2c3e50'
            }
        }
    });
}

function renderLine(id, rawData, label, labelKey, valueKey, colorKey) {
    const lineColor = CHART_COLORS[colorKey] || CHART_COLORS.blue;

    safeRender(id, 'line', {
        labels: (rawData || []).map(d => d[labelKey]),
        datasets: [{
            label: label,
            data: (rawData || []).map(d => d[valueKey] || 0),
            borderColor: lineColor,
            backgroundColor: lineColor + '33', // Slight transparency for line area fill
            fill: true,
            tension: 0.45,
            pointBackgroundColor: lineColor,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6
        }]
    }, {
        plugins: {
            title: {
                display: true,
                text: label,
                font: { family: FONT_FAMILY, size: 16, weight: '700' },
                color: '#2c3e50'
            }
        }
    });
}

function renderMonthlyProfitAnalysis(stats) {
    const labels = stats.map(s => s.week);
    const revenue = stats.map(s => s.revenue);
    const expenses = stats.map(s => s.expenses);
    const profit = stats.map(s => s.profit);

    safeRender('financialOverviewChart', 'bar', {
        labels: labels,
        datasets: [
            {
                label: 'Revenue',
                data: revenue,
                backgroundColor: CHART_COLORS.sky,
                borderRadius: 6,
                barThickness: 15
            },
            {
                label: 'Expenses',
                data: expenses,
                backgroundColor: CHART_COLORS.pink,
                borderRadius: 6,
                barThickness: 15
            },
            {
                label: 'Net Profit',
                data: profit,
                backgroundColor: CHART_COLORS.mint,
                borderRadius: 6,
                barThickness: 15
            }
        ]
    }, {
        plugins: {
            title: {
                display: true,
                text: 'Monthly Profit Analysis',
                font: { family: FONT_FAMILY, size: 18, weight: '700' },
                color: '#2c3e50',
                padding: { bottom: 25 }
            }
        },
        scales: {
            x: { stacked: false, grid: { display: false } },
            y: {
                stacked: false,
                ticks: {
                    callback: (val) => '$' + val.toLocaleString()
                }
            }
        }
    });
}

function renderFinancialOverview(data) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const revenue = Array(12).fill(0);
    const expenses = Array(12).fill(0);
    const profit = Array(12).fill(0);

    (data.revenue || []).forEach(i => {
        const mIdx = parseInt(i.month) - 1;
        if (mIdx >= 0 && mIdx < 12) revenue[mIdx] = i.revenue || 0;
    });
    (data.expenses || []).forEach(i => {
        const mIdx = parseInt(i.month) - 1;
        if (mIdx >= 0 && mIdx < 12) expenses[mIdx] = i.expense || 0;
    });

    for (let i = 0; i < 12; i++) {
        profit[i] = revenue[i] - expenses[i];
    }

    safeRender('financialOverviewChart', 'bar', {
        labels: months,
        datasets: [
            { label: 'Revenue', data: revenue, backgroundColor: '#3498db', borderRadius: 4 },
            { label: 'Expenses', data: expenses, backgroundColor: '#e74c3c', borderRadius: 4 },
            { label: 'Net Profit', data: profit, type: 'line', borderColor: '#f39c12', backgroundColor: 'transparent', tension: 0.3, pointRadius: 5 }
        ]
    }, {
        plugins: {
            title: { display: true, text: 'Financial Overview (Monthly)', font: { size: 16, weight: 'bold' } }
        },
        scales: { y: { beginAtZero: true } }
    });
}

// Global initialization
window.addEventListener('load', () => {
    setTimeout(window.initDashboardCharts, 100);
});

// --- Profit Summary & Advanced Profit Chart (Shared) ---
window.loadProfitSummary = async function () {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch('/api/reports/stats', { headers: { 'Authorization': token } });
        const data = await res.json();

        const revEl = document.getElementById('span-total-revenue');
        const expEl = document.getElementById('span-total-expenses');
        const profEl = document.getElementById('span-net-profit');

        if (revEl) revEl.innerText = `$${(data.revenue.total || 0).toFixed(2)}`;
        if (expEl) expEl.innerText = `$${(data.expenses.total || 0).toFixed(2)}`;

        const netProfit = (data.revenue.total || 0) - (data.expenses.total || 0);
        if (profEl) {
            profEl.innerText = `$${netProfit.toFixed(2)}`;
            profEl.style.color = netProfit >= 0 ? '#27ae60' : '#e74c3c';
        }

        window.initProfitChart();
    } catch (e) {
        console.error("Error loading profit summary:", e);
    }
}

window.initProfitChart = async function () {
    const canvas = document.getElementById('profitGrowthChart');
    if (!canvas) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch('/api/reports/charts', { headers: { 'Authorization': token } });
        const data = await res.json();

        if (window.chartInstances['profitGrowthChart']) {
            window.chartInstances['profitGrowthChart'].destroy();
        }

        const labels = data.monthlySales.slice(-7).map(d => d.day);
        const amounts = data.monthlySales.slice(-7).map(d => d.amount);

        const ctx = canvas.getContext('2d');
        window.chartInstances['profitGrowthChart'] = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Daily Revenue Flow',
                    data: amounts,
                    borderColor: '#9b59b6',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(155, 89, 182, 0.1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, labels: { font: { family: FONT_FAMILY } } }
                },
                scales: {
                    x: { ticks: { font: { family: FONT_FAMILY } } },
                    y: { ticks: { font: { family: FONT_FAMILY } } }
                }
            }
        });
    } catch (e) {
        console.error("Error initializing profit growth chart:", e);
    }
}
