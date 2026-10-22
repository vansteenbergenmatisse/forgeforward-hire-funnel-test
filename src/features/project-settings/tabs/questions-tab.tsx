"use client";

import { useState } from "react";
import { Archive, Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui";
import type { QuestionDef } from "@/features/projects";
import { moveById } from "../logic/reorder";
import { FIXED_FIELDS, blankQuestion, normalizeQuestion, setArchived, type QuestionErrors } from "../logic/questions";
import type { SettingsApi } from "../use-settings";
import { Card, TwoColumn } from "../ui/card";
import { QuestionForm } from "../ui/question-form";
import { ArchivedRow, QuestionRow } from "../ui/question-row";
import { SortableList } from "../ui/sortable-list";

type Editing = { kind: "edit"; id: string } | { kind: "new"; id: string } | null;

export function QuestionsTab({ api }: { api: SettingsApi }) {
  const { questions } = api.data;
  const active = questions.filter((q) => !q.archived);
  const archived = questions.filter((q) => q.archived);
  const [editing, setEditing] = useState<Editing>(active[0] ? { kind: "edit", id: active[0].id } : null);
  const [newDraft, setNewDraft] = useState<{ q: QuestionDef; errors: QuestionErrors } | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const editedQuestion = editing?.kind === "edit" ? questions.find((q) => q.id === editing.id && !q.archived) : undefined;

  function startNew() {
    const q = blankQuestion(crypto.randomUUID());
    setNewDraft({ q, errors: { label: "x" } });
    setSubmitted(false);
    setEditing({ kind: "new", id: q.id });
  }

  function addNew() {
    if (!newDraft) return;
    if (Object.keys(newDraft.errors).length) return setSubmitted(true);
    const q = normalizeQuestion(newDraft.q);
    api.update((d) => ({ ...d, questions: [...d.questions, q] }));
    setEditing({ kind: "edit", id: q.id });
    setNewDraft(null);
  }

  function archive(id: string) {
    api.update((d) => ({ ...d, questions: setArchived(d.questions, id, true) }));
    setEditing(null);
  }

  return (
    <TwoColumn
      sideWidth="420px"
      main={
        <>
          <Card title="Fixed fields" description="Every project has these. They cannot be changed." id="fixed">
            <ul className="flex flex-col gap-1.5" aria-label="Fixed fields">
              {FIXED_FIELDS.map((f) => (
                <li key={f.label} className="flex items-center justify-between rounded-lg bg-sand px-3.5 py-2 text-[14.5px]">
                  <span className="flex items-center gap-2.5 font-semibold">
                    <Lock className="size-4 text-subtle" aria-hidden />
                    {f.label}
                  </span>
                  <span className="text-muted">{f.kind}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card
            title="Your questions"
            id="questions"
            description="Drag to reorder. Delete always archives, so old answers keep their label."
            actions={
              <Button variant="secondary" className="shrink-0 whitespace-nowrap" icon={<Plus className="size-4" />} onClick={startNew}>
                Add question
              </Button>
            }
          >
            {active.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line-strong p-5 text-center text-[15px] text-muted">No questions yet. Applicants only fill in the fixed fields. Add one when you need more.</p>
            ) : (
              <SortableList ids={active.map((q) => q.id)} label="Your questions" className="flex flex-col gap-1.5" onMove={(a, o) => api.update((d) => ({ ...d, questions: moveById(d.questions, a, o) }))}>
                {active.map((q) => (
                  <QuestionRow key={q.id} q={q} selected={editing?.kind === "edit" && editing.id === q.id} onSelect={() => setEditing({ kind: "edit", id: q.id })} />
                ))}
              </SortableList>
            )}
            {archived.length > 0 && (
              <div className="mt-5">
                <h3 className="mb-2 font-sans text-[13px] normal-case tracking-normal text-muted">Archived</h3>
                <ul className="flex flex-col gap-1.5" aria-label="Archived questions">
                  {archived.map((q) => (
                    <ArchivedRow key={q.id} q={q} onRestore={() => api.update((d) => ({ ...d, questions: setArchived(d.questions, q.id, false) }))} />
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </>
      }
      side={
        <Card title={editing?.kind === "new" ? "New question" : "Edit question"} id="editor">
          {editing?.kind === "new" && newDraft ? (
            <QuestionForm
              key={newDraft.q.id}
              initial={newDraft.q}
              forceErrors={submitted}
              onDraft={(q, errors) => setNewDraft({ q, errors })}
              footer={
                <div className="flex gap-2">
                  <Button variant="dark" onClick={addNew}>
                    Save question
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setNewDraft(null);
                      setEditing(active[0] ? { kind: "edit", id: active[0].id } : null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              }
            />
          ) : editedQuestion ? (
            <QuestionForm
              key={editedQuestion.id}
              initial={editedQuestion}
              onDraft={(q, errors) => {
                if (Object.keys(errors).length) return;
                api.update((d) => ({ ...d, questions: d.questions.map((x) => (x.id === q.id ? { ...normalizeQuestion(q), archived: x.archived } : x)) }));
              }}
              footer={
                <Button variant="danger" icon={<Archive className="size-4" />} onClick={() => archive(editedQuestion.id)} className="self-start">
                  Archive question
                </Button>
              }
            />
          ) : (
            <p className="text-[15px] leading-snug text-muted">Pick a question on the left to edit it, or add a new one.</p>
          )}
        </Card>
      }
    />
  );
}
