import type { ReactNode } from 'react'
import { Plus, Trash2 } from 'lucide-react'

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>
}

export function Input({ value, onChange, label, numeric = false, placeholder }: {
  value: string; onChange: (value: string) => void; label?: string; numeric?: boolean; placeholder?: string
}) {
  return <input aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}
    inputMode={numeric ? 'decimal' : 'text'} maxLength={160} autoComplete="off" spellCheck={false} placeholder={placeholder} />
}

export function Segmented<T extends string>({ label, value, choices, onChange }: {
  label: string; value: T; choices: [T, string][]; onChange: (value: T) => void
}) {
  return <div className="segmented" role="group" aria-label={label}>
    {choices.map(([id, name]) => <button key={id} type="button" aria-pressed={id === value} onClick={() => onChange(id)}>{name}</button>)}
  </div>
}

export function Add({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button type="button" className="button add-button" onClick={onClick} disabled={disabled}><Plus size={16} />{children}</button>
}

export function Remove({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return <button type="button" className="icon-button remove-button" aria-label={label} title={label} onClick={onClick} disabled={disabled}><Trash2 size={16} /></button>
}

export function replaceAt<T>(values: T[], index: number, value: T) {
  return values.map((entry, i) => i === index ? value : entry)
}

export function removeAt<T>(values: T[], index: number) {
  return values.filter((_, i) => i !== index)
}

export function nextName(names: string[]) {
  return Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ').find((name) => !names.includes(name)) ?? 'X'
}
