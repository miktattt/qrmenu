import { useState, useRef, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// STORE — window.__store (in-memory, persistent in session)
// ═══════════════════════════════════════════════════════════════════════════════
const FOOD_IMAGES = {
  i1: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80",
  i2: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80",
  i3: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80",
  i4: "https://images.unsplash.com/photo-1529042410759-befb1204b468?w=400&q=80",
  i5: "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400&q=80",
  i6: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80",
  i7: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&q=80",
  i8: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&q=80",
  i9: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&q=80",
  i10: "https://images.unsplash.com/photo-1581006852262-e4307cf6283a?w=400&q=80",
  i11: "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400&q=80",
  i12: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&q=80",
  i13: "https://images.unsplash.com/photo-1519676867240-f03562e64548?w=400&q=80",
};

const INITIAL_STORE = {
  restaurant: { name: "Lezzet Ocağı", tagline: "Geleneksel Türk Mutfağı", logo: "🍴" },
  businessInfo: {
    phone: "0212 000 00 00",
    address: "Atatürk Cad. No:12, İstanbul",
    openTime: "09:00",
    closeTime: "23:00",
    workDays: "Her gün",
    instagram: "",
    googleMaps: "",
  },
  categories: [
    {
      id: "c1", name: "Başlangıçlar", icon: "🥗",
      items: [
        { id: "i1", name: "Mercimek Çorbası", price: 85, desc: "Ev yapımı kırmızı mercimek, limon ile servis", avail: true },
        { id: "i2", name: "Sigara Böreği", price: 95, desc: "Çıtır yufka, beyaz peynir, taze maydanoz", avail: true },
        { id: "i3", name: "Çoban Salatası", price: 75, desc: "Domates, salatalık, biber, zeytinyağı", avail: true },
      ]
    },
    {
      id: "c2", name: "Ana Yemekler", icon: "🍽️",
      items: [
        { id: "i4", name: "Izgara Köfte", price: 220, desc: "Dana kıyma köfte, közlenmiş biber ve domates ile", avail: true },
        { id: "i5", name: "Tavuk Şiş", price: 195, desc: "Marine edilmiş tavuk, pilav, ayran dahil", avail: true },
        { id: "i6", name: "Karışık Izgara", price: 380, desc: "Köfte, tavuk, kanat, kuzu şiş karışımı", avail: true },
        { id: "i7", name: "Lahmacun (3 Adet)", price: 120, desc: "İnce hamur, kıymalı, maydanoz, limon", avail: true },
      ]
    },
    {
      id: "c3", name: "İçecekler", icon: "🥤",
      items: [
        { id: "i8", name: "Ayran", price: 30, desc: "Taze yayık ayranı, soğuk servis", avail: true },
        { id: "i9", name: "Türk Çayı", price: 20, desc: "Demli çay, şeker ayrı servis edilir", avail: true },
        { id: "i10", name: "Kola / Fanta / Sprite", price: 50, desc: "330ml kutu içecek, buz ile", avail: true },
        { id: "i11", name: "Limonata", price: 65, desc: "Taze sıkılmış, nane ve buz ile", avail: true },
      ]
    },
    {
      id: "c4", name: "Tatlılar", icon: "🍮",
      items: [
        { id: "i12", name: "Sütlaç", price: 85, desc: "Fırın sütlaç, tarçın ile servis edilir", avail: true },
        { id: "i13", name: "Baklava (3 Dilim)", price: 120, desc: "Antep fıstıklı, tereyağlı baklava", avail: true },
      ]
    }
  ],
  activeOrders: {},    // tableId → [order]
  completedOrders: [], // [order]
  reservations: [],    // [reservation]
  reservationSettings: {
    openTime: "09:00",
    closeTime: "23:00",
    slotMinutes: 60,     // her slot kaç dakika
    maxPerSlot: 4,       // aynı slotta max rezervasyon sayısı
    maxGuests: 10,       // tek rezervasyonda max kişi
  },
};

const LS_KEY = "qrmenu_store_v1";
const SB_LS_KEY = "qrmenu_supabase_cfg";

// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE KATMANI
// ═══════════════════════════════════════════════════════════════════════════════
function getSbCfg() {
  try { return JSON.parse(localStorage.getItem(SB_LS_KEY) || "{}"); } catch(e) { return {}; }
}
function saveSbCfg(cfg) {
  localStorage.setItem(SB_LS_KEY, JSON.stringify(cfg));
}

// Supabase client — sadece cfg varsa başlatılır
let _sb = null;
function getSb() {
  if (_sb) return _sb;
  const cfg = getSbCfg();
  
  // ✅ Sabit fallback — müşteri telefonunda da çalışır
  const url = cfg.url || "https://suurktfnjvdlctswdfvl.supabase.co";
  const key = cfg.key || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1dXJrdGZuanZkbGN0c3dkZnZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NzMyMDEsImV4cCI6MjA4OTA0OTIwMX0.StUbpyIAMHaEUAxqdOjKq1DGs0hPSKRZNJPBHuPglko";
  
  if (!url || !key) return null;
  if (!window.supabase) return null;
  try {
    _sb = window.supabase.createClient(url, key);
    return _sb;
  } catch(e) { return null; }
}
function resetSb() { _sb = null; }

// Supabase yükleme (CDN)
function loadSupabaseSdk(cb) {
  if (window.supabase) { cb(); return; }
  const s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
  s.onload = cb;
  s.onerror = () => console.warn("Supabase SDK yüklenemedi, localStorage modu");
  document.head.appendChild(s);
}

// ── Supabase okuma/yazma yardımcıları ──
async function sbGet(table) {
  const sb = getSb();
  if (!sb) return null;
  try {
    const { data, error } = await sb.from(table).select("*");
    if (error) throw error;
    return data;
  } catch(e) { console.warn("SB okuma hatası:", e.message); return null; }
}

async function sbUpsert(table, row) {
  const sb = getSb();
  if (!sb) return false;
  try {
    const { error } = await sb.from(table).upsert(row, { onConflict: "id" });
    if (error) throw error;
    return true;
  } catch(e) { console.warn("SB yazma hatası:", e.message); return false; }
}

async function sbDelete(table, id) {
  const sb = getSb();
  if (!sb) return false;
  try {
    const { error } = await sb.from(table).delete().eq("id", id);
    if (error) throw error;
    return true;
  } catch(e) { console.warn("SB silme hatası:", e.message); return false; }
}

// ── Supabase → store senkronizasyonu ──
async function syncFromSupabase() {
  const sb = getSb();
  if (!sb) return false;
  try {
    const [settingsRows, categoriesRows, ordersRows, reservationsRows] = await Promise.all([
      sbGet("settings"),
      sbGet("categories"),
      sbGet("orders"),
      sbGet("reservations"),
    ]);
    if (!settingsRows) return false;

    const s = JSON.parse(JSON.stringify(INITIAL_STORE));

    // Settings
    const sRow = settingsRows[0];
    if (sRow) {
      s.restaurant = sRow.restaurant || s.restaurant;
      s.businessInfo = sRow.business_info || s.businessInfo;
      s.reservationSettings = sRow.reservation_settings || s.reservationSettings;
      s.adminPassword = sRow.admin_password || s.adminPassword;
    }

    // Categories
    if (categoriesRows && categoriesRows.length > 0) {
      s.categories = categoriesRows
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map(c => ({
          id: c.id, name: c.name, icon: c.icon,
          items: (c.items || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
        }));
    }

    // Orders
    s.activeOrders = {};
    s.completedOrders = [];
    s.cancelledOrders = [];
    if (ordersRows) {
      ordersRows.forEach(o => {
        const order = { id: o.id, tableId: o.table_id, items: o.items || [], note: o.note, total: o.total, time: o.time, date: o.date, timestamp: o.timestamp, status: o.status };
        if (o.status === "tamamlandı") {
          s.completedOrders.push(order);
        } else if (o.status === "iptal") {
          s.cancelledOrders = s.cancelledOrders || [];
          s.cancelledOrders.push(order);
        } else {
          if (!s.activeOrders[o.table_id]) s.activeOrders[o.table_id] = [];
          s.activeOrders[o.table_id].push(order);
        }
      });
    }

    // Reservations
    if (reservationsRows) {
      s.reservations = reservationsRows.map(r => ({
        id: r.id, code: r.code, date: r.date, time: r.time,
        guests: r.guests, name: r.name, phone: r.phone,
        note: r.note, status: r.status, createdAt: r.created_at,
      }));
    }

    window.__store = s;
    try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch(e) {}
    notifyStoreUpdate();
    return true;
  } catch(e) {
    console.warn("Supabase sync hatası:", e.message);
    return false;
  }
}

async function pushSettingsToSb(store) {
  return sbUpsert("settings", {
    id: 1,
    restaurant: store.restaurant,
    business_info: store.businessInfo,
    reservation_settings: store.reservationSettings,
    admin_password: store.adminPassword || "1234",
  });
}

async function pushCategoriesToSb(categories) {
  const sb = getSb();
  if (!sb) return false;
  try {
    await sb.from("categories").delete().neq("id", "___never___");
    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      await sbUpsert("categories", {
        id: cat.id, name: cat.name, icon: cat.icon,
        items: cat.items, sort_order: i,
      });
    }
    return true;
  } catch(e) { return false; }
}

async function pushOrderToSb(order) {
  return sbUpsert("orders", {
    id: order.id, table_id: order.tableId,
    items: order.items, note: order.note || "",
    total: order.total, time: order.time,
    date: order.date, timestamp: order.timestamp,
    status: order.status,
  });
}

async function pushReservationToSb(res) {
  return sbUpsert("reservations", {
    id: res.id, code: res.code, date: res.date,
    time: res.time, guests: res.guests, name: res.name,
    phone: res.phone, note: res.note || "",
    status: res.status, created_at: res.createdAt,
  });
}

function subscribeToOrders(onNew) {
  const sb = getSb();
  if (!sb) return null;
  return sb.channel("orders_realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, onNew)
    .subscribe();
}

function unsubscribe(channel) {
  const sb = getSb();
  if (sb && channel) sb.removeChannel(channel);
}

function getSbStatus() {
  const cfg = getSbCfg();
  if (!cfg.url || !cfg.key) return "unconfigured";
  if (!window.supabase) return "sdk_missing";
  if (!_sb) return "not_connected";
  return "connected";
}

function gs() {
  if (!window.__store) {
    try {
      const saved = localStorage.getItem(LS_KEY);
      window.__store = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(INITIAL_STORE));
      // Eksik alanları tamamla (eski kayıtlarda yoksa)
      if (!window.__store.businessInfo) window.__store.businessInfo = JSON.parse(JSON.stringify(INITIAL_STORE.businessInfo));
      if (!window.__store.reservations) window.__store.reservations = [];
      if (!window.__store.reservationSettings) window.__store.reservationSettings = JSON.parse(JSON.stringify(INITIAL_STORE.reservationSettings));
    } catch(e) {
      window.__store = JSON.parse(JSON.stringify(INITIAL_STORE));
    }
  }
  return window.__store;
}
function ss(s) {
  window.__store = s;
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch(e) {}
}
// Global store event — tüm useStore hook'larını tetikler
const _storeListeners = new Set();
function notifyStoreUpdate() {
  _storeListeners.forEach(fn => fn());
}

function useStore() {
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => {
    setTick(t => t + 1);
    notifyStoreUpdate();
  }, []);
  useEffect(() => {
    const listener = () => setTick(t => t + 1);
    _storeListeners.add(listener);
    return () => _storeListeners.delete(listener);
  }, []);
  return { store: gs(), refresh };
}

// ═══════════════════════════════════════════════════════════════════════════════
// QR CANVAS — gerçek QR kodu (qrcode CDN)
// ═══════════════════════════════════════════════════════════════════════════════
function QRCanvas({ url, size = 120 }) {
  const ref = useRef();
  useEffect(() => {
    if (!ref.current || !url) return;
    ref.current.innerHTML = "";
    const script = document.querySelector("script[data-qr]");
    const render = () => {
      try {
        new window.QRCode(ref.current, {
          text: url,
          width: size,
          height: size,
          colorDark: "#111111",
          colorLight: "#ffffff",
          correctLevel: window.QRCode.CorrectLevel.M,
        });
      } catch(e) { ref.current.innerHTML = "<div style=font-size:10px;color:#aaa>QR yüklenemedi</div>"; }
    };
    if (window.QRCode) { render(); }
    else {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
      s.setAttribute("data-qr", "1");
      s.onload = render;
      document.head.appendChild(s);
    }
  }, [url, size]);
  return <div ref={ref} style={{ display: "inline-block", lineHeight: 0 }} />;
}

// URL yardımcısı
function masaUrl(tableId) {
  const base = window.location.origin + window.location.pathname;
  return base + "?masa=" + tableId;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const urlMasa = new URLSearchParams(window.location.search).get("masa");
  const [page, setPage] = useState(urlMasa ? "menu" : "home");
  const [tableId, setTableId] = useState(urlMasa || null);
  const [viewOnly, setViewOnly] = useState(false);
  const [adminAuth, setAdminAuth] = useState(false);
  const realtimeChannel = useRef(null);

  // Supabase SDK yükle ve ilk sync yap
  useEffect(() => {
    loadSupabaseSdk(async () => {
      await syncFromSupabase(); // notifyStoreUpdate içinde çağrılıyor
    });
  }, []);

  // Admin girince realtime abone ol
  useEffect(() => {
    if (!adminAuth) {
      if (realtimeChannel.current) { unsubscribe(realtimeChannel.current); realtimeChannel.current = null; }
      return;
    }
    realtimeChannel.current = subscribeToOrders(async () => {
      await syncFromSupabase(); // notifyStoreUpdate otomatik tetikler
    });
    return () => { if (realtimeChannel.current) { unsubscribe(realtimeChannel.current); realtimeChannel.current = null; } };
  }, [adminAuth]);

  if (page === "menu" && tableId) return <MenuPage tableId={tableId} viewOnly={viewOnly} onBack={() => { setPage("home"); setViewOnly(false); }} />;
  if (page === "admin") {
    if (!adminAuth) return <AdminLogin onSuccess={() => setAdminAuth(true)} onBack={() => setPage("home")} />;
    return <AdminPanel onBack={() => { setAdminAuth(false); setPage("home"); }} />;
  }
  if (page === "rezervasyon") return <ReservationPage onBack={() => setPage("home")} />;

  return <HomePage
    onMenu={t => { setTableId(t); setViewOnly(false); setPage("menu"); }}
    onMenuView={() => { setTableId("vitrin"); setViewOnly(true); setPage("menu"); }}
    onAdmin={() => setPage("admin")}
    onRezervasyon={() => setPage("rezervasyon")}
  />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN LOGIN
// ═══════════════════════════════════════════════════════════════════════════════
function AdminLogin({ onSuccess, onBack }) {
  const store = gs();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const [show, setShow] = useState(false);
  const [shake, setShake] = useState(false);

  // Varsayılan şifre: admin ayarlardan değiştirilebilir
  const savedPw = store.adminPassword || "1234";

  const attempt = () => {
    if (pw === savedPw) {
      setErr(false);
      onSuccess();
    } else {
      setErr(true);
      setShake(true);
      setPw("");
      setTimeout(() => setShake(false), 600);
    }
  };

  const onKey = e => { if (e.key === "Enter") attempt(); };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#0f0700 0%,#1c0e00 60%,#0f0700 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Lato',Georgia,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Lato:wght@300;400;700&display=swap');
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .login-box { animation: fadeUp .4s both; }
        .shaking { animation: shake 0.5s ease; }
      `}</style>

      <div className="login-box" style={{ width: "100%", maxWidth: 340 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>{store.restaurant.logo}</div>
          <h1 style={{ color: "#e8a020", fontFamily: "'Playfair Display',serif", fontSize: 24, margin: "0 0 4px" }}>{store.restaurant.name}</h1>
          <p style={{ color: "#a0724a", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", margin: 0 }}>Admin Girişi</p>
        </div>

        {/* Kart */}
        <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(232,160,32,0.2)", borderRadius: 20, padding: 28 }}>
          <label style={{ display: "block", color: "#a07850", fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>Şifre</label>

          <div className={shake ? "shaking" : ""} style={{ position: "relative", marginBottom: 8 }}>
            <input
              type={show ? "text" : "password"}
              value={pw}
              onChange={e => { setPw(e.target.value); setErr(false); }}
              onKeyDown={onKey}
              autoFocus
              placeholder="••••"
              style={{
                width: "100%", boxSizing: "border-box",
                background: err ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.07)",
                border: err ? "1.5px solid rgba(239,68,68,0.5)" : "1.5px solid rgba(232,160,32,0.3)",
                color: "#f0e0c0", borderRadius: 12, padding: "13px 44px 13px 14px",
                fontSize: 20, fontFamily: "monospace", letterSpacing: 4, outline: "none",
                transition: "border .2s, background .2s"
              }}
            />
            <button onClick={() => setShow(s => !s)}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#a07850", cursor: "pointer", fontSize: 16, padding: 0 }}>
              {show ? "🙈" : "👁"}
            </button>
          </div>

          {err && <div style={{ color: "#f87171", fontSize: 13, marginBottom: 12, textAlign: "center" }}>❌ Hatalı şifre, tekrar dene</div>}

          <button onClick={attempt}
            style={{ width: "100%", background: "#b83a0c", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Lato',sans-serif", marginTop: err ? 0 : 12, transition: "opacity .15s" }}>
            Giriş Yap →
          </button>
        </div>

        <button onClick={onBack}
          style={{ display: "block", margin: "18px auto 0", background: "none", border: "none", color: "#a07850", cursor: "pointer", fontSize: 13, fontFamily: "'Lato',sans-serif" }}>
          ← Ana Sayfaya Dön
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOME PAGE
// ═══════════════════════════════════════════════════════════════════════════════
function HomePage({ onMenu, onAdmin, onRezervasyon, onMenuView }) {
  const store = gs();
  const r = store.restaurant;
  const b = store.businessInfo || {};

  const now = new Date();
  const timeStr = now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const [oh, om] = (b.openTime || "09:00").split(":").map(Number);
  const [ch, cm] = (b.closeTime || "23:00").split(":").map(Number);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const isOpen = nowMins >= oh * 60 + om && nowMins < ch * 60 + cm;

  const phoneClean = (b.phone || "").replace(/[^0-9]/g, "");

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#0f0700 0%,#1c0e00 60%,#0f0700 100%)", fontFamily: "'Lato',Georgia,sans-serif", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Lato:wght@300;400;700&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
        .fade1{animation:fadeUp .5s .05s both}
        .fade2{animation:fadeUp .5s .18s both}
        .fade3{animation:fadeUp .5s .3s both}
        .fade4{animation:fadeUp .5s .42s both}
        .home-action:active{transform:scale(0.98)}
        .home-action:hover{filter:brightness(1.08)}
      `}</style>

      {/* ── Admin butonu sağ üst ── */}
      <button onClick={onAdmin}
        style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "#a0724a", borderRadius: 10, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontFamily: "'Lato',sans-serif", zIndex: 10, display: "flex", alignItems: "center", gap: 6 }}>
        ⚙️ <span style={{ fontSize: 12 }}>Giriş</span>
      </button>

      {/* ── Hero ── */}
      <div className="fade1" style={{ textAlign: "center", padding: "72px 24px 32px" }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>{r.logo}</div>
        <h1 style={{ color: "#e8a020", fontFamily: "'Playfair Display',Georgia,serif", fontSize: 32, margin: "0 0 6px", letterSpacing: -0.5 }}>{r.name}</h1>
        <p style={{ color: "#a0724a", fontSize: 12, margin: "0 0 16px", letterSpacing: 2.5, textTransform: "uppercase" }}>{r.tagline}</p>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: isOpen ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", border: `1px solid ${isOpen ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`, borderRadius: 20, padding: "5px 14px" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: isOpen ? "#22c55e" : "#ef4444", display: "inline-block", animation: isOpen ? "pulse 2s infinite" : "none" }} />
          <span style={{ color: isOpen ? "#86efac" : "#fca5a5", fontSize: 12, fontWeight: 600 }}>{isOpen ? "Açık" : "Kapalı"} · {timeStr}</span>
        </div>
      </div>

      {/* ── Ana aksiyonlar ── */}
      <div className="fade2" style={{ padding: "0 20px", maxWidth: 420, margin: "0 auto" }}>

        {/* Rezervasyon */}
        <button className="home-action" onClick={onRezervasyon}
          style={{ width: "100%", background: "linear-gradient(135deg,rgba(232,160,32,0.15),rgba(232,160,32,0.06))", border: "1.5px solid rgba(232,160,32,0.35)", borderRadius: 20, padding: "22px 20px", cursor: "pointer", textAlign: "left", fontFamily: "'Lato',sans-serif", marginBottom: 12, display: "flex", alignItems: "center", gap: 18, transition: "filter .15s" }}>
          <div style={{ fontSize: 36, flexShrink: 0 }}>📅</div>
          <div>
            <div style={{ color: "#e8a020", fontSize: 17, fontWeight: 700, marginBottom: 3 }}>Rezervasyon Yap</div>
            <div style={{ color: "#a07850", fontSize: 13, lineHeight: 1.4 }}>Masanızı önceden ayırtın, beklemeyin</div>
          </div>
          <div style={{ marginLeft: "auto", color: "#e8a020", fontSize: 20, flexShrink: 0 }}>›</div>
        </button>

        {/* Menüyü İncele — viewOnly mod */}
        <button className="home-action" onClick={onMenuView}
          style={{ width: "100%", background: "rgba(184,58,12,0.15)", border: "1.5px solid rgba(184,58,12,0.35)", borderRadius: 20, padding: "22px 20px", cursor: "pointer", textAlign: "left", fontFamily: "'Lato',sans-serif", marginBottom: 12, display: "flex", alignItems: "center", gap: 18, transition: "filter .15s" }}>
          <div style={{ fontSize: 36, flexShrink: 0 }}>🍽️</div>
          <div>
            <div style={{ color: "#f0a080", fontSize: 17, fontWeight: 700, marginBottom: 3 }}>Menüyü İncele</div>
            <div style={{ color: "#8a5535", fontSize: 13, lineHeight: 1.4 }}>Tüm yemek ve içeceklerimizi keşfedin</div>
          </div>
          <div style={{ marginLeft: "auto", color: "#f0a080", fontSize: 20, flexShrink: 0 }}>›</div>
        </button>

        {/* Alt küçük kartlar */}
        <div className="fade3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "16px 14px" }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>🕐</div>
            <div style={{ color: "#e8d5b0", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Çalışma Saatleri</div>
            <div style={{ color: "#7a5535", fontSize: 12, lineHeight: 1.6 }}>{b.workDays || "Her gün"}<br />{b.openTime || "09:00"} – {b.closeTime || "23:00"}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "16px 14px" }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>📍</div>
            <div style={{ color: "#e8d5b0", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Konum</div>
            <div style={{ color: "#7a5535", fontSize: 12, lineHeight: 1.6 }}>{b.address || "—"}</div>
          </div>
        </div>

        {/* İletişim */}
        <div className="fade4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>📞</span>
            <div>
              <div style={{ color: "#a07850", fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>Rezervasyon & Bilgi</div>
              <div style={{ color: "#e8d5b0", fontSize: 14, fontWeight: 600, marginTop: 2 }}>{b.phone || "—"}</div>
            </div>
          </div>
          {phoneClean && <a href={`tel:${phoneClean}`} style={{ background: "rgba(232,160,32,0.15)", border: "1px solid rgba(232,160,32,0.3)", color: "#e8a020", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Ara</a>}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MENU PAGE — müşteri görünümü (tableId URL param ile gelir, burada prop)
// ═══════════════════════════════════════════════════════════════════════════════
function MenuPage({ tableId, onBack, viewOnly = false }) {
  const { store, refresh } = useStore();
  const [activeCat, setActiveCat] = useState(store.categories[0]?.id);
  const [cart, setCart] = useState({});
  const [showCart, setShowCart] = useState(false);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);

  const allItems = store.categories.flatMap(c => c.items);
  const add = id => { if (viewOnly) return; setCart(p => ({ ...p, [id]: (p[id] || 0) + 1 })); };
  const rem = id => { if (viewOnly) return; setCart(p => { const n = { ...p }; n[id] > 1 ? n[id]-- : delete n[id]; return n; }); };
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = Object.entries(cart).reduce((s, [id, q]) => { const it = allItems.find(i => i.id === id); return s + (it ? it.price * q : 0); }, 0);

  const submit = async () => {
    if (!cartCount) return;
    const s = gs();
    const order = {
      id: Date.now(), tableId: Number(tableId),
      items: Object.entries(cart).map(([id, qty]) => ({ ...allItems.find(i => i.id === id), qty })),
      note, total: cartTotal,
      time: new Date().toLocaleTimeString("tr-TR"),
      date: new Date().toLocaleDateString("tr-TR"),
      timestamp: Date.now(),
      status: "beklemede"
    };
    if (!s.activeOrders[tableId]) {
      s.activeOrders[tableId] = [];
      s.tableOpenedAt = s.tableOpenedAt || {};
      s.tableOpenedAt[tableId] = Date.now();
    }
    s.activeOrders[tableId].push(order);
    ss(s); refresh();
    await pushOrderToSb(order);
    setDone(true);
  };

  if (done) return (
    <div style={{ minHeight: "100vh", background: "#fffbf5", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Lato',Georgia,sans-serif" }}>
      <div style={{ textAlign: "center", maxWidth: 320 }}>
        <div style={{ fontSize: 72, marginBottom: 12 }}>✅</div>
        <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 26, margin: "0 0 8px" }}>Sipariş Alındı!</h2>
        <p style={{ color: "#777", margin: "0 0 6px" }}>Masa <strong>{tableId}</strong> için iletildi.</p>
        <p style={{ color: "#b0b0b0", fontSize: 13 }}>Kısa süre içinde hazırlanacak.</p>
        <button onClick={() => { setCart({}); setNote(""); setShowCart(false); setDone(false); }} style={btnPrimary}>Yeni Sipariş</button>
        {onBack && <div><button onClick={onBack} style={{ marginTop: 10, background: "none", border: "none", color: "#bbb", cursor: "pointer", fontSize: 13 }}>← Geri</button></div>}
      </div>
    </div>
  );

  const cat = store.categories.find(c => c.id === activeCat);

  return (
    <div style={{ minHeight: "100vh", background: "#0f0700", fontFamily: "'Lato',Georgia,sans-serif", position: "relative" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Lato:wght@300;400;700&display=swap');`}</style>

      {/* HEADER */}
      <div style={{ background: "linear-gradient(180deg,#1c0e00,#0f0700)", padding: "20px 16px 0", position: "sticky", top: 0, zIndex: 50 }}>
        {onBack && <button onClick={onBack} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#e8a020", borderRadius: 8, padding: "5px 11px", cursor: "pointer", fontSize: 13, marginBottom: 10 }}>←</button>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ color: "#e8a020", fontFamily: "'Playfair Display',Georgia,serif", fontSize: 22, fontWeight: 700 }}>{store.restaurant.logo} {store.restaurant.name}</div>
            <div style={{ color: "#7a5535", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 2 }}>{store.restaurant.tagline}</div>
          </div>
          {!viewOnly && (
            <button onClick={() => setShowCart(true)}
              style={{ position: "relative", background: cartCount ? "#b83a0c" : "rgba(255,255,255,0.08)", border: "none", color: "#fff", borderRadius: 14, padding: "12px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, transition: "all .2s", minWidth: 90, justifyContent: "center" }}>
              {cartCount > 0 && <span style={{ position: "absolute", top: -6, right: -6, background: "#e8a020", color: "#1c0e00", borderRadius: "50%", width: 20, height: 20, fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>{cartCount}</span>}
              🛒 Listem
            </button>
          )}
        </div>
        {viewOnly
          ? <div style={{ background: "rgba(232,160,32,0.1)", border: "1px solid rgba(232,160,32,0.25)", borderRadius: 10, padding: "7px 12px", fontSize: 12, color: "#c8a060", marginBottom: 10, display: "inline-block" }}>👁 Vitrin görünümü — sipariş için masanızdaki QR kodu okutun</div>
          : <div style={{ color: "rgba(232,160,32,0.6)", fontSize: 12, marginBottom: 10 }}>📍 Masa {tableId}</div>
        }

        {/* Category tabs */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12, scrollbarWidth: "none" }}>
          {store.categories.map(c => (
            <button key={c.id} onClick={() => setActiveCat(c.id)}
              style={{ whiteSpace: "nowrap", padding: "7px 14px", borderRadius: 20, border: "1.5px solid", borderColor: activeCat === c.id ? "#e8a020" : "rgba(255,255,255,0.1)", background: activeCat === c.id ? "#e8a020" : "transparent", color: activeCat === c.id ? "#0f0700" : "#a08060", fontSize: 13, fontWeight: activeCat === c.id ? 700 : 400, cursor: "pointer", flexShrink: 0 }}>
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* ITEMS GRID */}
      <div style={{ padding: "16px 14px 100px", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14 }}>
        {cat?.items.filter(i => i.avail).map(item => (
          <MenuItemCard key={item.id} item={item} qty={cart[item.id] || 0} onAdd={() => add(item.id)} onRem={() => rem(item.id)} viewOnly={viewOnly} />
        ))}
      </div>

      {/* CART DRAWER */}
      {showCart && !viewOnly && (
        <CartDrawer
          cart={cart} allItems={allItems} total={cartTotal} count={cartCount}
          note={note} setNote={setNote}
          onAdd={add} onRem={rem}
          onClose={() => setShowCart(false)}
          onSubmit={submit}
          tableId={tableId}
        />
      )}
    </div>
  );
}

function MenuItemCard({ item, qty, onAdd, onRem, viewOnly = false }) {
  const img = FOOD_IMAGES[item.id] || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80";
  return (
    <div style={{ background: "#1c0e00", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(232,160,32,0.12)", transition: "transform .15s, box-shadow .15s" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
      <div style={{ height: 130, overflow: "hidden", position: "relative" }}>
        <img src={img} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={e => { e.target.style.display = "none"; e.target.parentNode.style.background = "#2d1a00"; }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 50%, #1c0e00 100%)" }} />
      </div>
      <div style={{ padding: "10px 12px 12px" }}>
        <div style={{ color: "#f0e0c0", fontWeight: 700, fontSize: 14, marginBottom: 3, lineHeight: 1.3 }}>{item.name}</div>
        <div style={{ color: "#7a5535", fontSize: 11, marginBottom: 8, lineHeight: 1.4 }}>{item.desc}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#e8a020", fontWeight: 700, fontSize: 15 }}>{item.price} ₺</span>
          {!viewOnly && (qty === 0 ? (
            <button onClick={onAdd} style={{ background: "#b83a0c", border: "none", color: "#fff", borderRadius: 8, width: 30, height: 30, fontSize: 18, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button onClick={onRem} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", borderRadius: 6, width: 26, height: 26, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>−</button>
              <span style={{ color: "#e8a020", fontWeight: 700, fontSize: 14, minWidth: 18, textAlign: "center" }}>{qty}</span>
              <button onClick={onAdd} style={{ background: "#b83a0c", border: "none", color: "#fff", borderRadius: 6, width: 26, height: 26, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>+</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CartDrawer({ cart, allItems, total, count, note, setNote, onAdd, onRem, onClose, onSubmit, tableId }) {
  const cartItems = Object.entries(cart).map(([id, qty]) => ({ item: allItems.find(i => i.id === id), qty })).filter(x => x.item);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#1c0e00", borderRadius: "20px 20px 0 0", padding: "20px 16px", maxHeight: "85vh", overflowY: "auto", border: "1px solid rgba(232,160,32,0.15)", borderBottom: "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, color: "#e8a020", fontFamily: "'Playfair Display',Georgia,serif", fontSize: 20 }}>🛒 Listem</h2>
          <div>
            <span style={{ background: "rgba(232,160,32,0.15)", color: "#e8a020", borderRadius: 20, padding: "4px 14px", fontSize: 13 }}>Masa {tableId}</span>
            <button onClick={onClose} style={{ marginLeft: 10, background: "rgba(255,255,255,0.08)", border: "none", color: "#aaa", borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}>✕</button>
          </div>
        </div>

        {cartItems.length === 0 ? (
          <div style={{ color: "#555", textAlign: "center", padding: "30px 0" }}>Henüz ürün eklenmedi</div>
        ) : cartItems.map(({ item, qty }) => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <img src={FOOD_IMAGES[item.id] || ""} alt="" style={{ width: 52, height: 52, borderRadius: 10, objectFit: "cover", flexShrink: 0, background: "#2d1a00" }} onError={e => e.target.style.display = "none"} />
            <div style={{ flex: 1 }}>
              <div style={{ color: "#f0e0c0", fontWeight: 600, fontSize: 14 }}>{item.name}</div>
              <div style={{ color: "#e8a020", fontSize: 13, marginTop: 2 }}>{item.price * qty} ₺</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => onRem(item.id)} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#ccc", borderRadius: 6, width: 28, height: 28, fontSize: 16, cursor: "pointer" }}>−</button>
              <span style={{ color: "#e8a020", fontWeight: 700, width: 22, textAlign: "center" }}>{qty}</span>
              <button onClick={() => onAdd(item.id)} style={{ background: "#b83a0c", border: "none", color: "#fff", borderRadius: 6, width: 28, height: 28, fontSize: 16, cursor: "pointer" }}>+</button>
            </div>
          </div>
        ))}

        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Sipariş notu (alerji, özel istek...)"
          style={{ width: "100%", marginTop: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#d0c0a0", borderRadius: 10, padding: "10px 12px", fontSize: 13, resize: "none", fontFamily: "inherit", boxSizing: "border-box" }} rows={2} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "14px 0 12px" }}>
          <span style={{ color: "#a0724a", fontSize: 14 }}>Toplam</span>
          <span style={{ color: "#e8a020", fontSize: 22, fontWeight: 700 }}>{total} ₺</span>
        </div>
        <button onClick={onSubmit} disabled={!count}
          style={{ width: "100%", background: count ? "#b83a0c" : "#333", color: "#fff", border: "none", borderRadius: 14, padding: "16px", fontSize: 16, fontWeight: 700, cursor: count ? "pointer" : "default", fontFamily: "'Lato',sans-serif" }}>
          🚀 Siparişi Gönder
        </button>
      </div>
    </div>
  );
}

const btnPrimary = { marginTop: 20, background: "#b83a0c", color: "#fff", border: "none", borderRadius: 12, padding: "13px 30px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Lato',sans-serif" };

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Notification Hook ─────────────────────────────────────────────────────────
function useOrderNotifications(store, refresh) {
  const knownOrderIds = useRef(new Set());
  const [toast, setToast] = useState(null); // { tableId, itemCount, id }
  const [soundEnabled, setSoundEnabled] = useState(true);
  const toastTimer = useRef(null);

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const times = [0, 0.18, 0.36];
      times.forEach(t => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = t === 0 ? 880 : t === 0.18 ? 1100 : 880;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.4, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.15);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.15);
      });
    } catch(e) {}
  };

  useEffect(() => {
    const allOrders = Object.values(store.activeOrders).flat();
    const newOrders = allOrders.filter(o => !knownOrderIds.current.has(o.id));
    if (newOrders.length > 0) {
      newOrders.forEach(o => knownOrderIds.current.add(o.id));
      const latest = newOrders[newOrders.length - 1];
      if (soundEnabled) playBeep();
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToast({ tableId: latest.tableId, itemCount: latest.items?.length || 0, count: newOrders.length, uid: Date.now() });
      toastTimer.current = setTimeout(() => setToast(null), 5000);
    }
    // Also seed known ids on first render
    if (knownOrderIds.current.size === 0 && allOrders.length > 0) {
      allOrders.forEach(o => knownOrderIds.current.add(o.id));
    }
  }, [store.activeOrders]);

  return { toast, soundEnabled, setSoundEnabled, dismissToast: () => setToast(null) };
}

// ADMIN PANEL
// ═══════════════════════════════════════════════════════════════════════════════
function AdminPanel({ onBack }) {
  const [tab, setTab] = useState("orders");
  const { store, refresh } = useStore();
  const { toast, soundEnabled, setSoundEnabled, dismissToast } = useOrderNotifications(store, refresh);

  // Sadece "teslim edildi" olmayan siparişler sayılır
  const pendingCount = Object.values(store.activeOrders).flat()
    .filter(o => o.status !== "teslim edildi").length;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", fontFamily: "'Lato',Georgia,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Lato:wght@300;400;700&display=swap');
        @keyframes toastIn { from { transform: translateY(-80px) scale(0.95); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes toastOut { from { opacity: 1; } to { opacity: 0; transform: translateY(-20px); } }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(184,58,12,0.5); } 50% { box-shadow: 0 0 0 10px rgba(184,58,12,0); } }
      `}</style>

      {/* ── TOAST NOTIFICATION ── */}
      {toast && (
        <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 1000, animation: "toastIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards", minWidth: 280, maxWidth: 360 }}>
          <div style={{ background: "linear-gradient(135deg,#1c0e00,#3d1a00)", borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(232,160,32,0.3)", animation: "pulse 1s ease 0.3s 2" }}>
            <div style={{ fontSize: 32, flexShrink: 0 }}>🔔</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#e8a020", fontWeight: 700, fontSize: 15, fontFamily: "'Playfair Display',serif" }}>
                Yeni Sipariş!
              </div>
              <div style={{ color: "#d4966a", fontSize: 13, marginTop: 2 }}>
                Masa <strong style={{ color: "#fff" }}>{toast.tableId}</strong> — {toast.itemCount} çeşit ürün
              </div>
            </div>
            <button onClick={dismissToast} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#aaa", borderRadius: 8, width: 28, height: 28, cursor: "pointer", fontSize: 14, flexShrink: 0 }}>✕</button>
          </div>
        </div>
      )}

      <div style={{ background: "linear-gradient(90deg,#1c0e00,#2d1200)", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#e8a020", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>← Çıkış</button>
        <h1 style={{ flex: 1, margin: 0, color: "#e8a020", fontFamily: "'Playfair Display',serif", fontSize: 20 }}>Admin Panel</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Ses toggle */}
          <button onClick={() => setSoundEnabled(p => !p)}
            title={soundEnabled ? "Sesi kapat" : "Sesi aç"}
            style={{ background: soundEnabled ? "rgba(232,160,32,0.2)" : "rgba(255,255,255,0.07)", border: soundEnabled ? "1px solid rgba(232,160,32,0.4)" : "1px solid rgba(255,255,255,0.1)", color: soundEnabled ? "#e8a020" : "#666", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 16 }}>
            {soundEnabled ? "🔔" : "🔕"}
          </button>
          {pendingCount > 0 && <span style={{ background: "#b83a0c", color: "#fff", borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>bekleyen {pendingCount} sipariş</span>}
        </div>
      </div>

      <div style={{ display: "flex", background: "#fff", borderBottom: "2px solid #e8e0d5", overflowX: "auto" }}>
        {[
          { id: "map",          label: "🗺️ Masa Haritası" },
          { id: "orders",       label: `Siparişler${pendingCount ? ` 🔴${pendingCount}` : ""}` },
          { id: "rezervasyonlar", label: "📅 Rezervasyonlar" },
          { id: "completed",    label: "Tamamlananlar 📊" },
          { id: "cancelled",    label: "İptal 🚫" },
          { id: "menu",         label: "Menü ✏️" },
          { id: "qr",           label: "📲 QR Kodlar" },
          { id: "ayarlar",      label: "⚙️ Ayarlar" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: "1 0 auto", padding: "13px 10px", border: "none", borderBottom: tab === t.id ? "3px solid #b83a0c" : "3px solid transparent", background: "none", color: tab === t.id ? "#b83a0c" : "#888", fontWeight: tab === t.id ? 700 : 400, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 16, maxWidth: 700, margin: "0 auto" }}>
        {tab === "map"            && <TableMapTab refresh={refresh} onGoOrders={(tid) => { setTab("orders"); if (tid) setTimeout(() => { const el = document.getElementById(`table-card-${tid}`); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 100); }} />}
        {tab === "orders"         && <ActiveOrdersTab refresh={refresh} />}
        {tab === "rezervasyonlar" && <AdminReservationTab refresh={refresh} />}
        {tab === "completed"      && <CompletedTab refresh={refresh} />}
        {tab === "cancelled"      && <CancelledTab refresh={refresh} />}
        {tab === "menu"           && <MenuEditorTab refresh={refresh} />}
        {tab === "qr"             && <QRTab onSimulate={(t) => { setTab("orders"); }} />}
        {tab === "ayarlar"        && <SettingsTab refresh={refresh} />}
      </div>
    </div>
  );
}

// Masa haritasındaki küçük timer
function MapTimer({ tid, textColor }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const openedAt = gs().tableOpenedAt?.[tid];
    if (!openedAt) return;
    setElapsed(Math.floor((Date.now() - openedAt) / 1000));
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - openedAt) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [tid]);
  if (!elapsed) return null;
  const m = Math.floor(elapsed / 60), s = elapsed % 60;
  const h = Math.floor(elapsed / 3600);
  const pad = n => String(n).padStart(2, "0");
  return <div style={{ fontSize: 10, color: textColor, marginTop: 2, fontFamily: "monospace" }}>⏱ {h > 0 ? `${h}:${pad(m % 60)}:${pad(s)}` : `${pad(m)}:${pad(s)}`}</div>;
}

// ─── Table Map Tab ─────────────────────────────────────────────────────────────
function TableMapTab({ refresh, onGoOrders }) {
  const [selectedTable, setSelectedTable] = useState(null);
  const [hoveredTable, setHoveredTable] = useState(null);
  const store = gs();

  const getTableState = (t) => {
    const orders = store.activeOrders[t] || [];
    if (orders.length === 0) return "empty";
    const statuses = orders.map(o => o.status);
    if (statuses.every(s => s === "teslim edildi")) return "delivered";
    if (statuses.some(s => s === "beklemede")) return "waiting";
    if (statuses.some(s => s === "hazırlanıyor")) return "preparing";
    return "active";
  };

  const TABLE_STYLES = {
    empty:     { bg: "#f5f0ea", border: "#e5d5c5", label: "Boş",          dot: "#ccc",    text: "#aaa",    icon: "🪑" },
    waiting:   { bg: "#fef3c7", border: "#f59e0b", label: "Beklemede",     dot: "#f59e0b", text: "#92400e", icon: "🔴" },
    preparing: { bg: "#dbeafe", border: "#3b82f6", label: "Hazırlanıyor",  dot: "#3b82f6", text: "#1e40af", icon: "👨‍🍳" },
    delivered: { bg: "#d1fae5", border: "#10b981", label: "Teslim Edildi", dot: "#10b981", text: "#065f46", icon: "✅" },
  };

  const counts = { empty: 0, waiting: 0, preparing: 0, delivered: 0 };
  Array.from({ length: 20 }, (_, i) => i + 1).forEach(t => counts[getTableState(t)]++);

  const selectedOrders = selectedTable ? (store.activeOrders[selectedTable] || []) : [];
  const selectedTotal = selectedOrders.reduce((s, o) => s + o.total, 0);

  const closeSelectedTable = (tid) => {
    const orders = store.activeOrders[tid] || [];
    const allDelivered = orders.length > 0 && orders.every(o => o.status === "teslim edildi");
    const s = gs();
    if (allDelivered) {
      s.completedOrders = s.completedOrders || [];
      const allItems = {};
      let grandTotal = 0;
      orders.forEach(o => {
        o.items.forEach(item => {
          if (!allItems[item.id]) allItems[item.id] = { ...item, qty: 0 };
          allItems[item.id].qty += item.qty;
        });
        grandTotal += o.total;
      });
      s.completedOrders.push({ id: Date.now(), tableId: Number(tid), items: Object.values(allItems), total: grandTotal, time: orders[0]?.time || "", date: orders[0]?.date || new Date().toLocaleDateString("tr-TR"), completedAt: new Date().toLocaleString("tr-TR"), completedTimestamp: Date.now(), orderCount: orders.length });
    } else {
      s.cancelledOrders = s.cancelledOrders || [];
      orders.forEach(o => s.cancelledOrders.push({ ...o, cancelledAt: new Date().toLocaleString("tr-TR"), cancelledTimestamp: Date.now(), tableId: Number(tid) }));
    }
    delete s.activeOrders[tid];
    ss(s); refresh(); setSelectedTable(null);
  };

  const totalRevenue = Object.values(store.activeOrders).flat().reduce((s, o) => s + o.total, 0);
  const activeTables = 20 - counts.empty;

  return (
    <div>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.45} }
        @keyframes mapFadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ── ÖZET KUTUSU — çizgi içinde ── */}
      <div style={{ border: "1.5px solid #e5d5c5", borderRadius: 16, padding: "4px 4px 10px", marginBottom: 20, background: "#fff", position: "relative" }}>
        {/* başlık etiketi */}
        <div style={{ position: "absolute", top: -11, left: 16, background: "#fff", padding: "0 8px" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#b83a0c", letterSpacing: 1.5, textTransform: "uppercase" }}>Anlık Özet</span>
        </div>

        {/* 4 durum kartı */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginTop: 8 }}>
          {Object.entries(TABLE_STYLES).map(([key, s]) => (
            <div key={key} style={{ background: s.bg, borderRadius: 10, padding: "10px 6px", textAlign: "center", borderTop: `3px solid ${s.border}` }}>
              <div style={{ fontSize: 18, lineHeight: 1 }}>{s.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 22, color: s.text, margin: "3px 0 1px", fontFamily: "'Playfair Display',serif" }}>{counts[key]}</div>
              <div style={{ fontSize: 10, color: s.text, opacity: 0.75, letterSpacing: 0.5 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* alt satır — hızlı metrikler */}
        <div style={{ display: "flex", justifyContent: "space-around", marginTop: 10, paddingTop: 10, borderTop: "1px dashed #ede5dc" }}>
          {[
            { label: "Aktif Masa", val: activeTables },
            { label: "Bekleyen Sipariş", val: Object.values(store.activeOrders).flat().filter(o => o.status !== "teslim edildi").length },
            { label: "Anlık Ciro", val: totalRevenue.toLocaleString("tr-TR") + " ₺" },
          ].map(m => (
            <div key={m.label} style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#b83a0c" }}>{m.val}</div>
              <div style={{ fontSize: 10, color: "#aaa", marginTop: 1 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MASA GRID ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 20 }}>
        {Array.from({ length: 20 }, (_, i) => i + 1).map(t => {
          const state = getTableState(t);
          const st = TABLE_STYLES[state];
          const orders = store.activeOrders[t] || [];
          const total = orders.reduce((s, o) => s + o.total, 0);
          const isSelected = selectedTable === t;
          const isHovered = hoveredTable === t;
          const isWaiting = state === "waiting";
          const hasOrders = orders.length > 0;

          return (
            <div key={t}
              onClick={() => {
                if (!hasOrders) return;
                // Masaya tıklayınca siparişler sekmesine git
                onGoOrders(t);
              }}
              onMouseEnter={() => hasOrders && setHoveredTable(t)}
              onMouseLeave={() => setHoveredTable(null)}
              style={{
                background: isHovered ? st.border : st.bg,
                border: `2px solid ${st.border}`,
                borderRadius: 14,
                padding: "12px 8px 10px",
                textAlign: "center",
                cursor: hasOrders ? "pointer" : "default",
                transition: "all .18s",
                transform: isHovered ? "translateY(-3px) scale(1.06)" : "scale(1)",
                boxShadow: isHovered ? `0 8px 24px ${st.border}60` : "0 2px 8px rgba(0,0,0,0.06)",
                animation: isWaiting ? "blink 2s ease-in-out infinite" : "none",
                position: "relative",
              }}>
              {/* hover tooltip */}
              {isHovered && hasOrders && (
                <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "#1c0e00", color: "#e8a020", borderRadius: 8, padding: "5px 10px", fontSize: 11, whiteSpace: "nowrap", zIndex: 10, pointerEvents: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                  Siparişlere git →
                  <div style={{ position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #1c0e00" }} />
                </div>
              )}
              <div style={{ fontSize: 18, marginBottom: 2 }}>{st.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 15, color: isHovered ? "#fff" : st.text, fontFamily: "'Playfair Display',serif" }}>{t}</div>
              {hasOrders && (
                <>
                  <div style={{ fontSize: 10, color: isHovered ? "rgba(255,255,255,0.85)" : st.text, marginTop: 2 }}>{orders.length} sipariş</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: isHovered ? "#fff" : st.text, marginTop: 1 }}>{total}₺</div>
                  <MapTimer tid={t} textColor={isHovered ? "rgba(255,255,255,0.7)" : st.text} />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Table Timer ───────────────────────────────────────────────────────────────
function TableTimer({ tid }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const openedAt = gs().tableOpenedAt?.[tid];
    if (!openedAt) return;
    setElapsed(Math.floor((Date.now() - openedAt) / 1000));
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - openedAt) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [tid]);

  if (!elapsed) return null;
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const warn = elapsed > 3600; // 1 saatten fazla → uyarı
  const pad = n => String(n).padStart(2, "0");
  const label = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;

  return (
    <span style={{
      background: warn ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.1)",
      color: warn ? "#fca5a5" : "rgba(255,255,255,0.55)",
      borderRadius: 8, padding: "2px 8px", fontSize: 12, fontFamily: "monospace",
      border: warn ? "1px solid rgba(239,68,68,0.4)" : "none",
    }}>
      ⏱ {label}
    </span>
  );
}

// ─── Print Receipt Modal ───────────────────────────────────────────────────────
function PrintModal({ tid, orders, onClose }) {
  const store = gs();
  const restaurant = store.restaurant;
  const allItems = {};
  orders.forEach(o => o.items.forEach(item => {
    if (!allItems[item.id]) allItems[item.id] = { ...item, qty: 0 };
    allItems[item.id].qty += item.qty;
  }));
  const itemsList = Object.values(allItems);
  const total = orders.reduce((s, o) => s + o.total, 0);
  const now = new Date().toLocaleString("tr-TR");
  const openedAt = store.tableOpenedAt?.[tid];
  const durationMin = openedAt ? Math.round((Date.now() - openedAt) / 60000) : null;

  const doPrint = () => {
    const w = window.open("", "_blank", "width=320,height=600");
    const sc = "script";
    let itemRows = "";
    itemsList.forEach(function(item) {
      itemRows += "<div class='row'><span>" + item.qty + "x " + item.name + "</span><span>" + (item.price * item.qty) + " TL</span></div>";
    });
    const durRow = durationMin !== null
      ? "<div class='row'><span>Sure:</span><span>" + durationMin + " dk</span></div>"
      : "";
    const html = "<html><head><title>Fis - Masa " + tid + "</title>"
      + "<style>"
      + "body{font-family:'Courier New',monospace;font-size:13px;margin:0;padding:16px;width:280px;color:#111}"
      + ".center{text-align:center}.bold{font-weight:bold}"
      + ".line{border-top:1px dashed #999;margin:8px 0}"
      + ".row{display:flex;justify-content:space-between;padding:2px 0}"
      + ".big{font-size:16px;font-weight:bold}.small{font-size:11px;color:#555}"
      + "</style></head><body>"
      + "<div class='center bold' style='font-size:16px'>" + restaurant.logo + " " + restaurant.name + "</div>"
      + "<div class='center small'>" + restaurant.tagline + "</div>"
      + "<div class='line'></div>"
      + "<div class='row'><span>Masa:</span><span class='bold'>" + tid + "</span></div>"
      + "<div class='row'><span>Tarih:</span><span>" + now + "</span></div>"
      + durRow
      + "<div class='line'></div>"
      + itemRows
      + "<div class='line'></div>"
      + "<div class='row big'><span>TOPLAM</span><span>" + total + " TL</span></div>"
      + "<div class='line'></div>"
      + "<div class='center small' style='margin-top:12px'>Tesekkurler, iyi gunler!</div>"
      + "</body></html>";
    w.document.write(html);
    w.document.close();
    setTimeout(function() { w.print(); w.close(); }, 400);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 24, width: "100%", maxWidth: 340, boxShadow: "0 12px 40px rgba(0,0,0,0.25)", fontFamily: "'Courier New', monospace" }}
        onClick={e => e.stopPropagation()}>

        {/* Receipt preview */}
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{restaurant.logo} {restaurant.name}</div>
          <div style={{ fontSize: 11, color: "#888" }}>{restaurant.tagline}</div>
        </div>
        <div style={{ borderTop: "1px dashed #ccc", borderBottom: "1px dashed #ccc", padding: "8px 0", marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span>Masa</span><strong>{tid}</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888" }}><span>Tarih</span><span>{now}</span></div>
          {durationMin !== null && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888" }}><span>Masa Süresi</span><span>{durationMin} dk</span></div>}
        </div>
        {itemsList.map(item => (
          <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0", color: "#333" }}>
            <span>{item.qty}× {item.name}</span>
            <span>{item.price * item.qty} ₺</span>
          </div>
        ))}
        <div style={{ borderTop: "1px dashed #ccc", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 16 }}>
          <span>TOPLAM</span><span style={{ color: "#b83a0c" }}>{total} ₺</span>
        </div>
        <div style={{ textAlign: "center", fontSize: 11, color: "#aaa", marginTop: 8 }}>Teşekkürler, iyi günler!</div>

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button onClick={doPrint}
            style={{ flex: 1, background: "#1c0e00", color: "#e8a020", border: "none", borderRadius: 12, padding: "13px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            🖨️ Yazdır
          </button>
          <button onClick={onClose}
            style={{ flex: 1, background: "#f3f4f6", color: "#666", border: "none", borderRadius: 12, padding: "13px", fontSize: 14, cursor: "pointer" }}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Active Orders ──────────────────────────────────────────────────────────────
function ActiveOrdersTab({ refresh }) {
  const [editingOrder, setEditingOrder] = useState(null);
  const [printModal, setPrintModal] = useState(null); // tid

  const store = gs();
  const allMenuItems = store.categories.flatMap(c => c.items.filter(i => i.avail));

  // Collect all active tables (sorted by table id)
  const tableIds = Object.keys(store.activeOrders).sort((a, b) => Number(a) - Number(b));

  const setOrderStatus = async (tid, oid, status) => {
    const s = gs();
    const order = s.activeOrders[tid]?.find(o => o.id === oid);
    s.activeOrders[tid] = s.activeOrders[tid].map(o => o.id === oid ? { ...o, status } : o);
    ss(s); refresh();
    if (order) await pushOrderToSb({ ...order, status });
  };

  const cancelOrder = async (tid, oid) => {
    const s = gs();
    const order = s.activeOrders[tid]?.find(o => o.id === oid);
    if (!order) return;
    s.activeOrders[tid] = s.activeOrders[tid].filter(o => o.id !== oid);
    if (s.activeOrders[tid].length === 0) delete s.activeOrders[tid];
    s.cancelledOrders = s.cancelledOrders || [];
    const cancelled = { ...order, cancelledAt: new Date().toLocaleString("tr-TR"), cancelledTimestamp: Date.now(), tableId: Number(tid), status: "iptal" };
    s.cancelledOrders.push(cancelled);
    ss(s); refresh();
    await pushOrderToSb({ ...order, status: "iptal" });
  };
  // "Siparişi İptal Et" — teslim edilmemiş siparişler var, hepsini iptal et
  const cancelTable = async (tid) => {
    const s = gs();
    const orders = s.activeOrders[tid] || [];
    s.cancelledOrders = s.cancelledOrders || [];
    const promises = [];
    orders.forEach(o => {
      s.cancelledOrders.push({ ...o, cancelledAt: new Date().toLocaleString("tr-TR"), cancelledTimestamp: Date.now(), tableId: Number(tid), status: "iptal" });
      promises.push(pushOrderToSb({ ...o, status: "iptal" }));
    });
    delete s.activeOrders[tid];
    if (s.tableOpenedAt) delete s.tableOpenedAt[tid];
    ss(s); refresh();
    await Promise.all(promises);
  };

  // "Masayı Kapat" — tüm siparişler teslim edildi, tamamlananlara gönder
  const closeTable = async (tid) => {
    const s = gs();
    const orders = s.activeOrders[tid] || [];
    s.completedOrders = s.completedOrders || [];
    const allItems = {};
    let grandTotal = 0;
    orders.forEach(o => {
      o.items.forEach(item => {
        if (!allItems[item.id]) allItems[item.id] = { ...item, qty: 0 };
        allItems[item.id].qty += item.qty;
      });
      grandTotal += o.total;
    });
    const openedAt = s.tableOpenedAt?.[tid];
    const durationMin = openedAt ? Math.round((Date.now() - openedAt) / 60000) : null;
    s.completedOrders.push({
      id: Date.now(), tableId: Number(tid),
      items: Object.values(allItems),
      total: grandTotal,
      time: orders[0]?.time || "",
      date: orders[0]?.date || new Date().toLocaleDateString("tr-TR"),
      completedAt: new Date().toLocaleString("tr-TR"),
      completedTimestamp: Date.now(),
      orderCount: orders.length,
      durationMin,
    });
    delete s.activeOrders[tid];
    if (s.tableOpenedAt) delete s.tableOpenedAt[tid];
    ss(s); refresh();
    await Promise.all(orders.map(o => pushOrderToSb({ ...o, status: "tamamlandı" })));
  };

  const openEdit = (tid, order) => {
    setEditingOrder({ tid, order, items: order.items.map(i => ({ ...i })), note: order.note || "" });
  };

  const saveEdit = () => {
    const { tid, order, items, note } = editingOrder;
    const validItems = items.filter(i => i.qty > 0);
    if (!validItems.length) return;
    const newTotal = validItems.reduce((s, i) => s + i.price * i.qty, 0);
    const s = gs();
    s.activeOrders[tid] = s.activeOrders[tid].map(o =>
      o.id === order.id ? { ...o, items: validItems, note, total: newTotal } : o
    );
    ss(s); refresh(); setEditingOrder(null);
    const updated = s.activeOrders[tid]?.find(o => o.id === order.id);
    if (updated) pushOrderToSb(updated);
  };

  const addItemToEdit = (menuItem) => {
    setEditingOrder(prev => {
      const existing = prev.items.find(i => i.id === menuItem.id);
      if (existing) return { ...prev, items: prev.items.map(i => i.id === menuItem.id ? { ...i, qty: i.qty + 1 } : i) };
      return { ...prev, items: [...prev.items, { ...menuItem, qty: 1 }] };
    });
  };

  const changeItemQty = (itemId, delta) => {
    setEditingOrder(prev => ({
      ...prev,
      items: prev.items.map(i => i.id === itemId ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0)
    }));
  };

  const SC = {
    beklemede:     { bg: "#fef3c7", col: "#92400e", dot: "#f59e0b", label: "Beklemede" },
    "hazırlanıyor":{ bg: "#dbeafe", col: "#1e40af", dot: "#3b82f6", label: "Hazırlanıyor" },
    "teslim edildi":{ bg: "#d1fae5", col: "#065f46", dot: "#10b981", label: "Teslim Edildi" },
  };

  if (tableIds.length === 0) return (
    <div style={{ textAlign: "center", padding: "60px 0", color: "#bbb" }}>
      <div style={{ fontSize: 48 }}>🍽️</div>
      <p>Bekleyen sipariş yok</p>
    </div>
  );

  return (
    <div>
      {tableIds.map(tid => {
        const orders = store.activeOrders[tid] || [];
        // Sort: delivered go to bottom (after divider), others on top — within each group by arrival time asc
        const pending  = orders.filter(o => o.status !== "teslim edildi").sort((a, b) => a.id - b.id);
        const delivered = orders.filter(o => o.status === "teslim edildi").sort((a, b) => a.id - b.id);
        const grandTotal = orders.reduce((s, o) => s + o.total, 0);
        const deliveredTotal = delivered.reduce((s, o) => s + o.total, 0);
        const allDelivered = orders.length > 0 && pending.length === 0;

        return (
          <div key={tid} id={`table-card-${tid}`} style={{ marginBottom: 24, background: "#fff", borderRadius: 18, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", border: "1px solid #f0e8de" }}>

            {/* Table header */}
            <div style={{ background: "linear-gradient(90deg,#1c0e00,#2d1500)", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ color: "#e8a020", fontWeight: 700, fontSize: 17, fontFamily: "'Playfair Display',serif" }}>Masa {tid}</span>
                <span style={{ background: "rgba(232,160,32,0.15)", color: "#e8a020", borderRadius: 20, padding: "2px 10px", fontSize: 12 }}>{orders.length} sipariş</span>
                <TableTimer tid={tid} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#e8a020", fontWeight: 700, fontSize: 16 }}>{grandTotal} ₺</span>
                <button onClick={() => setPrintModal(tid)} title="Fiş Yazdır"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#ccc", borderRadius: 10, padding: "6px 10px", fontSize: 14, cursor: "pointer" }}>
                  🖨️
                </button>
                <button onClick={() => allDelivered ? closeTable(tid) : cancelTable(tid)}
                  style={{ background: allDelivered ? "#6d28d9" : "rgba(255,255,255,0.08)", border: allDelivered ? "none" : "1px solid rgba(255,255,255,0.15)", color: allDelivered ? "#fff" : "#aaa", borderRadius: 10, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                  {allDelivered ? "✅ Masayı Kapat" : "🚫 Siparişi İptal Et"}
                </button>
              </div>
            </div>

            <div style={{ padding: "12px 14px" }}>

              {/* ── PENDING ORDERS (above the line) ── */}
              {pending.length === 0 && delivered.length > 0 && (
                <div style={{ color: "#bbb", fontSize: 13, textAlign: "center", padding: "10px 0 6px", fontStyle: "italic" }}>Tüm siparişler teslim edildi</div>
              )}
              {pending.map((order, idx) => (
                <OrderCard key={order.id} order={order} tid={tid} sc={SC} onEdit={() => openEdit(tid, order)}
                  onSetStatus={(status) => setOrderStatus(tid, order.id, status)}
                  onCancel={() => cancelOrder(tid, order.id)}
                  isLast={idx === pending.length - 1} />
              ))}

              {/* ── DELIVERY DIVIDER ── only shown if there are delivered items */}
              {delivered.length > 0 && (
                <div style={{ margin: "10px 0", position: "relative", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, height: 2, background: "linear-gradient(90deg, transparent, #10b981, transparent)", borderRadius: 2 }} />
                  <div style={{ background: "#d1fae5", color: "#065f46", borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>
                    ✓ Teslim Edilenler — {deliveredTotal} ₺
                  </div>
                  <div style={{ flex: 1, height: 2, background: "linear-gradient(90deg, #10b981, transparent)", borderRadius: 2 }} />
                </div>
              )}

              {/* ── DELIVERED ORDERS (below the line) ── */}
              {delivered.map((order, idx) => (
                <OrderCard key={order.id} order={order} tid={tid} sc={SC} onEdit={() => openEdit(tid, order)}
                  onSetStatus={(status) => setOrderStatus(tid, order.id, status)}
                  isDelivered dimmed />
              ))}

            </div>
          </div>
        );
      })}

      {/* ── PRINT MODAL ── */}
      {printModal && (
        <PrintModal
          tid={printModal}
          orders={gs().activeOrders[printModal] || []}
          onClose={() => setPrintModal(null)}
        />
      )}

      {/* ── ORDER EDIT MODAL ── */}
      {editingOrder && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={() => setEditingOrder(null)}>
          <div style={{ background: "#fff", borderRadius: "22px 22px 0 0", width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", padding: "20px 16px 28px" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontFamily: "'Playfair Display',serif", fontSize: 18 }}>✏️ Sipariş Düzenle — Masa {editingOrder.tid}</h3>
              <button onClick={() => setEditingOrder(null)} style={{ background: "#f3f4f6", border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer", color: "#666", fontSize: 15 }}>✕</button>
            </div>

            <div style={{ fontSize: 11, color: "#aaa", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Mevcut Ürünler</div>
            {editingOrder.items.length === 0 && <div style={{ color: "#ccc", fontSize: 13, padding: "8px 0 14px" }}>Sepet boş</div>}
            {editingOrder.items.map(item => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f5ede5" }}>
                <img src={FOOD_IMAGES[item.id] || ""} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", background: "#f0e8de", flexShrink: 0 }} onError={e => e.target.style.opacity = 0} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                  <div style={{ color: "#b83a0c", fontSize: 13 }}>{item.price * item.qty} ₺</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => changeItemQty(item.id, -1)} style={{ background: "#fee2e2", border: "none", color: "#b91c1c", borderRadius: 6, width: 28, height: 28, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>−</button>
                  <span style={{ fontWeight: 700, width: 22, textAlign: "center", color: "#b83a0c" }}>{item.qty}</span>
                  <button onClick={() => changeItemQty(item.id, 1)} style={{ background: "#dcfce7", border: "none", color: "#166534", borderRadius: 6, width: 28, height: 28, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>+</button>
                </div>
              </div>
            ))}

            <div style={{ fontSize: 11, color: "#aaa", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "14px 0 8px" }}>Menüden Ekle</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8, marginBottom: 14 }}>
              {allMenuItems.map(item => {
                const inCart = editingOrder.items.find(i => i.id === item.id);
                return (
                  <button key={item.id} onClick={() => addItemToEdit(item)}
                    style={{ background: inCart ? "#fff7f5" : "#f9f6f2", border: inCart ? "1.5px solid #b83a0c" : "1.5px solid #e5d5c5", borderRadius: 10, padding: "8px 10px", cursor: "pointer", textAlign: "left" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 2 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: "#b83a0c", fontWeight: 700 }}>{item.price} ₺</div>
                    {inCart && <div style={{ fontSize: 10, color: "#b83a0c", marginTop: 2 }}>Sepette: {inCart.qty}</div>}
                  </button>
                );
              })}
            </div>

            <div style={{ fontSize: 11, color: "#aaa", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Not</div>
            <textarea value={editingOrder.note} onChange={e => setEditingOrder(p => ({ ...p, note: e.target.value }))}
              style={{ width: "100%", border: "1.5px solid #e5d5c5", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "inherit", resize: "none", boxSizing: "border-box", marginBottom: 14 }} rows={2} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ color: "#666" }}>Yeni Toplam</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: "#b83a0c" }}>{editingOrder.items.reduce((s, i) => s + i.price * i.qty, 0)} ₺</span>
            </div>
            <button onClick={saveEdit}
              style={{ width: "100%", background: "#b83a0c", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              💾 Değişiklikleri Kaydet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Single Order Card ─────────────────────────────────────────────────────────
function OrderCard({ order, tid, sc, onEdit, onSetStatus, onCancel, isDelivered, dimmed }) {
  const s = sc[order.status] || { bg: "#f3f4f6", col: "#555", dot: "#999" };
  return (
    <div style={{ background: dimmed ? "#f9fdf9" : "#fff", borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: `1px solid ${dimmed ? "#d1fae5" : "#f0e8de"}`, borderLeft: `4px solid ${s.dot}`, opacity: dimmed ? 0.85 : 1, transition: "opacity .2s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ color: "#aaa", fontSize: 11 }}>{order.time}</span>
        <span style={{ background: s.bg, color: s.col, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{s.label || order.status}</span>
      </div>
      {order.items.map((item, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: 13, color: dimmed ? "#6b8f70" : "#444" }}>
          <span>{item.qty}× {item.name}</span>
          <span style={{ color: dimmed ? "#10b981" : "#b83a0c" }}>{item.price * item.qty} ₺</span>
        </div>
      ))}
      {order.note && <div style={{ marginTop: 6, background: "#fffbf5", borderRadius: 6, padding: "5px 8px", fontSize: 11, color: "#888" }}>📝 {order.note}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
        <strong style={{ color: dimmed ? "#10b981" : "#b83a0c", fontSize: 14 }}>{order.total} ₺</strong>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
          {!isDelivered ? (
            <button onClick={onEdit} style={actionBtn("#7c3aed")}>✏️ Düzenle</button>
          ) : (
            <span style={{ background: "#f3f4f6", color: "#bbb", borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 700, cursor: "not-allowed", border: "1px solid #e5e7eb" }}>✏️ Düzenle</span>
          )}
          {order.status !== "hazırlanıyor" && !isDelivered && (
            <button onClick={() => onSetStatus("hazırlanıyor")} style={actionBtn("#3b82f6")}>🔵 Hazırlanıyor</button>
          )}
          {!isDelivered && (
            <button onClick={() => onSetStatus("teslim edildi")} style={actionBtn("#10b981")}>🟢 Teslim Et</button>
          )}
          {isDelivered && (
            <button onClick={() => onSetStatus("hazırlanıyor")} style={actionBtn("#f59e0b")}>↩ Geri Al</button>
          )}
        </div>
      </div>
    </div>
  );
}

const actionBtn = (col) => ({ background: col + "22", border: `1px solid ${col}`, color: col, borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" });

// ─── Completed + Analytics ──────────────────────────────────────────────────────
function CompletedTab({ refresh }) {
  const store = gs();
  const [range, setRange] = useState("today");
  const completed = store.completedOrders || [];

  const now = new Date();
  const filtered = completed.filter(o => {
    if (!o.completedTimestamp) return true;
    const d = new Date(o.completedTimestamp);
    if (range === "today") return d.toDateString() === now.toDateString();
    if (range === "week") return (now - d) < 7 * 86400000;
    if (range === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  });

  const totalRevenue = filtered.reduce((s, o) => s + (o.total || 0), 0);
  const avgOrder = filtered.length ? Math.round(totalRevenue / filtered.length) : 0;

  // By table
  const byTable = {};
  filtered.forEach(o => { byTable[o.tableId] = (byTable[o.tableId] || 0) + o.total; });

  // By item
  const byItem = {};
  filtered.forEach(o => o.items?.forEach(item => {
    if (!byItem[item.name]) byItem[item.name] = { count: 0, revenue: 0 };
    byItem[item.name].count += item.qty;
    byItem[item.name].revenue += item.price * item.qty;
  }));
  const topItems = Object.entries(byItem).sort((a, b) => b[1].count - a[1].count).slice(0, 5);

  // By hour (today/week only)
  const byHour = Array(24).fill(0);
  filtered.forEach(o => {
    if (o.completedTimestamp) byHour[new Date(o.completedTimestamp).getHours()] += o.total;
  });
  const maxH = Math.max(...byHour, 1);

  const clearAll = () => {
    if (!window.confirm("Tüm tamamlananlar silinsin mi?")) return;
    const s = gs(); s.completedOrders = []; ss(s); refresh();
  };

  return (
    <div>
      {/* Range */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[["today","Bugün"],["week","Bu Hafta"],["month","Bu Ay"],["all","Tümü"]].map(([v, l]) => (
          <button key={v} onClick={() => setRange(v)}
            style={{ padding: "7px 14px", borderRadius: 20, border: "1.5px solid", borderColor: range === v ? "#b83a0c" : "#ddd", background: range === v ? "#b83a0c" : "#fff", color: range === v ? "#fff" : "#666", fontSize: 13, fontWeight: range === v ? 700 : 400, cursor: "pointer" }}>
            {l}
          </button>
        ))}
      </div>

      {/* Stats cards — tamamlanan + iptal istatistikleri */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Sipariş", val: filtered.length, icon: "📋" },
          { label: "Ciro", val: totalRevenue.toLocaleString("tr-TR") + " ₺", icon: "💰" },
          { label: "Ort. Sipariş", val: avgOrder + " ₺", icon: "📊" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "14px 10px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 22 }}>{s.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#b83a0c", marginTop: 4 }}>{s.val}</div>
            <div style={{ color: "#aaa", fontSize: 12 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* İptal özeti */}
      {(() => {
        const cancelled = gs().cancelledOrders || [];
        const filtCancelled = cancelled.filter(o => {
          if (!o.cancelledTimestamp) return false;
          const d = new Date(o.cancelledTimestamp);
          if (range === "today") return d.toDateString() === now.toDateString();
          if (range === "week") return (now - d) < 7 * 86400000;
          if (range === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          return true;
        });
        if (!filtCancelled.length) return null;
        const cancelTotal = filtCancelled.reduce((s, o) => s + (o.total || 0), 0);
        return (
          <div style={{ background: "#fff", borderRadius: 14, padding: 14, marginBottom: 14, border: "1px solid #fecaca", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: "#991b1b" }}>🚫 İptal Özeti</div>
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: "#ef4444" }}>{filtCancelled.length}</div>
                <div style={{ color: "#aaa", fontSize: 11 }}>İptal Sayısı</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: "#ef4444" }}>{cancelTotal} ₺</div>
                <div style={{ color: "#aaa", fontSize: 11 }}>Kaybedilen</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: "#ef4444" }}>
                  {totalRevenue > 0 ? "%" + Math.round(cancelTotal / (totalRevenue + cancelTotal) * 100) : "—"}
                </div>
                <div style={{ color: "#aaa", fontSize: 11 }}>İptal Oranı</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Hourly bar chart */}
      {range !== "all" && (
        <div style={{ background: "#fff", borderRadius: 14, padding: "16px", marginBottom: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>⏰ Saatlik Ciro</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 60 }}>
            {byHour.map((v, h) => (
              <div key={h} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <div style={{ width: "100%", background: v > 0 ? "#b83a0c" : "#f0e8de", borderRadius: "3px 3px 0 0", height: Math.max(3, (v / maxH) * 56) + "px", transition: "height .3s" }} title={`${h}:00 — ${v}₺`} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, color: "#bbb", fontSize: 10 }}>
            <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
          </div>
        </div>
      )}

      {/* Top items */}
      {topItems.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 14, padding: 16, marginBottom: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>🏆 En Çok Sipariş Edilenler</div>
          {topItems.map(([name, data], i) => (
            <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < topItems.length - 1 ? "1px solid #f5ede5" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ background: i === 0 ? "#fef3c7" : "#f3f4f6", color: i === 0 ? "#92400e" : "#666", borderRadius: 6, padding: "2px 7px", fontSize: 12, fontWeight: 700 }}>#{i + 1}</span>
                <span style={{ fontSize: 14 }}>{name}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#b83a0c", fontWeight: 700, fontSize: 14 }}>{data.count} adet</div>
                <div style={{ color: "#aaa", fontSize: 11 }}>{data.revenue} ₺</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order list */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>📋 Sipariş Listesi ({filtered.length})</div>
          {completed.length > 0 && <button onClick={clearAll} style={{ background: "#fee2e2", border: "none", color: "#991b1b", borderRadius: 8, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>Temizle</button>}
        </div>
        {filtered.length === 0 ? <div style={{ color: "#bbb", textAlign: "center", padding: "20px 0" }}>Kayıt yok</div> :
          filtered.slice().reverse().map(order => (
            <div key={order.id} style={{ padding: "10px 0", borderBottom: "1px solid #f5ede5" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ background: "#fff7f5", border: "1px solid #fcd9c5", color: "#b83a0c", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>Masa {order.tableId}</span>
                <span style={{ color: "#aaa", fontSize: 12 }}>{order.completedAt}</span>
              </div>
              <div style={{ color: "#555", fontSize: 13 }}>{order.items?.map(i => `${i.qty}× ${i.name}`).join(", ")}</div>
              <div style={{ color: "#b83a0c", fontWeight: 700, marginTop: 4 }}>{order.total} ₺</div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ─── Cancelled Orders Tab ──────────────────────────────────────────────────────
function CancelledTab({ refresh }) {
  const store = gs();
  const cancelled = store.cancelledOrders || [];
  const now = new Date();

  // Only today's cancellations can be restored
  const todaysCancelled = cancelled.filter(o => {
    if (!o.cancelledTimestamp) return false;
    return new Date(o.cancelledTimestamp).toDateString() === now.toDateString();
  });
  const olderCancelled = cancelled.filter(o => {
    if (!o.cancelledTimestamp) return true;
    return new Date(o.cancelledTimestamp).toDateString() !== now.toDateString();
  });

  const restore = (orderId) => {
    const s = gs();
    const order = s.cancelledOrders?.find(o => o.id === orderId);
    if (!order) return;
    s.cancelledOrders = s.cancelledOrders.filter(o => o.id !== orderId);
    const tid = String(order.tableId);
    if (!s.activeOrders[tid]) s.activeOrders[tid] = [];
    s.activeOrders[tid].push({ ...order, status: "beklemede", restoredAt: new Date().toLocaleTimeString("tr-TR") });
    ss(s); refresh();
  };

  const clearOld = () => {
    if (!window.confirm("Eski iptal kayıtları silinsin mi?")) return;
    const s = gs();
    s.cancelledOrders = (s.cancelledOrders || []).filter(o => {
      if (!o.cancelledTimestamp) return false;
      return new Date(o.cancelledTimestamp).toDateString() === now.toDateString();
    });
    ss(s); refresh();
  };

  const totalCancelledAmount = cancelled.reduce((s, o) => s + (o.total || 0), 0);
  const todayAmount = todaysCancelled.reduce((s, o) => s + (o.total || 0), 0);

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Bugün İptal", val: todaysCancelled.length, icon: "🚫" },
          { label: "Bugün Kayıp", val: todayAmount + " ₺", icon: "💸" },
          { label: "Toplam İptal", val: cancelled.length, icon: "📉" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "14px 10px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #fecaca" }}>
            <div style={{ fontSize: 22 }}>{s.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#ef4444", marginTop: 4 }}>{s.val}</div>
            <div style={{ color: "#aaa", fontSize: 12 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Today's cancelled — restorable */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 16, marginBottom: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #fecaca" }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: "#991b1b" }}>
          🔄 Bugün İptal Edilenler <span style={{ color: "#aaa", fontWeight: 400, fontSize: 12 }}>(geri alınabilir)</span>
        </div>
        {todaysCancelled.length === 0 ? (
          <div style={{ color: "#bbb", textAlign: "center", padding: "16px 0" }}>Bugün iptal yok</div>
        ) : todaysCancelled.slice().reverse().map(order => (
          <div key={order.id} style={{ padding: "10px 0", borderBottom: "1px solid #fff1f1", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>Masa {order.tableId}</span>
                <span style={{ color: "#aaa", fontSize: 11 }}>{order.cancelledAt}</span>
              </div>
              <div style={{ color: "#666", fontSize: 13 }}>{order.items?.map(i => `${i.qty}× ${i.name}`).join(", ")}</div>
              <div style={{ color: "#ef4444", fontWeight: 700, marginTop: 3, fontSize: 14 }}>{order.total} ₺</div>
            </div>
            <button onClick={() => restore(order.id)}
              style={{ background: "#dcfce7", border: "1px solid #86efac", color: "#166534", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
              ↩ Geri Al
            </button>
          </div>
        ))}
      </div>

      {/* Older cancelled — view only */}
      {olderCancelled.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#888" }}>📁 Önceki İptaller</div>
            <button onClick={clearOld} style={{ background: "#f3f4f6", border: "none", color: "#999", borderRadius: 8, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>Temizle</button>
          </div>
          {olderCancelled.slice().reverse().map(order => (
            <div key={order.id} style={{ padding: "10px 0", borderBottom: "1px solid #f5f5f5", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1, opacity: 0.6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ background: "#f3f4f6", color: "#888", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>Masa {order.tableId}</span>
                  <span style={{ color: "#bbb", fontSize: 11 }}>{order.cancelledAt}</span>
                </div>
                <div style={{ color: "#aaa", fontSize: 13 }}>{order.items?.map(i => `${i.qty}× ${i.name}`).join(", ")}</div>
                <div style={{ color: "#bbb", fontWeight: 700, marginTop: 3, fontSize: 14 }}>{order.total} ₺</div>
              </div>
              <button disabled title="Sadece iptal günü geri alınabilir"
                style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", color: "#ccc", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "not-allowed", whiteSpace: "nowrap", flexShrink: 0 }}>
                ↩ Geri Al
              </button>
            </div>
          ))}
        </div>
      )}

      {cancelled.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#bbb" }}>
          <div style={{ fontSize: 48 }}>✅</div>
          <p>Hiç iptal edilmiş sipariş yok</p>
        </div>
      )}
    </div>
  );
}

// ─── Menu Editor ────────────────────────────────────────────────────────────────
function MenuEditorTab({ refresh }) {
  const [editItem, setEditItem] = useState(null);
  const [newCat, setNewCat] = useState({ name: "", icon: "🍽️" });
  const store = gs();

  const saveR = async (f, v) => { const s = gs(); s.restaurant[f] = v; ss(s); refresh(); await pushSettingsToSb(s); };
  const saveItem = (catId, item) => {
    const s = gs(), cat = s.categories.find(c => c.id === catId); if (!cat) return;
    if (item.id) { const i = cat.items.findIndex(x => x.id === item.id); if (i >= 0) cat.items[i] = item; else cat.items.push(item); }
    else cat.items.push({ ...item, id: "i" + Date.now() });
    ss(s); refresh(); setEditItem(null); pushCategoriesToSb(s.categories);
  };
  const delItem = (catId, id) => { const s = gs(), cat = s.categories.find(c => c.id === catId); if (cat) cat.items = cat.items.filter(i => i.id !== id); ss(s); refresh(); pushCategoriesToSb(s.categories); };
  const toggleAvail = (catId, id) => { const s = gs(), cat = s.categories.find(c => c.id === catId); if (cat) { const it = cat.items.find(i => i.id === id); if (it) it.avail = !it.avail; } ss(s); refresh(); pushCategoriesToSb(s.categories); };
  const addCat = () => { if (!newCat.name.trim()) return; const s = gs(); s.categories.push({ id: "c" + Date.now(), name: newCat.name, icon: newCat.icon, items: [] }); ss(s); refresh(); setNewCat({ name: "", icon: "🍽️" }); pushCategoriesToSb(s.categories); };
  const delCat = (id) => { const s = gs(); s.categories = s.categories.filter(c => c.id !== id); ss(s); refresh(); pushCategoriesToSb(s.categories); };

  return (
    <div>
      <div style={adminCard}>
        <div style={secTitle}>🏪 Restoran Bilgileri</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[["name","Restoran Adı"],["tagline","Alt başlık"],["logo","Logo"]].map(([f, p]) => (
            <input key={f} style={{ ...adminInput, flex: f === "logo" ? "0 0 70px" : "1 1 140px" }}
              value={store.restaurant[f]} onChange={e => saveR(f, e.target.value)} placeholder={p} />
          ))}
        </div>
      </div>

      {store.categories.map(cat => (
        <div key={cat.id} style={adminCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={secTitle}>{cat.icon} {cat.name}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setEditItem({ catId: cat.id, id: "", name: "", price: 0, desc: "", avail: true })}
                style={{ ...miniAdminBtn, background: "#dcfce7", color: "#166534", border: "1px solid #86efac" }}>+ Ürün</button>
              <button onClick={() => delCat(cat.id)} style={{ ...miniAdminBtn, background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" }}>Sil</button>
            </div>
          </div>
          {cat.items.map(item => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid #f5ede5" }}>
              <img src={FOOD_IMAGES[item.id] || ""} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", background: "#f0e8de", flexShrink: 0 }} onError={e => e.target.style.opacity = 0} />
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, opacity: item.avail ? 1 : 0.4 }}>{item.name}</span>
                <span style={{ color: "#b83a0c", marginLeft: 8, fontSize: 13 }}>{item.price} ₺</span>
              </div>
              <button onClick={() => toggleAvail(cat.id, item.id)} style={{ ...miniAdminBtn, background: item.avail ? "#dcfce7" : "#f3f4f6", color: item.avail ? "#166534" : "#999" }}>{item.avail ? "✓" : "Pasif"}</button>
              <button onClick={() => setEditItem({ catId: cat.id, ...item })} style={{ ...miniAdminBtn, background: "#fef9c3", color: "#713f12" }}>✏️</button>
              <button onClick={() => delItem(cat.id, item.id)} style={{ ...miniAdminBtn, background: "#fee2e2", color: "#991b1b" }}>🗑</button>
            </div>
          ))}
        </div>
      ))}

      <div style={adminCard}>
        <div style={secTitle}>➕ Yeni Kategori</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input style={{ ...adminInput, width: 60 }} value={newCat.icon} onChange={e => setNewCat(p => ({ ...p, icon: e.target.value }))} />
          <input style={{ ...adminInput, flex: 1 }} value={newCat.name} onChange={e => setNewCat(p => ({ ...p, name: e.target.value }))} placeholder="Kategori adı" />
          <button onClick={addCat} style={{ background: "#b83a0c", color: "#fff", border: "none", borderRadius: 8, padding: "0 16px", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>Ekle</button>
        </div>
      </div>

      {editItem && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20 }} onClick={() => setEditItem(null)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px", fontFamily: "'Playfair Display',serif" }}>{editItem.id ? "Ürün Düzenle" : "Yeni Ürün"}</h3>
            {[["name","Ürün adı","text"],["desc","Açıklama","text"],["price","Fiyat (₺)","number"]].map(([f, p, t]) => (
              <input key={f} type={t} style={{ ...adminInput, width: "100%", marginBottom: 10, boxSizing: "border-box" }}
                value={editItem[f] || ""} onChange={e => setEditItem(prev => ({ ...prev, [f]: t === "number" ? Number(e.target.value) : e.target.value }))}
                placeholder={p} />
            ))}
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, cursor: "pointer", fontSize: 14 }}>
              <input type="checkbox" checked={editItem.avail} onChange={e => setEditItem(p => ({ ...p, avail: e.target.checked }))} />
              Aktif (menüde görünsün)
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => saveItem(editItem.catId, editItem)} style={{ flex: 1, background: "#b83a0c", color: "#fff", border: "none", borderRadius: 8, padding: 12, fontWeight: 700, cursor: "pointer" }}>Kaydet</button>
              <button onClick={() => setEditItem(null)} style={{ flex: 1, background: "#f3f4f6", border: "none", borderRadius: 8, padding: 12, cursor: "pointer" }}>İptal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const adminCard = { background: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", border: "1px solid #f0e8de" };
const secTitle = { fontWeight: 700, fontSize: 15, marginBottom: 12, fontFamily: "'Playfair Display',serif" };
const adminInput = { border: "1.5px solid #e5d5c5", borderRadius: 8, padding: "8px 10px", fontSize: 14, fontFamily: "inherit", outline: "none" };
const miniAdminBtn = { border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 12, fontWeight: 600, cursor: "pointer" };

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN — QR Kodlar Sekmesi
// ═══════════════════════════════════════════════════════════════════════════════
function QRTab({ onSimulate }) {
  const [tableCount, setTableCount] = useState(20);
  const [siteUrl, setSiteUrl] = useState(
    window.location.origin + window.location.pathname
  );
  const store = gs();

  const buildPrintHtml = (tables, baseUrl, rName, rLogo) => {
    const cdn = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    let cards = "";
    let inits = "";
    tables.forEach(function(t) {
      const u = baseUrl.replace(/\/$/, "") + "?masa=" + t;
      cards += "<div class=\"card\">"
        + "<div class=\"rest\">" + rLogo + " " + rName + "</div>"
        + "<div id=\"qr" + t + "\"></div>"
        + "<div class=\"masa\">MASA " + t + "</div>"
        + "<div class=\"hint\">Menu icin okutun</div>"
        + "</div>";
      inits += "new QRCode(document.getElementById('qr" + t + "'),{text:'" + u + "',width:140,height:140,correctLevel:QRCode.CorrectLevel.M});";
    });
    const sc = "script";
    return "<!DOCTYPE html><html><head><meta charset='utf-8'>"
      + "<" + sc + " src='" + cdn + "'></" + sc + ">"
      + "<style>*{box-sizing:border-box;margin:0;padding:0}"
      + "body{font-family:Georgia,serif;background:#fff}"
      + ".grid{display:grid;grid-template-columns:repeat(4,1fr);gap:0}"
      + ".card{border:1px solid #ddd;padding:16px;text-align:center;page-break-inside:avoid;"
      + "display:flex;flex-direction:column;align-items:center;gap:8px}"
      + ".rest{font-size:11px;color:#888;letter-spacing:1px}"
      + ".masa{font-size:18px;font-weight:bold;letter-spacing:2px;color:#1c0e00}"
      + ".hint{font-size:10px;color:#aaa}"
      + "@media print{@page{margin:8mm}}</style></head>"
      + "<body><div class='grid'>" + cards + "</div>"
      + "<" + sc + ">window.onload=function(){" + inits + "setTimeout(function(){window.print();},900);};</" + sc + ">"
      + "</body></html>";
  };

  const buildSingleHtml = (t, url, rName, rLogo) => {
    const cdn = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    const sc = "script";
    return "<!DOCTYPE html><html><head><meta charset='utf-8'>"
      + "<" + sc + " src='" + cdn + "'></" + sc + ">"
      + "<style>body{font-family:Georgia,serif;display:flex;align-items:center;"
      + "justify-content:center;min-height:100vh;background:#fff}"
      + ".card{text-align:center;border:2px solid #1c0e00;border-radius:16px;padding:28px 32px}"
      + ".rest{font-size:13px;color:#888;letter-spacing:1.5px;margin-bottom:12px}"
      + ".masa{font-size:28px;font-weight:bold;letter-spacing:3px;color:#1c0e00;margin-top:14px}"
      + ".hint{font-size:11px;color:#aaa;margin-top:6px}</style></head>"
      + "<body><div class='card'>"
      + "<div class='rest'>" + rLogo + " " + rName.toUpperCase() + "</div>"
      + "<div id='qrbox'></div>"
      + "<div class='masa'>MASA " + t + "</div>"
      + "<div class='hint'>Menu icin QR kodu okutun</div>"
      + "</div>"
      + "<" + sc + ">window.onload=function(){"
      + "new QRCode(document.getElementById('qrbox'),{text:'" + url + "',width:200,height:200,correctLevel:QRCode.CorrectLevel.M});"
      + "setTimeout(function(){window.print();},700);};</" + sc + ">"
      + "</body></html>";
  };

  const printAll = () => {
    const tables = Array.from({ length: tableCount }, function(_, i) { return i + 1; });
    const html = buildPrintHtml(tables, siteUrl, store.restaurant.name, store.restaurant.logo);
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
  };

  const printSingle = (t) => {
    const url = (siteUrl.replace(/\/$/, "") || "https://example.com") + "?masa=" + t;
    const html = buildSingleHtml(t, url, store.restaurant.name, store.restaurant.logo);
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
  };

  return (
    <div>
      {/* URL + ayarlar */}
      <div style={adminCard}>
        <div style={secTitle}>📲 QR Kod Ayarları</div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#a07850", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
            Site URL (Netlify linkin)
          </label>
          <input
            value={siteUrl}
            onChange={e => setSiteUrl(e.target.value)}
            placeholder="https://abc123.netlify.app"
            style={{ ...adminInput, width: "100%", boxSizing: "border-box", fontFamily: "monospace", fontSize: 13 }}
          />
          <div style={{ fontSize: 11, color: "#b0a090", marginTop: 6 }}>
            Her QR: <code style={{ fontFamily: "monospace", background: "#f5ede5", padding: "1px 5px", borderRadius: 3 }}>{(siteUrl || "https://...").replace(/\/$/, "")}?masa=N</code>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 13, color: "#888" }}>Masa sayısı:</label>
            <select value={tableCount} onChange={e => setTableCount(Number(e.target.value))}
              style={{ ...adminInput, padding: "6px 10px" }}>
              {[5,10,15,20,25,30].map(n => <option key={n} value={n}>{n} masa</option>)}
            </select>
          </div>
          <button onClick={printAll}
            style={{ background: "#b83a0c", color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            🖨️ Tümünü Yazdır
          </button>
        </div>
      </div>

      {/* QR grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10 }}>
        {Array.from({ length: tableCount }, (_, i) => i + 1).map(t => {
          const url = (siteUrl.replace(/\/$/, "") || "https://example.com") + "?masa=" + t;
          const hasOrders = (store.activeOrders[t] || []).length > 0;
          return (
            <div key={t} style={{ background: "#fff", borderRadius: 14, padding: "12px 10px", textAlign: "center", border: hasOrders ? "2px solid #b83a0c" : "1.5px solid #f0e8de", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", position: "relative" }}>
              {hasOrders && (
                <div style={{ position: "absolute", top: 6, right: 6, background: "#b83a0c", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>!</div>
              )}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
                <QRCanvas url={url} size={90} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Masa {t}</div>
              {hasOrders && <div style={{ fontSize: 10, color: "#b83a0c", marginBottom: 4 }}>Aktif sipariş</div>}
              <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                <button onClick={() => printSingle(t)}
                  style={{ background: "#1c0e00", color: "#e8a020", border: "none", borderRadius: 6, padding: "5px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  🖨️
                </button>
                <button onClick={() => { if (window.confirm("Masa " + t + " simüle edilsin mi?")) onSimulate(t); }}
                  style={{ background: "#f0e8de", color: "#8a5535", border: "none", borderRadius: 6, padding: "5px 8px", fontSize: 11, cursor: "pointer" }}>
                  ▶ Test
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS — rezervasyon için yardımcı fonksiyonlar
// ═══════════════════════════════════════════════════════════════════════════════
function generateSlots(date, settings) {
  const slots = [];
  const [oh, om] = settings.openTime.split(":").map(Number);
  const [ch, cm] = settings.closeTime.split(":").map(Number);
  let cur = oh * 60 + om;
  const end = ch * 60 + cm;
  while (cur + settings.slotMinutes <= end) {
    const hh = String(Math.floor(cur / 60)).padStart(2, "0");
    const mm = String(cur % 60).padStart(2, "0");
    slots.push(`${hh}:${mm}`);
    cur += settings.slotMinutes;
  }
  return slots;
}

function countReservationsForSlot(reservations, date, time) {
  return reservations.filter(r => r.date === date && r.time === time && r.status !== "iptal").length;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateTR(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  const months = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
  return `${parseInt(d)} ${months[parseInt(m)-1]} ${y}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÜŞTERİ — Rezervasyon Sayfası
// ═══════════════════════════════════════════════════════════════════════════════
function ReservationPage({ onBack }) {
  const store = gs();
  const settings = store.reservationSettings;

  const [step, setStep] = useState(1); // 1=tarih+saat, 2=bilgiler, 3=onay
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState("");
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [resCode, setResCode] = useState("");

  const slots = generateSlots(date, settings);

  const slotAvail = (t) => {
    const used = countReservationsForSlot(store.reservations, date, t);
    return used < settings.maxPerSlot;
  };

  const submit = async () => {
    if (!name.trim() || !phone.trim()) return;
    const s = gs();
    const code = "R" + Date.now().toString().slice(-6);
    const reservation = {
      id: Date.now(),
      code,
      date,
      time,
      guests,
      name: name.trim(),
      phone: phone.trim(),
      note: note.trim(),
      status: "onaylı",
      createdAt: new Date().toLocaleString("tr-TR"),
    };
    s.reservations = [...(s.reservations || []), reservation];
    ss(s);
    await pushReservationToSb(reservation);
    setResCode(code);
    setDone(true);
  };

  if (done) return (
    <div style={{ minHeight: "100vh", background: "#fffbf5", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Lato',Georgia,sans-serif" }}>
      <div style={{ textAlign: "center", maxWidth: 340, width: "100%" }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 26, margin: "0 0 8px", color: "#1c0e00" }}>Rezervasyonunuz Alındı!</h2>
        <div style={{ background: "#fff", border: "1.5px solid #e8d5b0", borderRadius: 16, padding: 24, margin: "20px 0", textAlign: "left" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #f0e8de" }}>
            <span style={{ color: "#a07850", fontSize: 13 }}>Rezervasyon Kodu</span>
            <span style={{ fontWeight: 700, fontSize: 20, color: "#b83a0c", letterSpacing: 2 }}>{resCode}</span>
          </div>
          {[
            ["📅 Tarih", formatDateTR(date)],
            ["🕐 Saat", time],
            ["👥 Kişi", `${guests} kişi`],
            ["👤 Ad Soyad", name],
            ["📞 Telefon", phone],
            ...(note ? [["📝 Not", note]] : []),
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 14 }}>
              <span style={{ color: "#a07850" }}>{k}</span>
              <span style={{ fontWeight: 600, color: "#1c0e00", textAlign: "right", maxWidth: "55%" }}>{v}</span>
            </div>
          ))}
        </div>
        <p style={{ color: "#a07850", fontSize: 13, marginBottom: 24 }}>Lütfen bu kodu işletmeye geldiğinizde gösterin.</p>
        <button onClick={onBack} style={{ ...resBtnPrimary, width: "100%" }}>← Ana Sayfaya Dön</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0f0700", fontFamily: "'Lato',Georgia,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Lato:wght@300;400;700&display=swap');`}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(180deg,#1c0e00,#0f0700)", padding: "18px 16px 16px" }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#e8a020", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 13, marginBottom: 12 }}>← Geri</button>
        <div style={{ color: "#e8a020", fontFamily: "'Playfair Display',Georgia,serif", fontSize: 22, fontWeight: 700 }}>{store.restaurant.logo} {store.restaurant.name}</div>
        <div style={{ color: "#7a5535", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 2 }}>Masa Rezervasyonu</div>
      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", padding: "14px 16px", gap: 8, alignItems: "center" }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, flex: s < 3 ? 1 : 0 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, flexShrink: 0,
              background: step >= s ? "#e8a020" : "rgba(255,255,255,0.1)",
              color: step >= s ? "#0f0700" : "#555",
            }}>{s}</div>
            {s < 3 && <div style={{ flex: 1, height: 2, background: step > s ? "#e8a020" : "rgba(255,255,255,0.1)", borderRadius: 1 }} />}
          </div>
        ))}
      </div>

      <div style={{ padding: "0 16px 32px" }}>

        {/* STEP 1 — Tarih & Saat */}
        {step === 1 && (
          <div>
            <h3 style={{ color: "#e8a020", fontFamily: "'Playfair Display',serif", fontSize: 20, margin: "0 0 20px" }}>Tarih ve Saat Seçin</h3>

            <div style={{ marginBottom: 20 }}>
              <label style={{ color: "#a07850", fontSize: 12, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Tarih</label>
              <input
                type="date"
                value={date}
                min={todayStr()}
                onChange={e => { setDate(e.target.value); setTime(""); }}
                style={{ width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(232,160,32,0.3)", color: "#f0e0c0", borderRadius: 12, padding: "12px 14px", fontSize: 15, fontFamily: "inherit", boxSizing: "border-box", colorScheme: "dark" }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ color: "#a07850", fontSize: 12, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 10 }}>Saat Seçin</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {slots.map(t => {
                  const avail = slotAvail(t);
                  const selected = time === t;
                  return (
                    <button key={t} onClick={() => avail && setTime(t)} disabled={!avail}
                      style={{
                        padding: "12px 8px", borderRadius: 12, border: "1.5px solid",
                        borderColor: selected ? "#e8a020" : avail ? "rgba(232,160,32,0.2)" : "rgba(255,255,255,0.05)",
                        background: selected ? "#e8a020" : avail ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
                        color: selected ? "#0f0700" : avail ? "#f0e0c0" : "#444",
                        fontSize: 15, fontWeight: selected ? 700 : 400, cursor: avail ? "pointer" : "not-allowed",
                        fontFamily: "'Lato',sans-serif",
                      }}>
                      {t}
                      {!avail && <div style={{ fontSize: 10, marginTop: 2 }}>Dolu</div>}
                    </button>
                  );
                })}
              </div>
              {slots.length === 0 && <div style={{ color: "#555", fontSize: 14, textAlign: "center", padding: 20 }}>Bu tarih için uygun saat yok</div>}
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ color: "#a07850", fontSize: 12, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 10 }}>Kişi Sayısı</label>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <button onClick={() => setGuests(g => Math.max(1, g - 1))} style={{ ...resCountBtn, background: "rgba(255,255,255,0.1)" }}>−</button>
                <span style={{ color: "#e8a020", fontSize: 22, fontWeight: 700, minWidth: 60, textAlign: "center" }}>{guests} Kişi</span>
                <button onClick={() => setGuests(g => Math.min(settings.maxGuests, g + 1))} style={{ ...resCountBtn, background: "#b83a0c" }}>+</button>
              </div>
            </div>

            <button onClick={() => setStep(2)} disabled={!time}
              style={{ ...resBtnPrimary, width: "100%", opacity: time ? 1 : 0.4, cursor: time ? "pointer" : "not-allowed" }}>
              Devam Et →
            </button>
          </div>
        )}

        {/* STEP 2 — İletişim Bilgileri */}
        {step === 2 && (
          <div>
            <h3 style={{ color: "#e8a020", fontFamily: "'Playfair Display',serif", fontSize: 20, margin: "0 0 6px" }}>İletişim Bilgileri</h3>
            <p style={{ color: "#7a5535", fontSize: 13, margin: "0 0 24px" }}>{formatDateTR(date)} — {time} — {guests} kişi</p>

            {[
              { label: "Ad Soyad *", val: name, set: setName, type: "text", placeholder: "Ahmet Yılmaz" },
              { label: "Telefon Numarası *", val: phone, set: setPhone, type: "tel", placeholder: "05XX XXX XX XX" },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 16 }}>
                <label style={{ color: "#a07850", fontSize: 12, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 8 }}>{f.label}</label>
                <input
                  type={f.type}
                  value={f.val}
                  onChange={e => f.set(e.target.value)}
                  placeholder={f.placeholder}
                  style={{ width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(232,160,32,0.3)", color: "#f0e0c0", borderRadius: 12, padding: "12px 14px", fontSize: 15, fontFamily: "inherit", boxSizing: "border-box" }}
                />
              </div>
            ))}

            <div style={{ marginBottom: 28 }}>
              <label style={{ color: "#a07850", fontSize: 12, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Özel İstek / Not (isteğe bağlı)</label>
              <textarea value={note} onChange={e => setNote(e.target.value)}
                placeholder="Doğum günü pastası, özel masa tercihi..."
                rows={3}
                style={{ width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(232,160,32,0.3)", color: "#f0e0c0", borderRadius: 12, padding: "12px 14px", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", resize: "none" }}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, background: "rgba(255,255,255,0.07)", color: "#a0724a", border: "1px solid rgba(232,160,32,0.2)", borderRadius: 14, padding: 14, fontSize: 15, cursor: "pointer", fontFamily: "'Lato',sans-serif" }}>← Geri</button>
              <button onClick={() => setStep(3)} disabled={!name.trim() || !phone.trim()}
                style={{ ...resBtnPrimary, flex: 2, opacity: (name.trim() && phone.trim()) ? 1 : 0.4, cursor: (name.trim() && phone.trim()) ? "pointer" : "not-allowed" }}>
                İncele →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — Onay */}
        {step === 3 && (
          <div>
            <h3 style={{ color: "#e8a020", fontFamily: "'Playfair Display',serif", fontSize: 20, margin: "0 0 20px" }}>Rezervasyonu Onayla</h3>

            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(232,160,32,0.2)", borderRadius: 16, padding: 20, marginBottom: 24 }}>
              {[
                ["📅 Tarih", formatDateTR(date)],
                ["🕐 Saat", time],
                ["👥 Kişi Sayısı", `${guests} kişi`],
                ["👤 Ad Soyad", name],
                ["📞 Telefon", phone],
                ...(note ? [["📝 Not", note]] : []),
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 14 }}>
                  <span style={{ color: "#a07850" }}>{k}</span>
                  <span style={{ color: "#f0e0c0", fontWeight: 600, textAlign: "right", maxWidth: "55%" }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ background: "rgba(232,160,32,0.08)", border: "1px solid rgba(232,160,32,0.2)", borderRadius: 12, padding: "12px 16px", marginBottom: 24, fontSize: 13, color: "#c8a060", lineHeight: 1.6 }}>
              ℹ️ Rezervasyonunuz otomatik olarak onaylanacak. Lütfen belirtilen saatte işletmemizde olunuz.
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(2)} style={{ flex: 1, background: "rgba(255,255,255,0.07)", color: "#a0724a", border: "1px solid rgba(232,160,32,0.2)", borderRadius: 14, padding: 14, fontSize: 15, cursor: "pointer", fontFamily: "'Lato',sans-serif" }}>← Düzenle</button>
              <button onClick={submit} style={{ ...resBtnPrimary, flex: 2 }}>✓ Onayla</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const resBtnPrimary = { background: "#b83a0c", color: "#fff", border: "none", borderRadius: 14, padding: "15px 20px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Lato',sans-serif" };
const resCountBtn = { width: 44, height: 44, borderRadius: 10, border: "none", color: "#fff", fontSize: 22, fontWeight: 700, cursor: "pointer" };

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN — Rezervasyon Sekmesi
// ═══════════════════════════════════════════════════════════════════════════════
function AdminReservationTab({ refresh }) {
  const store = gs();
  const reservations = store.reservations || [];
  const [filter, setFilter] = useState("bugun"); // "bugun" | "hepsi"
  const [search, setSearch] = useState("");

  const today = todayStr();

  const filtered = reservations
    .filter(r => filter === "bugun" ? r.date === today : true)
    .filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.phone.includes(search) || r.code?.includes(search))
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });

  const cancelRes = async (id) => {
    const s = gs();
    const res = s.reservations.find(r => r.id === id);
    s.reservations = s.reservations.map(r => r.id === id ? { ...r, status: "iptal" } : r);
    ss(s); refresh();
    if (res) await pushReservationToSb({ ...res, status: "iptal" });
  };

  const todayCount = reservations.filter(r => r.date === today && r.status !== "iptal").length;
  const todayGuests = reservations.filter(r => r.date === today && r.status !== "iptal").reduce((sum, r) => sum + r.guests, 0);
  const upcomingCount = reservations.filter(r => r.date >= today && r.status !== "iptal").length;

  const statusColor = (s) => s === "onaylı" ? { bg: "#dcfce7", color: "#166534" } : { bg: "#fee2e2", color: "#991b1b" };

  return (
    <div>
      {/* Özet kartlar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Bugün", val: todayCount, sub: "rezervasyon" },
          { label: "Bugün", val: todayGuests, sub: "misafir" },
          { label: "Toplam", val: upcomingCount, sub: "yaklaşan" },
        ].map((m, i) => (
          <div key={i} style={{ background: "#fff", border: "1px solid #f0e8de", borderRadius: 12, padding: "14px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#b83a0c", fontFamily: "'Playfair Display',serif" }}>{m.val}</div>
            <div style={{ fontSize: 11, color: "#a07850", marginTop: 2 }}>{m.label}</div>
            <div style={{ fontSize: 10, color: "#c0a080" }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Filtre & arama */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {[["bugun", "📅 Bugün"], ["hepsi", "📋 Tümü"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            style={{ padding: "8px 16px", borderRadius: 20, border: "1.5px solid", borderColor: filter === v ? "#b83a0c" : "#e0d0c0", background: filter === v ? "#b83a0c" : "#fff", color: filter === v ? "#fff" : "#888", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            {l}
          </button>
        ))}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Ad, telefon veya kod..."
          style={{ flex: 1, minWidth: 140, border: "1.5px solid #e5d5c5", borderRadius: 10, padding: "8px 12px", fontSize: 13, fontFamily: "inherit", outline: "none" }}
        />
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#bbb", fontSize: 14 }}>
          {filter === "bugun" ? "Bugün için rezervasyon yok" : "Rezervasyon bulunamadı"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(r => {
            const sc = statusColor(r.status);
            return (
              <div key={r.id} style={{ background: "#fff", border: "1px solid #f0e8de", borderRadius: 14, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#1c0e00" }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: "#a07850", marginTop: 2 }}>{r.phone}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>{r.status}</span>
                    {r.status !== "iptal" && (
                      <button onClick={() => cancelRes(r.id)}
                        style={{ background: "#fee2e2", color: "#991b1b", border: "none", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        İptal
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 13, color: "#6a4820", flexWrap: "wrap" }}>
                  <span>📅 {formatDateTR(r.date)}</span>
                  <span>🕐 {r.time}</span>
                  <span>👥 {r.guests} kişi</span>
                  {r.code && <span style={{ color: "#b83a0c", fontWeight: 700 }}>#{r.code}</span>}
                </div>
                {r.note && (
                  <div style={{ marginTop: 10, background: "#faf6f0", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#8a6040", borderLeft: "3px solid #e8d5b0" }}>
                    📝 {r.note}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN — Ayarlar Sekmesi
// ═══════════════════════════════════════════════════════════════════════════════
function SettingsTab({ refresh }) {
  const store = gs();
  const [res, setRes] = useState({ ...store.restaurant });
  const [biz, setBiz] = useState({ ...(store.businessInfo || {}) });
  const [resv, setResv] = useState({ ...(store.reservationSettings || {}) });
  const [saved, setSaved] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState(null);
  // Supabase cfg
  const [sbUrl, setSbUrl] = useState(getSbCfg().url || "");
  const [sbKey, setSbKey] = useState(getSbCfg().key || "");
  const [sbMsg, setSbMsg] = useState(null);
  const [sbTesting, setSbTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const save = async () => {
    const s = gs();
    s.restaurant = { ...res };
    s.businessInfo = { ...biz };
    s.reservationSettings = { ...resv };
    ss(s);
    refresh();
    await pushSettingsToSb(s);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const saveSbConfig = async () => {
    if (!sbUrl.trim() || !sbKey.trim()) {
      setSbMsg({ type: "err", text: "URL ve Key alanları boş bırakılamaz" });
      return;
    }
    setSbTesting(true);
    setSbMsg(null);
    saveSbCfg({ url: sbUrl.trim(), key: sbKey.trim() });
    resetSb();
    // SDK yükle ve bağlantıyı test et
    loadSupabaseSdk(async () => {
      const sb = getSb();
      if (!sb) {
        setSbMsg({ type: "err", text: "Supabase SDK yüklenemedi" });
        setSbTesting(false);
        return;
      }
      try {
        const { error } = await sb.from("settings").select("id").limit(1);
        if (error && error.code === "42P01") {
          // Tablo yok ama bağlantı çalışıyor
          setSbMsg({ type: "warn", text: "Bağlantı başarılı! Tablolar henüz yok — aşağıdaki SQL'i çalıştır." });
        } else if (error) {
          setSbMsg({ type: "err", text: "Hata: " + error.message });
        } else {
          setSbMsg({ type: "ok", text: "✓ Bağlantı başarılı! Veriler Supabase'e kaydediliyor." });
          await syncFromSupabase(); // notifyStoreUpdate otomatik tetikler
        }
      } catch(e) {
        setSbMsg({ type: "err", text: "Bağlantı kurulamadı: " + e.message });
      }
      setSbTesting(false);
    });
  };

  const clearSbConfig = () => {
    if (!window.confirm("Supabase bağlantısını kaldır? Veriler localStorage'a dönecek.")) return;
    localStorage.removeItem(SB_LS_KEY);
    resetSb();
    setSbUrl(""); setSbKey("");
    setSbMsg({ type: "ok", text: "Bağlantı kaldırıldı. Uygulama localStorage modunda çalışıyor." });
  };

  const SQL_SCHEMA = [
    '-- Supabase SQL Editor a yapistir ve calistir',
    '',
    'create table if not exists settings (',
    '  id integer primary key default 1,',
    '  restaurant jsonb,',
    '  business_info jsonb,',
    '  reservation_settings jsonb,',
    "  admin_password text default '1234',",
    '  constraint single_row check (id = 1)',
    ');',
    '',
    'create table if not exists categories (',
    '  id text primary key,',
    '  name text,',
    '  icon text,',
    "  items jsonb default '[]',",
    '  sort_order integer default 0',
    ');',
    '',
    'create table if not exists orders (',
    '  id bigint primary key,',
    '  table_id integer,',
    '  items jsonb,',
    '  note text,',
    '  total integer,',
    '  time text,',
    '  date text,',
    '  timestamp bigint,',
    "  status text default 'beklemede'",
    ');',
    '',
    'create table if not exists reservations (',
    '  id bigint primary key,',
    '  code text,',
    '  date text,',
    '  time text,',
    '  guests integer,',
    '  name text,',
    '  phone text,',
    '  note text,',
    "  status text default 'onayliý',",
    '  created_at text',
    ');',
    '',
    '-- Realtime aktif et',
    'alter publication supabase_realtime add table orders;',
    'alter publication supabase_realtime add table reservations;',
    '',
    '-- RLS politikalari',
    'alter table settings enable row level security;',
    'alter table categories enable row level security;',
    'alter table orders enable row level security;',
    'alter table reservations enable row level security;',
    '',
    'create policy "public all" on settings for all using (true);',
    'create policy "public all" on categories for all using (true);',
    'create policy "public all" on orders for all using (true);',
    'create policy "public all" on reservations for all using (true);',
  ].join('\n');

  const changePwFn = async () => {
    const s = gs();
    const current = s.adminPassword || "1234";
    if (pwCurrent !== current) { setPwMsg({ type: "err", text: "Mevcut şifre hatalı" }); return; }
    if (pwNew.length < 4) { setPwMsg({ type: "err", text: "Yeni şifre en az 4 karakter olmalı" }); return; }
    if (pwNew !== pwConfirm) { setPwMsg({ type: "err", text: "Yeni şifreler eşleşmiyor" }); return; }
    s.adminPassword = pwNew;
    ss(s);
    await pushSettingsToSb(s);
    setPwCurrent(""); setPwNew(""); setPwConfirm("");
    setPwMsg({ type: "ok", text: "Şifre başarıyla değiştirildi ✓" });
    setTimeout(() => setPwMsg(null), 3000);
  };

  const inp = { border: "1.5px solid #e5d5c5", borderRadius: 8, padding: "9px 11px", fontSize: 14, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box", background: "#fff" };
  const lbl = { display: "block", fontSize: 12, fontWeight: 700, color: "#a07850", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 };
  const group = { marginBottom: 16 };

  return (
    <div>
      {/* ── İşletme Kimliği ── */}
      <div style={adminCard}>
        <div style={secTitle}>🍴 İşletme Kimliği</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={group}>
            <label style={lbl}>İşletme Adı</label>
            <input style={inp} value={res.name || ""} onChange={e => setRes(p => ({ ...p, name: e.target.value }))} placeholder="Lezzet Ocağı" />
          </div>
          <div style={group}>
            <label style={lbl}>Logo (emoji)</label>
            <input style={{ ...inp, fontSize: 22, textAlign: "center" }} value={res.logo || ""} onChange={e => setRes(p => ({ ...p, logo: e.target.value }))} placeholder="🍴" maxLength={4} />
          </div>
        </div>
        <div style={group}>
          <label style={lbl}>Alt Başlık / Slogan</label>
          <input style={inp} value={res.tagline || ""} onChange={e => setRes(p => ({ ...p, tagline: e.target.value }))} placeholder="Geleneksel Türk Mutfağı" />
        </div>
      </div>

      {/* ── İletişim & Konum ── */}
      <div style={adminCard}>
        <div style={secTitle}>📞 İletişim & Konum</div>
        <div style={group}>
          <label style={lbl}>Telefon Numarası</label>
          <input style={inp} value={biz.phone || ""} onChange={e => setBiz(p => ({ ...p, phone: e.target.value }))} placeholder="0212 000 00 00" type="tel" />
        </div>
        <div style={group}>
          <label style={lbl}>Adres</label>
          <input style={inp} value={biz.address || ""} onChange={e => setBiz(p => ({ ...p, address: e.target.value }))} placeholder="Atatürk Cad. No:12, İstanbul" />
        </div>
        <div style={group}>
          <label style={lbl}>Google Maps Linki (isteğe bağlı)</label>
          <input style={inp} value={biz.googleMaps || ""} onChange={e => setBiz(p => ({ ...p, googleMaps: e.target.value }))} placeholder="https://maps.google.com/..." />
        </div>
        <div style={group}>
          <label style={lbl}>Instagram (isteğe bağlı)</label>
          <input style={inp} value={biz.instagram || ""} onChange={e => setBiz(p => ({ ...p, instagram: e.target.value }))} placeholder="@lezzetocagi" />
        </div>
      </div>

      {/* ── Çalışma Saatleri ── */}
      <div style={adminCard}>
        <div style={secTitle}>🕐 Çalışma Saatleri</div>
        <div style={group}>
          <label style={lbl}>Çalışma Günleri</label>
          <input style={inp} value={biz.workDays || ""} onChange={e => setBiz(p => ({ ...p, workDays: e.target.value }))} placeholder="Her gün / Pazartesi–Cumartesi" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={group}>
            <label style={lbl}>Açılış Saati</label>
            <input style={inp} type="time" value={biz.openTime || "09:00"} onChange={e => setBiz(p => ({ ...p, openTime: e.target.value }))} />
          </div>
          <div style={group}>
            <label style={lbl}>Kapanış Saati</label>
            <input style={inp} type="time" value={biz.closeTime || "23:00"} onChange={e => setBiz(p => ({ ...p, closeTime: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* ── Rezervasyon Ayarları ── */}
      <div style={adminCard}>
        <div style={secTitle}>📅 Rezervasyon Ayarları</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={group}>
            <label style={lbl}>Slot Süresi (dk)</label>
            <select style={inp} value={resv.slotMinutes || 60} onChange={e => setResv(p => ({ ...p, slotMinutes: Number(e.target.value) }))}>
              {[30, 45, 60, 90, 120].map(v => <option key={v} value={v}>{v} dakika</option>)}
            </select>
          </div>
          <div style={group}>
            <label style={lbl}>Slotta Max Rezervasyon</label>
            <input style={inp} type="number" min={1} max={20} value={resv.maxPerSlot || 4} onChange={e => setResv(p => ({ ...p, maxPerSlot: Number(e.target.value) }))} />
          </div>
          <div style={group}>
            <label style={lbl}>Rezervasyon Açılışı</label>
            <input style={inp} type="time" value={resv.openTime || "09:00"} onChange={e => setResv(p => ({ ...p, openTime: e.target.value }))} />
          </div>
          <div style={group}>
            <label style={lbl}>Rezervasyon Kapanışı</label>
            <input style={inp} type="time" value={resv.closeTime || "23:00"} onChange={e => setResv(p => ({ ...p, closeTime: e.target.value }))} />
          </div>
        </div>
        <div style={group}>
          <label style={lbl}>Tek Rezervasyonda Max Kişi</label>
          <input style={{ ...inp, maxWidth: 120 }} type="number" min={1} max={50} value={resv.maxGuests || 10} onChange={e => setResv(p => ({ ...p, maxGuests: Number(e.target.value) }))} />
        </div>
      </div>

      {/* ── Supabase Bağlantısı ── */}
      <div style={adminCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={secTitle}>☁️ Supabase Bağlantısı</div>
          <div style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
            background: sbUrl ? "#dcfce7" : "#f3f4f6",
            color: sbUrl ? "#166534" : "#888" }}>
            {sbUrl ? "● Bağlı" : "● Bağlı değil"}
          </div>
        </div>

        <div style={{ background: "#fffbf5", border: "1px solid #f0e8de", borderRadius: 10, padding: "10px 12px", fontSize: 12, color: "#8a6040", marginBottom: 14, lineHeight: 1.6 }}>
          Supabase bağlantısı olmadan veriler sadece bu tarayıcıda tutulur. Bağlandıktan sonra tüm cihazlar aynı veriyi görür, siparişler anlık güncellenir.
        </div>

        <div style={group}>
          <label style={lbl}>Project URL</label>
          <input style={inp} value={sbUrl} onChange={e => setSbUrl(e.target.value)}
            placeholder="https://xxxx.supabase.co" />
        </div>
        <div style={group}>
          <label style={lbl}>Anon Key</label>
          <div style={{ position: "relative" }}>
            <input style={{ ...inp, paddingRight: 44, fontFamily: "monospace", fontSize: 12 }}
              type={showKey ? "text" : "password"}
              value={sbKey} onChange={e => setSbKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." />
            <button onClick={() => setShowKey(p => !p)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 15, color: "#a07850" }}>
              {showKey ? "🙈" : "👁"}
            </button>
          </div>
          <div style={{ fontSize: 11, color: "#c0a080", marginTop: 4 }}>
            Supabase → Project Settings → API → anon public key
          </div>
        </div>

        {sbMsg && (
          <div style={{ borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 12,
            background: sbMsg.type === "ok" ? "#dcfce7" : sbMsg.type === "warn" ? "#fef9c3" : "#fee2e2",
            color: sbMsg.type === "ok" ? "#166534" : sbMsg.type === "warn" ? "#713f12" : "#991b1b" }}>
            {sbMsg.text}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <button onClick={saveSbConfig} disabled={sbTesting}
            style={{ background: "#b83a0c", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: sbTesting ? 0.6 : 1 }}>
            {sbTesting ? "⏳ Test ediliyor..." : "🔗 Bağlan & Test Et"}
          </button>
          {getSbCfg().url && sbUrl && (
            <button onClick={clearSbConfig}
              style={{ background: "#fee2e2", color: "#991b1b", border: "none", borderRadius: 10, padding: "10px 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              Bağlantıyı Kaldır
            </button>
          )}
        </div>

        {/* SQL Şeması */}
        <div style={{ borderTop: "1px solid #f0e8de", paddingTop: 14, marginTop: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#8a6040", marginBottom: 8 }}>
            📋 Supabase SQL Şeması
          </div>
          <div style={{ fontSize: 12, color: "#b0a090", marginBottom: 8, lineHeight: 1.5 }}>
            Supabase → SQL Editor'a kopyalayıp çalıştır. İlk kurulumda bir kez yapılır.
          </div>
          <textarea readOnly value={SQL_SCHEMA}
            style={{ width: "100%", height: 120, fontFamily: "monospace", fontSize: 11, background: "#1c0e00", color: "#e8d5b0", border: "none", borderRadius: 8, padding: "10px 12px", resize: "none", boxSizing: "border-box" }} />
          <button onClick={() => { navigator.clipboard.writeText(SQL_SCHEMA); setSbMsg({ type: "ok", text: "SQL kopyalandı!" }); setTimeout(() => setSbMsg(null), 2000); }}
            style={{ marginTop: 6, background: "#1c0e00", color: "#e8a020", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            📋 SQL'i Kopyala
          </button>
        </div>
      </div>

      {/* ── Şifre Değiştir ── */}
      <div style={adminCard}>
        <div style={secTitle}>🔐 Admin Şifresi</div>
        <div style={{ ...group, marginBottom: 12 }}>
          <label style={lbl}>Mevcut Şifre</label>
          <input style={inp} type="password" value={pwCurrent} onChange={e => setPwCurrent(e.target.value)} placeholder="••••" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div style={group}>
            <label style={lbl}>Yeni Şifre</label>
            <input style={inp} type="password" value={pwNew} onChange={e => setPwNew(e.target.value)} placeholder="••••" />
          </div>
          <div style={group}>
            <label style={lbl}>Yeni Şifre (tekrar)</label>
            <input style={inp} type="password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} placeholder="••••" />
          </div>
        </div>
        {pwMsg && (
          <div style={{ background: pwMsg.type === "ok" ? "#dcfce7" : "#fee2e2", color: pwMsg.type === "ok" ? "#166534" : "#991b1b", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 12 }}>
            {pwMsg.text}
          </div>
        )}
        <button onClick={changePwFn}
          style={{ background: "#1c0e00", color: "#e8a020", border: "1px solid rgba(232,160,32,0.3)", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          Şifreyi Güncelle
        </button>
        <div style={{ marginTop: 10, fontSize: 12, color: "#c0a080" }}>
          Varsayılan şifre: <code style={{ fontFamily: "monospace", background: "#f0e8de", padding: "1px 6px", borderRadius: 4 }}>1234</code> — hemen değiştirmeniz önerilir.
        </div>
      </div>

      {/* ── Kaydet ── */}
      <div style={{ position: "sticky", bottom: 0, background: "#f5f0ea", paddingTop: 12, paddingBottom: 16, marginTop: 8 }}>
        <button onClick={save}
          style={{ width: "100%", background: saved ? "#16a34a" : "#b83a0c", color: "#fff", border: "none", borderRadius: 14, padding: "15px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "background .3s" }}>
          {saved ? "✓ Kaydedildi!" : "💾 Değişiklikleri Kaydet"}
        </button>
      </div>
    </div>
  );
}
