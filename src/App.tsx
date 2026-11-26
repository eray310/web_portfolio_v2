import { lazy, Suspense } from "react";
import "./App.css";

const CharacterModel = lazy(() => import("./components/Character"));
const MainContainer = lazy(() => import("./components/MainContainer"));
const OrbitPage = lazy(() => import("./components/OrbitPage"));
const AlbumPage = lazy(() => import("./components/album/AlbumPage"));
const AiWorksPage = lazy(() => import("./components/AiWorksPage"));
const HakkimdaParticles = lazy(() => import("./components/particles/HakkimdaParticles"));
const LegalPage = lazy(() => import("./components/LegalPage"));
// "Eray'ın Zihni": a separate design preview at /zihnim (its own chunk, loaded only there)
const ZihnimPage = lazy(() => import("./components/zihnim/ZihnimPage"));
import { LoadingProvider } from "./context/LoadingProvider";
import NoWebGLBoot from "./components/NoWebGLBoot";
import ErrorBoundary from "./components/ErrorBoundary";
import { hasWebGL } from "./utils/webgl";

// The site is a single page plus standalone pages. There is no router: the
// path is read once, and the host rewrites every path to index.html.
const isAboutPage = () => /^\/hakkimda\/?$/i.test(window.location.pathname);
// Prototype of the particle story (not the live design): /hakkimda?prototip=parcacik and /ai-isler?prototip=parcacik
const isParticlePrototype = () => new URLSearchParams(window.location.search).get("prototip") === "parcacik";
const isAiWorksPage = () => /^\/ai-isler\/?$/i.test(window.location.pathname);

const isZihnimPage = () => /^\/zihnim\/?$/i.test(window.location.pathname);

const legalPage = () => /^\/(kvkk|gizlilik|cerez-tercihleri)\/?$/i.exec(window.location.pathname)?.[1].toLowerCase() as "kvkk" | "gizlilik" | "cerez-tercihleri" | undefined;

const App = () => {
  const legal = legalPage();
  if (legal) {
    return (
      <Suspense>
        <LegalPage doc={legal} />
      </Suspense>
    );
  }
  if (isZihnimPage()) {
    return (
      <Suspense>
        <ZihnimPage />
      </Suspense>
    );
  }
  if (isAiWorksPage()) {
    return (
      <Suspense>
        <AiWorksPage />
      </Suspense>
    );
  }
  if (isAboutPage() && isParticlePrototype()) {
    return (
      <Suspense>
        <HakkimdaParticles />
      </Suspense>
    );
  }
  if (isAboutPage()) {
    // the earlier page is kept (file and address /hakkimda?eski) for comparison; it is not linked from anywhere
    const old = new URLSearchParams(window.location.search).has("eski");
    return <Suspense>{old ? <OrbitPage /> : <AlbumPage />}</Suspense>;
  }
  const webgl = hasWebGL();
  return (
    <>
      <LoadingProvider>
        <Suspense>
          <MainContainer>
            {webgl ? (
              <ErrorBoundary fallback={<NoWebGLBoot />}>
                <Suspense>
                  <CharacterModel />
                </Suspense>
              </ErrorBoundary>
            ) : (
              <NoWebGLBoot cause="webgl" />
            )}
          </MainContainer>
        </Suspense>
      </LoadingProvider>
    </>
  );
};

export default App;
