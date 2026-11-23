import { lazy, Suspense } from "react";
import "./App.css";

const CharacterModel = lazy(() => import("./components/Character"));
const MainContainer = lazy(() => import("./components/MainContainer"));
const AboutPage = lazy(() => import("./components/AboutPage"));
import { LoadingProvider } from "./context/LoadingProvider";
import NoWebGLBoot from "./components/NoWebGLBoot";
import ErrorBoundary from "./components/ErrorBoundary";
import { hasWebGL } from "./utils/webgl";

// The site is a single page plus one standalone page. There is no router: the
// path is read once, and the host rewrites every path to index.html.
const isAboutPage = () => /^\/hakkimda\/?$/i.test(window.location.pathname);

const App = () => {
  if (isAboutPage()) {
    return (
      <Suspense>
        <AboutPage />
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
