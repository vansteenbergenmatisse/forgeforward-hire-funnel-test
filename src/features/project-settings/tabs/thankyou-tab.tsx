"use client";

import { useState, type Ref } from "react";
import { THANK_YOU_MAX, countText } from "../logic/limits";
import { THANK_YOU_VARIABLES, renderThankYou, splitThankYou, validateThankYou } from "../logic/thank-you";
import type { SettingsApi } from "../use-settings";
import { Card, TwoColumn } from "../ui/card";
import { DenseTextArea } from "../ui/dense";
import { PhoneFrame } from "../ui/phone-frame";
import { VariableChips, useCursorInsert } from "../ui/variable-chips";

export function ThankYouTab({ api }: { api: SettingsApi }) {
  const { thankYouText, replyDays } = api.data.project;
  const [touched, setTouched] = useState(false);
  const set = (text: string) => {
    setTouched(true);
    api.update((d) => ({ ...d, project: { ...d.project, thankYouText: text } }));
  };
  const { ref, insert } = useCursorInsert(() => thankYouText, set);
  const error = touched ? validateThankYou(thankYouText) : null;
  const { heading, body } = splitThankYou(renderThankYou(thankYouText, "Sam", replyDays));

  return (
    <TwoColumn
      sideWidth="420px"
      main={
        <Card title="Thank-you page" id="thanks">
          <div className="flex flex-col gap-3">
            <DenseTextArea
              ref={ref as Ref<HTMLTextAreaElement>}
              label="Text"
              rows={5}
              value={thankYouText}
              maxLength={THANK_YOU_MAX}
              error={error ?? undefined}
              onChange={(e) => set(e.target.value)}
              onBlur={() => setTouched(true)}
              hint={`Variables: ${THANK_YOU_VARIABLES.map((v) => `{${v}}`).join(", ")}. {reply_days} comes from General. ${countText(thankYouText, THANK_YOU_MAX)}.`}
            />
            <VariableChips variables={THANK_YOU_VARIABLES} onInsert={insert} />
          </div>
        </Card>
      }
      side={
        <Card title="Preview" id="thanks-preview">
          <PhoneFrame label="Thank-you page preview">
            <p className="font-display text-[28px] leading-none">{heading || "Thank you"}</p>
            {body && <p className="mt-3 text-[15px] leading-snug text-muted">{body}</p>}
          </PhoneFrame>
          <p className="mt-3 text-center text-[13px] text-subtle">Sample applicant: Sam. Reply within {replyDays} days.</p>
        </Card>
      }
    />
  );
}
