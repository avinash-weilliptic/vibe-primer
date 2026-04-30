"use client";

import { useEffect, useState, type FormEvent } from "react";
import { updateTask } from "@/lib/actions/tasks";
import type { KanbanPriority, KanbanTask } from "./KanbanBoard";

interface Props {
  task: KanbanTask;
  onClose: () => void;
  onSaved: (fields: {
    title: string;
    description: string | null;
    priority: KanbanPriority;
  }) => void;
}

const PRIORITIES: KanbanPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export function TaskDrawer({ task, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState<KanbanPriority>(task.priority);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setPriority(task.priority);
    setError(null);
  }, [task.id, task.title, task.description, task.priority]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required");
      return;
    }
    const trimmedDescription = description.trim();
    const fields = {
      title: trimmedTitle,
      description: trimmedDescription === "" ? null : trimmedDescription,
      priority,
    };
    setPending(true);
    setError(null);
    try {
      await updateTask(task.id, fields);
      onSaved(fields);
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to save");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-[400px] flex-col bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Task details"
      >
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-700">Task</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          >
            ✕
          </button>
        </header>
        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Title
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={pending}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-60"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Description
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={pending}
                rows={6}
                placeholder="Add a description…"
                className="resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-60"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Priority
              </span>
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as KanbanPriority)
                }
                disabled={pending}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-60"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Labels
              </span>
              {task.labels.length === 0 ? (
                <p className="text-xs text-gray-400">No labels</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {task.labels.map((label) => (
                    <span
                      key={label.id}
                      className="rounded px-1.5 py-0.5 text-[11px] font-medium text-white"
                      style={{ backgroundColor: label.color }}
                    >
                      {label.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
          <footer className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || title.trim() === ""}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </footer>
        </form>
      </aside>
    </>
  );
}
