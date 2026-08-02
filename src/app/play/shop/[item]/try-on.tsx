"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PopButton } from "@/components/ui/pop";
import { purchaseItem } from "@/lib/actions/shop";

export function TryOnActions({
  studentId,
  itemKey,
  canBuy,
  blockedMessage,
  owned,
}: {
  studentId: string;
  itemKey: string;
  canBuy: boolean;
  blockedMessage?: string;
  owned: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function buy() {
    startTransition(async () => {
      const result = await purchaseItem(studentId, itemKey);
      setMessage(result.message ?? null);
      if (result.ok) router.push("/play/locker");
    });
  }

  if (owned) {
    return (
      <PopButton tone="white" size="lg" full onClick={() => router.push("/play/locker")}>
        OPEN YOUR LOCKER
      </PopButton>
    );
  }

  return (
    <div className="w-full">
      {message ? (
        <p role="status" className="mb-2 text-center font-sans text-xs font-black text-ink">
          {message}
        </p>
      ) : null}
      {!canBuy && blockedMessage ? (
        <p className="mb-2 text-center font-sans text-xs font-black text-mud">{blockedMessage}</p>
      ) : null}
      <PopButton tone="teal" size="lg" full disabled={!canBuy || pending} onClick={buy}>
        {pending ? "BUYING…" : "BUY WITH COINS"}
      </PopButton>
    </div>
  );
}
