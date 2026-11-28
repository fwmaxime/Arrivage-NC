// « Je cherche ce produit » : un client signale un produit introuvable sur ARRIVAGE.
// Les commerçants voient les demandes regroupées par produit (sans identité), avec un niveau de détail selon le forfait ;
// les admins voient tout. Côté serveur : supabase/introuvables.sql (table « wanted », fonction « wanted_stats »).
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PackageSearch, Check, BellRing, Trash2, Crown, Lock, MapPin, Users, Calendar, Megaphone, Info, CircleCheck, MessageSquareQuote, Search } from "lucide-react";
import { CATEGORIES, COMMUNES, catById, fmtNum, fmtRel, fmtXPF, norm, Merchant, Product } from "./data";
import { useStore, newId, tokens, productHay } from "./store";
import { sb } from "./backend";
import { useNav } from "./nav";
import { useDemo } from "./demo";
import { Btn, IconBtn, Modal, Field, Empty, Stat, Confirm, cx } from "./ui";

export interface Wanted { id: string; user_id?: string; query: string; brand: string; category: string; commune: string; max_budget: number | null; note: string; status: "open" | "found"; created_at: string }
export interface WantedItem { q: string; n: number; brand?: string; category?: string; last?: string; communes?: Record<string, number>; budget?: number; notes?: string[] }
export interface WantedStats { tier: "none" | "free" | "business" | "premium" | "admin"; total: number; products: number; people: number; week: number; items: WantedItem[] }

const MISSING_TABLE = "Fonction pas encore activée sur le serveur.";
const errMsg = (e: any) => /wanted|schema cache|does not exist|42P01|PGRST20/i.test(String(e?.message || e?.code || "")) ? MISSING_TABLE : "Envoi impossible. Vérifiez votre connexion et réessayez.";

// ---------- Accès serveur ----------
export const wantedApi = {
  async mine(): Promise<Wanted[]> {
    if (!sb) return [];
    const { data, error } = await sb.from("wanted").select("*").order("created_at", { ascending: false });
    if (error) { console.warn("wanted", error.message); return []; }
    return data as Wanted[];
  },
  async all(): Promise<Wanted[]> {
    if (!sb) return [];
    const { data, error } = await sb.from("wanted").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) { console.warn("wanted", error.message); return []; }
    return data as Wanted[];
  },
  async stats(mid: string): Promise<WantedStats | null> {
    if (!sb) return null;
    const { data, error } = await sb.rpc("wanted_stats", { mid });
    if (error) { console.warn("wanted_stats", error.message); return null; }
    return data as WantedStats;
  },
};

// ---------- Formulaire client ----------
interface Draft { query: string; brand: string; category: string; commune: string; budget: string; note: string; alert: boolean }

export function WantedModal({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Partial<Draft> }) {
  const { s, mutate, toast } = useStore();
  const demo = useDemo();
  const blank = (): Draft => ({ query: "", brand: "", category: "", commune: s.profile.commune || "", budget: "", note: "", alert: true, ...(initial || {}) });
  const [d, setD] = useState<Draft>(blank);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setD(blank()); setErr(""); } }, [open]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = d.query.trim().replace(/\s+/g, " ");
    if (q.length < 2) { setErr("Indiquez le produit recherché (2 caractères minimum)."); return; }
    const budget = Number(d.budget.replace(/\D/g, "")) || null;
    // Alerte associée : prévenu dès qu'un commerce publie le produit (même système que « Mes alertes »)
    const addAlert = () => {
      if (!d.alert) return;
      mutate((x) => {
        if (x.alerts.some((a) => norm(a.query).trim() === norm(q))) return;
        x.alerts.unshift({ id: newId(), query: q, brand: d.brand.trim(), category: d.category, maxBudget: budget, commune: d.commune, features: "", active: true, createdAt: new Date().toISOString() });
      });
    };
    if (demo.on) { addAlert(); toast("Mode démonstration : la demande n'est pas envoyée aux commerçants.", "info"); onClose(); return; }
    if (!sb) { setErr("Connexion au serveur impossible."); return; }
    setBusy(true);
    const row = { query: q, brand: d.brand.trim().slice(0, 60), category: d.category, commune: d.commune, max_budget: budget, note: d.note.trim().slice(0, 200), status: "open" };
    const { error } = await sb.from("wanted").upsert(row, { onConflict: "user_id,qkey" });
    setBusy(false);
    if (error) {
      setErr(/row-level security|violates/i.test(error.message) ? "Vous avez envoyé beaucoup de demandes aujourd'hui. Réessayez demain." : errMsg(error));
      return;
    }
    addAlert();
    window.dispatchEvent(new Event("arrivage-wanted"));
    toast(d.alert ? "Demande envoyée aux commerçants. Vous serez prévenu dès qu'il arrive." : "Demande envoyée aux commerçants. Merci !");
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Je cherche ce produit">
      <form className="form wanted-form" onSubmit={submit}>
        <p className="muted wanted-intro">Dites aux commerces de Nouvelle-Calédonie ce que vous ne trouvez pas. Ils voient combien de personnes le cherchent, <b>jamais votre nom</b>, et peuvent le commander.</p>
        <Field label="Produit recherché" htmlFor="wt-q" error={err || undefined}>
          <input id="wt-q" value={d.query} maxLength={80} autoFocus={!d.query} onChange={(e) => { setD({ ...d, query: e.target.value }); setErr(""); }} placeholder="Ex. Lait d'amande sans sucre, PS5 Pro, pneus 265/65 R17" />
        </Field>
        <div className="form-2">
          <Field label="Marque (facultatif)" htmlFor="wt-b"><input id="wt-b" value={d.brand} maxLength={60} onChange={(e) => setD({ ...d, brand: e.target.value })} placeholder="Ex. Alpro" /></Field>
          <Field label="Catégorie" htmlFor="wt-c">
            <select id="wt-c" value={d.category} onChange={(e) => setD({ ...d, category: e.target.value })}><option value="">Je ne sais pas</option>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
          </Field>
        </div>
        <div className="form-2">
          <Field label="Où le cherchez-vous ?" htmlFor="wt-m">
            <select id="wt-m" value={d.commune} onChange={(e) => setD({ ...d, commune: e.target.value })}><option value="">Tout le territoire</option>{COMMUNES.map((c) => <option key={c}>{c}</option>)}</select>
          </Field>
          <Field label="Budget maximum (facultatif)" htmlFor="wt-p"><input id="wt-p" inputMode="numeric" value={d.budget} onChange={(e) => setD({ ...d, budget: e.target.value.replace(/\D/g, "").slice(0, 9) })} placeholder="F CFP" /></Field>
        </div>
        <Field label="Précisions (facultatif)" hint={`Taille, version, quantité… Visible par les commerçants, sans votre nom. ${200 - d.note.length} caractères restants.`} htmlFor="wt-n">
          <textarea id="wt-n" rows={2} maxLength={200} value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} placeholder="Ex. format 1 L, en carton de 6" />
        </Field>
        <label className="switch-row"><input type="checkbox" checked={d.alert} onChange={(e) => setD({ ...d, alert: e.target.checked })} /><span className="switch" /> Me prévenir dès qu'un commerce le publie</label>
        <div className="row-end">
          <Btn variant="ghost" type="button" onClick={onClose}>Annuler</Btn>
          <Btn type="submit" icon={Check} disabled={busy}>{busy ? "Envoi…" : "Envoyer ma demande"}</Btn>
        </div>
      </form>
    </Modal>
  );
}

// Bouton qui ouvre le formulaire (demande de connexion si besoin)
export function WantedButton({ query = "", category = "", variant = "primary", size, label = "Je cherche ce produit", className }: { query?: string; category?: string; variant?: string; size?: string; label?: string; className?: string }) {
  const { requireAccount } = useStore();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Btn variant={variant} size={size} icon={PackageSearch} className={className} onClick={() => { if (requireAccount("Connectez-vous pour signaler un produit introuvable aux commerçants.")) setOpen(true); }}>{label}</Btn>
      {open && createPortal(<WantedModal open onClose={() => setOpen(false)} initial={{ query: query.trim(), category }} />, document.body)}
    </>
  );
}

// Encadré sous les résultats d'une recherche
export function WantedPrompt({ q, category = "" }: { q: string; category?: string }) {
  return (
    <div className="wanted-prompt">
      <span className="wanted-prompt-ico"><PackageSearch size={20} /></span>
      <div className="wanted-prompt-txt">
        <strong>Vous ne trouvez pas {q.trim() ? <>« {q.trim()} »</> : "ce que vous cherchez"} ?</strong>
        <span className="muted small">Signalez-le : les commerçants voient ce que les Calédoniens cherchent et peuvent le faire venir.</span>
      </div>
      <WantedButton query={q} category={category} variant="outline" size="sm" label="Signaler" />
    </div>
  );
}

// ---------- « Mes demandes » (page Mes alertes) ----------
export function MyWanted() {
  const { s, toast } = useStore();
  const [list, setList] = useState<Wanted[] | null>(null);
  const [del, setDel] = useState<Wanted | null>(null);
  const load = () => { if (s.me) wantedApi.mine().then(setList); else setList([]); };
  useEffect(() => { load(); const f = () => load(); window.addEventListener("arrivage-wanted", f); return () => window.removeEventListener("arrivage-wanted", f); }, [s.me?.id]);
  const setFound = async (w: Wanted) => {
    if (!sb) return;
    const { error } = await sb.from("wanted").update({ status: w.status === "found" ? "open" : "found" }).eq("id", w.id);
    if (error) { toast(errMsg(error), "warn"); return; }
    toast(w.status === "found" ? "Demande réactivée" : "Bonne nouvelle ! Demande marquée comme trouvée.", "ok"); load();
  };
  const remove = async (w: Wanted) => {
    if (!sb) return;
    const { error } = await sb.from("wanted").delete().eq("id", w.id);
    if (error) { toast(errMsg(error), "warn"); return; }
    toast("Demande retirée", "info"); load();
  };
  return (
    <section className="my-wanted">
      <div className="shead">
        <div><h2>Produits que je cherche</h2><p>Signalés aux commerçants, sans votre nom. Retirés automatiquement après 90 jours.</p></div>
        <WantedButton variant="outline" size="sm" label="Signaler un produit" />
      </div>
      {!s.me ? <p className="muted small">Connectez-vous pour signaler un produit introuvable.</p>
        : list === null ? <p className="muted small">Chargement…</p>
        : !list.length ? <p className="muted small">Aucune demande pour l'instant. Si une recherche ne donne rien, touchez « Je cherche ce produit ».</p>
        : <div className="alerts">{list.map((w) => {
          const old = Date.now() - +new Date(w.created_at) > 90 * 864e5;
          return (
            <div key={w.id} className={cx("alert-row", (w.status === "found" || old) && "is-off")}>
              <span className="alert-ico"><PackageSearch size={18} /></span>
              <div className="alert-main">
                <strong>{w.query}</strong>
                <div className="alert-crit">
                  {w.brand && <span>{w.brand}</span>}
                  {w.category && <span>{catById(w.category).label}</span>}
                  {w.max_budget ? <span>≤ {fmtXPF(w.max_budget)}</span> : null}
                  <span>{w.commune || "Tout le territoire"}</span>
                </div>
                <div className="alert-status muted">{w.status === "found" ? "Trouvé" : old ? "Expirée" : "Visible par les commerçants"} · envoyée {fmtRel(w.created_at)}</div>
              </div>
              <div className="alert-actions">
                <Btn size="sm" variant="ghost" icon={CircleCheck} onClick={() => setFound(w)}>{w.status === "found" ? "Je cherche encore" : "Trouvé"}</Btn>
                <IconBtn icon={Trash2} label="Retirer" onClick={() => setDel(w)} />
              </div>
            </div>
          );
        })}</div>}
      <Confirm open={!!del} title="Retirer cette demande ?" body={`« ${del?.query || ""} » ne sera plus comptée auprès des commerçants.`} confirmLabel="Retirer" danger onConfirm={() => del && remove(del)} onClose={() => setDel(null)} />
    </section>
  );
}

// ---------- Côté commerçant ----------
let statsCache: { mid: string; at: number; v: WantedStats | null } | null = null;
export function useWantedStats(mid: string) {
  const [v, setV] = useState<WantedStats | null | undefined>(statsCache?.mid === mid ? statsCache.v : undefined);
  useEffect(() => {
    if (statsCache && statsCache.mid === mid && Date.now() - statsCache.at < 60000) { setV(statsCache.v); return; }
    let live = true;
    wantedApi.stats(mid).then((r) => { statsCache = { mid, at: Date.now(), v: r }; if (live) setV(r); });
    return () => { live = false; };
  }, [mid]);
  return v;
}

const inCatalog = (it: WantedItem, mine: Product[]) => {
  const t = tokens(it.q + " " + (it.brand || ""));
  return t.length > 0 && mine.some((p) => { const hay = productHay(p); return t.filter((x) => hay.includes(x)).length / t.length >= 0.75; });
};
const topCommunes = (c?: Record<string, number>) => Object.entries(c || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);

function WantedRows({ items, mine, tier, onPublish }: { items: WantedItem[]; mine: Product[]; tier: WantedStats["tier"]; onPublish?: (it: WantedItem) => void }) {
  const max = Math.max(1, ...items.map((i) => i.n));
  return (
    <div className="wanted-list">
      {items.map((it, i) => {
        const have = inCatalog(it, mine);
        return (
          <div key={it.q + i} className="wanted-row">
            <span className="wanted-rank">{i + 1}</span>
            <div className="wanted-main">
              <strong>{it.q}{it.brand && norm(it.q).indexOf(norm(it.brand)) < 0 ? <em> · {it.brand}</em> : null}</strong>
              <div className="wanted-meta">
                <span>{it.category ? catById(it.category).label : "Catégorie non précisée"}</span>
                {topCommunes(it.communes).map(([c, n]) => <span key={c}><MapPin size={12} />{c}{n > 1 ? ` (${n})` : ""}</span>)}
                {it.last && <span><Calendar size={12} />{fmtRel(it.last)}</span>}
                {it.budget ? <span>budget moyen {fmtXPF(it.budget)}</span> : null}
              </div>
              {it.notes && it.notes.length > 0 && <div className="wanted-notes">{it.notes.slice(0, 3).map((n, k) => <span key={k}><MessageSquareQuote size={12} />{n}</span>)}</div>}
            </div>
            <div className="wanted-n">
              <div className="bar bar-inline"><i style={{ width: (it.n / max) * 100 + "%" }} /></div>
              <b>{fmtNum(it.n)}</b><span className="muted small">{it.n > 1 ? "personnes" : "personne"}</span>
            </div>
            {onPublish && <div className="wanted-act">{have ? <span className="pill pill-sm pill-green"><i />Dans votre catalogue</span> : <Btn size="sm" variant="outline" icon={Megaphone} onClick={() => onPublish(it)}>Annoncer</Btn>}</div>}
          </div>
        );
      })}
    </div>
  );
}

const TIER_HELP: Record<string, string> = {
  free: "Forfaits Gratuit et Starter : les 3 produits les plus demandés. Toute la liste, les communes et les dates dès Business ; budgets et précisions des clients en Premium.",
  business: "Forfait Business : toute la liste, avec les communes et la date de la dernière demande. Budgets moyens et précisions des clients en Premium.",
  premium: "Forfait Premium : toute la liste, avec communes, budgets moyens et précisions laissées par les clients.",
  admin: "Vue administrateur : toutes les demandes.",
};

export function MerchantWantedPage({ me }: { me: Merchant }) {
  const { s } = useStore();
  const { go } = useNav();
  const st = useWantedStats(me.id);
  const mine = s.products.filter((p) => p.merchantId === me.id && p.state !== "hidden");
  const publish = (it: WantedItem) => go("publish", { prefill: { name: it.q, brand: it.brand || "", category: it.category || "" } });
  const tier = st?.tier || "free";
  const locked = st && tier === "free" ? Math.max(0, st.products - st.items.length) : 0;
  return (
    <div className="page">
      <div className="page-head">
        <div><h1 className="page-title">Produits recherchés</h1><p className="muted">Ce que les clients d'ARRIVAGE cherchent sans le trouver, regroupé par produit. Une piste concrète pour vos prochaines commandes.</p></div>
      </div>
      {st === undefined ? <p className="muted">Chargement…</p> : st === null ? (
        <Empty icon={PackageSearch} title="Demandes indisponibles pour le moment" body="Réessayez dans quelques instants." />
      ) : (
        <>
          <div className="stats stats-4">
            <Stat icon={PackageSearch} label="Produits demandés" value={fmtNum(st.products)} sub="90 derniers jours" />
            <Stat icon={Users} label="Clients qui cherchent" value={fmtNum(st.people)} />
            <Stat icon={Calendar} label="Nouvelles demandes" value={fmtNum(st.week)} sub="7 derniers jours" />
            <Stat icon={Search} label="Demandes au total" value={fmtNum(st.total)} tone="accent" />
          </div>
          <p className="note"><Info size={14} /> {TIER_HELP[tier] || TIER_HELP.free}</p>
          {!st.items.length ? <Empty icon={PackageSearch} title="Aucune demande pour l'instant" body="Quand un client ne trouve pas un produit, il peut le signaler. Les demandes apparaîtront ici." /> : (
            <div className="panel">
              <WantedRows items={st.items} mine={mine} tier={tier} onPublish={publish} />
              {locked > 0 && (
                <div className="locked-wrap wanted-locked">
                  <div className="locked-blur" aria-hidden>
                    <WantedRows items={Array.from({ length: Math.min(locked, 4) }, (_, i) => ({ q: ["Produit demandé", "Article recherché", "Référence demandée", "Produit introuvable"][i % 4], n: Math.max(1, st.items[st.items.length - 1].n - 1), category: "" }))} mine={[]} tier={tier} />
                  </div>
                  <div className="locked-over">
                    <Crown size={22} />
                    <h3>{fmtNum(locked)} autre{locked > 1 ? "s" : ""} produit{locked > 1 ? "s" : ""} demandé{locked > 1 ? "s" : ""}</h3>
                    <p>La liste complète, les communes et les dates sont incluses dès le forfait Business.</p>
                    <Btn variant="accent" onClick={() => go("plans")}>Voir les forfaits</Btn>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
      <p className="note"><Lock size={14} /> Aucune donnée personnelle n'est affichée : uniquement des demandes regroupées et anonymes.</p>
    </div>
  );
}

// Carte du tableau de bord commerçant
export function WantedDashCard({ me }: { me: Merchant }) {
  const { go } = useNav();
  const st = useWantedStats(me.id);
  if (!st || !st.products) return null;
  return (
    <button className="wanted-dash" onClick={() => go("wanted")}>
      <PackageSearch size={18} />
      <span><strong>{fmtNum(st.people)} client{st.people > 1 ? "s" : ""} cherche{st.people > 1 ? "nt" : ""} {fmtNum(st.products)} produit{st.products > 1 ? "s" : ""} introuvable{st.products > 1 ? "s" : ""}.</strong> {st.items[0] ? <>Le plus demandé : « {st.items[0].q} » ({st.items[0].n}).</> : null}</span>
      <strong>Voir</strong>
    </button>
  );
}

// ---------- Côté admin ----------
export function AdminWantedPage() {
  const { s, toast } = useStore();
  const st = useWantedStats("");
  const [rows, setRows] = useState<Wanted[] | null>(null);
  const [tab, setTab] = useState<"groups" | "list">("groups");
  const [del, setDel] = useState<Wanted | null>(null);
  const load = () => wantedApi.all().then(setRows);
  useEffect(() => { load(); }, []);
  const who = (id?: string) => { const u = s.users.find((x) => x.id === id); return u ? u.label || u.email : "Compte supprimé"; };
  const remove = async (w: Wanted) => {
    if (!sb) return;
    const { error } = await sb.from("wanted").delete().eq("id", w.id);
    if (error) { toast(errMsg(error), "warn"); return; }
    statsCache = null; toast("Demande supprimée", "info"); load();
  };
  return (
    <div className="page">
      <div className="page-head">
        <div><h1 className="page-title">Produits recherchés</h1><p className="muted">Demandes « Je cherche ce produit » envoyées par les clients. Les commerçants les voient regroupées et anonymes.</p></div>
      </div>
      {st && <div className="stats stats-4">
        <Stat icon={PackageSearch} label="Produits demandés" value={fmtNum(st.products)} sub="90 derniers jours" />
        <Stat icon={Users} label="Clients" value={fmtNum(st.people)} />
        <Stat icon={Calendar} label="Cette semaine" value={fmtNum(st.week)} />
        <Stat icon={Search} label="Demandes ouvertes" value={fmtNum(st.total)} />
      </div>}
      <div className="seg" role="tablist" style={{ marginBottom: 14 }}>
        <button role="tab" aria-selected={tab === "groups"} className={cx(tab === "groups" && "is-on")} onClick={() => setTab("groups")}>Par produit</button>
        <button role="tab" aria-selected={tab === "list"} className={cx(tab === "list" && "is-on")} onClick={() => setTab("list")}>Toutes les demandes</button>
      </div>
      {tab === "groups" ? (
        st === undefined ? <p className="muted">Chargement…</p> : !st?.items.length ? <Empty icon={PackageSearch} title="Aucune demande" body={st === null ? "La fonction n'est pas encore activée sur le serveur (script supabase/introuvables.sql)." : "Les demandes des clients apparaîtront ici."} />
          : <div className="panel"><WantedRows items={st.items} mine={[]} tier="admin" /></div>
      ) : rows === null ? <p className="muted">Chargement…</p> : !rows.length ? <Empty icon={PackageSearch} title="Aucune demande" /> : (
        <div className="alerts">{rows.map((w) => (
          <div key={w.id} className={cx("alert-row", w.status === "found" && "is-off")}>
            <span className="alert-ico"><PackageSearch size={18} /></span>
            <div className="alert-main">
              <strong>{w.query}</strong>
              <div className="alert-crit">
                {w.brand && <span>{w.brand}</span>}
                {w.category && <span>{catById(w.category).label}</span>}
                {w.max_budget ? <span>≤ {fmtXPF(w.max_budget)}</span> : null}
                <span>{w.commune || "Tout le territoire"}</span>
              </div>
              {w.note && <div className="wanted-notes"><span><MessageSquareQuote size={12} />{w.note}</span></div>}
              <div className="alert-status muted">{who(w.user_id)} · {fmtRel(w.created_at)}{w.status === "found" ? " · trouvé" : ""}</div>
            </div>
            <div className="alert-actions"><IconBtn icon={Trash2} label="Supprimer" onClick={() => setDel(w)} /></div>
          </div>
        ))}</div>
      )}
      <Confirm open={!!del} title="Supprimer cette demande ?" body={`« ${del?.query || ""} » sera supprimée définitivement.`} confirmLabel="Supprimer" danger onConfirm={() => del && remove(del)} onClose={() => setDel(null)} />
    </div>
  );
}
