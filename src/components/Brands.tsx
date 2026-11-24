import { useCallback, useRef, useState } from "react";
import { MdPause, MdPlayArrow } from "react-icons/md";
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
  // The visitor can stop the strip (it also stops by itself on hover and keyboard focus).
  const [paused, setPaused] = useState(false);
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
      <div className="brands-head">
        <h2 id="brands-title">
          Çalıştığım <span>Markalar</span>
        </h2>
        <button
          type="button"
          className="brands-pause"
          aria-pressed={paused}
          onClick={() => setPaused((p) => !p)}
          data-cursor="disable"
        >
          {paused ? <MdPlayArrow aria-hidden="true" /> : <MdPause aria-hidden="true" />}
          {paused ? "Şeridi oynat" : "Şeridi durdur"}
        </button>
      </div>
      <div className={`brands-marquee${paused ? " is-paused" : ""}`}>
        <div
          className="brands-track"
          style={{ ["--brands-count" as string]: count * copies }}
        >
          {renderSet(false)}
          {renderSet(true)}
        </div>
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
