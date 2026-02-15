// public/js/expenses.js

const expensesTableBody = document.getElementById('expenses-table-body');
const addExpenseForm = document.getElementById('add-expense-form');
const submitBtn = addExpenseForm ? addExpenseForm.querySelector('button[type="submit"]') : null;
let editingId = null;
let expensesData = [];

// Global function for dashboard access
window.fetchExpenses = async function () {
    try {
        const response = await fetch('/api/expenses', {
            headers: { 'Authorization': localStorage.getItem('token') }
        });
        expensesData = await response.json();
        renderExpenses(expensesData);
    } catch (err) {
        console.error('Error fetching expenses:', err);
    }
};

function renderExpenses(expenses) {
    expensesTableBody.innerHTML = '';
    expenses.forEach(expense => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${expense.category}</td>
            <td>${expense.description || '-'}</td>
            <td>${new Date(expense.date).toLocaleDateString()}</td>
            <td class="text-danger fw-bold">-$${expense.amount.toFixed(2)}</td>
            <td>
                <button class="btn-action btn-edit" onclick="editExpense(${expense.id})"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn-action btn-danger" onclick="deleteExpense(${expense.id})"><i class="fas fa-trash"></i> Delete</button>
                <button class="btn-action" onclick="window.downloadExpenseInvoice(${expense.id})" style="background: #2ecc71; color: white; margin-left: 5px;" title="Invoice">
                    <i class="fas fa-file-invoice"></i> Invoice
                </button>
            </td>
        `;
        expensesTableBody.appendChild(tr);
    });
}

// Add/Update Expense
if (addExpenseForm) {
    addExpenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const expenseData = {
            category: document.getElementById('expenseCategory').value,
            amount: parseFloat(document.getElementById('expenseAmount').value),
            date: document.getElementById('expenseDate').value,
            description: document.getElementById('expenseDescription').value
        };

        try {
            let response;
            if (editingId) {
                response = await fetch(`/api/expenses/${editingId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': localStorage.getItem('token')
                    },
                    body: JSON.stringify(expenseData)
                });
            } else {
                response = await fetch('/api/expenses', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': localStorage.getItem('token')
                    },
                    body: JSON.stringify(expenseData)
                });
            }

            if (response.ok) {
                addExpenseForm.reset();
                resetExpenseEditMode();
                fetchExpenses();
                if (typeof fetchStats === 'function') fetchStats();
            } else {
                alert('Error saving expense');
            }
        } catch (err) {
            console.error('Error saving expense:', err);
        }
    });
}

window.editExpense = function (id) {
    const expense = expensesData.find(e => e.id === id);
    if (!expense) return;

    document.getElementById('expenseCategory').value = expense.category;
    document.getElementById('expenseAmount').value = expense.amount;
    document.getElementById('expenseDate').value = expense.date.split('T')[0];
    document.getElementById('expenseDescription').value = expense.description || '';

    editingId = id;
    if (submitBtn) {
        submitBtn.innerText = 'Update Expense';
        submitBtn.innerText = 'Update Expense';
    }

    if (!document.getElementById('btn-cancel-expense-edit')) {
        const cancelBtn = document.createElement('button');
        cancelBtn.id = 'btn-cancel-expense-edit';
        cancelBtn.type = 'button';
        cancelBtn.innerText = 'Cancel';
        cancelBtn.className = 'btn-action';
        cancelBtn.style.color = 'white';
        cancelBtn.style.color = 'white';
        cancelBtn.style.gridColumn = 'span 3';
        cancelBtn.onclick = resetExpenseEditMode;
        addExpenseForm.appendChild(cancelBtn);
    }

    addExpenseForm.scrollIntoView({ behavior: 'smooth' });
};

function resetExpenseEditMode() {
    editingId = null;
    if (submitBtn) {
        submitBtn.innerText = 'Add Expense';
        submitBtn.innerText = 'Add Expense';
    }
    const cancelBtn = document.getElementById('btn-cancel-expense-edit');
    if (cancelBtn) cancelBtn.remove();
    addExpenseForm.reset();
}

// Delete Expense
window.deleteExpense = async function (id) {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
        const response = await fetch(`/api/expenses/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': localStorage.getItem('token') }
        });

        if (response.ok) {
            fetchExpenses();
            if (typeof fetchStats === 'function') fetchStats();
            if (editingId === id) resetExpenseEditMode();
        } else {
            const result = await response.json();
            alert(result.message || 'Error deleting expense');
        }
    } catch (err) {
        console.error('Error deleting expense:', err);
    }
};

window.downloadExpenseInvoice = async function (id) {
    if (!window.jspdf) {
        alert("PDF generator not loaded. Please refresh the page.");
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const expense = expensesData.find(e => e.id === id);
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

        // --- Table of Items ---
        const tableData = [[
            expense.category,
            expense.description || 'No description provided',
            `$${expense.amount.toFixed(2)}`
        ]];

        doc.autoTable({
            startY: 65,
            head: [['Category', 'Description', 'Amount']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [39, 174, 96] }, // AgriConnect Green header
            margin: { top: 10 }
        });

        // --- Summary ---
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`Total Expense: $${expense.amount.toFixed(2)}`, 150, finalY);

        // --- Footer ---
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text("This is a computer generated document for internal record keeping.", 105, 280, { align: "center" });

        // Save
        doc.save(`AgriConnect_Expense_Voucher_${expense.id}.pdf`);

    } catch (err) {
        console.error('Error generating voucher:', err);
        alert('Failed to generate expense voucher.');
    }
};
