import { tv } from "tailwind-variants";

export const accordion = tv({
  base: "",
});

export const accordionContent = tv({
  base: [
    "transform-gpu overflow-hidden",
    "data-[state=closed]:animate-accordion-up data-[state=closed]:h-0",
    "data-[state=open]:animate-accordion-down",
  ],
});

export const accordionItem = tv({
  base: "not-last:border-b",
});

/*
  Changed from the Starwind default: dropped `rounded-md`, which fights the zero
  radius the ecosystem contract sets, and dropped `outline-none focus-visible:ring-3
  focus-visible:ring-outline/50 focus-visible:border-outline`. That ring is a
  box-shadow glow; removing it (and the outline-none that suppressed the default)
  lets the contract's own 2px :focus-visible outline in ecosystem.css show through.
*/
export const accordionTrigger = tv({
  base: [
    "flex w-full items-center justify-between gap-4 py-4",
    "hover:text-muted-foreground text-left font-medium transition-all",
    "[&[data-state=open]>svg]:rotate-180",
    "disabled:pointer-events-none disabled:opacity-50",
  ],
});
