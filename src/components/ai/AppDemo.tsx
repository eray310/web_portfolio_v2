import { useEffect, useRef, useState } from "react";
import { MdCheck } from "react-icons/md";
import { useCalmView } from "../../utils/viewMode";
import type { AiStage } from "../../data/aiWorks";
import { useActive } from "./useActive";
import "../styles/AiApp.css";

/**
 * Uygulama Prototipleri: a concept demo of an appointment app, one story from start to end
 * ("Konsept prototip": a design studio's meeting booking; nothing here is a real service or booking).
 *
 *  1 choose a service, 2 it is selected (the card shows its short summary), 3 "Devam", 4 choose a day and then
 *  a time, 5 "Devam", 6 the summary shows service, day and time together, 7 "Onayla", a short processing state,
 *  then the success view, which rests for a few seconds before the demo starts over softly (about 17 s).
 *
 * It plays by itself, only while it is on screen and the tab is visible. Everything inside the phone is a
 * picture: no focus, no clicks. With "Sakin görünüm" (the Görünüm menu) or "Hareketi azalt" it shows the completed
 * screen and nothing runs.
 */
const SERVICES = [
  { n: "Web Sitesi Görüşmesi", d: "Sayfa yapısı ve içerik fikri" },
  { n: "Video Projesi Görüşmesi", d: "Konsept, görseller ve kurgu fikri" },
  { n: "Uygulama Fikri Görüşmesi", d: "Akış ve ekran fikri" },
];
const DAYS = [
  { d: "Pzt", n: "24" },
  { d: "Sal", n: "25" },
  { d: "Çar", n: "26" },
  { d: "Per", n: "27" },
];
const TIMES = ["10:00", "11:30", "14:00", "15:30"];
const PICK = { service: 1, day: 2, time: 2 };

// How long each step lasts (ms); the sum is the length of one round
const STEPS = [
  1500, // 0  services shown
  800, //  1  the second card is about to be chosen
  1100, // 2  chosen: it shows its summary
  500, //  3  "Devam" pressed
  700, //  4  slide to the day and time screen
  900, //  5  days shown
  900, //  6  a day chosen
  1000, // 7  a time chosen
  500, //  8  "Devam" pressed
  800, //  9  slide to the summary
  1700, // 10 summary read
  500, //  11 "Onayla" pressed
  1300, // 12 processing
  4200, // 13 success, rests
  700, //  14 fades out
];
const DONE = 13;
const FLOW = ["Hizmet", "Gün ve saat", "Özet", "Onay"];

type AppStageData = Extract<AiStage, { kind: "app" }>;

const AppDemo = ({ s }: { s: AppStageData }) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useCalmView();
  const active = useActive(ref, 0.35);
  const [step, setStep] = useState(reduced ? DONE : 0);

  useEffect(() => {
    if (reduced) setStep(DONE);
  }, [reduced]);
  useEffect(() => {
    if (reduced || !active) return;
    const t = window.setTimeout(() => setStep((n) => (n + 1 >= STEPS.length ? 0 : n + 1)), STEPS[step]);
    return () => window.clearTimeout(t);
  }, [step, active, reduced]);

  const screen = step < 4 ? 0 : step < 9 ? 1 : 2;
  const service = step >= 2 && step !== 14 ? PICK.service : -1;
  const aim = step === 1 ? PICK.service : -1;
  const day = step >= 6 ? PICK.day : -1;
  const time = step >= 7 ? PICK.time : -1;
  const processing = step === 12;
  const success = step >= 13;
  const press = step === 3 || step === 8 || step === 11;
  const ready = [service >= 0, day >= 0 && time >= 0, true, true][screen];
  const flowState = (i: number) => (success ? "done" : i < screen ? "done" : i === screen ? "now" : "todo");
  const flowText = [service >= 0 ? SERVICES[service].n : "Seçilmedi", day >= 0 ? `${DAYS[day].d} ${DAYS[day].n}${time >= 0 ? ` · ${TIMES[time]}` : ""}` : "Seçilmedi", "Seçimlerin toplu görünümü", success ? "Örnek randevu onaylandı" : "Onay bekliyor"];

  return (
    <figure className="st-fig ap-fig">
      <div ref={ref} className={`ap-app${step === 14 ? " is-reset" : ""}${reduced ? " is-still" : ""}`} data-screen={screen} data-step={step} aria-hidden="true">
        <span className="ap-concept">Konsept prototip</span>
        <div className="ap-phone">
          <div className="ap-head">
            <b>Görüşme randevusu</b>
            <span className="ap-dots">
              {[0, 1, 2].map((i) => (
                <i key={i} className={success || i < screen ? "is-done" : i === screen ? "is-now" : ""} />
              ))}
            </span>
          </div>
          <div className="ap-body">
            <div className="ap-track" style={{ transform: `translateX(${(-screen * 100) / 3}%)` }}>
              <div className="ap-screen">
                <p className="ap-q">Hangi konuda görüşelim?</p>
                {SERVICES.map((o, i) => (
                  <div key={o.n} className={`ap-card${service === i ? " is-on" : ""}${aim === i ? " is-aim" : ""}`}>
                    <span className="ap-radio">{service === i && <MdCheck />}</span>
                    <span>
                      <strong>{o.n}</strong>
                      <small>{o.d}</small>
                    </span>
                  </div>
                ))}
              </div>
              <div className="ap-screen">
                <p className="ap-q">Bir gün ve saat seç</p>
                <div className="ap-days">
                  {DAYS.map((d, i) => (
                    <span key={d.d} className={day === i ? "is-on" : ""}>
                      <small>{d.d}</small>
                      <b>{d.n}</b>
                    </span>
                  ))}
                </div>
                <div className={`ap-times${day >= 0 ? " is-open" : ""}`}>
                  {TIMES.map((t, i) => (
                    <span key={t} className={time === i ? "is-on" : ""}>
                      {t}
                    </span>
                  ))}
                </div>
                <p className="ap-note">Gösterilen gün ve saatler örnektir.</p>
              </div>
              <div className="ap-screen">
                <p className="ap-q">Özet</p>
                <dl className="ap-sum">
                  <div>
                    <dt>Konu</dt>
                    <dd>{SERVICES[PICK.service].n}</dd>
                    <MdCheck />
                  </div>
                  <div>
                    <dt>Gün</dt>
                    <dd>
                      {DAYS[PICK.day].d} {DAYS[PICK.day].n}
                    </dd>
                    <MdCheck />
                  </div>
                  <div>
                    <dt>Saat</dt>
                    <dd>{TIMES[PICK.time]}</dd>
                    <MdCheck />
                  </div>
                </dl>
                <p className="ap-note">Örnek akış: gerçek bir randevu oluşturulmaz.</p>
              </div>
            </div>
            <div className={`ap-over${processing ? " is-proc" : ""}${success ? " is-ok" : ""}`}>
              <span className="ap-spin" />
              <span className="ap-okc">
                <MdCheck />
              </span>
              <b>{success ? "Randevu onaylandı" : "Hazırlanıyor"}</b>
              <small>{success ? `${SERVICES[PICK.service].n}, ${DAYS[PICK.day].d} ${DAYS[PICK.day].n}, ${TIMES[PICK.time]}` : ""}</small>
              <small className="ap-ex">{success ? "Örnek akış" : ""}</small>
            </div>
          </div>
          <div className={`ap-foot${ready ? " is-ready" : ""}${press ? " is-press" : ""}${success ? " is-done" : ""}`}>
            <span>{screen === 2 ? "Onayla" : "Devam"}</span>
          </div>
        </div>
        <ol className="ap-flow">
          {FLOW.map((f, i) => (
            <li key={f} className={`is-${flowState(i)}`}>
              <span className="ap-fn">{flowState(i) === "done" ? <MdCheck /> : i + 1}</span>
              <span>
                <b>{f}</b>
                <small>{flowText[i]}</small>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <figcaption>
        <span className="ai-sr">{s.summary}</span>
        {s.caption}
      </figcaption>
    </figure>
  );
};

export default AppDemo;
