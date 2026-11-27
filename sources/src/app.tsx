import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Home as HomeI, Compass, BellRing, Heart, Store, Bell, User, MapPin, LayoutDashboard, Package, Plus, Target, Crown, Settings, Calculator, Users, Flag, Layers, ShieldCheck, RotateCcw, Search, X, ChevronDown, Ban, Palette, ShoppingBag, Map as MapIco, Star, FileSpreadsheet, Users as UsersIco } from "lucide-react";
import { TeamPage, ActAsBanner, NoAccess } from "./team";
import { ImportPage } from "./import";
import { can as roleCan, ROUTE_PERM } from "./staff";
import { StoreProvider, useStore, myMerchants } from "./store";
import { AuthModal, NeedAccount } from "./auth";
import { NavCtx, Mode, Route } from "./nav";
import { Logo, Toasts, cx, IconBtn, Modal, Btn, MerchantLogo } from "./ui";
import { Home, Explore, ProductPage, AlertsPage, FavoritesPage, MerchantsPage, MerchantPage, ProfilePage, SearchBox, NotificationsPanel, LocationPicker } from "./consumer";
import { MerchantDashboard, PostsPage, PublishPage, DemandPage, PlansPage, ShopProfile, useMe } from "./merchant";
import { FinanceSimulator } from "./finance-ui";
import { AdminOverview, AdminMerchants, AdminUsers, AdminPosts, AdminCategories } from "./admin";
import { AdminReports, MerchantModeration } from "./moderation";
import { AdminMerchantsPage, MerchantSignup } from "./signup";
import { planById } from "./data";
import { AdminMerchantDetail } from "./merchant-detail";
import { MerchantReviews, AdminReviews } from "./reviews";
import { MyReservations, MerchantReservations, AdminReservationsPanel } from "./reservations";
import { ThemeProvider, ThemeSettings, useApplyTheme } from "./theme";

const UI_KEY = "arrivage-ui-v2";
// Nettoie les données du prototype (anciennes clés)
try { localStorage.removeItem("arrivage-v1-ui"); localStorage.removeItem("arrivage-v1-state"); } catch {}
const DEFAULT_ROUTE: Record<Mode, Route> = { consumer: { name: "home" }, merchant: { name: "dashboard" }, admin: { name: "overview" } };
function loadUI() {
  try { const x = JSON.parse(localStorage.getItem(UI_KEY) || "null"); if (x && x.mode && x.routes) return x; } catch {}
  return { mode: "consumer", routes: { ...DEFAULT_ROUTE } };
}

function SpaceBar({ mode, setMode, go, route }: any) {
  const { s } = useStore();
  const admin = s.me?.role === "admin";
  const merchant = admin || myMerchants(s).length > 0;
  if (!s.me || (!merchant && !admin)) return null;
  const opts = [{ v: "consumer", l: "Site client", s: "Client" }, ...(merchant ? [{ v: "merchant", l: "Mon commerce", s: "Pro" }] : []), ...(admin ? [{ v: "admin", l: "Admin et finances", s: "Admin" }] : [])];
  return (
    <div className="demobar">
      <div className="demobar-in">
        <span className="demobar-l"><span className="live-dot" /> {s.me.displayName}</span>
        <div className="mode-switch" role="tablist" aria-label="Espace">
          {opts.map((o) => (
            <button key={o.v} role="tab" aria-selected={mode === o.v} className={cx(mode === o.v && "is-on")} onClick={() => setMode(o.v)}><span className="hide-xs">{o.l}</span><span className="show-xs">{o.s}</span></button>
          ))}
        </div>
        <span className="demobar-r hide-sm">{admin ? "Compte administrateur" : "Compte commerçant"}</span>
        <button className={cx("demobar-theme", route.name === "theme" && "is-on")} onClick={() => go("theme")} title="Personnaliser le thème de cet espace"><Palette size={14} /><span className="hide-sm">Thème</span></button>
      </div>
    </div>
  );
}

// ---------- Consommateur ----------
function ConsumerShell({ route, go }: any) {
  const { s, openAuth } = useStore();
  const [notif, setNotif] = useState(false);
  const [loc, setLoc] = useState(false);
  const [msearch, setMsearch] = useState(false);
  const unread = s.notifications.filter((n) => !n.read).length;
  const resActive = s.reservations.filter((r) => r.buyerId === s.me?.id && (r.status === "paid" || r.status === "ready")).length;
  const links = [
    { n: "home", l: "Accueil", i: HomeI }, { n: "explore", l: "Explorer", i: Compass }, { n: "alerts", l: "Alertes", i: BellRing },
    { n: "favorites", l: "Favoris", i: Heart }, { n: "merchants", l: "Commerces", i: Store }, { n: "orders", l: "Réservations", i: ShoppingBag, desk: true },
  ];
  const page = (() => {
    switch (route.name) {
      case "explore": return <Explore params={route.params} />;
      case "product": return <ProductPage params={route.params} />;
      case "alerts": return <AlertsPage params={route.params} />;
      case "favorites": return <FavoritesPage />;
      case "merchants": return <MerchantsPage params={route.params} />;
      case "merchant": return <MerchantPage params={route.params} />;
      case "profile": return <ProfilePage />;
      case "signup": return <MerchantSignup />;
      case "orders": return s.me ? <MyReservations /> : <NeedAccount title="Mes réservations" body="Connectez-vous pour voir et suivre vos réservations." />;
      case "theme": return <ThemeSettings />;
      default: return <Home />;
    }
  })();
  const isActive = (n: string) => route.name === n || (n === "explore" && route.name === "product") || (n === "merchants" && route.name === "merchant");
  return (
    <div className="shell-c">
      <header className="chead">
        <div className="chead-in">
          <button className="logo-btn" onClick={() => go("home")} aria-label="Accueil ARRIVAGE"><Logo size={24} /></button>
          <div className="chead-search hide-md"><SearchBox initial={route.name === "explore" ? route.params?.q || "" : ""} /></div>
          <nav className="cnav hide-md">{links.slice(1).map((x) => <button key={x.n} className={cx(isActive(x.n) && "is-on")} onClick={() => go(x.n, {})}>{x.l}</button>)}</nav>
          <div className="chead-r">
            <button className="locbtn" onClick={() => setLoc(true)}><MapPin size={15} /><span>{s.profile.commune || "Tout le territoire"}</span><ChevronDown size={14} className="hide-xs" /></button>
            <IconBtn icon={Search} label="Rechercher" className="show-md" onClick={() => setMsearch(true)} />
            <div className="bell-wrap show-md"><IconBtn icon={ShoppingBag} label="Mes réservations" active={route.name === "orders"} onClick={() => go("orders")} />{resActive > 0 && <span className="badge">{resActive}</span>}</div>
            <div className="bell-wrap"><IconBtn icon={Bell} label="Notifications" onClick={() => setNotif(true)} />{unread > 0 && <span className="badge">{unread}</span>}</div>
            {s.me ? <IconBtn icon={User} label="Mon compte" active={route.name === "profile"} onClick={() => go("profile")} /> : <button className="btn btn-primary btn-sm chead-login" onClick={() => openAuth()}><User size={15} /><span className="hide-xs">Se connecter</span></button>}
          </div>
        </div>
      </header>
      {s.me?.blocked && <div className="blocked-banner"><Ban size={15} /> Votre compte a été bloqué par la modération : vous ne pouvez plus réserver, signaler ni publier d'avis. Écrivez à contact@arrivagenc.com pour en savoir plus.</div>}
      <main className="cmain" key={route.name + JSON.stringify(route.params || {})}>{page}</main>
      <footer className="cfoot">
        <div><Logo size={18} /><p>Tout ce qui débarque, au même endroit.</p><button className="link" onClick={() => go("signup")}>Vous êtes commerçant ? Inscrire mon commerce</button></div>
        <p className="muted small">Prix et disponibilités sont déclarés par les commerçants. Les produits réservés sont mis de côté et réglés directement en magasin. Contact : <a href="mailto:contact@arrivagenc.com">contact@arrivagenc.com</a></p>
      </footer>
      <nav className="bottomnav show-md">
        {links.filter((x: any) => !x.desk).map((x) => <button key={x.n} className={cx(isActive(x.n) && "is-on")} onClick={() => go(x.n, {})}><x.i size={20} strokeWidth={isActive(x.n) ? 2.3 : 1.8} /><span>{x.l}</span></button>)}
      </nav>
      <NotificationsPanel open={notif} onClose={() => setNotif(false)} />
      <LocationPicker open={loc} onClose={() => setLoc(false)} />
      <Modal open={msearch} onClose={() => setMsearch(false)} title="Rechercher" side>
        <SearchBox autoFocus onDone={() => setMsearch(false)} />
        <p className="muted small" style={{ marginTop: 14 }}>Produit, marque, commerce, catégorie ou mot-clé.</p>
      </Modal>
    </div>
  );
}

// ---------- Commerçant ----------
function MerchantShell(props: any) {
  const { s } = useStore();
  const me = useMe();
  if (!me) return <div className="shell-c"><main className="cmain"><MerchantSignup /></main></div>;
  return <MerchantShellIn {...props} />;
}
function MerchantShellIn({ route, go }: any) {
  const { s, mutate, toast } = useStore();
  const me = useMe();
  const plan = planById(me.plan);
  const acting = s.actAs ? s.staff.find((x) => x.id === s.actAs && x.merchantId === me.id) : undefined;
  const resNew = s.reservations.filter((r) => r.merchantId === me.id && r.merchantUnread).length;
  const modUnread = s.reports.filter((r) => r.merchantUnread && s.products.find((p) => p.id === r.productId)?.merchantId === me.id).length;
  const items: any[] = [
    { n: "dashboard", l: "Tableau de bord", s: "Accueil", i: LayoutDashboard },
    { n: "posts", l: "Publications", s: "Publications", i: Package },
    { n: "publish", l: "Publier un arrivage", s: "Publier", i: Plus, cta: true },
    { n: "import", l: "Import Excel", s: "Import", i: FileSpreadsheet, lock: !plan.can.bulkImport },
    { n: "demand", l: "Demande locale", s: "Demande", i: Target, lock: !plan.can.demand },
    { n: "reservations", l: "Réservations", s: "Réservations", i: ShoppingBag, badge: resNew },
    { n: "reviews", l: "Avis clients", s: "Avis", i: Star },
    { n: "moderation", l: "Modération", s: "Modération", i: ShieldCheck, badge: modUnread },
        { n: "plans", l: "Forfaits", s: "Forfaits", i: Crown },
    { n: "shop", l: "Ma fiche", s: "Fiche", i: Settings },
    { n: "theme", l: "Personnalisation", s: "Thème", i: Palette },
  ].filter((x) => !acting || ROUTE_PERM[x.n] == null || roleCan(acting.role, ROUTE_PERM[x.n]!));
  const blocked = acting && ROUTE_PERM[route.name] != null && !roleCan(acting.role, ROUTE_PERM[route.name]!);
  const page = blocked ? <NoAccess member={acting!} /> : (() => {
    switch (route.name) {
      case "import": return <ImportPage />;
      case "team": return <TeamPage />;
      case "posts": return <PostsPage />;
      case "publish": return <PublishPage params={route.params} key={route.params?.id || "new"} />;
      case "demand": return <DemandPage />;
      case "plans": return <PlansPage />;
      case "shop": return <ShopProfile />;
      case "moderation": return <MerchantModeration />;
      case "theme": return <ThemeSettings />;
      case "reservations": return <MerchantReservations merchantId={me.id} />;
      case "reviews": return <MerchantReviews merchantId={me.id} />;
      default: return <MerchantDashboard />;
    }
  })();
  useEffect(() => { if (resNew > 0) toast(`${resNew} nouvelle${resNew > 1 ? "s" : ""} réservation${resNew > 1 ? "s" : ""} payée${resNew > 1 ? "s" : ""} pour ${me.name}`, "info"); }, [me.id]);
  const switcher = (
    <label className="mswitch">
      <MerchantLogo m={me} size={34} />
      <div><span className="micro">{s.me?.role === "admin" ? "Commerce affiché" : "Mon commerce"}</span><select id="merchant-switch" value={me.id} onChange={(e) => { mutate((d) => { d.currentMerchant = e.target.value; d.actAs = null; }); go("dashboard"); }} aria-label="Commerce">{(s.me?.role === "admin" ? s.merchants : myMerchants(s)).filter((m) => m.status !== "rejected").map((m) => <option key={m.id} value={m.id}>{m.name}{m.status === "pending" ? " (en attente)" : m.status === "suspended" ? " (suspendu)" : ""}</option>)}</select></div>
      <ChevronDown size={14} />
    </label>
  );
  return (
    <div className="shell-side">
      <aside className="side hide-md">
        <div className="side-logo"><Logo size={22} light /><span className="side-tag">Pro</span></div>
        {switcher}
        <nav className="side-nav">
          {items.map((x) => <button key={x.n} className={cx(route.name === x.n && "is-on", x.cta && "side-cta")} onClick={() => go(x.n, {})}><x.i size={18} />{x.l}{x.lock && <Crown size={13} className="side-lock" />}{x.badge ? <span className="side-badge">{x.badge}</span> : null}</button>)}
        </nav>
        <div className="side-foot"><span className={cx("plan-badge", `plan-${plan.id}`)}>{plan.name}</span><span className="micro">{me.status === "pending" ? "En attente de validation" : me.status === "suspended" ? "Suspendu" : "En ligne"}</span></div>
      </aside>
      <div className="side-main">
        <div className="mtop show-md">{switcher}<div className="mtop-links"><button className={cx(route.name === "moderation" && "is-on")} onClick={() => go("moderation")}><ShieldCheck size={15} /> Modération{modUnread ? <span className="side-badge">{modUnread}</span> : null}</button><button className={cx(route.name === "shop" && "is-on")} onClick={() => go("shop")}><Settings size={15} /> Ma fiche</button>{(!acting || roleCan(acting.role, "publish")) && <button className={cx(route.name === "import" && "is-on")} onClick={() => go("import")}><FileSpreadsheet size={15} /> Import</button>}{(!acting || roleCan(acting.role, "billing")) && <button className={cx(route.name === "plans" && "is-on")} onClick={() => go("plans")}><Crown size={15} /> Forfaits</button>}<button className={cx(route.name === "reviews" && "is-on")} onClick={() => go("reviews")}><Star size={15} /> Avis</button><button className={cx(route.name === "theme" && "is-on")} onClick={() => go("theme")}><Palette size={15} /> Thème</button></div></div>
        {acting && <ActAsBanner member={acting} />}
        <main key={route.name + (route.params?.id || "")}>{page}</main>
      </div>
      <nav className="bottomnav show-md">
        {items.filter((x) => x.n !== "shop" && x.n !== "moderation" && x.n !== "theme" && x.n !== "plans" && x.n !== "reviews" && x.n !== "team" && x.n !== "import").map((x) => <button key={x.n} className={cx(route.name === x.n && "is-on", x.cta && "bn-cta")} onClick={() => go(x.n, {})}><x.i size={20} /><span>{x.s}</span></button>)}
      </nav>
    </div>
  );
}

// ---------- Administrateur ----------
function AdminShell({ route, go }: any) {
  const { s } = useStore();
  const open = s.reports.filter((r) => r.status === "open" || r.status === "fixed").length;
  const items = [
    { n: "overview", l: "Vue d'ensemble", i: LayoutDashboard }, { n: "finance", l: "Simulateur financier", i: Calculator },
    { n: "merchants", l: "Commerçants", i: Store, badge: s.merchants.filter((m) => m.status === "pending").length }, { n: "users", l: "Utilisateurs", i: Users }, { n: "posts", l: "Publications", i: Package },
    { n: "categories", l: "Catégories", i: Layers }, { n: "reports", l: "Signalements", i: Flag, badge: open },
    { n: "reviews", l: "Avis clients", i: Star, badge: s.reviews.filter((r) => r.status === "pending").length },
    { n: "theme", l: "Personnalisation", i: Palette },
  ];
  const page = (() => {
    switch (route.name) {
      case "finance": return <FinanceSimulator />;
      case "merchants": return <AdminMerchantsPage />;
      case "users": return <AdminUsers />;
      case "posts": return <AdminPosts />;
      case "categories": return <AdminCategories />;
      case "reports": return <AdminReports />;
      case "merchant": return <AdminMerchantDetail id={route.params?.id} />;
      case "reviews": return <AdminReviews />;
      case "theme": return <ThemeSettings />;
      default: return <AdminOverview />;
    }
  })();
  return (
    <div className="shell-side shell-admin">
      <aside className="side hide-md">
        <div className="side-logo"><Logo size={22} light /><span className="side-tag">Admin</span></div>
        <nav className="side-nav">{items.map((x) => <button key={x.n} className={cx((route.name === x.n || (x.n === "merchants" && route.name === "merchant")) && "is-on")} onClick={() => go(x.n)}><x.i size={18} />{x.l}{x.badge ? <span className="side-badge">{x.badge}</span> : null}</button>)}</nav>
        <div className="side-foot"><ShieldCheck size={14} /><span className="micro">Espace administrateur</span></div>
      </aside>
      <div className="side-main">
        <nav className="atabs show-md">{items.map((x) => <button key={x.n} className={cx((route.name === x.n || (x.n === "merchants" && route.name === "merchant")) && "is-on")} onClick={() => go(x.n)}><x.i size={15} />{x.l}{x.badge ? <span className="side-badge">{x.badge}</span> : null}</button>)}</nav>
        <main key={route.name}>{page}</main>
      </div>
    </div>
  );
}

function App() {
  const [ui, setUi] = useState(loadUI);
  const [hist, setHist] = useState<Record<string, Route[]>>({ consumer: [], merchant: [], admin: [] });
  useEffect(() => { try { localStorage.setItem(UI_KEY, JSON.stringify(ui)); } catch {} }, [ui]);
  const { s } = useStore();
  const allowed = (m: Mode) => m === "consumer" || (m === "admin" ? s.me?.role === "admin" : !!s.me && (s.me.role === "admin" || myMerchants(s).length > 0 || m === "merchant"));
  const mode: Mode = s.ready && allowed(ui.mode) ? ui.mode : "consumer";
  const route: Route = ui.routes[mode] || DEFAULT_ROUTE[mode];
  const go = (name: string, params?: any) => {
    setHist((h) => ({ ...h, [mode]: [...(h[mode] || []).slice(-30), route] }));
    setUi((u: any) => ({ ...u, routes: { ...u.routes, [mode]: { name, params } } }));
    window.scrollTo({ top: 0, behavior: "instant" as any });
  };
  const back = () => {
    const h = hist[mode] || [];
    const prev = h[h.length - 1] || DEFAULT_ROUTE[mode];
    setHist((x) => ({ ...x, [mode]: h.slice(0, -1) }));
    setUi((u: any) => ({ ...u, routes: { ...u.routes, [mode]: prev } }));
  };
  useApplyTheme(mode);
  const setMode = (m: Mode, r?: Route) => { setUi((u: any) => ({ mode: m, routes: { ...u.routes, ...(r ? { [m]: r } : {}) } })); window.scrollTo({ top: 0 }); };
  return (
    <NavCtx.Provider value={{ mode, route, go, back, setMode }}>
      <div className={cx("app", `mode-${mode}`, !(s.me && (s.me.role === "admin" || myMerchants(s).length > 0)) && "no-bar")}>
        <SpaceBar mode={mode} setMode={setMode} go={go} route={route} />
        {mode === "consumer" && <ConsumerShell route={route} go={go} />}
        {mode === "merchant" && <MerchantShell route={route} go={go} />}
        {mode === "admin" && <AdminShell route={route} go={go} />}
        <Toasts />
        <AuthModal />
      </div>
    </NavCtx.Provider>
  );
}

createRoot(document.getElementById("root")!).render(<ThemeProvider><StoreProvider><App /></StoreProvider></ThemeProvider>);
