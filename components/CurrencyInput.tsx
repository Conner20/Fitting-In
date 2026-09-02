"use client";

import { ChangeEvent, KeyboardEvent } from "react";

function currency(value: number) {
  return `$${Math.max(0, Number.isFinite(value) ? value : 0).toFixed(2)}`;
}

export default function CurrencyInput({ value, onChange, className, label }: { value: number; onChange: (value: number) => void; className?: string; label?: string }) {
  const change = (event: ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/\D/g, "");
    onChange(digits ? Number(digits) / 100 : 0);
  };
  const moveCaret = (input: HTMLInputElement) => { window.requestAnimationFrame(() => input.setSelectionRange(input.value.length, input.value.length)); };
  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home"].includes(event.key)) event.preventDefault();
  };
  return <input aria-label={label} type="text" inputMode="numeric" autoComplete="off" value={currency(value)} onChange={change} onFocus={event=>moveCaret(event.currentTarget)} onClick={event=>moveCaret(event.currentTarget)} onKeyDown={keyDown} className={className}/>;
}
