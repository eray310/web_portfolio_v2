import { lazy, Suspense } from "react";
import "./App.css";

const CharacterModel = lazy(() => import("./components/Character"));
const MainContainer = lazy(() => import("./components/MainContainer"));
const OrbitPage = lazy(() => import("./components/OrbitPage"));
const AiWorksPage = lazy(() => import("./components/AiWorksPage"));
const LegalPage = lazy(() => import("./components/LegalPage"));
import { LoadingProvider } from "./context/LoadingProvider";
import NoWebGLBoot from "./components/NoWebGLBoot";
import ErrorBoundary from "./components/ErrorBoundary";
import { hasWebGL } from "./utils/webgl";

// The site is a single page plus standalone pages. There is no router: the
// path is read once, and the host rewrites every path to index.html.
const isAboutPage = () => /^\/hakkimda\/?$/i.test(window.location.pathname);
const isAiWorksPage = () => /^\/ai-isler\/?$/i.test(window.location.pathname);

const isCookiePage = () => /^\/cerez-tercihleri\/?$/i.test(window.location.pathname);

const App = () => {
  if (isCookiePage()) {
    return (
      <Suspense>
        <LegalPage />
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
  if (isAboutPage()) {
    return (
      <Suspense>
        <OrbitPage />
      </Suspense>
    );
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
