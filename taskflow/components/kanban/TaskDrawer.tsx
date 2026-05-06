"use client";

import { useEffect, useState, useTransition } from "react";
import type { Priority } from "@prisma/client";
import { updateTask } from "@/lib/actions/tasks";
import type { KanbanTask } from "@/types/kanban";

const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const PRIORITY_SELECTED: Record<Priority, string> = {
  LOW: "bg-zinc-100 text-zinc-700 ring-zinc-300",
  MEDIUM: "bg-sky-100 text-sky-700 ring-sky-300",
  HIGH: "bg-amber-100 text-amber-800 ring-amber-300",
  URGENT: "bg-red-100 text-red-700 ring-red-300",
};

export type TaskPatch = {
  title?: string;
  description?: string | null;
  priority?: Priority;
};

export function TaskDrawer({
  task,
  onClose,
  onSaved,
}: {
  task: KanbanTask;
  onClose: () => void;
  onSaved: (patch: TaskPatch) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [expanding, setExpanding] = useState(false);

  // Re-seed the form when the user opens a different task.
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setPriority(task.priority);
    setError(null);
    setExpanding(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  const expandWithAI = async () => {
    if (expanding) return;
    setError(null);
    setExpanding(true);
    try {
      const res = await fetch("/api/ai/expand-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || task.title,
          existingDescription: description,
        }),
      });
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      setDescription("");
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setDescription(acc);
      }
    } catch (err) {
      console.error("expand-task failed", err);
      setError(
        err instanceof Error ? `Expand failed: ${err.message}` : "Expand failed",
      );
    } finally {
      setExpanding(false);
    }
  };

  // Escape closes the drawer.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const trimmedTitle = title.trim();
  const normalizedDescription = description.trim() || null;
  const dirty =
    trimmedTitle !== task.title ||
    normalizedDescription !== (task.description ?? null) ||
    priority !== task.priority;

  const submit = () => {
    if (!dirty) return;
    if (!trimmedTitle) {
      setError("Title cannot be empty");
      return;
    }
    setError(null);

    const patch: TaskPatch = {};
    if (trimmedTitle !== task.title) patch.title = trimmedTitle;
    if (normalizedDescription !== (task.description ?? null))
      patch.description = normalizedDescription;
    if (priority !== task.priority) patch.priority = priority;

    startTransition(async () => {
      try {
        await updateTask(task.id, patch);
        onSaved(patch);
      } catch (err) {
        console.error("updateTask failed", err);
        setError("Save failed. Try again.");
      }
    });
  };

  return (
    <aside className="fixed right-0 top-0 z-50 flex h-screen w-[400px] flex-col border-l border-zinc-200 bg-white shadow-xl">
      <header className="flex items-center justify-between border-b border-zinc-200 px-5 py-3.5">
        <h2 className="text-sm font-medium text-zinc-500">Task details</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close drawer"
          className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 3l10 10M13 3L3 13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
        <div>
          <label
            htmlFor="task-title"
            className="text-[11px] font-medium uppercase tracking-wide text-zinc-500"
          >
            Title
          </label>
          <input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={pending}
            className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none disabled:bg-zinc-50"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="task-desc"
              className="text-[11px] font-medium uppercase tracking-wide text-zinc-500"
            >
              Description
            </label>
            <button
              type="button"
              onClick={expandWithAI}
              disabled={pending || expanding || description.length > 100}
              title={
                description.length > 100
                  ? "Description already has more than 100 characters"
                  : "Expand into Overview / Acceptance Criteria / Notes"
              }
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-zinc-600"
            >
              {expanding ? (
                <svg
                  className="h-3 w-3 animate-spin text-zinc-500"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="8"
                    cy="8"
                    r="6"
                    stroke="currentColor"
                    strokeOpacity="0.25"
                    strokeWidth="2"
                  />
                  <path
                    d="M14 8a6 6 0 0 0-6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <span aria-hidden="true">✨</span>
              )}
              <span>{expanding ? "Expanding..." : "Expand with AI"}</span>
            </button>
          </div>
          <textarea
            id="task-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={pending || expanding}
            rows={6}
            placeholder="Add a description..."
            className="mt-1.5 w-full resize-y rounded-md border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none disabled:bg-zinc-50"
          />
        </div>

        <div>
          <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            Priority
          </span>
          <div className="mt-1.5 grid grid-cols-4 gap-1.5">
            {PRIORITIES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                disabled={pending}
                className={`rounded-md px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset transition-colors ${
                  priority === p
                    ? PRIORITY_SELECTED[p]
                    : "bg-white text-zinc-500 ring-zinc-200 hover:bg-zinc-50"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            Labels
          </span>
          {task.labels.length === 0 ? (
            <p className="mt-1.5 text-xs text-zinc-400">No labels</p>
          ) : (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {task.labels.map(({ label }) => (
                <span
                  key={label.id}
                  className="rounded px-2 py-0.5 text-[11px] font-medium text-white"
                  style={{ backgroundColor: label.color }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-zinc-200 px-5 py-3">
        <p
          className={`text-xs ${error ? "text-red-600" : "text-zinc-400"}`}
          role={error ? "alert" : undefined}
        >
          {error ?? (dirty ? "Unsaved changes" : "")}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-zinc-500 hover:text-zinc-700"
          >
            Close
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !dirty || !trimmedTitle}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {pending ? "Saving..." : "Save"}
          </button>
        </div>
      </footer>
    </aside>
  );
}
