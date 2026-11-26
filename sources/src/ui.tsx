import React, { useEffect, useState } from "react";
import { X, Check, Info, TriangleAlert, ImageOff } from "lucide-react";
import { catById, Merchant, Product, statusLabel } from "./data";
import { useStore } from "./store";

export const cx = (...a: any[]) => a.filter(Boolean).join(" ");

export function Logo({ size = 22, light = false }: { size?: number; light?: boolean }) {
  return (
    <span className="logo" style={{ fontSize: size, color: light ? "var(--side-strong, #F5F5F1)" : undefined }} aria-label="arrivage.">
      arrivage<span className="logo-dot">.</span>
    </span>
  );
}

export function Btn({ children, variant = "primary", size = "md", icon: Icon, className, ...rest }: any) {
  return (
    <button type="button" className={cx("btn", `btn-${variant}`, `btn-${size}`, className)} {...rest}>
      {Icon && <Icon size={size === "sm" ? 15 : 17} strokeWidth={2} />}
      {children}
    </button>
  );
}

export function IconBtn({ icon: Icon, label, active, className, size = 18, ...rest }: any) {
  return (
    <button type="button" className={cx("iconbtn", active && "is-active", className)} aria-label={label} title={label} {...rest}>
      <Icon size={size} strokeWidth={2} />
    </button>
  );
}

const STATUS_TONE: Record<string, string> = { today: "orange", new: "green", restock: "blue", soon: "violet", limited: "amber", out: "grey" };
export function StatusPill({ status, small }: { status: string; small?: boolean }) {
  return <span className={cx("pill", `pill-${STATUS_TONE[status] || "grey"}`, small && "pill-sm")}><i />{statusLabel(status)}</span>;
}

export function Chip({ children, active, onClick, icon: Icon }: any) {
  return (
    <button type="button" className={cx("chip", active && "is-active")} onClick={onClick} aria-pressed={!!active}>
      {Icon && <Icon size={15} strokeWidth={2} />}{children}
    </button>
  );
}

// Visuel produit : photo fournie par le commerçant, sinon visuel de repli typographique.
export function ProductVisual({ p, variant = 0, className, rounded = true }: { p: Product; variant?: number; className?: string; rounded?: boolean }) {
  const [err, setErr] = useState(false);
  const src = p.images?.[variant] || (variant === 0 ? p.images?.[0] : undefined);
  const c = catById(p.category);
  if (src && !err) {
    return <div className={cx("pv", rounded && "pv-r", className)}><img src={src} alt={p.name} onError={() => setErr(true)} loading="lazy" /></div>;
  }
  const Icon = c.icon;
  return (
    <div className={cx("pv pv-fallback", `pv-v${variant % 3}`, rounded && "pv-r", className)} style={{ ["--tint" as any]: c.tint }} role="img" aria-label={`${p.name} — visuel indicatif`}>
      <div className="pv-grain" />
      <Icon className="pv-icon" strokeWidth={1.1} />
      <div className="pv-meta">
        <span className="pv-brand">{p.brand}</span>
        {variant === 1 && <span className="pv-sub">{c.label}</span>}
        {variant === 2 && <span className="pv-sub">{p.tags.slice(0, 3).join(" · ")}</span>}
      </div>
      {err && <span className="pv-err"><ImageOff size={12} /> image indisponible</span>}
    </div>
  );
}

export function MerchantLogo({ m, size = 44 }: { m: Merchant; size?: number }) {
  const initials = m.name.split(/\s+/).filter((w) => w.length > 2 || /^[A-Z]/.test(w)).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  if (m.logo) return <img className="mlogo" src={m.logo} alt={m.name} style={{ width: size, height: size, borderRadius: m.shape === "round" ? "50%" : 12 }} />;
  return (
    <span className={cx("mlogo", `mlogo-${m.shape}`)} style={{ width: size, height: size, background: m.color, color: m.ink, fontSize: size * 0.36 }} aria-hidden>
      {initials}
    </span>
  );
}

export function MerchantCover({ m, className, children }: { m: Merchant; className?: string; children?: React.ReactNode }) {
  return (
    <div className={cx("mcover", className)} style={{ ["--mc" as any]: m.color, ["--mi" as any]: m.ink }}>
      <svg className="mcover-pattern" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden>
        {Array.from({ length: 7 }).map((_, i) => (
          <path key={i} d={`M0 ${30 + i * 14} C 100 ${10 + i * 14 + (m.id.length % 5) * 6}, 250 ${60 + i * 12}, 400 ${20 + i * 15}`} fill="none" stroke="currentColor" strokeWidth="1" />
        ))}
      </svg>
      {children}
    </div>
  );
}

export function Modal({ open, onClose, children, title, wide, side }: any) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div className={cx("overlay", side && "overlay-side")} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cx("modal", wide && "modal-wide", side && "modal-side")} role="dialog" aria-modal="true" aria-label={title}>
        {title && (
          <div className="modal-head">
            <h3>{title}</h3>
            <IconBtn icon={X} label="Fermer" onClick={onClose} />
          </div>
        )}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Confirm({ open, title, body, confirmLabel = "Confirmer", danger, onConfirm, onClose }: any) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="muted" style={{ marginTop: 0 }}>{body}</p>
      <div className="row-end">
        <Btn variant="ghost" onClick={onClose}>Annuler</Btn>
        <Btn variant={danger ? "danger" : "primary"} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Btn>
      </div>
    </Modal>
  );
}

export function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={cx("toast", `toast-${t.tone}`)}>
          {t.tone === "ok" ? <Check size={16} /> : t.tone === "warn" ? <TriangleAlert size={16} /> : <Info size={16} />}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

export function Empty({ icon: Icon, title, body, action }: any) {
  return (
    <div className="empty">
      {Icon && <span className="empty-ico"><Icon size={22} strokeWidth={1.6} /></span>}
      <strong>{title}</strong>
      {body && <p>{body}</p>}
      {action}
    </div>
  );
}

export function SectionHead({ title, sub, action, id }: any) {
  return (
    <div className="shead" id={id}>
      <div>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Segmented({ value, onChange, options, size }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[]; size?: string }) {
  return (
    <div className={cx("seg", size === "sm" && "seg-sm")} role="tablist">
      {options.map((o) => (
        <button key={o.v} role="tab" aria-selected={value === o.v} className={cx(value === o.v && "is-on")} onClick={() => onChange(o.v)}>{o.l}</button>
      ))}
    </div>
  );
}

export function Field({ label, hint, error, children, htmlFor }: any) {
  return (
    <label className={cx("field", error && "has-error")} htmlFor={htmlFor}>
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="field-err">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

// Curseur + champ numérique synchronisés
export function SliderField({ id, label, value, onChange, min = 0, max, step = 1, suffix, format }: any) {
  const [txt, setTxt] = useState(String(value));
  useEffect(() => { setTxt(String(value)); }, [value]);
  const commit = (raw: string) => {
    const n = Number(String(raw).replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(n)) { setTxt(String(value)); return; }
    onChange(Math.max(min, n));
  };
  const pct = Math.min(100, Math.max(0, ((Number(value) - min) / (max - min)) * 100));
  return (
    <div className="slf">
      <div className="slf-top">
        <label htmlFor={id}>{label}</label>
        <div className="slf-num">
          <input id={id + "-n"} inputMode="decimal" value={txt} onChange={(e) => setTxt(e.target.value)} onBlur={(e) => commit(e.target.value)} onKeyDown={(e) => e.key === "Enter" && commit((e.target as HTMLInputElement).value)} aria-label={label + " (valeur)"} />
          {suffix && <span>{suffix}</span>}
        </div>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={Math.min(Number(value), max)} onChange={(e) => onChange(Number(e.target.value))} style={{ ["--p" as any]: pct + "%" }} />
      {format && <div className="slf-fmt">{format(value)}{Number(value) > max ? " · au-delà du curseur" : ""}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, tone, icon: Icon }: any) {
  return (
    <div className={cx("stat", tone && `stat-${tone}`)}>
      <div className="stat-label">{Icon && <Icon size={15} strokeWidth={2} />}{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function DemoTag({ children = "Données fictives" }: any) {
  return <span className="demotag">{children}</span>;
}
