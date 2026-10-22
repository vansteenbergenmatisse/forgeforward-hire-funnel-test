"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui";
import { Field, RadioCard, Select, TextInput } from "@/components/forms";
import type { ProjectRecord } from "../types";
import type { CreateProjectInput } from "../store";
import { ModalDialog } from "./modal-dialog";

type Props = {
  open: boolean;
  projects: ProjectRecord[];
  onClose: () => void;
  onCreate: (input: CreateProjectInput) => void | Promise<void>;
  returnFocusRef: React.RefObject<HTMLElement | null>;
};

const MODES = [
  { value: "blank", label: "Blank", hint: "Default stages and the fixed fields only." },
  { value: "duplicate", label: "Duplicate", hint: "Copies questions, video settings, task, stages, templates and thank-you text." },
] as const;

export function NewProjectDialog(props: Props) {
  // Remount the form on every open so it always starts clean.
  return (
    <ModalDialog open={props.open} onClose={props.onClose} title="New project" titleId="new-project-title" returnFocusRef={props.returnFocusRef}>
      <NewProjectForm {...props} />
    </ModalDialog>
  );
}

function NewProjectForm({ projects, onClose, onCreate }: Props) {
  const uid = useId();
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"blank" | "duplicate">("blank");
  const [source, setSource] = useState(projects[0]?.def.slug ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Give the project a name.");
      return;
    }
    setBusy(true);
    try {
      await onCreate({ name: name.trim(), mode, sourceSlug: mode === "duplicate" ? source : undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the project.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-4">
      <Field label="Role name" htmlFor={`${uid}-name`} error={error}>
        <TextInput
          id={`${uid}-name`}
          data-autofocus
          value={name}
          error={Boolean(error)}
          placeholder="Sales Rep"
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          className="h-11! rounded-[9px]! text-sm!"
        />
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Start from</legend>
        {MODES.map((m) => (
          <div key={m.value}>
            <RadioCard name={`${uid}-mode`} value={m.value} label={m.label} checked={mode === m.value} onChange={() => setMode(m.value)} />
            <p className="ml-1 mt-1 text-[13px] text-muted">{m.hint}</p>
          </div>
        ))}
      </fieldset>
      {mode === "duplicate" && (
        <Field label="Copy from" htmlFor={`${uid}-src`}>
          <Select id={`${uid}-src`} value={source} onChange={(e) => setSource(e.target.value)} className="h-11! rounded-[9px]! text-sm!">
            {projects.map((p) => (
              <option key={p.def.slug} value={p.def.slug}>
                {p.def.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <div className="mt-2 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={busy}>
          Create project
        </Button>
      </div>
    </form>
  );
}
