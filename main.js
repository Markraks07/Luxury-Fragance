// --- 1. CONFIGURACIÓN SUPABASE ---
const supabaseUrl = 'https://tsrbcjj1hpgp0-vtmyeeng.supabase.co'; 
const supabaseKey = 'sb_publishable_TSrbCJJ1HPGP0-VTMyEeNg_K9plq-mp';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- 2. VARIABLES GLOBALES (Estado de la App) ---
let products = [];
let sales = [];
let cart = [];
let activeDiscount = 0;

// Carga segura del carrito del localStorage
try {
    const savedCart = localStorage.getItem('cart');
    cart = savedCart ? JSON.parse(savedCart) : [];
} catch (e) {
    cart = [];
}

// --- 3. INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 Luxury System Online");
    
    // Detectar página actual y cargar datos específicos
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

// --- 4. CARGA DE DATOS (READ) ---
async function loadProducts() {
    const { data, error } = await supabaseClient.from('productos').select('*');
    if (error) return console.error("Error cargando productos:", error);
    products = data || [];
    return data;
}

async function loadOrders() {
    const { data, error } = await supabaseClient
        .from('pedidos')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) return console.error("Error cargando pedidos:", error);
    sales = data || [];
    return data;
}

// --- 5. FUNCIONES DE TIENDA (index.html) ---
function renderCatalog(list) {
    const container = document.getElementById('catalog');
    if (!container) return;
    
    if (list.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center py-20 text-zinc-500 uppercase text-xs tracking-widest">No hay productos disponibles</p>`;
        return;
    }

    container.innerHTML = list.map(p => `
        <div class="bg-zinc-900 border border-white/5 p-5 rounded-3xl group relative overflow-hidden hover:border-yellow-500/30 transition-all">
            ${p.stock <= 0 ? '<div class="absolute inset-0 bg-black/80 z-10 flex items-center justify-center font-black text-red-500 uppercase rotate-12 border-2 border-red-500 m-4">Agotado</div>' : ''}
            <img src="${p.img}" class="h-72 w-full object-cover rounded-2xl mb-4 group-hover:scale-105 transition duration-500">
            <h3 class="font-bold text-xl uppercase gold-text tracking-tighter">${p.name}</h3>
            <p class="text-[10px] text-zinc-500 mb-4 uppercase italic tracking-widest">${p.scent} | ${p.cat}</p>
            <div class="flex justify-between items-center">
                <span class="text-white font-black text-2xl font-mono">$${p.price}</span>
                <button onclick="addToCart('${p.id}')" ${p.stock <= 0 ? 'disabled' : ''} class="bg-white text-black px-6 py-2 rounded-xl font-bold text-xs hover:bg-yellow-500 transition shadow-lg shadow-white/5 uppercase">
                    Añadir
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

function startRecommender() {
    const gen = prompt("¿Para quién buscas? (hombre/mujer/unisex)");
    const aroma = prompt("¿Qué aroma prefieres? (fuerte/dulce/citrico)");
    const match = products.find(p => p.cat == gen && p.scent == aroma && p.stock > 0);
    if(match) { alert("IA sugiere: " + match.name); renderCatalog([match]); }
    else { alert("No hay coincidencias exactas."); }
}

function addToCart(id) {
    const p = products.find(item => String(item.id) === String(id));
    if (p && p.stock > 0) {
        cart.push({...p});
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        alert(`✅ ${p.name} añadido`);
    }
}

function updateCartCount() {
    const el = document.getElementById('cart-count');
    if (el) el.innerText = cart.length;
}

// --- 6. CARRITO (carrito.html) ---
function renderCart() {
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('total-price');
    if (!container) return;

    let total = cart.reduce((acc, item) => acc + Number(item.price), 0);
    let finalTotal = total * (1 - activeDiscount);

    container.innerHTML = cart.map((item, index) => `
        <div class="flex items-center justify-between bg-zinc-900 p-4 rounded-2xl mb-3 border border-white/5">
            <div class="flex items-center gap-4">
                <img src="${item.img}" class="w-14 h-14 rounded-xl object-cover">
                <div>
                    <h4 class="font-bold text-sm uppercase">${item.name}</h4>
                    <p class="text-xs text-yellow-500">$${item.price}</p>
                </div>
            </div>
            <button onclick="removeFromCart(${index})" class="text-zinc-500 hover:text-red-500 transition px-2">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `).join('') || '<p class="text-center py-20 text-zinc-600 uppercase text-[10px] tracking-widest">El carrito está vacío</p>';

    if (totalEl) totalEl.innerText = `$${finalTotal.toFixed(2)}`;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    updateCartCount();
}

function applyCoupon() {
    const code = document.getElementById('coupon-input').value.toUpperCase();
    if(code === "PRIMO10") {
        activeDiscount = 0.10;
        alert("Cupón aceptado (-10%)");
        renderCart();
    } else { alert("Cupón inválido"); }
}

async function checkout() {
    if (cart.length === 0) return;
    const total = cart.reduce((a, b) => a + Number(b.price), 0) * (1 - activeDiscount);
    
    const { error } = await supabaseClient.from('pedidos').insert([{ 
        total: total, 
        status: "Pendiente",
        resumen: cart.map(p => p.name).join(', ')
    }]);

    if (!error) {
        const tel = "34600000000"; // TELÉFONO DEL DUEÑO
        let lista = cart.map(p => `• ${p.name}`).join('%0A');
        let msg = `*NUEVO PEDIDO*%0A${lista}%0A*TOTAL: $${total.toFixed(2)}*`;
        cart = [];
        localStorage.removeItem('cart');
        window.open(`https://wa.me/${tel}?text=${msg}`, '_blank');
        window.location.href = "index.html";
    }
}

// --- 7. PANEL ADMIN (admin.html) ---
function checkAdminAccess() {
    if (sessionStorage.getItem('isAdmin') === 'true') {
        document.getElementById('login-overlay')?.classList.add('hidden');
        refreshAdminData();
    }
}

function checkLogin() {
    const pass = document.getElementById('admin-pass').value;
    if (pass === "admin123") {
        sessionStorage.setItem('isAdmin', 'true');
        location.reload();
    } else { alert("Acceso Denegado"); }
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
                <span class="text-xs font-bold uppercase tracking-tighter">${p.name}</span>
                <div class="flex items-center gap-3">
                    <input type="number" value="${p.stock}" onchange="updateStockManual('${p.id}', this)" class="w-16 bg-zinc-900 border border-white/10 rounded-lg text-center text-xs py-1 outline-none focus:border-yellow-500">
                    <button onclick="deleteProduct('${p.id}')" class="text-red-500 hover:scale-110 transition"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }

    if (orders) {
        orders.innerHTML = sales.map(s => `
            <div class="bg-zinc-900 p-4 rounded-2xl mb-2 flex justify-between items-center border-l-4 ${s.status === 'Pagado' ? 'border-green-500' : 'border-orange-500'}">
                <div class="text-[10px]">
                    <b class="uppercase">ID: ${s.id}</b> <span class="mx-1">|</span> <b>${s.status}</b><br>
                    <span class="text-zinc-500">${s.resumen}</span><br>
                    <span class="text-yellow-500 font-bold">$${s.total}</span>
                </div>
                <button onclick="nextStatus('${s.id}', '${s.status}')" class="bg-zinc-800 px-3 py-1 rounded-lg text-[10px] font-bold uppercase hover:bg-zinc-700 transition">Estado</button>
            </div>
        `).join('');
    }
}

async function updateStockManual(id, element) {
    const val = parseInt(element.value);
    const { error } = await supabaseClient.from('productos').update({ stock: val }).eq('id', id);
    if (!error) {
        element.classList.add('border-green-500');
        setTimeout(() => element.classList.remove('border-green-500'), 500);
    }
}

async function handleCreate() {
    const name = document.getElementById('p-name').value;
    const price = document.getElementById('p-price').value;
    const stock = document.getElementById('p-stock').value;
    const cat = document.getElementById('p-cat').value;
    const scent = document.getElementById('p-scent').value;
    const file = document.getElementById('p-img-file').files[0];

    if(!name || !price) return alert("Faltan datos");

    let img = "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=400";
    if (file) {
        const reader = new FileReader();
        img = await new Promise(r => { reader.onload = () => r(reader.result); reader.readAsDataURL(file); });
    }

    const { error } = await supabaseClient.from('productos').insert([{ name, price: Number(price), stock: Number(stock), cat, scent, img }]);
    if (!error) { alert("✨ Publicado"); refreshAdminData(); }
}

async function nextStatus(id, current) {
    const nuevo = current === "Pendiente" ? "Pagado" : "Pendiente";
    await supabaseClient.from('pedidos').update({ status: nuevo }).eq('id', id);
    refreshAdminData();
}

async function deleteProduct(id) {
    if(confirm("¿Eliminar perfume?")) {
        await supabaseClient.from('productos').delete().eq('id', id);
        refreshAdminData();
    }
}

async function clearPaidOrders() {
    if(confirm("¿Borrar pedidos pagados del historial?")) {
        await supabaseClient.from('pedidos').delete().eq('status', 'Pagado');
        refreshAdminData();
    }
}
