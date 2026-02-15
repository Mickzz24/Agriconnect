// public/js/deliverer.js

window.getAuthToken = () => localStorage.getItem('token');

window.fetchDelivererStats = async function () {
    const token = window.getAuthToken();
    if (!token) return;

    try {
        const response = await fetch('/api/orders', {
            headers: { 'Authorization': token }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const orders = await response.json();
        if (!Array.isArray(orders)) {
            console.error("Orders is not an array:", orders);
            return;
        }

        const todayDate = new Date().toLocaleDateString();

        const assignedToday = orders.filter(o => {
            try {
                return new Date(o.createdAt).toLocaleDateString() === todayDate &&
                    (o.status === 'Shipped' || o.status === 'Packed');
            } catch (e) { return false; }
        }).length;

        const inTransit = orders.filter(o => o.status === 'Shipped').length;
        const completed = orders.filter(o => o.status === 'Delivered').length;

        document.getElementById('stat-assigned').innerText = assignedToday;
        document.getElementById('stat-transit').innerText = inTransit;
        document.getElementById('stat-completed').innerText = completed;

        // Priority List
        const priorityList = document.getElementById('priority-list');
        const priorityOrders = orders.filter(o => o.status === 'Packed' || o.status === 'Shipped').slice(0, 5);

        if (priorityOrders.length === 0) {
            priorityList.innerHTML = '<p style="text-align: center; color: #95a5a6; padding: 20px;">No urgent deliveries assigned.</p>';
        } else {
            priorityList.innerHTML = priorityOrders.map(o => `
                <div style="background: #f8f9fa; padding: 15px; border-radius: 12px; margin-bottom: 12px; border-left: 5px solid ${o.status === 'Shipped' ? '#f39c12' : '#3498db'}; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong style="display: block; color: #2c3e50;">Order #${o.id} - ${o.customer_name}</strong>
                            <small style="color: #7f8c8d;">${o.deliveryAddress || 'Address not set'}</small>
                        </div>
                        <span style="background: ${o.status === 'Shipped' ? '#f39c12' : '#3498db'}; color: white; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">${o.status}</span>
                    </div>
                </div>
            `).join('');
        }

        // Header update
        try {
            const profileRes = await fetch('/api/user/profile', { headers: { 'Authorization': token } });
            if (profileRes.ok) {
                const profileData = await profileRes.json();
                document.getElementById('userName').innerText = profileData.username;
            }
        } catch (e) { console.error("Profile refresh error:", e); }

    } catch (err) {
        console.error("Error fetching deliverer stats:", err);
    }
};

window.fetchDeliveries = async function () {
    const token = window.getAuthToken();
    if (!token) return;

    try {
        const response = await fetch('/api/orders', {
            headers: { 'Authorization': token }
        });

        if (!response.ok) throw new Error("Failed to fetch deliveries");

        const orders = await response.json();
        const tbody = document.getElementById('deliveries-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!Array.isArray(orders) || orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 30px; color: #95a5a6;">No deliveries found in your log.</td></tr>';
            return;
        }

        orders.forEach(o => {
            const tr = document.createElement('tr');

            let actionBtn = '';
            if (o.status === 'Packed') {
                actionBtn = `<button class="btn-action" style="background: #3498db; color: white; border:none; padding: 8px 15px; border-radius: 5px; cursor: pointer;" onclick="window.updateDeliveryStatus(${o.id}, 'Shipped')">Start Delivery</button>`;
            } else if (o.status === 'Shipped') {
                actionBtn = `<button class="btn-action" style="background: #27ae60; color: white; border:none; padding: 8px 15px; border-radius: 5px; cursor: pointer;" onclick="window.updateDeliveryStatus(${o.id}, 'Delivered')">Mark Delivered</button>`;
            } else {
                actionBtn = `<span style="color: #bdc3c7; font-style: italic;">No Action</span>`;
            }

            tr.innerHTML = `
                <td>#${o.id}</td>
                <td style="font-weight: 600;">${o.customer_name}</td>
                <td style="font-size: 0.85rem;">${o.deliveryAddress || '<span style="color: #999;">Not Provided</span>'}</td>
                <td>${o.contactNumber || 'N/A'}</td>
                <td style="font-weight: 600;">$${(o.total_amount || 0).toFixed(2)}</td>
                <td><span class="badge" style="background: #f8f9fa; color: #2c3e50; border: 1px solid #ddd; padding: 2px 8px;">${o.payment_method || 'COD'}</span></td>
                <td><span style="font-weight: 600; color: ${getStatusColor(o.status)}">${o.status}</span></td>
                <td>${actionBtn}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error("Error fetching deliveries:", err);
    }
};

window.updateDeliveryStatus = async function (id, newStatus) {
    const token = window.getAuthToken();
    if (!confirm(`Are you sure you want to change status to ${newStatus}?`)) return;

    try {
        const response = await fetch(`/api/orders/${id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            window.fetchDeliveries();
            window.fetchDelivererStats();
        } else {
            const data = await response.json();
            alert(data.message || "Update failed");
        }
    } catch (err) {
        console.error("Update error:", err);
    }
};

function getStatusColor(status) {
    const colors = {
        'Pending': '#f39c12',
        'Packed': '#3498db',
        'Shipped': '#e67e22',
        'Delivered': '#27ae60',
        'Cancelled': '#e74c3c'
    };
    return colors[status] || '#7f8c8d';
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('stat-assigned')) {
        window.fetchDelivererStats();
    }
});

