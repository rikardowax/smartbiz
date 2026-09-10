import * as React from "react";
import { cn } from "@/lib/utils";

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    // biome-ignore lint/a11y/noLabelWithoutControl: generic label component, consumers provide htmlFor
    <label
      ref={ref}
      className={cn("mb-1.5 block text-sm font-medium leading-none text-foreground", className)}
      {...props}
    />
  ),
);
Label.displayName = "Label";

export { Label };
