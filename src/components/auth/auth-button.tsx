"use client";

import { useState } from "react";
import { LogIn, LogOut } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthButton() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const me = trpc.auth.me.useQuery();

  const login = trpc.auth.login.useMutation({
    onSuccess: () => {
      void utils.auth.me.invalidate();
      resetAndClose();
    },
    onError: (err) => setError(err.message),
  });

  const register = trpc.auth.register.useMutation({
    onSuccess: () => {
      void utils.auth.me.invalidate();
      resetAndClose();
    },
    onError: (err) => setError(err.message),
  });

  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      void utils.auth.me.invalidate();
    },
  });

  function resetAndClose() {
    setOpen(false);
    setEmail("");
    setPassword("");
    setError(null);
    setMode("login");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!email.includes("@")) {
      setError("Email invalide");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    if (mode === "login") {
      login.mutate({ email, password });
    } else {
      register.mutate({ email, password });
    }
  }

  const isLoading = login.isPending || register.isPending;

  if (me.data) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden text-sm text-muted-foreground sm:block">
          {me.data.email}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Déconnexion</span>
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <LogIn className="h-4 w-4" />
        <span className="hidden sm:inline">Connexion</span>
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); else setOpen(true); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mode === "login" ? "Se connecter" : "Créer un compte"}
            </DialogTitle>
            <DialogDescription>
              {mode === "login"
                ? "Connectez-vous pour accéder à votre suivi personnel."
                : "Créez un compte pour enregistrer vos épisodes de maladie."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="auth-email">Email</Label>
              <Input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.fr"
                autoComplete="email"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="auth-password">Mot de passe</Label>
              <Input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 caractères minimum"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={8}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? "Chargement…"
                : mode === "login"
                  ? "Se connecter"
                  : "Créer un compte"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                Pas encore de compte ?{" "}
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-foreground"
                  onClick={() => { setMode("register"); setError(null); }}
                >
                  Créer un compte
                </button>
              </>
            ) : (
              <>
                Déjà un compte ?{" "}
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-foreground"
                  onClick={() => { setMode("login"); setError(null); }}
                >
                  Se connecter
                </button>
              </>
            )}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
