import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import setCharacter from "./utils/character";
import setLighting from "./utils/lighting";
import { useLoading } from "../../context/LoadingProvider";
import handleResize from "./utils/resizeUtils";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { clearCharTimeline } from "../utils/GsapScroll";
import {
  handleMouseMove,
  handleTouchEnd,
  handleHeadRotation,
  handleTouchMove,
} from "./utils/mouseUtils";
import setAnimations from "./utils/animationUtils";
import { setProgress } from "../Loading";
import { startWithout3D } from "../NoWebGLBoot";
import { prefersReducedMotion } from "../../utils/motion";

const Scene = () => {
  const canvasDiv = useRef<HTMLDivElement | null>(null);
  const hoverDivRef = useRef<HTMLDivElement>(null);
  const { setLoading } = useLoading();

  const [, setChar] = useState<THREE.Object3D | null>(null);
  useEffect(() => {
    if (canvasDiv.current) {
      let rect = canvasDiv.current.getBoundingClientRect();
      let container = { width: rect.width, height: rect.height };
      const aspect = container.width / container.height;
      // A fresh scene for every start: effects can run twice (React strict mode),
      // and a shared scene would end up holding two characters.
      const scene = new THREE.Scene();
      let cancelled = false;

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
        });
      } catch (error) {
        // No usable WebGL: carry on with the page without the 3D character.
        console.error("Could not create WebGL context:", error);
        startWithout3D(setLoading, undefined, "webgl");
        return;
      }
      renderer.setSize(container.width, container.height);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1;
      canvasDiv.current.appendChild(renderer.domElement);

      const camera = new THREE.PerspectiveCamera(14.5, aspect, 0.1, 1000);
      camera.position.z = 10;
      camera.position.set(0, 13.1, 24.7);
      camera.zoom = 1.1;
      camera.updateProjectionMatrix();

      let onResize: (() => void) | null = null;
      let characterObj: THREE.Object3D | null = null;
      let headBone: THREE.Object3D | null = null;
      let screenLight: any | null = null;
      let mixer: THREE.AnimationMixer;

      const clock = new THREE.Clock();
      const still = prefersReducedMotion();

      const light = setLighting(scene);
      let progress = setProgress((value) => setLoading(value));
      const { loadCharacter } = setCharacter(
        renderer,
        scene,
        camera,
        () => cancelled
      );

      loadCharacter()
        .then((gltf) => {
        if (gltf && !cancelled) {
          const animations = setAnimations(gltf);
          hoverDivRef.current && animations.hover(gltf, hoverDivRef.current);
          mixer = animations.mixer;
          let character = gltf.scene;
          setChar(character);
          characterObj = character;
          scene.add(character);
          headBone = character.getObjectByName("spine006") || null;
          screenLight = character.getObjectByName("screenlight") || null;
          // Lit and played from the first visible frame: the character is revealed only when its
          // lights and reflections are in, so it never shows as a black silhouette. Until then it
          // stays hidden in its (fixed-size) place; the heading and menu do not wait for it.
          Promise.race([light.envReady, new Promise((r) => window.setTimeout(r, 6000))]).then(() => {
            if (cancelled) return;
            light.turnOnLights(true);
            if (!still) animations.startIntro();
            progress.clear();
            renderer.render(scene, camera);
            window.requestAnimationFrame(() => canvasDiv.current?.classList.add("char-lit"));
          });
          onResize = () => handleResize(renderer, camera, canvasDiv, character);
          window.addEventListener("resize", onResize);
        }
        })
        .catch((error) => {
          if (cancelled) return;
          // Model could not be loaded: keep the page usable without it.
          console.error("3D character could not be loaded:", error);
          startWithout3D(setLoading, progress);
        });

      // The canvas is sized once at start-up, but its box can change without a
      // window resize: the scrollbar appears when the loading screen closes, the
      // fonts settle, the page is zoomed. Follow the box so the scene stays centred.
      let resizeTimer: number | undefined;
      const box = canvasDiv.current;
      const watcher =
        typeof ResizeObserver !== "undefined"
          ? new ResizeObserver(() => {
              window.clearTimeout(resizeTimer);
              resizeTimer = window.setTimeout(() => {
                const r = box.getBoundingClientRect();
                const w = parseFloat(renderer.domElement.style.width) || 0;
                const h = parseFloat(renderer.domElement.style.height) || 0;
                if (
                  r.width > 0 &&
                  (Math.abs(r.width - w) > 0.5 || Math.abs(r.height - h) > 0.5) &&
                  characterObj
                ) {
                  handleResize(renderer, camera, canvasDiv, characterObj);
                }
              }, 150);
            })
          : null;
      watcher?.observe(box);

      let mouse = { x: 0, y: 0 },
        interpolation = { x: 0.1, y: 0.2 };

      const onMouseMove = (event: MouseEvent) => {
        handleMouseMove(event, (x, y) => (mouse = { x, y }));
      };
      let debounce: number | undefined;
      const onTouchStart = (event: TouchEvent) => {
        const element = event.target as HTMLElement;
        debounce = setTimeout(() => {
          element?.addEventListener("touchmove", (e: TouchEvent) =>
            handleTouchMove(e, (x, y) => (mouse = { x, y }))
          );
        }, 200);
      };

      const onTouchEnd = () => {
        handleTouchEnd((x, y, interpolationX, interpolationY) => {
          mouse = { x, y };
          interpolation = { x: interpolationX, y: interpolationY };
        });
      };

      if (!still) document.addEventListener("mousemove", onMouseMove);
      const landingDiv = document.getElementById("landingDiv");
      if (landingDiv && !still) {
        landingDiv.addEventListener("touchstart", onTouchStart);
        landingDiv.addEventListener("touchend", onTouchEnd);
      }
      let raf = 0;
      const animate = () => {
        raf = requestAnimationFrame(animate);
        if (headBone) {
          handleHeadRotation(
            headBone,
            mouse.x,
            mouse.y,
            interpolation.x,
            interpolation.y,
            THREE.MathUtils.lerp
          );
          light.setPointLight(screenLight);
        }
        const delta = clock.getDelta();
        if (mixer) {
          mixer.update(delta);
        }
        renderer.render(scene, camera);
      };
      animate();
      return () => {
        cancelled = true;
        cancelAnimationFrame(raf);
        clearTimeout(debounce);
        window.clearTimeout(resizeTimer);
        watcher?.disconnect();
        progress.stop();
        if (onResize) window.removeEventListener("resize", onResize);
        document.removeEventListener("mousemove", onMouseMove);
        if (landingDiv) {
          landingDiv.removeEventListener("touchstart", onTouchStart);
          landingDiv.removeEventListener("touchend", onTouchEnd);
        }
        if (characterObj) {
          // The scroll animations of this character must not outlive it.
          const keep = ScrollTrigger.getById("work");
          ScrollTrigger.getAll().forEach((t) => t !== keep && t.kill(true));
          clearCharTimeline();
        }
        mixer?.stopAllAction();
        scene.clear();
        renderer.dispose();
        renderer.forceContextLoss();
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      };
    }
  }, []);

  return (
    <>
      <div className="character-container">
        <div className="character-model" ref={canvasDiv}>
          <div className="character-rim"></div>
          <div className="character-hover" ref={hoverDivRef}></div>
        </div>
      </div>
    </>
  );
};

export default Scene;
