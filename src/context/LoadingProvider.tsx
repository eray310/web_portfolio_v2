import Loading from "../components/Loading";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

interface LoadingType {
  isLoading: boolean;
  setIsLoading: (state: boolean) => void;
  setLoading: (percent: number) => void;
}

export const LoadingContext = createContext<LoadingType | null>(null);

export const LoadingProvider = ({ children }: PropsWithChildren) => {
  // The full-screen opening (Loading) covers the page until the 3D scene is ready.
  const [isLoading, setIsLoading] = useState(true);
  const [loading, setLoading] = useState(0);
  const mainRef = useRef<HTMLElement>(null);

  const value = {
    isLoading,
    setIsLoading,
    setLoading,
  };
  // Until the 3D character is ready the page shows its readable static view (see index.css).
  useEffect(() => {
    document.documentElement.classList.add("char-pending");
  }, []);
  // Behind the opening screen nothing can be reached with the keyboard or a screen reader.
  useLayoutEffect(() => {
    mainRef.current?.toggleAttribute("inert", isLoading);
  }, [isLoading]);

  return (
    <LoadingContext.Provider value={value as LoadingType}>
      {isLoading && <Loading percent={loading} />}
      <main className="main-body" id="main" tabIndex={-1} ref={mainRef}>
        {children}
      </main>
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
};
