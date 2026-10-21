import { Button, type ButtonProps } from "@/components/ui";
import { cn } from "@/shared/cn";

/** The one main button of a funnel screen: 56px tall, full width. */
export function MainButton({ className, ...rest }: ButtonProps) {
  return <Button size="lg" className={cn("h-14 text-[17px] font-extrabold", className)} {...rest} />;
}
