import HoverLinks from "./HoverLinks";
import "./styles/Navbar.css";

/**
 * The site's header and main menu: Seçili İşler / AI İşler / Hakkımda / Zihnim / İletişim.
 * One component for the home page (`home`: the section links scroll inside the page, see Navbar.tsx) and for the
 * standalone pages (the section links go to the home page). `active` marks the page the visitor is on.
 */
const SiteHeader = ({ home = false, active }: { home?: boolean; active?: "hakkimda" }) => {
  const section = (id: string) => (home ? { "data-href": `#${id}`, href: `#${id}` } : { href: `/#${id}` });
  return (
    <header className="header">
      <a href="/#" className="navbar-title" data-cursor="disable">
        EÖ
      </a>
      <a href="https://www.behance.net/erayomeroglu" className="navbar-connect" data-cursor="disable" target="_blank" rel="noreferrer">
        behance.net/erayomeroglu
      </a>
      <nav aria-label="Ana menü">
        <ul>
          <li>
            <a {...section("work")}>
              <HoverLinks text="SEÇİLİ İŞLER" />
            </a>
          </li>
          <li>
            <a href="/ai-isler">
              <HoverLinks text="AI İŞLER" />
            </a>
          </li>
          <li>
            {home ? (
              <a data-href="#about" href="#about">
                <HoverLinks text="HAKKIMDA" />
              </a>
            ) : (
              <a href="/hakkimda" aria-current={active === "hakkimda" ? "page" : undefined}>
                <HoverLinks text="HAKKIMDA" />
              </a>
            )}
          </li>
          <li>
            <a href="/zihnim">
              <HoverLinks text="ZİHNİM" />
            </a>
          </li>
          <li>
            <a {...section("contact")}>
              <HoverLinks text="İLETİŞİM" />
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default SiteHeader;
