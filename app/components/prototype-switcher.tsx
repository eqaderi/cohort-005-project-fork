// PROTOTYPE: throwaway floating variant switcher. Not for production.
import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function PrototypeSwitcher({
  variants,
}: {
  variants: { key: string; name: string }[];
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const current = searchParams.get("variant") ?? variants[0].key;
  const index = Math.max(
    0,
    variants.findIndex((v) => v.key === current)
  );

  function go(delta: number) {
    const next = variants[(index + delta + variants.length) % variants.length];
    const params = new URLSearchParams(searchParams);
    params.set("variant", next.key);
    setSearchParams(params, { replace: true, preventScrollReset: true });
  }

  // Keep the chosen variant sticky across normal sidebar navigation.
  useEffect(() => {
    const fromUrl = searchParams.get("variant");
    if (fromUrl) {
      sessionStorage.setItem("prototype-variant", fromUrl);
    } else {
      const stored = sessionStorage.getItem("prototype-variant");
      if (stored) {
        const params = new URLSearchParams(searchParams);
        params.set("variant", stored);
        setSearchParams(params, { replace: true, preventScrollReset: true });
      }
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      )
        return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-full bg-fuchsia-600 px-2 py-1.5 text-sm font-medium text-white shadow-xl ring-2 ring-white">
      <button
        onClick={() => go(-1)}
        className="rounded-full p-1 hover:bg-white/20"
      >
        <ChevronLeft className="size-4" />
      </button>
      <span className="px-1">
        {variants[index].key} ({variants[index].name})
      </span>
      <button
        onClick={() => go(1)}
        className="rounded-full p-1 hover:bg-white/20"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
