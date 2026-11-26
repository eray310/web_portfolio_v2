import { useRef, useState } from "react";
import "./styles/VideoReview.css";

/**
 * A small strip before the contact: a free look at the first seconds of a video. Two fields only (a link and an
 * e-mail; no phone). It posts to the same endpoint as the brief (/api/idea), marked as kind "video-degerlendirme".
 * Success and errors are announced (aria-live).
 */
type State = { s: "idle" | "sending" | "ok" | "error"; msg?: string; fields?: Record<string, string> };

const VideoReview = () => {
  const [state, setState] = useState<State>({ s: "idle" });
  const opened = useRef(Date.now());
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState({ s: "sending" });
    try {
      const r = await fetch("/api/idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "video-degerlendirme", link: f.get("link"), email: f.get("email"), website: f.get("website"), t: Date.now() - opened.current }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) {
        setState({ s: "ok", msg: "Aldım. İlk bakışımı birkaç gün içinde e-postana yazacağım." });
        e.currentTarget?.reset?.();
      } else if (j.error === "validation") setState({ s: "error", msg: "Bağlantıyı ve e-postayı kontrol et.", fields: j.fields });
      else setState({ s: "error", msg: "Şu an gönderilemedi. Biraz sonra tekrar dene ya da omerogluuerayy@gmail.com adresine yaz." });
    } catch {
      setState({ s: "error", msg: "Bağlantı kurulamadı. Biraz sonra tekrar dene." });
    }
  };
  const err = state.fields ?? {};
  return (
    <section className="vreview section-container" id="video-degerlendirme" aria-labelledby="vreview-h">
      <div className="vreview-text">
        <h2 id="vreview-h">Videon ilk 3 saniyede durduruyor mu? Ücretsiz bakayım.</h2>
        <p>Reklam videonun ya da sosyal medya hesabının linkini bırak; ilk 3 saniyesine, ritmine, marka tutarlılığına ve yapay zekâyla neler yapılabileceğine bakıp kısa bir not göndereyim. Bağlayıcı değil, satış görüşmesi değil.</p>
        <ul className="vreview-tags" aria-label="Bakacağım yerler">
          <li>İlk 3 saniye</li>
          <li>Ritim ve kurgu</li>
          <li>Marka tutarlılığı</li>
          <li>Yapay zekâ fırsatları</li>
        </ul>
      </div>
      <form className="vreview-form" onSubmit={submit} noValidate>
        <label>
          <span>Video ya da hesap linki</span>
          <input name="link" type="url" inputMode="url" required placeholder="https://" aria-invalid={!!err.link || undefined} aria-describedby={err.link ? "vr-link-err" : undefined} />
          {err.link && (
            <small id="vr-link-err" className="vreview-err">
              {err.link}
            </small>
          )}
        </label>
        <label>
          <span>E-posta</span>
          <input name="email" type="email" autoComplete="email" required aria-invalid={!!err.email || undefined} aria-describedby={err.email ? "vr-mail-err" : undefined} />
          {err.email && (
            <small id="vr-mail-err" className="vreview-err">
              {err.email}
            </small>
          )}
        </label>
        <input className="vreview-hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <p className="vreview-legal">
          Bağlantın ve e-postan yalnızca bu değerlendirmeyi gönderebilmek için kullanılır. Ayrıntılar:{" "}
          <a href="/kvkk" target="_blank" rel="noopener noreferrer">
            Aydınlatma metni
          </a>
        </p>
        <button type="submit" disabled={state.s === "sending"} data-cursor="disable">
          {state.s === "sending" ? "Gönderiliyor…" : "Değerlendirme iste"}
        </button>
        <p className={`vreview-status is-${state.s}`} role="status" aria-live="polite">
          {state.msg ?? ""}
        </p>
      </form>
    </section>
  );
};

export default VideoReview;
