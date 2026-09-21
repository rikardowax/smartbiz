"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui/slot";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative overflow-hidden inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.96]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-accent",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        accent: "bg-accent text-accent-foreground shadow-sm hover:bg-accent/90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Désactive l'onde au clic (utile pour les boutons purement textuels). */
  noRipple?: boolean;
}

/**
 * Injecte une onde circulaire au point cliqué. Le nœud est créé et retiré en
 * DOM direct : pas de state, donc aucun rendu React supplémentaire au clic.
 */
function spawnRipple(host: HTMLElement, clientX: number, clientY: number) {
  const rect = host.getBoundingClientRect();
  const diameter = Math.max(rect.width, rect.height) * 2.2;
  const ripple = document.createElement("span");
  ripple.className = "btn-ripple";
  ripple.style.width = `${diameter}px`;
  ripple.style.height = `${diameter}px`;
  ripple.style.left = `${clientX - rect.left - diameter / 2}px`;
  ripple.style.top = `${clientY - rect.top - diameter / 2}px`;
  host.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, noRipple = false, onPointerDown, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
      onPointerDown?.(event);
      if (noRipple || variant === "link") return;
      spawnRipple(event.currentTarget, event.clientX, event.clientY);
    };

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref as React.Ref<HTMLButtonElement>}
        onPointerDown={handlePointerDown}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
