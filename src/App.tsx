import { lazy, Suspense } from "react";
import "./App.css";

const CharacterModel = lazy(() => import("./components/Character"));
const MainContainer = lazy(() => import("./components/MainContainer"));
import { LoadingProvider } from "./context/LoadingProvider";
import NoWebGLBoot from "./components/NoWebGLBoot";
import ErrorBoundary from "./components/ErrorBoundary";
import { hasWebGL } from "./utils/webgl";

const App = () => {
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
