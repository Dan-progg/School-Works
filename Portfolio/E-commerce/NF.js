const SUPABASE_URL = 'https://sklpligxxqxtzspsckkd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_3mRZpbIXAzxvFVuA3U3AQw_va68UOMh';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let allProducts = [];
let currentCategory = 'all';
let cart = [];

function getUser() {
    const userData = localStorage.getItem('neonForgeUser');
    if (!userData) {
        location.href = 'index.html';
        return null;
    }
    try { return JSON.parse(userData); }
    catch (e) { location.href = 'index.html'; return null; }
}

function generateReceiptNo() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `NF-${y}${m}${d}-${rand}`;
}

function saveCartToLocal() {
    if (!currentUser) return;
    localStorage.setItem(`neonForgeCart_${currentUser.id}`, JSON.stringify(cart));
}

function loadCartFromLocal() {
    if (!currentUser) return;
    const saved = localStorage.getItem(`neonForgeCart_${currentUser.id}`);
    if (saved) {
        try { cart = JSON.parse(saved); } catch (e) { cart = []; }
    }
}

async function fetchProducts() {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error-message');
    try {
        const { data, error } = await supabaseClient
            .from('ecom')
            .select('*')
            .order('productid', { ascending: true });
        if (error) throw error;
        allProducts = data || [];
        loadingEl.style.display = 'none';
        renderProducts(allProducts);
    } catch (err) {
        console.error('Error fetching products:', err);
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
        errorEl.textContent = `⚠️ Failed to load inventory: ${err.message}`;
    }
}

function renderProducts(products) {
    const container = document.getElementById('product-container');
    container.innerHTML = '';
    const filtered = currentCategory === 'all'
        ? products
        : products.filter(p => p.category === currentCategory);
    if (filtered.length === 0) {
        container.innerHTML = '<p style="color:#7ec8e0; text-align:center; grid-column:1/-1; font-family:Orbitron;">No products in this category yet.</p>';
        return;
    }
    filtered.forEach((product, index) => {
        const card = document.createElement('div');
        card.classList.add('product-card');
        card.style.animationDelay = `${index * 0.05}s`;
        const imgSrc = product.imageurl || 'https://via.placeholder.com/500x300/0f111a/00f0ff?text=Neon+Forge';
        card.innerHTML = `
            <img src="${imgSrc}" alt="${product.productname}" class="product-img" onclick="openProductModal(${product.productid})" onerror="this.src='https://via.placeholder.com/500x300/0f111a/00f0ff?text=No+Image'">
            <div class="product-info">
                <span class="category">${product.category || 'Hardware'}</span>
                <h3 onclick="openProductModal(${product.productid})">${product.productname}</h3>
                <p class="price">₱${Number(product.productprice).toLocaleString()}</p>
                <p class="stock">In Stock: ${product.productquantity}</p>
                <button class="view-btn" onclick="openProductModal(${product.productid})">
                    <i class="fas fa-info-circle"></i> View Details
                </button>
                <button class="add-btn" onclick="addToCart(${product.productid}, event)">
                    <i class="fas fa-bolt"></i> Add to Cart
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

function openProductModal(productId) {
    const product = allProducts.find(p => String(p.productid) === String(productId));
    if (!product) return;
    let specs = product.specs;
    if (typeof specs === 'string') {
        try { specs = JSON.parse(specs); } catch (e) { specs = {}; }
    }
    let specsHtml = '';
    if (specs && typeof specs === 'object') {
        specsHtml = Object.entries(specs).map(([key, value]) =>
            `<div class="spec-row"><span class="spec-key">${key}</span><span class="spec-value">${value}</span></div>`
        ).join('');
    }
    const imgSrc = product.imageurl || 'https://via.placeholder.com/500x300/0f111a/00f0ff?text=Neon+Forge';
    document.getElementById('modal-content').innerHTML = `
        <img src="${imgSrc}" alt="${product.productname}" class="modal-img">
        <div class="modal-details">
            <span class="modal-category">${product.category || 'Hardware'}</span>
            <h2>${product.productname}</h2>
            <div class="modal-price">₱${Number(product.productprice).toLocaleString()}</div>
            <p class="modal-desc">${product.description || 'No description available.'}</p>
            ${specsHtml ? `<h4><i class="fas fa-microchip"></i> Specifications</h4><div class="specs-list">${specsHtml}</div>` : ''}
            <p style="color:var(--success); font-size:0.85rem; margin-bottom:1rem;"><i class="fas fa-check-circle"></i> In Stock: ${product.productquantity}</p>
            <button class="modal-add-btn" onclick="addToCart(${product.productid}, event); closeProductModal();">
                <i class="fas fa-bolt"></i> Add to Cart
            </button>
        </div>
    `;
    document.getElementById('product-modal').classList.add('active');
}

function closeProductModal() {
    document.getElementById('product-modal').classList.remove('active');
}

async function addToCart(productId, event) {
    const product = allProducts.find(p => String(p.productid) === String(productId));
    if (!product || !currentUser) return;
    const existing = cart.find(item => String(item.productid) === String(productId));
    if (existing) existing.quantity += 1;
    else {
        cart.push({
            productid: product.productid,
            productname: product.productname,
            productprice: product.productprice,
            imageurl: product.imageurl,
            quantity: 1
        });
    }
    renderCart();
    updateCartCount();
    saveCartToLocal();
    try {
        await supabaseClient.from('cart').upsert({
            user_id: currentUser.id,
            product_id: product.productid,
            product_name: product.productname,
            product_price: product.productprice,
            product_image: product.imageurl,
            quantity: existing ? existing.quantity : 1
        }, { onConflict: 'user_id,product_id' });
    } catch (err) { console.warn('Cart sync warning:', err); }
    if (event) {
        const btn = event.target.closest('.add-btn, .modal-add-btn');
        if (btn) {
            const original = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Added!';
            btn.style.background = 'var(--neon-pink)';
            btn.style.color = 'white';
            btn.style.borderColor = 'var(--neon-pink)';
            setTimeout(() => {
                btn.innerHTML = original;
                btn.style.background = '';
                btn.style.color = '';
                btn.style.borderColor = '';
            }, 1000);
        }
    }
}

async function removeFromCart(productId) {
    cart = cart.filter(item => String(item.productid) !== String(productId));
    renderCart();
    updateCartCount();
    saveCartToLocal();
    if (!currentUser) return;
    try {
        await supabaseClient.from('cart').delete()
            .eq('user_id', currentUser.id).eq('product_id', productId);
    } catch (err) { console.warn('Remove failed:', err); }
}

async function updateQuantity(productId, delta) {
    const item = cart.find(i => String(i.productid) === String(productId));
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) { removeFromCart(productId); return; }
    renderCart();
    updateCartCount();
    saveCartToLocal();
    if (!currentUser) return;
    try {
        await supabaseClient.from('cart').update({ quantity: item.quantity })
            .eq('user_id', currentUser.id).eq('product_id', productId);
    } catch (err) { console.warn('Quantity update failed:', err); }
}

function renderCart() {
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    if (cart.length === 0) {
        container.innerHTML = '<p class="cart-empty"><i class="fas fa-shopping-cart"></i><br><br>Your cart is empty</p>';
        totalEl.textContent = '₱0';
        checkoutBtn.disabled = true;
        return;
    }
    container.innerHTML = '';
    let total = 0;
    cart.forEach(item => {
        total += item.productprice * item.quantity;
        const el = document.createElement('div');
        el.classList.add('cart-item');
        el.innerHTML = `
            <img src="${item.imageurl || 'https://via.placeholder.com/60'}" alt="${item.productname}">
            <div class="cart-item-info">
                <h4>${item.productname}</h4>
                <span class="item-price">₱${Number(item.productprice).toLocaleString()}</span>
            </div>
            <div class="cart-item-controls">
                <div class="qty-controls">
                    <button class="qty-btn" onclick="updateQuantity(${item.productid}, -1)">−</button>
                    <span class="qty-value">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity(${item.productid}, 1)">+</button>
                </div>
                <button class="remove-item" onclick="removeFromCart(${item.productid})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(el);
    });
    totalEl.textContent = `₱${total.toLocaleString()}`;
    checkoutBtn.disabled = false;
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-count').textContent = count;
}

function toggleCart(show) {
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    if (show) { sidebar.classList.add('active'); overlay.classList.add('active'); }
    else { sidebar.classList.remove('active'); overlay.classList.remove('active'); }
}

function openPaymentModal() {
    if (cart.length === 0 || !currentUser) return;
    document.getElementById('checkout-name').textContent = currentUser.full_name;
    document.getElementById('checkout-email').textContent = currentUser.email;
    document.getElementById('checkout-phone').textContent = currentUser.phone;
    const total = cart.reduce((sum, item) => sum + (item.productprice * item.quantity), 0);
    document.getElementById('payment-amount').textContent = `₱${total.toLocaleString()}`;
    toggleCart(false);
    document.getElementById('payment-modal').classList.add('active');
}

function closePaymentModal() {
    document.getElementById('payment-modal').classList.remove('active');
}

let capturedLocation = null;

function setLocationStatus(message, isError = false) {
    const status = document.getElementById('location-status');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('error', isError);
}

async function reverseGeocode(latitude, longitude) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            { headers: { 'Accept': 'application/json' }, signal: controller.signal }
        );
        if (!res.ok) return null;
        const data = await res.json();
        return data.display_name || null;
    } finally {
        clearTimeout(timer);
    }
}

function useMyLocation() {
    const input = document.getElementById('deliver-location');
    const btn = document.getElementById('use-location-btn');

    if (!navigator.geolocation) {
        setLocationStatus('Geolocation is not supported by this browser.', true);
        return;
    }

    btn.disabled = true;
    const originalIcon = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    setLocationStatus('Requesting location permission…');

    navigator.geolocation.getCurrentPosition(
        async function (position) {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            capturedLocation = {
                latitude,
                longitude,
                maps_url: `https://www.google.com/maps?q=${latitude},${longitude}`
            };

            input.value = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            setLocationStatus('Location captured. Looking up address…');

            try {
                const address = await reverseGeocode(latitude, longitude);
                if (address) {
                    capturedLocation.address = address;
                    input.value = address;
                    setLocationStatus('Location captured.');
                } else {
                    setLocationStatus('Location captured (coordinates).');
                }
            } catch (err) {
                setLocationStatus('Location captured (coordinates).');
            }

            btn.disabled = false;
            btn.innerHTML = originalIcon;
        },
        function (error) {
            let message = 'Unable to get your location.';
            if (error.code === error.PERMISSION_DENIED) message = 'Location permission denied.';
            else if (error.code === error.POSITION_UNAVAILABLE) message = 'Location information is unavailable.';
            else if (error.code === error.TIMEOUT) message = 'Location request timed out.';
            setLocationStatus(message, true);
            btn.disabled = false;
            btn.innerHTML = originalIcon;
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
}

document.getElementById('use-location-btn')?.addEventListener('click', useMyLocation);

document.addEventListener('change', function(e) {
    if (e.target.name === 'payment') {
        document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('active'));
        e.target.closest('.payment-option').classList.add('active');
        const cardDetails = document.getElementById('card-details');
        const codAddress = document.getElementById('cod-address');
        const cardInputs = ['card-number', 'card-expiry', 'card-cvv'];
        const addressInputs = ['addr-street', 'addr-city', 'addr-province', 'addr-zip'];
        if (e.target.value === 'Credit Card') {
            cardDetails.style.display = 'block';
            codAddress.style.display = 'none';
            cardInputs.forEach(id => document.getElementById(id).required = true);
            addressInputs.forEach(id => document.getElementById(id).required = false);
        } else if (e.target.value === 'Cash on Delivery') {
            cardDetails.style.display = 'none';
            codAddress.style.display = 'block';
            cardInputs.forEach(id => document.getElementById(id).required = false);
            addressInputs.forEach(id => document.getElementById(id).required = true);
        } else {
            cardDetails.style.display = 'none';
            codAddress.style.display = 'none';
            cardInputs.forEach(id => document.getElementById(id).required = false);
            addressInputs.forEach(id => document.getElementById(id).required = false);
        }
    }
});

document.getElementById('card-number')?.addEventListener('input', function(e) {
    let v = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
    v = v.match(/.{1,4}/g)?.join(' ') || v;
    e.target.value = v.substring(0, 19);
});

document.getElementById('card-expiry')?.addEventListener('input', function(e) {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length >= 2) v = v.substring(0, 2) + '/' + v.substring(2, 4);
    e.target.value = v;
});

document.getElementById('card-cvv')?.addEventListener('input', function(e) {
    e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
});

document.getElementById('payment-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (cart.length === 0 || !currentUser) return;

    for (const item of cart) {
        const product = allProducts.find(p => String(p.productid) === String(item.productid));
        if (!product) continue;
        if (Number(product.productquantity) < Number(item.quantity)) {
            alert(`⚠️ Not enough stock for "${product.productname}". Only ${product.productquantity} available.`);
            return;
        }
    }

    const method = document.querySelector('input[name="payment"]:checked').value;
    const subtotal = cart.reduce((sum, item) => sum + (item.productprice * item.quantity), 0);
    const shipping = subtotal > 50000 ? 0 : 250;
    const tax = Math.round(subtotal * 0.12);
    const total = subtotal + tax + shipping;
    const receiptNo = generateReceiptNo();
    let paymentDetails = { method };

    if (method === 'Credit Card') {
        const cardNum = document.getElementById('card-number').value;
        paymentDetails.card_last4 = cardNum.slice(-4);
        paymentDetails.card_expiry = document.getElementById('card-expiry').value;
    } else if (method === 'GCash' || method === 'Maya') {
        paymentDetails.mobile = currentUser.phone;
    } else if (method === 'Cash on Delivery') {
        paymentDetails.delivery_address = {
            street: document.getElementById('addr-street').value.trim(),
            city: document.getElementById('addr-city').value.trim(),
            province: document.getElementById('addr-province').value.trim(),
            zip: document.getElementById('addr-zip').value.trim(),
            landmark: document.getElementById('addr-landmark').value.trim(),
            notes: document.getElementById('addr-notes').value.trim()
        };
    }

    const locationText = document.getElementById('deliver-location')?.value.trim();
    if (locationText) {
        paymentDetails.location = {
            text: locationText,
            ...(capturedLocation || {})
        };
    }

    const orderData = {
        receipt_no: receiptNo,
        session_id: `user_${currentUser.id}`,
        user_id: currentUser.id,
        customer_name: currentUser.full_name,
        customer_email: currentUser.email,
        customer_phone: currentUser.phone,
        payment_method: method,
        payment_details: paymentDetails,
        items: cart,
        subtotal: subtotal,
        tax: tax,
        shipping: shipping,
        total: total,
        status: method === 'Cash on Delivery' ? 'pending' : 'paid'
        // created_at: let database handle with DEFAULT now() (timestamptz)
    };

    const payBtn = document.querySelector('.pay-now-btn');
    payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESSING...';
    payBtn.disabled = true;

    try {
        const { error: orderError } = await supabaseClient.from('orders').insert(orderData);
        if (orderError) throw orderError;

        for (const item of orderData.items) {
            const product = allProducts.find(p => String(p.productid) === String(item.productid));
            if (!product) {
                console.warn('Product not found in memory:', item.productid);
                continue;
            }

            const currentStock = Number(product.productquantity) || 0;
            const ordered = Number(item.quantity) || 0;
            const newStock = Math.max(0, currentStock - ordered);

            console.log(`📦 ${product.productname}: ${currentStock} → ${newStock}`);

            const { error: stockError } = await supabaseClient
                .from('ecom')
                .update({ productquantity: newStock })
                .eq('productid', item.productid);

            if (stockError) {
                console.error('❌ Stock update failed:', stockError);
            } else {
                product.productquantity = newStock;
            }
        }

        renderProducts(allProducts);

        await supabaseClient.from('cart').delete().eq('user_id', currentUser.id);

        cart = [];
        localStorage.removeItem(`neonForgeCart_${currentUser.id}`);
        renderCart();
        updateCartCount();
        closePaymentModal();
        showReceipt(orderData);

        document.getElementById('payment-form').reset();
        document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('active'));
        document.querySelector('.payment-option').classList.add('active');
        document.getElementById('card-details').style.display = 'none';
        document.getElementById('cod-address').style.display = 'none';
        capturedLocation = null;
        setLocationStatus('');

    } catch (err) {
        console.error('Order error:', err);
        alert(`⚠️ Payment failed: ${err.message}`);
    } finally {
        payBtn.innerHTML = '<i class="fas fa-lock"></i> PAY NOW';
        payBtn.disabled = false;
    }
});

function formatPHTime(isoString) {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
        hour12: true
    });
}

function formatPHDate(isoString) {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('en-PH', {
        timeZone: 'Asia/Manila',
        month: 'short', day: 'numeric', year: 'numeric'
    });
}

function showReceipt(order) {
    const itemsHtml = order.items.map(item => `
        <tr>
            <td>${item.productname}<br><small style="color:#777;">Qty: ${item.quantity}</small></td>
            <td>₱${(item.productprice * item.quantity).toLocaleString()}</td>
        </tr>
    `).join('');
    const date = formatPHTime(order.created_at);
    let locationHtml = '';
    const pinned = order.payment_details?.location;
    if (pinned && (pinned.text || pinned.address)) {
        const label = pinned.address || pinned.text;
        locationHtml = `
            <div class="receipt-address">
                <span>DELIVERY LOCATION</span>
                <p>${label}</p>
                ${pinned.maps_url ? `<p><a href="${pinned.maps_url}" target="_blank" rel="noopener">View pinned location on Google Maps</a></p>` : ''}
            </div>
        `;
    }
    let addressHtml = '';
    if (order.payment_method === 'Cash on Delivery' && order.payment_details?.delivery_address) {
        const a = order.payment_details.delivery_address;
        addressHtml = `
            <div class="receipt-address">
                <span>DELIVER TO (COD)</span>
                <strong>${order.customer_name} · ${order.customer_phone}</strong>
                <p>${a.street}, ${a.city}, ${a.province} ${a.zip}</p>
                ${a.landmark ? `<p><em>Landmark: ${a.landmark}</em></p>` : ''}
                ${a.notes ? `<p><em>Notes: ${a.notes}</em></p>` : ''}
                <p style="margin-top:6px;color:#c0392b;"><strong>COD Amount: ₱${order.total.toLocaleString()}</strong></p>
            </div>
        `;
    }
    document.getElementById('receipt-content').innerHTML = `
        <div class="receipt-header">
            <h1>NEON FORGE</h1>
            <p>PC SHOP · EST. 2087</p>
            <p>Cyberpunk District, Neo Manila</p>
        </div>
        <div class="receipt-no">RECEIPT #${order.receipt_no}</div>
        <div class="receipt-info">
            <div><span>Customer</span><strong>${order.customer_name}</strong></div>
            <div><span>Date</span><strong>${date}</strong></div>
            <div><span>Email</span><strong>${order.customer_email}</strong></div>
            <div><span>Phone</span><strong>${order.customer_phone}</strong></div>
            <div><span>Payment</span><strong>${order.payment_method}</strong></div>
            <div><span>Status</span><strong style="color:${order.status === 'paid' ? '#27ae60' : '#e67e22'};">${order.status.toUpperCase()}</strong></div>
        </div>
        ${locationHtml}
        ${addressHtml}
        <table class="receipt-items-table">
            <thead><tr><th>Item</th><th>Amount</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
        </table>
        <div class="receipt-totals">
            <div class="total-row"><span>Subtotal</span><span>₱${order.subtotal.toLocaleString()}</span></div>
            <div class="total-row"><span>VAT (12%)</span><span>₱${order.tax.toLocaleString()}</span></div>
            <div class="total-row"><span>Shipping</span><span>${order.shipping === 0 ? 'FREE' : '₱' + order.shipping.toLocaleString()}</span></div>
            <div class="grand-total"><span>TOTAL</span><span>₱${order.total.toLocaleString()}</span></div>
        </div>
        <div class="receipt-footer">
            <strong>⚡ THANK YOU FOR YOUR PURCHASE ⚡</strong>
            <p>For inquiries: support@neonforge.ph</p>
            <p>This serves as your official receipt.</p>
            ${order.payment_method === 'Cash on Delivery' ? '<p style="color:#c0392b;margin-top:6px;">Please prepare exact amount upon delivery.</p>' : ''}
        </div>
    `;
    document.getElementById('receipt-modal').classList.add('active');
}

function closeReceiptModal() {
    document.getElementById('receipt-modal').classList.remove('active');
}

function printReceipt() { window.print(); }

document.querySelectorAll('.dash-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.dash-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentCategory = this.dataset.section;
        renderProducts(allProducts);
    });
});

document.getElementById('cart-toggle').addEventListener('click', () => toggleCart(true));
document.getElementById('cart-close').addEventListener('click', () => toggleCart(false));
document.getElementById('cart-overlay').addEventListener('click', () => toggleCart(false));
document.getElementById('checkout-btn').addEventListener('click', openPaymentModal);
document.getElementById('product-modal').addEventListener('click', function(e) {
    if (e.target === this) closeProductModal();
});
document.getElementById('payment-modal').addEventListener('click', function(e) {
    if (e.target === this) closePaymentModal();
});
document.getElementById('logout-btn')?.addEventListener('click', function() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('neonForgeUser');
        location.href = 'index.html';
    }
});

window.onload = function() {
    currentUser = getUser();
    if (!currentUser) return;
    document.getElementById('user-name').textContent = currentUser.full_name.split(' ')[0];
    loadCartFromLocal();
    renderCart();
    updateCartCount();
    fetchProducts();
};