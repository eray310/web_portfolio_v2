import { useCallback, useRef, useState } from "react";
import { brands, type Brand } from "../data/brands";
import { brandVideos } from "../data/brandVideos";
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
  // The strip does not move by itself: it is scrolled by hand (finger, trackpad, wheel, drag, keyboard).
  const drag = useRef({ id: -1, x: 0, left: 0, moved: false });
  const close = useCallback(() => {
    setOpenBrand(null);
    opener.current?.focus?.();
  }, []);
  const shown = brands.filter((brand) => !failed.includes(brand.logo));
  const preview = shown.length === 0 && import.meta.env.DEV;
  if (shown.length === 0 && !preview) return null;

  const copies = 1;

  const renderSet = (hidden: boolean) => (
    <ul className="brands-set" aria-label="Markalar">
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
      <div
        className="brands-marquee"
        role="region"
        aria-label="Çalıştığım markalar, yatay kaydırılır"
        tabIndex={0}
        onFocusCapture={(e) => {
          // A logo that gets the keyboard focus is brought into view.
          const t = e.target as HTMLElement;
          if (t !== e.currentTarget) t.scrollIntoView?.({ inline: "center", block: "nearest" });
        }}
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse" || e.button !== 0) return;
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
        onPointerCancel={() => {
          drag.current.id = -1;
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
        <div className="brands-track">{renderSet(false)}</div>
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
