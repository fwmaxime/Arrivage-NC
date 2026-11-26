import React, { useMemo, useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Sector, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, LineChart, Line, ReferenceLine, Legend, ComposedChart, Bar } from "recharts";
import { Calculator, RotateCcw, Download, Save, Info, Copy, Trash2, TrendingUp, TrendingDown, Wallet, Target, Users, Clock, ChevronDown } from "lucide-react";
import { useStore } from "./store";
import { FinInputs, monthly, project, payback, SCENARIOS, CHARGE_LABELS, DEFAULT_INPUTS, toCSV, sanitize } from "./finance";
import { fmtXPF, fmtNum } from "./data";
import { Btn, SliderField, Segmented, Modal, Stat, cx, IconBtn, Field } from "./ui";

const tipStyle = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, fontSize: 12, color: "var(--fg)" };
const kF = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " M";
  if (a >= 1e3) return Math.round(n / 1e3).toLocaleString("fr-FR") + " k";
  return String(Math.round(n));
};
const pct = (n: number | null) => (n == null ? "—" : n.toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " %");
const months = (n: number | null) => (n == null ? "Non atteint sur 10 ans" : n === 0 ? "Aucun investissement" : n < 12 ? `${n} mois` : `${n} mois (${(n / 12).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ans)`);

const PLAN_COLORS = ["var(--ch-c)", "var(--c1)", "var(--ch-acc)"];
const CHARGE_COLORS = ["var(--c1)", "var(--ch-a)", "var(--ch-b)", "var(--ch-c)", "var(--ch-acc)", "var(--ch-acc2)", "#C9A27A", "#A8957C", "#6B6F66", "#B7B9A8", "#D9D4C7"];

function Group({ title, children, open: o = true, extra }: any) {
  const [open, setOpen] = useState(o);
  return (
    <div className={cx("fgrp", open && "is-open")}>
      <button className="fgrp-head" onClick={() => setOpen(!open)} aria-expanded={open}><span>{title}</span>{extra}<ChevronDown size={16} /></button>
      {open && <div className="fgrp-body">{children}</div>}
    </div>
  );
}

// Part mise en avant : même forme, simplement un peu plus grande
const growShape = (p: any) => <Sector cx={p.cx} cy={p.cy} innerRadius={p.innerRadius} outerRadius={p.outerRadius + 7} startAngle={p.startAngle} endAngle={p.endAngle} fill={p.fill} cornerRadius={p.cornerRadius} />;

export function FinanceSimulator() {
  const [revSel, setRevSel] = useState<number | null>(null);
  const [chSel, setChSel] = useState<number | null>(null);
  const { s, mutate, toast } = useStore();
  const fin = s.fin;
  const [horizon, setHorizon] = useState("36");
  const [csv, setCsv] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const set = (patch: Partial<FinInputs>) => mutate((d) => { d.fin = sanitize({ ...d.fin, ...patch } as FinInputs); });
  const setCharge = (k: string, v: number) => mutate((d) => { d.fin = sanitize({ ...d.fin, charges: { ...d.fin.charges, [k]: v } }); });

  const r = useMemo(() => monthly(fin), [fin]);
  const proj = useMemo(() => project(fin, 36), [fin]);
  const pb = useMemo(() => payback(fin), [fin]);
  const shown = proj.slice(0, Number(horizon));
  const activeScenario = SCENARIOS.find((x) => x.free === fin.free && x.starter === fin.starter && x.business === fin.business && x.premium === fin.premium)?.id || "custom";
  const firstPositive = proj.find((x) => x.result >= 0);
  const minCash = Math.min(...proj.map((x) => x.cash));

  const revPie = [{ name: "Starter", value: r.revStarter }, { name: "Business", value: r.revBusiness }, { name: "Premium", value: r.revPremium }].filter((x) => x.value > 0);
  const adsPie = [{ name: "Sponsorisé", value: r.revSponsored }, { name: "Autres pubs", value: r.revOther }].filter((x) => x.value > 0);
  const chargePie = [...Object.entries(r.inputs.charges).map(([k, v]) => ({ name: CHARGE_LABELS[k], value: v })), { name: "Frais de paiement", value: r.fees }].filter((x) => x.value > 0);

  // Visualisation du seuil : CA et charges selon le nombre de commerçants payants (au revenu moyen actuel)
  const beData = useMemo(() => {
    const maxN = Math.max(20, Math.ceil(Math.max(r.paying, r.breakEvenMerchants || 0) * 1.6));
    const step = Math.max(1, Math.round(maxN / 24));
    const out = [];
    for (let n = 0; n <= maxN; n += step) {
      const ca = n * r.arpuForBE + r.revAds;
      out.push({ n, ca, charges: r.fixed + ca * (r.inputs.paymentFeeRate / 100) });
    }
    return out;
  }, [r]);

  const compare = useMemo(() => {
    const list = [
      ...SCENARIOS.map((x) => ({ id: x.id, name: x.name, inputs: { ...fin, free: x.free, starter: x.starter, business: x.business, premium: x.premium } })),
      ...s.savedScenarios.map((x) => ({ id: x.id, name: x.name, inputs: x.inputs, saved: true })),
    ];
    if (activeScenario === "custom") list.push({ id: "current", name: "Personnalisé (actuel)", inputs: fin } as any);
    return list.map((x) => { const m = monthly(x.inputs); const pj = project(x.inputs, 36); return { ...x, m, pb: payback(x.inputs), cash36: pj[35].cash, ca36: pj[35].ca }; });
  }, [fin, s.savedScenarios, activeScenario]);

  const buildCSV = () => {
    const head = [["ARRIVAGE — simulation financière (données fictives, montants en F CFP, hors impôts)"], ["Généré le", new Date().toLocaleString("fr-FR")], []];
    const hyp = [["Hypothèses"], ["Gratuits", r.inputs.free], ["Starter", r.inputs.starter], ["Business", r.inputs.business], ["Premium", r.inputs.premium], ["Prix Starter", r.inputs.pStarter], ["Prix Business", r.inputs.pBusiness], ["Prix Premium", r.inputs.pPremium], ["Publications sponsorisées / mois", r.inputs.sponsoredCount], ["Prix publication sponsorisée", r.inputs.sponsoredPrice], ["Autres revenus publicitaires", r.inputs.otherAds], ["Croissance mensuelle %", String(r.inputs.growth)], ["Désabonnement mensuel %", String(r.inputs.churn)], ["Frais de paiement % du CA", String(r.inputs.paymentFeeRate)], ...Object.entries(r.inputs.charges).map(([k, v]) => [CHARGE_LABELS[k], v]), ["Investissement développement", r.inputs.investDev], ["Investissement lancement", r.inputs.investLaunch], ["Trésorerie de départ", r.inputs.startCash], []];
    const ind = [["Indicateurs mensuels"], ["MRR", r.mrr], ["ARR", r.arr], ["Chiffre d'affaires mensuel", r.ca], ["Charges mensuelles", r.charges], ["Résultat mensuel avant impôts", r.result], ["Marge %", r.margin == null ? "—" : r.margin.toFixed(1).replace(".", ",")], ["Seuil de rentabilité (commerçants payants)", r.breakEvenMerchants ?? "Non calculable"], ["Délai de récupération (mois)", pb ?? "Non atteint"], []];
    const pj = [["Projection 36 mois"], ["Mois", "Commerçants", "Payants", "MRR", "Chiffre d'affaires", "Charges", "Résultat", "Résultat cumulé", "Trésorerie"], ...proj.map((x) => [x.label, x.merchants, x.paying, x.mrr, x.ca, x.charges, x.result, x.cumResult, x.cash]), []];
    const cmp = [["Comparaison des scénarios"], ["Scénario", "Payants", "MRR", "CA mensuel", "Charges", "Résultat mensuel", "Marge %", "Seuil (payants)", "Récupération (mois)", "Trésorerie à 36 mois"], ...compare.map((x) => [x.name, x.m.paying, x.m.mrr, x.m.ca, x.m.charges, x.m.result, x.m.margin == null ? "—" : x.m.margin.toFixed(1).replace(".", ","), x.m.breakEvenMerchants ?? "—", x.pb ?? "—", x.cash36])];
    return toCSV([...head, ...hyp, ...ind, ...pj, ...cmp] as any);
  };
  const exportCSV = async () => {
    const data = "﻿" + buildCSV();
    try {
      const dl = await (window as any).claude?.use?.("downloads");
      if (dl) { await dl.save({ filename: "arrivage-simulation.csv", data: new Blob([data], { type: "text/csv;charset=utf-8" }) }); toast("Fichier CSV proposé au téléchargement"); return; }
    } catch (e: any) { if (e?.code === "declined") { toast("Téléchargement annulé", "info"); return; } }
    setCsv(data.slice(1));
  };

  const tone = r.result >= 0 ? "pos" : "neg";
  return (
    <div className="page fin">
      <div className="page-head">
        <div>
          <h1 className="page-title">Simulateur financier</h1>
          <p className="muted">Tous les montants en F CFP, hors impôts. Simulations indicatives, et non des prévisions garanties.</p>
        </div>
        <div className="row">
          <Btn variant="ghost" size="sm" icon={RotateCcw} onClick={() => { mutate((d) => { d.fin = structuredClone(DEFAULT_INPUTS); }); toast("Hypothèses réinitialisées", "info"); }}>Réinitialiser</Btn>
          <Btn variant="outline" size="sm" icon={Save} onClick={() => { setSaveName(`Scénario ${s.savedScenarios.length + 1}`); setSaveOpen(true); }}>Enregistrer</Btn>
          <Btn size="sm" icon={Download} onClick={exportCSV}>Exporter CSV</Btn>
        </div>
      </div>

      <div className="scenarios">
        {SCENARIOS.map((x) => (
          <button key={x.id} className={cx("scn", activeScenario === x.id && "is-on")} onClick={() => { set({ free: x.free, starter: x.starter, business: x.business, premium: x.premium }); toast(`Scénario « ${x.name} » chargé`, "info"); }}>
            <strong>{x.name}</strong><span>{x.free} gratuits · {x.starter} S · {x.business} B · {x.premium} P</span>
          </button>
        ))}
        <button className={cx("scn", activeScenario === "custom" && "is-on")} onClick={() => toast("Mode personnalisé : modifiez librement chaque variable", "info")}>
          <strong>Personnalisé</strong><span>Toutes les variables libres</span>
        </button>
      </div>

      <div className="fin-grid">
        <aside className="fin-inputs">
          <Group title="Commerçants">
            <SliderField id="fi-free" label="Gratuits" value={fin.free} max={500} onChange={(v: number) => set({ free: v })} />
            <SliderField id="fi-starter" label="Starter" value={fin.starter} max={300} onChange={(v: number) => set({ starter: v })} />
            <SliderField id="fi-business" label="Business" value={fin.business} max={300} onChange={(v: number) => set({ business: v })} />
            <SliderField id="fi-premium" label="Premium" value={fin.premium} max={200} onChange={(v: number) => set({ premium: v })} />
          </Group>
          <Group title="Tarifs mensuels">
            <SliderField id="fi-ps" label="Starter" suffix="F" value={fin.pStarter} max={10000} step={100} onChange={(v: number) => set({ pStarter: v })} />
            <SliderField id="fi-pb" label="Business" suffix="F" value={fin.pBusiness} max={20000} step={100} onChange={(v: number) => set({ pBusiness: v })} />
            <SliderField id="fi-pp" label="Premium" suffix="F" value={fin.pPremium} max={40000} step={100} onChange={(v: number) => set({ pPremium: v })} />
          </Group>
          <Group title="Revenus complémentaires">
            <SliderField id="fi-sc" label="Publications sponsorisées / mois" value={fin.sponsoredCount} max={300} onChange={(v: number) => set({ sponsoredCount: v })} />
            <SliderField id="fi-sp" label="Prix d'une publication sponsorisée" suffix="F" value={fin.sponsoredPrice} max={20000} step={100} onChange={(v: number) => set({ sponsoredPrice: v })} />
            <SliderField id="fi-oa" label="Autres revenus publicitaires / mois" suffix="F" value={fin.otherAds} max={500000} step={5000} onChange={(v: number) => set({ otherAds: v })} />
          </Group>
          <Group title="Dynamique mensuelle">
            <SliderField id="fi-g" label="Croissance" suffix="%" value={fin.growth} max={30} step={0.5} onChange={(v: number) => set({ growth: v })} />
            <SliderField id="fi-c" label="Désabonnement" suffix="%" value={fin.churn} max={30} step={0.5} onChange={(v: number) => set({ churn: v })} />
            <p className="micro">Croissance nette appliquée à chaque segment : {(fin.growth - fin.churn).toLocaleString("fr-FR")} % par mois.</p>
          </Group>
          <Group title="Charges mensuelles" extra={<span className="fgrp-sum">{fmtXPF(r.charges)}</span>}>
            {Object.keys(CHARGE_LABELS).map((k) => (
              <SliderField key={k} id={"fc-" + k} label={CHARGE_LABELS[k]} suffix="F" value={fin.charges[k] || 0} max={k === "founder" || k === "salaries" ? 1500000 : 300000} step={1000} onChange={(v: number) => setCharge(k, v)} />
            ))}
            <SliderField id="fc-fee" label="Frais de paiement (% du CA encaissé)" suffix="%" value={fin.paymentFeeRate} max={10} step={0.1} onChange={(v: number) => set({ paymentFeeRate: v })} format={() => `≈ ${fmtXPF(r.fees)} ce mois-ci`} />
          </Group>
          <Group title="Investissement initial et trésorerie" open={false}>
            <SliderField id="fi-dev" label="Développement de l'application" suffix="F" value={fin.investDev} max={10000000} step={50000} onChange={(v: number) => set({ investDev: v })} />
            <SliderField id="fi-launch" label="Lancement (marketing, juridique)" suffix="F" value={fin.investLaunch} max={5000000} step={50000} onChange={(v: number) => set({ investLaunch: v })} />
            <SliderField id="fi-cash" label="Trésorerie de départ (apports, prêts)" suffix="F" value={fin.startCash} max={20000000} step={100000} onChange={(v: number) => set({ startCash: v })} />
          </Group>
        </aside>

        <div className="fin-out">
          <div className="kpi-hero">
            <div className="kpi-big">
              <span>Chiffre d'affaires mensuel</span>
              <strong>{fmtXPF(r.ca)}</strong>
              <em>{fmtXPF(r.caYear)} par an</em>
            </div>
            <div className={cx("kpi-big", `kpi-${tone}`)}>
              <span>Résultat mensuel estimé avant impôts</span>
              <strong>{r.result >= 0 ? "" : "−"}{fmtXPF(Math.abs(r.result))}</strong>
              <em>{r.result >= 0 ? "" : "−"}{fmtXPF(Math.abs(r.resultYear))} par an · marge {pct(r.margin)}</em>
            </div>
          </div>
          <div className="stats stats-fin">
            <Stat label="MRR (abonnements)" value={fmtXPF(r.mrr)} />
            <Stat label="ARR" value={fmtXPF(r.arr)} sub="MRR × 12" />
            <Stat label="Revenus publicitaires" value={fmtXPF(r.revAds)} sub={`${fmtXPF(r.revSponsored)} sponsorisés`} />
            <Stat label="Charges mensuelles" value={fmtXPF(r.charges)} sub={`${fmtXPF(r.chargesYear)} par an`} />
            <Stat icon={Users} label="Commerçants" value={fmtNum(r.total)} sub={`${fmtNum(r.paying)} payants`} />
            <Stat label="Revenu moyen / payant" value={r.paying ? fmtXPF(r.arpu) : "—"} sub="MRR ÷ payants" />
            <Stat icon={Target} label="Seuil de rentabilité" tone={r.gapToBreakEven === 0 ? "pos" : "warn"}
              value={r.breakEvenMerchants == null ? "Non calculable" : `${fmtNum(r.breakEvenMerchants)} payants`}
              sub={r.breakEvenMerchants == null ? "Frais de paiement ≥ 100 %" : r.gapToBreakEven === 0 ? "Atteint avec les hypothèses actuelles" : `Encore ${fmtNum(r.gapToBreakEven!)} payants${r.arpuFallback ? " (prix moyen des forfaits)" : ""}`} />
            <Stat icon={Clock} label="Récupération de l'investissement" value={months(pb)} sub={`Investissement : ${fmtXPF(r.invest)}`} />
            <Stat icon={Wallet} label="Trésorerie à 12 mois" tone={proj[11].cash >= 0 ? undefined : "neg"} value={(proj[11].cash < 0 ? "−" : "") + fmtXPF(Math.abs(proj[11].cash))} sub={minCash < 0 ? `Point bas : −${fmtXPF(Math.abs(minCash))}` : "Jamais négative sur 36 mois"} />
          </div>

          <div className="panel">
            <div className="panel-head"><h3>Détail du chiffre d'affaires mensuel</h3></div>
            <div className="table-scroll">
              <table className="fin-table">
                <thead><tr><th>Source</th><th>Volume</th><th>Prix unitaire</th><th>Revenu mensuel</th><th>Part</th></tr></thead>
                <tbody>
                  {[["Starter", r.inputs.starter, r.inputs.pStarter, r.revStarter], ["Business", r.inputs.business, r.inputs.pBusiness, r.revBusiness], ["Premium", r.inputs.premium, r.inputs.pPremium, r.revPremium], ["Gratuit", r.inputs.free, 0, 0], ["Publications sponsorisées", r.inputs.sponsoredCount, r.inputs.sponsoredPrice, r.revSponsored], ["Autres revenus publicitaires", "—", "—", r.revOther]].map(([l, n, p, v]: any) => (
                    <tr key={l}><td>{l}</td><td>{typeof n === "number" ? fmtNum(n) : n}</td><td>{typeof p === "number" ? fmtXPF(p) : p}</td><td><strong>{fmtXPF(v)}</strong></td><td>{r.ca > 0 ? pct((v / r.ca) * 100) : "—"}</td></tr>
                  ))}
                  <tr className="total"><td>Total</td><td></td><td></td><td>{fmtXPF(r.ca)}</td><td>{r.ca > 0 ? "100 %" : "—"}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="fin-charts-2">
            <div className="panel">
              <div className="panel-head"><h3>Répartition du chiffre d'affaires</h3></div>
              {r.ca > 0 ? (
                <div className="chart-h chart-pie">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie isAnimationActive={false} data={[...revPie, ...adsPie]} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="none" rootTabIndex={-1} activeIndex={revSel ?? undefined} activeShape={growShape} onClick={(_: any, i: number) => setRevSel(revSel === i ? null : i)}>
                        {[...revPie, ...adsPie].map((x, i) => <Cell key={i} fill={["Starter", "Business", "Premium"].includes(x.name) ? PLAN_COLORS[["Starter", "Business", "Premium"].indexOf(x.name)] : ["#C9A27A", "#D9D4C7"][adsPie.indexOf(x as any)] || "#ccc"} />)}
                      </Pie>
                      <Tooltip contentStyle={tipStyle} formatter={(v: any) => fmtXPF(v)} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12, cursor: "pointer" }} onClick={(e: any) => { const i = [...revPie, ...adsPie].findIndex((x) => x.name === e.value); if (i >= 0) setRevSel(revSel === i ? null : i); }} formatter={(v: any) => <span style={{ fontWeight: revSel != null && [...revPie, ...adsPie][revSel]?.name === v ? 700 : 400, color: "var(--fg)" }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="muted">Aucun revenu avec les hypothèses actuelles.</p>}
            </div>
            <div className="panel">
              <div className="panel-head"><h3>Répartition des charges</h3></div>
              {r.charges > 0 ? (
                <div className="chart-h chart-pie">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie isAnimationActive={false} data={chargePie} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={1.5} stroke="none" rootTabIndex={-1} activeIndex={chSel ?? undefined} activeShape={growShape} onClick={(_: any, i: number) => setChSel(chSel === i ? null : i)}>
                        {chargePie.map((_, i) => <Cell key={i} fill={CHARGE_COLORS[i % CHARGE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={tipStyle} formatter={(v: any) => fmtXPF(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="muted">Aucune charge saisie.</p>}
              <div className="legend-list">{chargePie.slice().sort((a, b) => b.value - a.value).slice(0, 5).map((c) => <div key={c.name} role="button" tabIndex={0} className={cx("legend-item", chSel === chargePie.indexOf(c) && "is-on")} onClick={() => { const i = chargePie.indexOf(c); setChSel(chSel === i ? null : i); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); const i = chargePie.indexOf(c); setChSel(chSel === i ? null : i); } }}><i style={{ background: CHARGE_COLORS[chargePie.indexOf(c) % CHARGE_COLORS.length] }} />{c.name}<b>{fmtXPF(c.value)}</b></div>)}</div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <div><h3>Projection du chiffre d'affaires et du résultat</h3><span className="muted small">Croissance {fin.growth} % · désabonnement {fin.churn} % · prix et charges fixes constants{firstPositive ? ` · premier mois bénéficiaire : ${firstPositive.label}` : " · aucun mois bénéficiaire sur 36 mois"}</span></div>
              <Segmented size="sm" value={horizon} onChange={setHorizon} options={[{ v: "12", l: "12 mois" }, { v: "24", l: "24 mois" }, { v: "36", l: "36 mois" }]} />
            </div>
            <div className="chart-h chart-lg">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={shown} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} minTickGap={18} />
                  <YAxis tickFormatter={kF} tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={52} />
                  <Tooltip contentStyle={tipStyle} formatter={(v: any, n: any) => [fmtXPF(v), n]} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine y={0} stroke="var(--muted)" strokeDasharray="3 3" />
                  <Bar isAnimationActive={false} dataKey="result" name="Résultat estimé" radius={[3, 3, 0, 0]} maxBarSize={18}>{shown.map((x, i) => <Cell key={i} fill={x.result >= 0 ? "#5E8C72" : "#C8553D"} />)}</Bar>
                  <Line isAnimationActive={false} type="monotone" dataKey="ca" name="Chiffre d'affaires" stroke="var(--c1)" strokeWidth={2.2} dot={false} />
                  <Line isAnimationActive={false} type="monotone" dataKey="charges" name="Charges" stroke="var(--ch-acc)" strokeWidth={2} strokeDasharray="5 4" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="fin-charts-2">
            <div className="panel">
              <div className="panel-head"><h3>Évolution du nombre de commerçants</h3></div>
              <div className="chart-h">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={shown} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid stroke="var(--line)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} minTickGap={18} />
                    <YAxis tickFormatter={kF} tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={40} />
                    <Tooltip contentStyle={tipStyle} formatter={(v: any, n: any) => [fmtNum(v), n]} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    <Area isAnimationActive={false} type="monotone" stackId="1" dataKey="free" name="Gratuit" stroke="#B7B9A8" fill="#D9D4C7" />
                    <Area isAnimationActive={false} type="monotone" stackId="1" dataKey="starter" name="Starter" stroke="var(--ch-c)" fill="var(--ch-c)" />
                    <Area isAnimationActive={false} type="monotone" stackId="1" dataKey="business" name="Business" stroke="var(--c1)" fill="var(--c1)" />
                    <Area isAnimationActive={false} type="monotone" stackId="1" dataKey="premium" name="Premium" stroke="var(--ch-acc)" fill="var(--ch-acc)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="panel">
              <div className="panel-head"><h3>Trésorerie prévisionnelle</h3><span className="muted small">départ − investissement + résultats cumulés</span></div>
              <div className="chart-h">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={shown} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                    <defs><linearGradient id="gCash" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--c1)" stopOpacity={0.3} /><stop offset="100%" stopColor="var(--c1)" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid stroke="var(--line)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} minTickGap={18} />
                    <YAxis tickFormatter={kF} tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={52} />
                    <Tooltip contentStyle={tipStyle} formatter={(v: any) => [fmtXPF(v), "Trésorerie"]} />
                    <ReferenceLine y={0} stroke="#C8553D" strokeDasharray="4 4" />
                    <Area isAnimationActive={false} type="monotone" dataKey="cash" stroke="var(--fg)" strokeWidth={2} fill="url(#gCash)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><div><h3>Visualisation du seuil de rentabilité</h3><span className="muted small">Chiffre d'affaires et charges selon le nombre de commerçants payants, au revenu moyen de {fmtXPF(r.arpuForBE)} et avec {fmtXPF(r.revAds)} de revenus complémentaires</span></div></div>
            <div className="be-keys">
              <span className="be-key"><i className="be-dash" /><b>Seuil de rentabilité</b>{r.breakEvenMerchants == null ? "non calculable" : `${fmtNum(r.breakEvenMerchants)} commerçants payants`}</span>
              <span className="be-key"><i className="be-solid" /><b>Situation actuelle</b>{fmtNum(r.paying)} commerçants payants</span>
              <span className={cx("be-verdict", r.gapToBreakEven === 0 ? "ok" : "ko")}>{r.breakEvenMerchants == null ? "" : r.gapToBreakEven === 0 ? `Seuil dépassé de ${fmtNum(r.paying - r.breakEvenMerchants)} payants` : `Il manque ${fmtNum(r.gapToBreakEven!)} payants pour couvrir les charges`}</span>
            </div>
            <div className="chart-h">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={beData} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="n" type="number" domain={[0, "dataMax"]} tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={kF} tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={52} />
                  <Tooltip contentStyle={tipStyle} labelFormatter={(n: any) => `${n} commerçants payants`} formatter={(v: any, n: any) => [fmtXPF(v), n]} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  {r.breakEvenMerchants != null && <ReferenceLine x={r.breakEvenMerchants} stroke="var(--ch-acc)" strokeDasharray="4 4" strokeWidth={2} />}
                  <ReferenceLine x={r.paying} stroke="var(--muted)" strokeWidth={2} />
                  <Line isAnimationActive={false} type="linear" dataKey="ca" name="Chiffre d'affaires" stroke="var(--c1)" strokeWidth={2.2} dot={false} />
                  <Line isAnimationActive={false} type="linear" dataKey="charges" name="Charges" stroke="var(--ch-acc)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><h3>Comparaison des scénarios</h3><span className="muted small">Tarifs, charges et dynamique actuels appliqués à chaque répartition</span></div>
            <div className="table-scroll">
              <table className="fin-table cmp-table">
                <thead><tr><th>Scénario</th><th>Payants</th><th>MRR</th><th>CA mensuel</th><th>Charges</th><th>Résultat mensuel</th><th>Marge</th><th>Seuil</th><th>Récupération</th><th>Trésorerie à 36 mois</th><th></th></tr></thead>
                <tbody>
                  {compare.map((x: any) => (
                    <tr key={x.id} className={cx((x.id === activeScenario || (x.id === "current")) && "is-current")}>
                      <td><strong>{x.name}</strong></td>
                      <td>{fmtNum(x.m.paying)}</td>
                      <td>{fmtXPF(x.m.mrr)}</td>
                      <td>{fmtXPF(x.m.ca)}</td>
                      <td>{fmtXPF(x.m.charges)}</td>
                      <td className={x.m.result >= 0 ? "pos" : "neg"}>{x.m.result < 0 ? "−" : ""}{fmtXPF(Math.abs(x.m.result))}</td>
                      <td>{pct(x.m.margin)}</td>
                      <td>{x.m.breakEvenMerchants ?? "—"}</td>
                      <td>{x.pb == null ? "> 10 ans" : x.pb === 0 ? "—" : `${x.pb} mois`}</td>
                      <td className={x.cash36 >= 0 ? "" : "neg"}>{x.cash36 < 0 ? "−" : ""}{fmtXPF(Math.abs(x.cash36))}</td>
                      <td className="cell-actions">
                        {x.saved && <><Btn size="sm" variant="ghost" onClick={() => { mutate((d) => { d.fin = structuredClone(x.inputs); }); toast(`« ${x.name} » chargé`, "info"); }}>Charger</Btn><IconBtn icon={Trash2} size={15} label="Supprimer" onClick={() => mutate((d) => { d.savedScenarios = d.savedScenarios.filter((y) => y.id !== x.id); })} /></>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="method">
            <Info size={16} />
            <div>
              <strong>Méthode de calcul</strong>
              <p>Revenus par forfait = nombre de commerçants × tarif. MRR = Starter + Business + Premium. ARR = MRR × 12. Chiffre d'affaires = MRR + publications sponsorisées + autres revenus. Charges = charges fixes + frais de paiement (% du CA). Résultat = CA − charges, avant impôts : ce n'est ni un bénéfice net, ni de la trésorerie. Marge = résultat ÷ CA × 100. Seuil = (charges fixes − revenus complémentaires nets de frais) ÷ (revenu moyen par payant × (1 − taux de frais)), arrondi au supérieur. Trésorerie = trésorerie de départ − investissement initial + résultats cumulés. Récupération = premier mois où les résultats cumulés couvrent l'investissement initial.</p>
            </div>
          </div>
        </div>
      </div>

      <Modal open={saveOpen} onClose={() => setSaveOpen(false)} title="Enregistrer le scénario">
        <Field label="Nom du scénario" htmlFor="sc-name"><input id="sc-name" value={saveName} onChange={(e) => setSaveName(e.target.value)} /></Field>
        <div className="row-end" style={{ marginTop: 16 }}><Btn variant="ghost" onClick={() => setSaveOpen(false)}>Annuler</Btn><Btn disabled={!saveName.trim()} onClick={() => { mutate((d) => { d.savedScenarios.push({ id: Math.random().toString(36).slice(2, 8), name: saveName.trim(), inputs: structuredClone(d.fin) }); }); setSaveOpen(false); toast("Scénario enregistré dans la comparaison"); }}>Enregistrer</Btn></div>
      </Modal>
      <Modal open={csv != null} onClose={() => setCsv(null)} title="Export CSV" wide>
        <p className="muted" style={{ marginTop: 0 }}>Le téléchargement direct n'est pas disponible dans cette vue. Copiez le contenu ci-dessous et collez-le dans un fichier .csv (séparateur point-virgule, compatible Excel en français).</p>
        <textarea id="csv-out" className="csv-out" readOnly value={csv || ""} onFocus={(e) => e.target.select()} />
        <div className="row-end" style={{ marginTop: 12 }}><Btn icon={Copy} onClick={async () => { try { await navigator.clipboard.writeText(csv || ""); toast("CSV copié"); } catch { (document.getElementById("csv-out") as HTMLTextAreaElement)?.select(); toast("Sélectionnez le texte puis copiez-le", "warn"); } }}>Copier</Btn></div>
      </Modal>
    </div>
  );
}
