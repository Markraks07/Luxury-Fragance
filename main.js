// --- 1. CONFIGURACIÓN SUPABASE ---
const supabaseUrl = 'https://lccffohqkkhdgkrkmqis.supabase.co'; 
const supabaseKey = 'sb_publishable_TSrbCJJ1HPGP0-VTMyEeNg_K9plq-mp';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- 2. VARIABLES GLOBALES ---
let products = [];
let sales = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let activeDiscount = 0; // 0.10 sería un 10%

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
            ${p.stock <= 0 ? '<div class="absolute inset-0 bg-black/80 z-20 flex items-center justify-center font-bold text-red-500 uppercase rotate-12 border-2 border-red-500 m-4 text-center p-2">AGOTADO</div>' : ''}
            
            <img src="${p.img}" class="h-64 w-full object-cover rounded-2xl mb-4 shadow-lg">
            <h3 class="font-bold text-lg uppercase gold-text">${p.name}</h3>
            <p class="text-[10px] text-zinc-500 mb-2 uppercase italic tracking-widest">${p.scent} | Stock: ${p.stock}</p>
            
            <div class="flex justify-between items-center">
                <span class="text-white font-black text-2xl font-mono">$${p.price}</span>
                <button onclick="addToCart('${p.id}')" ${p.stock <= 0 ? 'disabled' : ''} 
                    class="bg-white text-black px-6 py-2 rounded-xl font-bold text-xs hover:bg-yellow-500 disabled:opacity-30 transition uppercase tracking-tighter">
                    ${p.stock <= 0 ? 'Sin Stock' : 'Añadir'}
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

// --- 6. CARRITO Y CUPONES ---
function renderCart() {
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('total-price');
    if (!container) return;

    let subtotal = cart.reduce((acc, item) => acc + Number(item.price), 0);
    let ahorro = subtotal * activeDiscount;
    let totalFinal = subtotal - ahorro;

    container.innerHTML = cart.map((item, index) => `
        <div class="flex items-center justify-between bg-zinc-900 p-4 rounded-2xl mb-3 border border-white/5 shadow-inner">
            <div class="flex items-center gap-3">
                <img src="${item.img}" class="w-12 h-12 rounded-lg object-cover">
                <span class="font-bold text-sm uppercase">${item.name}</span>
            </div>
            <button onclick="removeFromCart(${index})" class="text-red-500 hover:scale-110 transition"><i class="fas fa-trash"></i></button>
        </div>
    `).join('') || '<p class="text-center py-10 text-zinc-600 uppercase text-xs tracking-widest">Carrito Vacío</p>';

    // Mostrar el precio con descuento si hay cupón
    if (totalEl) {
        totalEl.innerHTML = activeDiscount > 0 
            ? `<span class="text-zinc-500 line-through text-lg mr-2">$${subtotal.toFixed(2)}</span> <span class="text-green-500">$${totalFinal.toFixed(2)}</span>`
            : `$${totalFinal.toFixed(2)}`;
    }
}

function applyCoupon() {
    const codeInput = document.getElementById('coupon-input');
    if (!codeInput) return;
    
    const code = codeInput.value.toUpperCase().trim();
    
    // Configura aquí tus cupones
    if (code === "LUXURY10") {
        activeDiscount = 0.10;
        alert("✨ Cupón del 10% aplicado");
    } else if (code === "PRIMO20") {
        activeDiscount = 0.20;
        alert("✨ Cupón del 20% aplicado");
    } else {
        alert("❌ Cupón no válido");
        activeDiscount = 0;
    }
    renderCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    updateCartCount();
}

async function checkout() {
    if (cart.length === 0) return alert("El carrito está vacío");

    let subtotal = cart.reduce((a, b) => a + Number(b.price), 0);
    let totalFinal = subtotal * (1 - activeDiscount);
    const resumenPedido = cart.map(p => p.name).join(', ');

    // 1. Guardar pedido en Supabase
    const { error } = await supabaseClient.from('pedidos').insert([{ 
        total: totalFinal, 
        status: "Pendiente",
        resumen: resumenPedido
    }]);

    if (!error) {
        const tel = "34635399055"; // TELÉFONO DEL DUEÑO
        let listaMsg = cart.map(p => `• ${p.name}`).join('%0A');
        let couponMsg = activeDiscount > 0 ? `%0A*Cupón aplicado:* -${activeDiscount * 100}%` : '';
        
        let msg = `*NUEVO PEDIDO LUXURY*%0A--------------------------%0A${listaMsg}${couponMsg}%0A--------------------------%0A*TOTAL FINAL: $${totalFinal.toFixed(2)}*`;
        
        cart = [];
        localStorage.removeItem('cart');
        window.open(`https://wa.me/${tel}?text=${msg}`, '_blank');
        window.location.href = "index.html";
    } else {
        alert("Error al procesar: " + error.message);
    }
}

// --- 7. ADMIN Y GESTIÓN ---
function checkLogin() {
    const pass = document.getElementById('admin-pass').value;
    if (pass === "Deluxe_0101") {
        sessionStorage.setItem('isAdmin', 'true');
        document.getElementById('login-overlay').classList.add('hidden');
        refreshAdminData();
    } else { alert("Contraseña incorrecta"); }
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
                    <span class="text-[9px] text-zinc-500 uppercase">Stock:</span>
                    <input type="number" value="${p.stock}" onchange="updateStockManual('${p.id}', this)" class="w-14 bg-zinc-900 rounded-lg text-center text-xs py-1 border border-white/10 outline-none focus:border-yellow-500">
                    <button onclick="deleteProduct('${p.id}')" class="text-red-500 hover:text-red-400 transition"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }

    if (orders) {
        orders.innerHTML = sales.map(s => `
            <div class="bg-zinc-900 p-4 rounded-2xl mb-2 flex justify-between items-center border-l-4 ${s.status === 'Pagado' ? 'border-green-500' : 'border-orange-500'}">
                <div class="text-[10px]">
                    <b class="uppercase">ID: ${s.id}</b> - <span class="gold-text">${s.status}</span><br>
                    <span class="text-zinc-500">${s.resumen}</span><br>
                    <span class="text-white font-bold">$${s.total}</span>
                </div>
                <button onclick="nextStatus('${s.id}', '${s.status}')" class="bg-zinc-800 px-3 py-1 rounded-lg text-[10px] uppercase font-bold hover:bg-zinc-700 transition">Estado</button>
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
    const imgFile = document.getElementById('p-img-file').files[0];

    if(!name || !price || !stock) {
        alert("Por favor, rellena Nombre, Precio y Stock.");
        return;
    }

    let img = "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=400";
    
    try {
        if (imgFile) {
            const reader = new FileReader();
            img = await new Promise((resolve) => {
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(imgFile);
            });
        }

        const { error } = await supabaseClient.from('productos').insert([
            { 
                name: name, 
                price: Number(price), 
                stock: Number(stock), 
                cat: cat, 
                scent: scent, 
                img: img 
            }
        ]);

        if (error) throw error;

        alert("✨ ¡Producto publicado con éxito!");
        refreshAdminData();
        
        // Limpiar campos
        document.getElementById('p-name').value = "";
        document.getElementById('p-price').value = "";
        document.getElementById('p-stock').value = "";
    } catch (err) {
        console.error("Error al publicar:", err);
        alert("Error de Supabase: " + err.message);
    }
}

async function nextStatus(id, current) {
    const nuevo = current === "Pendiente" ? "Pagado" : "Pendiente";
    await supabaseClient.from('pedidos').update({ status: nuevo }).eq('id', id);
    refreshAdminData();
}

async function deleteProduct(id) {
    if(confirm("¿Seguro que quieres borrar este producto de la nube?")) {
        await supabaseClient.from('productos').delete().eq('id', id);
        refreshAdminData();
    }
}


