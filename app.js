const defaultItems = [
  { id:'espresso', name:'Espresso', price:2.5, category:'Coffee', stock:42, threshold:10, emoji:'☕', max:50, priority:'high' },
  { id:'cappuccino', name:'Cappuccino', price:3.75, category:'Coffee', stock:28, threshold:8, emoji:'☕', max:40, priority:'high' },
  { id:'iced-latte', name:'Iced latte', price:4.25, category:'Coffee', stock:18, threshold:6, emoji:'🧋', max:35, priority:'standard' },
  { id:'croissant', name:'Butter croissant', price:3.25, category:'Sweet', stock:7, threshold:5, emoji:'🥐', max:25, priority:'high' },
  { id:'brownie', name:'Dark chocolate brownie', price:3.5, category:'Sweet', stock:4, threshold:5, emoji:'🍫', max:20, priority:'critical' },
  { id:'cookies', name:'Cookie box', price:6, category:'Sweet', stock:11, threshold:4, emoji:'🍪', max:18, priority:'standard' },
  { id:'beans', name:'House beans · 250g', price:12.5, category:'Retail', stock:9, threshold:4, emoji:'🫘', max:20, priority:'high' },
  { id:'water', name:'Sparkling water', price:2, category:'Retail', stock:22, threshold:6, emoji:'💧', max:30, priority:'standard' }
];
const defaultSupplies = [
  { id:'coffee-beans', name:'Coffee beans', stock:8, threshold:2, unit:'kg', emoji:'🫘' },
  { id:'fresh-milk', name:'Fresh milk', stock:14, threshold:5, unit:'liters', emoji:'🥛' },
  { id:'paper-cups', name:'Paper cups', stock:140, threshold:40, unit:'pieces', emoji:'🥤' },
  { id:'chocolate-sauce', name:'Chocolate sauce', stock:3, threshold:1, unit:'bottles', emoji:'🍫' }
];

const $ = (id) => document.getElementById(id);
const LBP_RATE = 90000;
const priorityRank = { critical: 0, high: 1, standard: 2 };
const priorityLabel = { critical: 'Critical', high: 'High priority', standard: 'Standard' };
const pageContent = { sales:['TUESDAY, OCTOBER 14','Good morning, Saaed <span>✦</span>'], inventory:['INVENTORY CONTROL','Stock at Saad Cafe'], reports:['SALES REPORTS','Know what is selling'], expenses:['CAFE FINANCES','Track every dinar'], settings:['WORKSPACE SETTINGS','Make Saad Cafe yours'] };
let items = JSON.parse(localStorage.getItem('beanline-items') || 'null') || defaultItems;
let sales = JSON.parse(localStorage.getItem('beanline-sales') || '[]');
let expenses = JSON.parse(localStorage.getItem('saad-expenses') || '[]');
let supplies = JSON.parse(localStorage.getItem('saad-supplies') || 'null') || defaultSupplies;
const defaultSettings = { name:'Saad Cafe', currency:'USD', language:'en', closeTime:'21:00' };
let settings = {...defaultSettings, ...(JSON.parse(localStorage.getItem('saad-settings') || 'null') || {})};
let category = 'All', reportPeriod = 'today', alertsDismissed = false, orderMode = false, paymentMethod = 'Cash', cart = [], editingId = null, editingSupplyId = null, inventoryView = 'menu';
const save = () => { localStorage.setItem('beanline-items', JSON.stringify(items)); localStorage.setItem('beanline-sales', JSON.stringify(sales)); localStorage.setItem('saad-expenses', JSON.stringify(expenses)); localStorage.setItem('saad-supplies', JSON.stringify(supplies)); localStorage.setItem('saad-settings', JSON.stringify(settings)); };
const money = (number) => settings.currency === 'LBP' ? `ل.ل ${new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(Number(number) * LBP_RATE)}` : `$${Number(number).toFixed(2)}`;
const displayAmount = (number) => settings.currency === 'LBP' ? Math.round(Number(number) * LBP_RATE) : Number(number).toFixed(2);
const storedAmount = (number) => settings.currency === 'LBP' ? Number(number) / LBP_RATE : Number(number);
const today = (time) => new Date(time).toDateString() === new Date().toDateString();
const todaySales = () => sales.filter(s => today(s.time));
const todayExpenses = () => expenses.filter(e => today(e.time));
const sum = (list) => list.reduce((total, entry) => total + Number(entry.price ?? entry.amount), 0);
const attention = () => [...items, ...supplies].filter(item => item.stock <= item.threshold);
const safeId = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

function renderProducts() {
  const search = $('search').value.toLowerCase();
  const displayed = items.filter(i => (category === 'All' || i.category === category) && i.name.toLowerCase().includes(search)).sort((a,b) => priorityRank[a.priority || 'standard'] - priorityRank[b.priority || 'standard']);
  $('product-grid').innerHTML = displayed.length ? displayed.map(item => `<button class="product ${item.stock <= item.threshold ? 'low' : ''} ${item.stock === 0 ? 'out' : ''}" data-id="${item.id}" ${item.stock === 0 ? 'disabled' : ''}><span class="stock-pill">${item.stock === 0 ? 'sold out' : `${item.stock} left`}</span><span class="priority priority-${item.priority || 'standard'}">${priorityLabel[item.priority || 'standard']}</span><span class="food-icon">${item.emoji}</span><b>${item.name}</b><small>${money(item.price)}</small></button>`).join('') : '<p class="activity-empty">No menu items found.<br>Try another search.</p>';
  document.querySelectorAll('.product').forEach(button => button.addEventListener('click', () => addItem(button.dataset.id)));
}

function renderMetrics() {
  const list = todaySales(), revenue = sum(list), orderIds = new Set(list.map(s => s.orderId || s.id));
  $('today-sales').textContent = money(revenue); $('items-sold').textContent = list.length; $('average-order').textContent = money(orderIds.size ? revenue / orderIds.size : 0);
  const count = attention().length; $('attention-count').innerHTML = `${count} <small>item${count === 1 ? '' : 's'}</small>`; $('nav-alert-count').textContent = count; $('notification-badge').textContent = count || '';
}

function renderActivity() {
  const list = todaySales().slice().reverse();
  $('activity-list').innerHTML = list.length ? list.map(s => `<div class="activity"><span class="activity-icon">${s.emoji}</span><div><b>${s.name}</b><small>${new Date(s.time).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})} · ${s.payment || 'Cash'}</small></div><strong>+${money(s.price)}</strong></div>`).join('') : '<div class="activity-empty">No sales recorded yet.<br>Tap an item to get started.</div>';
  $('activity-sales').textContent = money(sum(list));
}

function renderStock() {
  const listed = (inventoryView === 'menu' ? items : supplies).slice().sort((a,b) => Number(b.stock <= b.threshold) - Number(a.stock <= a.threshold) || (priorityRank[a.priority || 'standard'] ?? 2) - (priorityRank[b.priority || 'standard'] ?? 2));
  $('stock-list').innerHTML = listed.length ? listed.map(item => { const low = item.stock <= item.threshold, max = item.max || Math.max(item.stock * 2, item.threshold * 2, 1), percent = Math.min(100, Math.round(item.stock / max * 100)), quantity = inventoryView === 'supplies' ? `${item.stock} ${item.unit}` : `${item.stock} left`; return `<article class="stock-card ${low ? 'low' : ''}"><header><span class="mini-icon">${item.emoji}</span><div><b>${item.name}</b><small>${quantity} · remind at ${item.threshold}${inventoryView === 'supplies' ? ` ${item.unit}` : ''}</small></div><span class="stock-status ${low ? 'reorder' : 'ready'}">${low ? 'Reorder' : 'In stock'}</span></header><div class="bar"><span style="width:${percent}%"></span></div><div class="stock-actions"><button ${inventoryView === 'menu' ? `data-restock="${item.id}"` : `data-supply-restock="${item.id}"`}>+ Restock</button><button ${inventoryView === 'menu' ? `data-edit="${item.id}"` : `data-edit-supply="${item.id}"`}>Edit</button><button class="delete-item" ${inventoryView === 'menu' ? `data-delete="${item.id}"` : `data-delete-supply="${item.id}"`}>Delete</button></div></article>`; }).join('') : '<div class="empty-report">Nothing here yet. Add a supply to start tracking it.</div>';
  document.querySelectorAll('[data-restock]').forEach(button => button.addEventListener('click', () => restock(button.dataset.restock)));
  document.querySelectorAll('[data-edit]').forEach(button => button.addEventListener('click', () => openEdit(button.dataset.edit)));
  document.querySelectorAll('[data-delete]').forEach(button => button.addEventListener('click', () => deleteItem(button.dataset.delete)));
  document.querySelectorAll('[data-supply-restock]').forEach(button => button.addEventListener('click', () => restockSupply(button.dataset.supplyRestock)));
  document.querySelectorAll('[data-edit-supply]').forEach(button => button.addEventListener('click', () => openSupply(button.dataset.editSupply)));
  document.querySelectorAll('[data-delete-supply]').forEach(button => button.addEventListener('click', () => deleteSupply(button.dataset.deleteSupply)));
  const low = attention(); $('low-stock-alert').hidden = !low.length || alertsDismissed; $('alert-text').textContent = low.length === 1 ? `${low[0].name} has only ${low[0].stock} left (your reminder level is ${low[0].threshold}).` : `${low.length} items are at or below their reminder level: ${low.map(item => item.name).join(', ')}.`;
  $('menu-stock-count').textContent = items.length; $('supply-stock-count').textContent = supplies.length; $('reorder-count').textContent = low.length;
}

function salesForReport() { const now = Date.now(); return sales.filter(s => reportPeriod === 'all' || reportPeriod === 'today' && today(s.time) || reportPeriod === 'week' && s.time >= now - 7 * 86400000); }
function expensesForReport() { const now = Date.now(); return expenses.filter(e => reportPeriod === 'all' || reportPeriod === 'today' && today(e.time) || reportPeriod === 'week' && e.time >= now - 7 * 86400000); }
function renderReports() {
  const relevant = salesForReport(), expenseList = expensesForReport(), revenue = sum(relevant), costs = sum(expenseList), sold = relevant.reduce((map,sale) => ({...map,[sale.name]:(map[sale.name] || 0) + 1}),{}), best = Object.entries(sold).sort((a,b) => b[1] - a[1])[0], top = relevant.slice().sort((a,b) => b.price-a.price)[0];
  const categories = relevant.reduce((map,sale) => { const item = items.find(i => i.id === sale.itemId); const key = sale.category || item?.category || 'Other'; map[key] = (map[key] || 0) + sale.price; return map; },{}), largest = Math.max(...Object.values(categories),1);
  $('report-revenue').textContent = money(revenue); $('report-sales-count').textContent = `${relevant.length} sale${relevant.length === 1 ? '' : 's'} recorded`; $('report-profit').textContent = money(revenue-costs); $('report-expense-total').textContent = costs ? `${money(costs)} in expenses` : 'No expenses recorded'; $('report-best-seller').textContent = best ? best[0] : '—'; $('report-best-seller-detail').textContent = best ? `${best[1]} sold in this period` : 'Start recording sales'; $('report-top-sale').textContent = top ? money(top.price) : money(0); $('report-top-sale-detail').textContent = top ? top.name : 'No sales yet'; $('report-summary').textContent = relevant.length ? `${relevant.length} sale${relevant.length === 1 ? '' : 's'} in this period` : 'Tap menu items to build your report.';
  $('category-report').innerHTML = Object.keys(categories).length ? Object.entries(categories).sort((a,b) => b[1]-a[1]).map(([name,value]) => `<div class="category-line"><span>${name}</span><div><i style="width:${value/largest*100}%"></i></div><b>${money(value)}</b></div>`).join('') : '<div class="empty-report">No sales yet — your category insights will appear here.</div>';
  const itemSummary = relevant.reduce((map,sale) => { map[sale.name] ||= {qty:0,total:0,emoji:sale.emoji}; map[sale.name].qty++; map[sale.name].total += sale.price; return map; },{});
  $('item-sales-report').innerHTML = Object.keys(itemSummary).length ? Object.entries(itemSummary).sort((a,b) => b[1].qty-a[1].qty).map(([name,data]) => `<div class="item-sale-line"><span>${data.emoji || '☕'}</span><b>${name}</b><small>${data.qty} sold</small><strong>${money(data.total)}</strong></div>`).join('') : '<div class="empty-report">No items sold yet.</div>';
}

function renderExpenses() {
  const costs = todayExpenses(), revenue = sum(todaySales()), total = sum(costs); $('expense-revenue').textContent = money(revenue); $('expense-total').textContent = money(total); $('expense-profit').textContent = money(revenue-total);
  $('expense-list').innerHTML = costs.length ? costs.slice().reverse().map(expense => `<article class="expense-entry"><span class="expense-icon">◒</span><div><b>${expense.name}</b><small>${expense.category} · ${new Date(expense.time).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}</small></div><strong>−${money(expense.amount)}</strong><button data-delete-expense="${expense.id}">×</button></article>`).join('') : '<div class="empty-report">No expenses today. Add supplies, rent, or utilities when they happen.</div>';
  document.querySelectorAll('[data-delete-expense]').forEach(button => button.addEventListener('click', () => { expenses = expenses.filter(e => e.id !== button.dataset.deleteExpense); save(); render(); toast('Expense removed.'); }));
}

function renderCart() {
  const rows = Object.values(cart.reduce((map,item) => { map[item.id] ||= {...item, qty:0}; map[item.id].qty++; return map; },{}));
  $('cart-list').innerHTML = rows.length ? rows.map(item => `<div class="cart-row"><span>${item.emoji}</span><div><b>${item.name}</b><small>${money(item.price)} × ${item.qty}</small></div><strong>${money(item.price*item.qty)}</strong><button data-cart-remove="${item.id}">×</button></div>`).join('') : '<div class="activity-empty">Add items from the menu<br>to build this order.</div>';
  $('cart-total').textContent = money(sum(cart)); $('checkout').disabled = !cart.length; document.querySelectorAll('[data-cart-remove]').forEach(button => button.addEventListener('click', () => { const index = cart.findIndex(item => item.id === button.dataset.cartRemove); if (index !== -1) cart.splice(index,1); renderCart(); }));
}
function render() { renderProducts(); renderMetrics(); renderActivity(); renderStock(); renderReports(); renderExpenses(); renderCart(); }
function toast(message) { const toast = $('toast'); toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'),2400); }

function addItem(id) {
  const item = items.find(i => i.id === id); if (!item || item.stock < 1) return;
  if (orderMode) { const already = cart.filter(i => i.id === id).length; if (already >= item.stock) return toast(`Only ${item.stock} ${item.name} left.`); cart.push({...item}); renderCart(); toast(`${item.name} added to order.`); return; }
  saveSale(item, 'Cash'); toast(`${item.name} recorded · ${money(item.price)}`);
}
function saveSale(item, payment, orderId = safeId()) { item.stock--; sales.push({id:safeId(), orderId, itemId:item.id, name:item.name, category:item.category, price:item.price, emoji:item.emoji, payment, time:Date.now()}); alertsDismissed = false; save(); render(); }
function checkout() { if (!cart.length) return; const counts = cart.reduce((map,item) => ({...map,[item.id]:(map[item.id] || 0)+1}),{}); if (Object.entries(counts).some(([id,qty]) => items.find(i => i.id === id)?.stock < qty)) return toast('One or more items are no longer in stock.'); const orderId = safeId(), total = sum(cart); cart.forEach(entry => saveSale(items.find(item => item.id === entry.id), paymentMethod, orderId)); cart = []; renderCart(); toast(`Payment complete · ${money(total)} by ${paymentMethod}.`); }
function restock(id) { const item = items.find(i => i.id === id), value = prompt(`How many ${item.name} do you want to add?`,'10'); if (value === null) return; const amount = Number(value); if (!Number.isFinite(amount) || amount <= 0) return toast('Enter a positive stock quantity.'); item.stock += Math.floor(amount); item.max = Math.max(item.max || 1,item.stock); save(); render(); toast(`${item.name} restocked to ${item.stock}.`); }
function deleteItem(id) { const item = items.find(i => i.id === id); if (!item || !confirm(`Delete “${item.name}” from the Saad Cafe menu? Past sales stay in your reports.`)) return; items = items.filter(i => i.id !== id); save(); render(); toast(`${item.name} was deleted.`); }
function restockSupply(id) { const supply = supplies.find(item => item.id === id), value = prompt(`How many ${supply.unit} of ${supply.name} do you want to add?`,'10'); if (value === null) return; const amount = Number(value); if (!Number.isFinite(amount) || amount <= 0) return toast('Enter a positive quantity.'); supply.stock += amount; save(); render(); toast(`${supply.name} restocked to ${supply.stock} ${supply.unit}.`); }
function deleteSupply(id) { const supply = supplies.find(item => item.id === id); if (!supply || !confirm(`Delete “${supply.name}” from supplies?`)) return; supplies = supplies.filter(item => item.id !== id); save(); render(); toast(`${supply.name} was deleted.`); }

function openEdit(id) { const item = items.find(i => i.id === id); if (!item) return; editingId = id; const form = $('edit-form'); Object.entries(item).forEach(([key,value]) => { if (form.elements[key]) form.elements[key].value = value; }); form.elements.price.value = displayAmount(item.price); $('edit-modal').showModal(); }
function openSupply(id) { editingSupplyId = id || null; const form = $('supply-form'); form.reset(); $('supply-modal-title').textContent = id ? 'Edit supply' : 'Add a supply'; if (id) { const supply = supplies.find(item => item.id === id); Object.entries(supply).forEach(([key,value]) => { if (form.elements[key]) form.elements[key].value = value; }); } $('supply-modal').showModal(); }
function showPage(page) { if (!pageContent[page]) return; document.querySelectorAll('.page').forEach(section => section.classList.toggle('active',section.id === page)); document.querySelectorAll('.nav-item[data-page]').forEach(link => link.classList.toggle('active',link.dataset.page === page)); $('page-kicker').textContent = pageContent[page][0]; $('page-title').innerHTML = pageContent[page][1]; history.replaceState(null,'',`#${page}`); window.scrollTo({top:0,behavior:'smooth'}); }
function openClosing() { const list=todaySales(), expenseList=todayExpenses(), cost=sum(expenseList), revenue=sum(list), payments=list.reduce((map,s) => ({...map,[s.payment || 'Cash']:(map[s.payment || 'Cash'] || 0)+s.price}),{}), itemTotals=list.reduce((map,s) => { map[s.name] ||= {qty:0,total:0}; map[s.name].qty++; map[s.name].total+=s.price; return map; },{}); $('closing-content').innerHTML = `<div class="closing-numbers"><div><span>Sales</span><b>${money(revenue)}</b></div><div><span>Expenses</span><b>${money(cost)}</b></div><div><span>Profit</span><b>${money(revenue-cost)}</b></div></div><div class="closing-grid"><section class="closing-details"><b>Income · where it came from</b>${Object.entries(payments).map(([method,value]) => `<span>${method}<strong>${money(value)}</strong></span>`).join('') || '<span>No payments recorded yet.</span>'}<hr><b>Items sold</b>${Object.entries(itemTotals).sort((a,b) => b[1].qty-a[1].qty).map(([name,data]) => `<span>${name} · ${data.qty} sold<strong>${money(data.total)}</strong></span>`).join('') || '<span>No items sold yet.</span>'}</section><section class="closing-details expenses-breakdown"><b>Expenses · what it was for</b>${expenseList.length ? expenseList.slice().reverse().map(expense => `<span><i>${expense.category}</i> ${expense.name}<strong>−${money(expense.amount)}</strong></span>`).join('') : '<span>No expenses were recorded today.</span>'}</section></div>`; $('closing-modal').showModal(); }
function download(name, data, type) { const blob = new Blob([data],{type}), link = document.createElement('a'); link.href=URL.createObjectURL(blob); link.download=name; link.click(); URL.revokeObjectURL(link.href); }
function applySettings() { document.querySelector('.shop-chip b').textContent=settings.name; document.querySelector('.brand span:last-child').textContent=settings.name.toLowerCase(); $('cafe-name').value=settings.name; $('closing-time').value=settings.closeTime; $('currency').value=settings.currency; $('language').value=settings.language; document.querySelectorAll('.price-label').forEach(label => label.textContent = `Price (${settings.currency})`); document.querySelectorAll('.amount-label').forEach(label => label.textContent = `Amount (${settings.currency})`); const lira = settings.currency === 'LBP'; $('item-form').elements.price.placeholder = lira ? 'e.g. 225000' : 'e.g. 2.50'; document.querySelectorAll('.price-entry-note').forEach(note => note.textContent = lira ? 'Example: 225000 LBP for a $2.50 coffee.' : 'Enter the price in the selected currency.'); $('rate-note').hidden = !lira; document.documentElement.lang=settings.language; document.documentElement.dir=settings.language === 'ar' ? 'rtl' : 'ltr'; document.body.classList.toggle('arabic',settings.language === 'ar'); }

document.querySelectorAll('[data-category]').forEach(tab => tab.addEventListener('click', () => { category=tab.dataset.category; document.querySelectorAll('[data-category]').forEach(t => t.classList.toggle('selected',t===tab)); renderProducts(); }));
$('search').addEventListener('input',renderProducts);
$('open-add').addEventListener('click',() => $('item-modal').showModal());
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click',() => $(button.dataset.close).close()));
$('close-modal').addEventListener('click',() => $('item-modal').close()); $('cancel-modal').addEventListener('click',() => $('item-modal').close());
$('item-form').addEventListener('submit',event => { event.preventDefault(); const data=new FormData(event.target), stock=Number(data.get('stock')), item={id:`${data.get('name').toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${Date.now()}`,name:data.get('name').trim(),price:storedAmount(data.get('price')),category:data.get('category'),priority:data.get('priority'),stock,threshold:Number(data.get('threshold')),emoji:data.get('emoji').trim() || '☕',max:Math.max(stock,1)}; items.push(item); save(); render(); $('item-modal').close(); event.target.reset(); toast(`${item.name} is ready to sell.`); });
$('edit-form').addEventListener('submit',event => { event.preventDefault(); const item=items.find(i => i.id === editingId), data=new FormData(event.target); if (!item) return; ['name','category','priority','emoji'].forEach(key => item[key]=data.get(key).trim()); item.price=storedAmount(data.get('price')); ['stock','threshold'].forEach(key => item[key]=Number(data.get(key))); item.max=Math.max(item.max || 1,item.stock); save(); render(); $('edit-modal').close(); toast(`${item.name} updated.`); });
$('expense-form').addEventListener('submit',event => { event.preventDefault(); const data=new FormData(event.target); expenses.push({id:safeId(),name:data.get('name').trim(),amount:storedAmount(data.get('amount')),category:data.get('category'),time:Date.now()}); save(); render(); $('expense-modal').close(); event.target.reset(); toast('Expense recorded.'); });
$('supply-form').addEventListener('submit',event => { event.preventDefault(); const data = new FormData(event.target), stock = Number(data.get('stock')), payload = {name:data.get('name').trim(), stock, threshold:Number(data.get('threshold')), unit:data.get('unit'), emoji:data.get('emoji').trim() || '📦'}; if (editingSupplyId) { const supply = supplies.find(item => item.id === editingSupplyId); Object.assign(supply,payload); } else supplies.push({id:`${payload.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${Date.now()}`,...payload}); save(); render(); $('supply-modal').close(); toast(`${payload.name} saved in supplies.`); });
$('clear-history').addEventListener('click',() => { if (!todaySales().length || !confirm('Clear today’s sales activity?')) return; sales=sales.filter(s => !today(s.time)); save(); render(); toast('Today’s activity was cleared.'); });
$('see-alerts').addEventListener('click',() => showPage('inventory')); $('dismiss-alert').addEventListener('click',() => { alertsDismissed=true; renderStock(); }); $('notification-btn').addEventListener('click',() => showPage('inventory'));
$('open-supply').addEventListener('click',() => openSupply()); document.querySelectorAll('[data-inventory-view]').forEach(button => button.addEventListener('click',() => { inventoryView=button.dataset.inventoryView; document.querySelectorAll('[data-inventory-view]').forEach(tab => tab.classList.toggle('selected',tab===button)); renderStock(); }));
$('order-mode').addEventListener('click',() => { orderMode=!orderMode; $('activity-view').hidden=orderMode; $('cart-view').hidden=!orderMode; $('order-mode').textContent=orderMode ? 'Quick sale' : 'Build order'; $('order-mode').classList.toggle('active',orderMode); $('tap-note').innerHTML=orderMode ? '<span>☝</span> Tap products to add them to this customer order' : '<span>☝</span> Tap an item to record one sale'; renderCart(); });
$('cancel-order').addEventListener('click',() => { cart=[]; renderCart(); }); document.querySelectorAll('[data-payment]').forEach(button => button.addEventListener('click',() => { paymentMethod=button.dataset.payment; document.querySelectorAll('[data-payment]').forEach(choice => choice.classList.toggle('selected',choice===button)); })); $('checkout').addEventListener('click',checkout);
$('report-period').addEventListener('change',event => { reportPeriod=event.target.value; renderReports(); }); $('daily-close').addEventListener('click',openClosing); $('print-closing').addEventListener('click',() => window.print()); $('export-csv').addEventListener('click',() => { const rows=['Date,Item,Category,Payment,Amount',...salesForReport().map(s => `${new Date(s.time).toLocaleString()},"${s.name}",${s.category || ''},${s.payment || 'Cash'},${s.price}`)]; download('saad-cafe-sales.csv',rows.join('\n'),'text/csv'); toast('Sales CSV downloaded.'); });
$('open-expense').addEventListener('click',() => $('expense-modal').showModal());
document.querySelectorAll('.nav-item[data-page]').forEach(link => link.addEventListener('click',event => { event.preventDefault(); showPage(link.dataset.page); }));
$('save-settings').addEventListener('click',() => { settings.name=$('cafe-name').value.trim() || 'Saad Cafe'; settings.closeTime=$('closing-time').value; settings.currency=$('currency').value; settings.language=$('language').value; save(); applySettings(); render(); toast('Saad Cafe settings saved.'); });
$('currency').addEventListener('change',() => { settings.currency=$('currency').value; save(); applySettings(); render(); toast(`Prices are now shown in ${settings.currency}.`); });
$('export-backup').addEventListener('click',() => { download('saad-cafe-backup.json',JSON.stringify({items,sales,expenses,settings},null,2),'application/json'); toast('Full backup downloaded.'); });
$('import-backup').addEventListener('change',event => { const file=event.target.files[0]; if (!file) return; const reader=new FileReader(); reader.onload=() => { try { const data=JSON.parse(reader.result); if (!Array.isArray(data.items) || !Array.isArray(data.sales)) throw new Error(); items=data.items; sales=data.sales; expenses=Array.isArray(data.expenses) ? data.expenses : []; settings={...settings,...(data.settings || {})}; save(); applySettings(); render(); toast('Backup restored successfully.'); } catch { toast('That backup file could not be read.'); } }; reader.readAsText(file); });
$('show-qr').addEventListener('click',() => { const url=`${location.origin}${location.pathname.replace(/[^/]*$/,'')}menu.html`; $('qr-image').src=`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`; $('qr-modal').showModal(); }); $('copy-menu-link').addEventListener('click',async () => { const url=`${location.origin}${location.pathname.replace(/[^/]*$/,'')}menu.html`; try { await navigator.clipboard.writeText(url); toast('Menu link copied.'); } catch { toast(url); } });
if (pageContent[location.hash.slice(1)]) showPage(location.hash.slice(1)); applySettings(); render();
