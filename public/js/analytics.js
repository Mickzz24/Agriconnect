// public/js/analytics.js

window.fetchForecast = async function () {
    try {
        console.log("Fetching advanced analytics...");
        const response = await fetch('http://localhost:5001/api/analytics/advanced');
        const data = await response.json();

        if (data.error) {
            console.error("Backend error:", data.error);
            document.getElementById('sales-trend').innerText = 'Data Error';
            return;
        }

        renderTrendChart(data.historical);
        renderAdvancedForecastChart(data.forecast);

        // Update Insights
        const insightsContainer = document.getElementById('ai-insights-container');
        if (insightsContainer) {
            insightsContainer.innerHTML = `
                <div class="insight-card sales">
                    <h4>Next Month Predicted Sales</h4>
                    <div class="value">$${data.next_month.sales.toLocaleString()}</div>
                </div>
                <div class="insight-card profit">
                    <h4>Next Month Predicted Profit</h4>
                    <div class="value">$${data.next_month.profit.toLocaleString()}</div>
                </div>
            `;
        }

        if (document.getElementById('sales-trend')) {
            const trend = data.forecast[0].predicted_sales > data.historical[data.historical.length - 1].sales ? 'Increasing 📈' : 'Stabilizing ➡️';
            document.getElementById('sales-trend').innerText = trend;
        }

    } catch (err) {
        console.error('Error fetching advanced analytics:', err);
        if (document.getElementById('sales-trend')) {
            document.getElementById('sales-trend').innerText = 'AI Module Offline';
        }
    }
};

let trendChartInstance = null;
let forecastChartInstance = null;

function renderTrendChart(historicalData) {
    const canvas = document.getElementById('analyticsTrendChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const labels = historicalData.map(d => d.month);
    const sales = historicalData.map(d => d.sales);
    const profit = historicalData.map(d => d.profit);
    const expenses = historicalData.map(d => d.expenses);

    if (trendChartInstance) trendChartInstance.destroy();

    trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Sales',
                    data: sales,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Profit',
                    data: profit,
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Expenses',
                    data: expenses,
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Sales, Profit & Expenses Trend', font: { size: 16, weight: 'bold' } },
                legend: { position: 'top' }
            },
            scales: {
                y: { beginAtZero: true, ticks: { callback: v => '$' + v } }
            }
        }
    });
}

function renderAdvancedForecastChart(forecastData) {
    const canvas = document.getElementById('analyticsForecastChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const labels = forecastData.map(d => d.month);
    const predictions = forecastData.map(d => d.predicted_sales);
    const upperCI = forecastData.map(d => d.conf_upper);
    const lowerCI = forecastData.map(d => d.conf_lower);

    if (forecastChartInstance) forecastChartInstance.destroy();

    forecastChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Forecasted Sales',
                    data: predictions,
                    borderColor: '#8e44ad',
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    pointRadius: 5,
                    z: 10
                },
                {
                    label: 'Confidence Interval',
                    data: upperCI,
                    borderColor: 'rgba(142, 68, 173, 0.1)',
                    backgroundColor: 'rgba(142, 68, 173, 0.2)',
                    fill: '+1', // Fill to lowerCI
                    pointRadius: 0,
                    tension: 0.3
                },
                {
                    label: 'Lower Bound',
                    data: lowerCI,
                    borderColor: 'rgba(142, 68, 173, 0.1)',
                    backgroundColor: 'transparent',
                    fill: false,
                    pointRadius: 0,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'AI Sales Forecast with Confidence Intervals', font: { size: 16, weight: 'bold' } },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) label += '$' + context.parsed.y.toLocaleString();
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, ticks: { callback: v => '$' + v } }
            }
        }
    });
}
