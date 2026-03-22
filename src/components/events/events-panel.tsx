"use client";

import { useState } from "react";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { TimeMachineDialog } from "@/components/time-machine/time-machine-dialog";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EVENT_CATEGORIES, getCategoryByKey } from "@/lib/event-categories";

type Event = {
  id: number;
  category: string;
  name: string | null;
  date: string;
  endDate: string | null;
  createdAt: Date | null;
};

function durationDays(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

function formatDateFr(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function CategoryDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
      style={{ backgroundColor: color }}
    />
  );
}

function CategoryBadge({ categoryKey }: { categoryKey: string }) {
  const cat = getCategoryByKey(categoryKey);
  if (!cat) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium">
      <CategoryDot color={cat.color} />
      {cat.label}
    </span>
  );
}

function SicknessStats({ events }: { events: Event[] }) {
  const sickEvents = events.filter((e) => e.category === "sick" && e.endDate);
  if (sickEvents.length === 0) return null;

  const totalEpisodes = sickEvents.length;
  const durations = sickEvents.map((e) =>
    durationDays(e.date, e.endDate!)
  );
  const avgDuration = durations.reduce((a, b) => a + b, 0) / totalEpisodes;

  const sorted = [...sickEvents].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const earliest = new Date(sorted[0].date);
  const latest = new Date(sorted[sorted.length - 1].date);
  const spanYears =
    (latest.getTime() - earliest.getTime()) / (365.25 * 86_400_000);

  const lastEpisode = sorted[sorted.length - 1];

  const fmt = (n: number) =>
    n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

  return (
    <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/50 p-3 text-sm sm:grid-cols-4">
      <div>
        <p className="text-muted-foreground text-xs">Épisodes maladie</p>
        <p className="font-medium">{totalEpisodes}</p>
      </div>
      {spanYears > 1 && (
        <div>
          <p className="text-muted-foreground text-xs">Par an</p>
          <p className="font-medium">{fmt(totalEpisodes / spanYears)}</p>
        </div>
      )}
      <div>
        <p className="text-muted-foreground text-xs">Durée moy.</p>
        <p className="font-medium">
          {fmt(avgDuration)} jour{avgDuration > 1 ? "s" : ""}
        </p>
      </div>
      <div>
        <p className="text-muted-foreground text-xs">Dernier épisode</p>
        <p className="font-medium">{formatDateFr(lastEpisode.date)}</p>
      </div>
    </div>
  );
}

export function EventsPanel() {
  const me = trpc.auth.me.useQuery();
  const events = trpc.events.list.useQuery(undefined, {
    enabled: !!me.data,
  });
  const utils = trpc.useUtils();

  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState("sick");
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = trpc.events.create.useMutation({
    onSuccess: () => {
      void utils.events.list.invalidate();
      setShowForm(false);
      setCategory("sick");
      setName("");
      setDate("");
      setEndDate("");
      setError(null);
    },
    onError: (err) => setError(err.message),
  });

  const [timeMachineDate, setTimeMachineDate] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCategory, setEditCategory] = useState("sick");
  const [editName, setEditName] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const update = trpc.events.update.useMutation({
    onSuccess: () => {
      void utils.events.list.invalidate();
      setEditingId(null);
      setEditError(null);
    },
    onError: (err) => setEditError(err.message),
  });

  const deleteMut = trpc.events.delete.useMutation({
    onSuccess: () => {
      void utils.events.list.invalidate();
    },
  });

  if (!me.data) return null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!date) {
      setError("Date requise");
      return;
    }
    create.mutate({
      category,
      name: name || undefined,
      date,
      endDate: endDate || undefined,
    });
  }

  function handleDateChange(value: string) {
    setDate(value);
    if (endDate && endDate < value) {
      setEndDate(value);
    }
  }

  function handleEdit(ev: Event) {
    setEditingId(ev.id);
    setEditCategory(ev.category);
    setEditName(ev.name ?? "");
    setEditDate(ev.date);
    setEditEndDate(ev.endDate ?? "");
    setEditError(null);
  }

  function handleEditDateChange(value: string) {
    setEditDate(value);
    if (editEndDate && editEndDate < value) {
      setEditEndDate(value);
    }
  }

  function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEditError(null);
    if (!editDate) {
      setEditError("Date requise");
      return;
    }
    update.mutate({
      id: editingId!,
      category: editCategory,
      name: editName || undefined,
      date: editDate,
      endDate: editEndDate || undefined,
    });
  }

  function handleDelete(id: number) {
    if (window.confirm("Supprimer cet événement ?")) {
      deleteMut.mutate({ id });
    }
  }

  function CategorySelect({
    value,
    onValueChange,
    id,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    id?: string;
  }) {
    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id} className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {EVENT_CATEGORIES.map((cat) => (
            <SelectItem key={cat.key} value={cat.key}>
              <CategoryDot color={cat.color} />
              {cat.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mes événements</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!showForm ? (
          <Button
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4" />
            Ajouter un événement
          </Button>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="event-category">Catégorie</Label>
                <CategorySelect
                  id="event-category"
                  value={category}
                  onValueChange={setCategory}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="event-name">Nom (optionnel)</Label>
                <Input
                  id="event-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Grippe"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="event-date">Date</Label>
                <Input
                  id="event-date"
                  type="date"
                  value={date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="event-end-date">Fin (optionnel)</Label>
                <Input
                  id="event-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={date}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={create.isPending}>
                  {create.isPending ? "Ajout…" : "Ajouter"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowForm(false);
                    setError(null);
                  }}
                >
                  Annuler
                </Button>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
        )}

        {events.data && events.data.length > 0 && (
          <div className="divide-y rounded-md border">
            {events.data.map((ev) =>
              editingId === ev.id ? (
                <form
                  key={ev.id}
                  onSubmit={handleEditSubmit}
                  className="flex flex-col gap-2 px-3 py-2"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`edit-cat-${ev.id}`}>Catégorie</Label>
                      <CategorySelect
                        id={`edit-cat-${ev.id}`}
                        value={editCategory}
                        onValueChange={setEditCategory}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`edit-name-${ev.id}`}>Nom</Label>
                      <Input
                        id={`edit-name-${ev.id}`}
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`edit-date-${ev.id}`}>Date</Label>
                      <Input
                        id={`edit-date-${ev.id}`}
                        type="date"
                        value={editDate}
                        onChange={(e) => handleEditDateChange(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`edit-end-${ev.id}`}>Fin</Label>
                      <Input
                        id={`edit-end-${ev.id}`}
                        type="date"
                        value={editEndDate}
                        onChange={(e) => setEditEndDate(e.target.value)}
                        min={editDate}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={update.isPending}>
                        {update.isPending ? "Enregistrement…" : "Enregistrer"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(null);
                          setEditError(null);
                        }}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                  {editError && <p className="text-sm text-destructive">{editError}</p>}
                </form>
              ) : (
                <div
                  key={ev.id}
                  className="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                    <CategoryBadge categoryKey={ev.category} />
                    <span>
                      {formatDateFr(ev.date)}
                      {ev.endDate && ` — ${formatDateFr(ev.endDate)}`}
                    </span>
                    {ev.endDate && (
                      <span className="text-muted-foreground text-xs">
                        {durationDays(ev.date, ev.endDate)} jour
                        {durationDays(ev.date, ev.endDate) > 1 ? "s" : ""}
                      </span>
                    )}
                    {ev.name && (
                      <span className="text-muted-foreground text-xs">
                        {ev.name}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      title="Voir les données à cette date"
                      onClick={() => setTimeMachineDate(ev.date)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => handleEdit(ev)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(ev.id)}
                      disabled={deleteMut.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ),
            )}
          </div>
        )}

        {events.data && <SicknessStats events={events.data} />}

        {events.data && events.data.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Aucun événement enregistré.
          </p>
        )}
      </CardContent>

      <TimeMachineDialog
        open={timeMachineDate !== null}
        onOpenChange={(open) => { if (!open) setTimeMachineDate(null); }}
        defaultDate={timeMachineDate ?? undefined}
      />
    </Card>
  );
}
