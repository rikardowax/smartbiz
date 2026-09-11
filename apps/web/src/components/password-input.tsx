"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function PasswordInput({ className, ...props }: InputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className={cn("pr-10", className)} />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => setShow((s) => !s)}
        className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  );
}
