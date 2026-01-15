// --- 1. DATOS INICIALES ---
let products = JSON.parse(localStorage.getItem('perfumes')) || [
    { id: 1, name: "Luxury Oud", price: 120, cat: "hombre", scent: "fuerte", stock: 10, img: "https://images.unsplash.com/photo-1583467875263-d50dec37a88c?w=400" },
    { id: 2, name: "Midnight Rose", price: 95, cat: "mujer", scent: "dulce", stock: 5, img: "https://images.unsplash.com/photo-1585232351009-aa87416fca90?w=400" }
];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let sales = JSON.parse(localStorage.getItem('sales')) || [];
let activeDiscount = 0;

// --- 2. CARGA DE PÁGINAS ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('catalog')) renderCatalog(products);
    if (document.getElementById('cart-items')) renderCart();
    if (document.getElementById('admin-list')) checkAdminAccess();
    updateCartCount();
});

// --- 3. FUNCIONES DE TIENDA (index.html) ---
function renderCatalog(list) {
    const container = document.getElementById('catalog');
    if (!container) return;
    container.innerHTML = list.map(p => `
        <div class="bg-zinc-900 border border-white/5 p-4 rounded-3xl hover:border-yellow-500/50 transition-all group relative">
            ${p.stock <= 0 ? '<div class="absolute inset-0 bg-black/60 z-10 flex items-center justify-center rounded-3xl font-black text-red-500 uppercase rotate-12 border-2 border-red-500">Agotado</div>' : ''}
            <img src="${p.img}" class="h-64 w-full object-cover rounded-2xl mb-4 group-hover:scale-105 transition">
            <div class="flex justify-between items-start mb-2">
                <h3 class="font-bold text-lg uppercase tracking-tighter">${p.name}</h3>
                <span class="text-[10px] bg-zinc-800 px-2 py-1 rounded text-zinc-400 uppercase font-bold">${p.scent}</span>
            </div>
            <div class="flex justify-between items-center mt-3">
                <span class="text-yellow-500 font-black text-2xl font-mono">$${p.price}</span>
                <button onclick="addToCart(${p.id})" ${p.stock <= 0 ? 'disabled' : ''} class="bg-white text-black px-6 py-2 rounded-xl font-bold text-xs hover:bg-yellow-500 transition">Añadir</button>
            </div>
            <p class="text-[9px] text-zinc-500 mt-2 uppercase tracking-widest text-right">Stock: ${p.stock} unidades</p>
        </div>
    `).join('');
}

// BUSCADOR
function searchProduct() {
    const term = document.getElementById('search-input').value.toLowerCase();
    const filtered = products.filter(p => p.name.toLowerCase().includes(term));
    renderCatalog(filtered);
}

// RECOMENDADOR IA
function startRecommender() {
    const gen = prompt("¿Para quién es? (hombre / mujer / unisex)").toLowerCase();
    const aroma = prompt("¿Qué aroma prefieres? (dulce / fuerte / citrico)").toLowerCase();
    const match = products.find(p => p.cat === gen && p.scent === aroma && p.stock > 0);
    if (match) {
        alert("✨ IA Luxury recomienda: " + match.name);
        renderCatalog([match]);
    } else {
        alert("No hay una coincidencia exacta, pero te mostramos lo más parecido.");
    }
}

function addToCart(id) {
    const p = products.find(i => i.id === id);
    if (p && p.stock > 0) {
        cart.push({ ...p });
        p.stock--;
        localStorage.setItem('perfumes', JSON.stringify(products));
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        renderCatalog(products);
    }
}

function updateCartCount() {
    const el = document.getElementById('cart-count');
    if (el) el.innerText = cart.length;
}

// --- 4. CARRITO (carrito.html) ---
function renderCart() {
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('total-price');
    if (!container) return;

    let total = cart.reduce((acc, item) => acc + Number(item.price), 0);
    let finalTotal = total - (total * activeDiscount);

    container.innerHTML = cart.map((item, index) => `
        <div class="flex items-center justify-between bg-zinc-900 p-4 rounded-2xl mb-2 border border-white/5">
            <div class="flex items-center gap-4">
                <img src="${item.img}" class="w-12 h-12 rounded-lg object-cover">
                <span class="font-bold text-sm uppercase">${item.name}</span>
            </div>
            <button onclick="removeFromCart(${index}, ${item.id})" class="text-red-500"><i class="fas fa-trash"></i></button>
        </div>
    `).join('');

    if (totalEl) totalEl.innerText = `$${finalTotal.toFixed(2)}`;
}

function applyCoupon() {
    const code = document.getElementById('coupon-input').value.toUpperCase();
    if (code === "PRIMO10") {
        activeDiscount = 0.10;
        alert("¡Cupón aplicado! 10% de descuento");
        renderCart();
    } else {
        alert("Código no válido");
    }
}

function removeFromCart(index, productId) {
    const p = products.find(item => item.id === productId);
    if (p) p.stock++;
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    localStorage.setItem('perfumes', JSON.stringify(products));
    renderCart();
    updateCartCount();
}

function checkout() {
    if (cart.length === 0) return alert("El carrito está vacío.");

    // 1. Calcular el total final aplicando el cupón si existe
    let subtotal = cart.reduce((acc, item) => acc + Number(item.price), 0);
    let descuento = subtotal * activeDiscount;
    let totalFinal = subtotal - descuento;

    // 2. Crear la lista detallada para el mensaje
    // Usamos encodeURIComponent para que los símbolos como el $ o los espacios no rompan el link
    let listaProductos = cart.map(p => `• ${p.name} ($${p.price})`).join('%0A');

    // 3. Configurar el mensaje
    let mensajeWA = `*NUEVO PEDIDO LUXURY*%0A` +
        `--------------------------%0A` +
        `${listaProductos}%0A` +
        `--------------------------%0A` +
        `*Subtotal:* $${subtotal.toFixed(2)}%0A` +
        (activeDiscount > 0 ? `*Descuento (Cupón):* -$${descuento.toFixed(2)}%0A` : "") +
        `*TOTAL A PAGAR: $${totalFinal.toFixed(2)}*%0A%0A` +
        `¿Cómo realizo el pago?`;

    // 4. Número de tu primo (Asegúrate de ponerlo sin el + y sin espacios)
    let telefono = "34635399055"; // <--- CAMBIA ESTO CON SU NÚMERO REAL

    // 5. Registrar la venta en el Panel de Admin antes de irse
    const newOrder = {
        id: "#" + Math.floor(Math.random() * 9000 + 1000),
        total: totalFinal.toFixed(2),
        date: new Date().toLocaleDateString(),
        status: "Pendiente",
        items: cart.length
    };
    sales.push(newOrder);
    localStorage.setItem('sales', JSON.stringify(sales));

    // 6. Vaciar carrito y redirigir
    cart = [];
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();

    alert("¡Pedido generado! Abriendo WhatsApp para concretar el pago...");

    // Usamos window.open para abrir en pestaña nueva y evitar bloqueos
    let url = `https://wa.me/${telefono}?text=${mensajeWA}`;
    window.open(url, '_blank');

    // Regresamos al inicio
    window.location.href = "index.html";
}

// --- 5. ADMIN PANEL (admin.html) ---
function checkAdminAccess() {
    if (sessionStorage.getItem('isAdmin') === 'true') {
        document.getElementById('login-overlay').classList.add('hidden');
        renderAdminDashboard();
    }
}

function checkLogin() {
    if (document.getElementById('admin-pass').value === "admin123") {
        sessionStorage.setItem('isAdmin', 'true');
        location.reload();
    } else { alert("Error"); }
}

async function handleCreate() {
    const name = document.getElementById('p-name').value;
    const price = document.getElementById('p-price').value;
    const stock = document.getElementById('p-stock').value;
    const cat = document.getElementById('p-cat').value;
    const scent = document.getElementById('p-scent').value;
    const imgFile = document.getElementById('p-img-file').files[0];

    if (!name || !price || !stock) return alert("Faltan datos");

    let img = "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=400";
    if (imgFile) {
        img = await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(imgFile); });
    }

    products.push({ id: Date.now(), name, price: Number(price), stock: Number(stock), cat, scent, img });
    localStorage.setItem('perfumes', JSON.stringify(products));
    renderAdminDashboard();
}

// --- FUNCIÓN PARA ACTUALIZAR STOCK DESDE INPUT ---
function updateStockManual(id, element) {
    const p = products.find(p => p.id === id);
    if (p) {
        const nuevaCantidad = parseInt(element.value);
        if (!isNaN(nuevaCantidad) && nuevaCantidad >= 0) {
            p.stock = nuevaCantidad;
            localStorage.setItem('perfumes', JSON.stringify(products));
            // No renderizamos todo para no perder el foco del input, 
            // solo avisamos visualmente
            element.classList.add('border-green-500');
            setTimeout(() => element.classList.remove('border-green-500'), 1000);
        }
    }
}

// --- RENDERIZADO DEL ADMIN ACTUALIZADO ---
function renderAdminDashboard() {
    const list = document.getElementById('admin-list');
    const orders = document.getElementById('orders-list');
    if (!list || !orders) return;

    document.getElementById('stat-money').innerText = `$${sales.reduce((a, b) => a + b.total, 0)}`;
    document.getElementById('stat-orders').innerText = sales.length;
    document.getElementById('stat-prods').innerText = products.filter(p => p.stock < 3).length;

    list.innerHTML = products.map(p => `
        <div class="bg-zinc-800 p-4 rounded-2xl flex justify-between items-center mb-3 border border-white/5 hover:border-white/10 transition">
            <div class="flex items-center gap-3">
                <img src="${p.img}" class="w-10 h-10 rounded-lg object-cover">
                <div>
                    <h4 class="text-xs font-bold uppercase tracking-tighter">${p.name}</h4>
                    <p class="text-[9px] text-zinc-500">$${p.price}</p>
                </div>
            </div>
            
            <div class="flex items-center gap-4">
                <div class="flex flex-col items-end">
                    <span class="text-[9px] text-zinc-500 uppercase font-bold mb-1">Stock</span>
                    <input type="number" 
                           value="${p.stock}" 
                           onchange="updateStockManual(${p.id}, this)"
                           class="w-16 bg-zinc-900 border border-white/10 rounded-lg py-1 px-2 text-center text-xs font-mono focus:border-yellow-500 outline-none transition">
                </div>
                <button onclick="deleteProduct(${p.id})" class="text-zinc-600 hover:text-red-500 transition">
                    <i class="fas fa-trash-alt text-sm"></i>
                </button>
            </div>
        </div>
    `).join('');

    orders.innerHTML = sales.slice().reverse().map(s => `
        <div class="bg-zinc-900 p-3 rounded-xl mb-2 flex justify-between border-l-4 ${s.status === 'Pagado' ? 'border-green-500' : 'border-orange-500'}">
            <div class="text-[10px]"><b>${s.id}</b> - ${s.status}<br>$${s.total}</div>
            <button onclick="nextStatus('${s.id}')" class="bg-zinc-800 px-2 rounded text-[10px] uppercase font-bold">Cambiar</button>
        </div>
    `).join('');
}

function nextStatus(id) {
    const o = sales.find(s => s.id === id);
    o.status = o.status === "Pendiente" ? "Pagado" : "Pendiente";
    localStorage.setItem('sales', JSON.stringify(sales));
    renderAdminDashboard();
}

function deleteProduct(id) {
    products = products.filter(p => p.id !== id);
    localStorage.setItem('perfumes', JSON.stringify(products));
    renderAdminDashboard();
}

// Función para borrar todos los pedidos que ya están marcados como "Pagado"
function clearPaidOrders() {
    const totalPagados = sales.filter(s => s.status === "Pagado").length;
    
    if (totalPagados === 0) {
        alert("No hay pedidos pagados para borrar.");
        return;
    }

    if (confirm(`¿Estás seguro de que quieres borrar los ${totalPagados} pedidos pagados del historial?`)) {
        // Filtramos para quedarnos solo con los que NO están pagados
        sales = sales.filter(s => s.status !== "Pagado");
        localStorage.setItem('sales', JSON.stringify(sales));
        renderAdminDashboard(); // Actualizamos la vista
    }
}