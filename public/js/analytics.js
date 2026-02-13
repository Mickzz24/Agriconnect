// public/js/analytics.js

window.fetchForecast = async function () {
    try {
        // Fetch from Flask backend (port 5001)
        const response = await fetch('http://localhost:5001/api/forecast');
        const data = await response.json();

        if (data.forecast && data.forecast.length > 0) {
            renderForecastChart(data.forecast);
            document.getElementById('sales-trend').innerText = data.trend === 'up' ? 'Increasing 📈' : 'Decreasing 📉';
        } else {
            document.getElementById('sales-trend').innerText = 'Insufficient Data for Prediction';
        }

    } catch (err) {
        console.error('Error fetching forecast:', err);
        document.getElementById('sales-trend').innerText = 'Error connecting to AI module';
    }
};

let matchChart = null;

function renderForecastChart(forecastData) {
    const ctx = document.getElementById('forecastChart').getContext('2d');
    const labels = forecastData.map(d => d.date);
    const dataPoints = forecastData.map(d => d.predicted_sales);

    if (matchChart) {
        matchChart.destroy();
    }

    matchChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Predicted Sales ($)',
                data: dataPoints,
                borderColor: '#8e44ad',
                backgroundColor: 'rgba(142, 68, 173, 0.2)',
                borderWidth: 2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}
