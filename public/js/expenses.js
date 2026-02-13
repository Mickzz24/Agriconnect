// public/js/expenses.js

const expensesTableBody = document.getElementById('expenses-table-body');
const addExpenseForm = document.getElementById('add-expense-form');

// Global function for dashboard access
window.fetchExpenses = async function () {
    try {
        const response = await fetch('/api/expenses', {
            headers: { 'Authorization': localStorage.getItem('token') }
        });
        const expenses = await response.json();
        renderExpenses(expenses);
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
                <button class="btn-action btn-danger" onclick="deleteExpense(${expense.id})">Delete</button>
            </td>
        `;
        expensesTableBody.appendChild(tr);
    });
}

// Add Expense
if (addExpenseForm) {
    addExpenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const category = document.getElementById('expenseCategory').value;
        const amount = parseFloat(document.getElementById('expenseAmount').value);
        const date = document.getElementById('expenseDate').value;
        const description = document.getElementById('expenseDescription').value;

        try {
            const response = await fetch('/api/expenses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': localStorage.getItem('token')
                },
                body: JSON.stringify({ category, amount, date, description })
            });

            if (response.ok) {
                alert('Expense added successfully!');
                addExpenseForm.reset();
                fetchExpenses();
            } else {
                alert('Error adding expense');
            }
        } catch (err) {
            console.error('Error adding expense:', err);
        }
    });
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
        } else {
            alert('Error deleting expense');
        }
    } catch (err) {
        console.error('Error deleting expense:', err);
    }
};
