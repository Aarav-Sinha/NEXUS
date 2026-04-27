/* ════════════════════════════════════════
   NEXUS — app.js  |  Developed by Aarav Sinha
   ════════════════════════════════════════ */

/* ─── FIREBASE CONFIG ───
   Replace with YOUR Firebase project config from console.firebase.google.com
   ─────────────────────── */
const firebaseConfig = {
  apiKey: "AIzaSyCqEEBANVyt-ybQD8z-pys2V-07-lxEWjA",
  authDomain: "nexus-705ef.firebaseapp.com",
  projectId: "nexus-705ef",
  storageBucket: "nexus-705ef.firebasestorage.app",
  messagingSenderId: "982944171585",
  appId: "1:982944171585:web:de65b6827ca769565ba8c0",
  measurementId: "G-KEK7NXF38N"
};

const ADMIN_EMAIL = "aaravhfs@gmail.com";

// ── Init Firebase ──
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

/* ════════════════════════════════════
   STATE
════════════════════════════════════ */
let currentUser  = null;
let isAdmin      = false;
let currentPath  = [];   // array of {id, name, type}
let ctxTarget    = null; // for right-click menu

/* ════════════════════════════════════
   DOM REFS
════════════════════════════════════ */
const loginScreen     = document.getElementById('login-screen');
const appScreen       = document.getElementById('app-screen');
const googleLoginBtn  = document.getElementById('google-login-btn');
const logoutBtn       = document.getElementById('logout-btn');
const userAvatar      = document.getElementById('user-avatar');
const topbarAvatar    = document.getElementById('topbar-avatar');
const userNameSidebar = document.getElementById('user-name-sidebar');
const adminBadge      = document.getElementById('admin-badge');
const addBtn          = document.getElementById('add-btn');
const breadcrumb      = document.getElementById('breadcrumb');
const contentInner    = document.getElementById('content-inner');
const sidebarNav      = document.getElementById('sidebar-nav');
const toast           = document.getElementById('toast');
const addModal        = document.getElementById('add-modal');
const addModalClose   = document.getElementById('add-modal-close');
const addModalTitle   = document.getElementById('add-modal-title');
const addModalBody    = document.getElementById('add-modal-body');
const pdfModal        = document.getElementById('pdf-modal');
const pdfIframe       = document.getElementById('pdf-iframe');
const pdfModalTitle   = document.getElementById('pdf-modal-title');
const pdfOpenNew      = document.getElementById('pdf-open-new');
const pdfModalClose   = document.getElementById('pdf-modal-close');
const ctxMenu         = document.getElementById('ctx-menu');
const menuBtn         = document.getElementById('menu-btn');
const sidebar         = document.getElementById('sidebar');
const sidebarClose    = document.getElementById('sidebar-close');

/* ════════════════════════════════════
   AUTH
════════════════════════════════════ */
googleLoginBtn.addEventListener('click', () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(e => showToast('Login failed: ' + e.message, true));
});

logoutBtn.addEventListener('click', () => {
  auth.signOut();
});

auth.onAuthStateChanged(user => {
  currentUser = user;
  if (user) {
    isAdmin = user.email === ADMIN_EMAIL;
    // Update UI
    userAvatar.src      = user.photoURL || '';
    topbarAvatar.src    = user.photoURL || '';
    userNameSidebar.textContent = user.displayName || user.email;
    adminBadge.style.display = isAdmin ? 'flex' : 'none';
    addBtn.style.display     = isAdmin ? 'flex' : 'none';
    showApp();
    navigateTo([]);
    loadSidebar();
  } else {
    showLogin();
  }
});

function showLogin() {
  loginScreen.classList.add('active');
  appScreen.classList.remove('active');
}
function showApp() {
  loginScreen.classList.remove('active');
  appScreen.classList.add('active');
}

/* ════════════════════════════════════
   SIDEBAR
════════════════════════════════════ */
async function loadSidebar() {
  sidebarNav.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    // Load top-level subjects
    const snap = await db.collection('items')
      .where('parentId', '==', null)
      .orderBy('order')
      .get();
    let html = '';
    snap.forEach(doc => {
      const d = doc.data();
      html += `<button class="nav-item" data-id="${doc.id}" onclick="navFromSidebar('${doc.id}','${escHtml(d.name)}','${d.type}')">
        <span class="nav-icon">${typeIcon(d.type, d.emoji)}</span>
        <span>${escHtml(d.name)}</span>
      </button>`;
    });
    sidebarNav.innerHTML = html || '<span style="padding:10px;font-size:0.8rem;color:var(--text-muted)">No subjects yet.</span>';
  } catch(e) {
    sidebarNav.innerHTML = '<span style="padding:10px;font-size:0.8rem;color:var(--text-muted)">—</span>';
  }
}

function navFromSidebar(id, name, type) {
  navigateTo([{id, name, type}]);
  if (window.innerWidth <= 720) sidebar.classList.remove('open');
}

/* ════════════════════════════════════
   NAVIGATION & BREADCRUMB
════════════════════════════════════ */
function navigateTo(path) {
  currentPath = path;
  renderBreadcrumb();
  renderContent();
}

function renderBreadcrumb() {
  let html = `<span class="crumb ${currentPath.length===0?'active':''}" onclick="navigateTo([])">Home</span>`;
  currentPath.forEach((seg, i) => {
    html += `<span class="crumb-sep">›</span>`;
    const isCurrent = i === currentPath.length - 1;
    html += `<span class="crumb ${isCurrent?'active':''}" onclick="navigateTo(currentPath.slice(0,${i+1}))">${escHtml(seg.name)}</span>`;
  });
  breadcrumb.innerHTML = html;
}

/* ════════════════════════════════════
   CONTENT RENDER
════════════════════════════════════ */
async function renderContent() {
  contentInner.innerHTML = '<div class="loading"><div class="spinner"></div><span>Loading...</span></div>';
  const parentId = currentPath.length > 0 ? currentPath[currentPath.length-1].id : null;
  const depth    = currentPath.length;

  try {
    // Check if current node is a CHAPTER (last path item type === 'chapter')
    if (depth > 0 && currentPath[depth-1].type === 'chapter') {
      await renderChapterView(currentPath[depth-1]);
      return;
    }

    let q;
    if (parentId === null) {
      q = db.collection('items').where('parentId', '==', null).orderBy('order');
    } else {
      q = db.collection('items').where('parentId', '==', parentId).orderBy('order');
    }
    const snap = await q.get();
    const items = [];
    snap.forEach(doc => items.push({id: doc.id, ...doc.data()}));

    let html = '';

    if (depth === 0) {
      html += `<div class="home-hero">
        <h2>Welcome back, <em>${escHtml((currentUser?.displayName||'').split(' ')[0] || 'Student')}</em> ✦</h2>
        <p>Browse your study materials, textbooks, and resources — all in one place.</p>
      </div>`;
    } else {
      const curr = currentPath[depth-1];
      html += `<div class="page-header">
        <div class="page-header-left">
          <div class="page-title">${escHtml(curr.name)}</div>
          <div class="page-sub">${depth} level${depth>1?'s':''} deep · ${items.length} item${items.length!==1?'s':''}</div>
        </div>
        ${isAdmin ? `<div class="page-actions"><button class="btn-primary" onclick="openAddModal()">+ Add Item</button></div>` : ''}
      </div>`;
    }

    if (items.length === 0) {
      html += `<div class="empty-state">
        <div class="empty-icon">📭</div>
        <p>${isAdmin ? 'No items yet. Click "+ Add" to create one.' : 'Nothing here yet.'}</p>
      </div>`;
    } else {
      html += `<div class="item-grid">`;
      items.forEach((item, idx) => {
        html += buildCard(item, idx);
      });
      html += `</div>`;
    }

    html += `<div class="credits-bar">Developed by <strong>Aarav Sinha</strong> · Nexus Study Portal</div>`;
    contentInner.innerHTML = html;

  } catch(e) {
    contentInner.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>Error: ${e.message}</p></div>`;
  }
}

/* Chapter view — shows Textbook PDF + Study Materials */
async function renderChapterView(chapter) {
  // Load direct children: pdf files + study material folders/files
  const snap = await db.collection('items').where('parentId', '==', chapter.id).orderBy('order').get();
  const children = [];
  snap.forEach(doc => children.push({id: doc.id, ...doc.data()}));

  const textbooks = children.filter(c => c.type === 'pdf');
  const studyMats = children.filter(c => c.type === 'studymaterial' || c.type === 'folder' || c.type === 'link');

  let html = `
    <div class="chapter-banner">
      <div class="chapter-banner-title">${escHtml(chapter.name)}</div>
      <div class="chapter-banner-sub">Chapter resources · ${children.length} item${children.length!==1?'s':''}</div>
    </div>`;

  // Admin add button here
  if (isAdmin) {
    html += `<div style="display:flex;justify-content:flex-end;margin-bottom:20px">
      <button class="btn-primary" onclick="openAddModal()">+ Add Resource</button>
    </div>`;
  }

  // Textbook PDFs
  html += `<div class="section-label">📖 Textbook PDF</div>`;
  if (textbooks.length === 0) {
    html += `<div class="empty-state" style="padding:32px"><div class="empty-icon" style="font-size:1.8rem">📄</div><p>No textbook uploaded${isAdmin?' — add one above.':'.'}</p></div>`;
  } else {
    html += `<div class="file-list">`;
    textbooks.forEach((f, i) => {
      html += buildFileRow(f, i);
    });
    html += `</div>`;
  }

  // Study Materials
  html += `<div class="section-label" style="margin-top:24px">📚 Study Materials</div>`;
  if (studyMats.length === 0) {
    html += `<div class="empty-state" style="padding:32px"><div class="empty-icon" style="font-size:1.8rem">📝</div><p>No study materials uploaded${isAdmin?' — add one above.':'.'}</p></div>`;
  } else {
    html += `<div class="file-list">`;
    studyMats.forEach((f, i) => {
      html += buildFileRow(f, i);
    });
    html += `</div>`;
  }

  html += `<div class="credits-bar">Developed by <strong>Aarav Sinha</strong> · Nexus Study Portal</div>`;
  contentInner.innerHTML = html;
}

/* ════════════════════════════════════
   CARD / ROW BUILDERS
════════════════════════════════════ */
function buildCard(item, idx) {
  const icon  = typeIcon(item.type, item.emoji);
  const chip  = typeChip(item.type);
  const delay = `animation-delay:${idx * 0.05}s`;
  const adminBar = isAdmin ? `
    <div class="card-admin-bar">
      <button onclick="openRenameModal(event,'${item.id}','${escHtml(item.name).replace(/'/g,"\\'")}')">✏️</button>
      <button class="del-btn" onclick="deleteItem(event,'${item.id}')">🗑️</button>
    </div>` : '';

  return `<div class="item-card" style="${delay}" onclick="handleItemClick('${item.id}','${escHtml(item.name).replace(/'/g,"\\'")}','${item.type}','${(item.url||'').replace(/'/g,"\\'")}')">
    ${adminBar}
    <div class="item-icon">${icon}</div>
    <div class="item-name">${escHtml(item.name)}</div>
    <div class="item-type-chip ${chipClass(item.type)}">${chip}</div>
    ${item.description ? `<div class="item-meta">${escHtml(item.description)}</div>` : ''}
  </div>`;
}

function buildFileRow(item, idx) {
  const icon  = typeIcon(item.type, item.emoji);
  const delay = `animation-delay:${idx * 0.05}s`;
  const adminActions = isAdmin ? `
    <div class="file-row-actions">
      <button class="btn-icon" onclick="openRenameModal(event,'${item.id}','${escHtml(item.name).replace(/'/g,"\\'")}')">✏️</button>
      <button class="btn-icon" style="color:#f06292" onclick="deleteItem(event,'${item.id}')">🗑️</button>
    </div>` : '';

  return `<div class="file-row" style="${delay}" onclick="handleItemClick('${item.id}','${escHtml(item.name).replace(/'/g,"\\'")}','${item.type}','${(item.url||'').replace(/'/g,"\\'")}')">
    <div class="file-row-icon">${icon}</div>
    <div class="file-row-info">
      <div class="file-row-name">${escHtml(item.name)}</div>
      ${item.description ? `<div class="file-row-meta">${escHtml(item.description)}</div>` : ''}
    </div>
    <div class="file-row-right">
      <div class="item-type-chip ${chipClass(item.type)}">${typeChip(item.type)}</div>
      ${adminActions}
    </div>
  </div>`;
}

/* ════════════════════════════════════
   ITEM CLICK HANDLER
════════════════════════════════════ */
function handleItemClick(id, name, type, url) {
  if (type === 'pdf') {
    openPDF(url, name);
  } else if (type === 'link') {
    window.open(url, '_blank');
  } else {
    // Navigate into it
    navigateTo([...currentPath, {id, name, type}]);
    // highlight sidebar
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.id === id);
    });
  }
}

/* ════════════════════════════════════
   PDF VIEWER
════════════════════════════════════ */
function openPDF(url, title) {
  if (!url) { showToast('No PDF URL provided.', true); return; }
  pdfModalTitle.textContent = title;
  pdfIframe.src = url;
  pdfOpenNew.href = url;
  pdfModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
pdfModalClose.addEventListener('click', () => {
  pdfModal.style.display = 'none';
  pdfIframe.src = '';
  document.body.style.overflow = '';
});
pdfModal.addEventListener('click', e => {
  if (e.target === pdfModal) {
    pdfModal.style.display = 'none';
    pdfIframe.src = '';
    document.body.style.overflow = '';
  }
});

/* ════════════════════════════════════
   ADD MODAL
════════════════════════════════════ */
addBtn.addEventListener('click', openAddModal);

function openAddModal() {
  if (!isAdmin) return;
  const parentId = currentPath.length > 0 ? currentPath[currentPath.length-1].id : null;
  const depth    = currentPath.length;

  // Determine what types make sense at this depth
  let typeOptions = '';
  if (depth === 0) {
    // Top level = subjects
    typeOptions = `<option value="subject">Subject (e.g. English Class 11)</option>
                   <option value="folder">Folder</option>`;
  } else {
    const parentType = currentPath[depth-1].type;
    if (parentType === 'chapter') {
      typeOptions = `<option value="pdf">Textbook PDF</option>
                     <option value="studymaterial">Study Material (PDF)</option>
                     <option value="link">External Link</option>`;
    } else {
      typeOptions = `<option value="folder">Folder / Category</option>
                     <option value="subject">Subject</option>
                     <option value="chapter">Chapter</option>
                     <option value="pdf">Textbook PDF</option>
                     <option value="studymaterial">Study Material (PDF)</option>
                     <option value="link">External Link</option>`;
    }
  }

  addModalTitle.textContent = 'Add Item';
  addModalBody.innerHTML = `
    <div class="form-group">
      <label>TYPE</label>
      <select class="form-select" id="af-type" onchange="toggleURLField()">
        ${typeOptions}
      </select>
    </div>
    <div class="form-group">
      <label>NAME</label>
      <input class="form-input" id="af-name" placeholder="e.g. Chapter 1: The Portrait of a Lady" autocomplete="off"/>
    </div>
    <div class="form-group" id="af-url-group" style="display:none">
      <label>PDF / URL</label>
      <input class="form-input" id="af-url" placeholder="https://drive.google.com/file/d/... or direct PDF link"/>
      <small style="color:var(--text-muted);font-size:0.72rem;margin-top:4px">Use Google Drive share link or any direct PDF URL.</small>
    </div>
    <div class="form-group">
      <label>DESCRIPTION (optional)</label>
      <input class="form-input" id="af-desc" placeholder="Short description…" autocomplete="off"/>
    </div>
    <div class="form-group">
      <label>EMOJI ICON (optional)</label>
      <input class="form-input" id="af-emoji" placeholder="📘" maxlength="4" style="width:80px"/>
    </div>
    <div class="form-actions">
      <button class="btn-secondary" onclick="closeAddModal()">Cancel</button>
      <button class="btn-primary" onclick="submitAdd('${parentId}')">Add Item</button>
    </div>
  `;
  toggleURLField();
  addModal.style.display = 'flex';
}

function toggleURLField() {
  const t = document.getElementById('af-type');
  const g = document.getElementById('af-url-group');
  if (!t || !g) return;
  g.style.display = ['pdf','studymaterial','link'].includes(t.value) ? 'flex' : 'none';
}

function closeAddModal() {
  addModal.style.display = 'none';
}
addModalClose.addEventListener('click', closeAddModal);
addModal.addEventListener('click', e => { if(e.target===addModal) closeAddModal(); });

async function submitAdd(parentId) {
  const type  = document.getElementById('af-type').value;
  const name  = document.getElementById('af-name').value.trim();
  const url   = document.getElementById('af-url')?.value.trim() || '';
  const desc  = document.getElementById('af-desc').value.trim();
  const emoji = document.getElementById('af-emoji').value.trim();

  if (!name) { showToast('Name is required.', true); return; }
  if (['pdf','studymaterial','link'].includes(type) && !url) {
    showToast('URL is required for this type.', true); return;
  }

  // Count existing items to set order
  let orderCount = 0;
  try {
    const snap = await db.collection('items').where('parentId', '==', parentId || null).get();
    orderCount = snap.size;
  } catch {}

  const data = {
    name, type, description: desc, emoji,
    parentId: parentId || null,
    order: orderCount,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    createdBy: currentUser.email
  };
  if (url) data.url = convertGDriveURL(url);

  try {
    await db.collection('items').add(data);
    closeAddModal();
    showToast(`"${name}" added!`);
    renderContent();
    loadSidebar();
  } catch(e) {
    showToast('Error: ' + e.message, true);
  }
}

/* ════════════════════════════════════
   RENAME
════════════════════════════════════ */
function openRenameModal(e, id, currentName) {
  e.stopPropagation();
  addModalTitle.textContent = 'Rename Item';
  addModalBody.innerHTML = `
    <div class="form-group">
      <label>NEW NAME</label>
      <input class="form-input" id="rf-name" value="${escHtml(currentName)}" autocomplete="off"/>
    </div>
    <div class="form-actions">
      <button class="btn-secondary" onclick="closeAddModal()">Cancel</button>
      <button class="btn-primary" onclick="submitRename('${id}')">Rename</button>
    </div>
  `;
  addModal.style.display = 'flex';
}

async function submitRename(id) {
  const name = document.getElementById('rf-name').value.trim();
  if (!name) { showToast('Name is required.', true); return; }
  try {
    await db.collection('items').doc(id).update({ name });
    closeAddModal();
    showToast('Renamed!');
    renderContent();
    loadSidebar();
    // Update breadcrumb if in path
    currentPath = currentPath.map(p => p.id === id ? {...p, name} : p);
    renderBreadcrumb();
  } catch(e) { showToast('Error: ' + e.message, true); }
}

/* ════════════════════════════════════
   DELETE
════════════════════════════════════ */
async function deleteItem(e, id) {
  e.stopPropagation();
  if (!confirm('Delete this item and all its contents? This cannot be undone.')) return;
  try {
    await deleteRecursive(id);
    showToast('Deleted.');
    renderContent();
    loadSidebar();
  } catch(err) { showToast('Error: ' + err.message, true); }
}

async function deleteRecursive(id) {
  // Delete children first
  const snap = await db.collection('items').where('parentId', '==', id).get();
  for (const doc of snap.docs) await deleteRecursive(doc.id);
  await db.collection('items').doc(id).delete();
}

/* ════════════════════════════════════
   CONTEXT MENU (right-click on cards)
════════════════════════════════════ */
document.addEventListener('contextmenu', e => {
  const card = e.target.closest('.item-card, .file-row');
  if (!card || !isAdmin) return;
  e.preventDefault();
  ctxTarget = card;
  ctxMenu.style.display = 'block';
  ctxMenu.style.left = Math.min(e.clientX, window.innerWidth - 160) + 'px';
  ctxMenu.style.top  = Math.min(e.clientY, window.innerHeight - 100) + 'px';
});
document.addEventListener('click', () => { ctxMenu.style.display = 'none'; });

/* ════════════════════════════════════
   GDRIVE URL CONVERTER
════════════════════════════════════ */
function convertGDriveURL(url) {
  // Convert Google Drive share links to direct embed/preview
  const m = url.match(/\/file\/d\/([^/]+)/);
  if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
  return url;
}

/* ════════════════════════════════════
   HELPERS
════════════════════════════════════ */
function typeIcon(type, emoji) {
  if (emoji) return emoji;
  const map = {
    subject:'🎓', folder:'📁', chapter:'📖',
    pdf:'📄', studymaterial:'📝', link:'🔗',
    book:'📚', notes:'🗒️'
  };
  return map[type] || '📁';
}
function typeChip(type) {
  const map = {
    subject:'Subject', folder:'Folder', chapter:'Chapter',
    pdf:'PDF', studymaterial:'Study Mat.', link:'Link',
    book:'Book', notes:'Notes'
  };
  return map[type] || type;
}
function chipClass(type) {
  if (type === 'pdf' || type === 'studymaterial') return 'chip-pdf';
  if (type === 'subject') return 'chip-subject';
  if (type === 'link') return 'chip-study';
  return 'chip-folder';
}
function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

let toastTimer;
function showToast(msg, isError) {
  toast.textContent = msg;
  toast.style.borderColor = isError ? '#f06292' : 'var(--border)';
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

/* ── Sidebar mobile ── */
menuBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
sidebarClose.addEventListener('click', () => sidebar.classList.remove('open'));

/* ── Expose functions for inline HTML onclick ── */
window.navigateTo     = navigateTo;
window.handleItemClick= handleItemClick;
window.openAddModal   = openAddModal;
window.closeAddModal  = closeAddModal;
window.submitAdd      = submitAdd;
window.submitRename   = submitRename;
window.openRenameModal= openRenameModal;
window.deleteItem     = deleteItem;
window.toggleURLField = toggleURLField;
window.navFromSidebar = navFromSidebar;
window.currentPath    = currentPath;
