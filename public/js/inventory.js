document.addEventListener('DOMContentLoaded', () => {
    const addForm = document.getElementById('add-inventory-form');

    // Make fetchInventory global
    window.fetchInventory = async function () {
        try {
            const response = await fetch('/api/inventory');
            const items = await response.json();
            renderTable(items);
        } catch (error) {
            console.error('Error fetching inventory:', error);
        }
    };

    function renderTable(items) {
        const tableBody = document.querySelector('#inventory-table tbody');
        if (!tableBody) return;

        tableBody.innerHTML = '';
        items.forEach(item => {
            const tr = document.createElement('tr');
            // Highlight low stock
            if (item.quantity <= item.threshold) {
                tr.classList.add('low-stock');
            }

            tr.innerHTML = `
                <td>${item.item_name}</td>
                <td>${item.category}</td>
                <td>${item.quantity}</td>
                <td>$${item.unit_price.toFixed(2)}</td>
                <td>$${(item.cost_price || 0).toFixed(2)}</td>
                <td>
                    <button class="btn-action btn-edit" onclick="editItem(${item.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn-action btn-danger" onclick="deleteItem(${item.id})"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // Add New Item
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const newItem = {
                item_name: document.getElementById('itemName').value,
                category: document.getElementById('itemCategory').value,
                quantity: parseInt(document.getElementById('itemQuantity').value),
                unit_price: parseFloat(document.getElementById('itemPrice').value),
                cost_price: parseFloat(document.getElementById('itemCost').value) || 0,
                threshold: parseInt(document.getElementById('itemThreshold').value)
            };

            try {
                const response = await fetch('/api/inventory', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newItem)
                });
                if (response.ok) {
                    addForm.reset();
                    fetchInventory();
                } else {
                    alert('Error adding item');
                }
            } catch (error) {
                console.error('Error adding item:', error);
            }
        });
    }

    // Initial load if active
    if (document.getElementById('inventory-section').style.display !== 'none') {
        fetchInventory();
    }
});

window.deleteItem = async function (id) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
        const response = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
        if (response.ok) {
            fetchInventory();
        }
    } catch (error) {
        console.error('Error deleting item:', error);
    }
};

window.editItem = function (id) {
    alert('Edit feature pending');
};
