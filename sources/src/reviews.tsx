import React, { useState } from "react";
import { Star, MessageSquare, BadgeCheck, Check, EyeOff, Eye, Trash2, Reply, ShieldCheck, Info, Flag } from "lucide-react";
import { fmtRel } from "./data";
import { useStore, newId } from "./store";
import { useNav } from "./nav";
import { Btn, Modal, Empty, Segmented, cx, Field, MerchantLogo, DemoTag } from "./ui";
import type { Reservation } from "./reservations";

export type ReviewStatus = "pending" | "published" | "hidden";
export interface Review {
  id: string; merchantId: string; productId?: string; productName?: string; reservationId?: string; verified: boolean;
  rating: number; text: string; author: string; authorId: string; at: string; status: ReviewStatus;
  reply?: { text: string; at: string }; modNote?: string;
}

export const published = (list: Review[], merchantId: string, productId?: string) => list.filter((r) => r.status === "published" && r.merchantId === merchantId && (!productId || r.productId === productId));
export function ratingOf(list: Review[], merchantId: string) {
  const l = published(list, merchantId);
  return { n: l.length, avg: l.length ? l.reduce((a, r) => a + r.rating, 0) / l.length : 0 };
}
const avgTxt = (a: number) => a.toFixed(1).replace(".", ",");

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return <span className="stars" aria-label={`${avgTxt(value)} sur 5`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={size} className={cx(value >= i - 0.25 ? "on" : value >= i - 0.75 ? "half" : "")} fill="currentColor" strokeWidth={0} />)}</span>;
}

export function RatingBadge({ merchantId, compact }: { merchantId: string; compact?: boolean }) {
  const { s } = useStore();
  const r = ratingOf(s.reviews, merchantId);
  if (!r.n) return compact ? null : <span className="rating-badge is-empty">Pas encore d'avis</span>;
  return <span className="rating-badge"><Star size={13} fill="currentColor" strokeWidth={0} /> <b>{avgTxt(r.avg)}</b> <span>({r.n} avis)</span></span>;
}

export function ReviewItem({ r, showProduct }: { r: Review; showProduct?: boolean }) {
  return (
    <div className="review">
      <div className="review-top"><Stars value={r.rating} /><strong>{r.author}</strong>{r.verified && <span className="review-verified"><BadgeCheck size={13} /> Achat vérifié</span>}<em>{fmtRel(r.at)}</em></div>
      {showProduct && r.productName && <span className="micro">À propos de « {r.productName} »</span>}
      <p>{r.text}</p>
      {r.reply && <div className="review-reply"><Reply size={13} /> <span><strong>Réponse du commerce</strong> · {r.reply.text}</span></div>}
    </div>
  );
}

export function ReviewsBlock({ merchantId, productId, title = "Avis clients" }: { merchantId: string; productId?: string; title?: string }) {
  const { s } = useStore();
  const list = published(s.reviews, merchantId, productId).sort((a, b) => b.at.localeCompare(a.at));
  const all = ratingOf(s.reviews, merchantId);
  const dist = [5, 4, 3, 2, 1].map((n) => published(s.reviews, merchantId).filter((r) => r.rating === n).length);
  return (
    <section className="sec reviews-block">
      <div className="shead"><div><h2>{title}</h2><p>{productId ? `${list.length} avis sur ce produit · note du commerce ${all.n ? avgTxt(all.avg) + " / 5" : "—"}` : "Laissés après un retrait en magasin, vérifiés par la modération"}</p></div></div>
      {!productId && all.n > 0 && (
        <div className="rv-summary">
          <div className="rv-big"><b>{avgTxt(all.avg)}</b><Stars value={all.avg} size={16} /><span className="micro">{all.n} avis</span></div>
          <div className="rv-dist">{dist.map((c, i) => <div key={i}><span>{5 - i}</span><i><em style={{ width: (all.n ? (c / all.n) * 100 : 0) + "%" }} /></i><span className="micro">{c}</span></div>)}</div>
        </div>
      )}
      {list.length ? <div className="reviews">{list.slice(0, productId ? 4 : 20).map((r) => <ReviewItem key={r.id} r={r} showProduct={!productId} />)}</div>
        : <p className="muted small">Aucun avis publié pour l'instant. Les clients peuvent noter le commerce après avoir retiré une réservation.</p>}
    </section>
  );
}

// ---------- Consommateur : laisser un avis ----------
export function ReviewButton({ res }: { res: Reservation }) {
  const { s } = useStore();
  const [open, setOpen] = useState(false);
  const mine = s.reviews.find((r) => r.reservationId === res.id);
  if (mine) return <span className={cx("rv-state", `rv-${mine.status}`)}><Stars value={mine.rating} size={12} /> {mine.status === "pending" ? "Avis en attente de modération" : mine.status === "published" ? "Avis publié" : "Avis masqué par la modération"}</span>;
  return <><Btn size="sm" variant="outline" icon={Star} onClick={() => setOpen(true)}>Laisser un avis</Btn>{open && <ReviewForm res={res} onClose={() => setOpen(false)} />}</>;
}

const LABELS = ["", "Très décevant", "Décevant", "Correct", "Bien", "Excellent"];
function ReviewForm({ res, onClose }: { res: Reservation; onClose: () => void }) {
  const { s, mutate, toast, log } = useStore();
  const m = s.merchants.find((x) => x.id === res.merchantId);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const [author, setAuthor] = useState(s.me?.displayName || "");
  const ok = rating > 0 && text.trim().length >= 10;
  const auto = !s.settings.moderateReviews;
  return (
    <Modal open onClose={onClose} title="Votre avis">
      {m && <div className="rf-item"><MerchantLogo m={m} size={44} /><div><strong>{m.name}</strong><span className="muted small">{res.productName} · retiré avec le code {res.code}</span></div></div>}
      <div className="rv-pick" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => <button key={i} className={cx((hover || rating) >= i && "on")} onMouseEnter={() => setHover(i)} onClick={() => setRating(i)} aria-label={`${i} étoile${i > 1 ? "s" : ""}`}><Star size={30} fill="currentColor" strokeWidth={0} /></button>)}
        <span>{LABELS[hover || rating] || "Choisissez une note"}</span>
      </div>
      <Field label="Votre commentaire" htmlFor="rv-text" hint={`${text.trim().length} / 10 caractères minimum · restez courtois, pas de coordonnées`}><textarea id="rv-text" rows={4} value={text} onChange={(e) => setText(e.target.value.slice(0, 600))} placeholder="Accueil, état du produit, retrait en magasin…" /></Field>
      <Field label="Nom affiché" htmlFor="rv-author"><input id="rv-author" value={author} onChange={(e) => setAuthor(e.target.value.slice(0, 40))} /></Field>
      <p className="note"><ShieldCheck size={14} /> {auto ? "Votre avis sera publié immédiatement avec la mention « Achat vérifié »." : "Votre avis sera publié après vérification par la modération, avec la mention « Achat vérifié »."}</p>
      <div className="row-end" style={{ marginTop: 12 }}><Btn variant="ghost" onClick={onClose}>Annuler</Btn><Btn disabled={!ok} icon={Check} onClick={() => {
        mutate((d) => {
          d.reviews.unshift({ id: newId(), merchantId: res.merchantId, productId: res.productId, productName: res.productName, reservationId: res.id, verified: true, rating, text: text.trim(), author: author.trim() || "Anonyme", authorId: s.me!.id, at: new Date().toISOString(), status: auto ? "published" : "pending" });
          log(d, `Nouvel avis ${rating}/5 sur ${m?.name}${auto ? "" : " (à modérer)"}`, "consommateur");
        });
        toast(auto ? "Merci, votre avis est publié" : "Merci, votre avis sera publié après modération"); onClose();
      }}>Publier mon avis</Btn></div>
    </Modal>
  );
}

// ---------- Commerçant : avis reçus + réponse ----------
export function MerchantReviews({ merchantId }: { merchantId: string }) {
  const { s, mutate, toast, log } = useStore();
  const [replyTo, setReplyTo] = useState<Review | null>(null);
  const [txt, setTxt] = useState("");
  const [flag, setFlag] = useState<Review | null>(null);
  const list = s.reviews.filter((r) => r.merchantId === merchantId && r.status === "published").sort((a, b) => b.at.localeCompare(a.at));
  const pending = s.reviews.filter((r) => r.merchantId === merchantId && r.status === "pending").length;
  const rt = ratingOf(s.reviews, merchantId);
  return (
    <div className="page">
      <div className="page-head"><div><h1 className="page-title">Avis clients</h1><p className="muted">Les clients notent votre commerce après un retrait. Répondez publiquement, avec courtoisie</p></div>{rt.n > 0 && <div className="rv-big rv-inline"><b>{avgTxt(rt.avg)}</b><Stars value={rt.avg} size={16} /><span className="micro">{rt.n} avis publiés</span></div>}</div>
      {pending > 0 && <div className="banner-info"><Info size={16} /> {pending} avis en cours de vérification par la modération ARRIVAGE.</div>}
      {!list.length ? <Empty icon={MessageSquare} title="Aucun avis publié" body="Les avis apparaîtront ici après les premiers retraits en magasin." /> : (
        <div className="reviews">
          {list.map((r) => (
            <div key={r.id} className="review-wrap">
              <ReviewItem r={r} showProduct />
              <div className="row">
                <Btn size="sm" variant="ghost" icon={Reply} onClick={() => { setTxt(r.reply?.text || ""); setReplyTo(r); }}>{r.reply ? "Modifier la réponse" : "Répondre"}</Btn>
                <Btn size="sm" variant="ghost" icon={Flag} onClick={() => setFlag(r)}>Signaler à la modération</Btn>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!replyTo} onClose={() => setReplyTo(null)} title="Répondre à l'avis">
        {replyTo && <>
          <ReviewItem r={{ ...replyTo, reply: undefined }} />
          <Field label="Votre réponse publique" htmlFor="rv-reply"><textarea id="rv-reply" rows={3} value={txt} onChange={(e) => setTxt(e.target.value.slice(0, 400))} /></Field>
          <div className="row-end" style={{ marginTop: 12 }}><Btn variant="ghost" onClick={() => setReplyTo(null)}>Annuler</Btn><Btn disabled={txt.trim().length < 2} onClick={() => { mutate((d) => { const x = d.reviews.find((y) => y.id === replyTo.id)!; x.reply = { text: txt.trim(), at: new Date().toISOString() }; }); toast("Réponse publiée"); setReplyTo(null); }}>Publier la réponse</Btn></div>
        </>}
      </Modal>
      <Modal open={!!flag} onClose={() => setFlag(null)} title="Signaler cet avis ?">
        <p className="muted" style={{ marginTop: 0 }}>L'avis sera retiré temporairement et revu par l'équipe ARRIVAGE, qui décidera de le republier ou non.</p>
        <div className="row-end"><Btn variant="ghost" onClick={() => setFlag(null)}>Annuler</Btn><Btn onClick={() => { mutate((d) => { const x = d.reviews.find((y) => y.id === flag!.id)!; x.status = "pending"; x.modNote = "Signalé par le commerce"; log(d, `Avis signalé par le commerce (${s.merchants.find((m) => m.id === merchantId)?.name})`, "commerçant"); }); toast("Avis transmis à la modération"); setFlag(null); }}>Signaler</Btn></div>
      </Modal>
    </div>
  );
}

// ---------- Admin : modération ----------
export function AdminReviews() {
  const { s, mutate, toast, log } = useStore();
  const { go } = useNav();
  const [tab, setTab] = useState("pending");
  const counts = { pending: s.reviews.filter((r) => r.status === "pending").length, published: s.reviews.filter((r) => r.status === "published").length, hidden: s.reviews.filter((r) => r.status === "hidden").length };
  const list = s.reviews.filter((r) => r.status === tab).sort((a, b) => b.at.localeCompare(a.at));
  const set = (id: string, st: ReviewStatus | "delete", msg: string) => { mutate((d) => { if (st === "delete") d.reviews = d.reviews.filter((x) => x.id !== id); else { const x = d.reviews.find((y) => y.id === id)!; x.status = st; x.modNote = undefined; } log(d, msg, "admin"); }); toast(msg); };
  const suspicious = (r: Review) => /www\.|http|@|\d{2}[ .]?\d{2}[ .]?\d{2}/i.test(r.text) || /!!!|arnaque/i.test(r.text);
  return (
    <div className="page">
      <div className="page-head"><div><h1 className="page-title">Avis clients</h1><p className="muted">Vous décidez quels avis sont visibles sur les fiches des commerces.</p></div></div>
      <div className="approval-setting">
        <ShieldCheck size={18} />
        <div><strong>Modérer les avis avant publication</strong><span className="micro">{s.settings.moderateReviews ? "Chaque nouvel avis attend votre validation." : "Les avis sont publiés immédiatement, vous pouvez les masquer après coup."}</span></div>
        <label className="switch-row"><input type="checkbox" checked={!!s.settings.moderateReviews} onChange={() => { mutate((d) => { d.settings.moderateReviews = !d.settings.moderateReviews; }); toast(s.settings.moderateReviews ? "Avis publiés automatiquement" : "Modération des avis activée", "info"); }} aria-label="Modérer les avis avant publication" /><span className="switch" /></label>
      </div>
      <Segmented value={tab} onChange={setTab} options={[{ v: "pending", l: `À valider (${counts.pending})` }, { v: "published", l: `Publiés (${counts.published})` }, { v: "hidden", l: `Masqués (${counts.hidden})` }]} />
      {!list.length ? <Empty icon={MessageSquare} title={tab === "pending" ? "Aucun avis à valider" : "Aucun avis"} /> : (
        <div className="reviews" style={{ marginTop: 14 }}>
          {list.map((r) => {
            const m = s.merchants.find((x) => x.id === r.merchantId);
            return (
              <div key={r.id} className={cx("review-wrap", suspicious(r) && "is-suspicious")}>
                <div className="rv-admin-head">
                  {m && <button className="link small" onClick={() => go("merchant", { id: m.id })}>{m.name}</button>}
                  {r.modNote && <span className="pill pill-sm pill-amber"><i />{r.modNote}</span>}
                  {suspicious(r) && <span className="pill pill-sm pill-red"><i />Contenu suspect : lien, coordonnées ou propos agressifs</span>}
                </div>
                <ReviewItem r={r} showProduct />
                <div className="row">
                  {r.status !== "published" && <Btn size="sm" icon={Eye} onClick={() => set(r.id, "published", `Avis de ${r.author} publié`)}>Publier</Btn>}
                  {r.status !== "hidden" && <Btn size="sm" variant="outline" icon={EyeOff} onClick={() => set(r.id, "hidden", `Avis de ${r.author} masqué`)}>Masquer</Btn>}
                  <Btn size="sm" variant="ghost" icon={Trash2} onClick={() => set(r.id, "delete", `Avis de ${r.author} supprimé`)}>Supprimer</Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
