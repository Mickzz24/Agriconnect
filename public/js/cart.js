// public/js/cart.js

let cart = [];
const DELIVERY_FEE = 5.00; // Fixed delivery fee

// Initialize Cart UI
document.addEventListener('DOMContentLoaded', () => {
    injectCartUI();
    updateCartBadge();
});

function injectCartUI() {
    // 1. Cart Icon in Header (Amazon-style)
    const headerParams = document.querySelector('.header > div:last-child');
    if (!headerParams) {
        console.error("Header container not found for cart injection");
        return;
    }

    const cartIcon = document.createElement('div');
    cartIcon.id = 'header-cart-icon';
    cartIcon.innerHTML = `
        <div class="cart-icon-container">
            <i class="fas fa-shopping-cart"></i>
            <span id="cart-count">0</span>
        </div>
        <span class="cart-label">Cart</span>
    `;
    cartIcon.onclick = openCartModal;

    // Insert before the logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        headerParams.insertBefore(cartIcon, logoutBtn);
    } else {
        headerParams.appendChild(cartIcon);
    }

    // 2. Cart Modal
    const modal = document.createElement('div');
    modal.id = 'cart-modal';
    modal.className = 'modal-overlay';
    modal.style.display = 'none';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-shopping-basket"></i> Your Cart</h2>
                <button class="close-btn" onclick="closeCartModal()">&times;</button>
            </div>
            <div id="cart-items-container" class="modal-body">
                <!-- Items will be injected here -->
                <div class="empty-cart-msg">Your cart is empty. Start shopping!</div>
            </div>
            <div class="modal-footer">
                <div class="cart-summary">
                    <div class="summary-row"><span>Subtotal:</span> <span id="cart-subtotal">$0.00</span></div>
                    <div class="summary-row"><span>Delivery:</span> <span id="cart-delivery">$0.00</span></div>
                    <div class="summary-row total"><span>Total:</span> <span id="cart-total">$0.00</span></div>
                </div>
                <div class="payment-selection" style="margin-bottom: 15px;">
                     <label>Payment Method:</label>
                     <select id="cartPaymentMethod" class="form-input">
                         <option value="UPI">UPI</option>
                         <option value="COD">Cash on Delivery</option>
                     </select>
                </div>
                <button id="checkout-btn" class="btn-checkout" onclick="performCheckout()" disabled>
                    Proceed to Checkout
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Add Styles dynamically if not present
    if (!document.getElementById('cart-styles')) {
        const style = document.createElement('style');
        style.id = 'cart-styles';
        style.textContent = `
            /* Header Cart Icon */
            #header-cart-icon {
                display: flex;
                align-items: center;
                margin-right: 20px;
                cursor: pointer;
                color: #2c3e50;
                transition: color 0.2s;
                padding: 5px 10px;
                border-radius: 8px;
            }
            #header-cart-icon:hover {
                background: #f0f2f5;
                color: #27ae60;
            }
            .cart-icon-container {
                position: relative;
                font-size: 1.4rem;
                margin-right: 5px;
            }
            .cart-label {
                font-weight: 600;
                font-size: 0.9rem;
            }
            #cart-count {
                position: absolute;
                top: -8px;
                right: -8px;
                background: #e74c3c;
                color: white;
                font-size: 0.7rem;
                font-weight: bold;
                padding: 1px 5px;
                border-radius: 10px;
                border: 2px solid white;
            }

            /* Modal */
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 2000;
                display: flex;
                justify-content: flex-end; /* Slide from right */
            }
            .modal-content {
                background: white;
                width: 400px;
                height: 100%;
                display: flex;
                flex-direction: column;
                box-shadow: -5px 0 15px rgba(0,0,0,0.1);
                animation: slideIn 0.3s ease-out;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
            }
            .modal-header {
                padding: 20px;
                background: #f8f9fa;
                border-bottom: 1px solid #eee;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .modal-header h2 { margin: 0; font-size: 1.2rem; color: #2c3e50; }
            .close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #7f8c8d; }
            
            .modal-body {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
            }
            
            .cart-item {
                display: flex;
                align-items: center;
                margin-bottom: 15px;
                padding-bottom: 15px;
                border-bottom: 1px solid #f9f9f9;
            }
            .cart-item img {
                width: 60px;
                height: 60px;
                object-fit: cover;
                border-radius: 8px;
                margin-right: 15px;
            }
            .item-details { flex: 1; }
            .item-details h4 { margin: 0 0 5px; font-size: 0.95rem; }
            .item-meta { font-size: 0.85rem; color: #7f8c8d; }
            
            .item-controls {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .qty-btn {
                background: #eee;
                border: none;
                width: 24px;
                height: 24px;
                border-radius: 4px;
                cursor: pointer;
            }
            .remove-btn {
                color: #e74c3c;
                background: none;
                border: none;
                cursor: pointer;
                font-size: 0.9rem;
                margin-left: 10px;
            }

            .modal-footer {
                padding: 20px;
                background: #f8f9fa;
                border-top: 1px solid #eee;
            }
            .cart-summary { margin-bottom: 20px; }
            .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9rem; }
            .summary-row.total { font-weight: bold; font-size: 1.1rem; border-top: 1px solid #ddd; padding-top: 10px; margin-top: 10px; }
            
            .btn-checkout {
                width: 100%;
                padding: 12px;
                background: #27ae60;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.2s;
            }
            .btn-checkout:disabled { background: #bdc3c7; cursor: not-allowed; }
            .btn-checkout:hover:not(:disabled) { background: #2ecc71; }
            
            .form-input {
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 6px;
                margin-top: 5px;
            }
        `;
        document.head.appendChild(style);
    }
}

// Logic Functions

function addToCart(product) {
    const existingItem = cart.find(item => item.id === product.id);

    // Check max stock
    const currentQty = existingItem ? existingItem.cartQty : 0;
    if (currentQty >= product.quantity) {
        alert(`Sorry, only ${product.quantity} items available in stock.`);
        return;
    }

    if (existingItem) {
        existingItem.cartQty++;
    } else {
        cart.push({
            ...product,
            cartQty: 1
        });
    }

    updateCartBadge();
    showToast(`Added ${product.item_name} to cart`);

    // Optional: open cart immediately or just notify
    // openCartModal(); 
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    renderCartItems();
    updateCartBadge();
}

function updateItemQty(id, change) {
    const item = cart.find(i => i.id === id);
    if (!item) return;

    const newQty = item.cartQty + change;

    if (newQty > item.quantity) {
        alert(`Max stock limit reached for ${item.item_name}`);
        return;
    }

    if (newQty <= 0) {
        removeFromCart(id);
    } else {
        item.cartQty = newQty;
        renderCartItems();
        updateCartBadge();
    }
}

function updateCartBadge() {
    const count = cart.reduce((sum, item) => sum + item.cartQty, 0);
    const badge = document.getElementById('cart-count');
    if (badge) badge.innerText = count;

    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) checkoutBtn.disabled = count === 0;
}

function openCartModal() {
    const modal = document.getElementById('cart-modal');
    modal.style.display = 'flex';
    renderCartItems();
}

function closeCartModal() {
    const modal = document.getElementById('cart-modal');
    modal.style.display = 'none';
}

function renderCartItems() {
    const container = document.getElementById('cart-items-container');
    const subtotalEl = document.getElementById('cart-subtotal');
    const deliveryEl = document.getElementById('cart-delivery');
    const totalEl = document.getElementById('cart-total');

    if (cart.length === 0) {
        container.innerHTML = '<div class="empty-cart-msg" style="text-align: center; color: #95a5a6; margin-top: 50px;"><i class="fas fa-shopping-basket" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.3;"></i><p>Your cart is empty.</p></div>';
        subtotalEl.innerText = '$0.00';
        deliveryEl.innerText = '$0.00';
        totalEl.innerText = '$0.00';
        return;
    }

    let subtotal = 0;
    container.innerHTML = cart.map(item => {
        const itemTotal = item.unit_price * item.cartQty;
        subtotal += itemTotal;

        // Image logic check (fallback handled in image tag)
        const baseTypes = ['Milk', 'Cheese', 'Butter', 'Yogurt', 'Beef', 'Chicken', 'Pork', 'Lamb', 'Apples', 'Bananas', 'Oranges', 'Grapes', 'Strawberries', 'Blueberries', 'Peaches', 'Tomatoes', 'Potatoes', 'Onions', 'Lettuce', 'Peppers', 'Carrots', 'Cabbage', 'Corn', 'Rice', 'Wheat', 'Oats', 'Barley', 'Rye'];
        const coreTag = baseTypes.find(t => item.item_name.includes(t)) || 'food';
        const localImg = `images/products/${coreTag.toLowerCase()}.png`;

        return `
            <div class="cart-item">
                <img src="${localImg}" onerror="this.src='images/organic.png'">
                <div class="item-details">
                    <h4>${item.item_name}</h4>
                    <div class="item-meta">$${item.unit_price.toFixed(2)} / ${item.unit}</div>
                    <div class="item-controls" style="margin-top: 5px;">
                        <button class="qty-btn" onclick="updateItemQty(${item.id}, -1)">-</button>
                        <span style="font-weight: 600; min-width: 20px; text-align: center;">${item.cartQty}</span>
                        <button class="qty-btn" onclick="updateItemQty(${item.id}, 1)">+</button>
                        <button class="remove-btn" onclick="removeFromCart(${item.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div style="font-weight: 600; color: #2c3e50;">
                    $${itemTotal.toFixed(2)}
                </div>
            </div>
        `;
    }).join('');

    const delivery = subtotal > 0 ? DELIVERY_FEE : 0;
    const total = subtotal + delivery;

    subtotalEl.innerText = `$${subtotal.toFixed(2)}`;
    deliveryEl.innerText = `$${delivery.toFixed(2)}`;
    totalEl.innerText = `$${total.toFixed(2)}`;
}

async function performCheckout() {
    if (cart.length === 0) return;

    const btn = document.getElementById('checkout-btn');
    const originalText = btn.innerText;
    btn.innerText = 'Processing...';
    btn.disabled = true;

    const paymentMethod = document.getElementById('cartPaymentMethod').value;
    const customerName = document.getElementById('userName').innerText || 'Customer';

    const orderData = {
        customer_name: customerName,
        order_type: 'Online',
        payment_method: paymentMethod,
        items: cart.map(item => ({
            inventoryId: item.id,
            quantity: item.cartQty
        }))
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
            cart = [];
            updateCartBadge();
            closeCartModal();
            // Refresh dashboard
            if (typeof updateStats === 'function') updateStats();
        } else {
            alert(`Order Failed: ${result.message}`);
        }
    } catch (err) {
        console.error("Checkout error:", err);
        alert("Network error during checkout.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// Utility Toast
function showToast(message) {
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '100px';
    toast.style.right = '30px';
    toast.style.background = '#34495e';
    toast.style.color = 'white';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)';
    toast.style.zIndex = '3000';
    toast.style.animation = 'fadeIn 0.3s, fadeOut 0.3s 2.7s';
    toast.innerText = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        document.body.removeChild(toast);
    }, 3000);
}

// Add simple CSS animation for toast
const toastStyle = document.createElement('style');
toastStyle.textContent = `
@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(20px); } }
`;
document.head.appendChild(toastStyle);
