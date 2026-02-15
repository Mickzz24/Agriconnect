// public/js/dashboard_charts.js
console.log("Dashboard Charts script initialized.");

// Global state to avoid duplicate charts
if (!window.chartInstances) {
    window.chartInstances = {};
}

window.initDashboardCharts = async function () {
    console.log("initDashboardCharts called");
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

        renderPie('todaySalesChart', data.todaySales || [], "Today's Products", 'itemName', 'totalQty');
        renderBar('weeklySalesChart', data.weeklySales || [], 'Weekly Revenue ($)', 'day', 'amount', '#3498db');
        renderLine('monthlySalesChart', data.monthlySales || [], 'Daily Trend ($)', 'day', 'amount', '#2ecc71');
        renderBar('yearlySalesChart', data.yearlySales || [], 'Yearly Revenue ($)', 'month', 'amount', '#8e44ad', true);
        renderPie('expenseDistChart', data.expenseDistribution || [], "Expenses Distribution", 'category', 'total', true);

        if (data.financialOverview) {
            renderFinancialOverview(data.financialOverview);
        }

    } catch (err) {
        console.error("Fatal error in charts:", err);
    }
};

function safeRender(id, type, data, options) {
    const canvas = document.getElementById(id);
    if (!canvas) {
        console.warn(`Canvas ID ${id} not found.`);
        return;
    }

    // Ensure container has visibility and dimensions
    const container = canvas.parentElement;
    if (container) {
        container.style.minHeight = '350px';
        container.style.display = 'block';
    }

    if (window.chartInstances[id]) {
        window.chartInstances[id].destroy();
    }

    try {
        window.chartInstances[id] = new Chart(canvas, {
            type: type,
            data: data,
            options: {
                ...options,
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 1000 }
            }
        });
    } catch (e) {
        console.error(`Chart.js error on ${id}:`, e);
    }
}

function renderPie(id, rawData, title, labelKey, valueKey, isDoughnut = false) {
    const hasData = rawData && rawData.length > 0;
    const labels = hasData ? rawData.map(d => d[labelKey] || 'Unknown') : ["No Data"];
    const values = hasData ? rawData.map(d => d[valueKey] || 0) : [1];
    const colors = hasData ? ['#27ae60', '#3498db', '#f1c40f', '#e67e22', '#e74c3c', '#9b59b6', '#1abc9c'] : ['#f0f0f0'];

    safeRender(id, isDoughnut ? 'doughnut' : 'pie', {
        labels: labels,
        datasets: [{
            data: values,
            backgroundColor: colors,
            borderWidth: 1
        }]
    }, {
        plugins: {
            title: { display: true, text: title, font: { size: 16, weight: 'bold' } },
            legend: { position: 'bottom', labels: { boxWidth: 12 } }
        }
    });
}

function renderBar(id, rawData, label, labelKey, valueKey, color, isMonth = false) {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const labels = (rawData || []).map(d => isMonth ? (monthNames[parseInt(d[labelKey]) - 1] || d[labelKey]) : d[labelKey]);

    safeRender(id, 'bar', {
        labels: labels,
        datasets: [{
            label: label,
            data: (rawData || []).map(d => d[valueKey] || 0),
            backgroundColor: color,
            borderRadius: 5
        }]
    }, {
        plugins: {
            title: { display: true, text: label, font: { size: 16, weight: 'bold' } }
        },
        scales: { y: { beginAtZero: true } }
    });
}

function renderLine(id, rawData, label, labelKey, valueKey, color) {
    safeRender(id, 'line', {
        labels: (rawData || []).map(d => d[labelKey]),
        datasets: [{
            label: label,
            data: (rawData || []).map(d => d[valueKey] || 0),
            borderColor: color,
            backgroundColor: color + '22',
            fill: true,
            tension: 0.4,
            pointRadius: 4
        }]
    }, {
        plugins: {
            title: { display: true, text: label, font: { size: 16, weight: 'bold' } }
        },
        scales: { y: { beginAtZero: true } }
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
            { label: 'Revenue', data: revenue, backgroundColor: '#2ecc71', borderRadius: 4 },
            { label: 'Expenses', data: expenses, backgroundColor: '#e74c3c', borderRadius: 4 },
            { label: 'Net Profit', data: profit, type: 'line', borderColor: '#2c3e50', backgroundColor: 'transparent', tension: 0.3, pointRadius: 5 }
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
