// public/js/accountant.js

const token = localStorage.getItem('token');
let allOrders = [];
let allExpenses = [];
let profitChart = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!token) window.location.href = '/';

    fetchProfile();
    fetchAccountantStats();

    // Standard Owners Charts
    if (typeof window.initDashboardCharts === 'function') {
        setTimeout(window.initDashboardCharts, 300);
    }
});

async function fetchProfile() {
    try {
        const res = await fetch('/api/user/profile', { headers: { 'Authorization': token } });
        const data = await res.json();
        document.getElementById('userName').innerText = data.username;
    } catch (e) { console.error(e); }
}

function switchSection(sectionName) {
    const sections = {
        'Dashboard': document.getElementById('dashboard-section'),
        'Revenue': document.getElementById('revenue-section'),
        'Expenses': document.getElementById('expenses-section'),
        'Payments': document.getElementById('payments-section'),
        'Reports': document.getElementById('reports-section'),
        'Profit Summary': document.getElementById('profit-summary-section')
    };

    const pageTitle = document.getElementById('page-title');
    const menuItems = document.querySelectorAll('.menu-item');

    Object.keys(sections).forEach(key => {
        if (sections[key]) sections[key].style.display = 'none';
    });

    if (sections[sectionName]) {
        sections[sectionName].style.display = 'block';
        pageTitle.innerText = sectionName === 'Dashboard' ? 'Dashboard' : sectionName + ' Dashboard';
    }

    menuItems.forEach(item => {
        item.classList.remove('active');
        if (item.innerText.includes(sectionName)) item.classList.add('active');
    });

    // Load data specific to section
    if (sectionName === 'Dashboard') {
        fetchAccountantStats();
        if (typeof window.initDashboardCharts === 'function') {
            window.initDashboardCharts();
        }
    }
    if (sectionName === 'Revenue') loadRevenue();
    if (sectionName === 'Expenses') loadExpenses();
    if (sectionName === 'Payments') loadPayments('COD');
    if (sectionName === 'Profit Summary') loadProfitSummary();
}

// --- Home Dash Stats ---
async function fetchAccountantStats() {
    try {
        const res = await fetch('/api/reports/stats', { headers: { 'Authorization': token } });
        const data = await res.json();

        document.getElementById('card-today-revenue').innerText = `$${(data.revenue.today || 0).toFixed(2)}`;
        document.getElementById('card-today-expenses').innerText = `$${(data.expenses.today || 0).toFixed(2)}`;
        document.getElementById('card-monthly-profit').innerText = `$${(data.financials.monthlyProfit || 0).toFixed(2)}`;
        document.getElementById('card-pending-payments').innerText = data.financials.pendingPayments || 0;

        const profitVal = document.getElementById('card-monthly-profit');
        profitVal.style.color = data.financials.monthlyProfit >= 0 ? '#27ae60' : '#e74c3c';
    } catch (e) { console.error("Stats error:", e); }
}

// --- Revenue Logic ---
async function loadRevenue() {
    try {
        const res = await fetch('/api/orders', { headers: { 'Authorization': token } });
        allOrders = await res.json();
        filterRevenue();
    } catch (e) { console.error(e); }
}

function filterRevenue() {
    const search = document.getElementById('revenueSearch').value.toLowerCase();
    const dateFilter = document.getElementById('revenueDateFilter').value;
    const tbody = document.getElementById('revenue-table-body');
    tbody.innerHTML = '';

    const todayStr = new Date().toISOString().split('T')[0];

    let filtered = allOrders.filter(o => o.id.toString().includes(search));

    if (dateFilter === 'daily') {
        filtered = filtered.filter(o => o.createdAt.startsWith(todayStr));
    } else if (dateFilter === 'weekly') {
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = filtered.filter(o => new Date(o.createdAt) >= weekAgo);
    } else if (dateFilter === 'monthly') {
        const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
        filtered = filtered.filter(o => new Date(o.createdAt) >= monthAgo);
    }

    filtered.forEach(o => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${o.id}</td>
            <td>${o.customer_name}</td>
            <td>${o.payment_method || 'N/A'}</td>
            <td style="font-weight:600">$${o.total_amount.toFixed(2)}</td>
            <td>${new Date(o.createdAt).toLocaleDateString()}</td>
            <td><span class="badge ${getStatusBadge(o.status)}">${o.status}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function getStatusBadge(status) {
    if (status === 'Paid' || status === 'Delivered') return 'bg-success';
    if (status === 'Cancelled') return 'bg-danger';
    return 'badge'; // Default styling from dashboard.css if any
}

// --- Expense CRUD ---
async function loadExpenses() {
    try {
        const res = await fetch('/api/expenses', { headers: { 'Authorization': token } });
        allExpenses = await res.json();
        const tbody = document.getElementById('expenses-table-body');
        tbody.innerHTML = '';

        allExpenses.forEach(e => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${e.description || 'No Title'}</td>
                <td><span class="badge bg-success" style="background:#eee; color:#333; font-weight:normal;">${e.category}</span></td>
                <td style="color:#e74c3c; font-weight:600">$${e.amount.toFixed(2)}</td>
                <td>${new Date(e.date).toLocaleDateString()}</td>
                <td>${e.user ? e.user.username : 'System'}</td>
                <td>
                    <button class="btn-action btn-edit" onclick="openExpenseModal(${JSON.stringify(e).replace(/"/g, '&quot;')})"><i class="fas fa-edit"></i></button>
                    <button class="btn-action btn-danger" onclick="deleteExpense(${e.id})"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) { console.error(err); }
}

window.openExpenseModal = function (expense = null) {
    const modal = document.getElementById('expenseModal');
    const form = document.getElementById('expenseForm');
    const title = document.getElementById('expenseModalTitle');

    form.reset();
    if (expense) {
        title.innerText = 'Edit Expense';
        document.getElementById('expenseId').value = expense.id;
        document.getElementById('expDescription').value = expense.description;
        document.getElementById('expCategory').value = expense.category;
        document.getElementById('expAmount').value = expense.amount;
        document.getElementById('expDate').value = expense.date;
    } else {
        title.innerText = 'Add New Expense';
        document.getElementById('expenseId').value = '';
        document.getElementById('expDate').value = new Date().toISOString().split('T')[0];
    }
    modal.style.display = 'block';
};

window.closeExpenseModal = function () {
    document.getElementById('expenseModal').style.display = 'none';
};

document.getElementById('expenseForm').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('expenseId').value;
    const data = {
        description: document.getElementById('expDescription').value,
        category: document.getElementById('expCategory').value,
        amount: parseFloat(document.getElementById('expAmount').value),
        date: document.getElementById('expDate').value
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/expenses/${id}` : '/api/expenses';

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': token },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            closeExpenseModal();
            loadExpenses();
            fetchAccountantStats();
        }
    } catch (err) { console.error(err); }
};

window.deleteExpense = async (id) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
        const res = await fetch(`/api/expenses/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': token }
        });
        if (res.ok) loadExpenses();
    } catch (e) { console.error(e); }
};

// --- Payments Logic ---
async function loadPayments(filterType) {
    try {
        const res = await fetch('/api/orders', { headers: { 'Authorization': token } });
        const orders = await res.json();
        const tbody = document.getElementById('payments-table-body');
        tbody.innerHTML = '';

        let filtered = [];
        if (filterType === 'Paid') filtered = orders.filter(o => o.status === 'Paid' || o.status === 'Delivered');
        if (filterType === 'COD') filtered = orders.filter(o => o.payment_method === 'COD');
        if (filterType === 'Pending') filtered = orders.filter(o => o.status === 'Pending');
        if (filterType === 'Cancelled') filtered = orders.filter(o => o.status === 'Cancelled');

        filtered.forEach(o => {
            const tr = document.createElement('tr');
            let actions = `<span style="color:#999">Verified</span>`;
            if (o.status === 'Pending' || (o.payment_method === 'COD' && o.status !== 'Paid' && o.status !== 'Delivered')) {
                actions = `<button class="btn-action btn-edit" style="color:white; background:#2ecc71; padding:5px 12px" onclick="updatePaymentStatus(${o.id}, 'Paid')">Confirm</button>`;
            }

            tr.innerHTML = `
                <td>#${o.id}</td>
                <td>${o.customer_name}</td>
                <td style="font-weight:600">$${o.total_amount.toFixed(2)}</td>
                <td>${o.payment_method || 'N/A'}</td>
                <td><span class="badge ${getStatusBadge(o.status)}">${o.status}</span></td>
                <td>${actions}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error(e); }
}

window.updatePaymentStatus = async (id, status) => {
    if (!confirm(`Mark Order #${id} as Paid?`)) return;
    try {
        const res = await fetch(`/api/orders/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': token },
            body: JSON.stringify({ status })
        });
        if (res.ok) {
            loadPayments('COD');
            fetchAccountantStats();
        }
    } catch (e) { console.error(e); }
};

// --- Profit Summary & Advanced Profit Chart ---
async function loadProfitSummary() {
    try {
        const res = await fetch('/api/reports/stats', { headers: { 'Authorization': token } });
        const data = await res.json();

        document.getElementById('span-total-revenue').innerText = `$${data.revenue.total.toFixed(2)}`;
        document.getElementById('span-total-expenses').innerText = `$${data.expenses.total.toFixed(2)}`;

        const netProfit = data.revenue.total - data.expenses.total;
        const profitEl = document.getElementById('span-net-profit');
        profitEl.innerText = `$${netProfit.toFixed(2)}`;
        profitEl.style.color = netProfit >= 0 ? '#27ae60' : '#e74c3c';

        initProfitChart();
    } catch (e) { console.error(e); }
}

async function initProfitChart() {
    const canvas = document.getElementById('profitGrowthChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    try {
        const res = await fetch('/api/reports/charts', { headers: { 'Authorization': token } });
        const data = await res.json();

        if (profitChart) profitChart.destroy();

        const labels = data.monthlySales.slice(-7).map(d => d.day);
        const amounts = data.monthlySales.slice(-7).map(d => d.amount);

        profitChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Daily Revenue Flow',
                    data: amounts,
                    borderColor: '#2ecc71',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(46, 204, 113, 0.1)'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    } catch (e) { }
}

// --- Report Generation ---
window.downloadReport = async (type, format) => {
    const start = document.getElementById('reportStart').value;
    const end = document.getElementById('reportEnd').value;
    if (!start || !end) return alert("Select date range.");

    const res = await fetch('/api/orders', { headers: { 'Authorization': token } });
    const orders = await res.json();

    if (format === 'csv') {
        let csv = 'ID,Customer,Amount,Status,Date\n';
        orders.forEach(o => csv += `${o.id},${o.customer_name},${o.total_amount},${o.status},${o.createdAt}\n`);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_Report.csv`;
        a.click();
    } else {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.text(`AgriConnect Finance: ${type} Report`, 14, 20);
        doc.autoTable({
            startY: 30,
            head: [['ID', 'Customer', 'Amount', 'Status', 'Date']],
            body: orders.map(o => [o.id, o.customer_name, `$${o.total_amount}`, o.status, new Date(o.createdAt).toLocaleDateString()])
        });
        doc.save(`${type}_Report.pdf`);
    }
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = '/';
});
