import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";

interface LoadingType {
  isLoading: boolean;
  setIsLoading: (state: boolean) => void;
  setLoading: (percent: number) => void;
}

export const LoadingContext = createContext<LoadingType | null>(null);

export const LoadingProvider = ({ children }: PropsWithChildren) => {
  // The page is usable from the first frame; `loading` only drives the small status note.
  const [isLoading, setIsLoading] = useState(false);
  const [, setLoading] = useState(0);

  const value = {
    isLoading,
    setIsLoading,
    setLoading,
  };
  // Until the 3D character is ready the page shows its readable static view (see index.css).
  useEffect(() => {
    document.documentElement.classList.add("char-pending");
  }, []);

  return (
    <LoadingContext.Provider value={value as LoadingType}>
      <main className="main-body" id="main" tabIndex={-1}>{children}</main>
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
