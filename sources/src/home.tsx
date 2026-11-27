// Accueil client centré sur la recherche + barre de recherche intelligente (en-tête, mobile, accueil).
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, MapPin, X, ArrowUpRight, Sparkles, Store, Tag, Clock, BellRing, ChevronRight, ChevronDown, PackageCheck, Zap, CalendarClock, Shirt,
  TrendingUp, FlaskConical, Package, CornerDownLeft, Flame, UtensilsCrossed, Megaphone,
} from "lucide-react";
import { CATEGORIES, COMMUNES, catById, fmtXPF, norm, Product } from "./data";
import { useStore } from "./store";
import { useNav } from "./nav";
import { useCatalog, ProductCard, MerchantCard, popularity, PriceTag } from "./consumer";
import { dealState, dealBadge, dealWhen, isRestoProduct } from "./deals";
import { Scope, SCOPES, suggest, brandsOf, inStock, recentSearches, pushRecent, clearRecent, highlight } from "./finder";
import { useDemo } from "./demo";
import { Btn, ProductVisual, MerchantLogo, SectionHead, cx } from "./ui";

function Hl({ text, q }: { text: string; q: string }) {
  return <span className="hl">{highlight(text, q).map((x, i) => x.on ? <mark key={i}>{x.t}</mark> : <React.Fragment key={i}>{x.t}</React.Fragment>)}</span>;
}

const IDEAS = ["PS5", "iPhone", "Climatiseur", "Nike", "Pneus 4x4", "Perceuse", "Pêche", "Parfum"];

type Item = { key: string; run: () => void; node: React.ReactNode };

// ---------- Barre de recherche ----------
export function SmartSearch({ big, autoFocus, onDone, initial = "", initialScope = "all" }: { big?: boolean; autoFocus?: boolean; onDone?: () => void; initial?: string; initialScope?: Scope }) {
  const { s, mutate } = useStore();
  const { go } = useNav();
  const cat = useCatalog();
  const [q, setQ] = useState(initial);
  const [scope, setScope] = useState<Scope>(initialScope);
  const [open, setOpen] = useState(false);
  const [act, setAct] = useState(-1);
  const [recent, setRecent] = useState<string[]>(recentSearches);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => setQ(initial), [initial]);
  // fermeture au clic extérieur (plus fiable que onBlur sur mobile)
  useEffect(() => {
    if (!open) return;
    const h = (e: Event) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", h);
    return () => document.removeEventListener("pointerdown", h);
  }, [open]);
  const sugg = useMemo(() => suggest(q, cat, s.merchants, scope), [q, cat, s.merchants, scope]);
  const commune = s.profile.commune;

  const finish = () => { setOpen(false); setAct(-1); input.current?.blur(); onDone?.(); };
  const submit = (val = q, sc: Scope = scope) => {
    const v = val.trim();
    if (v) { mutate((d) => { const k = v.toLowerCase(); d.searchLog[k] = (d.searchLog[k] || 0) + 1; }); pushRecent(v); setRecent(recentSearches()); }
    finish();
    go("explore", { q: v, ...(sc !== "all" ? { tab: sc } : {}), ...(big && commune ? { commune } : {}) });
  };

  // Liste à plat pour la navigation au clavier
  const items: { group: string; icon?: any; list: Item[] }[] = [];
  if (sugg) {
    if (sugg.fix) items.push({ group: "", list: [{ key: "fix", run: () => submit(sugg.fix!), node: <><Sparkles size={16} className="sg-ico accent" /><span className="sg-main"><span className="hl">Vouliez-vous dire <b>{sugg.fix}</b> ?</span></span></> }] });
    if (sugg.queries.length) items.push({ group: "", list: sugg.queries.map((x) => ({ key: "q" + x, run: () => submit(x), node: <><Search size={16} className="sg-ico" /><span className="sg-main sg-q"><Hl text={x} q={q} /></span><ArrowUpRight size={15} className="sg-fill" onClick={(e) => { e.stopPropagation(); setQ(x + " "); input.current?.focus(); }} /></> })) });
    if (sugg.cats.length) items.push({ group: "Catégories", list: sugg.cats.map((c) => ({ key: "c" + c.id, run: () => { finish(); go("explore", { cat: c.id }); }, node: <><span className="sg-cat" style={{ background: c.tint }}><c.icon size={15} /></span><span className="sg-main"><Hl text={c.label} q={q} /></span><em>Catégorie</em></> })) });
    if (sugg.brands.length) items.push({ group: "Marques", list: sugg.brands.map((b) => ({ key: "b" + b.name, run: () => submit(b.name, "products"), node: <><span className="sg-mono">{b.name.slice(0, 2).toUpperCase()}</span><span className="sg-main"><Hl text={b.name} q={q} /></span><em>{b.prods.length} produit{b.prods.length > 1 ? "s" : ""} · {b.shops} commerce{b.shops > 1 ? "s" : ""}</em></> })) });
    if (sugg.shops.length) items.push({ group: "Commerces", list: sugg.shops.map((m) => ({ key: "m" + m.id, run: () => { finish(); go("merchant", { id: m.id }); }, node: <><MerchantLogo m={m} size={28} /><span className="sg-main"><Hl text={m.name} q={q} /><small>{m.tagline}</small></span><em><MapPin size={11} /> {m.commune}</em></> })) });
    if (sugg.products.length) items.push({ group: "Produits", list: sugg.products.map((p) => { const m = s.merchants.find((x) => x.id === p.merchantId); return { key: "p" + p.id, run: () => { pushRecent(q); finish(); go("product", { id: p.id }); }, node: <><span className="sugg-thumb"><ProductVisual p={p} /></span><span className="sg-main"><Hl text={p.name} q={q} /><small>{m?.name} · {m?.commune}{!inStock(p) ? (p.status === "soon" ? " · bientôt" : " · épuisé") : ""}</small></span><em className="sg-price">{fmtXPF(p.price)}</em></> }; }) });
  } else if (recent.length) {
    items.push({ group: "Recherches récentes", list: recent.map((x) => ({ key: "r" + x, run: () => submit(x), node: <><Clock size={16} className="sg-ico" /><span className="sg-main">{x}</span></> })) });
  }
  const flat = items.flatMap((g) => g.list);
  useEffect(() => setAct(-1), [q, scope]);
  const empty = !!sugg && !sugg.products.length && !sugg.brands.length && !sugg.shops.length && !sugg.cats.length && !sugg.queries.length;

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setAct((a) => Math.min(flat.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setAct((a) => Math.max(-1, a - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (act >= 0 && flat[act]) flat[act].run(); else submit(); }
    else if (e.key === "Escape") { setOpen(false); }
  };
  const ph = SCOPES.find((x) => x.v === scope)!.ph;
  let idx = -1;

  return (
    <div className={cx("ss", big && "ss-big", open && "is-open")} ref={box}>
      {big && (
        <div className="ss-scopes" role="tablist" aria-label="Rechercher parmi">
          {SCOPES.map((o) => <button key={o.v} role="tab" aria-selected={scope === o.v} className={cx(scope === o.v && "is-on")} onClick={() => { setScope(o.v); input.current?.focus(); setOpen(true); }}>
            {o.v === "products" ? <Package size={14} /> : o.v === "brands" ? <Tag size={14} /> : o.v === "shops" ? <Store size={14} /> : <Search size={14} />}{o.l}
          </button>)}
        </div>
      )}
      <form className="ss-bar" role="search" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Search size={big ? 20 : 18} className="ss-ico" />
        <input
          ref={input} id={big ? "home-search" : "global-search"} autoFocus={autoFocus} value={q} placeholder={big ? ph : "Produit, marque, commerce…"}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => { setOpen(true); if (big && window.innerWidth < 640) setTimeout(() => box.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 250); }} onKeyDown={onKey}
          aria-label="Rechercher" autoComplete="off" enterKeyHint="search" role="combobox" aria-expanded={open} aria-controls="ss-list"
        />
        {q && <button type="button" className="ss-clear" onClick={() => { setQ(""); input.current?.focus(); }} aria-label="Effacer"><X size={16} /></button>}
        {big && <CommuneSelect />}
        {big && <button type="submit" className="ss-go"><Search size={17} className="show-sm" /><span className="hide-sm">Rechercher</span></button>}
      </form>
      {open && (flat.length > 0 || empty) && (
        <div className="ss-drop" id="ss-list" role="listbox">
          {!sugg && recent.length > 0 && <div className="sg-head"><span>Recherches récentes</span><button type="button" className="link" onClick={() => { clearRecent(); setRecent([]); }}>Effacer</button></div>}
          {items.map((g, gi) => (
            <div key={gi} className="sg-group">
              {g.group && sugg && <div className="sg-head"><span>{g.group}</span></div>}
              {g.list.map((it) => { idx++; const i = idx; return (
                <div key={it.key} role="option" aria-selected={act === i} className={cx("sg-row", act === i && "is-act")} onMouseEnter={() => setAct(i)} onClick={it.run}>{it.node}</div>
              ); })}
            </div>
          ))}
          {empty && (
            <div className="sg-empty">
              <strong>Rien pour « {q.trim()} » pour l'instant.</strong>
              <span>Créez une alerte : vous serez prévenu dès qu'un commerce le publie.</span>
              <button type="button" className="btn btn-accent btn-sm" onClick={() => { finish(); go("alerts", { create: { query: q.trim() } }); }}><BellRing size={14} /> Créer une alerte</button>
            </div>
          )}
          {sugg && q.trim() && <button type="button" className="sg-all" onClick={() => submit()}><span>Voir tous les résultats pour « {q.trim()} »</span><CornerDownLeft size={14} /></button>}
        </div>
      )}
    </div>
  );
}

function CommuneSelect() {
  const { s, mutate } = useStore();
  return (
    <label className="ss-commune" title="Commune">
      <MapPin size={15} />
      <select value={s.profile.commune} onChange={(e) => mutate((d) => { d.profile.commune = e.target.value; })} aria-label="Commune">
        <option value="">Toute la Calédonie</option>
        {COMMUNES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <ChevronDown size={14} />
    </label>
  );
}

// Garde la compatibilité avec l'en-tête
export const SearchBox = (p: any) => <SmartSearch {...p} />;

function Rail({ children }: any) { return <div className="rail-wrap"><div className="rail">{children}</div></div>; }

// Bandeau « À la une », juste sous la barre de recherche
function Spotlight({ list }: { list: Product[] }) {
  const { s } = useStore();
  const { go } = useNav();
  return (
    <div className="spot" aria-label="À la une">
      <div className="spot-head"><Megaphone size={13} /> À la une <span>Publications mises en avant</span></div>
      <div className="spot-rail">
        {list.map((p) => {
          const m = s.merchants.find((x) => x.id === p.merchantId);
          return (
            <button key={p.id} className="spot-card" onClick={() => go("product", { id: p.id })}>
              <span className="spot-thumb"><ProductVisual p={p} />{p.deal && dealBadge(p) && <em>{dealBadge(p)}</em>}</span>
              <span className="spot-txt">
                <b>{p.name}</b>
                <small>{m?.name} · {m?.commune}</small>
                <span className="spot-foot"><PriceTag p={p} />{p.sponsored ? <i>Sponsorisé</i> : p.deal ? <i className="is-deal">{dealWhen(p)}</i> : null}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Accueil ----------
export function Home() {
  const { s } = useStore();
  const { go } = useNav();
  const demo = useDemo();
  const cat = useCatalog();
  const commune = s.profile.commune;
  const mOf = (id: string) => s.merchants.find((m) => m.id === id);
  const local = (p: Product) => !commune || mOf(p.merchantId)?.commune === commune;
  const activeM = s.merchants.filter((m) => m.status === "active");

  const recent = useMemo(() => cat.filter((p) => inStock(p)).sort((a, b) => Number(local(b)) - Number(local(a)) || +new Date(b.publishedAt) - +new Date(a.publishedAt)).slice(0, 12), [cat, commune]);
  const soon = useMemo(() => cat.filter((p) => p.status === "soon").sort((a, b) => +new Date(a.arrivedAt) - +new Date(b.arrivedAt)).slice(0, 10), [cat]);
  const popular = useMemo(() => cat.filter(inStock).sort((a, b) => popularity(b, s.favorites) - popularity(a, s.favorites)).slice(0, 8), [cat, s.favorites]);
  const brands = useMemo(() => brandsOf(cat).slice(0, 12), [cat]);
  const shops = useMemo(() => [...activeM].sort((a, b) => Number(b.commune === commune) - Number(a.commune === commune) || Number(s.follows.includes(b.id)) - Number(s.follows.includes(a.id)) || b.followersBase - a.followersBase).slice(0, 8), [activeM, commune, s.follows]);
  const todayN = cat.filter((p) => inStock(p) && Date.now() - +new Date(p.publishedAt) < 36 * 3600e3).length;
  const stockN = cat.filter(inStock).length;
  const ideas = useMemo(() => {
    const top = Object.entries(s.searchLog).sort((a, b) => b[1] - a[1]).map(([k]) => k);
    const fromCat = brands.slice(0, 4).map((b) => b.name);
    return Array.from(new Set([...recentSearches(), ...top, ...fromCat, ...IDEAS].map((x) => x.trim()).filter(Boolean))).slice(0, 8);
  }, [s.searchLog, brands]);
  const emptyCatalog = cat.length === 0;
  // Mises en avant : publications sponsorisées (forfait Premium) et « À la une » (admin), ordre mélangé à chaque visite
  const [seed] = useState(() => Math.random());
  const spotlight = useMemo(() => {
    const h = (id: string) => { let x = seed * 1e9; for (const ch of id) x = (x * 31 + ch.charCodeAt(0)) % 1e9; return x; };
    return cat.filter((p) => (p.sponsored || p.featured) && p.status !== "out" && dealState(p) !== "upcoming")
      .sort((a, b) => Number(b.sponsored) - Number(a.sponsored) || Number(local(b)) - Number(local(a)) || h(a.id) - h(b.id)).slice(0, 10);
  }, [cat, commune, seed]);
  const deals = useMemo(() => cat.filter((p) => p.deal && !isRestoProduct(p) && p.status !== "out")
    .sort((a, b) => Number(dealState(a) === "upcoming") - Number(dealState(b) === "upcoming") || Number(local(b)) - Number(local(a)) || +new Date(a.deal!.endAt) - +new Date(b.deal!.endAt)).slice(0, 12), [cat, commune]);
  const resto = useMemo(() => cat.filter((p) => isRestoProduct(p) && p.status !== "out")
    .sort((a, b) => Number(dealState(a) === "upcoming") - Number(dealState(b) === "upcoming") || Number(local(b)) - Number(local(a)) || +new Date(b.publishedAt) - +new Date(a.publishedAt)).slice(0, 12), [cat, commune]);
  const liveDeals = cat.filter((p) => p.deal && dealState(p) === "live").length;

  const quick = [
    ...(liveDeals ? [{ l: "Promos", i: Flame, n: liveDeals, run: () => go("explore", { promo: 1 }) }] : []),
    ...(resto.length ? [{ l: "Restaurants", i: UtensilsCrossed, n: resto.length, run: () => go("explore", { cat: "restauration" }) }] : []),
    { l: "En stock", i: PackageCheck, n: stockN, run: () => go("explore", { stock: 1, ...(commune ? { commune } : {}) }) },
    { l: "Arrivés aujourd'hui", i: Zap, n: todayN, run: () => go("explore", { date: "24h" }) },
    { l: "Prochains arrivages", i: CalendarClock, n: soon.length, run: () => go("explore", { status: "soon" }) },
    { l: "Essayable en magasin", i: Shirt, run: () => go("explore", { tryOn: 1 }) },
    ...(commune ? [{ l: `À ${commune}`, i: MapPin, run: () => go("explore", { commune }) }] : []),
  ];

  return (
    <div className="page home2">
      <section className="finder">
        <div className="finder-glow" aria-hidden />
        <div className="finder-in">
          <span className="finder-eyebrow">Nouvelle-Calédonie · arrivages des commerces</span>
          <h1>Trouvez-le près de chez vous.</h1>
          <p className="finder-sub">Cherchez un produit, une marque ou un commerce : ARRIVAGE vous dit qui l'a, où et à quel prix.</p>
          <SmartSearch big />
          {spotlight.length > 0 && <Spotlight list={spotlight} />}
          <div className="finder-quick">
            {quick.map((x) => <button key={x.l} className="qchip" onClick={x.run}><x.i size={15} />{x.l}{x.n ? <span>{x.n}</span> : null}</button>)}
          </div>
          <div className="finder-ideas">
            <span><TrendingUp size={14} /> Idées :</span>
            {ideas.map((x) => <button key={x} onClick={() => { pushRecent(x); go("explore", { q: x }); }}>{x}</button>)}
          </div>
        </div>
      </section>

      {emptyCatalog && (
        <section className="sec launch">
          <div className="launch-txt">
            <span className="eyebrow">Lancement en cours</span>
            <h2>Les premiers commerces s'installent.</h2>
            <p>Le catalogue se remplit au fur et à mesure que les boutiques calédoniennes publient leurs arrivages. Dites-nous ce que vous cherchez : vous serez prévenu dès que ça arrive.</p>
            <div className="launch-cta">
              <Btn variant="accent" icon={BellRing} onClick={() => go("alerts", { create: {} })}>Créer une alerte</Btn>
              <Btn variant="outline" icon={Store} onClick={() => go("signup")}>Inscrire mon commerce</Btn>
              {!demo.on && <Btn variant="outline" icon={FlaskConical} onClick={() => demo.setOn(true)}>Voir un aperçu avec des exemples</Btn>}
            </div>
          </div>
          <ol className="launch-steps">
            <li><b>1</b><span><strong>Cherchez</strong> un produit, une marque ou une boutique.</span></li>
            <li><b>2</b><span><strong>Comparez</strong> prix, stock et commune en un coup d'œil.</span></li>
            <li><b>3</b><span><strong>Foncez</strong> en magasin ou contactez le commerce.</span></li>
          </ol>
        </section>
      )}

      {deals.length > 0 && (
        <section className="sec">
          <SectionHead title="Promos et offres du moment" sub="Promotions flash des commerces, aux dates indiquées" action={<button className="link" onClick={() => go("explore", { promo: 1 })}>Toutes les promos <ChevronRight size={15} /></button>} />
          <Rail>{deals.map((p) => <ProductCard key={p.id} p={p} />)}</Rail>
        </section>
      )}

      {resto.length > 0 && (
        <section className="sec">
          <SectionHead title="Côté restaurants" sub="Plats du jour, suggestions du week-end et menus" action={<button className="link" onClick={() => go("explore", { cat: "restauration" })}>Tous les restaurants <ChevronRight size={15} /></button>} />
          <Rail>{resto.map((p) => <ProductCard key={p.id} p={p} />)}</Rail>
        </section>
      )}

      <section className="sec">
        <SectionHead title="Parcourir par catégorie" action={!emptyCatalog && <button className="link" onClick={() => go("explore", {})}>Tout le catalogue <ChevronRight size={15} /></button>} />
        <div className="cats2">
          {CATEGORIES.filter((c) => s.categories.find((x) => x.id === c.id)?.active).map((c) => {
            const n = cat.filter((p) => p.category === c.id).length;
            return (
              <button key={c.id} className={cx("cat2", !n && "is-zero")} onClick={() => go("explore", { cat: c.id })}>
                <span className="cat2-ico" style={{ background: c.tint }}><c.icon size={22} strokeWidth={1.7} /></span>
                <span className="cat2-l">{c.label}</span>
                <span className="cat2-n">{n ? `${n} produit${n > 1 ? "s" : ""}` : "Bientôt"}</span>
              </button>
            );
          })}
        </div>
      </section>

      {brands.length > 0 && (
        <section className="sec">
          <SectionHead title="Marques disponibles" sub="Trouvez une marque et tous les commerces qui la vendent" action={<button className="link" onClick={() => go("explore", { tab: "brands" })}>Toutes les marques <ChevronRight size={15} /></button>} />
          <div className="brands2">
            {brands.map((b) => (
              <button key={b.name} className="brand2" onClick={() => go("explore", { q: b.name, tab: "products" })}>
                <span className="brand2-mono">{b.name.replace(/[^A-Za-z0-9À-ÿ ]/g, "").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}</span>
                <span className="brand2-t"><b>{b.name}</b><small>{b.prods.length} produit{b.prods.length > 1 ? "s" : ""} · {b.shops} commerce{b.shops > 1 ? "s" : ""}</small></span>
              </button>
            ))}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section className="sec">
          <SectionHead title={commune ? `Derniers arrivages, ${commune} d'abord` : "Derniers arrivages"} sub="En stock chez les commerçants" action={<button className="link" onClick={() => go("explore", { stock: 1 })}>Voir tout <ChevronRight size={15} /></button>} />
          <Rail>{recent.map((p) => <ProductCard key={p.id} p={p} />)}</Rail>
        </section>
      )}

      {shops.length > 0 && (
        <section className="sec">
          <SectionHead title={commune ? `Commerces à ${commune} et alentours` : "Commerces à découvrir"} action={<button className="link" onClick={() => go("merchants")}>Annuaire <ChevronRight size={15} /></button>} />
          <Rail>{shops.map((m) => <MerchantCard key={m.id} m={m} />)}</Rail>
        </section>
      )}

      {soon.length > 0 && (
        <section className="sec">
          <SectionHead title="Bientôt en magasin" sub="Annoncés par les commerçants, dates indicatives" action={<button className="link" onClick={() => go("explore", { status: "soon" })}>Voir tout <ChevronRight size={15} /></button>} />
          <div className="soon-list">
            {soon.slice(0, 6).map((p) => {
              const m = mOf(p.merchantId);
              return (
                <button key={p.id} className="soon" onClick={() => go("product", { id: p.id })}>
                  <div className="soon-date"><span>{new Date(p.arrivedAt).toLocaleDateString("fr-FR", { weekday: "short" })}</span><strong>{new Date(p.arrivedAt).getDate()}</strong><span>{new Date(p.arrivedAt).toLocaleDateString("fr-FR", { month: "short" })}</span></div>
                  <div className="soon-thumb"><ProductVisual p={p} /></div>
                  <div className="soon-main"><strong>{p.name}</strong><span>{m?.name} · {m?.commune}</span></div>
                  <span className="price">{fmtXPF(p.price)}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {popular.length > 0 && (
        <section className="sec">
          <SectionHead title="Les plus recherchés" sub="Vues, favoris et demandes de contact" action={<button className="link" onClick={() => go("explore", { sort: "popular" })}>Voir tout <ChevronRight size={15} /></button>} />
          <div className="grid">{popular.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </section>
      )}

      <section className="sec alert-cta">
        <div>
          <h2>Vous ne trouvez pas ?</h2>
          <p>Créez une alerte avec le produit, la marque ou votre budget. Dès qu'un commerce le publie, vous êtes prévenu.</p>
        </div>
        <Btn variant="accent" size="lg" icon={BellRing} onClick={() => go("alerts", { create: {} })}>Créer une alerte</Btn>
      </section>
    </div>
  );
}
