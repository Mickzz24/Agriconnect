document.addEventListener('DOMContentLoaded', () => {
    const addForm = document.getElementById('add-inventory-form');
    const submitBtn = addForm.querySelector('button[type="submit"]');
    let editingId = null;
    let inventoryData = [];

    // Make fetchInventory global
    window.fetchInventory = async function () {
        try {
            const response = await fetch('/api/inventory');
            inventoryData = await response.json();
            renderTable(inventoryData);
        } catch (error) {
            console.error('Error fetching inventory:', error);
        }
    };

    function renderTable(items) {
        renderMgtTable(items);
        renderOpsTable(items);
    }

    function renderMgtTable(items) {
        const tableBody = document.querySelector('#inventory-table-mgt tbody');
        if (!tableBody) return;

        tableBody.innerHTML = '';
        items.forEach(item => {
            const tr = document.createElement('tr');
            if (item.quantity <= item.threshold) tr.classList.add('low-stock');

            tr.innerHTML = `
                <td><strong>${item.item_name}</strong></td>
                <td>${item.category}</td>
                <td>
                    <button class="btn-action btn-edit" title="Edit" onclick="editItem(${item.id})"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn-action btn-danger" title="Delete" onclick="deleteItem(${item.id})"><i class="fas fa-trash"></i> Delete</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    function renderOpsTable(items) {
        const tableBody = document.querySelector('#inventory-table-ops tbody');
        if (!tableBody) return;

        tableBody.innerHTML = '';
        items.forEach(item => {
            const tr = document.createElement('tr');
            if (item.quantity <= item.threshold) tr.classList.add('low-stock');

            tr.innerHTML = `
                <td><strong>${item.item_name}</strong></td>
                <td>
                    <span class="badge ${item.quantity <= item.threshold ? 'bg-danger' : 'bg-success'}">
                        ${item.quantity} units
                    </span>
                </td>
                <td><span style="color: #27ae60; font-weight: 600;">$${item.unit_price.toFixed(2)}</span></td>
                <td>$${(item.cost_price || 0).toFixed(2)}</td>
                <td>
                    <button class="btn-action btn-edit" onclick="editItem(${item.id})"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn-action btn-danger" onclick="deleteItem(${item.id})"><i class="fas fa-trash"></i> Delete</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // Add / Update Item
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const itemData = {
                item_name: document.getElementById('itemName').value,
                category: document.getElementById('itemCategory').value,
                quantity: parseInt(document.getElementById('itemQuantity').value),
                unit_price: parseFloat(document.getElementById('itemPrice').value),
                cost_price: parseFloat(document.getElementById('itemCost').value) || 0,
                threshold: parseInt(document.getElementById('itemThreshold').value)
            };

            try {
                let response;
                if (editingId) {
                    // Update existing item
                    response = await fetch(`/api/inventory/${editingId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(itemData)
                    });
                } else {
                    // Add new item
                    response = await fetch('/api/inventory', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(itemData)
                    });
                }

                if (response.ok) {
                    addForm.reset();
                    resetEditMode();
                    fetchInventory();

                    // Close form after success
                    const toggleBtn = document.getElementById('toggle-product-form');
                    const card = document.getElementById('product-form-card');
                    if (toggleBtn && card) {
                        card.style.display = 'none';
                        toggleBtn.innerHTML = '<i class="fas fa-plus"></i> Add New Product';
                        toggleBtn.style.backgroundColor = '#27ae60';
                    }
                } else {
                    const err = await response.json();
                    alert(`Error: ${err.error || 'Operation failed'}`);
                }
            } catch (error) {
                console.error('Error saving item:', error);
            }
        });
    }

    window.editItem = function (id) {
        const item = inventoryData.find(i => i.id === id);
        if (!item) return;

        // Fill form
        document.getElementById('itemName').value = item.item_name;
        document.getElementById('itemCategory').value = item.category;
        document.getElementById('itemQuantity').value = item.quantity;
        document.getElementById('itemPrice').value = item.unit_price;
        document.getElementById('itemCost').value = item.cost_price || 0;
        document.getElementById('itemThreshold').value = item.threshold;

        // Change UI to Edit mode
        editingId = id;
        submitBtn.innerText = 'Update Item';

        // Ensure form is visible
        const toggleBtn = document.getElementById('toggle-product-form');
        const card = document.getElementById('product-form-card');
        if (card && card.style.display === 'none') {
            card.style.display = 'block';
            if (toggleBtn) {
                toggleBtn.innerHTML = '<i class="fas fa-times"></i> Close Form';
                toggleBtn.style.backgroundColor = '#e74c3c';
            }
        }

        // Add Cancel button if not exists
        if (!document.getElementById('btn-cancel-edit')) {
            const cancelBtn = document.createElement('button');
            cancelBtn.id = 'btn-cancel-edit';
            cancelBtn.type = 'button';
            cancelBtn.innerText = 'Cancel';
            cancelBtn.style.backgroundColor = '#95a5a6';
            cancelBtn.style.marginLeft = '10px';
            cancelBtn.onclick = resetEditMode;
            addForm.appendChild(cancelBtn);
        }

        // Scroll to form
        addForm.scrollIntoView({ behavior: 'smooth' });
    };

    function resetEditMode() {
        editingId = null;
        submitBtn.innerText = 'Add Item';
        const cancelBtn = document.getElementById('btn-cancel-edit');
        if (cancelBtn) cancelBtn.remove();
        addForm.reset();
    }

    window.deleteItem = async function (id) {
        if (!confirm('Are you sure you want to delete this item?')) return;
        try {
            const response = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
            if (response.ok) {
                fetchInventory();
                if (editingId === id) resetEditMode();
            } else {
                alert('Error deleting item');
            }
        } catch (error) {
            console.error('Error deleting item:', error);
        }
    };

    // Initial load if active
    if (document.getElementById('inventory-section').style.display !== 'none') {
        fetchInventory();
    }
});
