import * as THREE from "three";
import { useRef, useMemo, useState, useEffect, useLayoutEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { EffectComposer, N8AO } from "@react-three/postprocessing";
import {
  BallCollider,
  Physics,
  RigidBody,
  CylinderCollider,
  RapierRigidBody,
} from "@react-three/rapier";
import { ballTools, tools } from "../data/tools";

// No icon files exist for these tools, so each ball gets a text label drawn on a canvas.

function drawLabel(canvas: HTMLCanvasElement, name: string, color: string) {
  const ctx = canvas.getContext("2d")!;
  const { width, height } = canvas;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 76px system-ui, \"Segoe UI\", Roboto, Arial, sans-serif";
  const words = name.split(" ");
  // The sphere wraps the texture around once, so the label is drawn twice
  // to stay readable from either side.
  [width * 0.25, width * 0.75].forEach((x) => {
    words.forEach((word, i) => {
      const y = height / 2 + (i - (words.length - 1) / 2) * 90;
      ctx.fillText(word, x, y, width * 0.4);
    });
  });
}

const textures = ballTools.map(({ name, color }) => {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  drawLabel(canvas, name, color);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  // Redraw once the fonts are ready so the labels use the system font.
  document.fonts?.ready.then(() => {
    drawLabel(canvas, name, color);
    texture.needsUpdate = true;
  });
  return texture;
});

const sphereGeometry = new THREE.SphereGeometry(1, 28, 28);

const spheres = [...Array(30)].map(() => ({
  scale: [0.7, 1, 0.8, 1, 1][Math.floor(Math.random() * 5)],
}));

/**
 * Finger state shared with the physics scene. Touch is handled with plain
 * touch events on the section (reliable on iOS Safari) instead of R3F pointer
 * events: a touch counts as a push only if it starts a tap or a sideways drag;
 * a mostly vertical drag is left to the browser to scroll the page.
 */
type TouchState = {
  active: boolean;
  mode: "idle" | "pending" | "drag" | "scroll";
  /** Normalised device coordinates of the finger inside the section. */
  x: number;
  y: number;
  /** Set when a finger lands so its speed is measured from its first position. */
  justPressed: boolean;
  /** Finger position in scene units and its speed (units per second). */
  wx: number;
  wy: number;
  vx: number;
  vy: number;
  /** A tap: every ball close to it gets a short shove. */
  poke: { id: number; x: number; y: number } | null;
};

const newTouchState = (): TouchState => ({
  active: false,
  mode: "idle",
  x: 0,
  y: 0,
  justPressed: false,
  wx: 0,
  wy: 0,
  vx: 0,
  vy: 0,
  poke: null,
});

// ?touchdebug: also publish the ball positions (window.__techBalls) for checks.
const DEBUG_TOUCH =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("touchdebug");

const IS_COARSE =
  typeof window !== "undefined" &&
  !!window.matchMedia &&
  window.matchMedia("(pointer: coarse)").matches;

type SphereProps = {
  vec?: THREE.Vector3;
  scale: number;
  r?: typeof THREE.MathUtils.randFloatSpread;
  material: THREE.MeshPhysicalMaterial;
  isActive: boolean;
  touch: React.MutableRefObject<TouchState>;
  index: number;
};

function SphereGeo({
  vec = new THREE.Vector3(),
  scale,
  r = THREE.MathUtils.randFloatSpread,
  material,
  isActive,
  touch,
  index,
}: SphereProps) {
  const api = useRef<RapierRigidBody | null>(null);
  const lastPoke = useRef(0);

  useFrame(({ viewport }, delta) => {
    if (!isActive || !api.current) return;
    delta = Math.min(0.1, delta);

    // A tap shoves the balls around the touched point away from it.
    const poke = touch.current.poke;
    if (poke && poke.id !== lastPoke.current) {
      lastPoke.current = poke.id;
      const pos = api.current.translation();
      const dx = pos.x - (poke.x * viewport.width) / 2;
      const dy = pos.y - (poke.y * viewport.height) / 2;
      const dist = Math.hypot(dx, dy) + 0.001;
      const reach = 6;
      if (dist < reach) {
        const strength = (1 - dist / reach) * 32;
        api.current.applyImpulse(
          { x: (dx / dist) * strength, y: (dy / dist) * strength, z: 0 },
          true
        );
      }
    }

    // A sideways drag carries the balls near the finger along with it. This is
    // an impulse (never a teleporting collider), so it cannot make them burst.
    const t = touch.current;
    if (t.active && t.mode === "drag") {
      const pos = api.current.translation();
      const dist = Math.hypot(pos.x - t.wx, pos.y - t.wy);
      const reach = 5.5;
      if (dist < reach) {
        const k = 14 * delta * (1 - dist / reach) * scale;
        const clamp = (v: number) => Math.max(-9, Math.min(9, v));
        api.current.applyImpulse(
          { x: clamp(t.vx * k), y: clamp(t.vy * k), z: 0 },
          true
        );
      }
    }

    const impulse = vec
      .copy(api.current.translation())
      .normalize()
      .multiply(
        new THREE.Vector3(
          -50 * delta * scale,
          -150 * delta * scale,
          -50 * delta * scale
        )
      );

    api.current?.applyImpulse(impulse, true);

    if (DEBUG_TOUCH) {
      const p = api.current.translation();
      const w = window as unknown as { __techBalls?: number[][] };
      (w.__techBalls ??= [])[index] = [p.x, p.y];
    }
  });

  return (
    <RigidBody
      linearDamping={0.75}
      angularDamping={0.15}
      friction={0.2}
      position={[r(20), r(20) - 25, r(20) - 10]}
      ref={api}
      colliders={false}
    >
      <BallCollider args={[scale]} />
      <CylinderCollider
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0, 1.2 * scale]}
        args={[0.15 * scale, 0.275 * scale]}
      />
      <mesh
        castShadow
        receiveShadow
        scale={scale}
        geometry={sphereGeometry}
        material={material}
        rotation={[0.3, 1, 1]}
      />
    </RigidBody>
  );
}

type PointerProps = {
  vec?: THREE.Vector3;
  isActive: boolean;
  touch: React.MutableRefObject<TouchState>;
};

// Where the pointer ball waits when nothing is touching the scene.
const PARKED = new THREE.Vector3(100, 100, 100);

function Pointer({ vec = new THREE.Vector3(), isActive, touch }: PointerProps) {
  const ref = useRef<RapierRigidBody>(null);

  useFrame(({ pointer, viewport }, delta) => {
    if (!isActive) return;
    const t = touch.current;

    // Where the finger is in the scene and how fast it moves (used by the balls).
    if (t.active && t.mode !== "scroll") {
      const fx = (t.x * viewport.width) / 2;
      const fy = (t.y * viewport.height) / 2;
      if (t.justPressed) {
        t.wx = fx;
        t.wy = fy;
        t.vx = 0;
        t.vy = 0;
        t.justPressed = false;
      } else {
        const dt = Math.max(delta, 1 / 120);
        t.vx = (fx - t.wx) / dt;
        t.vy = (fy - t.wy) / dt;
        t.wx = fx;
        t.wy = fy;
      }
    } else {
      t.vx = 0;
      t.vy = 0;
    }

    if (IS_COARSE) {
      // Touch screens never move the pointer ball (a ball appearing under a
      // finger would shove the others violently); it just waits far away.
      vec.copy(PARKED);
    } else {
      // Mouse: glide after the cursor.
      vec.lerp(
        new THREE.Vector3(
          (pointer.x * viewport.width) / 2,
          (pointer.y * viewport.height) / 2,
          0
        ),
        0.2
      );
    }
    ref.current?.setNextKinematicTranslation(vec);
  });

  return (
    <RigidBody
      position={[100, 100, 100]}
      type="kinematicPosition"
      colliders={false}
      ref={ref}
    >
      <BallCollider args={[2]} />
    </RigidBody>
  );
}

// Width (in scene units) the ball cluster needs, and the visible width at the
// default camera distance of 20 for a 32.5° field of view with aspect 1.
const CLUSTER_WIDTH = 13;
const VISIBLE_HEIGHT_AT_20 = 2 * 20 * Math.tan((32.5 / 2) * (Math.PI / 180));

/** Pulls the camera back on narrow (portrait) canvases so the cluster fits. */
function FitCamera() {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  useLayoutEffect(() => {
    const aspect = size.width / size.height;
    const factor = Math.max(1, CLUSTER_WIDTH / (VISIBLE_HEIGHT_AT_20 * aspect));
    camera.position.z = 20 * factor;
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

const TechStack = () => {
  const [isActive, setIsActive] = useState(false);
  const touch = useRef<TouchState>(newTouchState());
  const sectionRef = useRef<HTMLDivElement>(null);

  // Finger handling on the whole section (see TouchState).
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    // ?touchdebug shows a small readout of the touch events that reach the scene.
    const debug = new URLSearchParams(window.location.search).has("touchdebug");
    let overlay: HTMLDivElement | null = null;
    let events = 0;
    let pokes = 0;
    if (debug) {
      overlay = document.createElement("div");
      overlay.style.cssText =
        "position:fixed;left:8px;bottom:8px;z-index:100001;padding:6px 8px;" +
        "background:rgba(0,0,0,.75);color:#5eead4;font:11px/1.4 monospace;" +
        "pointer-events:none;border-radius:6px;max-width:90vw";
      document.body.appendChild(overlay);
    }
    const report = (label: string) => {
      if (!overlay) return;
      const t = touch.current;
      overlay.textContent =
        label + " | mode=" + t.mode + " x=" + t.x.toFixed(2) + " y=" + t.y.toFixed(2) +
        " | touch events=" + events + " pokes=" + pokes;
    };
    if (debug) report("ready");

    let startX = 0;
    let startY = 0;
    let pokeId = 0;
    const place = (point: Touch) => {
      const r = el.getBoundingClientRect();
      touch.current.x = ((point.clientX - r.left) / r.width) * 2 - 1;
      touch.current.y = -(((point.clientY - r.top) / r.height) * 2 - 1);
    };
    const onStart = (e: TouchEvent) => {
      events++;
      const p = e.touches[0];
      startX = p.clientX;
      startY = p.clientY;
      place(p);
      touch.current.active = true;
      touch.current.mode = "pending";
      touch.current.justPressed = true;
      report("start");
    };
    const onMove = (e: TouchEvent) => {
      events++;
      const t = touch.current;
      if (!t.active) return;
      const p = e.touches[0];
      place(p);
      if (t.mode === "pending") {
        const dx = p.clientX - startX;
        const dy = p.clientY - startY;
        if (Math.hypot(dx, dy) > 8) {
          // Sideways (or diagonal) moves push the balls, vertical ones scroll.
          t.mode = Math.abs(dx) >= Math.abs(dy) * 0.8 ? "drag" : "scroll";
        }
      }
      report("move");
    };
    const onEnd = () => {
      events++;
      const t = touch.current;
      if (t.mode === "pending") {
        // Short touch with hardly any movement: a tap.
        t.poke = { id: ++pokeId, x: t.x, y: t.y };
        pokes++;
      }
      t.active = false;
      t.mode = "idle";
      report("end");
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
      overlay?.remove();
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const threshold = document
        .getElementById("work")!
        .getBoundingClientRect().top;
      setIsActive(scrollY > threshold);
    };
    document.querySelectorAll(".header a").forEach((elem) => {
      const element = elem as HTMLAnchorElement;
      element.addEventListener("click", () => {
        const interval = setInterval(() => {
          handleScroll();
        }, 10);
        setTimeout(() => {
          clearInterval(interval);
        }, 1000);
      });
    });
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);
  const materials = useMemo(() => {
    return textures.map(
      (texture) =>
        new THREE.MeshPhysicalMaterial({
          map: texture,
          emissive: "#ffffff",
          emissiveMap: texture,
          emissiveIntensity: 0.3,
          metalness: 0.5,
          roughness: 1,
          clearcoat: 0.1,
        })
    );
  }, []);

  return (
    <div className="techstack" ref={sectionRef}>
      <h2>Kullandığım Araçlar</h2>
      {/* The balls are a picture; the same names as a plain list for screen readers. */}
      <ul className="sr-only" aria-label="Kullandığım araçlar">
        {tools.map((tool) => (
          <li key={tool.name}>{tool.name}</li>
        ))}
      </ul>

      <Canvas
        shadows
        gl={{ alpha: true, stencil: false, depth: false, antialias: false }}
        camera={{ position: [0, 0, 20], fov: 32.5, near: 1, far: 100 }}
        dpr={[1, 1.75]}
        onCreated={(state) => (state.gl.toneMappingExposure = 1.5)}
        className="tech-canvas"
        aria-hidden="true"
      >
        <FitCamera />
        <ambientLight intensity={1} />
        <spotLight
          position={[20, 20, 25]}
          penumbra={1}
          angle={0.2}
          color="white"
          castShadow
          shadow-mapSize={[512, 512]}
        />
        <directionalLight position={[0, 5, -4]} intensity={2} />
        <Physics gravity={[0, 0, 0]}>
          <Pointer isActive={isActive} touch={touch} />
          {spheres.map((props, i) => (
            <SphereGeo
              key={i}
              {...props}
              material={materials[Math.floor(Math.random() * materials.length)]}
              isActive={isActive}
              touch={touch}
              index={i}
            />
          ))}
        </Physics>
        <Environment
          files={`${import.meta.env.BASE_URL}models/char_enviorment.hdr`}
          environmentIntensity={0.5}
          environmentRotation={[0, 4, 2]}
        />
        <EffectComposer enableNormalPass={false}>
          <N8AO color="#0f002c" aoRadius={2} intensity={1.15} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

export default TechStack;
