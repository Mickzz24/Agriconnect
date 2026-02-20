const fulfillmentTableBody = document.getElementById('fulfillment-table-body');
const pendingTableBody = document.getElementById('pending-orders-table-body');
const ordersTableBody = document.getElementById('orders-table-body'); // User dashboard
const ownerFulfillmentBody = document.getElementById('owner-fulfillment-table-body'); // Owner dashboard
const createOrderForm = document.getElementById('create-order-form');

// Hierarchical Data for filtering (matching inventory.js)
const subCategories = {
    'Organic Vegetable': ['Leafy Vegetables', 'Regular Vegetables', 'Seasonal / Special', 'Seeds & Pulses', 'General'],
    'Dairy Product': ['Milk Products', 'Processed Dairy', 'Value-added Products', 'General'],
    'Livestock': ['Farm Animals'],
    'Fruits': ['Seasonal Fruits', 'Exotic Fruits', 'General'],
    'Grains & Crops': ['Organic Grains', 'Cereals', 'General']
};

let currentInventory = [];

// Make functions global for dashboard.html access
window.fetchOrders = async function () {
    try {
        const response = await fetch('/api/orders', {
            headers: { 'Authorization': localStorage.getItem('token') }
        });
        const data = await response.json();
        // Sort by id descending to show latest at the top
        const orders = data.sort((a, b) => b.id - a.id);
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
        currentInventory = await response.json();
        setupOrderFormLogic();
    } catch (err) {
        console.error('Error fetching products for sale form:', err);
    }
};

function setupOrderFormLogic() {
    const mainEl = document.getElementById('orderCategory'); // Changed from orderMainCategory
    const itemEl = document.getElementById('orderItemNameSelect');
    const invIdEl = document.getElementById('orderInventoryId');
    const priceInput = document.getElementById('orderPrice');
    const stockPreview = document.getElementById('stockPreview');

    if (!mainEl) return;

    mainEl.onchange = function () {
        const selectedCategory = this.value;
        itemEl.innerHTML = '<option value="">Select Item...</option>';
        itemEl.disabled = !selectedCategory;
        invIdEl.value = '';
        priceInput.value = '';
        stockPreview.innerText = 'Available Stock: --';

        if (selectedCategory) {
            console.log(`Filtering for Category: "${selectedCategory}"`);

            const filtered = currentInventory.filter(item => {
                const itemCat = (item.category || '').toLowerCase();
                const targetCat = selectedCategory.toLowerCase();

                // Flexible matching: "Organic Vegetable" matches "Organic Vegetable - Leafy"
                return itemCat.includes(targetCat) || targetCat.includes(itemCat.split(' - ')[0]);
            });

            console.log(`Found ${filtered.length} products`);

            filtered.forEach(item => {
                const unit = item.unit || 'kg';
                const opt = document.createElement('option');
                opt.value = item.id;
                opt.textContent = `${item.item_name} (Stock: ${item.quantity} ${unit})`;

                if (item.quantity <= 0) {
                    opt.disabled = true;
                    opt.textContent += ' - Out of Stock';
                    opt.style.color = 'red';
                }
                itemEl.appendChild(opt);
            });
        }
    };



    itemEl.onchange = function () {
        const selectedId = parseInt(this.value);
        const item = currentInventory.find(i => i.id === selectedId);
        if (item) {
            const unit = item.unit || 'kg';
            invIdEl.value = item.id;
            priceInput.value = item.unit_price.toFixed(2);
            stockPreview.innerHTML = `<strong>Current Stock:</strong> ${item.quantity} <span style="color:#27ae60; font-weight:600;">${unit}</span>`;
        } else {
            invIdEl.value = '';
            priceInput.value = '';
            stockPreview.innerText = 'Available Stock: --';
        }
    };
}

// Create Order (Farm Sale)
if (createOrderForm) {
    createOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const customerName = document.getElementById('customerName').value || 'Self';
        const inventoryId = document.getElementById('orderInventoryId').value;
        const quantity = parseInt(document.getElementById('orderQuantity').value);
        const customPrice = parseFloat(document.getElementById('orderPrice').value);

        if (!inventoryId || quantity <= 0) {
            alert("Please select a product and valid quantity.");
            return;
        }

        const orderData = {
            customer_name: customerName,
            status: 'Delivered', // Farm sales are completed immediately
            items: [
                { inventoryId: parseInt(inventoryId), quantity: quantity, price: customPrice }
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
                alert('Sale registered successfully!');
                createOrderForm.reset();
                if (typeof fetchOrders === 'function') fetchOrders();
                if (typeof window.fetchInventory === 'function') window.fetchInventory();
                if (typeof fetchStats === 'function') fetchStats();

                // Reset form visibility
                const card = document.getElementById('order-form-card');
                const toggleBtn = document.getElementById('toggle-order-form');
                if (card) {
                    card.style.display = 'none';
                    if (toggleBtn) {
                        toggleBtn.innerHTML = '<i class="fas fa-plus"></i> Register Farm Sale';
                        toggleBtn.style.background = '#27ae60';
                    }
                }
            } else {
                alert(`Error: ${result.message}`);
            }
        } catch (err) {
            console.error('Error creating order:', err);
            alert('Server error creating order.');
        }
    });
}

// Add real-time total calculation
const orderQtyInput = document.getElementById('orderQuantity');
const orderPriceInput = document.getElementById('orderPrice');

if (orderQtyInput && orderPriceInput) {
    const updateTotal = () => {
        const qty = parseFloat(orderQtyInput.value) || 0;
        const price = parseFloat(orderPriceInput.value) || 0;
        const total = (qty * price).toFixed(2);
        const stockPrev = document.getElementById('stockPreview');
        if (stockPrev) {
            const currentText = stockPrev.innerHTML.split('<br>')[0];
            stockPrev.innerHTML = `${currentText}<br><strong style="color: #2c3e50;">Estimate Total: $${total}</strong>`;
        }
    };
    orderQtyInput.addEventListener('input', updateTotal);
    orderPriceInput.addEventListener('input', updateTotal);
}

function renderOrders(orders) {
    const userRole = localStorage.getItem('role');

    // Clear all tables
    if (ordersTableBody) ordersTableBody.innerHTML = '';
    if (fulfillmentTableBody) fulfillmentTableBody.innerHTML = '';
    if (pendingTableBody) pendingTableBody.innerHTML = '';
    if (ownerFulfillmentBody) ownerFulfillmentBody.innerHTML = '';

    orders.forEach(order => {
        const tr = document.createElement('tr');

        // Primary product info for summary
        let primaryProduct = 'No items';
        let primaryQty = '--';
        if (order.items && order.items.length > 0) {
            const firstItem = order.items[0];
            primaryProduct = firstItem.Inventory ? firstItem.Inventory.item_name : 'Unknown Product';
            primaryQty = `${firstItem.quantity} ${firstItem.Inventory ? (firstItem.Inventory.unit || 'kg') : ''}`;
            if (order.items.length > 1) {
                primaryProduct += ` (+${order.items.length - 1} more)`;
            }
        }
        const currentType = order.order_type || 'Offline';
        const typeBadge = currentType === 'Online'
            ? `<span style="background: #e3f2fd; color: #1976d2; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600;"><i class="fas fa-globe"></i> Online</span>`
            : `<span style="background: #e8f5e9; color: #2e7d32; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 700; border: 1px solid #c8e6c9;"><i class="fas fa-tractor"></i> Farm Sale</span>`;

        // Action Buttons Setup
        let actionsHtml = '';
        if (userRole === 'owner' || userRole === 'staff') {
            if (order.status === 'Pending') {
                actionsHtml = `
                    <button class="btn-action btn-icon btn-approve" onclick="window.approveOrder(${order.id})" title="Approve">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn-action btn-icon btn-danger" onclick="window.updateOrderStatus(${order.id}, 'Cancelled')" title="Reject">
                        <i class="fas fa-times"></i>
                    </button>`;
            } else {
                actionsHtml = `
                    <button class="btn-action btn-icon btn-danger" onclick="window.deleteOrder(${order.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>`;

                if (order.status === 'Delivered') {
                    actionsHtml += `
                    <button class="btn-action btn-icon btn-approve" onclick="window.downloadInvoice(${order.id})" title="Invoice">
                        <i class="fas fa-file-invoice"></i>
                    </button>`;
                }
            }
        } else {
            const isShipped = order.status === 'Shipped' || order.status === 'Delivered';
            actionsHtml = `
                <button class="btn-action btn-icon btn-view" title="Track" onclick="window.trackOrder(${order.id})"><i class="fas fa-search-location"></i></button>
                <button class="btn-action btn-icon ${isShipped ? 'btn-edit' : ''}" title="Download Invoice" 
                        onclick="window.downloadInvoice(${order.id})" 
                        style="cursor: ${isShipped ? 'pointer' : 'not-allowed'};" 
                        ${isShipped ? '' : 'disabled'}>
                    <i class="fas fa-file-invoice"></i>
                </button>`;
        }

        // Status Selection (Only for Fulfillment Table)
        let statusContent = '';
        const statusColors = {
            'Pending': '#f39c12',
            'Approved': '#2ecc71',
            'Packed': '#3498db',
            'Shipped': '#9b59b6',
            'Delivered': '#27ae60',
            'Cancelled': '#e74c3c'
        };

        if (userRole === 'owner' || userRole === 'staff') {
            statusContent = `
                <select onchange="window.updateOrderStatus(${order.id}, this.value)" style="padding: 4px; border-radius: 4px; border: 1px solid #ddd;">
                    <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="Approved" ${order.status === 'Approved' ? 'selected' : ''}>Approved</option>
                    <option value="Packed" ${order.status === 'Packed' ? 'selected' : ''}>Packed</option>
                    <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                    <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                </select>`;
        } else {
            statusContent = `<span style="color: ${statusColors[order.status] || '#2c3e50'}; font-weight: 600;">${order.status}</span>`;
        }

        // Route row to correct table
        if (order.status === 'Pending' && pendingTableBody) {
            tr.innerHTML = `
                <td>#${order.id}</td>
                <td style="font-weight: 600;">${order.customer_name || 'Customer'}</td>
                <td>${primaryProduct}</td>
                <td><span class="badge" style="background: #fdf2f2; color: #9b1c1c;">${primaryQty}</span></td>
                <td style="font-weight: 600;">$${order.total_amount.toFixed(2)}</td>
                <td>${typeBadge}</td>
                <td style="font-size: 0.85rem;">${new Date(order.createdAt).toLocaleDateString()}</td>
                <td style="white-space: nowrap;"><div class="action-buttons">${actionsHtml}</div></td>
            `;
            pendingTableBody.appendChild(tr);
        } else if (fulfillmentTableBody || ownerFulfillmentBody) {
            // Render to either Staff Fulfillment or Owner Dashboard (Identical 9-column Fulfillment Table)
            tr.innerHTML = `
                <td>#${order.id}</td>
                <td style="font-weight: 600;">${order.customer_name || 'Customer'}</td>
                <td>${primaryProduct}</td>
                <td><span class="badge" style="background: #e8f5e9; color: #2e7d32;">${primaryQty}</span></td>
                <td style="font-weight: 600;">$${order.total_amount.toFixed(2)}</td>
                <td>${typeBadge}</td>
                <td style="font-size: 0.85rem;">${new Date(order.createdAt).toLocaleDateString()}</td>
                <td><div class="action-buttons">${statusContent}</div></td>
                <td><div class="action-buttons">${actionsHtml}</div></td>
            `;
            if (fulfillmentTableBody) fulfillmentTableBody.appendChild(tr);
            if (ownerFulfillmentBody) ownerFulfillmentBody.appendChild(tr.cloneNode(true));
        } else if (ordersTableBody) {
            // User order history
            tr.innerHTML = `
                <td>#${order.id}</td>
                <td>${primaryProduct}</td>
                <td>$${order.total_amount.toFixed(2)}</td>
                <td>${statusContent}</td>
                <td>${new Date(order.createdAt).toLocaleDateString()}</td>
                <td><div class="action-buttons">${actionsHtml}</div></td>
            `;
            ordersTableBody.appendChild(tr);
        }
    });
}

window.approveOrder = async function (id) {
    if (!confirm('Approve this order and move to fulfillment?')) return;
    window.updateOrderStatus(id, 'Packed');
};

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
    let delivererId = null;

    if (newStatus === 'Shipped') {
        try {
            const res = await fetch('/api/users/deliverers', {
                headers: { 'Authorization': localStorage.getItem('token') }
            });
            const deliverers = await res.json();

            if (deliverers.length > 0) {
                const options = deliverers.map(d => `${d.id}: ${d.username}`).join('\n');
                const input = prompt(`Enter Deliverer ID for this shipment:\n\n${options}`, deliverers[0].id);
                if (input === null) return; // Cancelled
                delivererId = parseInt(input);
            } else {
                alert("No approved deliverers found. Please register/approve a deliverer first.");
                return;
            }
        } catch (e) {
            console.error("Error fetching deliverers:", e);
        }
    }

    try {
        const response = await fetch(`/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('token')
            },
            body: JSON.stringify({ status: newStatus, delivererId })
        });

        if (response.ok) {
            fetchOrders();
            if (typeof fetchStats === 'function') fetchStats();
        } else {
            const data = await response.json();
            alert(data.message || 'Failed to update status');
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
            const result = await response.json();
            alert(`Error deleting order: ${result.message || result.error}`);
        }
    } catch (err) {
        console.error('Error deleting order:', err);
    }
};

window.downloadInvoice = async function (id) {
    if (!window.jspdf) {
        alert("PDF generator not loaded. Please refresh the page.");
        return;
    }

    try {
        const jsPDF = window.jspdf.jsPDF || window.jspdf;
        const doc = new jsPDF();

        // Fetch orders to find the specific one
        const response = await fetch('/api/orders', {
            headers: { 'Authorization': localStorage.getItem('token') }
        });
        const orders = await response.json();
        const order = orders.find(o => o.id == id); // Loose comparison for string/number safety

        if (!order) return alert("Order data not found. Please try refreshing.");

        // --- Header & Branding ---
        doc.setFontSize(22);
        doc.setTextColor(39, 174, 96); // AgriConnect Green
        doc.text("AgriConnect: Organic & Dairy", 105, 20, { align: "center" });

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("Fresh from our Farm to your Family", 105, 27, { align: "center" });

        // --- Invoice Info ---
        doc.setDrawColor(200);
        doc.line(10, 35, 200, 35);

        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.setFont(undefined, 'bold');
        doc.text(`INVOICE: #INV-${order.id}`, 10, 45);
        doc.setFont(undefined, 'normal');
        doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 150, 45);
        doc.text(`Customer: ${order.customer_name || 'Valued Customer'}`, 10, 52);
        doc.text(`Order Type: ${order.order_type || 'Offline'}`, 10, 59);

        // --- Table of Items ---
        const tableData = (order.items || []).map(item => [
            item.Inventory ? item.Inventory.item_name : 'Item',
            `${item.quantity} ${item.Inventory ? (item.Inventory.unit || 'kg') : 'kg'}`,
            `$${(item.price || 0).toFixed(2)}`,
            `$${(item.quantity * (item.price || 0)).toFixed(2)}`
        ]);

        if (doc.autoTable) {
            doc.autoTable({
                startY: 65,
                head: [['Product Name', 'Quantity', 'Unit Price', 'Total']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [39, 174, 96] },
                margin: { top: 10 }
            });
        } else {
            // Fallback if autoTable plugin fails to attach
            let currentY = 75;
            doc.setFont(undefined, 'bold');
            doc.text('Product Name', 10, 70);
            doc.text('Total', 170, 70);
            doc.setFont(undefined, 'normal');
            tableData.forEach(row => {
                doc.text(row[0], 10, currentY);
                doc.text(row[3], 170, currentY);
                currentY += 8;
            });
        }

        // --- Summary ---
        const finalY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 150) + 10;
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`Grand Total: $${(order.total_amount || 0).toFixed(2)}`, 150, finalY);

        // --- Footer ---
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text("Thank you for choosing AgriConnect!", 105, 280, { align: "center" });

        doc.save(`AgriConnect_Invoice_${order.id}.pdf`);

    } catch (err) {
        console.error('Error generating invoice:', err);
        alert('Failed to generate invoice: ' + err.message);
    }
};

// Initial load if on orders page (handled by dashboard.html, but safe to init vars)
