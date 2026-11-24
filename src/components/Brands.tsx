import { useCallback, useRef, useState } from "react";
import { MdPause, MdPlayArrow } from "react-icons/md";
import { brands, type Brand } from "../data/brands";
import { brandVideos } from "../data/brandVideos";
import { prefersReducedMotion } from "../utils/motion";
import BrandGallery from "./BrandGallery";
import "./styles/Brands.css";

/** Stand-in slots shown on the dev server while the brand list is empty. */
const PREVIEW_SLOTS = Array.from({ length: 6 }, (_, i) => `Logo ${i + 1}`);

const logoUrl = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;

const Brands = () => {
  // A logo that fails to load is dropped instead of showing a broken image.
  const [failed, setFailed] = useState<string[]>([]);
  // The brand whose video window is open, and the logo to give focus back to.
  const [openBrand, setOpenBrand] = useState<Brand | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  // The strip flows by itself, stops on hover and keyboard focus, and has a small play/pause button.
  // With "Hareketi azalt" it stands still and is scrolled by hand instead (finger, drag, keys).
  const reduced = prefersReducedMotion();
  const [paused, setPaused] = useState(false);
  const drag = useRef({ id: -1, x: 0, left: 0, moved: false });
  const close = useCallback(() => {
    setOpenBrand(null);
    opener.current?.focus?.();
  }, []);
  const shown = brands.filter((brand) => !failed.includes(brand.logo));
  const preview = shown.length === 0 && import.meta.env.DEV;
  if (shown.length === 0 && !preview) return null;

  const count = preview ? PREVIEW_SLOTS.length : shown.length;
  // Enough copies that one half of the strip is wider than any screen.
  const copies = Math.max(1, Math.ceil(10 / count));

  const renderSet = (hidden: boolean) => (
    <ul className="brands-set" aria-hidden={hidden || undefined}>
      {Array.from({ length: copies }).flatMap((_, copy) =>
        (preview ? PREVIEW_SLOTS : shown).map((item, i) => {
          const brand = typeof item === "string" ? null : item;
          return (
            <li
              key={`${copy}-${i}`}
              className={`brands-item${copy > 0 ? " brands-repeat" : ""}${
                brand ? "" : " brands-placeholder"
              }${brand?.wide ? " brands-item--wide" : ""}`}
            >
              {brand && !(brandVideos[brand.name]?.length) ? (
                // No videos for this brand yet: the logo stays visible, but opens nothing.
                <span className="brands-open brands-static">
                  <img
                    src={logoUrl(brand.logo)}
                    alt={hidden || copy > 0 ? "" : brand.name}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    onError={() =>
                      setFailed((list) =>
                        list.includes(brand.logo) ? list : [...list, brand.logo]
                      )
                    }
                  />
                </span>
              ) : brand ? (
                <button
                  type="button"
                  className="brands-open"
                  aria-label={`${brand.name} videolarını aç`}
                  tabIndex={hidden || copy > 0 ? -1 : 0}
                  data-cursor="disable"
                  onClick={(e) => {
                    opener.current = e.currentTarget;
                    setOpenBrand(brand);
                  }}
                >
                <img
                  src={logoUrl(brand.logo)}
                  alt={hidden || copy > 0 ? "" : brand.name}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  onError={() =>
                    setFailed((list) =>
                      list.includes(brand.logo) ? list : [...list, brand.logo]
                    )
                  }
                />
                </button>
              ) : (
                <span>{item as string}</span>
              )}
            </li>
          );
        })
      )}
    </ul>
  );

  return (
    <section className="brands-section" aria-labelledby="brands-title">
      <h2 id="brands-title">
        Çalıştığım <span>Markalar</span>
      </h2>
      <div className="brands-stage">
        <div
          className={`brands-marquee${paused ? " is-paused" : ""}`}
          {...(reduced
            ? { role: "region", "aria-label": "Çalıştığım markalar, yatay kaydırılır", tabIndex: 0 }
            : {})}
          onFocusCapture={(e) => {
            // The strip stops on focus (CSS); a logo that is partly out of sight is brought in.
            const t = e.target as HTMLElement;
            const box = e.currentTarget;
            if (t === box) return;
            const r = t.getBoundingClientRect();
            const m = box.getBoundingClientRect();
            if (r.left < m.left + 8) box.scrollLeft -= m.left + 8 - r.left;
            else if (r.right > m.right - 8) box.scrollLeft += r.right - (m.right - 8);
          }}
          onBlurCapture={(e) => {
            // Back to the start of the loop once focus leaves, so the seam stays seamless.
            if (!reduced && !e.currentTarget.contains(e.relatedTarget as Node | null)) e.currentTarget.scrollLeft = 0;
          }}
          onPointerDown={(e) => {
            if (!reduced || e.pointerType !== "mouse" || e.button !== 0) return;
            drag.current = { id: e.pointerId, x: e.clientX, left: e.currentTarget.scrollLeft, moved: false };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (d.id !== e.pointerId) return;
            const dx = e.clientX - d.x;
            if (Math.abs(dx) > 5) d.moved = true;
            if (d.moved) e.currentTarget.scrollLeft = d.left - dx;
          }}
          onPointerUp={(e) => {
            if (drag.current.id === e.pointerId) drag.current.id = -1;
          }}
          onClickCapture={(e) => {
            // A drag that ends over a logo is not a click on it.
            if (drag.current.moved) {
              e.preventDefault();
              e.stopPropagation();
              drag.current.moved = false;
            }
          }}
        >
          <div
            className="brands-track"
            style={{ ["--brands-count" as string]: count * copies }}
          >
            {renderSet(false)}
            {renderSet(true)}
          </div>
        </div>
        {!reduced && (
          <button
            type="button"
            className="brands-toggle"
            aria-pressed={paused}
            aria-label="Marka şeridi akışı"
            title={paused ? "Akışı başlat" : "Akışı durdur"}
            onClick={() => setPaused((p) => !p)}
            data-cursor="disable"
          >
            {paused ? <MdPlayArrow aria-hidden="true" /> : <MdPause aria-hidden="true" />}
          </button>
        )}
      </div>
      {preview && (
        <p className="brands-note">
          Önizleme: logo yok. PNG dosyasını <code>public/brands/</code> içine
          koyup <code>src/data/brands.ts</code> listesine bir satır ekleyin.
        </p>
      )}
      {openBrand && (
        <BrandGallery
          brand={openBrand}
          videos={brandVideos[openBrand.name] ?? []}
          onClose={close}
        />
      )}
    </section>
  );
};

export default Brands;
