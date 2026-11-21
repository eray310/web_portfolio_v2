import { useEffect, useRef } from "react";
import "./styles/WhatIDo.css";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type Service = {
  title: string;
  subtitle: string;
  text: string;
  tools?: string[];
};

const services: Service[] = [
  {
    title: "MOTION & KURGU",
    subtitle: "Hareketli Grafik ve Video Kurgu",
    text: "Markanın mesajını güçlü bir görsel anlatıya dönüştürüyorum. Animasyon, ritim ve kurguyu bir araya getirerek reklam filmleri ve sosyal medya videoları hazırlıyorum.",
    tools: ["After Effects", "Premiere Pro", "CapCut"],
  },
  {
    title: "GRAFİK TASARIM",
    subtitle: "Kampanya ve Dijital Tasarım",
    text: "Markanın kimliğini yansıtan kampanya görselleri, sosyal medya tasarımları ve dijital reklam materyalleri hazırlıyorum. Fikri, farklı mecralarda tutarlı bir görsel dile dönüştürüyorum.",
    tools: ["Photoshop", "Illustrator", "InDesign"],
  },
  {
    title: "ART DIRECTION",
    subtitle: "Yaratıcı Konsept ve Görsel Yön",
    text: "Markanın hedeflerine uygun yaratıcı konseptler geliştiriyor; renk, tipografi ve kompozisyon kararlarını bütünlüklü bir görsel dilde buluşturuyorum. Kampanyaların görsel yönünü fikirden uygulamaya şekillendiriyorum.",
  },
  {
    title: "AI ARTIST",
    subtitle: "Yapay Zekâ Destekli Görsel ve Film",
    text: "Yapay zekâ destekli kısa filmler, reklam videoları ve özgün görsel projeler üretiyorum. Konsept geliştirme, sahne tasarımı ve video üretimini kurgu ve motion tasarımla tamamlıyorum.",
  },
];

// Two columns of two cards: a 2x2 grid on wide desktops, one stack elsewhere.
const columns = [services.slice(0, 2), services.slice(2)];

const WhatIDo = () => {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Touch screens have no hover: a tap opens a card (and closes the others).
    if (!ScrollTrigger.isTouch || !rootRef.current) return;
    const cards = Array.from(
      rootRef.current.querySelectorAll<HTMLElement>(".what-content")
    );
    // Keep the exact handler references so the cleanup really removes them.
    const listeners = cards.map((card) => {
      const onClick = () => toggleCard(card, cards);
      card.classList.remove("what-noTouch");
      card.addEventListener("click", onClick);
      return [card, onClick] as const;
    });
    return () => {
      listeners.forEach(([card, onClick]) =>
        card.removeEventListener("click", onClick)
      );
    };
  }, []);

  return (
    <div className="whatIDO" ref={rootRef}>
      <div className="what-box">
        <h2 className="what-title">
          Neler
          <div>
            <span className="hat-h2">Yapıyorum</span>
            <span className="do-h2">?</span>
          </div>
        </h2>
      </div>
      <div className="what-box">
        <div className="what-box-in">
          {columns.map((cards, col) => (
            <div className="what-col" key={col}>
              <div className="what-border2">
                <svg width="100%" height="100%">
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="100%"
                    stroke="white"
                    strokeWidth="2"
                    strokeDasharray="7,7"
                  />
                  <line
                    x1="100%"
                    y1="0"
                    x2="100%"
                    y2="100%"
                    stroke="white"
                    strokeWidth="2"
                    strokeDasharray="7,7"
                  />
                </svg>
              </div>
              {cards.map((service) => (
                <div className="what-content what-noTouch" key={service.title}>
                  <div className="what-border1">
                    <svg width="100%" height="100%">
                      <line
                        className="what-line-top"
                        x1="0"
                        y1="0"
                        x2="100%"
                        y2="0"
                        stroke="white"
                        strokeWidth="2"
                        strokeDasharray="6,6"
                      />
                      <line
                        x1="0"
                        y1="100%"
                        x2="100%"
                        y2="100%"
                        stroke="white"
                        strokeWidth="2"
                        strokeDasharray="6,6"
                      />
                    </svg>
                  </div>
                  <div className="what-corner"></div>
                  <div className="what-content-in">
                    <h3>{service.title}</h3>
                    <h4>{service.subtitle}</h4>
                    <div className="what-desc">
                      <div className="what-desc-in">
                        <p>{service.text}</p>
                        {service.tools && (
                          <>
                            <h5>Beceriler ve araçlar</h5>
                            <div className="what-content-flex">
                              {service.tools.map((tool) => (
                                <div className="what-tags" key={tool}>
                                  {tool}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="what-arrow"></div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WhatIDo;

function toggleCard(card: HTMLElement, cards: HTMLElement[]) {
  const wasOpen = card.classList.contains("what-content-active");
  cards.forEach((c) => c.classList.remove("what-content-active"));
  if (!wasOpen) card.classList.add("what-content-active");
}
