import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, MapPin, Bell, User, Heart, ChevronRight, ChevronLeft, SlidersHorizontal, X, Store, Clock, Phone, Mail,
  Navigation, Share2, BellRing, Flag, Plus, Pencil, Trash2, Copy, Check, Calendar, Package, BadgeCheck, Info, ArrowUpRight, RotateCcw, Megaphone, Palette, ShoppingBag, Shirt, Sparkles, Tag,
} from "lucide-react";
import { CATEGORIES, COMMUNES, STATUSES, catById, fmtXPF, fmtNum, fmtRel, fmtDate, fmtDateLong, norm, Product, Merchant, Status } from "./data";
import { useStore, alertMatches, Alert, productHay, newId } from "./store";
import { matchScore, correct, termScore, indexOf, words as qWords } from "./search";
import { useNav } from "./nav";
import { ReserveButton } from "./reservations";
import { RatingBadge, ReviewsBlock } from "./reviews";
import { AccountSection } from "./auth";
import { Btn, IconBtn, StatusPill, Chip, ProductVisual, MerchantLogo, MerchantCover, Modal, Empty, SectionHead, Segmented, Field, DemoTag, cx } from "./ui";

// ---------- Sélecteurs ----------
export function useCatalog() {
  const { s } = useStore();
  return useMemo(() => {
    const activeM = new Set(s.merchants.filter((m) => m.status === "active").map((m) => m.id));
    const activeC = new Set(s.categories.filter((c) => c.active).map((c) => c.id));
    return s.products.filter((p) => p.state === "published" && activeM.has(p.merchantId) && activeC.has(p.category));
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
        <div className="pcard-top"><StatusPill status={p.status} small /></div>
        <FavButton id={p.id} overlay />
        {p.sponsored && <span className="sponso">Sponsorisé</span>}
        {p.tryOn && <span className="tryon-tag"><Shirt size={11} /> Essayable</span>}
      </div>
      <div className="pcard-body">
        <div className="pcard-cat">{c.label}</div>
        <h3 className="pcard-name">{p.name}</h3>
        <div className="pcard-merchant">{m?.name}{m?.verified && <BadgeCheck size={13} className="verified" />}</div>
        <div className="pcard-foot">
          <span className="price">{fmtXPF(p.price)}</span>
          <span className="pcard-meta"><MapPin size={12} />{m?.commune} · {isSoon ? "prévu " + fmtRel(p.arrivedAt) : fmtRel(p.publishedAt)}</span>
        </div>
      </div>
    </article>
  );
}

function Rail({ children }: any) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <div className="rail-wrap">
      <button className="rail-btn rail-l" onClick={() => scroll(-1)} aria-label="Précédent"><ChevronLeft size={18} /></button>
      <div className="rail" ref={ref}>{children}</div>
      <button className="rail-btn rail-r" onClick={() => scroll(1)} aria-label="Suivant"><ChevronRight size={18} /></button>
    </div>
  );
}

// ---------- En-tête consommateur ----------
export function SearchBox({ autoFocus, onDone, initial = "" }: any) {
  const { s, mutate } = useStore();
  const { go } = useNav();
  const cat = useCatalog();
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  useEffect(() => setQ(initial), [initial]);
  const nq = norm(q.trim());
  const sugg = useMemo(() => {
    if (nq.length < 2) return null;
    const hayOf = (p: Product) => productHay(p, s.merchants.find((m) => m.id === p.merchantId));
    const prods = cat.map((p) => { const sc = matchScore(nq, hayOf(p)); return { p, sc: sc && sc + 0.4 * matchScore(nq, `${p.name} ${p.brand || ""}`) }; }).filter((x) => x.sc > 0).sort((a, b) => b.sc - a.sc).slice(0, 5).map((x) => x.p);
    const fz = (t: string) => nq.length >= 3 && qWords(nq).length === 1 ? termScore(qWords(nq)[0], indexOf(t)).s >= 0.7 : norm(t).includes(nq);
    const merchants = s.merchants.filter((m) => m.status === "active" && (norm(m.name + " " + m.tagline).includes(nq) || fz(m.name))).slice(0, 3);
    const cats = CATEGORIES.filter((c) => norm(c.label).includes(nq) || fz(c.label)).slice(0, 3);
    const brands = Array.from(new Set(cat.map((p) => p.brand))).filter((b) => b !== "Sans marque" && (norm(b).includes(nq) || fz(b))).slice(0, 3);
    const fix = correct(nq, cat.map(hayOf));
    return { prods, merchants, cats, brands, fix };
  }, [nq, cat, s.merchants]);
  const submit = (val = q) => {
    const v = val.trim();
    if (v) mutate((d) => { const k = v.toLowerCase(); d.searchLog[k] = (d.searchLog[k] || 0) + 1; });
    setOpen(false); onDone?.();
    go("explore", { q: v });
  };
  return (
    <div className="search">
      <Search size={18} className="search-ico" />
      <input
        id="global-search" autoFocus={autoFocus} value={q} placeholder="Produit, marque, commerce, mot-clé…"
        onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 160)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") setOpen(false); }}
        aria-label="Rechercher"
      />
      {q && <button className="search-clear" onClick={() => { setQ(""); }} aria-label="Effacer"><X size={15} /></button>}
      {open && sugg && (
        <div className="sugg">
          {!sugg.prods.length && !sugg.merchants.length && !sugg.cats.length && (
            <div className="sugg-empty">
              Aucun produit pour « {q} » pour l'instant.
              <button className="link" onMouseDown={() => go("alerts", { create: { query: q } })}>Créer une alerte <ArrowUpRight size={14} /></button>
            </div>
          )}
          {sugg.fix && <button className="sugg-fix" onMouseDown={() => submit(sugg.fix!)}><Sparkles size={15} /> <span>Vouliez-vous dire <b>{sugg.fix}</b> ?</span></button>}
          {sugg.cats.map((c) => (
            <button key={c.id} className="sugg-row" onMouseDown={() => { go("explore", { cat: c.id }); onDone?.(); }}><c.icon size={16} /> <span>{c.label}</span><em>Catégorie</em></button>
          ))}
          {sugg.brands.map((b) => (
            <button key={b} className="sugg-row" onMouseDown={() => submit(b)}><Search size={16} /> <span>{b}</span><em>Marque</em></button>
          ))}
          {sugg.merchants.map((m) => (
            <button key={m.id} className="sugg-row" onMouseDown={() => { go("merchant", { id: m.id }); onDone?.(); }}><MerchantLogo m={m} size={22} /> <span>{m.name}</span><em>Commerce · {m.commune}</em></button>
          ))}
          {sugg.prods.map((p) => (
            <button key={p.id} className="sugg-row" onMouseDown={() => { go("product", { id: p.id }); onDone?.(); }}>
              <span className="sugg-thumb"><ProductVisual p={p} /></span><span>{p.name}</span><em>{fmtXPF(p.price)}</em>
            </button>
          ))}
          {q.trim() && <button className="sugg-all" onMouseDown={() => submit()}>Voir tous les résultats pour « {q} »</button>}
        </div>
      )}
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

// ---------- Accueil ----------
export function Home() {
  const { s } = useStore();
  const { go } = useNav();
  const cat = useCatalog();
  const featured = useMemo(() => {
    const f = cat.filter((p) => p.featured || p.sponsored);
    return (f.length ? f : cat).slice().sort((a, b) => Number(b.sponsored) - Number(a.sponsored) || +new Date(b.publishedAt) - +new Date(a.publishedAt)).slice(0, 5);
  }, [cat]);
  const [hi, setHi] = useState(0);
  useEffect(() => { const t = setInterval(() => setHi((x) => (x + 1) % Math.max(featured.length, 1)), 7000); return () => clearInterval(t); }, [featured.length]);
  const hero = featured[hi % Math.max(featured.length, 1)];
  const heroM = hero && s.merchants.find((m) => m.id === hero.merchantId);

  const today = cat.filter((p) => p.status !== "soon" && Date.now() - +new Date(p.publishedAt) < 36 * 3600e3).sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
  const popular = cat.filter((p) => p.status !== "soon").sort((a, b) => popularity(b, s.favorites) - popularity(a, s.favorites)).slice(0, 10);
  const soon = cat.filter((p) => p.status === "soon").sort((a, b) => +new Date(a.arrivedAt) - +new Date(b.arrivedAt));
  const recos = cat.filter((p) => s.profile.interests.includes(p.category) && p.status !== "out").sort((a, b) => {
    const ma = s.merchants.find((m) => m.id === a.merchantId)?.commune === s.profile.commune ? 1 : 0;
    const mb = s.merchants.find((m) => m.id === b.merchantId)?.commune === s.profile.commune ? 1 : 0;
    return mb - ma || +new Date(b.publishedAt) - +new Date(a.publishedAt);
  }).slice(0, 8);
  const merchants = s.merchants.filter((m) => m.status === "active").sort((a, b) => Number(s.follows.includes(a.id)) - Number(s.follows.includes(b.id)) || b.followersBase - a.followersBase).slice(0, 8);
  const weekCount = cat.filter((p) => Date.now() - +new Date(p.publishedAt) < 7 * 864e5).length;

  return (
    <div className="page home">
      {hero && heroM && (
        <section className="hero">
          <div className="hero-text">
            <div className="hero-eyebrow">
              {hero.sponsored ? <span className="sponso sponso-inline">Sponsorisé</span> : <span className="eyebrow">À la une</span>}
              <StatusPill status={hero.status} />
            </div>
            <h1>{hero.name}</h1>
            <p className="hero-sub">Chez <button className="link-strong" onClick={() => go("merchant", { id: heroM.id })}>{heroM.name}</button> à {heroM.commune} · publié {fmtRel(hero.publishedAt)}</p>
            <div className="hero-price">{fmtXPF(hero.price)}{hero.qty ? <span> · {hero.qty} en stock déclarés</span> : null}</div>
            <div className="hero-cta">
              <Btn variant="accent" size="lg" onClick={() => go("product", { id: hero.id })}>Voir l'arrivage</Btn>
              <Btn variant="ghost-light" size="lg" icon={BellRing} onClick={() => go("alerts", { create: { query: hero.name, category: hero.category } })}>Créer une alerte</Btn>
            </div>
            <div className="hero-dots">
              {featured.map((f, i) => <button key={f.id} className={cx(i === hi % featured.length && "is-on")} onClick={() => setHi(i)} aria-label={`Voir ${f.name}`} />)}
            </div>
          </div>
          <div className="hero-visual" onClick={() => go("product", { id: hero.id })}>
            <ProductVisual p={hero} key={hero.id} className="hero-pv" />
          </div>
        </section>
      )}

      {!hero && (
        <section className="hero hero-welcome">
          <div className="hero-text">
            <div className="hero-eyebrow"><span className="eyebrow">Nouvelle-Calédonie</span></div>
            <h1>Tout ce qui débarque, au même endroit.</h1>
            <p className="hero-sub">Les commerces calédoniens annoncent ici leurs arrivages. Suivez vos boutiques préférées, créez une alerte et soyez prévenu dès que le produit que vous attendez arrive.</p>
            <div className="hero-cta">
              <Btn variant="accent" size="lg" icon={BellRing} onClick={() => go("alerts", {})}>Créer une alerte</Btn>
              <Btn variant="ghost-light" size="lg" icon={Store} onClick={() => go("signup")}>Inscrire mon commerce</Btn>
            </div>
          </div>
        </section>
      )}

      <div className="tagline-strip">
        <span><strong>{weekCount}</strong> arrivages publiés cette semaine</span>
        <span><strong>{s.merchants.filter((m) => m.status === "active").length}</strong> commerce{s.merchants.filter((m) => m.status === "active").length > 1 ? "s" : ""} sur ARRIVAGE</span>
        <span className="hide-sm">Le Caillou, toujours à jour.</span>
      </div>

      <section className="sec">
        <SectionHead title="Catégories" action={<button className="link" onClick={() => go("explore", {})}>Tout explorer <ChevronRight size={15} /></button>} />
        <div className="cats">
          {CATEGORIES.filter((c) => s.categories.find((x) => x.id === c.id)?.active).map((c) => {
            const n = cat.filter((p) => p.category === c.id).length;
            return (
              <button key={c.id} className="cat" onClick={() => go("explore", { cat: c.id })}>
                <span className="cat-ico" style={{ background: c.tint }}><c.icon size={20} strokeWidth={1.7} /></span>
                <span className="cat-l">{c.label}</span>
                <span className="cat-n">{n}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="sec">
        <SectionHead title="Arrivés aujourd'hui" sub="Publiés par les commerçants ces dernières heures" action={<button className="link" onClick={() => go("explore", { date: "24h" })}>Voir tout <ChevronRight size={15} /></button>} />
        {today.length ? <Rail>{today.map((p) => <ProductCard key={p.id} p={p} />)}</Rail> : <Empty icon={Package} title="Pas encore d'arrivage aujourd'hui" body="Revenez plus tard ou explorez le catalogue." />}
      </section>

      {recos.length > 0 && (
        <section className="sec">
          <SectionHead title="Sélectionné pour vous" sub={`D'après vos centres d'intérêt${s.profile.commune ? " et votre commune (" + s.profile.commune + ")" : ""}`} action={<button className="link" onClick={() => go("profile")}>Modifier mes intérêts <ChevronRight size={15} /></button>} />
          <Rail>{recos.map((p) => <ProductCard key={p.id} p={p} />)}</Rail>
        </section>
      )}

      <section className="sec">
        <SectionHead title="Les plus suivis" sub="Vues, favoris et demandes de contact" action={<button className="link" onClick={() => go("explore", { sort: "popular" })}>Voir tout <ChevronRight size={15} /></button>} />
        {popular.length ? <div className="grid">{popular.slice(0, 8).map((p) => <ProductCard key={p.id} p={p} />)}</div> : <Empty icon={Package} title="Les premiers arrivages arrivent bientôt" body="Les commerces partenaires publient leurs nouveautés ici. Créez une alerte pour être prévenu." />}
      </section>

      <section className="sec">
        <SectionHead title="Prochains arrivages" sub="Annoncés par les commerçants, dates indicatives" />
        {soon.length ? (
          <div className="soon-list">
            {soon.map((p) => {
              const m = s.merchants.find((x) => x.id === p.merchantId)!;
              return (
                <button key={p.id} className="soon" onClick={() => go("product", { id: p.id })}>
                  <div className="soon-date"><span>{new Date(p.arrivedAt).toLocaleDateString("fr-FR", { weekday: "short" })}</span><strong>{new Date(p.arrivedAt).getDate()}</strong><span>{new Date(p.arrivedAt).toLocaleDateString("fr-FR", { month: "short" })}</span></div>
                  <div className="soon-thumb"><ProductVisual p={p} /></div>
                  <div className="soon-main"><strong>{p.name}</strong><span>{m.name} · {m.commune}</span></div>
                  <span className="price">{fmtXPF(p.price)}</span>
                </button>
              );
            })}
          </div>
        ) : <Empty icon={Calendar} title="Aucun arrivage annoncé" />}
      </section>

      <section className="sec">
        <SectionHead title="Commerces à découvrir" action={<button className="link" onClick={() => go("merchants")}>Annuaire <ChevronRight size={15} /></button>} />
        <Rail>{merchants.map((m) => <MerchantCard key={m.id} m={m} />)}</Rail>
      </section>

      <section className="sec alert-cta">
        <div>
          <h2>Vous cherchez un produit introuvable ?</h2>
          <p>Créez une alerte. Dès qu'un commerce publie un produit correspondant, vous êtes prévenu.</p>
        </div>
        <Btn variant="accent" size="lg" icon={BellRing} onClick={() => go("alerts", { create: {} })}>Créer une alerte</Btn>
      </section>
    </div>
  );
}

// ---------- Explorer ----------
const DATE_OPTS = [{ v: "all", l: "Toutes dates" }, { v: "24h", l: "24 h" }, { v: "7d", l: "7 jours" }, { v: "30d", l: "30 jours" }];
type SearchTab = "products" | "shops" | "brands";
const SORT_OPTS = [{ v: "relevance", l: "Pertinence" }, { v: "recent", l: "Plus récents" }, { v: "popular", l: "Popularité" }, { v: "priceAsc", l: "Prix croissant" }, { v: "priceDesc", l: "Prix décroissant" }];
const emptyFilters = { cats: [] as string[], communes: [] as string[], statuses: [] as string[], min: "", max: "", date: "all", sort: "recent", onlyNew: false, tryOn: false };

export function Explore({ params }: any) {
  const { s } = useStore();
  const { go } = useNav();
  const cat = useCatalog();
  const [q, setQ] = useState(params?.q || "");
  const [f, setF] = useState(() => ({ ...emptyFilters, cats: params?.cat ? [params.cat] : [], date: params?.date || "all", sort: params?.sort || (params?.q ? "relevance" : "recent") }));
  const [sheet, setSheet] = useState(false);
  // Type de résultat : null = choisi automatiquement (le premier onglet qui a des résultats)
  const [tab, setTab] = useState<SearchTab | null>(params?.tab || null);
  useEffect(() => {
    setQ(params?.q || ""); setTab(params?.tab || null);
    setF({ ...emptyFilters, cats: params?.cat ? [params.cat] : [], date: params?.date || "all", sort: params?.sort || (params?.q ? "relevance" : "recent") });
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
      if (f.statuses.length && !f.statuses.includes(p.status)) return false;
      if (!priceErr && min != null && p.price < min) return false;
      if (!priceErr && max != null && p.price > max) return false;
      if (f.onlyNew && !["today", "new"].includes(p.status)) return false;
      if (f.tryOn && !p.tryOn) return false;
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
    return r.sort(by[f.sort]);
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
  const shopHit = !!q.trim() && shops.some((m) => matchScore(norm(q.trim()), m.name) >= 0.8);
  const view: SearchTab = tab || (shopHit ? "shops" : !q.trim() || results.length ? "products" : shops.length ? "shops" : brands.length ? "brands" : "products");
  const openBrand = (b: string) => { setQ(b); setTab("products"); window.scrollTo({ top: 0 }); };

  const fix = useMemo(() => q.trim() ? correct(q, cat.map((p) => productHay(p, s.merchants.find((m) => m.id === p.merchantId)))) : null, [q, cat, s.merchants]);
  const activeCount = f.cats.length + f.communes.length + f.statuses.length + (f.min ? 1 : 0) + (f.max ? 1 : 0) + (f.date !== "all" ? 1 : 0) + (f.onlyNew ? 1 : 0) + (f.tryOn ? 1 : 0);
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
      <label className="switch-row"><input type="checkbox" checked={f.onlyNew} onChange={(e) => setF({ ...f, onlyNew: e.target.checked })} /><span className="switch" /> Nouveautés uniquement</label>
      <label className="switch-row"><input type="checkbox" checked={!!f.tryOn} onChange={(e) => setF({ ...f, tryOn: e.target.checked })} /><span className="switch" /> Essayable en magasin</label>
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
        <h1 className="page-title">{q ? `Résultats pour « ${q} »` : f.cats.length === 1 ? catById(f.cats[0]).label : "Tous les arrivages"}</h1>
        <div className="explore-search">
          <div className="search search-inline">
            <Search size={18} className="search-ico" />
            <input id="explore-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer par produit, marque, commerce…" aria-label="Recherche" />
            {q && <button className="search-clear" onClick={() => setQ("")} aria-label="Effacer"><X size={15} /></button>}
          </div>
        </div>
      </div>
      <div className="rtabs" role="tablist" aria-label="Type de résultat">
        {([["products", "Produits", Package, results.length], ["shops", "Commerces", Store, shops.length], ["brands", "Marques", Tag, brands.length]] as const).map(([id, l, Ic, n]) => (
          <button key={id} role="tab" aria-selected={view === id} className={cx("rtab", view === id && "is-on")} onClick={() => setTab(id)}>
            <Ic size={16} /> {l} <span className="rtab-n">{n}</span>
          </button>
        ))}
      </div>
      {view === "products" && <>
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
            <div className="grid grid-explore">{results.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          ) : (
            <Empty icon={Search} title="Aucun produit ne correspond" body={q ? `Personne ne propose « ${q} » avec ces critères pour le moment.` : "Essayez d'élargir vos filtres."}
              action={<div className="row-center"><Btn variant="outline" icon={RotateCcw} onClick={reset}>Réinitialiser</Btn>{q && <Btn icon={BellRing} onClick={() => go("alerts", { create: { query: q, category: f.cats[0] || "" } })}>Créer une alerte « {q} »</Btn>}</div>} />
          )}
        </div>
      </div>
      </>}
      {view !== "products" && fix && (view === "shops" ? shops : brands).length > 0 && <div className="search-fix"><Sparkles size={16} /><span>Résultats pour « <b>{fix}</b> ». Vous avez tapé « {q.trim()} ».</span></div>}
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
        : <Empty icon={Tag} title="Aucune marque ne correspond" body={`Aucun commerce ne propose la marque « ${q.trim()} » pour le moment.`} action={<Btn icon={BellRing} onClick={() => go("alerts", { create: { query: q } })}>Créer une alerte « {q.trim()} »</Btn>} />)}
      <Modal open={sheet} onClose={() => setSheet(false)} title="Filtres" side>
        {panel}
        <div className="sheet-foot"><Btn className="w-full" onClick={() => setSheet(false)}>Afficher {results.length} produit{results.length > 1 ? "s" : ""}</Btn></div>
      </Modal>
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
    if (p && counted.current !== p.id) { counted.current = p.id; mutate((d) => { const x = d.products.find((y) => y.id === p.id); if (x) x.views++; }); }
    window.scrollTo({ top: 0 });
  }, [params?.id]);
  const catalog = useCatalog();
  if (!p || !m) return <div className="page"><Empty icon={Package} title="Produit introuvable" body="Cette publication a été retirée ou n'existe plus." action={<Btn onClick={() => go("home")}>Retour à l'accueil</Btn>} /></div>;
  const visible = p.state === "published" && m.status === "active";
  const c = catById(p.category);
  const views = p.images.length ? p.images.length : 3;
  const similar = catalog.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4);
  const following = s.follows.includes(m.id);
  const copy = async (txt: string, msg: string) => {
    try { await navigator.clipboard.writeText(txt); toast(msg); } catch { toast("Copie impossible ici : sélectionnez le texte manuellement", "warn"); }
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
          <div className="gallery-thumbs">
            {Array.from({ length: views }).map((_, i) => (
              <button key={i} className={cx(img === i && "is-on")} onClick={() => setImg(i)} aria-label={`Visuel ${i + 1}`}><ProductVisual p={p} variant={i} /></button>
            ))}
          </div>
          {!p.images.length && <p className="note"><Info size={14} /> Aucune photo fournie par le commerçant : visuel indicatif.</p>}
        </div>

        <div className="pinfo">
          <div className="pinfo-top">
            <button className="crumb" onClick={() => go("explore", { cat: p.category })}><c.icon size={14} /> {c.label}</button>
            <StatusPill status={p.status} />
          </div>
          <h1 className="pinfo-title">{p.name}</h1>
          <div className="pinfo-brand">{p.brand}</div>
          <div className="pinfo-price">{fmtXPF(p.price)}</div>

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
            <div><dt>Disponibilité déclarée</dt><dd>{p.status === "soon" ? "Bientôt disponible" : p.status === "out" ? "Épuisé" : p.qty ? `${p.qty} unité${p.qty > 1 ? "s" : ""} en stock` : "En stock"}</dd></div>
            <div><dt>{p.status === "soon" ? "Arrivage prévu" : "Dernier arrivage"}</dt><dd>{fmtDateLong(p.arrivedAt)}</dd></div>
            <div><dt>Mise à jour</dt><dd>{fmtRel(p.updatedAt)}</dd></div>
            <div><dt>Point de vente</dt><dd>{p.store || m.stores[0]}</dd></div>
            {p.tryOn && <div className="facts-wide"><dt>Essayage</dt><dd><span className="tryon-ok"><Shirt size={14} /> Essayable en magasin</span></dd></div>}
          </dl>

          <p className="pinfo-desc">{p.description}</p>
          {p.tags.length > 0 && <div className="tags">{p.tags.map((t) => <span key={t} className="tag">#{t}</span>)}</div>}

          <div className="pinfo-actions">
            <ReserveButton p={p} m={m} />
            <Btn size="lg" variant="outline" icon={Phone} onClick={() => { setContact(true); mutate((d) => { const x = d.products.find((y) => y.id === p.id); if (x) x.contacts = (x.contacts || 0) + 1; }); }}>Contacter le commerce</Btn>
            <Btn size="lg" variant="outline" icon={BellRing} onClick={() => go("alerts", { create: { query: p.name, category: p.category, brand: p.brand } })}>Créer une alerte</Btn>
            <div className="row">
              <FavButtonLabeled id={p.id} />
              <Btn variant="ghost" icon={Share2} onClick={() => copy(`${p.name} — ${fmtXPF(p.price)} chez ${m.name} (${m.commune}) · vu sur ARRIVAGE`, "Texte de partage copié")}>Partager</Btn>
              <Btn variant="ghost" icon={Flag} onClick={() => !requireAccount("Connectez-vous pour signaler une publication à la modération.") ? null : s.profile.blocked ? toast("Votre compte a été bloqué par la modération : vous ne pouvez plus envoyer de signalement", "warn") : setReport(true)}>Signaler</Btn>
            </div>
          </div>
          <p className="disclaimer">Prix et disponibilité déclarés par le commerçant. La réservation met le produit de côté : vous le réglez directement en magasin.</p>
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

      <ReviewsBlock merchantId={m.id} productId={p.id} title="Avis sur ce produit" />

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

      <div className="tip">
        <Megaphone size={18} />
        <div><strong>Tester la notification automatique</strong><p>Passez en mode Commerçant, publiez un arrivage correspondant à une alerte active (par exemple « GTA VI » pour 9 990 F en Gaming), puis revenez ici : la notification apparaît dans la cloche.</p></div>
      </div>

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
export function FavoritesPage() {
  const { s } = useStore();
  const { go } = useNav();
  const [tab, setTab] = useState("products");
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
  if (!m) return <div className="page"><Empty icon={Store} title="Commerce introuvable" /></div>;
  const prods = catalog.filter((p) => p.merchantId === m.id);
  const latest = prods.filter((p) => p.status !== "soon").sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
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
          <FollowBtn m={m} size="md" />
        </div>
      </div>
      <div className="mdetail">
        <div className="mdetail-main">
          <p className="lead">{m.description}</p>
          <div className="chips-wrap">{m.categories.map((c) => <Chip key={c} icon={catById(c).icon} onClick={() => go("explore", { cat: c })}>{catById(c).label}</Chip>)}</div>
          <section className="sec">
            <SectionHead title="Derniers arrivages" sub={`${latest.length} publication${latest.length > 1 ? "s" : ""} en ligne`} />
            {latest.length ? <div className="grid">{latest.map((p) => <ProductCard key={p.id} p={p} />)}</div> : <Empty icon={Package} title="Aucun arrivage publié" />}
          </section>
          <section className="sec">
            <SectionHead title="Prochains arrivages" />
            {next.length ? <div className="grid">{next.map((p) => <ProductCard key={p.id} p={p} />)}</div> : <Empty icon={Calendar} title="Aucun arrivage annoncé" body="Suivez ce commerce pour être prévenu." />}
          </section>
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
      {s.me && (
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
