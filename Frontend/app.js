```javascript
/* ============================================================
   Cultivation Linkage — single-file frontend (hash-routed SPA)
   Point at your backend below.
   ============================================================ */
const API_BASE = window.CL_API_BASE || "http://localhost:4000/api";

const Session = {
  getToken(){ return localStorage.getItem("cl_token"); },
  setToken(t){ localStorage.setItem("cl_token", t); },
  getUser(){ const r = localStorage.getItem("cl_user"); return r ? JSON.parse(r) : null; },
  setUser(u){ localStorage.setItem("cl_user", JSON.stringify(u)); },
  clear(){ localStorage.removeItem("cl_token"); localStorage.removeItem("cl_user"); },
  isLoggedIn(){ return !!this.getToken(); },
};

async function api(path, { method="GET", body, auth=true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && Session.getToken()) headers.Authorization = `Bearer ${Session.getToken()}`;
  const res = await fetch(`${API_BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = {}; try { data = await res.json(); } catch(e){}
  if (!res.ok) {
    if (res.status === 401 && auth) { Session.clear(); location.hash = "#/login"; }
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

function esc(s){ return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

function money(n){ return "₹" + Number(n).toLocaleString("en-IN"); }

function fdate(d){ if(!d) return "—"; try { return new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}); } catch(e){ return d; } }

function toast(msg, isErr){ const el=document.createElement("div"); el.className="toast"+(isErr?" error":""); el.textContent=msg; document.body.appendChild(el); setTimeout(()=>el.remove(),3000); }

const root = document.getElementById("root");


/* ---------------- Router ---------------- */

window.addEventListener("hashchange", render);

window.addEventListener("load", () => { 
  if(!location.hash) location.hash = "#/"; 
  render(); 
});

function nav(path){ location.hash = path; }

function currentRoute() {
  const hash = location.hash.replace(/^#/, "") || "/";
  const [path, qs] = hash.split("?");
  return { path, params: new URLSearchParams(qs || "") };
}

async function render() {
  const { path, params } = currentRoute();
  const user = Session.getUser();

  if (path === "/") return renderLanding();
  if (path === "/login") return renderLogin();
  if (path === "/register") return renderRegister();

  if (!Session.isLoggedIn() || !user) return nav("#/login");

  if (path === "/dashboard") return user.role === "farmer" ? renderFarmerDashboard() : user.role === "buyer" ? renderBuyerDashboard() : renderAdmin();
  if (path === "/listings") return renderListings();
  if (path === "/requirements-browse") return renderRequirementsBrowse();
  if (path === "/marketplace") return renderMarketplace();
  if (path === "/requirements") return renderRequirements();
  if (path === "/offers") return renderOffers();
  if (path === "/orders") return renderOrders();
  if (path === "/profile") return renderProfile();
  if (path === "/admin") return renderAdmin();
  
  return renderLanding();
}


/* ---------------- Landing ---------------- */

function renderLanding() {
  root.innerHTML = `
    <div class="topbar"><div class="topbar-inner">
      <div class="brand"><span class="leaf">🌱</span> Cultivation Linkage</div>
      <div><a href="#/login" class="btn btn-outline btn-sm">Log in</a> <a href="#/register" class="btn btn-primary btn-sm">Get Started</a></div>
    </div></div>
    
    <section class="hero"><div class="container">
      <h1>Connecting Farmers with Bulk Buyers</h1>
      <p class="lead">A digital marketplace that makes agricultural produce discovery and bulk buying easier.</p>
      
      <div class="hero-actions">
        <a href="#/register" class="btn btn-primary">Get Started</a>
        <a href="#/login" class="btn btn-outline">Farmer Login</a>
        <a href="#/login" class="btn btn-outline">Buyer Login</a>
      </div>
      
      <div class="steps">
        ${["List Produce","Post Requirement","Find Match","Make Offer","Complete Order"].map((s,i,arr)=>`<div class="step"><div class="dot">${i+1}</div><div class="step-name">${s}</div></div>${i<arr.length-1?'<div class="step-arrow">→</div>':""}`).join("")}
      </div>
    </div></section>`;
}


/* ---------------- Login / Register ---------------- */

function renderLogin() {
  root.innerHTML = `
    <div class="center-page"><div class="card auth-card">
      <div class="brand" style="margin-bottom:16px;"><span class="leaf">🌱</span> Cultivation Linkage</div>
      <h2 style="margin-bottom:2px;">Welcome back</h2><p style="margin-bottom:16px;">Log in to your account</p>
      
      <form id="f">
        <div class="form-group"><label>Email</label><input type="email" id="email" required /></div>
        <div class="form-group"><label>Password</label><input type="password" id="password" required /></div>
        <button class="btn btn-primary btn-block">Log in</button>
      </form>
      
      <p style="font-size:12px;margin-top:12px;">Demo password: <strong>password123</strong> — try ramesh@farm.in / priya@freshmart.in / admin@cultivationlinkage.in</p>
      
      <div class="auth-switch">No account? <a href="#/register">Register</a></div>
    </div></div>`;
    
  document.getElementById("f").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    try {
      const { token, user } = await api("/auth/login", { method:"POST", auth:false, body:{ email: email.value.trim(), password: password.value } });
      Session.setToken(token); 
      Session.setUser(user); 
      nav("#/dashboard");
    } catch(err){ 
      toast(err.message, true); 
    }
  });
}

function renderRegister() {
  root.innerHTML = `
    <div class="center-page"><div class="card auth-card">
      <div class="brand" style="margin-bottom:16px;"><span class="leaf">🌱</span> Cultivation Linkage</div>
      <h2 style="margin-bottom:2px;">Create your account</h2><p style="margin-bottom:16px;">Choose your role</p>
      
      <div class="role-toggle"><button type="button" id="rf" class="active">Farmer</button><button type="button" id="rb">Bulk Buyer</button></div>
      
      <form id="f">
        <div class="form-group"><label>Full name</label><input id="name" required /></div>
        <div class="form-group hidden" id="bg"><label>Business name</label><input id="biz" /></div>
        <div class="form-group"><label>Email</label><input type="email" id="email" required /></div>
        <div class="form-group"><label>Phone</label><input id="phone" /></div>
        <div class="form-group"><label>Location</label><input id="loc" required placeholder="City, State" /></div>
        <div class="form-group"><label>Password</label><input type="password" id="password" required minlength="6" /></div>
        <button class="btn btn-primary btn-block">Create account</button>
      </form>
      
      <div class="auth-switch">Already have an account? <a href="#/login">Log in</a></div>
    </div></div>`;
    
  let role = "farmer";
  const rf=document.getElementById("rf"), rb=document.getElementById("rb"), bg=document.getElementById("bg");
  
  rf.onclick=()=>{role="farmer";rf.classList.add("active");rb.classList.remove("active");bg.classList.add("hidden");};
  rb.onclick=()=>{role="buyer";rb.classList.add("active");rf.classList.remove("active");bg.classList.remove("hidden");};
  
  document.getElementById("f").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    try {
      const { token, user } = await api("/auth/register", { method:"POST", auth:false, body:{
        role, name:name.value.trim(), email:email.value.trim(), phone:phone.value.trim(),
        location:loc.value.trim(), password:password.value, businessName:biz.value.trim(),
      }});
      
      Session.setToken(token); 
      Session.setUser(user); 
      nav("#/dashboard");
    } catch(err){ 
      toast(err.message, true); 
    }
  });
}


/* ---------------- App shell (sidebar) ---------------- */

const NAV = {
  farmer: [["#/dashboard","Dashboard"],["#/listings","My Listings"],["#/requirements-browse","Buyer Requirements"],["#/offers","Offers"],["#/orders","Orders"],["#/profile","Profile"]],
  buyer:  [["#/dashboard","Dashboard"],["#/marketplace","Find Farmers"],["#/requirements","My Requirements"],["#/offers","Offers"],["#/orders","Orders"],["#/profile","Profile"]],
  admin:  [["#/admin","Overview"]],
};

function shell(title, subtitle, bodyHtml) {
  const user = Session.getUser();
  const items = NAV[user.role] || [];
  const activePath = location.hash.split("?")[0];
  
  root.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand"><span class="leaf">🌱</span> Cultivation Linkage</div>
        <nav>${items.map(([href,label])=>`<a href="${href}" class="${href===activePath?"active":""}">${label}</a>`).join("")}</nav>
      </aside>
      
      <div class="main-area">
        <header class="main-header">
          <div><h3 style="margin:0">${esc(title)}</h3>${subtitle?`<p style="margin:2px 0 0;font-size:12.5px">${esc(subtitle)}</p>`:""}</div>
          <div class="user-chip"><span>Signed in as <strong>${esc(user.businessName||user.name)}</strong> (${esc(user.role)})</span><button class="btn btn-outline btn-sm" id="logout">Log out</button></div>
        </header>
        
        <main class="main-content" id="content">${bodyHtml || "<p>Loading…</p>"}</main>
      </div>
    </div>`;
    
  document.getElementById("logout").onclick = () => { 
    Session.clear(); 
    nav("#/"); 
  };
}


/* ---------------- Farmer dashboard ---------------- */

async function renderFarmerDashboard() {
  const user = Session.getUser();
  shell("Dashboard", `Welcome back, ${user.name}`);
  const content = document.getElementById("content");
  
  try {
    const [{listings},{requirements},{offers},{orders}] = await Promise.all([api("/listings"), api("/requirements"), api("/offers"), api("/orders")]);
    const pending = offers.filter(o=>o.status==="pending");
    const active = orders.filter(o=>o.orderStatus!=="completed");
    
    content.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card"><div class="label">My Listings</div><div class="value">${listings.length}</div></div>
        <div class="stat-card"><div class="label">Buyer Requirements</div><div class="value">${requirements.length}</div></div>
        <div class="stat-card"><div class="label">New Offers</div><div class="value">${pending.length}</div></div>
        <div class="stat-card"><div class="label">Active Orders</div><div class="value">${active.length}</div></div>
        <div class="stat-card"><div class="label">Payment Status</div><div class="value">${orders.filter(o=>o.paymentStatus!=="paid").length} pending</div></div>
      </div>
      
      <div class="grid grid-2">
        <div class="card"><h3>Recent Listings</h3>${listings.length?listings.slice(0,4).map(l=>`<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);"><span>${esc(l.crop)} — ${l.quantity} ${l.unit}</span><span>${money(l.price)}/${l.unit}</span></div>`).join(""):`<p>No listings yet. <a href="#/listings">Add one</a>.</p>`}</div>
        
        <div class="card"><h3>New Offers</h3>${pending.length?pending.slice(0,4).map(o=>`<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);"><span>${esc(o.crop)} · from ${esc(o.buyerName)}</span><span>${money(o.price)}</span></div>`).join(""):"<p>No pending offers.</p>"}</div>
      </div>`;
      
  } catch(err){ 
    content.innerHTML = `<p>${esc(err.message)}</p>`; 
  }
}


/* ---------------- Buyer dashboard ---------------- */

async function renderBuyerDashboard() {
  const user = Session.getUser();
  shell("Dashboard", `Welcome back, ${user.businessName||user.name}`);
  const content = document.getElementById("content");
  
  try {
    const [{requirements},{listings},{offers},{orders}] = await Promise.all([api("/requirements/mine"), api("/marketplace"), api("/offers"), api("/orders")]);
    
    content.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card"><div class="label">My Requirements</div><div class="value">${requirements.length}</div></div>
        <div class="stat-card"><div class="label">Matching Farmers</div><div class="value">${listings.length}</div></div>
        <div class="stat-card"><div class="label">Sent Offers</div><div class="value">${offers.length}</div></div>
        <div class="stat-card"><div class="label">Active Orders</div><div class="value">${orders.filter(o=>o.orderStatus!=="completed").length}</div></div>
        <div class="stat-card"><div class="label">Payment Status</div><div class="value">${orders.filter(o=>o.paymentStatus!=="paid").length} pending</div></div>
      </div>
      
      <div class="grid grid-2">
        <div class="card"><h3>My Requirements</h3>${requirements.length?requirements.slice(0,4).map(r=>`<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);"><span>${esc(r.crop)} — ${r.quantity} ${r.unit}</span><span>${money(r.targetPrice)}/${r.unit}</span></div>`).join(""):`<p>None yet. <a href="#/requirements">Post one</a>.</p>`}</div>
        
        <div class="card"><h3>Top Matches</h3>${listings.length?listings.slice(0,4).map(l=>`<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);"><span>${esc(l.crop)} · ${esc(l.farmerName)}</span><span>${money(l.price)}/${l.unit}</span></div>`).join(""):"<p>No listings yet.</p>"}</div>
      </div>`;
      
  } catch(err){ 
    content.innerHTML = `<p>${esc(err.message)}</p>`; 
  }
}


/* ---------------- Farmer: My Listings (add + manage) ---------------- */

async function renderListings() {
  shell("My Listings", "Add and manage your crop listings");
  paintListingsTabs(false);
}

function paintListingsTabs(showMine, editing) {
  const content = document.getElementById("content");
  
  content.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:16px;">
      <button class="btn btn-sm ${showMine?"btn-outline":"btn-primary"}" id="tAdd">Add Crop</button>
      <button class="btn btn-sm ${showMine?"btn-primary":"btn-outline"}" id="tMine">My Listings</button>
    </div>
    <div id="tabBody"></div>`;
    
  document.getElementById("tAdd").onclick = () => paintListingsTabs(false);
  document.getElementById("tMine").onclick = () => paintListingsTabs(true);
  
  showMine ? paintMyListings() : paintListingForm(editing);
}

function paintListingForm(existing) {
  const el = document.getElementById("tabBody");
  
  el.innerHTML = `
    <div class="card form-card">
      <h3>${existing?"Edit Listing":"Add Crop Listing"}</h3>
      
      <form id="f">
        <div class="form-row">
          <div class="form-group"><label>Crop name</label><input id="crop" required value="${existing?esc(existing.crop):""}" /></div>
          <div class="form-group"><label>Quality</label><select id="quality"><option>Grade A</option><option>Grade B</option><option>Grade C</option></select></div>
        </div>
        
        <div class="form-row">
          <div class="form-group"><label>Quantity</label><input type="number" id="quantity" required value="${existing?existing.quantity:""}" /></div>
          <div class="form-group"><label>Unit</label><select id="unit"><option value="kg">kg</option><option value="tonne">tonne</option></select></div>
        </div>
        
        <div class="form-row">
          <div class="form-group"><label>Price (₹/unit)</label><input type="number" id="price" required value="${existing?existing.price:""}" /></div>
          <div class="form-group"><label>Available date</label><input type="date" id="availableDate" value="${existing?existing.availableDate:""}" /></div>
        </div>
        
        <div class="form-group"><label>Location</label><input id="location" required value="${existing?esc(existing.location):""}" /></div>
        <div class="form-group"><label>Description</label><textarea id="description" rows="3">${existing?esc(existing.description||""):""}</textarea></div>
        
        <button class="btn btn-primary btn-block">${existing?"Save Changes":"Add Listing"}</button>
      </form>
    </div>`;
    
  if (existing) { 
    el.querySelector("#quality").value = existing.quality; 
    el.querySelector("#unit").value = existing.unit; 
  }
  
  document.getElementById("f").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const payload = { 
      crop: crop.value.trim(), 
      quality: quality.value, 
      quantity: quantity.value, 
      unit: unit.value, 
      price: price.value, 
      availableDate: availableDate.value, 
      location: location.value.trim(), 
      description: description.value.trim() 
    };
    
    try {
      if (existing) { 
        await api(`/listings/${existing.id}`, { method:"PUT", body:payload }); 
        toast("Listing updated"); 
      }
      else { 
        await api("/listings", { method:"POST", body:payload }); 
        toast("Listing added"); 
      }
      
      paintListingsTabs(true);
      
    } catch(err){ 
      toast(err.message, true); 
    }
  });
}

async function paintMyListings() {
  const el = document.getElementById("tabBody");
  el.innerHTML = "<p>Loading…</p>";
  
  try {
    const { listings } = await api("/listings");
    
    if (!listings.length) { 
      el.innerHTML = `<div class="empty-state">No listings yet.</div>`; 
      return; 
    }
    
    el.innerHTML = `<div class="grid grid-3">${listings.map(l=>`
      <div class="card listing-card">
        <div class="top-row"><h3>${esc(l.crop)}</h3><span class="badge badge-${l.status}">${esc(l.status)}</span></div>
        <div class="meta">${esc(l.location)}</div>
        <div class="fields">
          <div><span>Qty: </span>${l.quantity} ${l.unit}</div>
          <div><span>Price: </span>${money(l.price)}/${l.unit}</div>
          <div><span>Quality: </span>${esc(l.quality)}</div>
          <div><span>Avail: </span>${fdate(l.availableDate)}</div>
        </div>
        <div class="actions">
          <button class="btn btn-outline btn-sm" data-edit="${l.id}">Edit</button>
          <button class="btn btn-danger btn-sm" data-del="${l.id}">Delete</button>
        </div>
      </div>`).join("")}</div>`;
      
    listings.forEach(l => {
      el.querySelector(`[data-edit="${l.id}"]`).onclick = () => paintListingsTabs(false, l);
      
      el.querySelector(`[data-del="${l.id}"]`).onclick = async () => { 
        if(!confirm(`Delete ${l.crop}?`)) return; 
        
        try{ 
          await api(`/listings/${l.id}`,{method:"DELETE"}); 
          toast("Deleted"); 
          paintMyListings(); 
        }catch(e){
          toast(e.message,true);
        }
      };
    });
    
  } catch(err){ 
    el.innerHTML = `<p>${esc(err.message)}</p>`; 
  }
}


/* ---------------- Farmer: Browse buyer requirements ---------------- */

async function renderRequirementsBrowse() {
  shell("Buyer Requirements", "See what bulk buyers are looking for");
  const content = document.getElementById("content");
  
  let myListings = [];
  
  try { 
    myListings = (await api("/listings")).listings; 
  } catch(e){}
  
  content.innerHTML = `
    <div class="filter-bar">
      <select id="fl"><option value="">Score against: none</option>${myListings.map(l=>`<option value="${l.id}">${esc(l.crop)} (${l.quantity} ${l.unit})</option>`).join("")}</select>
      <input id="fc" placeholder="Crop" />
      <input id="floc" placeholder="Location" />
      <button class="btn btn-primary btn-sm" id="go">Apply</button>
    </div>
    <div id="grid" class="grid grid-3"></div>`;
    
  document.getElementById("go").onclick = load;
  load();
  
  async function load() {
    const grid = document.getElementById("grid"); 
    grid.innerHTML = "<p>Loading…</p>";
    
    const p = new URLSearchParams();
    
    if (fc.value.trim()) p.set("crop", fc.value.trim());
    if (floc.value.trim()) p.set("location", floc.value.trim());
    if (fl.value) p.set("listingId", fl.value);
    
    try {
      const { requirements } = await api(`/requirements?${p}`);
      
      if (!requirements.length) { 
        grid.innerHTML = `<div class="empty-state">No open requirements match.</div>`; 
        return; 
      }
      
      grid.innerHTML = requirements.map(r => `
        <div class="card listing-card">
          <div class="top-row"><h3>${esc(r.crop)}</h3>${r.matchPercent!=null?`<span class="match-badge ${r.matchPercent>=75?"high":""}">${r.matchPercent}% Match</span>`:""}</div>
          <div class="meta">${esc(r.preferredLocation)}</div>
          <div class="fields">
            <div><span>Qty: </span>${r.quantity} ${r.unit}</div>
            <div><span>Target: </span>${money(r.targetPrice)}/${r.unit}</div>
            <div><span>Quality: </span>${esc(r.quality)}</div>
            <div><span>By: </span>${fdate(r.requiredDate)}</div>
          </div>
        </div>`).join("");
        
    } catch(err){ 
      grid.innerHTML = `<p>${esc(err.message)}</p>`; 
    }
  }
}


/* ---------------- Buyer: Marketplace ---------------- */

async function renderMarketplace() {
  shell("Find Farmers", "Browse listings matched to your requirements");
  const content = document.getElementById("content");
  
  let myReqs = [];
  
  try { 
    myReqs = (await api("/requirements/mine")).requirements; 
  } catch(e){}
  
  content.innerHTML = `
    <div class="filter-bar">
      <select id="fr"><option value="">Score against: none</option>${myReqs.map(r=>`<option value="${r.id}">${esc(r.crop)} (${r.quantity} ${r.unit})</option>`).join("")}</select>
      <input id="fc" placeholder="Crop" />
      <input id="floc" placeholder="Location" />
      <select id="fq"><option value="">Any quality</option><option>Grade A</option><option>Grade B</option><option>Grade C</option></select>
      <input id="fp" type="number" placeholder="Max price" />
      <input id="fqty" type="number" placeholder="Min quantity" />
      <button class="btn btn-primary btn-sm" id="go">Apply</button>
    </div>
    <div id="grid" class="grid grid-3"></div>`;
    
  document.getElementById("go").onclick = load;
  load();
  
  async function load() {
    const grid = document.getElementById("grid"); 
    grid.innerHTML = "<p>Loading…</p>";
    
    const p = new URLSearchParams();
    
    if (fc.value.trim()) p.set("crop", fc.value.trim());
    if (floc.value.trim()) p.set("location", floc.value.trim());
    if (fq.value) p.set("quality", fq.value);
    if (fp.value) p.set("price_max", fp.value);
    if (fqty.value) p.set("quantity_min", fqty.value);
    
    const requirementId = fr.value;
    
    if (requirementId) p.set("requirementId", requirementId);
    
    try {
      const { listings } = await api(`/marketplace?${p}`);
      
      if (!listings.length) { 
        grid.innerHTML = `<div class="empty-state">No listings match.</div>`; 
        return; 
      }
      
      grid.innerHTML = listings.map(l => `
        <div class="card listing-card">
          <div class="top-row"><h3>${esc(l.crop)}</h3>${l.matchPercent!=null?`<span class="match-badge ${l.matchPercent>=75?"high":""}">${l.matchPercent}% Match</span>`:""}</div>
          <div class="meta">by ${esc(l.farmerName)} · ${esc(l.location)}</div>
          <div class="fields">
            <div><span>Qty: </span>${l.quantity} ${l.unit}</div>
            <div><span>Price: </span>${money(l.price)}/${l.unit}</div>
            <div><span>Quality: </span>${esc(l.quality)}</div>
            <div><span>Avail: </span>${fdate(l.availableDate)}</div>
          </div>
          <div class="actions">
            <button class="btn btn-outline btn-sm" data-view="${esc((l.description||"No description").replace(/"/g,'&quot;'))}">View Details</button>
            <button class="btn btn-primary btn-sm" data-offer="${l.id}">Send Offer</button>
          </div>
        </div>`).join("");
        
      grid.querySelectorAll("[data-view]").forEach(b => b.onclick = () => alert(b.dataset.view));
      
      grid.querySelectorAll("[data-offer]").forEach(b => b.onclick = async () => {
        const quantity = prompt("Quantity to offer for:"); 
        if (!quantity) return;
        
        const price = prompt("Price per unit:"); 
        if (!price) return;
        
        try { 
          await api("/offers", { method:"POST", body:{ listingId:b.dataset.offer, requirementId: requirementId||null, quantity:Number(quantity), price:Number(price) } }); 
          toast("Offer sent"); 
        }
        catch(err){ 
          toast(err.message, true); 
        }
      });
      
    } catch(err){ 
      grid.innerHTML = `<p>${esc(err.message)}</p>`; 
    }
  }
}


/* ---------------- Buyer: My Requirements ---------------- */

async function renderRequirements() { 
  shell("My Requirements", "Post and manage what you need to buy"); 
  paintReqTabs(false); 
}

function paintReqTabs(showMine, editing) {
  const content = document.getElementById("content");
  
  content.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:16px;">
      <button class="btn btn-sm ${showMine?"btn-outline":"btn-primary"}" id="tAdd">Post Requirement</button>
      <button class="btn btn-sm ${showMine?"btn-primary":"btn-outline"}" id="tMine">My Requirements</button>
    </div>
    <div id="tabBody"></div>`;
    
  document.getElementById("tAdd").onclick = () => paintReqTabs(false);
  document.getElementById("tMine").onclick = () => paintReqTabs(true);
  
  showMine ? paintMyReqs() : paintReqForm(editing);
}

function paintReqForm(existing) {
  const el = document.getElementById("tabBody");
  
  el.innerHTML = `
    <div class="card form-card">
      <h3>${existing?"Edit Requirement":"Post Buyer Requirement"}</h3>
      
      <form id="f">
        <div class="form-row">
          <div class="form-group"><label>Crop required</label><input id="crop" required value="${existing?esc(existing.crop):""}" /></div>
          <div class="form-group"><label>Quality</label><select id="quality"><option>Grade A</option><option>Grade B</option><option>Grade C</option></select></div>
        </div>
        
        <div class="form-row">
          <div class="form-group"><label>Quantity</label><input type="number" id="quantity" required value="${existing?existing.quantity:""}" /></div>
          <div class="form-group"><label>Unit</label><select id="unit"><option value="kg">kg</option><option value="tonne">tonne</option></select></div>
        </div>
        
        <div class="form-row">
          <div class="form-group"><label>Target price (₹/unit)</label><input type="number" id="targetPrice" required value="${existing?existing.targetPrice:""}" /></div>
          <div class="form-group"><label>Required date</label><input type="date" id="requiredDate" value="${existing?existing.requiredDate:""} /></div>
        </div>
        
        <div class="form-group"><label>Preferred location</label><input id="preferredLocation" required value="${existing?esc(existing.preferredLocation):""}" /></div>
        <div class="form-group"><label>Additional requirements</label><textarea id="additionalRequirements" rows="3">${existing?esc(existing.additionalRequirements||""):""}</textarea></div>
        
        <button class="btn btn-primary btn-block">${existing?"Save Changes":"Post Requirement"}</button>
      </form>
    </div>`;
    
  if (existing) { 
    el.querySelector("#quality").value = existing.quality; 
    el.querySelector("#unit").value = existing.unit; 
  }
  
  document.getElementById("f").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const payload = { 
      crop:crop.value.trim(), 
      quality:quality.value, 
      quantity:quantity.value, 
      unit:unit.value, 
      targetPrice:targetPrice.value, 
      requiredDate:requiredDate.value, 
      preferredLocation:preferredLocation.value.trim(), 
      additionalRequirements:additionalRequirements.value.trim() 
    };
    
    try {
      if (existing) { 
        await api(`/requirements/${existing.id}`, { method:"PUT", body:payload }); 
        toast("Requirement updated"); 
      }
      else { 
        await api("/requirements", { method:"POST", body:payload }); 
        toast("Requirement posted"); 
      }
      
      paintReqTabs(true);
      
    } catch(err){ 
      toast(err.message, true); 
    }
  });
}

async function paintMyReqs() {
  const el = document.getElementById("tabBody"); 
  el.innerHTML = "<p>Loading…</p>";
  
  try {
    const { requirements } = await api("/requirements/mine");
    
    if (!requirements.length) { 
      el.innerHTML = `<div class="empty-state">No requirements posted yet.</div>`; 
      return; 
    }
    
    el.innerHTML = `<div class="grid grid-3">${requirements.map(r=>`
      <div class="card listing-card">
        <div class="top-row"><h3>${esc(r.crop)}</h3><span class="badge badge-${r.status}">${esc(r.status)}</span></div>
        <div class="meta">${esc(r.preferredLocation)}</div>
        <div class="fields">
          <div><span>Qty: </span>${r.quantity} ${r.unit}</div>
          <div><span>Target: </span>${money(r.targetPrice)}/${r.unit}</div>
          <div><span>Quality: </span>${esc(r.quality)}</div>
          <div><span>By: </span>${fdate(r.requiredDate)}</div>
        </div>
        <div class="actions">
          <button class="btn btn-outline btn-sm" data-edit="${r.id}">Edit</button>
          <button class="btn btn-danger btn-sm" data-del="${r.id}">Delete</button>
        </div>
      </div>`).join("")}</div>`;
      
    requirements.forEach(r => {
      el.querySelector(`[data-edit="${r.id}"]`).onclick = () => paintReqTabs(false, r);
      
      el.querySelector(`[data-del="${r.id}"]`).onclick = async () => { 
        if(!confirm(`Delete ${r.crop}?`)) return; 
        
        try{ 
          await api(`/requirements/${r.id}`,{method:"DELETE"}); 
          toast("Deleted"); 
          paintMyReqs(); 
        }catch(e){
          toast(e.message,true);
        }
      };
    });
    
  } catch(err){ 
    el.innerHTML = `<p>${esc(err.message)}</p>`; 
  }
}


/* ---------------- Offers (shared) ---------------- */

async function renderOffers() {
  const user = Session.getUser();
  shell("Offers", user.role==="farmer" ? "Offers received from bulk buyers" : "Offers you've sent to farmers");
  const content = document.getElementById("content");
  
  try {
    const { offers } = await api("/offers");
    
    if (!offers.length) { 
      content.innerHTML = `<div class="empty-state">No offers yet.</div>`; 
      return; 
    }
    
    content.innerHTML = `<div class="card"><table><thead><tr><th>Crop</th><th>Farmer</th><th>Buyer</th><th>Qty</th><th>Price</th><th>Date</th><th>Status</th>${user.role==="farmer"?"<th></th>":""}</tr></thead><tbody>
      ${offers.map(o=>`<tr>
        <td>${esc(o.crop)}</td><td>${esc(o.farmerName)}</td><td>${esc(o.buyerName)}</td><td>${o.quantity}</td><td>${money(o.price)}</td><td>${fdate(o.createdAt)}</td>
        <td><span class="badge badge-${o.status}">${esc(o.status)}</span></td>
        ${user.role==="farmer" && o.status==="pending" ? `<td style="white-space:nowrap;"><button class="btn btn-primary btn-sm" data-acc="${o.id}">Accept</button> <button class="btn btn-danger btn-sm" data-rej="${o.id}">Reject</button></td>` : (user.role==="farmer"?"<td></td>":"")}
      </tr>`).join("")}
    </tbody></table></div>`;
    
    if (user.role === "farmer") {
      content.querySelectorAll("[data-acc]").forEach(b => b.onclick = () => decide(b.dataset.acc, "accepted"));
      content.querySelectorAll("[data-rej]").forEach(b => b.onclick = () => decide(b.dataset.rej, "rejected"));
    }
    
  } catch(err){ 
    content.innerHTML = `<p>${esc(err.message)}</p>`; 
  }
  
  async function decide(id, status) { 
    try { 
      await api(`/offers/${id}`, { method:"PATCH", body:{status} }); 
      toast(`Offer ${status}`); 
      renderOffers(); 
    } catch(err){ 
      toast(err.message, true); 
    } 
  }
}


/* ---------------- Orders (shared) ---------------- */

async function renderOrders() {
  shell("Orders", "Track order and payment status");
  const content = document.getElementById("content");
  
  try {
    const { orders } = await api("/orders");
    
    if (!orders.length) { 
      content.innerHTML = `<div class="empty-state">No orders yet.</div>`; 
      return; 
    }
    
    content.innerHTML = `<div class="card"><table><thead><tr><th>Order ID</th><th>Crop</th><th>Farmer</th><th>Buyer</th><th>Qty</th><th>Agreed Price</th><th>Order Status</th><th>Payment</th></tr></thead><tbody>
      ${orders.map(o=>`<tr>
        <td>${o.id}</td><td>${esc(o.crop)}</td><td>${esc(o.farmerName)}</td><td>${esc(o.buyerName)}</td><td>${o.quantity}</td><td>${money(o.agreedPrice)}</td>
        <td><select data-os="${o.id}"><option value="confirmed" ${o.orderStatus==="confirmed"?"selected":""}>Confirmed</option><option value="processing" ${o.orderStatus==="processing"?"selected":""}>Processing</option><option value="completed" ${o.orderStatus==="completed"?"selected":""}>Completed</option></select></td>
        <td><select data-ps="${o.id}"><option value="pending" ${o.paymentStatus==="pending"?"selected":""}>Pending</option><option value="processing" ${o.paymentStatus==="processing"?"selected":""}>Processing</option><option value="paid" ${o.paymentStatus==="paid"?"selected":""}>Paid</option></select></td>
      </tr>`).join("")}
    </tbody></table></div>`;
    
    content.querySelectorAll("[data-os]").forEach(s => s.onchange = () => update(s.dataset.os, { orderStatus: s.value }));
    content.querySelectorAll("[data-ps]").forEach(s => s.onchange = () => update(s.dataset.ps, { paymentStatus: s.value }));
    
  } catch(err){ 
    content.innerHTML = `<p>${esc(err.message)}</p>`; 
  }
  
  async function update(id, payload) { 
    try { 
      await api(`/orders/${id}`, { method:"PATCH", body:payload }); 
      toast("Order updated"); 
      renderOrders(); 
    } catch(err){ 
      toast(err.message, true); 
    } 
  }
}


/* ---------------- Profile ---------------- */

async function renderProfile() {
  const user = Session.getUser();
  shell("Profile", "Manage your account details");
  const content = document.getElementById("content");
  
  content.innerHTML = `
    <div class="card form-card">
      <form id="f">
        <div class="form-group"><label>Full name</label><input id="name" required value="${esc(user.name)}" /></div>
        ${user.role==="buyer"?`<div class="form-group"><label>Business name</label><input id="biz" value="${esc(user.businessName||"")}" /></div>`:""}
        <div class="form-group"><label>Email</label><input value="${esc(user.email)}" disabled /></div>
        <div class="form-group"><label>Phone</label><input id="phone" value="${esc(user.phone||"")}" /></div>
        <div class="form-group"><label>Location</label><input id="loc" value="${esc(user.location||"")}" /></div>
        <button class="btn btn-primary btn-block">Save changes</button>
      </form>
    </div>`;
    
  document.getElementById("f").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const payload = { 
      name:name.value.trim(), 
      phone:phone.value.trim(), 
      location:loc.value.trim() 
    };
    
    const bizEl = document.getElementById("biz"); 
    
    if (bizEl) payload.businessName = bizEl.value.trim();
    
    try { 
      const { user: u } = await api("/auth/me", { method:"PUT", body:payload }); 
      Session.setUser(u); 
      toast("Profile updated"); 
    }
    catch(err){ 
      toast(err.message, true); 
    }
  });
}


/* ---------------- Admin ---------------- */

let adminTab = "farmers";

async function renderAdmin() {
  shell("Admin Overview", "Platform-wide statistics and management");
  const content = document.getElementById("content");
  
  try {
    const stats = await api("/admin/stats");
    
    content.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card"><div class="label">Total Farmers</div><div class="value">${stats.totalFarmers}</div></div>
        <div class="stat-card"><div class="label">Total Buyers</div><div class="value">${stats.totalBuyers}</div></div>
        <div class="stat-card"><div class="label">Active Listings</div><div class="value">${stats.activeListings}</div></div>
        <div class="stat-card"><div class="label">Active Requirements</div><div class="value">${stats.activeRequirements}</div></div>
        <div class="stat-card"><div class="label">Total Orders</div><div class="value">${stats.totalOrders}</div></div>
      </div>
      
      <div class="card">
        <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
          ${["farmers","buyers","listings","requirements","offers","orders"].map(t=>`<button class="btn btn-sm ${adminTab===t?"btn-primary":"btn-outline"}" data-tab="${t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join("")}
        </div>
        
        <div id="tableArea"><p>Loading…</p></div>
      </div>`;
      
    content.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { 
      adminTab = b.dataset.tab; 
      renderAdmin(); 
    });
    
    await loadAdminTable();
    
  } catch(err){ 
    content.innerHTML = `<p>${esc(err.message)}</p>`; 
  }
}

async function loadAdminTable() {
  const area = document.getElementById("tableArea"); 
  
  if (!area) return;
  
  area.innerHTML = "<p>Loading…</p>";
  
  try {
    let rows=[], cols=[];
    
    if (adminTab==="farmers") { 
      const {farmers}=await api("/admin/farmers"); 
      cols=["Name","Email","Phone","Location"]; 
      rows=farmers.map(f=>[f.name,f.email,f.phone,f.location]); 
    }
    
    else if (adminTab==="buyers") { 
      const {buyers}=await api("/admin/buyers"); 
      cols=["Name","Business","Email","Location"]; 
      rows=buyers.map(b=>[b.name,b.businessName,b.email,b.location]); 
    }
    
    else if (adminTab==="listings") { 
      const {listings}=await api("/admin/listings"); 
      cols=["Crop","Quantity","Price","Quality","Location","Status"]; 
      rows=listings.map(l=>[l.crop,`${l.quantity} ${l.unit}`,money(l.price),l.quality,l.location,l.status]); 
    }
    
    else if (adminTab==="requirements") { 
      const {requirements}=await api("/admin/requirements"); 
      cols=["Crop","Quantity","Target Price","Quality","Location","Status"]; 
      rows=requirements.map(r=>[r.crop,`${r.quantity} ${r.unit}`,money(r.targetPrice),r.quality,r.preferredLocation,r.status]); 
    }
    
    else if (adminTab==="offers") { 
      const {offers}=await api("/admin/offers"); 
      cols=["Crop","Quantity","Price","Status","Date"]; 
      rows=offers.map(o=>[o.crop,o.quantity,money(o.price),o.status,fdate(o.createdAt)]); 
    }
    
    else if (adminTab==="orders") { 
      const {orders}=await api("/admin/orders"); 
      cols=["Order ID","Crop","Quantity","Agreed Price","Order Status","Payment"]; 
      rows=orders.map(o=>[o.id,o.crop,o.quantity,money(o.agreedPrice),o.orderStatus,o.paymentStatus]); 
    }
    
    if (!rows.length) { 
      area.innerHTML = `<div class="empty-state">No data yet.</div>`; 
      return; 
    }
    
    area.innerHTML = `<table><thead><tr>${cols.map(c=>`<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(v=>`<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    
  } catch(err){ 
    area.innerHTML = `<p>${esc(err.message)}</p>`; 
  }
}

render();
```
