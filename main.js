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
    console.log("🚀 Sistema Luxury iniciado");
    
    // Carga inicial según la página
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

// --- 3. CARGA DE DATOS (READ) ---
async function loadProducts() {
    const { data, error } = await supabaseClient.from('productos').select('*');
    if (error) {
        console.error("Error cargando productos:", error);
        return [];
    }
    products = data;
    console.log("📦 Productos cargados:", products.length);
    return data;
}

async function loadOrders() {
    const { data, error } = await supabaseClient
        .from('pedidos')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) {
        console.error("Error cargando pedidos:", error);
        return [];
    }
    sales = data;
    return data;
}

// --- 4. TIENDA Y CARRITO ---
function renderCatalog(list) {
    const container = document.getElementById('catalog');
    if (!container) return;
    
    if (list.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center py-20 text-zinc-500">No hay perfumes disponibles. Ve al Admin para añadir uno.</p>`;
        return;
    }

    container.innerHTML = list.map(p => `
        <div class="bg-zinc-900 border border-white/5 p-5 rounded-3xl hover:border-yellow-500/50 transition-all group relative">
            ${p.stock <= 0 ? '<div class="absolute inset-0 bg-black/70 z-10 flex items-center justify-center rounded-3xl font-black text-red-500 uppercase rotate-12 border-2 border-red-500 m-2">Sin Stock</div>' : ''}
            <div class="relative overflow-hidden rounded-2xl mb-4">
                <img src="${p.img}" class="h-72 w-full object-cover group-hover:scale-110 transition duration-500">
            </div>
            <h3 class="font-bold text-xl uppercase tracking-tighter gold-text">${p.name}</h3>
            <p class="text-[10px] text-zinc-500 mb-4 uppercase tracking-widest">${p.scent} | ${p.cat}</p>
            <div class="flex justify-between items-center">
                <span class="text-white font-black text-2xl font-mono">$${p.price}</span>
                <button onclick="addToCart('${p.id}')" ${p.stock <= 0 ? 'disabled' : ''} class="bg-white text-black px-6 py-2 rounded-xl font-bold text-xs hover:bg-yellow-500 transition uppercase shadow-lg shadow-white/5">
                    Añadir
                </button>
            </div>
        </div>
    `).join('');
}

function addToCart(id) {
    // Buscamos comparando como strings para evitar errores de tipo
    const p = products.find(item => String(item.id) === String(id));

    if (p && p.stock > 0) {
        cart.push({...p});
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        
        // Efecto visual rápido
        const btn = event.target;
        const originalText = btn.innerText;
        btn.innerText = "¡AÑADIDO!";
        btn.classList.replace('bg-white', 'bg-green-500');
        setTimeout(() => {
            btn.innerText = originalText;
            btn.classList.replace('bg-green-500', 'bg-white');
        }, 800);
    } else {
        alert("Producto no disponible");
    }
}

function updateCartCount() {
    const el = document.getElementById('cart-count');
    if (el) el.innerText = cart.length;
}

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
    `).join('') || '<p class="text-center py-20 text-zinc-600 uppercase text-xs tracking-widest">Carrito vacío</p>';

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
    
    const { error } = await supabaseClient.from('pedidos').insert([{ 
        total: totalFinal, 
        status: "Pendiente",
        resumen: cart.map(p => p.name).join(', ')
    }]);

    if (!error) {
        const tel = "34600000000"; // CAMBIAR POR EL REAL
        let lista = cart.map(p => `• ${p.name} ($${p.price})`).join('%0A');
        let msg = `*NUEVO PEDIDO LUXURY*%0A--------------------------%0A${lista}%0A--------------------------%0A*TOTAL: $${totalFinal.toFixed(2)}*%0A%0A_Por favor, envíeme los datos de pago._`;
        
        cart = [];
        localStorage.removeItem('cart');
        window.open(`https://wa.me/${tel}?text=${msg}`, '_blank');
        window.location.href = "index.html";
    }
}

// --- 5. BUSCADOR Y RECOMENDADOR ---
function searchProduct() {
    const term = document.getElementById('search-input').value.toLowerCase();
    const filtered = products.filter(p => p.name.toLowerCase().includes(term));
    renderCatalog(filtered);
}

function startRecommender() {
    const gen = prompt("¿Para quién es el perfume? (hombre / mujer / unisex)");
    if(!gen) return;
    const aroma = prompt("¿Qué aroma prefieres? (fuerte / dulce / citrico)");
    if(!aroma) return;
    
    const match = products.find(p => p.cat.toLowerCase() === gen.toLowerCase() && p.scent.toLowerCase() === aroma.toLowerCase() && p.stock > 0);
    
    if(match) {
        alert("✨ La IA Luxury sugiere: " + match.name);
        renderCatalog([match]);
    } else {
        alert("No hay una coincidencia exacta, pero te mostramos toda nuestra colección.");
        renderCatalog(products);
    }
}

// --- 6. GESTIÓN ADMIN ---
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
        alert("Contraseña incorrecta");
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
        <div class="bg-zinc-800 p-4 rounded-2xl flex justify-between items-center mb-3 border border-white/5">
            <div class="flex items-center gap-3">
                <img src="${p.img}" class="w-10 h-10 rounded-lg object-cover">
                <span class="text-xs font-bold uppercase tracking-tighter">${p.name}</span>
            </div>
            <div class="flex items-center gap-3">
                <input type="number" value="${p.stock}" onchange="updateStockManual('${p.id}', this)" class="w-16 bg-zinc-900 border border-white/10 rounded-lg text-center text-xs py-1 outline-none focus:border-yellow-500">
                <button onclick="deleteProduct('${p.id}')" class="text-red-500 hover:scale-110 transition"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');

    orders.innerHTML = sales.map(s => `
        <div class="bg-zinc-900 p-4 rounded-2xl mb-2 flex justify-between items-center border-l-4 ${s.status === 'Pagado' ? 'border-green-500' : 'border-orange-500'}">
            <div class="text-[10px]">
                <b class="text-white uppercase">ID: ${s.id}</b> <span class="mx-2">|</span> <b>${s.status}</b><br>
                <span class="text-zinc-500">${s.resumen || 'Pedido sin detalles'}</span><br>
                <span class="text-yellow-500 font-bold">$${s.total}</span>
            </div>
            <button onclick="nextStatus('${s.id}', '${s.status}')" class="bg-zinc-800 px-3 py-1 rounded-lg text-[10px] font-bold uppercase hover:bg-zinc-700 transition">Estado</button>
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
    if(confirm("¿Eliminar perfume definitivamente?")) {
        await supabaseClient.from('productos').delete().eq('id', id);
        refreshAdminData();
    }
}

async function clearPaidOrders() {
    if(confirm("¿Limpiar historial de pedidos pagados?")) {
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
    const fileEl = document.getElementById('p-img-file');

    if(!name || !price || !stock) return alert("Rellena los campos obligatorios");

    let img = "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=400";
    if (fileEl && fileEl.files[0]) {
        const reader = new FileReader();
        img = await new Promise(r => { reader.onload = () => r(reader.result); reader.readAsDataURL(fileEl.files[0]); });
    }

    const { error } = await supabaseClient.from('productos').insert([{ name, price: Number(price), stock: Number(stock), cat, scent, img }]);
    if (!error) {
        alert("✅ Perfume publicado");
        refreshAdminData();
    } else {
        alert("Error al publicar: " + error.message);
    }
}
