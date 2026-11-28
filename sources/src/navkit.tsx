// Aides de navigation : menu « Plus » de la barre du bas (mobile, iPad en portrait) et recherche globale de l'espace Admin.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Crown, Store, User, Package } from "lucide-react";
import { useStore } from "./store";
import { useNav } from "./nav";
import { norm, fmtXPF } from "./data";
import { Modal, MerchantLogo, ProductVisual, cx } from "./ui";

const TILE: Record<string, string> = { shop: "Ma fiche", theme: "Thème", finance: "Finances", users: "Utilisateurs", posts: "Publications", categories: "Catégories", wanted: "Recherchés", reviews: "Avis" };

// Feuille « Plus » : toutes les pages qui ne tiennent pas dans la barre du bas, rangées par thème, avec leurs pastilles.
export function MoreSheet({ open, onClose, groups, active, go }: { open: boolean; onClose: () => void; groups: { title: string; items: any[] }[]; active: string; go: (n: string, p?: any) => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Plus">
      <div className="more">
        {groups.map((g) => (
          <div key={g.title}>
            <div className="more-title">{g.title}</div>
            <div className="more-grid">
              {g.items.map((x) => (
                <button key={x.n} className={cx("more-tile", active === x.n && "is-on")} onClick={() => { onClose(); go(x.n, {}); }}>
                  <span className="bn-ico"><x.i size={22} />{x.badge ? <span className="badge">{x.badge}</span> : null}</span>
                  <span>{TILE[x.n] ?? x.s ?? x.l}</span>
                  {x.lock && <Crown size={12} className="more-lock" aria-label="Forfait supérieur" />}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// Petit rappel « Filtré sur : … » avec une croix pour retirer le filtre
export function FilterTag({ label, onClear }: { label: string; onClear: () => void }) {
  return <span className="filter-tag">{label}<button onClick={onClear} aria-label="Retirer le filtre"><X size={14} /></button></span>;
}

// Recherche globale Admin : commerces, comptes et publications au même endroit. Raccourci Ctrl+K (ou Cmd+K).
export function AdminSearch() {
  const { s } = useStore();
  const { go, route } = useNav();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [route]);
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); input.current?.focus(); setOpen(true); } };
    const out = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("keydown", k); document.addEventListener("mousedown", out);
    return () => { window.removeEventListener("keydown", k); document.removeEventListener("mousedown", out); };
  }, []);
  const groups = useMemo(() => {
    const n = norm(q.trim());
    if (n.length < 2) return [];
    const has = (txt: string) => norm(txt).includes(n);
    const shops = s.merchants.filter((m) => has(`${m.name} ${m.commune} ${m.tagline || ""}`)).slice(0, 5);
    const users = s.users.filter((u) => has(`${u.label} ${u.email}`)).slice(0, 5);
    const posts = s.products.filter((p) => has(`${p.name} ${p.brand || ""}`)).slice(0, 5);
    const status: Record<string, string> = { active: "actif", pending: "en attente", suspended: "suspendu", rejected: "refusé" };
    return [
      { title: "Commerces", list: shops.map((m) => ({ key: "m" + m.id, run: () => go("merchant", { id: m.id }), node: <><MerchantLogo m={m} size={28} /><span className="sg-main">{m.name}<small>{m.commune} · {status[m.status] || m.status}</small></span><Store size={14} className="sg-ico" /></> })) },
      { title: "Comptes", list: users.map((u) => ({ key: "u" + u.id, run: () => go("users", { q: u.email || u.label }), node: <><span className="sg-mono">{(u.label || "?").slice(0, 1).toUpperCase()}</span><span className="sg-main">{u.label}<small>{u.email}{u.status === "blocked" ? " · bloqué" : ""}</small></span><User size={14} className="sg-ico" /></> })) },
      { title: "Publications", list: posts.map((p) => { const m = s.merchants.find((x) => x.id === p.merchantId); return { key: "p" + p.id, run: () => go("posts", { q: p.name, m: p.merchantId }), node: <><span className="sugg-thumb"><ProductVisual p={p} /></span><span className="sg-main">{p.name}<small>{m?.name} · {fmtXPF(p.price)}</small></span><Package size={14} className="sg-ico" /></> }; }) },
    ].filter((g) => g.list.length);
  }, [q, s.merchants, s.users, s.products]);
  const flat = groups.flatMap((g) => g.list);
  useEffect(() => setSel(0), [q]);
  const run = (x: any) => { x.run(); setOpen(false); setQ(""); input.current?.blur(); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((i) => Math.min(flat.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter" && flat[sel]) { e.preventDefault(); run(flat[sel]); }
    else if (e.key === "Escape") { setOpen(false); input.current?.blur(); }
  };
  let i = -1;
  return (
    <div className="asearch" ref={box}>
      <div className="search">
        <Search size={18} className="search-ico" />
        <input ref={input} id="admin-q" value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKey} placeholder="Rechercher un commerce, un compte, une publication" aria-label="Recherche globale" autoComplete="off" />
        {q ? <button className="search-clear" onClick={() => { setQ(""); input.current?.focus(); }} aria-label="Effacer"><X size={14} /></button> : <kbd className="asearch-kbd hide-md">Ctrl K</kbd>}
        {open && q.trim().length >= 2 && (
          <div className="sugg" role="listbox">
            {!flat.length && <p className="muted small" style={{ padding: "10px 12px", margin: 0 }}>Aucun résultat pour « {q.trim()} ».</p>}
            {groups.map((g) => (
              <div key={g.title}>
                <div className="sg-head"><span>{g.title}</span></div>
                {g.list.map((x) => { i++; const k = i; return <button key={x.key} role="option" aria-selected={sel === k} className={cx("sugg-row", sel === k && "is-sel")} onMouseEnter={() => setSel(k)} onClick={() => run(x)}>{x.node}</button>; })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
