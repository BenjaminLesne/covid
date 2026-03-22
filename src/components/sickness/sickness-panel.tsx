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

function SicknessStats({
  episodes,
}: {
  episodes: { startDate: string; endDate: string }[];
}) {
  const totalEpisodes = episodes.length;

  const durations = episodes.map((ep) => durationDays(ep.startDate, ep.endDate));
  const avgDuration = durations.reduce((a, b) => a + b, 0) / totalEpisodes;

  const sorted = [...episodes].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
  const earliest = new Date(sorted[0].startDate);
  const latest = new Date(sorted[sorted.length - 1].startDate);
  const spanYears =
    (latest.getTime() - earliest.getTime()) / (365.25 * 86_400_000);

  const lastEpisode = sorted[sorted.length - 1];

  const fmt = (n: number) =>
    n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

  return (
    <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/50 p-3 text-sm sm:grid-cols-4">
      <div>
        <p className="text-muted-foreground text-xs">Épisodes</p>
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
        <p className="font-medium">{formatDateFr(lastEpisode.startDate)}</p>
      </div>
    </div>
  );
}

export function SicknessPanel() {
  const me = trpc.auth.me.useQuery();
  const episodes = trpc.sickness.list.useQuery(undefined, {
    enabled: !!me.data,
  });
  const utils = trpc.useUtils();

  const [showForm, setShowForm] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = trpc.sickness.create.useMutation({
    onSuccess: () => {
      void utils.sickness.list.invalidate();
      setShowForm(false);
      setStartDate("");
      setEndDate("");
      setError(null);
    },
    onError: (err) => setError(err.message),
  });

  const [timeMachineDate, setTimeMachineDate] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const update = trpc.sickness.update.useMutation({
    onSuccess: () => {
      void utils.sickness.list.invalidate();
      setEditingId(null);
      setEditError(null);
    },
    onError: (err) => setEditError(err.message),
  });

  const deleteMut = trpc.sickness.delete.useMutation({
    onSuccess: () => {
      void utils.sickness.list.invalidate();
    },
  });

  if (!me.data) return null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!startDate) {
      setError("Date de début requise");
      return;
    }
    create.mutate({ startDate, endDate: endDate || startDate });
  }

  function handleStartChange(value: string) {
    setStartDate(value);
    if (!endDate || endDate < value) {
      setEndDate(value);
    }
  }

  function handleEdit(ep: { id: number; startDate: string; endDate: string }) {
    setEditingId(ep.id);
    setEditStart(ep.startDate);
    setEditEnd(ep.endDate);
    setEditError(null);
  }

  function handleEditStartChange(value: string) {
    setEditStart(value);
    if (!editEnd || editEnd < value) {
      setEditEnd(value);
    }
  }

  function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEditError(null);
    if (!editStart) {
      setEditError("Date de début requise");
      return;
    }
    update.mutate({ id: editingId!, startDate: editStart, endDate: editEnd || editStart });
  }

  function handleDelete(id: number) {
    if (window.confirm("Supprimer cet épisode ?")) {
      deleteMut.mutate({ id });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mes épisodes de maladie</CardTitle>
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
            Ajouter un épisode
          </Button>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sickness-start">Date de début</Label>
                <Input
                  id="sickness-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartChange(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sickness-end">Date de fin</Label>
                <Input
                  id="sickness-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  required
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

        {episodes.data && episodes.data.length > 0 && (
          <div className="divide-y rounded-md border">
            {episodes.data.map((ep) =>
              editingId === ep.id ? (
                <form
                  key={ep.id}
                  onSubmit={handleEditSubmit}
                  className="flex flex-col gap-2 px-3 py-2"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`edit-start-${ep.id}`}>Début</Label>
                      <Input
                        id={`edit-start-${ep.id}`}
                        type="date"
                        value={editStart}
                        onChange={(e) => handleEditStartChange(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`edit-end-${ep.id}`}>Fin</Label>
                      <Input
                        id={`edit-end-${ep.id}`}
                        type="date"
                        value={editEnd}
                        onChange={(e) => setEditEnd(e.target.value)}
                        min={editStart}
                        required
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
                  key={ep.id}
                  className="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                    <span>
                      {formatDateFr(ep.startDate)} — {formatDateFr(ep.endDate)}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {durationDays(ep.startDate, ep.endDate)} jour
                      {durationDays(ep.startDate, ep.endDate) > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      title="Voir les données à cette date"
                      onClick={() => setTimeMachineDate(ep.startDate)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => handleEdit(ep)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(ep.id)}
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

        {episodes.data && episodes.data.length > 0 && (
          <SicknessStats episodes={episodes.data} />
        )}

        {episodes.data && episodes.data.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Aucun épisode enregistré.
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
