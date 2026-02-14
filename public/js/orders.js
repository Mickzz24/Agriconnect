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
    const userRole = localStorage.getItem('role');

    orders.forEach(order => {
        const tr = document.createElement('tr');

        // Items summary
        const itemsSummary = order.items ? order.items.map(i =>
            `${i.Inventory ? i.Inventory.item_name : 'Unknown'} (x${i.quantity})`
        ).join(', ') : 'No items';

        const currentType = order.order_type || 'Offline';
        const typeBadge = currentType === 'Online'
            ? `<span style="background: #e3f2fd; color: #1976d2; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600;"><i class="fas fa-globe"></i> Online</span>`
            : `<span style="background: #f5f5f5; color: #616161; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600;"><i class="fas fa-store"></i> Offline</span>`;

        // Role-based status display
        let statusContent = '';
        if (userRole === 'owner' || userRole === 'staff') {
            statusContent = `
                <select onchange="window.updateOrderStatus(${order.id}, this.value)">
                    <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="Packed" ${order.status === 'Packed' ? 'selected' : ''}>Packed</option>
                    <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                    <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>`;
        } else {
            const statusColors = {
                'Pending': '#f39c12',
                'Packed': '#3498db',
                'Shipped': '#9b59b6',
                'Delivered': '#27ae60',
                'Cancelled': '#e74c3c'
            };
            statusContent = `<span style="color: ${statusColors[order.status] || '#2c3e50'}; font-weight: 600;">${order.status}</span>`;
        }

        const actionButtons = userRole === 'owner' || userRole === 'staff'
            ? `<button class="btn-action btn-view" title="View"><i class="fas fa-eye"></i> View</button>
               <button class="btn-action btn-danger" title="Delete" onclick="deleteOrder(${order.id})"><i class="fas fa-trash"></i> Delete</button>`
            : `<button class="btn-action btn-view" title="Track" onclick="window.trackOrder(${order.id})"><i class="fas fa-search-location"></i> Track</button>`;

        tr.innerHTML = `
            <td>#${order.id}</td>
            <td>
                <strong>${order.items ? '' : order.customer_name}</strong>
                <small>${itemsSummary}</small>
            </td>
            <td>${typeBadge}</td>
            <td>${statusContent}</td>
            <td>$${order.total_amount.toFixed(2)}</td>
            <td>${new Date(order.createdAt).toLocaleDateString()}</td>
            <td>${actionButtons}</td>
        `;
        ordersTableBody.appendChild(tr);
    });
}

// Create Order
createOrderForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const customerNameInput = document.getElementById('customerName');
    const customerName = customerNameInput ? customerNameInput.value : 'Self';
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
            alert('Order placed successfully!');
            createOrderForm.reset();
            fetchOrders();
            populateProductSelect();
            if (typeof fetchStats === 'function') fetchStats();

            // Close form if in management view
            const toggleBtn = document.getElementById('toggle-order-form');
            const card = document.getElementById('order-form-card');
            if (toggleBtn && card) {
                card.style.display = 'none';
                toggleBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Create New Order';
                toggleBtn.style.backgroundColor = '#27ae60';
            }
        } else {
            alert(`Error: ${result.message}`);
        }
    } catch (err) {
        console.error('Error creating order:', err);
        alert('Server error creating order.');
    }
});

// Track Order Feature
window.trackOrder = async function (id) {
    const trackContent = document.getElementById('track-content');
    if (!trackContent) return;

    // Switch to track section if not already there
    const trackSec = document.getElementById('track-section');
    if (trackSec) {
        Object.values(sections || {}).forEach(sec => sec.style.display = 'none');
        trackSec.style.display = 'block';
        document.getElementById('page-title').innerText = 'Track Status';

        // Update active menu item
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.classList.remove('active');
            if (item.innerText.includes('Track Status')) item.classList.add('active');
        });
    }

    try {
        const response = await fetch('/api/orders', {
            headers: { 'Authorization': localStorage.getItem('token') }
        });
        const orders = await response.json();
        const order = orders.find(o => o.id === id);

        if (order) {
            const steps = ['Pending', 'Packed', 'Shipped', 'Delivered'];
            const currentIndex = steps.indexOf(order.status);

            let html = `
                <div style="text-align: left; max-width: 500px; margin: 0 auto;">
                    <h4>Order #${order.id} Tracking</h4>
                    <p style="margin-bottom: 30px;">Status: <strong>${order.status}</strong></p>
                    <div style="position: relative; padding-left: 30px; border-left: 2px solid #ddd;">
            `;

            steps.forEach((step, index) => {
                const isActive = index <= currentIndex;
                const isCurrent = index === currentIndex;
                html += `
                    <div style="margin-bottom: 25px; position: relative;">
                        <div style="position: absolute; left: -37px; top: 0; width: 14px; height: 14px; border-radius: 50%; background: ${isActive ? '#27ae60' : '#ddd'}; border: 4px solid white; box-shadow: 0 0 0 2px ${isActive ? '#27ae60' : '#ddd'};"></div>
                        <strong style="color: ${isActive ? '#2c3e50' : '#bdc3c7'};">${step}</strong>
                        ${isCurrent ? '<br><small style="color: #27ae60;">Currently at this stage</small>' : ''}
                    </div>
                `;
            });

            html += `</div></div>`;
            trackContent.innerHTML = html;
        }
    } catch (err) {
        console.error('Error tracking order:', err);
    }
};

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

window.deleteOrder = async function (id) {
    if (!confirm('Are you sure you want to delete this order?')) return;
    try {
        const response = await fetch(`/api/orders/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': localStorage.getItem('token') }
        });
        if (response.ok) {
            fetchOrders();
            if (typeof fetchStats === 'function') fetchStats();
        } else {
            alert('Error deleting order');
        }
    } catch (err) {
        console.error('Error deleting order:', err);
    }
};

// Initial load if on orders page (handled by dashboard.html, but safe to init vars)
