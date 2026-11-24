import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MdArrowBack, MdArrowForward, MdCheck, MdClose } from "react-icons/md";
import { OPEN_SERVICE, SERVICES } from "../data/brief";
import "./styles/BriefFlow.css";

/**
 * "Projeni anlat": the project brief in three short steps (kind of work, the brief,
 * contact details). It is shared by /hakkimda (the final scene) and the home page
 * (the "Birlikte neler üretebiliriz?" starters). It posts to /api/idea and says "Brief’in
 * ulaştı." only when the server confirms that the mail service accepted the message.
 */

type Draft = {
  services: string[];
  brief: string;
  deadline: string;
  budget: string;
  reference: string;
  name: string;
  email: string;
  company: string;
};
type Field = "services" | "brief" | "deadline" | "reference" | "name" | "email";
type Errors = Partial<Record<Field, string>>;
type Status = "idle" | "sending" | "sent" | "error";

const STEPS = ["İşin türü", "Projenin brief’i", "İletişim bilgileri"] as const;
/** The step each field lives on (used to jump to the right step after a server error). */
const FIELD_STEP: Record<Field, number> = { services: 0, brief: 1, deadline: 1, reference: 1, name: 2, email: 2 };

const EMPTY: Draft = { services: [], brief: "", deadline: "", budget: "", reference: "", name: "", email: "", company: "" };
const DRAFT_KEY = "brief-draft-v1";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const MESSAGES: Record<string, string> = {
  not_configured: "Gönderim şu an kullanılamıyor. Biraz sonra tekrar dene.",
  rate_limited: "Kısa sürede çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.",
  provider_rejected: "Mesaj teslim edilemedi. Biraz sonra tekrar dene.",
  provider_unreachable: "Mesaj servisine ulaşılamadı. Biraz sonra tekrar dene.",
  rejected: "Form gönderilemedi. Sayfayı yenileyip tekrar dene.",
};

// The draft only lives in this tab's session storage, so a closed panel (or a failed send)
// does not lose what was typed. It is cleared after a successful send.
const loadDraft = (): { draft: Draft; startedAt: number | null } => {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return { draft: { ...EMPTY }, startedAt: null };
    const d = JSON.parse(raw) as Partial<Draft> & { startedAt?: unknown };
    const str = (v: unknown) => (typeof v === "string" ? v : "");
    const draft: Draft = {
      services: Array.isArray(d.services) ? d.services.filter((s): s is string => SERVICES.some((x) => x.label === s)) : [],
      brief: str(d.brief),
      deadline: str(d.deadline),
      budget: str(d.budget),
      reference: str(d.reference),
      name: str(d.name),
      email: str(d.email),
      company: str(d.company),
    };
    return { draft, startedAt: typeof d.startedAt === "number" ? d.startedAt : null };
  } catch {
    return { draft: { ...EMPTY }, startedAt: null };
  }
};
const saveDraft = (d: Draft | null, startedAt = Date.now()) => {
  try {
    if (d) window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...d, startedAt }));
    else window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* storage blocked: the panel still works, it just forgets on close */
  }
};

const today = () => {
  const n = new Date();
  const p = (v: number) => String(v).padStart(2, "0");
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
};

/** "behance.net/ada" is accepted as "https://behance.net/ada". */
const withScheme = (v: string) => {
  const t = v.trim();
  return t && !/^[a-z][a-z0-9+.-]*:/i.test(t) ? `https://${t}` : t;
};
const validUrl = (v: string) => {
  const t = withScheme(v);
  // Browsers accept spaces in a host name and a host without a dot, so those are checked here.
  if (/\s/.test(t)) return false;
  try {
    const u = new URL(t);
    return /^https?:$/.test(u.protocol) && u.hostname.includes(".");
  } catch {
    return false;
  }
};

const validate = (step: number, d: Draft): Errors => {
  const e: Errors = {};
  if (step === 0 && d.services.length === 0) e.services = "En az bir iş türü seç.";
  if (step === 1) {
    if (d.brief.trim().length < 10) e.brief = "Projeni birkaç cümleyle anlat.";
    if (d.deadline && !(/^\d{4}-\d{2}-\d{2}$/.test(d.deadline) && d.deadline >= today())) e.deadline = "Geçerli bir tarih seç.";
    if (d.reference.trim() && !validUrl(d.reference)) e.reference = "Geçerli bir bağlantı yaz (https://...).";
  }
  if (step === 2) {
    if (d.name.trim().length < 2) e.name = "Adını yaz.";
    if (!EMAIL.test(d.email.trim())) e.email = "Geçerli bir e-posta yaz.";
  }
  return e;
};

const shorten = (v: string, max: number) => {
  const t = v.trim().replace(/\s+/g, " ");
  return t.length > max ? `${t.slice(0, max).trimEnd()}…` : t;
};

type Props = {
  /** Services selected when the panel opens (the starters on the home page use this). */
  initialServices?: readonly string[];
  onClose: () => void;
  /** Page scroll is stopped while the panel is open; each page does it its own way. */
  lock: () => void;
  unlock: () => void;
};

const BriefFlow = ({ initialServices, onClose, lock, unlock }: Props) => {
  const [saved] = useState(loadDraft);
  const [draft, setDraft] = useState<Draft>(() =>
    initialServices && initialServices.length ? { ...saved.draft, services: [...initialServices] } : saved.draft
  );
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const opened = useRef(saved.startedAt ?? Date.now());
  const panel = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const trap = useRef<HTMLInputElement>(null);

  useEffect(() => {
    lock();
    return unlock;
  }, [lock, unlock]);

  useEffect(() => {
    if (status !== "sent") saveDraft(draft, opened.current);
  }, [draft, status]);

  // Each step (and the thank-you) starts with focus on its heading: a keyboard or screen
  // reader user lands at the top of what is new.
  const sent = status === "sent";
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [step, sent]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      // Keep Tab inside the panel.
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>("button, input, textarea, [href]")).filter(
        (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1 && el.getClientRects().length > 0
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const outside = !panel.current.contains(active) || active === heading.current;
      if (e.shiftKey && (active === first || outside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || outside)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const toggle = (label: string) => {
    const on = draft.services.includes(label);
    let next: string[];
    if (label === OPEN_SERVICE) next = on ? [] : [OPEN_SERVICE];
    else next = on ? draft.services.filter((s) => s !== label) : [...draft.services.filter((s) => s !== OPEN_SERVICE), label];
    set("services", SERVICES.map((s) => s.label).filter((l) => next.includes(l)));
  };

  // Checks one field when the visitor leaves it, but only if something was typed: an empty
  // required field is reported when the step is submitted, not while the visitor is still passing through.
  const blur = (key: Field) => {
    if (!String(draft[key as keyof Draft] ?? "").trim()) return;
    const e = validate(step, draft);
    if (e[key]) setErrors((p) => ({ ...p, [key]: e[key] }));
  };

  const focusInvalid = () =>
    window.requestAnimationFrame(() =>
      panel.current?.querySelector<HTMLElement>("[aria-invalid='true'], [data-invalid='true'] input")?.focus()
    );

  const next = () => {
    const e = validate(step, draft);
    if (Object.keys(e).length) {
      setErrors(e);
      focusInvalid();
      return;
    }
    setErrors({});
    setMessage("");
    setStatus("idle");
    setStep((s) => Math.min(2, s + 1));
  };

  const back = () => {
    setErrors({});
    setMessage("");
    setStatus("idle");
    setStep((s) => Math.max(0, s - 1));
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (status === "sending") return;
    if (step < 2) {
      next();
      return;
    }
    // Every step is checked again: the last step can be reached with an earlier one edited.
    const all: Errors = { ...validate(0, draft), ...validate(1, draft), ...validate(2, draft) };
    const bad = Object.keys(all) as Field[];
    if (bad.length) {
      setErrors(all);
      setStep(Math.min(...bad.map((k) => FIELD_STEP[k])));
      setStatus("error");
      setMessage("Formda eksik ya da hatalı alanlar var.");
      focusInvalid();
      return;
    }
    setErrors({});
    setMessage("");
    setStatus("sending");
    try {
      const res = await fetch("/api/idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          services: draft.services,
          brief: draft.brief.trim(),
          deadline: draft.deadline,
          budget: draft.budget.trim(),
          reference: draft.reference.trim() ? withScheme(draft.reference) : "",
          name: draft.name.trim(),
          email: draft.email.trim(),
          company: draft.company.trim(),
          website: trap.current?.value ?? "",
          t: Math.min(Date.now() - opened.current, 5 * 60 * 60 * 1000),
        }),
      });
      const out = await res.json().catch(() => ({}));
      if (res.ok && out.ok === true) {
        saveDraft(null);
        setStatus("sent");
        return;
      }
      const fields = (out.fields ?? {}) as Errors;
      const keys = (Object.keys(fields) as Field[]).filter((k) => k in FIELD_STEP);
      if (keys.length) {
        setErrors(fields);
        setStep(Math.min(...keys.map((k) => FIELD_STEP[k])));
        focusInvalid();
      }
      setMessage(MESSAGES[out.error] ?? (keys.length ? "Formda eksik ya da hatalı alanlar var." : "Gönderilemedi. Biraz sonra tekrar dene."));
      setStatus("error");
    } catch {
      setMessage("Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.");
      setStatus("error");
    }
  };

  const invalid = (k: Field) => (errors[k] ? true : undefined);
  const chosen = SERVICES.filter((s) => draft.services.includes(s.label));
  const hints = chosen.length ? chosen : [SERVICES[SERVICES.length - 1]];
  const close = useCallback(() => onClose(), [onClose]);

  return createPortal(
    <div className="bf-backdrop" onClick={close}>
      <div className="bf-panel" role="dialog" aria-modal="true" aria-labelledby="bf-title" ref={panel} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="bf-close" onClick={close} aria-label="Kapat" data-cursor="disable">
          <MdClose />
        </button>

        {status === "sent" ? (
          <div className="bf-sent" role="status">
            <h2 id="bf-title" tabIndex={-1} ref={heading}>
              Brief’in ulaştı.
            </h2>
            <p>En kısa sürede e-postayla dönüş yapacağım.</p>
            <button type="button" className="bf-primary" onClick={close} data-cursor="disable">
              Kapat
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate aria-busy={status === "sending"}>
            <p className="bf-kicker">Projeni anlat</p>

            <ol className="bf-steps" style={{ ["--bf-p" as string]: step / 2 }} aria-label="Adımlar">
              {STEPS.map((label, i) => (
                <li key={label} className={i < step ? "is-done" : i === step ? "is-current" : ""}>
                  <button
                    type="button"
                    disabled={i >= step}
                    onClick={() => setStep(i)}
                    aria-current={i === step ? "step" : undefined}
                    data-cursor="disable"
                  >
                    <span className="bf-dot" aria-hidden="true">
                      {i < step ? <MdCheck /> : i + 1}
                    </span>
                    <span className="bf-step-label">{label}</span>
                  </button>
                </li>
              ))}
            </ol>

            <div className="bf-body" key={step}>
              <h2 id="bf-title" tabIndex={-1} ref={heading}>
                {STEPS[step]}
              </h2>

              {step === 0 && (
                <fieldset className="bf-cards" data-invalid={errors.services ? "true" : undefined} aria-describedby={errors.services ? "bf-help-0 bf-err-services" : "bf-help-0"}>
                  <legend className="bf-sr">İşin türü</legend>
                  <p className="bf-help" id="bf-help-0">
                    En az bir tane seç (zorunlu); istediğin kadar seçebilirsin.
                  </p>
                  <div className="bf-card-grid">
                    {SERVICES.map((s) => {
                      const on = draft.services.includes(s.label);
                      return (
                        <label key={s.label} className={`bf-card${on ? " is-on" : ""}${s.label === OPEN_SERVICE ? " is-open" : ""}`}>
                          <input type="checkbox" checked={on} onChange={() => toggle(s.label)} aria-invalid={invalid("services")} data-cursor="disable" />
                          <span className="bf-card-mark" aria-hidden="true">
                            <MdCheck />
                          </span>
                          <span className="bf-card-title">{s.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  {errors.services && (
                    <span className="bf-err" id="bf-err-services" role="alert">
                      {errors.services}
                    </span>
                  )}
                </fieldset>
              )}

              {step === 1 && (
                <>
                  <ul className="bf-hints" id="bf-hints" aria-label="Yönlendirici sorular">
                    {hints.map((s) => (
                      <li key={s.label}>
                        <strong>{s.label}</strong>
                        <span>{s.hint}</span>
                      </li>
                    ))}
                  </ul>
                  <label className="bf-field">
                    <span>
                      Projenin kısa tarifi <em className="bf-req">(zorunlu)</em>
                    </span>
                    <textarea
                      rows={5}
                      maxLength={2000}
                      value={draft.brief}
                      onChange={(e) => set("brief", e.target.value)}
                      aria-invalid={invalid("brief")}
                      aria-describedby={errors.brief ? "bf-hints bf-err-brief" : "bf-hints"}
                      onBlur={() => blur("brief")}
                      required
                    />
                    {errors.brief && (
                      <span className="bf-err" id="bf-err-brief" role="alert">
                        {errors.brief}
                      </span>
                    )}
                  </label>
                  <div className="bf-row">
                    <label className="bf-field">
                      <span>
                        Hedef teslim tarihi <em>(isteğe bağlı)</em>
                      </span>
                      <input type="date" min={today()} value={draft.deadline} onChange={(e) => set("deadline", e.target.value)} aria-invalid={invalid("deadline")} aria-describedby={errors.deadline ? "bf-err-deadline" : undefined} onBlur={() => blur("deadline")} />
                      {errors.deadline && (
                        <span className="bf-err" id="bf-err-deadline" role="alert">
                          {errors.deadline}
                        </span>
                      )}
                    </label>
                    <label className="bf-field">
                      <span>
                        Bütçe aralığı <em>(isteğe bağlı)</em>
                      </span>
                      <input type="text" maxLength={80} value={draft.budget} onChange={(e) => set("budget", e.target.value)} placeholder="Örn. 20.000–40.000 ₺" />
                    </label>
                  </div>
                  <label className="bf-field">
                    <span>
                      Referans bağlantısı <em>(isteğe bağlı)</em>
                    </span>
                    <input
                      type="text"
                      inputMode="url"
                      autoComplete="off"
                      value={draft.reference}
                      onChange={(e) => set("reference", e.target.value)}
                      aria-invalid={invalid("reference")} aria-describedby={errors.reference ? "bf-err-reference" : undefined} onBlur={() => blur("reference")}
                      placeholder="https://"
                    />
                    {errors.reference && (
                      <span className="bf-err" id="bf-err-reference" role="alert">
                        {errors.reference}
                      </span>
                    )}
                  </label>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="bf-row">
                    <label className="bf-field">
                      <span>
                        Ad <em className="bf-req">(zorunlu)</em>
                      </span>
                      <input type="text" autoComplete="name" value={draft.name} onChange={(e) => set("name", e.target.value)} aria-invalid={invalid("name")} aria-describedby={errors.name ? "bf-err-name" : undefined} onBlur={() => blur("name")} required />
                      {errors.name && (
                        <span className="bf-err" id="bf-err-name" role="alert">
                          {errors.name}
                        </span>
                      )}
                    </label>
                    <label className="bf-field">
                      <span>
                        E-posta <em className="bf-req">(zorunlu)</em>
                      </span>
                      <input type="email" autoComplete="email" value={draft.email} onChange={(e) => set("email", e.target.value)} aria-invalid={invalid("email")} aria-describedby={errors.email ? "bf-err-email" : undefined} onBlur={() => blur("email")} required />
                      {errors.email && (
                        <span className="bf-err" id="bf-err-email" role="alert">
                          {errors.email}
                        </span>
                      )}
                    </label>
                  </div>
                  <label className="bf-field">
                    <span>
                      Marka veya şirket <em>(isteğe bağlı)</em>
                    </span>
                    <input type="text" autoComplete="organization" maxLength={100} value={draft.company} onChange={(e) => set("company", e.target.value)} />
                  </label>

                  <div className="bf-summary">
                    <p className="bf-summary-title">Göndermeden önce</p>
                    <dl>
                      <dt>
                        Hizmetler
                        <button type="button" onClick={() => setStep(0)} data-cursor="disable">
                          Düzenle
                        </button>
                      </dt>
                      <dd>
                        <ul className="bf-chips">
                          {chosen.map((s) => (
                            <li key={s.label}>{s.label}</li>
                          ))}
                        </ul>
                      </dd>
                      <dt>
                        Brief
                        <button type="button" onClick={() => setStep(1)} data-cursor="disable">
                          Düzenle
                        </button>
                      </dt>
                      <dd>{shorten(draft.brief, 240)}</dd>
                      {draft.deadline && (
                        <>
                          <dt>Teslim tarihi</dt>
                          <dd>{draft.deadline}</dd>
                        </>
                      )}
                      {draft.budget.trim() && (
                        <>
                          <dt>Bütçe</dt>
                          <dd>{draft.budget.trim()}</dd>
                        </>
                      )}
                      {draft.reference.trim() && (
                        <>
                          <dt>Referans</dt>
                          <dd>{shorten(draft.reference, 80)}</dd>
                        </>
                      )}
                    </dl>
                  </div>
                  {/* Spam trap: invisible to people, tempting to bots. */}
                  <input type="text" ref={trap} name="website" className="bf-trap" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                </>
              )}
            </div>

            <p className={`bf-status${status === "error" ? " is-error" : ""}`} role={status === "error" ? "alert" : "status"}>
              {status === "sending" ? "Gönderiliyor…" : status === "error" ? message : ""}
            </p>

            <div className="bf-actions">
              {step > 0 ? (
                <button type="button" className="bf-secondary" onClick={back} disabled={status === "sending"} data-cursor="disable">
                  <MdArrowBack aria-hidden="true" /> Geri
                </button>
              ) : (
                <span />
              )}
              <button type="submit" className="bf-primary" disabled={status === "sending"} data-cursor="disable">
                {step < 2 ? (
                  <>
                    Devam <MdArrowForward aria-hidden="true" />
                  </>
                ) : status === "sending" ? (
                  "Gönderiliyor…"
                ) : (
                  "Gönder"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};

export default BriefFlow;
