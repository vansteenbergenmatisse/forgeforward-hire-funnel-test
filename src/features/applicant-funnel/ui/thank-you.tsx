import { Check } from "lucide-react";
import { StepBody } from "@/components/funnel";
import { splitThankYou } from "../lib/thank-you";

/** A8. No buttons. */
export function ThankYou({ text, firstName, replyDays }: { text: string; firstName: string; replyDays: number }) {
  const { heading, body } = splitThankYou(text, { firstName, replyDays });
  return (
    <StepBody>
      <div className="flex flex-col items-center pt-[70px] text-center md:pt-2.5">
        <div className="grid size-[84px] place-items-center rounded-full bg-ok-tint text-ok md:size-24">
          <Check className="size-10 md:size-[46px]" strokeWidth={2} aria-hidden />
        </div>
        <h1 className="mt-[22px] text-[40px] leading-[0.98] md:text-[52px]">{heading}</h1>
        {body && <p className="mt-3.5 text-base leading-normal text-muted md:text-[17px]">{body}</p>}
      </div>
    </StepBody>
  );
}
