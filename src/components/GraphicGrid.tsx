import { graphics } from "../data/graphics";

/** Image-only cards for the works without video (the "Grafik Tasarım" filter of Seçili İşler). */
const pub = (p: string) => `${import.meta.env.BASE_URL}${p}`;

const GraphicGrid = () => (
  <ul className="graphic-grid" aria-label="Grafik tasarım işleri">
    {graphics.map((g) => (
      <li key={g.file}>
        <figure>
          <picture>
            <source srcSet={pub(`${g.file}.webp`)} type="image/webp" />
            <img src={pub(`${g.file}.jpg`)} alt={`${g.title}: ${g.label.toLowerCase()}`} width={g.w} height={g.h} loading="lazy" decoding="async" />
          </picture>
          <figcaption>
            <span className="graphic-title">{g.title}</span>
            <span className="graphic-label">{g.label}</span>
          </figcaption>
        </figure>
      </li>
    ))}
  </ul>
);

export default GraphicGrid;
