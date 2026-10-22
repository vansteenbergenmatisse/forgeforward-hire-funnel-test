"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { TEMPLATE_VARIABLES } from "@/features/messaging";
import type { TemplateDef } from "@/features/projects";
import { Button } from "@/components/ui";
import { controlClass } from "@/components/forms";
import { moveItem, suggestWaVariables, type TemplateErrors } from "../logic/templates";
import { DenseInput } from "./dense";

/** Meta template name, language and the order of variables ({{1}}, {{2}}, ...). */
export function WhatsAppFields({ t, errors, touched, onChange, onTouch }: { t: TemplateDef; errors: TemplateErrors; touched: boolean; onChange: (p: Partial<TemplateDef>) => void; onTouch: () => void }) {
  const order = t.waVariables ?? [];
  const setOrder = (next: string[]) => onChange({ waVariables: next });
  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border border-line p-3.5">
      <legend className="px-1 text-[13px] font-extrabold uppercase tracking-[0.08em] text-muted">WhatsApp template</legend>
      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <DenseInput
          label="Meta template name"
          mono
          value={t.waTemplateName ?? ""}
          error={touched ? errors.waTemplateName : undefined}
          onChange={(e) => onChange({ waTemplateName: e.target.value })}
          onBlur={onTouch}
          hint="Exactly as approved in Meta, like interview_invite."
        />
        <DenseInput label="Language" mono value={t.waLanguage ?? ""} error={touched ? errors.waLanguage : undefined} onChange={(e) => onChange({ waLanguage: e.target.value })} onBlur={onTouch} hint="en, nl" />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-[14px] font-bold">Variable order</p>
        {order.length === 0 && <p className="text-[13px] text-subtle">No variables. The template sends as written.</p>}
        <ol className="flex flex-col gap-1.5">
          {order.map((v, i) => (
            <li key={`${i}-${v}`} className="flex items-center gap-1.5">
              <span className="w-10 shrink-0 font-mono text-[13px] text-muted">{`{{${i + 1}}}`}</span>
              <select
                aria-label={`Variable for slot ${i + 1}`}
                value={v}
                onChange={(e) => setOrder(order.map((x, j) => (j === i ? e.target.value : x)))}
                className={`${controlClass(false)} h-9 flex-1 text-[14px] pointer-coarse:text-base`}
              >
                {TEMPLATE_VARIABLES.map((tv) => (
                  <option key={tv} value={tv}>{`{${tv}}`}</option>
                ))}
              </select>
              <button type="button" aria-label={`Move slot ${i + 1} up`} disabled={i === 0} onClick={() => setOrder(moveItem(order, i, i - 1))} className="grid size-8 place-items-center rounded-md text-muted hover:bg-sand disabled:opacity-30">
                <ArrowUp className="size-4" aria-hidden />
              </button>
              <button type="button" aria-label={`Move slot ${i + 1} down`} disabled={i === order.length - 1} onClick={() => setOrder(moveItem(order, i, i + 1))} className="grid size-8 place-items-center rounded-md text-muted hover:bg-sand disabled:opacity-30">
                <ArrowDown className="size-4" aria-hidden />
              </button>
              <button type="button" aria-label={`Remove slot ${i + 1}`} onClick={() => setOrder(order.filter((_, j) => j !== i))} className="grid size-8 place-items-center rounded-md text-muted hover:bg-sand">
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" icon={<Plus className="size-3.5" />} onClick={() => setOrder([...order, TEMPLATE_VARIABLES[0]])}>
            Add variable
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOrder(suggestWaVariables(t.body))}>
            Use the body order
          </Button>
        </div>
        {touched && errors.waVariables && (
          <p role="alert" className="text-[13.5px] font-semibold text-signal-deep">
            {errors.waVariables}
          </p>
        )}
      </div>
    </fieldset>
  );
}
