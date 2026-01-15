// --- 1. CONFIGURACIÓN SUPABASE ---
const supabaseUrl = 'https://tsrbcjj1hpgp0-vtmyeeng.supabase.co'; 
const supabaseKey = 'sb_publishable_TSrbCJJ1HPGP0-VTMyEeNg_K9plq-mp';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let products = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let sales = [];
let activeDiscount = 0;

// --- 2. INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
    // Si estamos en la tienda (index)
    if (document.getElementById('catalog')) {
        await loadProducts();
        renderCatalog(products);
    }
    
    // Si estamos en el admin
    if (document.getElementById('admin-list')) {
        checkAdminAccess();
    }

    // Si estamos en el carrito
    if (document.getElementById('cart-items')) {
        renderCart();
    }

    updateCartCount();
});

// --- 3. CARGA DE DATOS (READ) ---
async function loadProducts() {
    const { data, error } = await supabaseClient.from('productos').select('*');
    if (error) return console.error("Error Supabase:", error);
    products = data;
    return data;
}

async function loadOrders() {
    const { data, error } = await supabaseClient
        .from('pedidos')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) return console.error("Error Supabase:", error);
    sales = data;
    return data;
}

// --- 4. FUNCIONES DE TIENDA (INDEX) ---
function renderCatalog(list) {
    const container = document.getElementById('catalog');
    if (!container) return;
    container.innerHTML = list.map(p => `
        <div class="bg-zinc-900 border border-white/5 p-4 rounded-3xl hover:border-yellow-500/50 transition-all group relative">
            ${p.stock <= 0 ? '<div class="absolute inset-0 bg-black/70 z-10 flex items-center justify-center rounded-3xl font-black text-red-500 uppercase rotate-12 border-2 border-red-500">Sin Stock</div>' : ''}
            <div class="relative overflow-hidden rounded-2xl mb-4">
                <img src="${p.img}" class="h-64 w-full object-cover group-hover:scale-110 transition duration-500">
            </div>
            <h3 class="font-bold text-lg uppercase tracking-tighter gold-text">${p.name}</h3>
            <p class="text-[10px] text-zinc-500 mb-3 uppercase italic">${p.scent}</p>
            <div class="flex justify-between items-center">
                <span class="text-yellow-500 font-black text-2xl font-mono">$${p.price}</span>
                <button onclick="addToCart(${p.id})" ${p.stock <= 0 ? 'disabled' : ''} class="bg-white text-black px-6 py-2 rounded-xl font-bold text-xs hover:bg-yellow-500 transition uppercase">
                    ${p.stock <= 0 ? 'Agotado' : 'Añadir'}
                </button>
            </div>
        </div>
    `).join('');
}

function searchProduct() {
    const term = document.getElementById('search-input').value.toLowerCase();
    const filtered = products.filter(p => p.name.toLowerCase().includes(term));
    renderCatalog(filtered);
}

function addToCart(id) {
    const p = products.find(i => i.id === id);
    if (p && p.stock > 0) {
        cart.push({...p});
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        alert(`🛒 ${p.name} añadido`);
    }
}

function updateCartCount() {
    const el = document.getElementById('cart-count');
    if (el) el.innerText = cart.length;
}

// --- 5. CARRITO (CARRITO.HTML) ---
function renderCart() {
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('total-price');
    if (!container) return;

    let total = cart.reduce((acc, item) => acc + Number(item.price), 0);
    let finalTotal = total * (1 - activeDiscount);

    container.innerHTML = cart.map((item, index) => `
        <div class="flex items-center justify-between bg-zinc-900 p-4 rounded-2xl mb-2 border border-white/5">
            <span class="font-bold text-sm uppercase">${item.name}</span>
            <button onclick="removeFromCart(${index})" class="text-red-500"><i class="fas fa-trash"></i></button>
        </div>
    `).join('') || '<p class="text-center py-10 text-zinc-500">El carrito está vacío</p>';

    if (totalEl) totalEl.innerText = `$${finalTotal.toFixed(2)}`;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    updateCartCount();
}

async function checkout() {
    if (cart.length === 0) return;
    const subtotal = cart.reduce((a, b) => a + Number(b.price), 0);
    const totalFinal = subtotal * (1 - activeDiscount);
    
    // Guardar en Supabase
    const { error } = await supabaseClient.from('pedidos').insert([{ 
        total: totalFinal, 
        status: "Pendiente",
        resumen: cart.map(p => p.name).join(', ')
    }]);

    if (!error) {
        const tel = "34600000000"; // TELÉFONO DEL PRIMO
        let lista = cart.map(p => `• ${p.name}`).join('%0A');
        let msg = `*NUEVO PEDIDO*%0A${lista}%0A*Total: $${totalFinal.toFixed(2)}*`;
        
        cart = [];
        localStorage.removeItem('cart');
        window.open(`https://wa.me/${tel}?text=${msg}`, '_blank');
        window.location.href = "index.html";
    }
}

// --- 6. ADMIN (ADMIN.HTML) ---
function checkAdminAccess() {
    const isAdmin = sessionStorage.getItem('isAdmin');
    const overlay = document.getElementById('login-overlay');
    
    if (isAdmin === 'true') {
        if (overlay) overlay.classList.add('hidden');
        refreshAdminData();
    }
}

function checkLogin() {
    const pass = document.getElementById('admin-pass').value;
    if (pass === "admin123") {
        sessionStorage.setItem('isAdmin', 'true');
        document.getElementById('login-overlay').classList.add('hidden');
        refreshAdminData();
    } else {
        alert("Acceso Denegado");
    }
}

async function refreshAdminData() {
    await loadProducts();
    await loadOrders();
    renderAdminDashboard();
}

function renderAdminDashboard() {
    const list = document.getElementById('admin-list');
    const orders = document.getElementById('orders-list');
    if (!list || !orders) return;

    list.innerHTML = products.map(p => `
        <div class="bg-zinc-800 p-4 rounded-2xl flex justify-between items-center mb-2 border border-white/5">
            <span class="text-xs font-bold uppercase">${p.name}</span>
            <div class="flex items-center gap-3">
                <input type="number" value="${p.stock}" onchange="updateStockManual(${p.id}, this)" class="w-16 bg-zinc-900 border border-white/10 rounded-lg text-center text-xs py-1">
                <button onclick="deleteProduct(${p.id})" class="text-red-500"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');

    orders.innerHTML = sales.map(s => `
        <div class="bg-zinc-900 p-3 rounded-xl mb-2 flex justify-between border-l-4 ${s.status === 'Pagado' ? 'border-green-500' : 'border-orange-500'}">
            <div class="text-[10px]"><b>ID: ${s.id}</b> - ${s.status}<br>$${s.total}</div>
            <button onclick="nextStatus(${s.id}, '${s.status}')" class="bg-zinc-800 px-2 rounded text-[10px] font-bold uppercase">Estado</button>
        </div>
    `).join('');
}

async function updateStockManual(id, element) {
    const val = parseInt(element.value);
    const { error } = await supabaseClient.from('productos').update({ stock: val }).eq('id', id);
    if (!error) {
        element.classList.add('border-green-500');
        setTimeout(() => element.classList.remove('border-green-500'), 500);
    }
}

async function nextStatus(id, current) {
    const nuevo = current === "Pendiente" ? "Pagado" : "Pendiente";
    await supabaseClient.from('pedidos').update({ status: nuevo }).eq('id', id);
    refreshAdminData();
}

async function deleteProduct(id) {
    if(confirm("¿Eliminar producto de la nube?")) {
        await supabaseClient.from('productos').delete().eq('id', id);
        refreshAdminData();
    }
}

async function clearPaidOrders() {
    if(confirm("¿Borrar definitivamente todos los pedidos PAGADOS?")) {
        await supabaseClient.from('pedidos').delete().eq('status', 'Pagado');
        refreshAdminData();
    }
}

async function handleCreate() {
    const name = document.getElementById('p-name').value;
    const price = document.getElementById('p-price').value;
    const stock = document.getElementById('p-stock').value;
    const cat = document.getElementById('p-cat').value;
    const scent = document.getElementById('p-scent').value;
    const imgFile = document.getElementById('p-img-file').files[0];

    let img = "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=400";
    if (imgFile) {
        const reader = new FileReader();
        img = await new Promise(r => { reader.onload = () => r(reader.result); reader.readAsDataURL(imgFile); });
    }

    const { error } = await supabaseClient.from('productos').insert([{ name, price, stock, cat, scent, img }]);
    if (!error) {
        alert("Producto Publicado");
        refreshAdminData();
    }
}
