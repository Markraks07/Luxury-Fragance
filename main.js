// --- 1. CONFIGURACIÓN SUPABASE ---
const supabaseUrl = 'https://tsrbcjj1hpgp0-vtmyeeng.supabase.co'; 
const supabaseKey = 'sb_publishable_TSrbCJJ1HPGP0-VTMyEeNg_K9plq-mp';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- 2. VARIABLES GLOBALES ---
let products = [];
let sales = [];
let cart = [];
let activeDiscount = 0;

// Carga segura del carrito
try {
    const savedCart = localStorage.getItem('cart');
    cart = savedCart ? JSON.parse(savedCart) : [];
} catch (e) {
    cart = [];
}

// --- 3. INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 Luxury System Online");
    
    // Detectar en qué página estamos y cargar lo necesario
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

// --- 4. CARGA DE DATOS (SUPABASE) ---
async function loadProducts() {
    const { data, error } = await supabaseClient.from('productos').select('*');
    if (error) return console.error("Error:", error);
    products = data || [];
}

async function loadOrders() {
    const { data, error } = await supabaseClient.from('pedidos').select('*').order('created_at', { ascending: false });
    if (error) return console.error("Error:", error);
    sales = data || [];
}

// --- 5. FUNCIONES TIENDA (INDEX) ---
function renderCatalog(list) {
    const container = document.getElementById('catalog');
    if (!container) return;
    
    container.innerHTML = list.map(p => `
        <div class="bg-zinc-900 border border-white/5 p-5 rounded-3xl group relative">
            <img src="${p.img}" class="h-72 w-full object-cover rounded-2xl mb-4">
            <h3 class="font-bold text-xl uppercase gold-text">${p.name}</h3>
            <p class="text-[10px] text-zinc-500 mb-4 uppercase italic">${p.scent}</p>
            <div class="flex justify-between items-center">
                <span class="text-white font-black text-2xl font-mono">$${p.price}</span>
                <button onclick="addToCart('${p.id}')" class="bg-white text-black px-6 py-2 rounded-xl font-bold text-xs hover:bg-yellow-500 transition">AÑADIR</button>
            </div>
        </div>
    `).join('');
}

function addToCart(id) {
    const p = products.find(item => String(item.id) === String(id));
    if (p) {
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

// --- 6. CARRITO Y CHECKOUT ---
function renderCart() {
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('total-price');
    if (!container) return;

    let total = cart.reduce((acc, item) => acc + Number(item.price), 0);
    container.innerHTML = cart.map((item, index) => `
        <div class="flex items-center justify-between bg-zinc-900 p-4 rounded-2xl mb-3 border border-white/5">
            <div class="flex items-center gap-4">
                <img src="${item.img}" class="w-14 h-14 rounded-xl object-cover">
                <span class="font-bold text-sm uppercase">${item.name}</span>
            </div>
            <button onclick="removeFromCart(${index})" class="text-red-500 px-2"><i class="fas fa-trash"></i></button>
        </div>
    `).join('') || '<p class="text-center py-10 text-zinc-600 uppercase text-xs">Vacío</p>';

    if (totalEl) totalEl.innerText = `$${total.toFixed(2)}`;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    updateCartCount();
}

async function checkout() {
    if (cart.length === 0) return;
    const total = cart.reduce((a, b) => a + Number(b.price), 0);
    
    // Guardar pedido en Supabase
    const { error } = await supabaseClient.from('pedidos').insert([{ 
        total: total, 
        status: "Pendiente",
        resumen: cart.map(p => p.name).join(', ')
    }]);

    if (!error) {
        const tel = "34600000000"; // PON TU NÚMERO AQUÍ
        let msg = `*NUEVO PEDIDO*%0ATotal: $${total}%0AProductos: ${cart.map(p=>p.name).join(', ')}`;
        cart = [];
        localStorage.removeItem('cart');
        window.open(`https://wa.me/${tel}?text=${msg}`, '_blank');
        window.location.href = "index.html";
    }
}

// --- 7. ADMIN PANEL ---
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
    } else { alert("Error"); }
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
                <span class="text-xs font-bold uppercase">${p.name}</span>
                <div class="flex items-center gap-3">
                    <input type="number" value="${p.stock}" onchange="updateStockManual('${p.id}', this)" class="w-16 bg-zinc-900 rounded text-center text-xs py-1">
                    <button onclick="deleteProduct('${p.id}')" class="text-red-500"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }
    if (orders) {
        orders.innerHTML = sales.map(s => `
            <div class="bg-zinc-900 p-3 rounded-xl mb-2 flex justify-between border-l-4 ${s.status === 'Pagado' ? 'border-green-500' : 'border-orange-500'}">
                <div class="text-[10px]"><b>ID: ${s.id}</b> - ${s.status}<br>$${s.total}</div>
                <button onclick="nextStatus('${s.id}', '${s.status}')" class="bg-zinc-800 px-2 rounded text-[10px] uppercase">Estado</button>
            </div>
        `).join('');
    }
}

async function updateStockManual(id, element) {
    await supabaseClient.from('productos').update({ stock: parseInt(element.value) }).eq('id', id);
}

async function deleteProduct(id) {
    if(confirm("¿Borrar?")) {
        await supabaseClient.from('productos').delete().eq('id', id);
        refreshAdminData();
    }
}

async function handleCreate() {
    const name = document.getElementById('p-name').value;
    const price = document.getElementById('p-price').value;
    const stock = document.getElementById('p-stock').value;
    const cat = document.getElementById('p-cat').value;
    const scent = document.getElementById('p-scent').value;
    const file = document.getElementById('p-img-file').files[0];

    let img = "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=400";
    if (file) {
        const reader = new FileReader();
        img = await new Promise(r => { reader.onload = () => r(reader.result); reader.readAsDataURL(file); });
    }

    const { error } = await supabaseClient.from('productos').insert([{ name, price: Number(price), stock: Number(stock), cat, scent, img }]);
    if (!error) { alert("Publicado"); refreshAdminData(); }
}

async function nextStatus(id, current) {
    const nuevo = current === "Pendiente" ? "Pagado" : "Pendiente";
    await supabaseClient.from('pedidos').update({ status: nuevo }).eq('id', id);
    refreshAdminData();
}

async function clearPaidOrders() {
    if(confirm("¿Borrar pagados?")) {
        await supabaseClient.from('pedidos').delete().eq('status', 'Pagado');
        refreshAdminData();
    }
}
