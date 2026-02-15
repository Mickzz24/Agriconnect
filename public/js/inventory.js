document.addEventListener('DOMContentLoaded', () => {
    const addForm = document.getElementById('add-inventory-form');
    const submitBtn = addForm ? addForm.querySelector('button[type="submit"]') : null;
    const mainCategorySelect = document.getElementById('mainCategory');
    const subCategorySelect = document.getElementById('subCategory');

    const subCategories = {
        'Organic Vegetable': ['Leafy Vegetables', 'Regular Vegetables', 'Seasonal / Special', 'Seeds & Pulses', 'General'],
        'Dairy Product': ['Milk Products', 'Processed Dairy', 'Value-added Products', 'General'],
        'Livestock': ['Farm Animals'],
        'Fruits': ['Seasonal Fruits', 'Exotic Fruits', 'General'],
        'Grains & Crops': ['Organic Grains', 'Cereals', 'General']
    };


    const setupFormLogic = (mainId, subId, nameSelectId, nameInputId, expiryFieldId) => {
        const mainEl = document.getElementById(mainId);
        const subEl = document.getElementById(subId);
        const nameSelectEl = document.getElementById(nameSelectId);
        const nameInputEl = document.getElementById(nameInputId);
        const expiryFieldEl = document.getElementById(expiryFieldId);

        if (!mainEl || !subEl) return;

        const itemNames = {
            'Leafy Vegetables': ['Spinach', 'Coriander', 'Fenugreek', 'Lettuce', 'Cabbage', 'Peppers', 'Other'],
            'Regular Vegetables': ['Tomato', 'Potato', 'Onion', 'Eggplant', 'Cauliflower', 'Carrot', 'Green Peas', 'Capsicum', 'Radish', 'Okra', 'Other'],
            'Seasonal / Special': ['Pumpkin', 'Bottle Gourd', 'Ridge Gourd', 'Sweet Gourd', 'Sweet Corn', 'Other'],
            'Seeds & Pulses': ['Organic Rice', 'Organic Wheat', 'Organic Toor Dal', 'Organic Moong Dal', 'Other'],
            'Milk Products': ['Fresh Cow Milk', 'Buffalo Milk', 'Milk', 'In-process Dairy', 'Other'],
            'Processed Dairy': ['Paneer', 'Curd', 'Buttermilk', 'Cheese', 'Butter', 'Yogurt', 'Other'],
            'Value-added Products': ['Desi Ghee', 'Flavoured Milk', 'Condensed Milk', 'Mawa', 'Other'],
            'Farm Animals': ['Lamb', 'Beef', 'Pork', 'Chicken', 'Other'],
            'Seasonal Fruits': ['Oranges', 'Bananas', 'Apples', 'Blueberries', 'Grapes', 'Peaches', 'Strawberries', 'Other'],
            'Exotic Fruits': ['Dragon Fruit', 'Kiwi', 'Avocado', 'Other'],
            'Organic Grains': ['Rice', 'Rye', 'Oats', 'Corn', 'Wheat', 'Barley', 'Other'],
            'Cereals': ['Millet', 'Sorghum', 'Other']
        };

        mainEl.addEventListener('change', function () {
            const selectedMain = this.value;
            subEl.innerHTML = '<option value="">Select Sub-Category...</option>';
            if (nameSelectEl) {
                nameSelectEl.innerHTML = '<option value="">Select Item Name...</option>';
                nameSelectEl.disabled = true;
            }
            if (nameInputEl) nameInputEl.style.display = 'none';

            // Show expiry for Dairy and set default to +3 days
            if (expiryFieldEl) {
                const isDairy = selectedMain === 'Dairy Product';
                expiryFieldEl.style.display = isDairy ? 'block' : 'none';

                if (isDairy) {
                    const expiryInput = expiryFieldEl.querySelector('input[type="date"]');
                    if (expiryInput && !expiryInput.value) {
                        const date = new Date();
                        date.setDate(date.getDate() + 3);
                        expiryInput.value = date.toISOString().split('T')[0];
                    }
                }
            }

            if (selectedMain && subCategories[selectedMain]) {
                subEl.disabled = false;
                subCategories[selectedMain].forEach(sub => {
                    const option = document.createElement('option');
                    option.value = sub;
                    option.textContent = sub;
                    subEl.appendChild(option);
                });
            } else {
                subEl.disabled = true;
            }
        });

        subEl.addEventListener('change', function () {
            const selectedSub = this.value;
            if (nameSelectEl) {
                nameSelectEl.innerHTML = '<option value="">Select Item Name...</option>';
                if (nameInputEl) nameInputEl.style.display = 'none';

                if (selectedSub && itemNames[selectedSub]) {
                    nameSelectEl.disabled = false;
                    itemNames[selectedSub].forEach(item => {
                        const option = document.createElement('option');
                        option.value = item;
                        option.textContent = item;
                        nameSelectEl.appendChild(option);
                    });
                } else {
                    nameSelectEl.disabled = true;
                }
            }
        });

        if (nameSelectEl && nameInputEl) {
            nameSelectEl.addEventListener('change', function () {
                if (this.value === 'Other') {
                    nameInputEl.style.display = 'block';
                    nameInputEl.value = '';
                    nameInputEl.required = true;
                } else {
                    nameInputEl.style.display = 'none';
                    nameInputEl.required = false;
                    nameInputEl.value = this.value;
                }
            });
        }
    };

    // Initialize both possible forms
    setupFormLogic('mainCategory', 'subCategory', 'itemNameSelect', 'itemName', 'expiryField');
    setupFormLogic('secMainCategory', 'secSubCategory', 'secItemNameSelect', 'secItemName', 'secExpiryField');

    // Toggle for secondary stock form
    const secToggleBtn = document.getElementById('toggle-stock-form');
    const secFormCard = document.getElementById('quick-stock-form');
    if (secToggleBtn && secFormCard) {
        secToggleBtn.addEventListener('click', () => {
            const isHidden = secFormCard.style.display === 'none';
            secFormCard.style.display = isHidden ? 'block' : 'none';
            secToggleBtn.innerHTML = isHidden ? '<i class="fas fa-times"></i> Close Form' : '<i class="fas fa-boxes"></i> Add New Stock';
            secToggleBtn.style.backgroundColor = isHidden ? '#e74c3c' : '#3498db';
        });
    }

    let editingId = null;
    let inventoryData = [];

    // Make fetchInventory global
    window.fetchInventory = async function () {
        try {
            const response = await fetch('/api/inventory');
            inventoryData = await response.json();
            console.log('DEBUG: Inventory Data Received:', inventoryData);
            renderTable(inventoryData);
        } catch (error) {
            console.error('Error fetching inventory:', error);
        }
    };

    function renderTable(items) {
        if (items.length > 0) console.log('DEBUG: First item for render:', items[0]);
        renderMgtTable(items);
        renderOpsTable(items);
        window.checkLowStock(items); // Trigger alert check
    }

    window.checkLowStock = function (items) {
        const container = document.getElementById('global-alert-container');
        if (!container) return;

        container.innerHTML = ''; // Clear previous
        const lowStockItems = items.filter(i => i.quantity <= i.threshold);

        if (lowStockItems.length > 0) {
            lowStockItems.forEach(item => {
                const alertDiv = document.createElement('div');
                alertDiv.className = 'alert-box';
                alertDiv.style.cssText = `
                    background: #fff3cd; 
                    color: #856404; 
                    padding: 15px; 
                    border: 1px solid #ffeeba; 
                    border-radius: 8px; 
                    margin-bottom: 10px; 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
                `;
                alertDiv.innerHTML = `
                    <div>
                        <strong><i class="fas fa-exclamation-triangle"></i> Low Stock Alert:</strong> 
                        ${item.item_name} is running low (${item.quantity} ${item.unit || 'kg'} left).
                    </div>
                    <button onclick="this.parentElement.remove()" style="background:none; border:none; cursor:pointer; font-size:1.2rem; color:#856404;">&times;</button>
                `;
                container.appendChild(alertDiv);
            });
        }
    }

    function renderMgtTable(items) {
        const tableBody = document.querySelector('#inventory-table-mgt tbody');
        if (!tableBody) return;

        tableBody.innerHTML = '';
        items.forEach(item => {
            const tr = document.createElement('tr');

            // Stock Highlight logic
            let statusClass = '';
            let statusText = '';
            if (item.quantity === 0) {
                statusClass = 'out-of-stock';
                statusText = ' (Out of Stock)';
                tr.style.backgroundColor = 'rgba(231, 76, 60, 0.05)';
            } else if (item.quantity <= item.threshold) {
                statusClass = 'low-stock';
                statusText = ' (Low Stock)';
                tr.style.backgroundColor = 'rgba(241, 196, 15, 0.05)';
            }

            const catParts = (item.category || '').split(' - ');
            let productType = (catParts[0] || '').trim();

            // Robust check for Dairy
            const isDairy = /dairy/i.test(productType);
            if (isDairy) productType = 'Dairy Product';
            if (/organic/i.test(productType)) productType = 'Organic Vegetable';

            const productCategory = catParts[1] || '-';
            const totalPrice = (item.unit_price * item.quantity).toFixed(2);

            tr.innerHTML = `
                <td>${productType}</td>
                <td>${productCategory}</td>
                <td class="${statusClass}"><strong>${item.item_name}</strong>${statusText ? `<br><small style="color: #e74c3c;">${statusText}</small>` : ''}</td>
                <td>$${item.unit_price.toFixed(2)} / ${item.unit || 'kg'}</td>
                <td style="font-weight: 600; color: #2c3e50;">$${totalPrice}</td>
                <td>
                    <span class="badge ${item.quantity === 0 ? 'bg-danger' : (item.quantity <= item.threshold ? 'bg-warning' : 'bg-success')}">
                        ${item.quantity} ${item.unit || 'kg'}
                    </span>
                </td>
                <td style="color: #7f8c8d;">${item.threshold}</td>
                <td>${isDairy ? (item.expiry_date || '<span style="color:#e67e22;">Empty</span>') : '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action btn-edit" title="Edit" onclick="window.editItem(${item.id})"><i class="fas fa-edit"></i> Edit</button>
                        <button class="btn-action btn-danger" title="Delete" onclick="window.deleteItem(${item.id})"><i class="fas fa-trash"></i> Delete</button>
                    </div>
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

            let statusClass = '';
            let statusText = '';
            if (item.quantity === 0) {
                statusClass = 'out-of-stock';
                statusText = ' (Out of Stock)';
                tr.style.backgroundColor = 'rgba(231, 76, 60, 0.05)';
            } else if (item.quantity <= item.threshold) {
                statusClass = 'low-stock';
                statusText = ' (Low Stock)';
                tr.style.backgroundColor = 'rgba(241, 196, 15, 0.05)';
            }

            const catParts = (item.category || '').split(' - ');
            let productType = (catParts[0] || '').trim();
            const isDairy = /dairy/i.test(productType);
            if (isDairy) productType = 'Dairy Product';
            if (/organic/i.test(productType)) productType = 'Organic Vegetable';

            tr.innerHTML = `
                <td>${productType}</td>
                <td>${catParts[1] || '-'}</td>
                <td class="${statusClass}"><strong>${item.item_name}</strong>${statusText ? `<br><small style="color: #e74c3c;">${statusText}</small>` : ''}</td>
                <td>
                    <span class="badge ${item.quantity === 0 ? 'bg-danger' : (item.quantity <= item.threshold ? 'bg-warning' : 'bg-success')}">
                        ${item.quantity} ${item.unit || 'kg'}
                    </span>
                </td>
                <td><span style="color: #27ae60; font-weight: 600;">$${item.unit_price.toFixed(2)} / ${item.unit || 'kg'}</span></td>
                <td>${isDairy ? (item.expiry_date || '<span style="color:#e67e22;">Empty</span>') : '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action btn-edit" onclick="window.editItem(${item.id})"><i class="fas fa-edit"></i> Edit</button>
                        <button class="btn-action btn-danger" onclick="window.deleteItem(${item.id})"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    const handleItemSubmit = async (formPrefix, isEditing = false) => {
        const nameEl = document.getElementById(formPrefix === 'sec' ? 'secItemName' : 'itemName');
        const mainCatEl = document.getElementById(formPrefix === 'sec' ? 'secMainCategory' : 'mainCategory');
        const subCatEl = document.getElementById(formPrefix === 'sec' ? 'secSubCategory' : 'subCategory');
        const qtyEl = document.getElementById(formPrefix === 'sec' ? 'secItemQuantity' : 'itemQuantity');
        const priceEl = document.getElementById(formPrefix === 'sec' ? 'secItemPrice' : 'itemPrice');
        const unitEl = document.getElementById(formPrefix === 'sec' ? 'secItemUnit' : 'itemUnit');
        const threshEl = document.getElementById(formPrefix === 'sec' ? 'secItemThreshold' : 'itemThreshold');
        const expiryEl = document.getElementById(formPrefix === 'sec' ? 'secItemExpiry' : 'itemExpiry');

        let categoryValue = '';
        if (mainCatEl && subCatEl && mainCatEl.value && subCatEl.value) {
            categoryValue = `${mainCatEl.value} - ${subCatEl.value}`;
        }

        const itemData = {
            item_name: nameEl ? nameEl.value : '',
            category: categoryValue,
            unit_price: priceEl ? parseFloat(priceEl.value) : 0,
            unit: unitEl ? unitEl.value : 'kg',
            quantity: qtyEl ? parseInt(qtyEl.value) : 0,
            threshold: threshEl ? parseInt(threshEl.value) : 10,
            expiry_date: expiryEl ? expiryEl.value || null : null
        };

        try {
            let response;
            if (isEditing && editingId) {
                response = await fetch(`/api/inventory/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(itemData)
                });
            } else {
                response = await fetch('/api/inventory', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(itemData)
                });
            }

            if (response.ok) {
                const form = document.getElementById(formPrefix === 'sec' ? 'secondary-inventory-form' : 'add-inventory-form');
                if (form) form.reset();
                resetEditMode();
                fetchInventory();

                // Close cards
                if (formPrefix === 'sec') {
                    const secFormCard = document.getElementById('quick-stock-form');
                    const secToggleBtn = document.getElementById('toggle-stock-form');
                    if (secFormCard) secFormCard.style.display = 'none';
                    if (secToggleBtn) secToggleBtn.innerHTML = '<i class="fas fa-boxes"></i> Add New Stock';
                } else {
                    const card = document.getElementById('product-form-card');
                    if (card) card.style.display = 'none';
                }
            } else {
                const err = await response.json();
                alert(`Error: ${err.error || 'Operation failed'}`);
            }
        } catch (error) {
            console.error('Error saving item:', error);
        }
    };

    if (addForm) {
        addForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleItemSubmit('main', !!editingId);
        });
    }

    const secAddForm = document.getElementById('secondary-inventory-form');
    if (secAddForm) {
        secAddForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleItemSubmit('sec', false);
        });
    }

    window.editItem = function (id) {
        const item = inventoryData.find(i => i.id === id);
        if (!item) return;

        // Fill form
        const nameEl = document.getElementById('itemName');

        // Handle dynamic category selects
        const catParts = (item.category || '').split(' - ');
        if (mainCategorySelect && subCategorySelect) {
            mainCategorySelect.value = catParts[0] || '';
            // Trigger population of subCategory
            mainCategorySelect.dispatchEvent(new Event('change'));
            subCategorySelect.value = catParts[1] || '';
            // Trigger population of itemNameSelect
            subCategorySelect.dispatchEvent(new Event('change'));
        }

        // Handle dynamic name selects
        const itemNameSelect = document.getElementById('itemNameSelect');
        if (itemNameSelect && nameEl) {
            // Check if name exists in current sub-category options
            let found = false;
            for (let i = 0; i < itemNameSelect.options.length; i++) {
                if (itemNameSelect.options[i].value === item.item_name) {
                    itemNameSelect.value = item.item_name;
                    found = true;
                    break;
                }
            }

            if (!found) {
                itemNameSelect.value = 'Other';
                nameEl.style.display = 'block';
                nameEl.value = item.item_name;
            } else {
                nameEl.style.display = 'none';
                nameEl.value = item.item_name;
            }
        }

        const catEl = document.getElementById('itemCategory');
        if (catEl) catEl.value = item.category;

        const qtyEl = document.getElementById('itemQuantity');
        if (qtyEl) qtyEl.value = item.quantity;

        const priceEl = document.getElementById('itemPrice');
        if (priceEl) priceEl.value = item.unit_price;

        const unitEl = document.getElementById('itemUnit');
        if (unitEl) unitEl.value = item.unit || 'kg';

        const costEl = document.getElementById('itemCost');
        if (costEl) costEl.value = item.cost_price || 0;

        const threshEl = document.getElementById('itemThreshold');
        if (threshEl) threshEl.value = item.threshold;

        const expiryEl = document.getElementById('itemExpiry');
        const expiryField = document.getElementById('expiryField');
        if (expiryEl) expiryEl.value = item.expiry_date || '';
        if (expiryField) {
            const productType = (item.category || '').split(' - ')[0];
            expiryField.style.display = (productType === 'Dairy Product') ? 'block' : 'none';
        }

        // Change UI to Edit mode
        editingId = id;
        if (submitBtn) submitBtn.innerText = 'Update Item';

        // Ensure form is visible
        const toggleBtn = document.getElementById('toggle-product-form');
        // Ensure the section containing the form is visible
        const invSection = document.getElementById('inventory-section');
        if (invSection && invSection.style.display === 'none') {
            // If in Owner dashboard where Products link is removed, 
            // we show the section manually so they can edit.
            Object.values(sections).forEach(sec => { if (sec) sec.style.display = 'none'; });
            invSection.style.display = 'block';
            if (pageTitle) pageTitle.innerText = 'Edit Product';
        }

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
            if (addForm) addForm.appendChild(cancelBtn);
        }

        // Scroll to form
        addForm.scrollIntoView({ behavior: 'smooth' });
    };

    function resetEditMode() {
        editingId = null;
        if (submitBtn) submitBtn.innerText = 'Add Item';
        const cancelBtn = document.getElementById('btn-cancel-edit');
        if (cancelBtn) cancelBtn.remove();

        // Reset dynamic selects
        if (mainCategorySelect) mainCategorySelect.value = '';
        if (subCategorySelect) {
            subCategorySelect.innerHTML = '<option value="">Select Sub-Category...</option>';
            subCategorySelect.disabled = true;
        }
        const itemNameSelect = document.getElementById('itemNameSelect');
        if (itemNameSelect) {
            itemNameSelect.innerHTML = '<option value="">Select Item Name...</option>';
            itemNameSelect.disabled = true;
        }
        const nameEl = document.getElementById('itemName');
        if (nameEl) {
            nameEl.style.display = 'none';
            nameEl.value = '';
        }

        const expiryEl = document.getElementById('itemExpiry');
        const expiryField = document.getElementById('expiryField');
        if (expiryEl) expiryEl.value = '';
        if (expiryField) expiryField.style.display = 'none';

        const secExpiryEl = document.getElementById('secItemExpiry');
        const secExpiryField = document.getElementById('secExpiryField');
        if (secExpiryEl) secExpiryEl.value = '';
        if (secExpiryField) secExpiryField.style.display = 'none';

        const unitEl = document.getElementById('itemUnit');
        if (unitEl) unitEl.value = 'kg';

        if (addForm) addForm.reset();
        const secForm = document.getElementById('secondary-inventory-form');
        if (secForm) secForm.reset();
    }

    window.deleteItem = async function (id) {
        if (!confirm('Are you sure you want to delete this item?')) return;
        try {
            const response = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
            if (response.ok) {
                fetchInventory();
                if (editingId === id) resetEditMode();
            } else {
                const err = await response.json();
                alert(err.error || 'Error deleting item');
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
