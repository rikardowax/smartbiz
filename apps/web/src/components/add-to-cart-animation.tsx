"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

interface FlyingItem {
  id: string;
  x: number;
  y: number;
  image: string | null;
  name: string;
}

interface CartAnimationContextValue {
  /** Register the cart icon element so we know where to fly items. */
  cartIconRef: React.RefObject<HTMLElement | null>;
  /** Mobile variant : les deux icônes coexistent dans le DOM, une seule est visible. */
  cartIconMobileRef: React.RefObject<HTMLElement | null>;
  /** Trigger a flying animation from a source element. */
  triggerFly: (sourceEl: HTMLElement, image: string | null, name: string) => void;
}

const CartAnimationContext = createContext<CartAnimationContextValue>({
  cartIconRef: { current: null },
  cartIconMobileRef: { current: null },
  triggerFly: () => {},
});

export function useCartAnimation() {
  return useContext(CartAnimationContext);
}

export function CartAnimationProvider({ children }: { children: React.ReactNode }) {
  const cartIconRef = useRef<HTMLElement | null>(null);
  const cartIconMobileRef = useRef<HTMLElement | null>(null);
  const [items, setItems] = useState<FlyingItem[]>([]);
  const counterRef = useRef(0);

  const triggerFly = useCallback((sourceEl: HTMLElement, image: string | null, name: string) => {
    const rect = sourceEl.getBoundingClientRect();
    const id = `fly-${++counterRef.current}`;
    setItems((prev) => [
      ...prev,
      {
        id,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        image,
        name,
      },
    ]);
    // Remove after animation completes
    setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }, 800);
  }, []);

  return (
    <CartAnimationContext value={{ cartIconRef, cartIconMobileRef, triggerFly }}>
      {children}
      {/* Render flying items */}
      {items.map((item) => (
        <FlyingElement
          key={item.id}
          item={item}
          cartIconRef={cartIconRef}
          cartIconMobileRef={cartIconMobileRef}
        />
      ))}
    </CartAnimationContext>
  );
}

/** Premier élément visible : une icône masquée (display:none) a un rect vide. */
function visibleCartEl(...els: (HTMLElement | null)[]): { x: number; y: number } | null {
  for (const el of els) {
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0) {
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
  }
  return null;
}

function FlyingElement({
  item,
  cartIconRef,
  cartIconMobileRef,
}: {
  item: FlyingItem;
  cartIconRef: React.RefObject<HTMLElement | null>;
  cartIconMobileRef: React.RefObject<HTMLElement | null>;
}) {
  const elRef = useRef<HTMLDivElement>(null);

  // Calculate target position
  const target = visibleCartEl(cartIconRef.current, cartIconMobileRef.current) ?? {
    x: window.innerWidth - 60,
    y: 32,
  };
  const tx = target.x;
  const ty = target.y;

  const dx = tx - item.x;
  const dy = ty - item.y;

  const initials = item.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      ref={elRef}
      className="pointer-events-none fixed z-[9999]"
      style={{
        left: item.x,
        top: item.y,
        transform: "translate(-50%, -50%) scale(1)",
        animation: "fly-to-cart 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
        ["--fly-dx" as string]: `${dx}px`,
        ["--fly-dy" as string]: `${dy}px`,
      }}
    >
      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-primary bg-card shadow-xl">
        {item.image ? (
          // biome-ignore lint/performance/noImgElement: flying animation clone
          <img src={item.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs font-bold text-primary">{initials}</span>
        )}
      </div>
    </div>
  );
}
