import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, MapPin, Bell, User, Heart, ChevronRight, ChevronLeft, SlidersHorizontal, X, Store, Clock, Phone, Mail,
  Navigation, Share2, BellRing, Flag, Plus, Pencil, Trash2, Copy, Check, Calendar, Package, BadgeCheck, Info, ArrowUpRight, RotateCcw, Megaphone, Palette, ShoppingBag, Shirt, Sparkles, Tag, Flame, Timer, UtensilsCrossed,
} from "lucide-react";
import { CATEGORIES, COMMUNES, STATUSES, liveStatus, daysSince, catById, fmtXPF, fmtNum, fmtRel, fmtDate, fmtDateLong, norm, Product, Merchant, Status, buyLink } from "./data";
import { useStore, alertMatches, Alert, productHay, newId } from "./store";
import { matchScore, correct, termScore, indexOf, words as qWords } from "./search";
import { useNav } from "./nav";
import { RatingBadge, ReviewsBlock } from "./reviews";
import { AccountSection } from "./auth";
import { WantedButton, WantedPrompt, MyWanted } from "./wanted";
import { dealState, dealVisible, dealBadge, dealTitle, dealKindShort, dealWhen, dealPeriod, isRestoProduct, pctOff } from "./deals";
import { pushView } from "./finder";
import { Btn, IconBtn, StatusPill, Chip, ProductVisual, MerchantLogo, MerchantCover, Modal, Empty, SectionHead, Segmented, Field, DemoTag, cx } from "./ui";
import { shareUrl } from "./url";
import { useHScroll, HArrows } from "./hscroll";

// ---------- Sélecteurs ----------
export function useCatalog() {
  const { s } = useStore();
  return useMemo(() => {
    const activeM = new Set(s.merchants.filter((m) => m.status === "active").map((m) => m.id));
    const activeC = new Set(s.categories.filter((c) => c.active).map((c) => c.id));
    const now = Date.now();
    return s.products.filter((p) => p.state === "published" && activeM.has(p.merchantId) && activeC.has(p.category) && dealVisible(p, now));
  }, [s.products, s.merchants, s.categories]);
}
export const popularity = (p: Product, favs: string[]) => p.views + p.favBase * 6 + (favs.includes(p.id) ? 40 : 0) + (p.contacts || 0) * 3;
export const useMerchant = (id: string) => useStore().s.merchants.find((m) => m.id === id);

// ---------- Carte produit ----------
export function FavButton({ id, overlay }: { id: string; overlay?: boolean }) {
  const { s, mutate, toast } = useStore();
  const on = s.favorites.includes(id);
  return (
    <button
      className={cx("fav", overlay && "fav-overlay", on && "is-on")}
      aria-label={on ? "Retirer des favoris" : "Ajouter aux favoris"} aria-pressed={on}
      onClick={(e) => {
        e.stopPropagation();
        mutate((d) => { d.favorites = on ? d.favorites.filter((x) => x !== id) : [id, ...d.favorites]; });
        toast(on ? "Retiré des favoris" : "Ajouté aux favoris");
      }}
    >
      <Heart size={17} strokeWidth={2} fill={on ? "currentColor" : "none"} />
    </button>
  );
}

export function ProductCard({ p, compact }: { p: Product; compact?: boolean }) {
  const { go } = useNav();
  const m = useMerchant(p.merchantId);
  const c = catById(p.category);
  const isSoon = p.status === "soon";
  return (
    <article className={cx("pcard", compact && "pcard-compact", p.status === "out" && "is-out")} onClick={() => go("product", { id: p.id })} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && go("product", { id: p.id })}>
      <div className="pcard-media">
        <ProductVisual p={p} />
        <div className="pcard-top">{p.deal && p.status !== "out" ? <DealPill p={p} small /> : <StatusPill status={p.status} at={p.arrivedAt} small />}</div>
        <FavButton id={p.id} overlay />
        {p.sponsored && <span className="sponso">Sponsorisé</span>}
        {p.deal && dealBadge(p) && dealBadge(p) !== dealTitle(p) && dealBadge(p) !== dealKindShort(p) && <span className={cx("deal-badge", dealState(p) === "upcoming" && "is-soon")}>{dealBadge(p)}</span>}
        {p.tryOn && <span className="tryon-tag"><Shirt size={11} /> Essayable</span>}
      </div>
      <div className="pcard-body">
        <div className="pcard-cat">{c.label}</div>
        <h3 className="pcard-name">{p.name}</h3>
        <div className="pcard-merchant">{m?.name}{m?.verified && <BadgeCheck size={13} className="verified" />}</div>
        <div className="pcard-foot">
          <PriceTag p={p} />
          <span className="pcard-meta">{p.deal ? <><Timer size={12} />{dealWhen(p)}</> : <><MapPin size={12} />{m?.commune} · {isSoon ? "prévu " + fmtRel(p.arrivedAt) : fmtRel(p.publishedAt)}</>}</span>
        </div>
      </div>
    </article>
  );
}

// Prix avec prix barré pour les promotions ; « Prix en magasin » pour une remise sans prix unique
export function PriceTag({ p, big }: { p: Product; big?: boolean }) {
  const was = p.deal?.was && p.deal.was > p.price ? p.deal.was : 0;
  if (!p.price) return <span className={cx("price", big && "pinfo-price")}>{p.deal?.discount || "Prix en magasin"}</span>;
  return <span className={cx("price-wrap", big && "pinfo-price")}><span className={cx("price", was && "price-deal")}>{fmtXPF(p.price)}</span>{was ? <s className="price-was">{fmtXPF(was)}</s> : null}</span>;
}
export function DealPill({ p, small }: { p: Product; small?: boolean }) {
  const st = dealState(p);
  const resto = isRestoProduct(p);
  const Ic = resto && p.deal?.kind !== "promo" ? UtensilsCrossed : Flame;
  return <span className={cx("pill deal-pill", st === "upcoming" && "is-soon", small && "pill-sm")}><Ic size={small ? 11 : 13} />{st === "upcoming" ? "Bientôt · " : ""}{dealTitle(p)}</span>;
}

function Rail({ children }: any) {
  const h = useHScroll<HTMLDivElement>();
  return (
    <div className="rail-wrap">
      <div className="rail" ref={h.ref}>{children}</div>
      <HArrows edge={h.edge} by={h.by} className="harrows-rail" />
    </div>
  );
}

export function NotificationsPanel({ open, onClose }: any) {
  const { s, mutate } = useStore();
  const { go } = useNav();
  const [tab, setTab] = useState("all");
  const list = s.notifications.filter((n) => tab === "all" || !n.read);
  return (
    <Modal open={open} onClose={onClose} title="Notifications" side>
      <div className="row-between" style={{ marginBottom: 12 }}>
        <Segmented size="sm" value={tab} onChange={setTab} options={[{ v: "all", l: "Toutes" }, { v: "unread", l: `Non lues (${s.notifications.filter((n) => !n.read).length})` }]} />
        <button className="link" onClick={() => mutate((d) => d.notifications.forEach((n) => (n.read = true)))}>Tout marquer comme lu</button>
      </div>
      <p className="note"><Info size={14} /> Vos alertes et commerces suivis sont vérifiés à chaque visite sur ARRIVAGE.</p>
      {!list.length && <Empty icon={Bell} title="Aucune notification" body="Créez une alerte pour être prévenu dès qu'un produit arrive." />}
      <div className="notifs">
        {list.map((n) => (
          <div key={n.id} className={cx("notif", !n.read && "is-unread")}>
            <span className={cx("notif-ico", `notif-${n.kind}`)}>{n.kind === "alert" ? <BellRing size={16} /> : n.kind === "follow" ? <Store size={16} /> : n.kind === "order" ? <ShoppingBag size={16} /> : <Info size={16} />}</span>
            <button className="notif-main" onClick={() => {
              mutate((d) => { const x = d.notifications.find((y) => y.id === n.id); if (x) x.read = true; });
              if (n.kind === "order") { onClose(); go("orders"); } else if (n.productId) { onClose(); go("product", { id: n.productId }); }
            }}>
              <strong>{n.title}</strong>
              <span>{n.body}</span>
              <em>{fmtRel(n.at)}</em>
            </button>
            <IconBtn icon={n.read ? Bell : Check} size={15} label={n.read ? "Marquer comme non lue" : "Marquer comme lue"} onClick={() => mutate((d) => { const x = d.notifications.find((y) => y.id === n.id); if (x) x.read = !x.read; })} />
            <IconBtn icon={Trash2} size={15} label="Supprimer" onClick={() => mutate((d) => { d.notifications = d.notifications.filter((y) => y.id !== n.id); })} />
          </div>
        ))}
      </div>
    </Modal>
  );
}

export function LocationPicker({ open, onClose }: any) {
  const { s, mutate, toast } = useStore();
  const pick = (c: string) => { mutate((d) => { d.profile.commune = c; }); toast(c ? `Localisation : ${c}` : "Localisation : tout le territoire", "info"); onClose(); };
  return (
    <Modal open={open} onClose={onClose} title="Votre localisation">
      <p className="muted" style={{ marginTop: 0 }}>Sert à mettre en avant les arrivages proches.</p>
      <div className="chips-wrap">
        <Chip active={!s.profile.commune} onClick={() => pick("")}>Tout le territoire</Chip>
        {COMMUNES.map((c) => <Chip key={c} active={s.profile.commune === c} onClick={() => pick(c)}>{c}</Chip>)}
      </div>
    </Modal>
  );
}

// ---------- Explorer ----------
const DATE_OPTS = [{ v: "all", l: "Toutes dates" }, { v: "24h", l: "24 h" }, { v: "7d", l: "7 jours" }, { v: "30d", l: "30 jours" }];
type SearchTab = "all" | "products" | "shops" | "brands";
const SORT_OPTS = [{ v: "relevance", l: "Pertinence" }, { v: "recent", l: "Plus récents" }, { v: "popular", l: "Popularité" }, { v: "priceAsc", l: "Prix croissant" }, { v: "priceDesc", l: "Prix décroissant" }];
const emptyFilters = { cats: [] as string[], communes: [] as string[], statuses: [] as string[], min: "", max: "", date: "all", sort: "recent", onlyNew: false, tryOn: false, inStock: false, deals: false };
const filtersFrom = (params: any) => ({
  ...emptyFilters, cats: params?.cat ? [params.cat] : [], communes: params?.commune ? [params.commune] : [], statuses: params?.status ? [params.status] : [],
  date: params?.date || "all", sort: params?.sort || (params?.q ? "relevance" : "recent"), inStock: !!params?.stock, tryOn: !!params?.tryOn, deals: !!params?.promo,
});

export function Explore({ params }: any) {
  const { s } = useStore();
  const { go } = useNav();
  const cat = useCatalog();
  const [q, setQ] = useState(params?.q || "");
  const [f, setF] = useState(() => filtersFrom(params));
  const [sheet, setSheet] = useState(false);
  // Type de résultat : null = choisi automatiquement (le premier onglet qui a des résultats)
  const [tab, setTab] = useState<SearchTab | null>(params?.tab || null);
  useEffect(() => {
    setQ(params?.q || ""); setTab(params?.tab || null);
    setF(filtersFrom(params));
  }, [params]);

  const toggle = (k: "cats" | "communes" | "statuses", v: string) => setF((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((y) => y !== v) : [...x[k], v] }));
  const min = f.min === "" ? null : Number(f.min), max = f.max === "" ? null : Number(f.max);
  const priceErr = min != null && max != null && min > max ? "Le prix minimum dépasse le maximum" : "";
  const results = useMemo(() => {
    const nq = norm(q.trim());
    const score = new Map<string, number>();
    let r = cat.filter((p) => {
      const m = s.merchants.find((x) => x.id === p.merchantId)!;
      if (nq) { const sc = matchScore(nq, productHay(p, m)); if (!sc) return false; score.set(p.id, sc + 0.4 * matchScore(nq, `${p.name} ${p.brand || ""}`)); }
      if (f.cats.length && !f.cats.includes(p.category)) return false;
      if (f.communes.length && !f.communes.includes(m.commune)) return false;
      if (f.statuses.length && !f.statuses.includes(liveStatus(p))) return false;
      if (!priceErr && min != null && p.price < min) return false;
      if (!priceErr && max != null && p.price > max) return false;
      if (f.onlyNew && !(["today", "new"].includes(p.status) && daysSince(p.arrivedAt) <= 7)) return false;
      if (f.tryOn && !p.tryOn) return false;
      if (f.deals && !p.deal) return false;
      if (f.inStock && (p.status === "out" || p.status === "soon")) return false;
      if (f.date !== "all") {
        const lim = { "24h": 1, "7d": 7, "30d": 30 }[f.date as "24h"] * 864e5;
        if (Date.now() - +new Date(p.publishedAt) > lim) return false;
      }
      return true;
    });
    const by: any = {
      relevance: (a: Product, b: Product) => (score.get(b.id) || 0) - (score.get(a.id) || 0) || +new Date(b.publishedAt) - +new Date(a.publishedAt),
      recent: (a: Product, b: Product) => +new Date(b.publishedAt) - +new Date(a.publishedAt),
      popular: (a: Product, b: Product) => popularity(b, s.favorites) - popularity(a, s.favorites),
      priceAsc: (a: Product, b: Product) => a.price - b.price,
      priceDesc: (a: Product, b: Product) => b.price - a.price,
    };
    r = r.sort(by[f.sort]);
    // Publications sponsorisées : jusqu'à 2 remontées en tête des résultats d'une recherche
    if (nq && f.sort === "relevance") { const top = r.filter((p) => p.sponsored).slice(0, 2); r = [...top, ...r.filter((p) => !top.includes(p))]; }
    return r;
  }, [cat, q, f, s.merchants, s.favorites, priceErr]);

  // Commerces et marques correspondant à la recherche (mêmes tolérances aux fautes que les produits)
  const shops = useMemo(() => {
    const nq = norm(q.trim());
    const act = s.merchants.filter((m) => m.status === "active");
    if (!nq) return [...act].sort((a, b) => a.name.localeCompare(b.name));
    return act.map((m) => {
      const sc = matchScore(nq, `${m.name} ${m.tagline} ${m.description} ${m.commune} ${m.categories.map((c) => catById(c).label).join(" ")}`);
      return { m, sc: sc && sc + 0.5 * matchScore(nq, m.name) };
    }).filter((x) => x.sc > 0).sort((a, b) => b.sc - a.sc).map((x) => x.m);
  }, [q, s.merchants]);
  const brands = useMemo(() => {
    const nq = norm(q.trim());
    const map = new Map<string, Product[]>();
    for (const p of cat) if (p.brand && p.brand !== "Sans marque") map.set(p.brand, [...(map.get(p.brand) || []), p]);
    return Array.from(map, ([name, prods]) => ({ name, prods, sc: nq ? matchScore(nq, name) : 1 }))
      .filter((b) => b.sc > 0).sort((a, b) => b.sc - a.sc || b.prods.length - a.prods.length || a.name.localeCompare(b.name));
  }, [q, cat]);
  // Si la recherche ressemble au nom d'un commerce (« pixel lagn »), on ouvre directement l'onglet Commerces
  // Avec une recherche, l'onglet « Tout » regroupe commerces, marques et produits (comme un moteur de recherche)
  const hasQ = !!q.trim();
  const view: SearchTab = tab === "all" && !hasQ ? "products" : tab || (hasQ ? "all" : "products");
  const topShops = hasQ ? shops.filter((m) => matchScore(norm(q.trim()), `${m.name} ${m.tagline}`) >= 0.6).slice(0, 3) : [];
  const topBrands = hasQ ? brands.filter((b) => b.sc >= 0.7).slice(0, 6) : [];
  const openBrand = (b: string) => { setQ(b); setTab("products"); window.scrollTo({ top: 0 }); };

  const fix = useMemo(() => q.trim() ? correct(q, cat.map((p) => productHay(p, s.merchants.find((m) => m.id === p.merchantId)))) : null, [q, cat, s.merchants]);
  const activeCount = f.cats.length + f.communes.length + f.statuses.length + (f.min ? 1 : 0) + (f.max ? 1 : 0) + (f.date !== "all" ? 1 : 0) + (f.onlyNew ? 1 : 0) + (f.tryOn ? 1 : 0) + (f.inStock ? 1 : 0) + (f.deals ? 1 : 0);
  const reset = () => { setF({ ...emptyFilters }); setQ(""); };

  const panel = (
    <div className="filters">
      <div className="filters-head"><strong>Filtres</strong>{activeCount > 0 && <button className="link" onClick={() => setF({ ...emptyFilters, sort: f.sort })}><RotateCcw size={14} /> Réinitialiser</button>}</div>
      <div className="fgroup">
        <span className="fgroup-l">Prix (F CFP)</span>
        <div className="price-range">
          <input id="f-min" inputMode="numeric" placeholder="Min" value={f.min} onChange={(e) => setF({ ...f, min: e.target.value.replace(/\D/g, "") })} aria-label="Prix minimum" />
          <span>—</span>
          <input id="f-max" inputMode="numeric" placeholder="Max" value={f.max} onChange={(e) => setF({ ...f, max: e.target.value.replace(/\D/g, "") })} aria-label="Prix maximum" />
        </div>
        {priceErr && <span className="field-err">{priceErr}</span>}
      </div>
      <div className="fgroup">
        <span className="fgroup-l">Date d'arrivage</span>
        <div className="chips-wrap">{DATE_OPTS.map((o) => <Chip key={o.v} active={f.date === o.v} onClick={() => setF({ ...f, date: o.v })}>{o.l}</Chip>)}</div>
      </div>
      <label className="switch-row"><input type="checkbox" checked={f.inStock} onChange={(e) => setF({ ...f, inStock: e.target.checked })} /><span className="switch" /> En stock uniquement</label>
      <label className="switch-row"><input type="checkbox" checked={f.onlyNew} onChange={(e) => setF({ ...f, onlyNew: e.target.checked })} /><span className="switch" /> Nouveautés uniquement</label>
      <label className="switch-row"><input type="checkbox" checked={!!f.tryOn} onChange={(e) => setF({ ...f, tryOn: e.target.checked })} /><span className="switch" /> Essayable en magasin</label>
      <label className="switch-row"><input type="checkbox" checked={!!f.deals} onChange={(e) => setF({ ...f, deals: e.target.checked })} /><span className="switch" /> Promos et offres limitées</label>
      <div className="fgroup">
        <span className="fgroup-l">Disponibilité</span>
        <div className="chips-wrap">{STATUSES.map((o) => <Chip key={o.id} active={f.statuses.includes(o.id)} onClick={() => toggle("statuses", o.id)}>{o.label}</Chip>)}</div>
      </div>
      <div className="fgroup">
        <span className="fgroup-l">Catégorie</span>
        <div className="chips-wrap">{CATEGORIES.map((c) => <Chip key={c.id} active={f.cats.includes(c.id)} onClick={() => toggle("cats", c.id)}>{c.label}</Chip>)}</div>
      </div>
      <div className="fgroup">
        <span className="fgroup-l">Commune</span>
        <div className="chips-wrap">{COMMUNES.map((c) => <Chip key={c} active={f.communes.includes(c)} onClick={() => toggle("communes", c)}>{c}</Chip>)}</div>
      </div>
    </div>
  );

  return (
    <div className="page explore">
      <div className="explore-head">
        <h1 className="page-title">{q ? `Résultats pour « ${q} »` : f.cats.length === 1 ? catById(f.cats[0]).label : f.deals ? "Promos et offres du moment" : "Tous les arrivages"}</h1>
        <div className="explore-search">
          <div className="search search-inline">
            <Search size={18} className="search-ico" />
            <input id="explore-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer par produit, marque, commerce…" aria-label="Recherche" />
            {q && <button className="search-clear" onClick={() => setQ("")} aria-label="Effacer"><X size={15} /></button>}
          </div>
        </div>
      </div>
      <div className="rtabs" role="tablist" aria-label="Type de résultat">
        {([...(hasQ ? [["all", "Tout", Search, results.length + shops.length]] : []), ["products", "Produits", Package, results.length], ["shops", "Commerces", Store, shops.length], ["brands", "Marques", Tag, brands.length]] as [SearchTab, string, any, number][]).map(([id, l, Ic, n]) => (
          <button key={id} role="tab" aria-selected={view === id} className={cx("rtab", view === id && "is-on")} onClick={() => setTab(id)}>
            <Ic size={16} /> {l} <span className="rtab-n">{n}</span>
          </button>
        ))}
      </div>
      {view === "all" && (topShops.length > 0 || topBrands.length > 0) && (
        <div className="all-top">
          {topShops.length > 0 && <div className="all-block">
            <div className="all-head"><Store size={15} /> Commerces <button className="link" onClick={() => setTab("shops")}>Tous ({shops.length}) <ChevronRight size={14} /></button></div>
            <div className="all-shops">{topShops.map((m) => (
              <button key={m.id} className="all-shop" onClick={() => go("merchant", { id: m.id })}>
                <MerchantLogo m={m} size={40} />
                <span><b>{m.name}</b><small>{m.tagline} · {m.commune}</small></span>
                <ChevronRight size={16} />
              </button>))}</div>
          </div>}
          {topBrands.length > 0 && <div className="all-block">
            <div className="all-head"><Tag size={15} /> Marques <button className="link" onClick={() => setTab("brands")}>Toutes ({brands.length}) <ChevronRight size={14} /></button></div>
            <div className="chips-wrap">{topBrands.map((b) => <button key={b.name} className="qchip" onClick={() => openBrand(b.name)}>{b.name}<span>{b.prods.length}</span></button>)}</div>
          </div>}
        </div>
      )}
      {(view === "products" || view === "all") && <>
      <div className="quick-strip">
        <Chip active={!!f.deals} icon={Flame} onClick={() => setF({ ...f, deals: !f.deals })}>Promos et offres</Chip>
        <Chip active={f.inStock} onClick={() => setF({ ...f, inStock: !f.inStock })}>En stock</Chip>
        <select className="select select-chip" value={f.communes.length === 1 ? f.communes[0] : ""} onChange={(e) => setF({ ...f, communes: e.target.value ? [e.target.value] : [] })} aria-label="Commune">
          <option value="">Toutes les communes</option>
          {COMMUNES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <Chip active={f.date === "24h"} onClick={() => setF({ ...f, date: f.date === "24h" ? "all" : "24h" })}>Arrivé en 24 h</Chip>
        <Chip active={f.statuses.includes("soon")} onClick={() => toggle("statuses", "soon")}>Bientôt disponible</Chip>
        <Chip active={!!f.tryOn} onClick={() => setF({ ...f, tryOn: !f.tryOn })}>Essayable</Chip>
      </div>
      <div className="cat-strip">
        <Chip active={!f.cats.length} onClick={() => setF({ ...f, cats: [] })}>Toutes</Chip>
        {CATEGORIES.map((c) => <Chip key={c.id} icon={c.icon} active={f.cats.includes(c.id)} onClick={() => toggle("cats", c.id)}>{c.label}</Chip>)}
      </div>
      <div className="explore-body">
        <aside className="explore-side">{panel}</aside>
        <div className="explore-main">
          <div className="toolbar">
            <span className="muted"><strong className="fg">{results.length}</strong> produit{results.length > 1 ? "s" : ""}</span>
            <div className="toolbar-r">
              <Btn variant="outline" size="sm" icon={SlidersHorizontal} className="show-sm" onClick={() => setSheet(true)}>Filtres{activeCount ? ` (${activeCount})` : ""}</Btn>
              <select id="sort" className="select" value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value })} aria-label="Trier">
                {SORT_OPTS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
          </div>
          {fix && results.length > 0 && <div className="search-fix"><Sparkles size={16} /><span>Résultats pour « <b>{fix}</b> ». Vous avez tapé « {q.trim()} ».</span></div>}
          {results.length ? (
            <><div className="grid grid-explore">{results.map((p) => <ProductCard key={p.id} p={p} />)}</div>{hasQ && <WantedPrompt q={q} category={f.cats[0] || ""} />}</>
          ) : (
            <Empty icon={Search} title="Aucun produit ne correspond" body={q ? `Personne ne propose « ${q} » avec ces critères pour le moment. Signalez-le : les commerçants verront qu'il est recherché.` : "Essayez d'élargir vos filtres."}
              action={<div className="row-center">{q ? <><WantedButton query={q} category={f.cats[0] || ""} /><Btn variant="outline" icon={BellRing} onClick={() => go("alerts", { create: { query: q, category: f.cats[0] || "" } })}>Créer une alerte</Btn></> : <Btn variant="outline" icon={RotateCcw} onClick={reset}>Réinitialiser</Btn>}</div>} />
          )}
        </div>
      </div>
      </>}
      {view !== "products" && view !== "all" && fix && (view === "shops" ? shops : brands).length > 0 && <div className="search-fix"><Sparkles size={16} /><span>Résultats pour « <b>{fix}</b> ». Vous avez tapé « {q.trim()} ».</span></div>}
      {view === "shops" && (shops.length
        ? <><p className="muted rtab-count"><strong className="fg">{shops.length}</strong> commerce{shops.length > 1 ? "s" : ""}{q.trim() ? ` pour « ${q.trim()} »` : ""}</p><div className="grid grid-m">{shops.map((m) => <MerchantCard key={m.id} m={m} />)}</div></>
        : <Empty icon={Store} title="Aucun commerce ne correspond" body={`Aucun commerce ne s'appelle « ${q.trim()} » ou ne vend ce type de produits.`} action={<Btn variant="outline" onClick={() => setTab("products")}>Voir les produits</Btn>} />)}
      {view === "brands" && (brands.length
        ? <><p className="muted rtab-count"><strong className="fg">{brands.length}</strong> marque{brands.length > 1 ? "s" : ""}{q.trim() ? ` pour « ${q.trim()} »` : ""}</p>
          <div className="brand-grid">{brands.map((b) => {
            const shopsN = new Set(b.prods.map((p) => p.merchantId)).size;
            const cats = Array.from(new Set(b.prods.map((p) => p.category))).slice(0, 2);
            return (
              <button key={b.name} className="brand-card" onClick={() => openBrand(b.name)}>
                <span className="brand-mono" aria-hidden>{b.name.replace(/[^A-Za-z0-9À-ÿ ]/g, "").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}</span>
                <span className="brand-txt">
                  <b>{b.name}</b>
                  <span className="muted small">{b.prods.length} produit{b.prods.length > 1 ? "s" : ""} · {shopsN} commerce{shopsN > 1 ? "s" : ""}</span>
                  <span className="brand-cats">{cats.map((c) => <em key={c}>{catById(c).label}</em>)}</span>
                </span>
                <ChevronRight size={18} className="brand-go" />
              </button>
            );
          })}</div></>
        : <Empty icon={Tag} title="Aucune marque ne correspond" body={`Aucun commerce ne propose la marque « ${q.trim()} » pour le moment.`} action={<div className="row-center"><WantedButton query={q} /><Btn variant="outline" icon={BellRing} onClick={() => go("alerts", { create: { query: q } })}>Créer une alerte</Btn></div>} />)}
      <Modal open={sheet} onClose={() => setSheet(false)} title="Filtres" side>
        {panel}
        <div className="sheet-foot"><Btn className="w-full" onClick={() => setSheet(false)}>Afficher {results.length} produit{results.length > 1 ? "s" : ""}</Btn></div>
      </Modal>
    </div>
  );
}

function DealBox({ p }: { p: Product }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 30000); return () => clearInterval(t); }, []);
  const st = dealState(p)!;
  return (
    <div className={cx("dealbox", st === "upcoming" && "is-soon", st === "ended" && "is-ended")}>
      <Timer size={18} />
      <div>
        <strong>{st === "ended" ? "Offre terminée" : dealWhen(p)}</strong>
        <span>{dealPeriod(p.deal!)}{p.deal!.discount && p.price ? ` · ${p.deal!.discount}` : ""}</span>
      </div>
    </div>
  );
}

// ---------- Fiche produit ----------
export function ProductPage({ params }: any) {
  const { s, mutate, toast, log, requireAccount } = useStore();
  const { go, back } = useNav();
  const p = s.products.find((x) => x.id === params?.id);
  const m = p && s.merchants.find((x) => x.id === p.merchantId);
  const [img, setImg] = useState(0);
  const [contact, setContact] = useState(false);
  const [report, setReport] = useState(false);
  const [reason, setReason] = useState("");
  const counted = useRef<string | null>(null);
  useEffect(() => {
    setImg(0); setContact(false);
    if (p && counted.current !== p.id) { counted.current = p.id; pushView(p.id); mutate((d) => { const x = d.products.find((y) => y.id === p.id); if (x) x.views++; }); }
    window.scrollTo({ top: 0 });
  }, [params?.id]);
  const catalog = useCatalog();
  if (!p || !m) return <div className="page"><Empty icon={Package} title="Produit introuvable" body="Cette publication a été retirée ou n'existe plus." action={<Btn onClick={() => go("home")}>Retour à l'accueil</Btn>} /></div>;
  const visible = p.state === "published" && m.status === "active";
  const c = catById(p.category);
  const views = p.images.length;
  const similar = catalog.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4);
  const following = s.follows.includes(m.id);
  const buy = buyLink(p, m);
  const copy = async (txt: string, msg: string) => {
    try { await navigator.clipboard.writeText(txt); toast(msg); } catch { toast("Copie impossible ici : sélectionnez le texte manuellement", "warn"); }
  };
  // Sur téléphone : feuille de partage du système (Messenger, WhatsApp, SMS…). Sinon : copie du texte avec le lien.
  const share = async (text: string, url: string) => {
    const nav: any = navigator;
    if (nav.share && matchMedia("(pointer: coarse)").matches) { try { await nav.share({ title: p.name, text, url }); return; } catch (e: any) { if (e?.name === "AbortError") return; } }
    copy(`${text}\n${url}`, "Lien du produit copié");
  };

  return (
    <div className="page product">
      <button className="back" onClick={back}><ChevronLeft size={18} /> Retour</button>
      {!visible && <div className="banner-warn"><Info size={16} /> Cette publication n'est pas visible publiquement (brouillon, programmée, masquée ou commerce suspendu).</div>}
      <div className="product-grid">
        <div className="gallery">
          <div className="gallery-main">
            <ProductVisual p={p} variant={img} key={img} />
            <FavButton id={p.id} overlay />
            {p.sponsored && <span className="sponso">Sponsorisé</span>}
          </div>
          {views > 1 && <div className="gallery-thumbs">
            {Array.from({ length: views }).map((_, i) => (
              <button key={i} className={cx(img === i && "is-on")} onClick={() => setImg(i)} aria-label={`Visuel ${i + 1}`}><ProductVisual p={p} variant={i} /></button>
            ))}
          </div>}
          {!p.images.length && <p className="note"><Info size={14} /> Aucune photo fournie par le commerçant : visuel indicatif.</p>}
        </div>

        <div className="pinfo">
          <div className="pinfo-top">
            <button className="crumb" onClick={() => go("explore", { cat: p.category })}><c.icon size={14} /> {c.label}</button>
            {p.deal && p.status !== "out" ? <DealPill p={p} /> : <StatusPill status={p.status} at={p.arrivedAt} />}
          </div>
          <h1 className="pinfo-title">{p.name}</h1>
          {p.brand !== "Sans marque" && <div className="pinfo-brand">{p.brand}</div>}
          <div className="pinfo-pricerow"><PriceTag p={p} big />{pctOff(p) > 0 && <span className="deal-badge deal-badge-inline">-{pctOff(p)} %</span>}</div>
          {p.deal && <DealBox p={p} />}

          <div className="seller">
            <button className="seller-main" onClick={() => go("merchant", { id: m.id })} aria-label={`Voir la boutique ${m.name}`}>
              <MerchantLogo m={m} size={48} />
              <div className="seller-id">
                <span className="seller-kicker">Vendu par</span>
                <strong>{m.name}{m.verified && <BadgeCheck size={15} className="verified" />}</strong>
                <span className="seller-sub"><MapPin size={12} /> {m.commune} · {fmtNum(m.followersBase + (following ? 1 : 0))} abonnés</span>
                <RatingBadge merchantId={m.id} />
              </div>
              <ChevronRight size={18} className="seller-chev" />
            </button>
            <div className="seller-foot">
              <span className="seller-hours"><Clock size={13} /> {m.hours[0]}</span>
              <div className="row">
                <Btn variant="ghost" size="sm" icon={Store} onClick={() => go("merchant", { id: m.id })}>Voir la boutique</Btn>
                <Btn variant={following ? "outline" : "primary"} size="sm" icon={following ? Check : Plus} onClick={() => { mutate((d) => { d.follows = following ? d.follows.filter((x) => x !== m.id) : [...d.follows, m.id]; }); toast(following ? `Vous ne suivez plus ${m.name}` : `Vous suivez ${m.name}`); }}>{following ? "Suivi" : "Suivre"}</Btn>
              </div>
            </div>
          </div>

          <dl className="facts">
            <div><dt>Disponibilité déclarée</dt><dd>{p.status === "soon" ? "Bientôt disponible" : p.status === "out" ? "Épuisé" : p.qty ? `${p.qty} ${isRestoProduct(p) ? "part" : "unité"}${p.qty > 1 ? "s" : ""} ${isRestoProduct(p) ? "prévues" : "en stock"}` : isRestoProduct(p) ? "Disponible" : "En stock"}</dd></div>
            {!p.deal && <div><dt>{p.status === "soon" ? "Arrivage prévu" : "Dernier arrivage"}</dt><dd>{fmtDateLong(p.arrivedAt)}</dd></div>}
            <div><dt>Mise à jour</dt><dd>{fmtRel(p.updatedAt)}</dd></div>
            <div><dt>Point de vente</dt><dd>{p.store || m.stores[0]}</dd></div>
            {p.tryOn && <div className="facts-wide"><dt>Essayage</dt><dd><span className="tryon-ok"><Shirt size={14} /> Essayable en magasin</span></dd></div>}
          </dl>

          <p className="pinfo-desc">{p.description}</p>
          {p.tags.length > 0 && <div className="tags">{p.tags.map((t) => <span key={t} className="tag">#{t}</span>)}</div>}

          <div className="pinfo-actions">
            {/* Pas de réservation (abus, produits jamais retirés). Achat : le client paie directement le commerçant, sur sa page de paiement. */}
            {buy && <a className="btn btn-accent btn-lg" href={buy} target="_blank" rel="noopener noreferrer nofollow" onClick={() => mutate((d) => { const x = d.products.find((y) => y.id === p.id); if (x) x.contacts = (x.contacts || 0) + 1; })}><ShoppingBag size={17} /> Acheter</a>}
            <Btn size="lg" variant={buy ? "outline" : "accent"} icon={Phone} onClick={() => { setContact(true); mutate((d) => { const x = d.products.find((y) => y.id === p.id); if (x) x.contacts = (x.contacts || 0) + 1; }); }}>Contacter le commerce</Btn>
            <Btn size="lg" variant="outline" icon={BellRing} onClick={() => go("alerts", { create: { query: p.name, category: p.category, brand: p.brand } })}>Créer une alerte</Btn>
            <div className="row">
              <FavButtonLabeled id={p.id} />
              <Btn variant="ghost" icon={Share2} onClick={() => share(`${p.deal ? dealTitle(p) + " : " : ""}${p.name} — ${p.price ? fmtXPF(p.price) : p.deal?.discount || ""}${p.deal ? " (" + dealWhen(p).toLowerCase() + ")" : ""} chez ${m.name} (${m.commune}) · vu sur ARRIVAGE`, shareUrl({ name: "product", params: { id: p.id } }))}>Partager</Btn>
              <Btn variant="ghost" icon={Flag} onClick={() => !requireAccount("Connectez-vous pour signaler une publication à la modération.") ? null : s.profile.blocked ? toast("Votre compte a été bloqué par la modération : vous ne pouvez plus envoyer de signalement", "warn") : setReport(true)}>Signaler</Btn>
            </div>
          </div>
          <p className="disclaimer">{isRestoProduct(p) ? "Prix et disponibilité déclarés par le restaurant. Commande et réservation de table directement auprès du restaurant." : buy ? `Prix et disponibilité déclarés par le commerçant. « Acheter » ouvre la page de paiement de ${m.name} : vous payez directement le commerce, puis retirez votre achat selon ses conditions.` : "Prix et disponibilité déclarés par le commerçant. Vérifiez la disponibilité auprès du commerce avant de vous déplacer."}{p.deal ? " Offre valable dans la limite des stocks et aux dates indiquées." : ""}</p>
        </div>
      </div>

      <section className="store-card">
        <div className="store-body">
          <div className="store-id">
            <MerchantLogo m={m} size={56} />
            <div>
              <button className="store-name" onClick={() => go("merchant", { id: m.id })}>{m.name}{m.verified && <BadgeCheck size={16} className="verified" />}</button>
              <div className="muted">{m.tagline} · {m.commune}</div>
            </div>
            <Btn variant="ghost" size="sm" icon={Store} onClick={() => go("merchant", { id: m.id })}>Tous ses produits</Btn>
            <Btn variant={following ? "outline" : "primary"} size="sm" onClick={() => { mutate((d) => { d.follows = following ? d.follows.filter((x) => x !== m.id) : [...d.follows, m.id]; }); toast(following ? `Vous ne suivez plus ${m.name}` : `Vous suivez ${m.name}`); }}>{following ? "Suivi" : "Suivre"}</Btn>
          </div>
          <div className="store-cols">
            <div><span className="lbl"><Clock size={14} /> Horaires</span>{m.hours.map((h) => <div key={h}>{h}</div>)}</div>
            <div><span className="lbl"><MapPin size={14} /> Adresse</span><div>{m.address}</div><div>{m.commune}, Nouvelle-Calédonie</div></div>
            <div className="store-btns">
              {true ? (
                <a className="btn btn-outline btn-sm" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.address + ", " + m.commune + ", Nouvelle-Calédonie")}`} target="_blank" rel="noreferrer"><Navigation size={15} /> Itinéraire</a>
              ) : (
                <span className="btn btn-outline btn-sm is-disabled" title="Adresse fictive : itinéraire désactivé dans la démo"><Navigation size={15} /> Itinéraire indisponible</span>
              )}
              <span className="micro">{m.addressVerified ? "Adresse vérifiée" : "Adresse déclarée par le commerçant"}</span>
            </div>
          </div>
        </div>
      </section>

      <ReviewsBlock merchantId={m.id} productId={p.id} productName={p.name} title="Avis sur ce produit" />

      {similar.length > 0 && (
        <section className="sec">
          <SectionHead title="Produits similaires" />
          <div className="grid">{similar.map((x) => <ProductCard key={x.id} p={x} />)}</div>
        </section>
      )}

      <Modal open={contact} onClose={() => setContact(false)} title={`Contacter ${m.name}`}>
        <p className="muted" style={{ marginTop: 0 }}>Contactez le commerce directement, ARRIVAGE n'intervient pas dans la vente.</p>
        <div className="contact-rows">
          <div className="contact-row"><Phone size={18} /><span className="sel">{m.phone}</span><Btn variant="ghost" size="sm" icon={Copy} onClick={() => copy(m.phone, "Numéro copié")}>Copier</Btn></div>
          <div className="contact-row"><Mail size={18} /><span className="sel">{m.email}</span><Btn variant="ghost" size="sm" icon={Copy} onClick={() => copy(m.email, "Adresse copiée")}>Copier</Btn></div>
          <div className="contact-row"><Clock size={18} /><span>{m.hours[0]}</span></div>
        </div>
        <p className="note"><Info size={14} /> Précisez « vu sur ARRIVAGE » et la référence : <strong>{p.name}</strong>.</p>
      </Modal>

      <Modal open={report} onClose={() => setReport(false)} title="Signaler cette publication">
        <div className="chips-wrap" style={{ marginBottom: 12 }}>
          {["Prix incorrect", "Produit épuisé", "Photo trompeuse", "Contenu inapproprié", "Autre"].map((r) => <Chip key={r} active={reason === r} onClick={() => setReason(r)}>{r}</Chip>)}
        </div>
        <div className="row-end">
          <Btn variant="ghost" onClick={() => setReport(false)}>Annuler</Btn>
          <Btn disabled={!reason} onClick={() => {
            mutate((d) => { d.reports.unshift({ id: newId(), productId: p.id, reason, at: new Date().toISOString(), status: "open", reporterId: s.me!.id, adminUnread: true, history: [{ at: new Date().toISOString(), by: "client", kind: "created", text: "Signalement : " + reason }] }); log(d, `Nouveau signalement sur « ${p.name} » : ${reason}`, "consommateur"); });
            toast("Signalement envoyé à la modération"); setReport(false); setReason("");
          }}>Envoyer</Btn>
        </div>
      </Modal>
    </div>
  );
}

function FavButtonLabeled({ id }: { id: string }) {
  const { s, mutate, toast } = useStore();
  const on = s.favorites.includes(id);
  return <Btn variant="ghost" icon={Heart} className={cx(on && "is-fav")} onClick={() => { mutate((d) => { d.favorites = on ? d.favorites.filter((x) => x !== id) : [id, ...d.favorites]; }); toast(on ? "Retiré des favoris" : "Ajouté aux favoris"); }}>{on ? "Enregistré" : "Enregistrer"}</Btn>;
}

// ---------- Alertes ----------
const blankAlert = (): Alert => ({ id: "", query: "", brand: "", category: "", maxBudget: null, commune: "", features: "", active: true, createdAt: "" });

export function AlertForm({ initial, onSave, onCancel }: { initial: Alert; onSave: (a: Alert) => void; onCancel: () => void }) {
  const [a, setA] = useState<Alert>(initial);
  const [budget, setBudget] = useState(initial.maxBudget ? String(initial.maxBudget) : "");
  const [err, setErr] = useState<any>({});
  const catalog = useCatalog();
  const { s } = useStore();
  const preview = useMemo(() => {
    if (a.query.trim().length < 2) return [];
    const al = { ...a, maxBudget: budget ? Number(budget) : null };
    return catalog.filter((p) => alertMatches(al, p, s.merchants.find((m) => m.id === p.merchantId)));
  }, [a, budget, catalog]);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: any = {};
    if (a.query.trim().length < 2) er.query = "Indiquez le produit recherché (2 caractères minimum)";
    if (budget && (!Number.isFinite(Number(budget)) || Number(budget) <= 0)) er.budget = "Budget invalide";
    setErr(er);
    if (Object.keys(er).length) return;
    onSave({ ...a, query: a.query.trim(), maxBudget: budget ? Number(budget) : null });
  };
  return (
    <form onSubmit={submit} className="form" noValidate>
      <Field label="Produit recherché *" error={err.query} htmlFor="al-q"><input id="al-q" autoFocus value={a.query} onChange={(e) => setA({ ...a, query: e.target.value })} placeholder="Ex. GTA VI PS5, RTX 5070, Nike Air Max taille 43" /></Field>
      <div className="form-2">
        <Field label="Marque" htmlFor="al-b"><input id="al-b" value={a.brand} onChange={(e) => setA({ ...a, brand: e.target.value })} placeholder="Facultatif" /></Field>
        <Field label="Catégorie" htmlFor="al-c">
          <select id="al-c" value={a.category} onChange={(e) => setA({ ...a, category: e.target.value })}><option value="">Toutes</option>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
        </Field>
        <Field label="Budget maximum (F CFP)" error={err.budget} htmlFor="al-m"><input id="al-m" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value.replace(/\D/g, ""))} placeholder="Ex. 20000" /></Field>
        <Field label="Localisation" htmlFor="al-l">
          <select id="al-l" value={a.commune} onChange={(e) => setA({ ...a, commune: e.target.value })}><option value="">Tout le territoire</option>{COMMUNES.map((c) => <option key={c}>{c}</option>)}</select>
        </Field>
      </div>
      <Field label="Caractéristiques recherchées" hint="Taille, couleur, version, capacité…" htmlFor="al-f"><input id="al-f" value={a.features} onChange={(e) => setA({ ...a, features: e.target.value })} placeholder="Ex. taille 43, coloris noir" /></Field>
      <div className={cx("match-preview", preview.length && "has")}>
        {a.query.trim().length < 2 ? "Commencez à saisir pour voir les produits déjà disponibles." :
          preview.length ? <><strong>{preview.length} produit{preview.length > 1 ? "s" : ""} correspond{preview.length > 1 ? "ent" : ""} déjà</strong> · {preview.slice(0, 2).map((p) => p.name).join(", ")}{preview.length > 2 ? "…" : ""}</> :
            "Aucun produit ne correspond aujourd'hui. Vous serez prévenu dès qu'un commerçant en publie un."}
      </div>
      <div className="row-end">
        <Btn variant="ghost" type="button" onClick={onCancel}>Annuler</Btn>
        <Btn type="submit" icon={Check}>{initial.id ? "Enregistrer" : "Créer l'alerte"}</Btn>
      </div>
    </form>
  );
}

export function AlertsPage({ params }: any) {
  const { s, mutate, toast, log } = useStore();
  const { go } = useNav();
  const catalog = useCatalog();
  const [editing, setEditing] = useState<Alert | null>(null);
  const [del, setDel] = useState<Alert | null>(null);
  useEffect(() => { if (params?.create) setEditing({ ...blankAlert(), ...params.create }); }, [params]);
  const save = (a: Alert) => {
    const isNew = !a.id;
    mutate((d) => {
      if (isNew) { d.alerts.unshift({ ...a, id: newId(), createdAt: new Date().toISOString() }); log(d, `Nouvelle alerte créée : « ${a.query} »`, "consommateur"); }
      else d.alerts = d.alerts.map((x) => (x.id === a.id ? a : x));
    });
    toast(isNew ? "Alerte créée. Vous serez notifié dans l'application." : "Alerte mise à jour");
    setEditing(null);
  };
  const matchesOf = (a: Alert) => catalog.filter((p) => alertMatches(a, p, s.merchants.find((m) => m.id === p.merchantId)));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Mes alertes</h1>
          <p className="muted">Soyez prévenu dès qu'un commerçant publie le produit que vous cherchez, même s'il n'existe pas encore en magasin.</p>
        </div>
        <Btn icon={Plus} onClick={() => setEditing(blankAlert())}>Nouvelle alerte</Btn>
      </div>

      <div className="suggest-alerts">
        <span className="muted">Idées :</span>
        {["GTA VI PS5", "Nike Air Max taille 43", "RTX 5070", "Pneus 265/65 R17", "Red Bull édition limitée"].map((q) => (
          <Chip key={q} icon={Plus} onClick={() => setEditing({ ...blankAlert(), query: q })}>{q}</Chip>
        ))}
      </div>

      {!s.alerts.length ? (
        <Empty icon={BellRing} title="Aucune alerte" body="Créez votre première alerte pour suivre un produit." action={<Btn icon={Plus} onClick={() => setEditing(blankAlert())}>Créer une alerte</Btn>} />
      ) : (
        <div className="alerts">
          {s.alerts.map((a) => {
            const ms = matchesOf(a);
            return (
              <div key={a.id} className={cx("alert-row", !a.active && "is-off")}>
                <span className="alert-ico"><BellRing size={18} /></span>
                <div className="alert-main">
                  <strong>{a.query}</strong>
                  <div className="alert-crit">
                    {a.category && <span>{catById(a.category).label}</span>}
                    {a.brand && <span>{a.brand}</span>}
                    {a.maxBudget && <span>≤ {fmtXPF(a.maxBudget)}</span>}
                    <span>{a.commune || "Tout le territoire"}</span>
                    {a.features && <span>{a.features}</span>}
                  </div>
                  <div className="alert-status">
                    {a.active ? (ms.length ? <button className="link" onClick={() => go("product", { id: ms[0].id })}>{ms.length} produit{ms.length > 1 ? "s" : ""} correspondant{ms.length > 1 ? "s" : ""} <ChevronRight size={14} /></button> : <span className="muted">En veille · aucun produit pour l'instant</span>) : <span className="muted">Désactivée</span>}
                    <span className="muted"> · créée {fmtRel(a.createdAt)}</span>
                  </div>
                </div>
                <div className="alert-actions">
                  <label className="switch-row" title={a.active ? "Désactiver" : "Activer"}>
                    <input type="checkbox" checked={a.active} onChange={() => { mutate((d) => { const x = d.alerts.find((y) => y.id === a.id); if (x) x.active = !x.active; }); toast(a.active ? "Alerte désactivée" : "Alerte réactivée", "info"); }} aria-label="Activer l'alerte" />
                    <span className="switch" />
                  </label>
                  <IconBtn icon={Pencil} label="Modifier" onClick={() => setEditing(a)} />
                  <IconBtn icon={Trash2} label="Supprimer" onClick={() => setDel(a)} />
                </div>
              </div>
            );
          })}
        </div>
      )}


      <MyWanted />

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Modifier l'alerte" : "Nouvelle alerte"}>
        {editing && <AlertForm initial={editing} onSave={save} onCancel={() => setEditing(null)} />}
      </Modal>
      <Modal open={!!del} onClose={() => setDel(null)} title="Supprimer l'alerte ?">
        <p className="muted" style={{ marginTop: 0 }}>L'alerte « {del?.query} » sera définitivement supprimée.</p>
        <div className="row-end"><Btn variant="ghost" onClick={() => setDel(null)}>Annuler</Btn><Btn variant="danger" onClick={() => { mutate((d) => { d.alerts = d.alerts.filter((x) => x.id !== del!.id); }); toast("Alerte supprimée", "info"); setDel(null); }}>Supprimer</Btn></div>
      </Modal>
    </div>
  );
}

// ---------- Favoris ----------
export function FavoritesPage({ params }: any = {}) {
  const { s } = useStore();
  const { go } = useNav();
  const [tab, setTab] = useState(params?.tab || "products");
  const favs = s.favorites.map((id) => s.products.find((p) => p.id === id)).filter(Boolean) as Product[];
  const follows = s.merchants.filter((m) => s.follows.includes(m.id));
  const upcoming = s.products.filter((p) => p.state === "published" && p.status === "soon" && (s.favorites.includes(p.id) || s.follows.includes(p.merchantId)));
  const actives = s.alerts.filter((a) => a.active);
  return (
    <div className="page">
      <div className="page-head"><div><h1 className="page-title">Favoris</h1><p className="muted">Enregistrés sur cet appareil{""} et conservés après actualisation.</p></div></div>
      <Segmented value={tab} onChange={setTab} options={[
        { v: "products", l: `Produits (${favs.length})` }, { v: "merchants", l: `Commerces suivis (${follows.length})` },
        { v: "upcoming", l: `À venir (${upcoming.length})` }, { v: "alerts", l: `Alertes actives (${actives.length})` },
      ]} />
      <div style={{ marginTop: 20 }}>
        {tab === "products" && (favs.length ? <div className="grid">{favs.map((p) => <ProductCard key={p.id} p={p} />)}</div> : <Empty icon={Heart} title="Aucun produit enregistré" body="Touchez le cœur sur une carte produit pour l'enregistrer." action={<Btn onClick={() => go("explore", {})}>Explorer les arrivages</Btn>} />)}
        {tab === "merchants" && (follows.length ? <div className="grid grid-m">{follows.map((m) => <MerchantCard key={m.id} m={m} />)}</div> : <Empty icon={Store} title="Vous ne suivez aucun commerce" action={<Btn onClick={() => go("merchants")}>Voir l'annuaire</Btn>} />)}
        {tab === "upcoming" && (upcoming.length ? <div className="grid">{upcoming.map((p) => <ProductCard key={p.id} p={p} />)}</div> : <Empty icon={Calendar} title="Aucun arrivage à venir" body="Les arrivages annoncés par vos commerces suivis apparaîtront ici." />)}
        {tab === "alerts" && (actives.length ? (
          <div className="alerts">{actives.map((a) => (
            <button key={a.id} className="alert-row alert-row-btn" onClick={() => go("alerts")}><span className="alert-ico"><BellRing size={18} /></span><div className="alert-main"><strong>{a.query}</strong><div className="alert-crit">{a.category && <span>{catById(a.category).label}</span>}{a.maxBudget && <span>≤ {fmtXPF(a.maxBudget)}</span>}<span>{a.commune || "Tout le territoire"}</span></div></div><ChevronRight size={18} /></button>
          ))}</div>
        ) : <Empty icon={BellRing} title="Aucune alerte active" action={<Btn onClick={() => go("alerts", { create: {} })}>Créer une alerte</Btn>} />)}
      </div>
    </div>
  );
}

// ---------- Commerces ----------
export function FollowBtn({ m, size = "sm" }: { m: Merchant; size?: string }) {
  const { s, mutate, toast } = useStore();
  const on = s.follows.includes(m.id);
  return <Btn size={size} variant={on ? "outline" : "primary"} icon={on ? Check : Plus} onClick={(e: any) => { e.stopPropagation(); mutate((d) => { d.follows = on ? d.follows.filter((x) => x !== m.id) : [...d.follows, m.id]; }); toast(on ? `Vous ne suivez plus ${m.name}` : `Vous suivez ${m.name}. Ses arrivages vous seront notifiés.`); }}>{on ? "Suivi" : "Suivre"}</Btn>;
}

export function MerchantCard({ m }: { m: Merchant }) {
  const { go } = useNav();
  const { s } = useStore();
  const n = s.products.filter((p) => p.merchantId === m.id && p.state === "published").length;
  return (
    <article className="mcard" onClick={() => go("merchant", { id: m.id })} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && go("merchant", { id: m.id })}>
      <MerchantCover m={m} className="mcard-cover" />
      <div className="mcard-body">
        <div className="mcard-logo"><MerchantLogo m={m} size={48} /></div>
        <div className="mcard-name">{m.name}{m.verified && <BadgeCheck size={14} className="verified" />}</div>
        <div className="muted small">{m.tagline}</div>
        <RatingBadge merchantId={m.id} compact />
        <div className="mcard-foot"><span className="small"><MapPin size={12} /> {m.commune} · {n} arrivage{n > 1 ? "s" : ""}</span><FollowBtn m={m} /></div>
      </div>
    </article>
  );
}

export function MerchantsPage({ params }: any) {
  const { s } = useStore();
  const { go } = useNav();
  const [q, setQ] = useState("");
  const [commune, setCommune] = useState("");
  const [cat, setCat] = useState("");
  const list = s.merchants.filter((m) => m.status === "active" && (!q || norm(m.name + m.tagline + m.description).includes(norm(q))) && (!commune || m.commune === commune) && (!cat || m.categories.includes(cat as any)));
  return (
    <div className="page">
      <div className="page-head"><div><h1 className="page-title">Commerces</h1><p className="muted">Les commerces calédoniens qui annoncent leurs arrivages sur ARRIVAGE.</p></div><Btn variant="outline" icon={Store} onClick={() => go("signup")}>Inscrire mon commerce</Btn></div>
      {<>
      <div className="dir-filters">
        <div className="search search-inline"><Search size={18} className="search-ico" /><input id="dir-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un commerce" aria-label="Rechercher un commerce" /></div>
        <select id="dir-commune" className="select" value={commune} onChange={(e) => setCommune(e.target.value)} aria-label="Commune"><option value="">Toutes les communes</option>{COMMUNES.map((c) => <option key={c}>{c}</option>)}</select>
        <select id="dir-cat" className="select" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Catégorie"><option value="">Toutes les catégories</option>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
      </div>
      {list.length ? <div className="grid grid-m">{list.map((m) => <MerchantCard key={m.id} m={m} />)}</div> : <Empty icon={Store} title="Aucun commerce trouvé" action={<Btn variant="outline" onClick={() => { setQ(""); setCommune(""); setCat(""); }}>Réinitialiser</Btn>} />}
      </>}
    </div>
  );
}

export function MerchantPage({ params }: any) {
  const { s, toast } = useStore();
  const { back, go } = useNav();
  const m = s.merchants.find((x) => x.id === params?.id);
  const catalog = useCatalog();
  // Rayon choisi : on descend directement aux produits (sur téléphone, l'adresse est affichée avant)
  useEffect(() => { if (params?.rayon) { const t = setTimeout(() => { const el = document.getElementById(matchMedia("(max-width: 900px)").matches ? "m-prods" : "m-rayons"); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: "smooth" }); }, 80); return () => clearTimeout(t); } }, [params?.rayon]);
  if (!m) return <div className="page"><Empty icon={Store} title="Commerce introuvable" /></div>;
  const all = catalog.filter((p) => p.merchantId === m.id);
  // Rayons : raccourcis en haut de la fiche pour n'afficher qu'une partie des produits
  const rayons = [
    ...(all.some((p) => p.deal) ? [{ v: "promos", l: m.categories.includes("restauration" as any) ? "À la carte" : "Promos" }] : []),
    ...(all.some((p) => p.status === "soon") ? [{ v: "soon", l: "Bientôt" }] : []),
    ...Array.from(new Set(all.map((p) => p.category))).map((c) => ({ v: "c:" + c, l: catById(c).label, icon: catById(c).icon })),
  ];
  const showRayons = all.length >= 4 && rayons.length >= 2;
  const rayon = showRayons && rayons.some((r) => r.v === params?.rayon) ? params.rayon : "all";
  const prods = rayon.startsWith("c:") ? all.filter((p) => p.category === rayon.slice(2)) : all;
  const only = (k: string) => rayon === "all" || rayon.startsWith("c:") || rayon === k;
  const deals = prods.filter((p) => p.deal).sort((a, b) => +new Date(a.deal!.startAt) - +new Date(b.deal!.startAt));
  const latest = prods.filter((p) => p.status !== "soon" && !p.deal).sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
  const next = prods.filter((p) => p.status === "soon");
  const followers = m.followersBase + (s.follows.includes(m.id) ? 1 : 0);
  return (
    <div className="page">
      <button className="back" onClick={back}><ChevronLeft size={18} /> Retour</button>
      {m.status !== "active" && <div className="banner-warn"><Info size={16} /> Ce commerce est suspendu par la modération et n'apparaît plus publiquement.</div>}
      <div className="mhero">
        <MerchantCover m={m} className="mhero-cover" />
        <div className="mhero-body">
          <div className="mhero-logo"><MerchantLogo m={m} size={84} /></div>
          <div className="mhero-id">
            <h1>{m.name}{m.verified && <BadgeCheck size={20} className="verified" />}</h1>
            <p className="muted">{m.tagline} · {m.commune} · {followers.toLocaleString("fr-FR")} abonnés</p>
            <RatingBadge merchantId={m.id} />
          </div>
          <div className="row"><FollowBtn m={m} size="md" /><IconBtn icon={Share2} label="Partager ce commerce" onClick={async () => { const url = shareUrl({ name: "merchant", params: { id: m.id } }); const nav: any = navigator; if (nav.share && matchMedia("(pointer: coarse)").matches) { try { await nav.share({ title: m.name, text: `${m.name} sur ARRIVAGE`, url }); return; } catch (e: any) { if (e?.name === "AbortError") return; } } try { await navigator.clipboard.writeText(url); toast("Lien du commerce copié"); } catch { toast("Copie impossible ici", "warn"); } }} /></div>
        </div>
      </div>
      {showRayons && (
        <div className="rayons" id="m-rayons" role="tablist" aria-label="Rayons">
              <button role="tab" aria-selected={rayon === "all"} className={cx("chip", rayon === "all" && "is-on")} onClick={() => go("merchant", { id: m.id })}>Nouveautés</button>
              {rayons.map((r: any) => <button key={r.v} role="tab" aria-selected={rayon === r.v} className={cx("chip", rayon === r.v && "is-on")} onClick={() => go("merchant", { id: m.id, rayon: r.v })}>{r.icon && <r.icon size={14} />}{r.l}</button>)}
            </div>
      )}
      <div className="mdetail">
        <div className="mdetail-main" id="m-prods">
          <p className="lead">{m.description}</p>
          {!showRayons && <div className="chips-wrap">{m.categories.map((c) => <Chip key={c} icon={catById(c).icon} onClick={() => go("explore", { cat: c })}>{catById(c).label}</Chip>)}</div>}
          {only("promos") && deals.length > 0 && <section className="sec">
            <SectionHead title={m.categories.includes("restauration" as any) ? "À la carte en ce moment" : "Promos et offres en cours"} sub="Offres limitées, aux dates indiquées" />
            <div className="grid">{deals.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          </section>}
          {rayon !== "promos" && rayon !== "soon" && (latest.length > 0 || !deals.length) && <section className="sec">
            <SectionHead title={rayon.startsWith("c:") ? catById(rayon.slice(2) as any).label : "Derniers arrivages"} sub={`${latest.length} publication${latest.length > 1 ? "s" : ""} en ligne`} />
            {latest.length ? <div className="grid">{latest.map((p) => <ProductCard key={p.id} p={p} />)}</div> : <Empty icon={Package} title="Aucun arrivage publié" />}
          </section>}
          {rayon !== "promos" && (rayon === "soon" || next.length > 0 || (!deals.length && rayon === "all")) && <section className="sec">
            <SectionHead title="Prochains arrivages" />
            {next.length ? <div className="grid">{next.map((p) => <ProductCard key={p.id} p={p} />)}</div> : <Empty icon={Calendar} title="Aucun arrivage annoncé" body="Suivez ce commerce pour être prévenu." />}
          </section>}
          <ReviewsBlock merchantId={m.id} />
        </div>
        <aside className="mdetail-side">
          <div className="side-card">
            <span className="lbl"><MapPin size={14} /> Adresse</span>
            <div>{m.address}</div><div className="muted">{m.commune}</div>
            {m.stores.length > 1 && <div className="muted small">Points de vente : {m.stores.join(", ")}</div>}
            <span className="lbl"><Clock size={14} /> Horaires</span>
            {m.hours.map((h) => <div key={h}>{h}</div>)}
            <span className="lbl"><Phone size={14} /> Coordonnées</span>
            <div className="sel">{m.phone}</div><div className="sel">{m.email}</div>
            <Btn variant="outline" size="sm" icon={Copy} onClick={async () => { try { await navigator.clipboard.writeText(`${m.name} — ${m.phone} — ${m.email}`); toast("Coordonnées copiées"); } catch { toast("Copie impossible ici", "warn"); } }}>Copier les coordonnées</Btn>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ---------- Profil ----------
export function ProfilePage() {
  const { s, mutate } = useStore();
  const { go } = useNav();
  const active = s.me ? s.reservations.filter((r) => r.buyerId === s.me!.id && (r.status === "paid" || r.status === "ready")).length : 0;
  return (
    <div className="page narrow">
      <h1 className="page-title">Profil</h1>
      <AccountSection />
      <section className="sec">
        <SectionHead title="Ma commune" />
        <div className="chips-wrap"><Chip active={!s.profile.commune} onClick={() => mutate((d) => { d.profile.commune = ""; })}>Tout le territoire</Chip>{COMMUNES.map((c) => <Chip key={c} active={s.profile.commune === c} onClick={() => mutate((d) => { d.profile.commune = c; })}>{c}</Chip>)}</div>
      </section>
      <section className="sec">
        <SectionHead title="Centres d'intérêt" sub="Utilisés pour vous proposer des arrivages sur l'accueil" />
        <div className="chips-wrap">{CATEGORIES.map((c) => { const on = s.profile.interests.includes(c.id); return <Chip key={c.id} icon={c.icon} active={on} onClick={() => mutate((d) => { d.profile.interests = on ? d.profile.interests.filter((x) => x !== c.id) : [...d.profile.interests, c.id]; })}>{c.label}</Chip>; })}</div>
      </section>
      {s.me && s.reservations.some((r) => r.buyerId === s.me!.id) && (
        <section className="sec">
          <SectionHead title="Mes réservations" sub="Produits mis de côté en magasin" />
          <Btn variant="outline" icon={ShoppingBag} onClick={() => go("orders")}>Voir mes réservations ({active} en cours)</Btn>
        </section>
      )}
      {!s.merchants.some((m) => m.ownerId && m.ownerId === s.me?.id) && (
        <section className="sec">
          <SectionHead title="Vous êtes commerçant ?" sub="Annoncez vos arrivages aux Calédoniens" />
          <Btn variant="outline" icon={Store} onClick={() => go("signup")}>Inscrire mon commerce</Btn>
        </section>
      )}
      <section className="sec">
        <SectionHead title="Apparence" sub="Couleurs, thèmes, mode sombre, typographie" />
        <Btn variant="outline" icon={Palette} onClick={() => go("theme")}>Personnaliser le thème</Btn>
      </section>
    </div>
  );
}
