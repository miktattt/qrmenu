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
  if (!cfg.url || !cfg.key) return null;
  if (!window.supabase) return null;
  try {
    _sb = window.supabase.createClient(cfg.url, cfg.key);
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
