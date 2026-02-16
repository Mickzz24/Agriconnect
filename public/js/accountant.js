// public/js/accountant.js

const token = localStorage.getItem('token');

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

        'Expenses': document.getElementById('expenses-section'),
        'Payments': document.getElementById('payments-section'),
        'Reports': document.getElementById('reports-section'),
        'Profit Summary': document.getElementById('profit-summary-section'),
        'Analytics': document.getElementById('analytics-section')
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
        if (item.innerText.trim().includes(sectionName)) item.classList.add('active');
    });

    // Load data specific to section
    if (sectionName === 'Dashboard') {
        fetchAccountantStats();
        if (typeof window.initDashboardCharts === 'function') {
            window.initDashboardCharts();
        }
    }

    if (sectionName === 'Expenses') loadExpenses();
    if (sectionName === 'Payments') loadPayments('COD');
    if (sectionName === 'Profit Summary') loadProfitSummary();
    if (sectionName === 'Analytics' && typeof window.fetchForecast === 'function') window.fetchForecast();
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



function getStatusBadge(status) {
    if (status === 'Paid' || status === 'Delivered') return 'bg-success';
    if (status === 'Cancelled') return 'bg-danger';
    return 'badge'; // Default styling from dashboard.css if any
}

// --- Expense CRUD ---
async function loadExpenses() {
    try {
        const res = await fetch('/api/expenses', { headers: { 'Authorization': token } });
        const data = await res.json();
        allExpenses = (Array.isArray(data) ? data : []).sort((a, b) => b.id - a.id);
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
                    <button class="btn-action btn-approve" style="background:#8e44ad; color:white;" onclick="downloadExpenseInvoice(${e.id})" title="Invoice"><i class="fas fa-file-invoice"></i></button>
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
// --- Payments Logic ---
async function loadPayments(filterType) {
    try {
        const response = await fetch('/api/orders', {
            headers: { 'Authorization': token }
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        let orders = (Array.isArray(data) ? data : []).sort((a, b) => b.id - a.id);

        // --- Demo Data Injection ---
        if (orders.length < 5) {
            const fakeOrders = [
                { id: 9001, customer_name: "Rahul Sharma", total_amount: 1250.00, payment_method: "COD", status: "Pending" },
                { id: 9002, customer_name: "Priya Singh", total_amount: 450.50, payment_method: "Online", status: "Paid" },
                { id: 9003, customer_name: "Amit Verma", total_amount: 3200.00, payment_method: "COD", status: "Delivered" },
                { id: 9004, customer_name: "Sneha Gupta", total_amount: 890.00, payment_method: "Online", status: "Cancelled" },
                { id: 9005, customer_name: "Vikram R", total_amount: 1500.00, payment_method: "COD", status: "Pending" },
                { id: 9006, customer_name: "Anjali K", total_amount: 2100.00, payment_method: "Online", status: "Paid" }
            ];
            orders = [...fakeOrders, ...orders];
        }
        // ---------------------------

        const tbody = document.getElementById('payments-table-body');
        tbody.innerHTML = '';

        let filtered = orders; // Default to all

        if (filterType === 'Paid') filtered = orders.filter(o => o.status === 'Paid' || o.status === 'Delivered');
        else if (filterType === 'COD') filtered = orders.filter(o => o.payment_method === 'COD');
        else if (filterType === 'Pending') filtered = orders.filter(o => o.status === 'Pending');
        else if (filterType === 'Cancelled') filtered = orders.filter(o => o.status === 'Cancelled');
        // 'All' case is covered by initialization

        filtered.forEach(o => {
            const tr = document.createElement('tr');
            let actions = `<span style="color:#999">-</span>`;

            // Logic for verification/action buttons
            if (o.status === 'Pending') {
                actions = `<button class="btn-action btn-approve" onclick="updatePaymentStatus(${o.id}, 'Paid')">Confirm Paid</button>`;
            } else if (o.payment_method === 'COD' && o.status !== 'Paid' && o.status !== 'Delivered' && o.status !== 'Cancelled') {
                actions = `<button class="btn-action btn-approve" onclick="updatePaymentStatus(${o.id}, 'Paid')">Confirm COD</button>`;
            } else if (o.status === 'Paid' || o.status === 'Delivered') {
                actions = `<span class="badge bg-success"><i class="fas fa-check"></i> Verified</span>`;
            } else if (o.status === 'Cancelled') {
                actions = `<span class="badge bg-danger"><i class="fas fa-times"></i> Failed</span>`;
            }

            tr.innerHTML = `
                <td style="color:#2c3e50; font-weight:600">#${o.id}</td>
                <td style="color:#2c3e50">${o.customer_name}</td>
                <td style="font-weight:700; color:#27ae60">$${o.total_amount.toFixed(2)}</td>
                <td style="color:#2c3e50">${o.payment_method || 'N/A'}</td>
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

// --- Report Generation ---
// --- Report Generation ---
window.downloadReport = async (type, format) => {
    const reportDateVal = document.getElementById('reportDate').value;
    if (!reportDateVal) return alert("Please select a date first.");

    const selectedDate = new Date(reportDateVal);
    let start, end;
    let reportTitle = "";

    // Determine Date Range
    if (type === 'Daily') {
        start = new Date(selectedDate);
        end = new Date(selectedDate);
        reportTitle = `Daily Sales Report (${start.toLocaleDateString()})`;
    } else if (type === 'Weekly') {
        // Week starts from the selected date as Monday, or just last 7 days? 
        // Let's assume week containing the date (Monday to Sunday) or standard "This Week" relative to selected date
        // Let's go with: Week containing the selected date.
        // Or simpler: Selected date is the start of the week? 
        // Standard practice: Week starting adjacent to date. 
        // Let's implement: Start of week (Monday) containing the date.
        const day = selectedDate.getDay();
        const diff = selectedDate.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        start = new Date(selectedDate.setDate(diff));
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        reportTitle = `Weekly Sales Report (${start.toLocaleDateString()} - ${end.toLocaleDateString()})`;
    } else if (type === 'Monthly' || type === 'PL' || type === 'Expense') {
        start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        const monthName = start.toLocaleString('default', { month: 'long' });
        reportTitle = `${type === 'PL' ? 'Profit & Loss' : type === 'Expense' ? 'Expense' : 'Monthly Sales'} Report - ${monthName} ${start.getFullYear()}`;
    }

    // Set time boundaries
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // Fetch data
    const res = await fetch('/api/orders', { headers: { 'Authorization': token } });
    let orders = await res.json();

    // Filter orders
    orders = orders.filter(o => {
        const d = new Date(o.createdAt);
        return d >= start && d <= end;
    });

    if (orders.length === 0) {
        alert("No data found for the selected period.");
        return;
    }

    if (format === 'csv') {
        let csv = 'ID,Customer,Amount,Status,Date\n';
        orders.forEach(o => csv += `${o.id},${o.customer_name},${o.total_amount},${o.status},${new Date(o.createdAt).toLocaleDateString()}\n`);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_Report_${reportDateVal}.csv`;
        a.click();
    } else {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(`AgriConnect: ${reportTitle}`, 14, 20);
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

        doc.autoTable({
            startY: 35,
            head: [['ID', 'Customer', 'Amount', 'Status', 'Date']],
            body: orders.map(o => [o.id, o.customer_name, `$${o.total_amount}`, o.status, new Date(o.createdAt).toLocaleDateString()]),
            theme: 'grid',
            headStyles: { fillColor: [46, 204, 113] }
        });

        // Add summary at bottom
        const total = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
        doc.text(`Total Revenue: $${total.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 10);

        doc.save(`${type}_Report.pdf`);
    }
}

// --- Email Report Function ---
window.emailReport = async (type, format) => {
    const reportDateVal = document.getElementById('reportDate').value;
    if (!reportDateVal) return alert("Please select a date first.");

    if (!confirm(`Send ${type} ${format.toUpperCase()} report to owner's email?`)) return;

    try {
        const res = await fetch('/api/reports/email-report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify({
                reportType: type,
                format: format,
                selectedDate: reportDateVal
            })
        });

        const data = await res.json();

        if (res.ok) {
            alert(data.message || 'Report sent successfully!');
        } else {
            alert(data.message || 'Failed to send report');
        }
    } catch (err) {
        console.error('Error sending email:', err);
        alert('Error sending report email. Please try again.');
    }
};

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = '/';
});

// --- Invoice Generation (Copied from expenses.js for Accountant) ---
window.downloadExpenseInvoice = async function (id) {
    if (!window.jspdf) {
        alert("PDF generator not loaded. Please refresh the page.");
        return;
    }

    try {
        const jsPDF = window.jspdf.jsPDF || window.jspdf;
        const doc = new jsPDF();

        // Find expense in allExpenses array
        const expense = allExpenses.find(e => e.id == id);
        if (!expense) return alert("Expense data not found");

        // --- Header & Branding ---
        doc.setFontSize(22);
        doc.setTextColor(39, 174, 96); // AgriConnect Green
        doc.text("AgriConnect: Organic & Dairy", 105, 20, { align: "center" });

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("Business operational Expense Receipt", 105, 27, { align: "center" });

        // --- Info ---
        doc.setDrawColor(200);
        doc.line(10, 35, 200, 35);

        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.setFont(undefined, 'bold');
        doc.text(`EXPENSE VOUCHER: #EXP-${expense.id}`, 10, 45);
        doc.setFont(undefined, 'normal');
        doc.text(`Date: ${new Date(expense.date).toLocaleDateString()}`, 150, 45);
        doc.text(`Category: ${expense.category}`, 10, 55);
        doc.text(`Authorized By: ${expense.user ? expense.user.username : 'System'}`, 10, 65);

        // --- Table ---
        const tableData = [[
            expense.category,
            expense.description || 'No description provided',
            `$${(expense.amount || 0).toFixed(2)}`
        ]];

        if (doc.autoTable) {
            doc.autoTable({
                startY: 75,
                head: [['Category', 'Description', 'Amount']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [39, 174, 96] }, // AgriConnect Green header
                margin: { top: 10 }
            });
        } else {
            doc.text(`${expense.category}: $${(expense.amount || 0).toFixed(2)}`, 10, 85);
        }

        // --- Summary ---
        const finalY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 120) + 10;
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`Total Expense: $${(expense.amount || 0).toFixed(2)}`, 150, finalY);

        // --- Footer ---
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text("This is a computer generated document for internal record keeping.", 105, 280, { align: "center" });

        // Save
        doc.save(`AgriConnect_Expense_Voucher_${expense.id}.pdf`);

    } catch (err) {
        console.error('Error generating voucher:', err);
        alert('Failed to generate expense voucher: ' + err.message);
    }
};
