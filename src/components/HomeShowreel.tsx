import { useEffect, useRef, useState } from "react";
import { MdPause, MdPlayArrow, MdVolumeOff, MdVolumeUp } from "react-icons/md";
import { prefersReducedMotion } from "../utils/motion";
import "./styles/HomeShowreel.css";

/**
 * 01 Showreel, right under the character. The same vertical film as on /ai-isler (that page keeps its own use of it).
 * Silent loop while it is in view; it stops off screen. It starts on a dark, strong frame (the helmet), not on a white
 * screen. With "Hareketi azalt" nothing plays until the visitor presses Play. Play / pause and sound are plain buttons.
 */
const base = import.meta.env.BASE_URL;
const SRC = `${base}ai-works/showreel/ai-isler-showreel.mp4`;
const POSTER = `${base}ai-works/showreel/ana-sayfa-poster.jpg`;
/** Where the first play starts (seconds): the dark helmet shot. */
const START = 3.4;

const HomeShowreel = () => {
  const vid = useRef<HTMLVideoElement>(null);
  const reduced = useRef(prefersReducedMotion()).current;
  const chosen = useRef(reduced);
  const started = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  const play = () => {
    const v = vid.current;
    if (!v) return;
    if (!started.current) {
      started.current = true;
      try {
        v.currentTime = START;
      } catch {
        /* metadata not there yet: it starts at the beginning */
      }
    }
    void v.play().catch(() => {});
  };

  useEffect(() => {
    const v = vid.current;
    if (!v || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) v.pause();
        else if (!chosen.current) play();
      },
      { threshold: 0.4 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const toggle = () => {
    const v = vid.current;
    if (!v) return;
    chosen.current = true;
    if (v.paused) play();
    else v.pause();
  };
  const toggleSound = () => {
    const v = vid.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted && v.paused) {
      chosen.current = true;
      play();
    }
  };

  return (
    <section className="home-reel section-container" id="showreel" aria-labelledby="home-reel-h">
      <div className="home-reel-text">
        <p className="home-no">01</p>
        <h2 id="home-reel-h">Showreel</h2>
        <p className="home-reel-lead">Hareket, kurgu ve yapay zekâ destekli işlerden bir seçki.</p>
        <div className="home-reel-ctl">
          <button type="button" onClick={toggle} aria-pressed={playing} data-cursor="disable">
            {playing ? <MdPause aria-hidden="true" /> : <MdPlayArrow aria-hidden="true" />}
            <span>{playing ? "Durdur" : "Oynat"}</span>
          </button>
          <button type="button" onClick={toggleSound} aria-pressed={!muted} data-cursor="disable">
            {muted ? <MdVolumeOff aria-hidden="true" /> : <MdVolumeUp aria-hidden="true" />}
            <span>{muted ? "Sesi aç" : "Sesi kapat"}</span>
          </button>
        </div>
      </div>
      <div className="home-reel-frame">
        <video
          ref={vid}
          src={SRC}
          poster={POSTER}
          muted
          loop
          playsInline
          preload="metadata"
          aria-label="Showreel: hareket, kurgu ve yapay zekâ destekli işlerden bir seçki"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
      </div>
    </section>
  );
};

export default HomeShowreel;
