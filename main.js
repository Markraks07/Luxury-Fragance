// --- 1. CONFIGURACIÓN SUPABASE ---
const supabaseUrl = 'https://lccffohqkkhdgkrkmqis.supabase.co'; 
const supabaseKey = 'sb_publishable_TSrbCJJ1HPGP0-VTMyEeNg_K9plq-mp';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- 2. VARIABLES GLOBALES ---
let products = [];
let sales = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let activeDiscount = 0;

// --- 3. INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 Conectado a Luxury Supabase");
    
    if (document.getElementById('catalog')) {
        await loadProducts();
        renderCatalog(products);
    }
    if (document.getElementById('admin-list')) {
        checkAdminAccess();
    }
    if (document.getElementById('cart-items')) {
        renderCart();
    }
    updateCartCount();
});

// --- 4. CARGA DE DATOS ---
async function loadProducts() {
    try {
        const { data, error } = await supabaseClient.from('productos').select('*');
        if (error) throw error;
        products = data || [];
    } catch (err) {
        console.error("Error cargando productos:", err.message);
    }
}

async function loadOrders() {
    try {
        const { data, error } = await supabaseClient.from('pedidos').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        sales = data || [];
    } catch (err) {
        console.error("Error cargando pedidos:", err.message);
    }
}

// --- 5. TIENDA Y CATÁLOGO ---
function renderCatalog(list) {
    const container = document.getElementById('catalog');
    if (!container) return;
    
    container.innerHTML = list.map(p => `
        <div class="bg-zinc-900 border border-white/5 p-5 rounded-3xl group relative overflow-hidden">
            ${p.stock <= 0 ? '<div class="absolute inset-0 bg-black/80 z-20 flex items-center justify-center font-black text-red-500 uppercase rotate-12 border-2 border-red-500 m-4">Agotado</div>' : ''}
            <img src="${p.img}" class="h-64 w-full object-cover rounded-2xl mb-4 group-hover:scale-105 transition duration-500">
            <h3 class="font-bold text-lg uppercase gold-text">${p.name}</h3>
            <p class="text-[10px] text-zinc-500 mb-4 uppercase italic">Stock: ${p.stock}</p>
            <div class="flex justify-between items-center">
                <span class="text-white font-black text-2xl font-mono">$${p.price}</span>
                <button onclick="addToCart('${p.id}')" ${p.stock <= 0 ? 'disabled' : ''} class="bg-white text-black px-6 py-2 rounded-xl font-bold text-xs hover:bg-yellow-500 transition uppercase shadow-lg">
                    Añadir
                </button>
            </div>
        </div>
    `).join('') || '<p class="col-span-full text-center text-zinc-500 py-10 uppercase text-xs">No hay productos disponibles.</p>';
}

function addToCart(id) {
    const p = products.find(item => String(item.id) === String(id));
    if (p && p.stock > 0) {
        cart.push({...p});
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        alert(`✅ ${p.name} añadido al carrito`);
    }
}

function updateCartCount() {
    const el = document.getElementById('cart-count');
    if (el) el.innerText = cart.length;
}

// --- 6. CARRITO Y CHECKOUT ---
function renderCart() {
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('total-price');
    if (!container) return;

    let subtotal = cart.reduce((acc, item) => acc + Number(item.price), 0);
    let totalFinal = subtotal * (1 - activeDiscount);

    container.innerHTML = cart.map((item, index) => `
        <div class="flex items-center justify-between bg-zinc-900 p-4 rounded-2xl mb-3 border border-white/5">
            <div class="flex items-center gap-4">
                <img src="${item.img}" class="w-12 h-12 rounded-lg object-cover">
                <span class="font-bold text-sm uppercase">${item.name}</span>
            </div>
            <button onclick="removeFromCart(${index})" class="text-red-500"><i class="fas fa-trash"></i></button>
        </div>
    `).join('') || '<p class="text-center py-10 text-zinc-600 uppercase text-xs">CARRITO VACÍO</p>';

    if (totalEl) totalEl.innerText = `$${totalFinal.toFixed(2)}`;
}

function applyCoupon() {
    const codeInput = document.getElementById('coupon-input');
    if (!codeInput) return;
    
    const code = codeInput.value.toUpperCase().trim();
    
    // Objeto con todos los cupones y sus porcentajes
    const cupones = {
        "LUXURY10": 0.10,
        "PRIMO20": 0.20,
        "DELUXE05": 0.05,
        "VIP30": 0.30,
        "GOLDEN15": 0.15,
        "SUMMER25": 0.25,
        "BLACKFRIDAY": 0.40,
        "FRAGANCE12": 0.12,
        "LANZAMIENTO": 0.18
    };

    if (cupones[code]) {
        activeDiscount = cupones[code];
        alert(`✨ Cupón aplicado: ${(activeDiscount * 100)}% de descuento`);
    } else {
        alert("❌ Cupón no válido");
        activeDiscount = 0;
    }
    
    renderCart(); // Para que el precio se actualice en pantalla
}

function removeFromCart(index) {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    updateCartCount();
}

async function checkout() {
    if (cart.length === 0) return alert("El carrito está vacío");
    const total = cart.reduce((a, b) => a + Number(b.price), 0) * (1 - activeDiscount);
    
    const { error } = await supabaseClient.from('pedidos').insert([{ 
        total: total, 
        status: "Pendiente",
        resumen: cart.map(p => p.name).join(', ')
    }]);

    if (!error) {
        const tel = "34635399055"; // NÚMERO DE TU PRIMO ACTUALIZADO
        let msg = `*PEDIDO LUXURY*%0A-----------------%0A${cart.map(p => `• ${p.name}`).join('%0A')}%0A-----------------%0A*TOTAL: $${total.toFixed(2)}*`;
        cart = [];
        localStorage.removeItem('cart');
        window.open(`https://wa.me/${tel}?text=${msg}`, '_blank');
        window.location.href = "index.html";
    } else {
        alert("Error al guardar pedido: " + error.message);
    }
}

// --- 7. PANEL ADMIN ---
function checkAdminAccess() {
    if (sessionStorage.getItem('isAdmin') === 'true') {
        document.getElementById('login-overlay')?.classList.add('hidden');
        refreshAdminData();
    }
}

function checkLogin() {
    const pass = document.getElementById('admin-pass').value;
    if (pass === "Deluxe_0101") { // CONTRASEÑA ACTUALIZADA
        sessionStorage.setItem('isAdmin', 'true');
        location.reload();
    } else { alert("❌ Contraseña incorrecta"); }
}

async function refreshAdminData() {
    await loadProducts();
    await loadOrders();
    renderAdminDashboard();
}

function renderAdminDashboard() {
    const list = document.getElementById('admin-list');
    const orders = document.getElementById('orders-list');
    
    if (list) {
        list.innerHTML = products.map(p => `
            <div class="bg-zinc-800 p-4 rounded-2xl flex justify-between items-center mb-2 border border-white/5">
                <span class="text-xs font-bold uppercase">${p.name} (Stock: ${p.stock})</span>
                <div class="flex items-center gap-3">
                    <input type="number" value="${p.stock}" onchange="updateStockManual('${p.id}', this)" class="w-16 bg-zinc-900 rounded text-center text-xs py-1 border border-white/10 outline-none">
                    <button onclick="deleteProduct('${p.id}')" class="text-red-500"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }
    if (orders) {
        orders.innerHTML = sales.map(s => `
            <div class="bg-zinc-900 p-4 rounded-xl mb-2 flex justify-between border-l-4 ${s.status === 'Pagado' ? 'border-green-500' : 'border-orange-500'}">
                <div class="text-[10px]">
                    <b class="uppercase">ID: ${s.id.slice(0,8)}</b> - ${s.status}<br>
                    <span class="text-zinc-500">${s.resumen}</span><br>
                    <span class="text-white font-bold">$${s.total}</span>
                </div>
                <button onclick="nextStatus('${s.id}', '${s.status}')" class="bg-zinc-800 px-3 py-1 rounded-lg text-[10px] uppercase font-bold">Estado</button>
            </div>
        `).join('');
    }
}

async function updateStockManual(id, element) {
    await supabaseClient.from('productos').update({ stock: parseInt(element.value) }).eq('id', id);
}

async function handleCreate() {
    const name = document.getElementById('p-name').value;
    const price = document.getElementById('p-price').value;
    const stock = document.getElementById('p-stock').value;
    const cat = document.getElementById('p-cat')?.value || "unisex";
    const scent = document.getElementById('p-scent')?.value || "dulce";
    const file = document.getElementById('p-img-file').files[0];

    if(!name || !price || !stock) return alert("Rellena todos los campos");

    let img = "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=400";
    if (file) {
        const reader = new FileReader();
        img = await new Promise(r => { reader.onload = () => r(reader.result); reader.readAsDataURL(file); });
    }

    const { error } = await supabaseClient.from('productos').insert([{ name, price: Number(price), stock: Number(stock), cat, scent, img }]);
    if (!error) { alert("✨ Producto publicado"); refreshAdminData(); }
}

async function deleteProduct(id) {
    if(confirm("¿Borrar producto permanentemente?")) {
        await supabaseClient.from('productos').delete().eq('id', id);
        refreshAdminData();
    }
}

async function nextStatus(id, current) {
    const nuevo = current === "Pendiente" ? "Pagado" : "Pendiente";
    await supabaseClient.from('pedidos').update({ status: nuevo }).eq('id', id);
    refreshAdminData();
}

async function clearPaidOrders() {
    if(confirm("¿Limpiar historial de pedidos pagados?")) {
        await supabaseClient.from('pedidos').delete().eq('status', 'Pagado');
        refreshAdminData();
    }
}

