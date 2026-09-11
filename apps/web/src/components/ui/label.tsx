import * as React from "react";
import { cn } from "@/lib/utils";

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, required, ...props }, ref) => (
    // biome-ignore lint/a11y/noLabelWithoutControl: generic label component, consumers provide htmlFor
    <label
      ref={ref}
      className={cn("mb-1.5 block text-sm font-medium leading-none text-foreground", className)}
      {...props}
    >
      {children}
      {required && (
        <span aria-hidden="true" className="ml-0.5 text-destructive">
          *
        </span>
      )}
    </label>
  ),
);
Label.displayName = "Label";

export { Label };
