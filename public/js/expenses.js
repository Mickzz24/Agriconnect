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
            alert('Error deleting expense');
        }
    } catch (err) {
        console.error('Error deleting expense:', err);
    }
};
