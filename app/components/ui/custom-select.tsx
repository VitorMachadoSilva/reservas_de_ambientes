"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";

type CustomSelectProps = {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
};

export function CustomSelect({
  label,
  onChange,
  options,
  value,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className="custom-select">
      <span className="custom-select-label">{label}</span>
      <button
        className="custom-select-button"
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <strong>{selectedOption?.label ?? "Selecione"}</strong>
        <ChevronRight size={17} />
      </button>
      {open && (
        <div className="custom-select-menu" role="listbox">
          {options.map((option) => (
            <button
              key={option.value}
              className={`custom-select-option ${
                option.value === value ? "selected" : ""
              }`}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
