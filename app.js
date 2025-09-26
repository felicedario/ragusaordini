// ==========================================================
// CONFIGURAZIONE
// ==========================================================
// !! IMPORTANTE !! Sostituisci questa stringa con l'URL della tua Web App
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbyrV3pt20IACZBQXqE6e0Yp2CIyJN_twtGPncZO-oUk3RtXiKB9uvU57XgkHJZeHTBJ/exec'; // <-- SOSTITUISCI QUESTO

const DB_NAME = 'RagusaOrdiniDB';
const DB_VERSION = 1;
const DATA_STORE_NAME = 'appData';
const FORM_STORE_NAME = 'formState';


// ==========================================================
// GESTIONE DATABASE LOCALE (IndexedDB)
// ==========================================================
let db;
let signaturePad;

async function openDB() {
    if (db) return db;
    db = await idb.openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(DATA_STORE_NAME)) {
                db.createObjectStore(DATA_STORE_NAME);
            }
            if (!db.objectStoreNames.contains(FORM_STORE_NAME)) {
                db.createObjectStore(FORM_STORE_NAME);
            }
        },
    });
    return db;
}

async function getLocalData(storeName, key) {
    const db = await openDB();
    return await db.get(storeName, key);
}

async function setLocalData(storeName, key, value) {
    const db = await openDB();
    return await db.put(storeName, value, key);
}

// ==========================================================
// REGISTRAZIONE SERVICE WORKER
// ==========================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/ragusaordini/sw.js')
            .then(reg => console.log('Service Worker registrato con successo.', reg))
            .catch(err => console.error('Errore durante la registrazione del Service Worker:', err));
    });
}


// ==========================================================
// LOGICA DI AVVIO E SINCRONIZZAZIONE DATI
// ==========================================================
document.addEventListener('DOMContentLoaded', async () => {
    const localData = await getLocalData(DATA_STORE_NAME, 'products');

    if (localData) {
        console.log("Dati trovati localmente. Rendering immediato.");
        renderApp(localData);
        fetchAndSyncData(); 
    } else {
        console.log("Nessun dato locale. Primo avvio, scaricamento dati...");
        const freshData = await fetchAndSyncData();
        if (freshData) {
            renderApp(freshData);
        }
    }
});

async function fetchAndSyncData() {
    try {
        // Aggiungiamo un parametro casuale per evitare la cache del browser sulla richiesta API
        const response = await fetch(`${GAS_API_URL}?action=getAllDataJSON&v=${new Date().getTime()}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const freshData = await response.json();
       
        const localData = await getLocalData(DATA_STORE_NAME, 'products');

        if (!localData || localData.version !== freshData.version) {
            console.log("Nuova versione dei dati trovata. Aggiornamento in corso...");
            await setLocalData(DATA_STORE_NAME, 'products', freshData);
            console.log("Dati locali aggiornati con successo.");
            return freshData;
        } else {
            console.log("I dati locali sono già aggiornati.");
            return localData;
        }
    } catch (error) {
        console.error("Impossibile scaricare dati freschi:", error);
        document.getElementById('loading-indicator').innerHTML = `
            <h2 class="text-xl font-semibold text-red-600">Errore di connessione</h2>
            <p>Impossibile contattare il server. Se hai già usato l'app, i dati mostrati potrebbero non essere aggiornati.</p>`;
        return null;
    }
}

// ==========================================================
// FUNZIONE PRINCIPALE PER IL RENDER DELL'APP
// ==========================================================
async function renderApp(data) {
    const appContent = document.getElementById('app-content');
   
    appContent.innerHTML = `
        <h1 class="text-2xl font-bold uppercase">Modulo d'Ordine – Coltelleria Ragusa Srl</h1>
        <div class="flex justify-center my-4">
            <button type="button" id="force-sync" class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105 mr-4">
                AGGIORNA DATI
            </button>
            <button type="button" id="clearOrderButton" class="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105">
                PULISCI CAMPI
            </button>
        </div>
        <form id="orderForm">
            <div class="mb-4"><label for="puntoVendita" class="block text-sm mb-2 uppercase">Punto vendita:</label><input type="text" id="puntoVendita" name="puntoVendita"></div>
            <div class="mb-4"><label for="recipientEmail" class="block text-sm mb-2 uppercase">Email per l'ordine:</label><input type="email" id="recipientEmail" name="recipientEmail" placeholder="es. ordini@esempio.com" multiple></div>
            <div class="mb-4"><label for="orari" class="block text-sm mb-2 uppercase">Orari:</label><input type="text" id="orari" name="orari"></div>
            <div class="mb-4"><label for="chiusura" class="block text-sm mb-2 uppercase">Chiusura:</label><input type="text" id="chiusura" name="chiusura"></div>
            <div class="mb-4"><label for="via" class="block text-sm mb-2 uppercase">Via:</label><input type="text" id="via" name="via"></div>
            <div class="mb-4"><label for="citta" class="block text-sm mb-2 uppercase">Città:</label><input type="text" id="citta" name="citta"></div>
            <div class="mb-6"><label for="note" class="block text-sm mb-2 uppercase">Note Generali Ordine:</label><input type="text" id="note" name="note"></div>
           
            <div id="dynamic-sections">
                ${generateColtelliHtml(data.products)}
                ${generateCopriceppoHtml(data.copriceppoData)}
                ${generateTaglieriHtml(data.taglieriData, data.taglieriImageUrl)}
                ${generateTaglieriGanciHtml(data.taglieriGanciData, data.taglieriGanciImageUrl)}
                ${generateTaglieriAvvitareHtml(data.taglieriAvvitareData, data.taglieriAvvitareImageUrl)}
                ${generateTavoliHtml(data.tavoliData)}
                ${generateCeppiHtml(data.ceppiData)}
                ${generateUtensiliHtml(data.utensiliData)}
                ${generateAffettatriceHtml(data.affettatriceData)}
                ${generateAntinfortunisticaHtml(data.antinfortunisticaData)}
                ${generateRicambiHtml(data.ricambiData)}
                ${generateGastronomiaHtml(data.gastronomiaData)}
                ${generateNoleggioHtml(data.noleggioData)}
            </div>
           
            ${generateContractHtml(data)}
           
            <button type="submit" id="submitButton"class="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md uppercase w-full mt-8 transition-transform transform hover:scale-105">
                <span id="buttonText">Invia Ordine</span>
                <span id="loadingSpinner" class="spinner" style="display: none;"></span>
            </button>
        </form>
        <div id="messageBox" class="message-box"></div>`;

    document.getElementById('loading-indicator').classList.add('hidden');
    appContent.classList.remove('hidden');

    await setupEventListeners();
}

// ==========================================================
// FUNZIONI DI GENERAZIONE HTML
// ==========================================================
function generateColtelliHtml(products) {
    if (!products || products.length === 0) return '';
    const productsHtml = products.map(p => `
        <tr data-item-code="${p.code}" data-item-name="${p.name}" data-item-category="knives" data-item-price="${p.price || ''}">
            <td><img src="${p.imageUrl}" alt="${p.name}" onerror="this.style.display='none'"></td>
            <td class="align-top">
            <div>
            ${p.name}<br>
            <span class="text-xs text-gray-500 font-mono">cod: ${p.code}</span>
            ${p.price ? `<br><strong class="text-sm">PREZZO: ${p.price}</strong>` : ''}
            </div>
            <div class="mt-2">
                    <div class="flex flex-col items-start gap-y-2">
                        ${p.availableColors && p.availableColors.length > 0 ? `
                        <select name="color_selection" class="text-xs p-1">
                            <option value="" selected>Scegli colore...</option>
                            ${p.availableColors.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>` : ''}
                        ${p.hasSpecialOptions ? `
                        <div class="flex justify-center items-center space-x-3">
                            <label class="cursor-pointer">
                                <input type="checkbox" name="icon_diamond" class="hidden peer">
                                <svg class="w-6 h-6 text-gray-400 peer-checked:text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a.83.83 0 01-.57-.23l-7-7.22a.83.83 0 010-1.14l7-7.22a.83.83 0 011.14 0l7 7.22a.83.83 0 010 1.14l-7 7.22A.83.83 0 0110 18zm-5.86-8L10 15.68 15.86 10 10 4.32z"/></svg>
                            </label>
                            <label class="cursor-pointer">
                                <input type="checkbox" name="icon_engraving" class="hidden peer">
                                <svg class="w-6 h-6 text-gray-400 peer-checked:text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"/></svg>
                            </label>
                        </div>` : ''}
                        <div class="mt-2"><input type="text" name="item_notes" placeholder="Note articolo..." class="text-xs p-1 w-full border rounded-md"></div>
                    </div>
                </div>
            </td>
            <td><input type="number" name="macelleria" value="0" min="0" class="text-center"></td>
            <td><input type="number" name="salumeria" value="0" min="0" class="text-center"></td>
            <td><input type="number" name="gastronomia" value="0" min="0" class="text-center"></td>
            <td><input type="number" name="ortofrutta" value="0" min="0" class="text-center"></td>
            <td><input type="number" name="pescheria" value="0" min="0" class="text-center"></td>
        </tr>`).join('');
    return `<h2 class="section-title uppercase">Coltelli e Utensili</h2><div class="overflow-x-auto"><table class="min-w-full mb-8"><thead><tr><th class="w-[15%]">Immagine</th><th class="w-[35%]">Articolo</th><th class="text-center">Macelleria</th><th class="text-center">Salumeria</th><th class="text-center">Gastronomia</th><th class="text-center">Ortofrutta</th><th class="text-center">Pescheria</th></tr></thead><tbody>${productsHtml}</tbody></table></div>`;
}

function generateCopriceppoHtml(data) {
    if (!data || !data.rows || data.rows.length === 0) return '';
    const departments = ['Macelleria', 'Salumeria', 'Gastronomia', 'Ortofrutta', 'Pescheria']; 
    const sections = departments.map(dept => {
        const departmentRowsHtml = data.rows.map(item => `
            <tr data-item-code="COPRICEPPO-${dept.toUpperCase()}-${item.dimension}" data-item-name="COPRICEPPO ${dept} ${item.dimension}" data-item-category="copriceppo" data-item-price="${item.price || ''}">
                <td>${item.dimension}</td>
                ${data.headers.map(h => `<td><input type="number" name="${h.toLowerCase().replace(/ò/g, 'o')}" value="0" min="0" class="text-center"></td>`).join('')}
            </tr>
            <tr>
                <td colspan="${1 + data.headers.length}" class="notes-cell">
                    ${item.price ? `
                        <div class="text-left pb-1">
                            <strong class="text-sm">PREZZO: ${item.price}</strong>
                        </div>
                    ` : ''}
                    <input type="text" name="item_notes" placeholder="Note..." class="text-xs p-1 w-full border rounded-md">
                </td>
            </tr>
        `).join('')
        return `
            <div class="department-section">
                <h3 class="department-title uppercase">${dept}</h3>
                <table>
                    <thead>
                        <tr>
                            <th class="w-1/3">Dimensione</th>
                            ${data.headers.map(h => `<th class="w-1/3 text-center">${h}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${departmentRowsHtml}
                    </tbody>
                </table>
            </div>
        `;
    }).join('');
    return `<h2 class="section-title uppercase">Copriceppo</h2><div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">${sections}</div>`;
}

function generateTaglieriHtml(data, imageUrl) {
    if (!data) return '';
    const departments = ['Macelleria', 'Salumeria', 'Gastronomia', 'Ortofrutta', 'Pescheria'];
    const sections = departments.map(dept => `
        <div class="department-section">
            <h3 class="department-title uppercase">${dept}</h3>
            <div class="overflow-x-auto"><table class="min-w-full">
                <thead><tr><th class="w-25 text-xs p-1">Dimensione (cm)</th>${data.headers.map(h => `<th class="text-center text-xs p-1 uppercase">${h}</th>`).join('')}</tr></thead>
                <tbody>
                    ${data.rows.map(() => `
                    <tr data-item-category="taglieri" data-department="${dept.toUpperCase()}">
                        <td>
                            <input type="text" name="dimensione" placeholder="Es: 40x30" class="text-center text-sm placeholder:text-xs p-1 w-full border rounded-md">
                            <input type="text" name="prezzo" placeholder="Prezzo..." class="text-center text-sm placeholder:text-xs p-1 w-full border rounded-md mt-1">
                        </td>
                        ${data.headers.map(h => `<td><input type="number" name="${h.toLowerCase().replace(/ò/g, 'o')}" value="0" min="0" class="text-center text-sm p-1 w-full border rounded-md"></td>`).join('')}
                    </tr>
                    <tr><td colspan="${1 + data.headers.length}" class="notes-cell"><input type="text" name="item_notes" placeholder="Note..." class="text-xs p-1 w-full border rounded-md"></td></tr>
                    `).join('')}
                </tbody>
            </table></div>
        </div>`).join('');
    const imageHtml = imageUrl ? `<div class="flex justify-center mb-4"><img src="${imageUrl}" alt="Immagine Taglieri" class="max-w-xs md:max-w-sm rounded-lg shadow-md"></div>` : '';
    return `<h2 class="section-title uppercase">Taglieri</h2>${imageHtml}<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">${sections}</div>`;
}

function generateTaglieriGanciHtml(data, imageUrl) {
    if (!data) return '';
    const departments = ['Macelleria', 'Salumeria', 'Gastronomia', 'Ortofrutta', 'Pescheria'];
    const sections = departments.map(dept => `
        <div class="department-section">
            <h3 class="department-title uppercase">${dept}</h3>
            <div class="overflow-x-auto"><table class="min-w-full">
                <thead><tr><th class="w-24 text-xs p-1">Dimensione (cm)</th>${data.headers.map(h => `<th class="text-center text-xs p-1 uppercase">${h}</th>`).join('')}</tr></thead>
                <tbody>
                    ${data.rows.map(() => `
                    <tr data-item-category="taglieri-ganci" data-department="${dept.toUpperCase()}">
                        <td>
                            <input type="text" name="dimensione" placeholder="Es: 40x30" class="text-center text-sm placeholder:text-xs p-1 w-full border rounded-md">
                            <input type="text" name="prezzo" placeholder="Prezzo..." class="text-center text-sm placeholder:text-xs p-1 w-full border rounded-md mt-1">
                        </td>
                        ${data.headers.map(h => `<td><input type="number" name="${h.toLowerCase()}" value="0" min="0" class="text-center text-sm p-1 w-full border rounded-md"></td>`).join('')}
                    </tr>
                    <tr><td colspan="${1 + data.headers.length}" class="notes-cell"><input type="text" name="item_notes" placeholder="Note..." class="text-xs p-1 w-full border rounded-md"></td></tr>
                    `).join('')}
                </tbody>
            </table></div>
        </div>`).join('');
    const imageHtml = imageUrl ? `<div class="flex justify-center mb-4"><img src="${imageUrl}" alt="Immagine Taglieri con Ganci" class="max-w-xs md:max-w-sm rounded-lg shadow-md"></div>` : '';
    return `<h2 class="section-title uppercase">Taglieri con Ganci</h2>${imageHtml}<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">${sections}</div>`;
}

function generateTaglieriAvvitareHtml(data, imageUrl) {
    if (!data) return '';
    const departments = ['Macelleria', 'Salumeria', 'Gastronomia', 'Ortofrutta', 'Pescheria'];
    const sections = departments.map(dept => `
        <div class="department-section">
            <h3 class="department-title uppercase">${dept}</h3>
            <div class="overflow-x-auto"><table class="min-w-full">
                <thead><tr><th class="w-24 text-xs p-1">Dimensione (cm)</th>${data.headers.map(h => `<th class="text-center text-xs p-1 uppercase">${h}</th>`).join('')}</tr></thead>
                <tbody>
                    ${data.rows.map(() => `
                    <tr data-item-category="taglieri-avvitare" data-department="${dept.toUpperCase()}">
                        <td>
                            <input type="text" name="dimensione" placeholder="Es: 40x30" class="text-center text-sm placeholder:text-xs p-1 w-full border rounded-md">
                            <input type="text" name="prezzo" placeholder="Prezzo..." class="text-center text-sm placeholder:text-xs p-1 w-full border rounded-md mt-1">
                        </td>
                        ${data.headers.map(h => `<td><input type="number" name="${h.toLowerCase()}" value="0" min="0" class="text-center text-sm p-1 w-full border rounded-md"></td>`).join('')}
                    </tr>
                    <tr><td colspan="${1 + data.headers.length}" class="notes-cell"><input type="text" name="item_notes" placeholder="Note..." class="text-xs p-1 w-full border rounded-md"></td></tr>
                    `).join('')}
                </tbody>
            </table></div>
        </div>`).join('');
    const imageHtml = imageUrl ? `<div class="flex justify-center mb-4"><img src="${imageUrl}" alt="Immagine Taglieri da Avvitare" class="max-w-xs md:max-w-sm rounded-lg shadow-md"></div>` : '';
    return `<h2 class="section-title uppercase">Taglieri da Avvitare</h2>${imageHtml}<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">${sections}</div>`;
}

function generateTavoliHtml(data) {
    if (!data || !data.dimensions) return '';
    const rows = data.dimensions.map(item => `
        <tr data-item-code="TAVOLI-SOLO-VENDITA-${item.dimension.replace(/x/gi, 'X')}" data-item-name="TAVOLI SOLO VENDITA ${item.dimension}" data-item-category="tavoli-solo-vendita" data-item-price="${item.price || ''}">
            <td>${item.dimension}</td>
            ${data.headers.map(h => `<td><input type="number" name="${h.toLowerCase()}" value="0" min="0" class="text-center"></td>`).join('')}
        </tr>
        <tr>
            <td colspan="${1 + data.headers.length}" class="notes-cell">
                ${item.price ? `
                    <div class="text-left pb-1">
                        <strong class="text-sm">PREZZO: ${item.price}</strong>
                    </div>
                ` : ''}
                <input type="text" name="item_notes" placeholder="Note..." class="text-xs p-1 w-full border rounded-md">
            </td>
        </tr>
    `).join('');
    return `<h2 class="section-title">TAVOLI - SOLO VENDITA</h2><p class="text-sm text-gray-600 mb-4 text-center">COLORI DISPONIBILI: BIANCO, BORDO', GIALLO, VERDE, AZZURRO. SPECIFICARE PER OGNI ARTICOLO QUANTITA' E COLORE.</p><table class="min-w-full mb-8"><thead><tr><th class="w-[20%]">Dimensioni</th>${data.headers.map(h => `<th class="w-[16%] text-center">${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
}

function generateCeppiHtml(data) {
    if (!data || !data.dimensions) return '';
    const rows = data.dimensions.map(item => `
        <tr data-item-code="CEPPI-${item.dimension.replace(/x/gi, 'X')}" data-item-name="CEPPI ${item.dimension}" data-item-category="ceppi" data-item-price="${item.price || ''}">
            <td>${item.dimension}</td>
            ${data.headers.map(h => `<td><input type="number" name="${h.toLowerCase()}" value="0" min="0" class="text-center"></td>`).join('')}
        </tr>
        <tr>
            <td colspan="${1 + data.headers.length}" class="notes-cell">
                ${item.price ? `
                    <div class="text-left pb-1">
                        <strong class="text-sm">PREZZO: ${item.price}</strong>
                    </div>
                ` : ''}
                <input type="text" name="item_notes" placeholder="Note..." class="text-xs p-1 w-full border rounded-md">
            </td>
        </tr>
    `).join('');
    return `<h2 class="section-title">CEPPI</h2><p class="text-sm text-gray-600 mb-4 text-center">COLORI DISPONIBILI: BIANCO - BORDO'</p><table class="min-w-full mb-8"><thead><tr><th class="w-[20%]">Dimensioni</th>${data.headers.map(h => `<th class="w-[16%] text-center">${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
}

function generateUtensiliHtml(data) {
    if (!data) return '';
    const sections = data.map(cat => `
        <div class="department-section">
            <h3 class="department-title">${cat.categoryName}</h3>
            <table>
                <thead><tr><th class="w-[20%]">CODICE PRODOTTO</th><th class="w-[15%]">IMMAGINE</th><th class="w-[30%]">DESCRIZIONI</th><th class="w-[15%]">PREZZO</th><th class="w-[20%] text-center">QUANTITÀ</th></tr></thead>
                <tbody>
                    ${cat.items.map(item => `
                    <tr data-item-code="${item.code}" data-item-name="${cat.categoryName} - ${item.description}" data-item-category="utensili-macelleria" data-item-price="${item.price || ''}">
                        <td>${item.code}</td>
                        <td><img src="${item.imageUrl}" alt="Immagine" onerror="this.style.display='none'"></td>
                        <td>${item.description}</td>
                        <td>${item.price}</td>
                        <td><input type="number" name="quantity" value="0" min="0" class="text-center"></td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>`).join('');
    return `<h2 class="section-title">UTENSILI DA MACELLERIA</h2><div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">${sections}</div>`;
}

function generateAffettatriceHtml(data) {
    if (!data) return '';
    const rows = data.map(item => `
        <tr data-item-name="${item.article}" data-item-category="affettatrice" data-item-price="${item.price || ''}">
            <td><img src="${item.imageUrl}" alt="${item.article}" onerror="this.style.display='none'"></td>
            <td>${item.article}</td>
            <td>${item.price || ''}</td>
            <td><input type="number" name="quantity" value="0" min="0" class="text-center"></td>
        </tr>
    `).join('');
    return `
        <h2 class="section-title">AFFETTATRICE E TRITACARNE</h2>
        <table class="min-w-full mb-8">
            <thead>
                <tr>
                    <th class="w-[15%]">Immagine</th>
                    <th class="w-[55%]">Articolo</th>
                    <th class="w-[15%]">Prezzo</th>
                    <th class="w-[15%] text-center">Quantità</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

function generateAntinfortunisticaHtml(data) {
    if (!data) return '';
    const rows = data.map(item => `
        <tr data-item-name="${item.product} - ${item.description}" data-item-code="${item.code}" data-item-category="antinfortunistica" data-item-price="${item.price || ''}">
            <td><img src="${item.imageUrl}" alt="${item.product}" onerror="this.style.display='none'"></td>
            <td>${item.product}</td>
            <td>${item.code}</td>
            <td>${item.description}</td>
            <td>${item.price}</td>
            <td><input type="number" name="quantity" value="0" min="0" class="text-center"></td>
        </tr>`).join('');
    return `<h2 class="section-title">MATERIALE ANTINFORTUNISTICO, DI IGIENE E PULIZIA</h2><table class="min-w-full mb-8"><thead><tr><th class="w-[15%]">Immagine</th><th class="w-[20%]">Prodotto</th><th class="w-[15%]">Codice Prodotto</th><th class="w-[25%]">Descrizione</th><th class="w-[10%]">Prezzo</th><th class="w-[15%] text-center">Quantità</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function generateRicambiHtml(data) {
    if (!data) return '';
    const rows = data.map(item => `
        <tr data-item-name="${item.product} - ${item.size}" data-item-code="${item.code}" data-item-category="ricambi" data-item-price="${item.price || ''}">
            <td><img src="${item.imageUrl}" alt="${item.product}" onerror="this.style.display='none'"></td>
            <td>${item.product}</td>
            <td>${item.code}</td>
            <td>${item.size}</td>
            <td>${item.price}</td>
            <td><input type="number" name="quantity" value="0" min="0" class="text-center"></td>
        </tr>`).join('');
    return `<h2 class="section-title">RICAMBI ED ACCESSORI</h2><table class="min-w-full mb-8"><thead><tr><th class="w-[15%]">Immagine</th><th class="w-[20%]">Prodotto</th><th class="w-[15%]">Codice Prodotto</th><th class="w-[15%]">Misura</th><th class="w-[10%]">Prezzo</th><th class="w-[15%] text-center">Quantità</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function generateGastronomiaHtml(data) {
    if (!data) return '';
    const rows = data.map(item => `
        <tr data-item-name="${item.product}" data-item-code="${item.code}" data-item-category="gastronomia" data-item-price="${item.price || ''}">
            <td><img src="${item.imageUrl}" alt="${item.product}" onerror="this.style.display='none'"></td>
            <td>${item.product}</td>
            <td>${item.code}</td>
            <td>${item.price}</td>
            <td><input type="number" name="quantity" value="0" min="0" class="text-center"></td>
        </tr>`).join('');
    return `<h2 class="section-title">GASTRONOMIA/CASALINGHI</h2><table class="min-w-full mb-8"><thead><tr><th class="w-[15%]">Immagine</th><th class="w-[30%]">Prodotto</th><th class="w-[20%]">Cod. Prodotto</th><th class="w-[15%]">Prezzo</th><th class="w-[20%] text-center">Quantità</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function generateNoleggioHtml(data) {
    if (!data) return '';
    const rows = data.dimensions.map(dim => `
        <tr data-item-name="NOLEGGIO TAPPETI ${dim}" data-item-code="NOLEGGIO-${dim.replace(/\s+/g, '')}" data-item-category="noleggio">
            <td>${dim}</td>
            ${data.headers.map(h => `<td><input type="number" name="${h.toLowerCase().replace(/\s+/g, '-')}" value="0" min="0" class="text-center w-full border rounded-md p-1"></td>`).join('')}
        </tr>`).join('');
    return `<h2 class="section-title">NOLEGGIO TAPPETI ASCIUGAPASSI</h2><table class="min-w-full mb-8 table-fixed"><thead><tr><th class="w-[20%] text-sm p-1">Dimensioni</th>${data.headers.map(h => `<th class="text-center p-1 text-[10px]">${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
}

function generateContractHtml(data) {
    const operatoriOptions = (data && data.operatori && data.operatori.length > 0)
        ? data.operatori.map(op => `<option value="${op}">${op}</option>`).join('')
        : '';

    return `
    <h2 class="section-title">CONTRATTO</h2>
    <div id="contract-section" class="border p-6 rounded-lg space-y-4 text-sm bg-gray-50">
        <div class="flex items-center gap-2 flex-wrap"><span class="font-bold">CONTRATTO N°</span><input type="text" id="contratto_numero" name="contratto_numero" class="contratto-input w-24"><span class="font-bold">DEL</span><input type="text" id="contratto_data" name="contratto_data" class="contratto-input w-32" placeholder="gg/mm/aaaa"></div>
       
        <div class="flex items-center gap-2 flex-wrap">
            <span class="font-bold uppercase">Operatore:</span>
            <select id="contratto_operatore" name="contratto_operatore" class="contratto-input flex-grow min-w-[200px]">
                <option value="" disabled selected>Seleziona un operatore</option>
                ${operatoriOptions}
            </select>
        </div>
        <p>CON LA PRESENTE SCRITTURA PRIVATA, DA VALERSI AD OGNI EFFETTO DI LEGGE, TRA I SOTTOSCRITTI:</p>
        <p><strong>1 - COLTELLERIA RAGUSA SRL</strong>, IN PERSONA DEL LEGALE RAPPRESENTANTE RAGUSA PIETRO, NATO A CORLEONE IL 06.09.1977 E RESIDENTE A BISACQUINO IN C/DA CATRINI, ESERCENTE L'ATTIVITÀ DI NOLEGGIO E ASSISTENZA DI STRUMENTI DA PUNTA E DA TAGLIO, CON SEDE IN CHIUSA SCLAFANI - C/DA RIZZA, PARTITA IVA 06680510820, DENOMINATO <strong>PROPONENTE</strong></p>
        <div class="space-y-2">
            <div class="flex items-center gap-2 flex-wrap"><span><strong>2 - LA SOCIETÀ/DITTA</strong></span><input type="text" id="contratto_societa_ditta" name="contratto_societa_ditta" class="contratto-input flex-grow min-w-[200px]"><span>IN PERSONA DEL LEGALE RAPPRESENTANTE SIG.</span><input type="text" id="contratto_legale_rappresentante" name="contratto_legale_rappresentante" class="contratto-input flex-grow min-w-[200px]"></div>
            <div class="flex items-center gap-2 flex-wrap"><span>NATO IL</span><input type="text" id="contratto_data_nascita" name="contratto_data_nascita" class="contratto-input w-32" placeholder="gg/mm/aaaa"><span>A</span><input type="text" id="contratto_luogo_nascita" name="contratto_luogo_nascita" class="contratto-input flex-grow min-w-[150px]"><span>RESIDENTE A</span><input type="text" id="contratto_residenza_comune" name="contratto_residenza_comune" class="contratto-input flex-grow min-w-[150px]"><span>PROVINCIA</span><input type="text" id="contratto_residenza_provincia" name="contratto_residenza_provincia" class="contratto-input w-12"><span>IN VIA</span><input type="text" id="contratto_residenza_via" name="contratto_residenza_via" class="contratto-input flex-grow min-w-[200px]"></div>
            <div class="flex items-center gap-2 flex-wrap"><span>DOMICILIATO PRESSO LA SEDE DELLA SOCIETÀ/DITTA IN</span><input type="text" id="contratto_domicilio_via" name="contratto_domicilio_via" class="contratto-input flex-grow min-w-[150px]"><span>COMUNE</span><input type="text" id="contratto_domicilio_comune" name="contratto_domicilio_comune" class="contratto-input flex-grow min-w-[150px]"><span>CAP</span><input type="text" id="contratto_domicilio_provincia" name="contratto_domicilio_provincia" class="contratto-input w-12"><span></span></div>
            <div class="flex items-center gap-2 flex-wrap"><span>PARTITA IVA</span><input type="text" id="contratto_partita_iva" name="contratto_partita_iva" class="contratto-input w-48"><span>CODICE FISCALE</span><input type="text" id="contratto_codice_fiscale" name="contratto_codice_fiscale" class="contratto-input w-48"></div>
            <p>DENOMINATO <strong>SOTTOSCRIVENTE</strong></p>
        </div>
        <p><strong>SI CONVIENE E STIPULA QUANTO SEGUE:</strong></p>
        <p>LA DITTA COLTELLERIA RAGUSA SRL OFFRE ALLA SOCIETÀ/DITTA SOTTOSCRIVENTE, CHE ACCETTA, I SEGUENTI SERVIZI:</p>
        <div class="space-y-2 pl-4">
            <p class="font-bold">1 NOLEGGIO DI ATTREZZATURE</p>
            <p>IL PROPONENTE NOLEGGIA AL SOTTOSCRIVENTE I SEGUENTI BENI MOBILI (VEDI ALLEGATO), CHE SONO NELLA PIENA PROPRIETÀ DELLA DITTA PROPONENTE E SI TROVANO IN PERFETTO STATO DI FUNZIONAMENTO E DI MANUTENZIONE. IL PROPONENTE SI IMPEGNA A RITIRARE E SOSTITUIRE I BENI IN LOCAZIONE AL FINE DI EFFETTUARE LE DOVUTE MANUTENZIONI CON CADENZA PERIODICA. IL SOTTOSCRIVENTE SI IMPEGNA A RESTITUIRE I BENI CHE GLI SONO STATI CONSEGNATI. IN CASO DI DANNEGGIAMENTO O DISTRUZIONE DEL BENE IL SOTTOSCRIVENTE SI IMPEGNA A CORRISPONDERE I COSTI DI RIPARAZIONE O DI RIACQUISTO DELLO STESSO. IL SOTTOSCRIVENTE È TENUTO A CONSERVARE E CUSTODIRE LE APPARECCHIATURE AFFIDATEGLI IN NOLEGGIO CON OGNI DILIGENZA. EGLI È TENUTO A RIMBORSARE IL COSTO RELATIVO ALLA ROTTURA O PERDITA DELLE APPARECCHIATURE ANCHE SE CAUSATE DA TERZI, SALVI I CASI DI FORZA MAGGIORE, DA PROVARSI A CURA DEL SOTTOSCRIVENTE STESSO. PER I BENI LOCATI ED IL SERVIZIO OFFERTO È DOVUTO ALLA DITTA PROPONENTE UN CORRISPETTIVO DI:</p>
            <table class="min-w-full text-center border"><thead class="bg-gray-200"><tr><th class="border p-2">ATTREZZATURA A NOLEGGIO</th><th class="border p-2">CANONE MENSILE UNITARIO</th><th class="border p-2">SOSTITUZIONE</th></tr></thead><tbody><tr><td class="border p-2 text-left uppercase">Coltelleria linea</td><td class="border p-2">€ <input type="text" id="contratto_canone_coltelleria_1" name="contratto_canone_coltelleria_1" class="contratto-input w-20 mx-1"> + IVA</td><td class="border p-2 uppercase">Mensile</td></tr><tr><td class="border p-2 text-left uppercase">Coltelleria linea</td><td class="border p-2">€ <input type="text" id="contratto_canone_coltelleria_2" name="contratto_canone_coltelleria_2" class="contratto-input w-20 mx-1"> + IVA</td><td class="border p-2 uppercase">Mensile</td></tr><tr><td class="border p-2 text-left uppercase">Acciai</td><td class="border p-2">€ <input type="text" id="contratto_canone_acciai" name="contratto_canone_acciai" class="contratto-input w-20 mx-1"> + IVA</td><td class="border p-2 uppercase">Su richiesta</td></tr></tbody></table>
            <p>OGNI 30 GIORNI IL LOCATORE PROVVEDERÀ ALLA FATTURAZIONE DEL CORRISPETTIVO, CHE DOVRÀ ESSERE VERSATO MEDIANTE <input type="text" id="contratto_versato_mediante" name="contratto_versato_mediante" class="contratto-input w-48">IN CASO DI TARDIVO PAGAMENTO DEI CORRISPETTIVI, SARANNO CALCOLATI INTERESSI AL TASSO LEGALE. È FATTO ESPLICITO DIVIETO ALL'UTILIZZATORE DI SUBLOCARE IL BENE IN OGGETTO DEL PRESENTE CONTRATTO. IN CASO DI MANCATO PAGAMENTO, O DI VIOLAZIONE ANCHE DI UNO SOLO DEGLI OBBLIGHI PREVISTI A CARICO DEL SOTTOSCRIVENTE, IL PROPONENTE AVRÀ FACOLTÀ DI RISOLVERE IL NOLEGGIO E CHIEDERE LA RESTITUZIONE DEL BENE. IN TAL CASO IL PROPONENTE AVRÀ L'OBBLIGO DI RESTITUIRE I BENI CONCESSI IN LOCAZIONE, E SARÀ TENUTO A CORRISPONDERE AL PROPONENTE, OLTRE AL PREZZO, LE RELATIVE INDENNITÀ DI MORA, ED EVENTUALI RIMBORSI.</p>
        </div>
        <div class="space-y-2 pl-4">
            <p class="font-bold">2 PIALLATURA TAGLIERI</p>
            <p>IL PROPONENTE OFFRE LA PIALLATURA DI CEPPI E TAGLIERI DI QUALUNQUE PESO E MISURA, CHE VERRÀ ESEGUITA PRESSO LE VARIE SEDI DELLA SOCIETÀ/DITTA SOTTOSCRIVENTE. IL SERVIZIO DI PIALLATURA VERRÀ EFFETTUATO CON CADENZA <input type="text" id="contratto_cadenza_piallatura" name="contratto_cadenza_piallatura" class="contratto-input w-48">IL PREZZO PATTUITO PER LA PRESTAZIONE DEL SUDDETTO SERVIZIO VIENE STABILITO TRA LE PARTI IN € <input type="text" id="contratto_prezzo_piallatura" name="contratto_prezzo_piallatura" class="contratto-input w-20"> + IVA CAD 
            <p> METODO DI PAGAMENTO: <input type="text" id="contratto_metodo_pagamento" name="contratto_metodo_pagamento" class="contratto-input flex-grow"></p>
        </div>
        <div class="space-y-2 pl-4">
            <p class="font-bold">3 AFFILATURA PIASTRE E COLTELLI TRITACARNE</p>
            <p>IL PROPONENTE SI IMPEGNA A RITIRARE, PRESSO LE VARIE SEDI DELLA SOCIETÀ/DITTA SOTTOSCRIVENTE, LE PIASTRE E I COLTELLI TRITACARNE USURATI SU RICHIESTA DEL SOTTOSCRIVENTE. IL PREZZO PATTUITO PER LA PRESTAZIONE DEL SUDDETTO SERVIZIO VIENE STABILITO TRA LE PARTI IN:</p>
            <p>AFFILATURA COLTELLO TRITACARNE: € <input type="text" id="contratto_prezzo_affilatura_coltello" name="contratto_prezzo_affilatura_coltello" class="contratto-input w-20"> + IVA CAD</p>
            <p>AFFILATURA PIASTRA TRITACARNE: € <input type="text" id="contratto_prezzo_affilatura_piastra" name="contratto_prezzo_affilatura_piastra" class="contratto-input w-20"> + IVA CAD</p>
            <p>METODO DI PAGAMENTO: <input type="text" id="contratto_metodo_pagamento_affilatura" name="contratto_metodo_pagamento_affilatura" class="contratto-input flex-grow"></p>
        </div>
        <p class="pt-4">IL PRESENTE CONTRATTO HA VALIDITÀ TRIENNALE ED È RINNOVABILE TACITAMENTE ALLA SCADENZA DEL TERMINE. RESTA SALVA LA FACOLTÀ DEL SOTTOSCRIVENTE DI RECEDERE ALMENO 90 GIORNI PRIMA DELLA NATURALE SCADENZA DEL CONTRATTO PREVIA COMUNICAZIONE ALLA DITTA PROPONENTE A MEZZO DI R.A.R O PEC ALL'INDIRIZZO EMAIL COLTELLERIARAGUSASRL@PEC.IT. PER QUANTO NON ESPRESSAMENTE PREVISTO NELLA PRESENTE SCRITTURA PRIVATA SI RINVIA ALLE NORME DEGLI ARTT. 1571 E SEGUENTI DEL CODICE CIVILE. IN CASO DI CONTROVERSIA INERENTI L'INTERPRETAZIONE E L'ESECUZIONE DEL PRESENTE CONTRATTO, SARÀ ESCLUSIVAMENTE ED INDEROGABILMENTE COMPETENTE IL FORO DI TERMINI IMERESE. I DATI DELLA VOSTRA AZIENDA QUALE FORNITRICE O CLIENTE, SONO CONSERVATI PRESSO I NOSTRI ARCHIVI AI FINI AMMINISTRATIVI O CONTABILI. IN BASE ALLE VIGENTI DISPOSIZIONI DI LEGGE SONO INSERITI NEI RELATIVI LIBRI CONTABILI OBBLIGATORI E TRASMESSI AI COMPETENTI UFFICI FINANZIARI. IN QUANTO RACCOLTI E DETENUTI IN BASE AD OBBLIGHI DI LEGGE, NON NECESSITANO DI OCNSENSO AL TRATTAMENTO. I VOSTRI DIRITTI IN RELAZIONE AI DATI PERSONALI SONO QUELLI DI CUI ALL'ART. 13 DELLA LEGGE 675/96.</p>
        <div class="flex justify-between items-end pt-10">
            <div class="text-center"><p class="font-bold">PROPONENTE</p><p class="text-xs">COLTELLERIA RAGUSA S.R.L.</p></div>
            <div class="text-center">
                <p class="font-bold">SOTTOSCRIVENTE</p>
                <div class="signature-pad-container mt-2"><canvas id="signature-canvas" class="signature-canvas"></canvas></div>
                <button type="button" id="clear-signature" class="text-xs text-blue-600 hover:underline mt-1">Pulisci Firma</button>
                <p class="text-xs border-t border-gray-400 pt-1">Intestazione e firma</p>
            </div>
        </div>
        <div class="pt-6">
            <label for="contratto_note" class="block text-base font-semibold mb-2">NOTE AGGIUNTIVE CONTRATTO:</label>
            <textarea id="contratto_note" name="contratto_note" rows="4"></textarea>
        </div>
    </div>`;
}

// ==========================================================
// GESTIONE EVENTI, STATO FORM E INVIO
// ==========================================================
async function setupEventListeners() {
    const form = document.getElementById('orderForm');

    // Salvataggio stato
    form.addEventListener('input', saveFormState);
   
    // Invio
    form.addEventListener('submit', handleFormSubmit);

    // Pulsante pulisci
    document.getElementById('clearOrderButton').addEventListener('click', async () => {
        if (confirm('Sei sicuro di voler cancellare tutti i dati inseriti nel modulo? L\'operazione è irreversibile.')) {
            await setLocalData(FORM_STORE_NAME, 'currentState', {});
            form.reset();
            if (signaturePad) signaturePad.clear();
            generateAndSetContractNumber(); // Genera un nuovo numero
            await saveFormState(); // Salva lo stato pulito
            showMessage('Modulo resettato.', 'success');
        }
    });

    // Pulsante aggiorna dati
    document.getElementById('force-sync').addEventListener('click', async () => {
        document.getElementById('loading-indicator').classList.remove('hidden');
        document.getElementById('app-content').classList.add('hidden');
        await fetchAndSyncData();
        window.location.reload(); // Ricarica per applicare i nuovi dati
    });

    // Setup Signature Pad
   // ... dentro setupEventListeners
const canvas = document.getElementById('signature-canvas');
function resizeCanvas() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
    if (signaturePad) {
        signaturePad.fromDataURL(signaturePad.toDataURL()); // Ridisegna la firma
    }
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();
    signaturePad = new SignaturePad(canvas, { backgroundColor: 'rgb(255, 255, 255)' });
   
    document.getElementById('clear-signature').addEventListener('click', () => signaturePad.clear());

    signaturePad.addEventListener("endStroke", () => { saveFormState(); });

    // Seleziona il contenuto dei campi numerici al focus
    document.querySelectorAll('input[type="number"]').forEach(input => {
        input.addEventListener('focus', () => input.select());
    });

    // Carica lo stato del modulo dopo che tutto è stato renderizzato
    await loadFormState();
}

async function saveFormState() {
    try {
        const state = {};
        const formElements = document.getElementById('orderForm').elements;
        for (const element of formElements) {
            if (!element.name || element.type === 'submit') continue;
            const key = element.name + (element.closest('tr')?.dataset.itemCode || element.closest('tr')?.dataset.department || '');
            switch (element.type) {
                case 'checkbox': state[key] = element.checked; break;
                default: state[key] = element.value;
            }
        }
        if (signaturePad && !signaturePad.isEmpty()) {
            state['signatureData'] = signaturePad.toDataURL();
        } else {
            state['signatureData'] = null;
        }
        await setLocalData(FORM_STORE_NAME, 'currentState', state);
    } catch (e) { console.error("Errore durante il salvataggio dello stato:", e); }
}

async function loadFormState() {
    try {
        const state = await getLocalData(FORM_STORE_NAME, 'currentState');
        if (!state) {
            generateAndSetContractNumber(); // Genera solo se non c'è stato salvato
            return;
        }
        const formElements = document.getElementById('orderForm').elements;
        for (const element of formElements) {
            if (!element.name) continue;
            const key = element.name + (element.closest('tr')?.dataset.itemCode || element.closest('tr')?.dataset.department || '');
            if (state[key] !== undefined) {
                switch (element.type) {
                    case 'checkbox': element.checked = state[key]; break;
                    default: element.value = state[key];
                }
            }
        }
        if (state['signatureData']) {
            signaturePad.fromDataURL(state['signatureData']);
        }
    } catch (e) { console.error("Errore durante il caricamento dello stato:", e); }
}


function generateAndSetContractNumber() {
    const now = new Date();
    const contractNumber = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const contractField = document.getElementById('contratto_numero');
    if (contractField) contractField.value = contractNumber;
}


async function handleFormSubmit(e) {
    e.preventDefault();
    hideMessage();
    showLoading();

    await saveFormState(); // Salva lo stato finale prima dell'invio

    const items = [];
    document.querySelectorAll('tr[data-item-category]').forEach(row => {
        const category = row.dataset.itemCategory;
        let quantities = {};
        let isNotEmpty = false;

        if (category === 'knives' || category === 'copriceppo' || category === 'tavoli-solo-vendita' || category === 'ceppi' || category === 'noleggio') {
            row.querySelectorAll('input[type="number"]').forEach(input => {
                const qty = parseInt(input.value, 10) || 0;
                if (qty > 0) {
                    quantities[input.name] = qty;
                    isNotEmpty = true;
                }
            });
            if (isNotEmpty) {
                 if (category === 'knives') {
                    const diamond = row.querySelector('input[name="icon_diamond"]');
                    const engraving = row.querySelector('input[name="icon_engraving"]');
                    if (diamond && diamond.checked) quantities.opzione_diamante = 'Sì';
                    if (engraving && engraving.checked) quantities.opzione_incisione = 'Sì';
                    const colorSelect = row.querySelector('select[name="color_selection"]');
                    if (colorSelect && colorSelect.value) quantities.colore_scelto = colorSelect.value;
                }
                const notesInput = row.querySelector('input[name="item_notes"]') || row.nextElementSibling?.querySelector('input[name="item_notes"]');
                if (notesInput && notesInput.value.trim()) quantities.nota_articolo = notesInput.value.trim();
                items.push({
                    code: row.dataset.itemCode,
                    name: row.dataset.itemName,
                    price: row.dataset.itemPrice, // <-- MODIFICA
                    quantities
                });
            }
        } else if (category.startsWith('taglieri')) {
            const dimensionValue = row.querySelector('input[name="dimensione"]')?.value.trim();
            if (dimensionValue) {
                row.querySelectorAll('input[type="number"]').forEach(input => {
                    const qty = parseInt(input.value, 10) || 0;
                    if (qty > 0) {
                        quantities[input.name] = qty;
                        isNotEmpty = true;
                    }
                });
                if (isNotEmpty) {
                    const department = row.dataset.department;
                    const deptFormatted = department.charAt(0) + department.slice(1).toLowerCase();
                    let itemName = '', itemCode = '';
                    if (category === 'taglieri') { itemName = `TAGLIERI ${deptFormatted} ${dimensionValue}`; itemCode = `TAGLIERI-${department}-${dimensionValue.replace(/x/gi, 'X')}`; }
                    if (category === 'taglieri-ganci') { itemName = `TAGLIERI CON GANCI ${deptFormatted} ${dimensionValue}`; itemCode = `TAGLIERI-GANCI-${department}-${dimensionValue.replace(/x/gi, 'X')}`; }
                    if (category === 'taglieri-avvitare') { itemName = `TAGLIERI DA AVVITARE ${deptFormatted} ${dimensionValue}`; itemCode = `TAGLIERI-AVVITARE-${department}-${dimensionValue.replace(/x/gi, 'X')}`; }

                    const notesInput = row.nextElementSibling?.querySelector('input[name="item_notes"]');
                    if (notesInput && notesInput.value.trim()) quantities.nota_articolo = notesInput.value.trim();
                    
                    // Legge il prezzo dall'input specifico per i taglieri
                    const priceValue = row.querySelector('input[name="prezzo"]')?.value.trim(); // <-- MODIFICA

                    items.push({
                        code: itemCode,
                        name: itemName,
                        price: priceValue, // <-- MODIFICA
                        quantities
                    });
                }
            }
        } else { // Categorie con quantità singola
            const qtyInput = row.querySelector('input[name="quantity"]');
            const qty = qtyInput ? parseInt(qtyInput.value, 10) || 0 : 0;
            if (qty > 0) {
                quantities = { quantity: qty };
                items.push({
                    code: row.dataset.itemCode,
                    name: row.dataset.itemName,
                    price: row.dataset.itemPrice, // <-- MODIFICA
                    quantities
                });
            }
        }
    });

    const formDataObject = {
        puntoVendita: document.getElementById('puntoVendita').value,
        recipientEmail: document.getElementById('recipientEmail').value,
        orari: document.getElementById('orari').value,
        chiusura: document.getElementById('chiusura').value,
        via: document.getElementById('via').value,
        citta: document.getElementById('citta').value,
        note: document.getElementById('note').value,
        items: items,
        contratto: {
            numero: document.getElementById('contratto_numero').value,
            data: document.getElementById('contratto_data').value,
            operatore: document.getElementById('contratto_operatore').value,
            societa: document.getElementById('contratto_societa_ditta').value,
            legaleRapp: document.getElementById('contratto_legale_rappresentante').value,
            dataNascita: document.getElementById('contratto_data_nascita').value,
            luogoNascita: document.getElementById('contratto_luogo_nascita').value,
            residenzaComune: document.getElementById('contratto_residenza_comune').value,
            residenzaProvincia: document.getElementById('contratto_residenza_provincia').value,
            residenzaVia: document.getElementById('contratto_residenza_via').value,
            domicilioVia: document.getElementById('contratto_domicilio_via').value,
            domicilioComune: document.getElementById('contratto_domicilio_comune').value,
            domicilioProvincia: document.getElementById('contratto_domicilio_provincia').value,
            pIva: document.getElementById('contratto_partita_iva').value,
            codiceFiscale: document.getElementById('contratto_codice_fiscale').value,
            canoneColtelleria1: document.getElementById('contratto_canone_coltelleria_1').value,
            canoneColtelleria2: document.getElementById('contratto_canone_coltelleria_2').value,
            canoneAcciai: document.getElementById('contratto_canone_acciai').value,
            versatoMediante: document.getElementById('contratto_versato_mediante').value,
            cadenzaPiallatura: document.getElementById('contratto_cadenza_piallatura').value,
            prezzoPiallatura: document.getElementById('contratto_prezzo_piallatura').value,
            metodoPagamento: document.getElementById('contratto_metodo_pagamento').value,
            prezzoAffilaturaColtello: document.getElementById('contratto_prezzo_affilatura_coltello').value,
            prezzoAffilaturaPiastra: document.getElementById('contratto_prezzo_affilatura_piastra').value,
            metodoPagamentoAffilatura: document.getElementById('contratto_metodo_pagamento_affilatura').value,
            firmaSottoscrivente: signaturePad.isEmpty() ? '' : signaturePad.toDataURL(),
            noteContratto: document.getElementById('contratto_note').value
        }
    };
   
    try {
        const response = await fetch(`${GAS_API_URL}?action=processOrder`, {
            method: 'POST',
            mode: 'no-cors', // Necessario per l'endpoint di Apps Script che reindirizza
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Evita il preflight CORS
            body: JSON.stringify(formDataObject)
        });
       
        // A causa della 'no-cors' e del reindirizzamento di GAS, non possiamo leggere la risposta.
        // Assumiamo successo e attendiamo l'email.
        hideLoading();
        showMessage('Richiesta di invio inoltrata! Controlla la tua email per la conferma.', 'success');
       
        // Svuota il modulo dopo l'invio (se deve essere attivato basta togliere le // da await fino a generate)
        //await setLocalData(FORM_STORE_NAME, 'currentState', {});
        //document.getElementById('orderForm').reset();
        //if (signaturePad) signaturePad.clear();
        //generateAndSetContractNumber();
       
    } catch (error) {
        hideLoading();
        showMessage('Errore di rete durante l\'invio: ' + error.message, 'error');
        console.error('Errore Fetch:', error);
    }
}

// Funzioni di utilità
function showMessage(message, type) {
    const messageBox = document.getElementById('messageBox');
    messageBox.textContent = message;
    messageBox.className = 'message-box ' + type;
    messageBox.style.display = 'block';
    setTimeout(() => hideMessage(), 5000); // Nasconde dopo 5 secondi
}

function hideMessage() {
    document.getElementById('messageBox').style.display = 'none';
}

function showLoading() {
    const btn = document.getElementById('submitButton');
    btn.disabled = true;
    btn.querySelector('#buttonText').style.display = 'none';
    btn.querySelector('#loadingSpinner').style.display = 'inline-block';
}

function hideLoading() {
    const btn = document.getElementById('submitButton');
    btn.disabled = false;
    btn.querySelector('#buttonText').style.display = 'inline-block';
    btn.querySelector('#loadingSpinner').style.display = 'none';
}




