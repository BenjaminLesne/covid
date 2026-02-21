"use client";

import { useState } from "react";
import { Send, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";

export function FeedbackButton() {
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  const sendFeedback = trpc.feedback.send.useMutation({
    onSuccess: () => {
      setSent(true);
      setMessage("");
      setTimeout(() => {
        setOpen(false);
        setSent(false);
      }, 1500);
    },
  });

  function handleSend() {
    if (!message.trim() || sendFeedback.isPending) return;
    sendFeedback.mutate({ message: message.trim() });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          Feedback
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-medium">Envoyer un feedback</h3>
            <p className="text-muted-foreground text-xs">
              Suggestion, bug, amélioration… dites-moi tout !
            </p>
          </div>
          <textarea
            className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-[100px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
            placeholder="Votre message…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
            }}
          />
          {sendFeedback.isError && (
            <p className="text-destructive text-xs">
              Erreur lors de l&apos;envoi. Réessayez.
            </p>
          )}
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!message.trim() || sendFeedback.isPending || sent}
          >
            {sendFeedback.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : sent ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {sent ? "Envoyé !" : "Envoyer"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
