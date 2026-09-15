import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
} as const;

/**
 * Cinq étoiles avec remplissage partiel : la dernière étoile utile est coupée
 * au pourcentage exact plutôt qu'arrondie, pour rester fidèle à la moyenne.
 */
export function RatingStars({
  rating,
  size = "sm",
  className,
}: {
  rating: number;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(5, rating));
  const iconClass = SIZES[size];

  return (
    <div className={cn("flex items-center gap-0.5", className)} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((index) => {
        const fill = Math.max(0, Math.min(1, clamped - index));
        return (
          <span key={index} className={cn("relative shrink-0", iconClass)}>
            <Star className={cn(iconClass, "absolute inset-0 text-muted-foreground/35")} />
            {fill > 0 && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star className={cn(iconClass, "fill-warning text-warning")} />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
