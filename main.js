// --- 1. CONFIGURACIÓN SUPABASE ---
const supabaseUrl = 'https://tsrbcjj1hpgp0-vtmyeeng.supabase.co'; 
const supabaseKey = 'sb_publishable_TSrbCJJ1HPGP0-VTMyEeNg_K9plq-mp';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- 2. VARIABLES GLOBALES ---
let products = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let sales = [];

// --- 3. INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('catalog')) {
        await loadProducts();
        renderCatalog(products);
    }
    if (document.getElementById('admin-list')) {
        refreshAdminData();
    }
    if (document.getElementById('cart-items')) {
        renderCart();
    }
    updateCartCount();
});

// --- 4. CARGA DE DATOS ---
async function loadProducts() {
    const { data, error } = await supabaseClient.from('productos').select('*');
    if (error) return console.error(error);
    products = data || [];
}

async function loadOrders() {
    const { data, error } = await supabaseClient.from('pedidos').select('*').order('created_at', { ascending: false });
    if (error) return console.error(error);
    sales = data || [];
}

// --- 5. TIENDA (INDEX) ---
function renderCatalog(list) {
    const container = document.getElementById('catalog');
    if (!container) return;
    
    container.innerHTML = list.map(p => `
        <div class="bg-zinc-900 p-5 rounded-3xl relative border border-white/5 overflow-hidden">
            ${p.stock <= 0 ? '<div class="absolute inset-0 bg-black/80 z-20 flex items-center justify-center font-bold text-red-500 uppercase rotate-12 border-2 border-red-500 m-4">AGOTADO</div>' : ''}
            
            <img src="${p.img}" class="h-64 w-full object-cover rounded-2xl mb-4">
            <h3 class="font-bold text-lg uppercase gold-text">${p.name}</h3>
            <p class="text-[10px] text-zinc-500 mb-2 uppercase italic">${p.scent} | Stock: ${p.stock}</p>
            
            <div class="flex justify-between items-center">
                <span class="text-white font-black text-2xl">$${p.price}</span>
                <button onclick="addToCart('${p.id}')" ${p.stock <= 0 ? 'disabled' : ''} 
                    class="bg-white text-black px-6 py-2 rounded-xl font-bold text-xs hover:bg-yellow-500 disabled:opacity-50 transition">
                    ${p.stock <= 0 ? 'SIN STOCK' : 'AÑADIR'}
                </button>
            </div>
        </div>
    `).join('');
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

// --- 6. CARRITO Y WHATSAPP ---
function renderCart() {
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('total-price');
    if (!container) return;

    let total = cart.reduce((acc, item) => acc + Number(item.price), 0);
    container.innerHTML = cart.map((item, index) => `
        <div class="flex items-center justify-between bg-zinc-900 p-4 rounded-2xl mb-3 border border-white/5">
            <span class="font-bold text-sm uppercase">${item.name}</span>
            <button onclick="removeFromCart(${index})" class="text-red-500"><i class="fas fa-trash"></i></button>
        </div>
    `).join('') || '<p class="text-center py-10 text-zinc-600">CARRITO VACÍO</p>';

    if (totalEl) totalEl.innerText = `$${total.toFixed(2)}`;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    updateCartCount();
}

async function checkout() {
    if (cart.length === 0) return alert("El carrito está vacío");

    const total = cart.reduce((a, b) => a + Number(b.price), 0);
    const resumenPedido = cart.map(p => p.name).join(', ');

    // 1. Guardar pedido en Supabase
    const { error } = await supabaseClient.from('pedidos').insert([{ 
        total: total, 
        status: "Pendiente",
        resumen: resumenPedido
    }]);

    if (!error) {
        // 2. Preparar WhatsApp
        const tel = "34600000000"; // PON AQUÍ TU TELÉFONO REAL
        let msg = `*NUEVO PEDIDO LUXURY*%0A--------------------------%0A${cart.map(p => `• ${p.name}`).join('%0A')}%0A--------------------------%0A*TOTAL: $${total.toFixed(2)}*`;
        
        // 3. Limpiar carrito
        cart = [];
        localStorage.removeItem('cart');
        
        // 4. Abrir WhatsApp y volver al inicio
        window.open(`https://wa.me/${tel}?text=${msg}`, '_blank');
        window.location.href = "index.html";
    } else {
        alert("Error al procesar pedido: " + error.message);
    }
}

// --- 7. ADMIN ---
function checkLogin() {
    const pass = document.getElementById('admin-pass').value;
    if (pass === "admin123") {
        sessionStorage.setItem('isAdmin', 'true');
        document.getElementById('login-overlay').classList.add('hidden');
        refreshAdminData();
    } else { alert("Error"); }
}

async function refreshAdminData() {
    await loadProducts();
    await loadOrders();
    renderAdminDashboard();
}

function renderAdminDashboard() {
    const list = document.getElementById('admin-list');
    if (!list) return;
    list.innerHTML = products.map(p => `
        <div class="bg-zinc-800 p-4 rounded-2xl flex justify-between items-center mb-2 border border-white/5">
            <span class="text-xs font-bold uppercase">${p.name} (Stock: ${p.stock})</span>
            <div class="flex items-center gap-3">
                <input type="number" value="${p.stock}" onchange="updateStockManual('${p.id}', this)" class="w-16 bg-zinc-900 rounded text-center text-xs py-1">
                <button onclick="deleteProduct('${p.id}')" class="text-red-500"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

async function updateStockManual(id, element) {
    const val = parseInt(element.value);
    await supabaseClient.from('productos').update({ stock: val }).eq('id', id);
    refreshAdminData();
}

async function handleCreate() {
    const name = document.getElementById('p-name').value;
    const price = document.getElementById('p-price').value;
    const stock = document.getElementById('p-stock').value;
    const imgFile = document.getElementById('p-img-file').files[0];

    let img = "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=400";
    if (imgFile) {
        const reader = new FileReader();
        img = await new Promise(r => { reader.onload = () => r(reader.result); reader.readAsDataURL(imgFile); });
    }

    const { error } = await supabaseClient.from('productos').insert([{ name, price: Number(price), stock: Number(stock), img }]);
    if (!error) { alert("Publicado"); refreshAdminData(); }
}
