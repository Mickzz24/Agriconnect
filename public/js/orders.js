// public/js/orders.js

const ordersTableBody = document.getElementById('orders-table-body');
const createOrderForm = document.getElementById('create-order-form');
const orderProductSelect = document.getElementById('orderProductSelect');

// Make functions global for dashboard.html access
window.fetchOrders = async function () {
    try {
        const response = await fetch('/api/orders', {
            headers: { 'Authorization': localStorage.getItem('token') }
        });
        const orders = await response.json();
        renderOrders(orders);
    } catch (err) {
        console.error('Error fetching orders:', err);
    }
};

window.populateProductSelect = async function () {
    try {
        const response = await fetch('/api/inventory', {
            headers: { 'Authorization': localStorage.getItem('token') }
        });
        const products = await response.json();

        orderProductSelect.innerHTML = '<option value="">Select Product...</option>';
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.item_name} ($${product.unit_price} - Stock: ${product.quantity})`;
            if (product.quantity <= 0) {
                option.disabled = true;
                option.textContent += ' (Out of Stock)';
            }
            orderProductSelect.appendChild(option);
        });
    } catch (err) {
        console.error('Error fetching products for select:', err);
    }
};

function renderOrders(orders) {
    ordersTableBody.innerHTML = '';
    orders.forEach(order => {
        const tr = document.createElement('tr');

        // Items summary
        const itemsSummary = order.items ? order.items.map(i =>
            `${i.Inventory ? i.Inventory.item_name : 'Unknown'} (x${i.quantity})`
        ).join(', ') : 'No items';

        tr.innerHTML = `
            <td>#${order.id}</td>
            <td>
                <strong>${order.customer_name}</strong><br>
                <small>${itemsSummary}</small>
            </td>
            <td>
                <select onchange="window.updateOrderStatus(${order.id}, this.value)">
                    <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="Packed" ${order.status === 'Packed' ? 'selected' : ''}>Packed</option>
                    <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                    <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </td>
            <td>$${order.total_amount.toFixed(2)}</td>
            <td>${new Date(order.createdAt).toLocaleDateString()}</td>
            <td>
                <button class="btn-action btn-view">View</button>
            </td>
        `;
        ordersTableBody.appendChild(tr);
    });
}

// Create Order
createOrderForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const customerName = document.getElementById('customerName').value;
    const productId = orderProductSelect.value;
    const quantity = parseInt(document.getElementById('orderQuantity').value);

    if (!productId || quantity <= 0) {
        alert("Please select a valid product and quantity.");
        return;
    }

    const orderData = {
        customer_name: customerName,
        items: [
            { inventoryId: productId, quantity: quantity }
        ]
    };

    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('token')
            },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();

        if (response.ok) {
            alert('Order created successfully!');
            createOrderForm.reset();
            fetchOrders();
            populateProductSelect(); // Update stock info in dropdown
        } else {
            alert(`Error: ${result.message}`);
        }
    } catch (err) {
        console.error('Error creating order:', err);
        alert('Server error creating order.');
    }
});

// Update Status
window.updateOrderStatus = async function (orderId, newStatus) {
    try {
        const response = await fetch(`/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('token')
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) {
            alert('Failed to update status');
            fetchOrders(); // Revert UI
        }
    } catch (err) {
        console.error('Error updating status:', err);
    }
};

// Initial load if on orders page (handled by dashboard.html, but safe to init vars)
