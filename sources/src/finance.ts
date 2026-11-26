// Moteur du simulateur financier — fonctions pures, testables.
export interface FinInputs {
  free: number; starter: number; business: number; premium: number;
  pStarter: number; pBusiness: number; pPremium: number;
  sponsoredCount: number; sponsoredPrice: number; otherAds: number;
  growth: number; churn: number; // % mensuels
  charges: Record<string, number>; // charges fixes mensuelles (XPF)
  paymentFeeRate: number; // % du chiffre d'affaires encaissé
  investDev: number; investLaunch: number; startCash: number;
}

export const CHARGE_LABELS: Record<string, string> = {
  hosting: "Hébergement et infrastructure",
  maintenance: "Maintenance technique",
  marketing: "Marketing et communication",
  sales: "Prospection commerciale",
  founder: "Rémunération du fondateur",
  salaries: "Salaires éventuels",
  software: "Logiciels et abonnements",
  accounting: "Comptabilité",
  admin: "Frais administratifs",
  other: "Autres charges",
};

export const DEFAULT_INPUTS: FinInputs = {
  free: 60, starter: 20, business: 40, premium: 10,
  pStarter: 1900, pBusiness: 4900, pPremium: 9900,
  sponsoredCount: 12, sponsoredPrice: 3500, otherAds: 25000,
  growth: 6, churn: 3,
  charges: { hosting: 18000, maintenance: 35000, marketing: 60000, sales: 40000, founder: 250000, salaries: 0, software: 15000, accounting: 20000, admin: 10000, other: 10000 },
  paymentFeeRate: 2.5,
  investDev: 1500000, investLaunch: 500000, startCash: 2500000,
};

export const SCENARIOS: { id: string; name: string; free: number; starter: number; business: number; premium: number }[] = [
  { id: "lancement", name: "Lancement", free: 30, starter: 10, business: 5, premium: 2 },
  { id: "developpement", name: "Développement", free: 60, starter: 20, business: 40, premium: 10 },
  { id: "croissance", name: "Croissance", free: 100, starter: 50, business: 80, premium: 25 },
  { id: "expansion", name: "Expansion", free: 150, starter: 100, business: 150, premium: 50 },
];

const nn = (v: any) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; };

export function sanitize(i: FinInputs): FinInputs {
  const charges: Record<string, number> = {};
  for (const k of Object.keys(CHARGE_LABELS)) charges[k] = nn(i.charges?.[k]);
  return {
    free: Math.round(nn(i.free)), starter: Math.round(nn(i.starter)), business: Math.round(nn(i.business)), premium: Math.round(nn(i.premium)),
    pStarter: nn(i.pStarter), pBusiness: nn(i.pBusiness), pPremium: nn(i.pPremium),
    sponsoredCount: Math.round(nn(i.sponsoredCount)), sponsoredPrice: nn(i.sponsoredPrice), otherAds: nn(i.otherAds),
    growth: Math.min(nn(i.growth), 50), churn: Math.min(nn(i.churn), 100),
    charges, paymentFeeRate: Math.min(nn(i.paymentFeeRate), 100),
    investDev: nn(i.investDev), investLaunch: nn(i.investLaunch),
    startCash: Number.isFinite(Number(i.startCash)) ? Number(i.startCash) : 0,
  };
}

export function monthly(raw: FinInputs) {
  const i = sanitize(raw);
  const revStarter = i.starter * i.pStarter;
  const revBusiness = i.business * i.pBusiness;
  const revPremium = i.premium * i.pPremium;
  const mrr = revStarter + revBusiness + revPremium;
  const revSponsored = i.sponsoredCount * i.sponsoredPrice;
  const revOther = i.otherAds;
  const revAds = revSponsored + revOther;
  const ca = mrr + revAds;
  const fixed = Object.values(i.charges).reduce((a, b) => a + b, 0);
  const fees = ca * (i.paymentFeeRate / 100);
  const charges = fixed + fees;
  const result = ca - charges;
  const margin = ca > 0 ? (result / ca) * 100 : null;
  const paying = i.starter + i.business + i.premium;
  const total = paying + i.free;
  const arpu = paying > 0 ? mrr / paying : 0;

  // Seuil de rentabilité : combien de commerçants payants (au revenu moyen actuel)
  // faut-il pour que CA × (1 − frais) couvre les charges fixes, compte tenu des revenus complémentaires.
  const keep = 1 - i.paymentFeeRate / 100;
  const arpuForBE = arpu > 0 ? arpu : (i.pStarter + i.pBusiness + i.pPremium) / 3; // repli si aucun payant
  const needFromSubs = fixed - revAds * keep;
  let breakEvenMerchants: number | null;
  if (keep <= 0) breakEvenMerchants = null;
  else if (needFromSubs <= 0) breakEvenMerchants = 0;
  else if (arpuForBE <= 0) breakEvenMerchants = null;
  else breakEvenMerchants = Math.ceil(needFromSubs / (arpuForBE * keep));
  const breakEvenCA = keep > 0 ? fixed / keep : null;
  const invest = i.investDev + i.investLaunch;

  return {
    inputs: i, revStarter, revBusiness, revPremium, mrr, arr: mrr * 12, revSponsored, revOther, revAds,
    ca, caYear: ca * 12, fixed, fees, charges, chargesYear: charges * 12, result, resultYear: result * 12,
    margin, paying, total, arpu, arpuForBE, arpuFallback: arpu <= 0, breakEvenMerchants, breakEvenCA, invest,
    gapToBreakEven: breakEvenMerchants == null ? null : Math.max(0, breakEvenMerchants - paying),
  };
}

export interface ProjRow { m: number; label: string; free: number; starter: number; business: number; premium: number; merchants: number; paying: number; mrr: number; ca: number; charges: number; result: number; cumResult: number; cash: number }

// Projection mensuelle : chaque segment évolue de (croissance − désabonnement) par mois.
// Hypothèses : prix, charges fixes et revenus complémentaires constants ; mois 1 = situation actuelle.
export function project(raw: FinInputs, months: number): ProjRow[] {
  const i = sanitize(raw);
  const f = 1 + (i.growth - i.churn) / 100;
  const rows: ProjRow[] = [];
  let cum = 0;
  let cash = i.startCash - i.investDev - i.investLaunch;
  const start = new Date();
  for (let m = 1; m <= months; m++) {
    const k = Math.pow(Math.max(f, 0), m - 1);
    const seg = { free: i.free * k, starter: i.starter * k, business: i.business * k, premium: i.premium * k };
    const r = monthly({ ...i, ...seg } as FinInputs);
    cum += r.result;
    cash += r.result;
    const dt = new Date(start.getFullYear(), start.getMonth() + m - 1, 1);
    rows.push({
      m, label: dt.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      ...seg, merchants: seg.free + seg.starter + seg.business + seg.premium, paying: seg.starter + seg.business + seg.premium,
      mrr: r.mrr, ca: r.ca, charges: r.charges, result: r.result, cumResult: cum, cash,
    });
  }
  return rows;
}

// Délai de récupération : premier mois où le cumul des résultats couvre l'investissement initial.
export function payback(raw: FinInputs, horizon = 120): number | null {
  const i = sanitize(raw);
  const inv = i.investDev + i.investLaunch;
  if (inv <= 0) return 0;
  const rows = project(i, horizon);
  const hit = rows.find((r) => r.cumResult >= inv);
  return hit ? hit.m : null;
}

export function toCSV(rows: (string | number)[][]) {
  return rows.map((r) => r.map((c) => {
    const s = typeof c === "number" ? String(Math.round(c)) : String(c);
    return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(";")).join("\n");
}
