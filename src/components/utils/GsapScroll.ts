import * as THREE from "three";
import gsap from "gsap";

// Horizontal extent of the seated character (chair to desk edge) measured from
// the canvas centre, as a fraction of canvas height, at the default camera
// distance (z = 75) used while the "Neler Yapıyorum?" section is shown.
const CHAR_LEFT = 0.132;
const CHAR_RIGHT = 0.471;
const CHAR_CAMERA_Z = 75;
const CHAR_GAP = 20;

/**
 * Works out where the character has to sit (and how far the camera has to pull
 * back) so it fits between the section title on the left and the cards on the
 * right. The character scales with the canvas height while the cards use fixed
 * pixel widths, so on smaller desktop windows the old fixed offset made the
 * character run over the cards.
 */
function getWhatIDoFit() {
  const canvas = document.querySelector(".character-model") as HTMLElement | null;
  const title = document.querySelector(".whatIDO h2");
  const box = document.querySelector(".whatIDO .what-box:last-child") as HTMLElement | null;
  const inner = document.querySelector(".what-box-in") as HTMLElement | null;
  const card = document.querySelector(".what-content") as HTMLElement | null;
  const fallback = { x: "-12%", z: CHAR_CAMERA_Z };
  if (!canvas || !title || !box || !inner || !card) return fallback;

  const range = document.createRange();
  range.selectNodeContents(title);
  const titleRight = range.getBoundingClientRect().right;

  // .what-box-in is display:none until the animation reveals it, so derive its
  // position from the layout: it is centred in the right half, margin included.
  const boxRect = box.getBoundingClientRect();
  // The card group has a fixed CSS width (a single card or the 2x2 grid), which
  // is still readable while it is display:none.
  const groupWidth =
    parseFloat(getComputedStyle(inner).width) ||
    parseFloat(getComputedStyle(card).width);
  const marginLeft = parseFloat(getComputedStyle(inner).marginLeft) || 0;
  const cardsLeft =
    boxRect.left + (boxRect.width - (groupWidth + marginLeft)) / 2 + marginLeft;

  const canvasW = canvas.offsetWidth || window.innerWidth;
  const canvasH = canvas.offsetHeight || window.innerHeight;
  const viewportCenter = window.innerWidth / 2;

  const minX = titleRight + CHAR_GAP;
  const maxX = cardsLeft - CHAR_GAP;
  const fullWidth = (CHAR_LEFT + CHAR_RIGHT) * canvasH;
  const scale = Math.max(0.5, Math.min(1, (maxX - minX) / fullWidth));

  const minCenter = minX + CHAR_LEFT * canvasH * scale;
  const maxCenter = maxX - CHAR_RIGHT * canvasH * scale;
  const preferred = viewportCenter - 0.12 * canvasW;
  const center =
    minCenter > maxCenter
      ? (minCenter + maxCenter) / 2
      : Math.min(maxCenter, Math.max(minCenter, preferred));

  return {
    x: `${(((center - viewportCenter) / canvasW) * 100).toFixed(2)}%`,
    z: CHAR_CAMERA_Z / scale,
  };
}

export function setCharTimeline(
  character: THREE.Object3D<THREE.Object3DEventMap> | null,
  camera: THREE.PerspectiveCamera
) {
  let intensity: number = 0;
  setInterval(() => {
    intensity = Math.random();
  }, 200);
  const tl1 = gsap.timeline({
    scrollTrigger: {
      trigger: ".landing-section",
      start: "top top",
      end: "bottom top",
      scrub: true,
      invalidateOnRefresh: true,
    },
  });
  const tl2 = gsap.timeline({
    scrollTrigger: {
      trigger: ".about-section",
      start: "center 55%",
      end: "bottom top",
      scrub: true,
      invalidateOnRefresh: true,
    },
  });
  const tl3 = gsap.timeline({
    scrollTrigger: {
      trigger: ".whatIDO",
      start: "top top",
      end: "bottom top",
      scrub: true,
      invalidateOnRefresh: true,
    },
  });
  let screenLight: any, monitor: any;
  character?.children.forEach((object: any) => {
    if (object.name === "Plane004") {
      object.children.forEach((child: any) => {
        child.material.transparent = true;
        child.material.opacity = 0;
        if (child.material.name === "Material.018") {
          monitor = child;
          child.material.color.set("#FFFFFF");
        }
      });
    }
    if (object.name === "screenlight") {
      object.material.transparent = true;
      object.material.opacity = 0;
      object.material.emissive.set("#B0F5EA");
      gsap.timeline({ repeat: -1, repeatRefresh: true }).to(object.material, {
        emissiveIntensity: () => intensity * 8,
        duration: () => Math.random() * 0.6,
        delay: () => Math.random() * 0.1,
      });
      screenLight = object;
    }
  });
  let neckBone = character?.getObjectByName("spine005");
  if (window.innerWidth > 1024) {
    if (character) {
      tl1
        .fromTo(character.rotation, { y: 0 }, { y: 0.7, duration: 1 }, 0)
        .to(camera.position, { z: 22 }, 0)
        .fromTo(".character-model", { x: 0 }, { x: "-25%", duration: 1 }, 0)
        .to(".landing-container", { opacity: 0, duration: 0.4 }, 0)
        .to(".landing-container", { y: "40%", duration: 0.8 }, 0)
        .fromTo(".about-me", { y: "-50%" }, { y: "0%" }, 0);

      tl2
        .to(
          camera.position,
          {
            z: () => getWhatIDoFit().z,
            y: 8.4,
            duration: 6,
            delay: 2,
            ease: "power3.inOut",
          },
          0
        )
        .to(".about-section", { y: "30%", duration: 6 }, 0)
        .to(".about-section", { opacity: 0, delay: 3, duration: 2 }, 0)
        .fromTo(
          ".character-model",
          { pointerEvents: "inherit" },
          {
            pointerEvents: "none",
            x: () => getWhatIDoFit().x,
            delay: 2,
            duration: 5,
          },
          0
        )
        .to(character.rotation, { y: 0.92, x: 0.12, delay: 3, duration: 3 }, 0)
        .to(neckBone!.rotation, { x: 0.6, delay: 2, duration: 3 }, 0)
        .to(monitor.material, { opacity: 1, duration: 0.8, delay: 3.2 }, 0)
        .to(screenLight.material, { opacity: 1, duration: 0.8, delay: 4.5 }, 0)
        .fromTo(
          ".what-box-in",
          { display: "none" },
          { display: "flex", duration: 0.1, delay: 6 },
          0
        )
        .fromTo(
          monitor.position,
          { y: -10, z: 2 },
          { y: 0, z: 0, delay: 1.5, duration: 3 },
          0
        )
        .fromTo(
          ".character-rim",
          { opacity: 1, scaleX: 1.4 },
          { opacity: 0, scale: 0, y: "-70%", duration: 5, delay: 2 },
          0.3
        );

      tl3
        .fromTo(
          ".character-model",
          { y: "0%" },
          { y: "-100%", duration: 4, ease: "none", delay: 1 },
          0
        )
        .fromTo(".whatIDO", { y: 0 }, { y: "15%", duration: 2 }, 0)
        .to(character.rotation, { x: -0.04, duration: 2, delay: 1 }, 0);
    }
  } else {
    if (character) {
      const tM2 = gsap.timeline({
        scrollTrigger: {
          trigger: ".what-box-in",
          start: "top 70%",
          end: "bottom top",
        },
      });
      tM2.to(".what-box-in", { display: "flex", duration: 0.1, delay: 0 }, 0);
    }
  }
}

export function setAllTimeline() {
  const careerTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: ".career-section",
      start: "top 30%",
      end: "100% center",
      scrub: true,
      invalidateOnRefresh: true,
    },
  });
  careerTimeline
    .fromTo(
      ".career-timeline",
      { maxHeight: "10%" },
      { maxHeight: "100%", duration: 0.5 },
      0
    )

    .fromTo(
      ".career-timeline",
      { opacity: 0 },
      { opacity: 1, duration: 0.1 },
      0
    )
    .fromTo(
      ".career-info-box",
      { opacity: 0 },
      { opacity: 1, stagger: 0.1, duration: 0.5 },
      0
    )
    .fromTo(
      ".career-dot",
      { animationIterationCount: "infinite" },
      {
        animationIterationCount: "1",
        delay: 0.3,
        duration: 0.1,
      },
      0
    );

  if (window.innerWidth > 1024) {
    careerTimeline.fromTo(
      ".career-section",
      { y: 0 },
      { y: "20%", duration: 0.5, delay: 0.2 },
      0
    );
  } else {
    careerTimeline.fromTo(
      ".career-section",
      { y: 0 },
      { y: 0, duration: 0.5, delay: 0.2 },
      0
    );
  }
}
