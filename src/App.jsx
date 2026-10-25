import { useMemo, useRef, useState } from "react";
import {
  ArrowRight, CaretDown, Check, Clock, Coins, Info, Minus, Plus, ShieldCheck, Sparkle,
} from "@phosphor-icons/react";

const YEAR = 2026;
const MONTHS = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
];

const HOLIDAYS_2026 = new Set([
  "2026-01-01", "2026-01-02", "2026-01-06", "2026-01-07", "2026-01-24",
  "2026-04-10", "2026-04-12", "2026-04-13", "2026-05-01", "2026-05-31",
  "2026-06-01", "2026-08-15", "2026-11-30", "2026-12-01", "2026-12-25",
  "2026-12-26",
]);

function minimumWage(month) {
  return month < 6 ? 4050 : 4325;
}

function workingHours(month) {
  const daysInMonth = new Date(Date.UTC(YEAR, month + 1, 0)).getUTCDate();
  let workdays = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(Date.UTC(YEAR, month, day));
    const weekday = date.getUTCDay();
    const key = YEAR + "-" + String(month + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
    if (weekday !== 0 && weekday !== 6 && !HOLIDAYS_2026.has(key)) workdays += 1;
  }
  return workdays * 8;
}

function getMonthlyEstimate(month, data) {
  const minimum = minimumWage(month);
  const hoursInMonth = workingHours(month);
  const salary = Math.max(0, Number(data.salary) || 0);
  const overtimeHours = Math.max(0, Number(data.overtimeHours) || 0);
  const premium = Math.max(75, Number(data.premium) || 75);
  const hourlyRate = hoursInMonth ? salary / hoursInMonth : 0;
  const overtimePay = data.overtimeMode === "paid"
    ? hourlyRate * overtimeHours * (1 + premium / 100)
    : 0;
  const gross = salary + overtimePay;
  const minimumRelief = month < 6 ? 300 : 200;
  const grossThreshold = month < 6 ? 4300 : 4600;
  const qualifiesForMinimumRelief =
    data.mainJob &&
    Math.abs(salary - minimum) < 0.01 &&
    gross <= grossThreshold;
  const taxFree = qualifiesForMinimumRelief ? Math.min(minimumRelief, gross) : 0;
  const contributionBase = Math.max(0, gross - taxFree);
  const cas = contributionBase * 0.25;
  const cass = contributionBase * 0.1;

  let basicDeduction = 0;
  if (data.mainJob && gross <= minimum + 2000) {
    const dependentCount = Math.max(0, Math.min(4, Number(data.dependents) || 0));
    const startingPercent = [20, 25, 30, 35, 45][dependentCount];
    const stepsAboveMinimum = Math.floor(Math.max(0, gross - minimum) / 50);
    const percent = Math.max(0, startingPercent - stepsAboveMinimum * 0.5);
    basicDeduction = minimum * percent / 100;
  }

  const ageDeduction = data.mainJob && Number(data.ageUnder26) && gross <= minimum + 2000
    ? minimum * 0.15
    : 0;
  const childDeduction = data.mainJob ? Math.max(0, Number(data.children) || 0) * 100 : 0;
  const taxableAfterContributions = Math.max(0, contributionBase - cas - cass);
  const personalDeduction = Math.min(
    taxableAfterContributions,
    basicDeduction + ageDeduction + childDeduction,
  );
  const incomeTax = Math.max(0, taxableAfterContributions - personalDeduction) * 0.1;
  const net = Math.max(0, gross - cas - cass - incomeTax);

  return {
    gross, net, cas, cass, incomeTax, overtimePay, hourlyRate,
    hoursInMonth, personalDeduction, taxFree, minimum,
  };
}

function money(value) {
  return Math.round(value).toLocaleString("ro-RO");
}

function Icon({ name, size = 18 }) {
  const icons = {
    arrow: ArrowRight, chevron: CaretDown, check: Check, clock: Clock,
    coins: Coins, info: Info, minus: Minus, plus: Plus,
    shield: ShieldCheck, sparkle: Sparkle,
  };
  const IconComponent = icons[name] || Info;
  return <IconComponent size={size} weight="regular" aria-hidden="true" />;
}

function Stepper({ label, value, onChange, note }) {
  const numeric = Number(value) || 0;
  return (
    <div className="stepper-row">
      <div>
        <span className="stepper-label">{label}</span>
        {note && <span className="stepper-note">{note}</span>}
      </div>
      <div className="stepper-control" aria-label={label}>
        <button type="button" aria-label={"Scade " + label} onClick={() => onChange(Math.max(0, numeric - 1))}>
          <Icon name="minus" size={15} />
        </button>
        <span aria-live="polite">{numeric}</span>
        <button type="button" aria-label={"Adaugă " + label} onClick={() => onChange(Math.min(10, numeric + 1))}>
          <Icon name="plus" size={15} />
        </button>
      </div>
    </div>
  );
}

function TaxRow({ label, value, detail, tone }) {
  return (
    <div className={"tax-row" + (tone ? " " + tone : "")}>
      <div className="tax-row-copy">
        <span className="tax-label">{label}</span>
        {detail && <span className="tax-detail">{detail}</span>}
      </div>
      <span className="tax-value">{value}</span>
    </div>
  );
}

export function App() {
  const [salary, setSalary] = useState("8000");
  const [month, setMonth] = useState(9);
  const [overtimeHours, setOvertimeHours] = useState("10");
  const [premium, setPremium] = useState("75");
  const [overtimeMode, setOvertimeMode] = useState("paid");
  const [mainJob, setMainJob] = useState(true);
  const [advanced, setAdvanced] = useState(false);
  const [dependents, setDependents] = useState(0);
  const [ageUnder26, setAgeUnder26] = useState(false);
  const [children, setChildren] = useState(0);
  const resultRef = useRef(null);

  const data = { salary, overtimeHours, premium, overtimeMode, mainJob, dependents, ageUnder26, children };
  const estimate = useMemo(() => getMonthlyEstimate(month, data), [
    month, salary, overtimeHours, premium, overtimeMode, mainJob, dependents, ageUnder26, children,
  ]);
  const baseEstimate = useMemo(() => getMonthlyEstimate(month, { ...data, overtimeHours: "0" }), [
    month, salary, premium, overtimeMode, mainJob, dependents, ageUnder26, children,
  ]);
  const annual = useMemo(() => Array.from({ length: 12 }, (_, index) => getMonthlyEstimate(index, data))
    .reduce((total, item) => total + item.net, 0), [
    salary, overtimeHours, premium, overtimeMode, mainJob, dependents, ageUnder26, children,
  ]);
  const overtimeNet = overtimeMode === "paid" ? Math.max(0, estimate.net - baseEstimate.net) : 0;

  function handleSubmit(event) {
    event.preventDefault();
    resultRef.current?.focus();
  }

  return (
    <div className="site-shell">
      <main className="calculator-page">
        <section id="calculator" className="calculator-card" aria-label="Calculator salariu net">
          <form className="input-panel" onSubmit={handleSubmit}>
            <div className="panel-kicker"><span className="kicker-dot" /> CALCULATOR SALARIAL · ROMÂNIA</div>
            <h1>Salariul tău</h1>
            <p className="panel-intro">Introdu câteva detalii și află cât primești în mână.</p>

            <label className="month-field" htmlFor="month">
              <span>Luna de calcul</span>
              <div className="select-wrap">
                <select id="month" value={month} onChange={(event) => setMonth(Number(event.target.value))}>
                  {MONTHS.map((name, index) => <option key={name} value={index}>{name} {YEAR}</option>)}
                </select>
                <Icon name="chevron" size={16} />
              </div>
            </label>

            <label className="field-block" htmlFor="salary">
              <span className="field-label">Salariu brut lunar</span>
              <div className="money-input-wrap">
                <span className="input-symbol"><Icon name="coins" size={16} /></span>
                <input
                  id="salary"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="50"
                  value={salary}
                  onChange={(event) => setSalary(event.target.value)}
                />
                <span className="input-suffix">lei</span>
              </div>
            </label>

            <label className="field-block overtime-field" htmlFor="overtime-hours">
              <span className="field-label">Ore suplimentare</span>
              <div className="plain-input-wrap">
                <input
                  id="overtime-hours"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  value={overtimeHours}
                  onChange={(event) => setOvertimeHours(event.target.value)}
                />
                <span>ore</span>
              </div>
            </label>

            <button className="calculate-button" type="submit">Calculează salariul net <Icon name="arrow" size={17} /></button>
            <button className="advanced-toggle" type="button" onClick={() => setAdvanced(!advanced)} aria-expanded={advanced}>
              <span>Detalii pentru un calcul mai exact</span><Icon name="chevron" size={16} />
            </button>
            {advanced && (
              <div className="advanced-panel">
                <div className="advanced-subhead">Spor și deduceri personale</div>
                <label className="compact-field">
                  <span>Spor negociat pentru orele plătite</span>
                  <div className="plain-input-wrap small-input">
                    <input type="number" min="75" max="300" value={premium} onChange={(event) => setPremium(event.target.value)} onBlur={() => setPremium(String(Math.max(75, Number(premium) || 75)))} />
                    <span>% · minimum 75%</span>
                  </div>
                </label>
                <div className="compensation-choice" role="group" aria-label="Modul de compensare a orelor suplimentare">
                  <button type="button" className={overtimeMode === "paid" ? "choice active" : "choice"} onClick={() => setOvertimeMode("paid")}>Plătite</button>
                  <button type="button" className={overtimeMode === "timeOff" ? "choice active" : "choice"} onClick={() => setOvertimeMode("timeOff")}>Timp liber</button>
                </div>
                <label className="checkbox-row">
                  <input type="checkbox" checked={mainJob} onChange={(event) => setMainJob(event.target.checked)} />
                  <span className="fake-check"><Icon name="check" size={13} /></span>
                  <span>Acesta este locul funcției de bază</span>
                </label>
                <Stepper label="Persoane în întreținere" value={dependents} onChange={setDependents} />
                <label className="checkbox-row">
                  <input type="checkbox" checked={ageUnder26} onChange={(event) => setAgeUnder26(event.target.checked)} />
                  <span className="fake-check"><Icon name="check" size={13} /></span>
                  <span>Am până în 26 de ani</span>
                </label>
                <Stepper label="Copii sub 18 ani, la școală" value={children} onChange={setChildren} note="Deducere de 100 lei/copil" />
              </div>
            )}
            <div className="privacy-note"><Icon name="shield" size={14} /> Datele rămân în browserul tău.</div>
          </form>

          <aside id="results" className="results-panel" aria-live="polite" tabIndex={-1} ref={resultRef}>
            <div className="result-header">
              <span className="result-kicker">SALARIU NET ESTIMAT</span>
              <span className="estimate-pill"><span /> estimare</span>
            </div>
            <div className="net-amount">{money(estimate.net)} <span>lei</span></div>
            <div className="result-period">pe lună · {MONTHS[month]} {YEAR}</div>

            <div className="annual-result">
              <div>
                <span>Estimare anuală <small>(12 luni)</small></span>
                <strong>{money(annual)} <small>lei</small></strong>
              </div>
              <Icon name="arrow" size={16} />
            </div>

            <div className="deductions-heading">
              <span>Deduceri principale <small>(lunar)</small></span>
              <button type="button" aria-label="Despre calculul deducerilor" title="CAS și CASS sunt calculate înaintea impozitului pe venit."><Icon name="info" size={15} /></button>
            </div>
            <div className="deduction-list">
              <TaxRow label="CAS" detail="Asigurări sociale" value={"− " + money(estimate.cas) + " lei"} />
              <TaxRow label="CASS" detail="Asigurări de sănătate" value={"− " + money(estimate.cass) + " lei"} />
              <TaxRow label="Impozit pe venit" detail="Cotă 10%" value={"− " + money(estimate.incomeTax) + " lei"} />
              <TaxRow
                label="Ore suplimentare"
                detail={Number(overtimeHours) > 0
                  ? overtimeMode === "paid" ? "Net din orele plătite" : "Compensate cu timp liber"
                  : "Fără ore suplimentare"}
                value={overtimeNet > 0
                  ? "+ " + money(overtimeNet) + " lei"
                  : overtimeMode === "timeOff" && Number(overtimeHours) > 0 ? "timp liber" : "—"}
                tone="overtime-row"
              />
              {estimate.taxFree > 0 && <TaxRow label="Sumă netaxabilă" detail="Facilitate 2026" value={"+ " + money(estimate.taxFree) + " lei"} tone="relief-row" />}
            </div>

            <div className="result-footer">
              <span className="footer-check"><Icon name="check" size={13} /></span>
              <span>Estimare orientativă · reguli fiscale România</span>
            </div>
            <p className="annual-note">Proiecția anuală presupune aceleași valori în fiecare lună și aplică pragurile fiscale în vigoare pentru 2026.</p>
          </aside>
        </section>

        <section className="legal-note" aria-label="Reguli și surse">
          <details>
          <summary>Reguli salariale și fiscale în 2026</summary>
          <div className="legal-summary">
            <strong><Icon name="shield" size={15} /> Calcul orientativ pentru contract individual de muncă, normă întreagă și condiții normale.</strong>
            <span>CAS 25% · CASS 10% · impozit pe venit 10% · salariul minim: 4.050 lei până în iunie și 4.325 lei din iulie.</span>
            <span>Orele suplimentare se compensează de regulă cu timp liber plătit în 90 de zile; dacă plata devine necesară, sporul negociat este de cel puțin 75%.</span>
            <span>Calculul orelor suplimentare presupune zile lucrătoare obișnuite; weekendurile și sărbătorile pot avea sporuri distincte.</span>
            <span>Pentru salariații cu normă întreagă la funcția de bază, suma netaxabilă în 2026 este 300 lei până în iunie și 200 lei din iulie, în limita pragurilor legale.</span>
          </div>
          <p>Nu include beneficii, tichete, sporuri speciale, timp parțial sau situații fiscale particulare. Rezultatul final depinde de contract și de calculul angajatorului.</p>
          <div className="source-links">
            <span>Surse oficiale:</span>
            <a href="https://legislatie.just.ro/Public/FormaPrintabila/00000G2VA3WSSUXLTAV13RJ1ZXHLJI1O" target="_blank" rel="noreferrer">Codul muncii</a>
            <a href="https://legislatie.just.ro/Public/FormaPrintabila/00000G0UWAJQDLM8S3J00SPP9LDAJLOY" target="_blank" rel="noreferrer">Salariul minim</a>
            <a href="https://legislatie.just.ro/Public/DetaliiDocument/307679" target="_blank" rel="noreferrer">Reguli fiscale 2026</a>
            <a href="https://static.anaf.ro/static/3/Galati/20260123122801_suma%20neimpozabila%20in%202026.pdf" target="_blank" rel="noreferrer">Sumă netaxabilă · ANAF</a>
          </div>
          </details>
        </section>
      </main>
    </div>
  );
}
