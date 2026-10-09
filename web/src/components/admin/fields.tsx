'use client'

/**
 * 后台表单字段。
 *
 * 全是受控组件，值和校验错误由父表单持有 —— 后台是「结构化表单」，
 * 运营只能填这些固定槽位，控件本身也不给自由排版的口子。
 */

export function Field({
  label,
  hint,
  error,
  children,
  required,
}: {
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="field">
      <label>
        {label}
        {required ? <span style={{ color: 'var(--danger)' }}> *</span> : null}
      </label>
      {children}
      {hint ? <div className="field-hint">{hint}</div> : null}
      {error ? <div className="field-error">{error}</div> : null}
    </div>
  )
}

export function Text({
  label,
  value,
  onChange,
  hint,
  error,
  required,
  type = 'text',
  maxLength = 200,
  placeholder,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  hint?: string
  error?: string
  required?: boolean
  type?: 'text' | 'email' | 'url' | 'number' | 'password'
  maxLength?: number
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      <input
        className="input"
        type={type}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(type === 'number' ? e.target.value.replace(/[^\d.-]/g, '') : e.target.value)}
      />
    </Field>
  )
}

export function TextArea({
  label,
  value,
  onChange,
  hint,
  error,
  required,
  rows = 4,
  maxLength = 2000,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  hint?: string
  error?: string
  required?: boolean
  rows?: number
  maxLength?: number
  placeholder?: string
}) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      <textarea
        className="textarea"
        rows={rows}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  )
}

export function Select({
  label,
  value,
  onChange,
  options,
  hint,
  error,
  required,
  allowEmpty,
  emptyLabel = '（无）',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  hint?: string
  error?: string
  required?: boolean
  allowEmpty?: boolean
  emptyLabel?: string
}) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {allowEmpty ? <option value="">{emptyLabel}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

export function Checkbox({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  hint?: string
}) {
  return (
    <div className="field">
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 400 }}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span>{label}</span>
      </label>
      {hint ? <div className="field-hint">{hint}</div> : null}
    </div>
  )
}

/**
 * 重复结构项的子表单。
 *
 * 这是「结构化」和「灵活」的交界：运营能增删条目、能改条目里的字段，
 * 但**改不了结构** —— 每一行的字段是固定的。形状由 shared 的 zod 锁死。
 */
export function Repeater<T extends Record<string, unknown>>({
  label,
  items,
  onChange,
  makeNew,
  renderRow,
  addLabel = '添加一项',
  max = 20,
  hint,
}: {
  label: string
  items: T[]
  onChange: (next: T[]) => void
  makeNew: () => T
  renderRow: (item: T, index: number, patch: (partial: Partial<T>) => void) => React.ReactNode
  addLabel?: string
  max?: number
  hint?: string
}) {
  const patch = (index: number, partial: Partial<T>) => {
    onChange(items.map((it, i) => (i === index ? { ...it, ...partial } : it)))
  }
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index))
  const move = (index: number, dir: -1 | 1) => {
    const next = [...items]
    const j = index + dir
    if (j < 0 || j >= next.length) return
    ;[next[index], next[j]] = [next[j], next[index]]
    onChange(next)
  }

  return (
    <div className="field">
      <label>{label}</label>
      {hint ? <div className="field-hint" style={{ marginBottom: 8 }}>{hint}</div> : null}

      {items.length === 0 ? (
        <div className="empty" style={{ padding: 20, border: '1px dashed var(--line-strong)', borderRadius: 8 }}>
          还没有条目
        </div>
      ) : null}

      {items.map((item, i) => (
        <div
          key={i}
          style={{
            border: '1px solid var(--line)',
            borderRadius: 8,
            padding: 14,
            marginBottom: 10,
            background: 'var(--bg-soft)',
          }}
        >
          <div className="row row-between" style={{ marginBottom: 10 }}>
            <strong style={{ fontSize: 13, color: 'var(--fg-soft)' }}>#{i + 1}</strong>
            <div className="row" style={{ gap: 6 }}>
              <button type="button" className="btn btn-sm" onClick={() => move(i, -1)} disabled={i === 0}>
                ↑
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => move(i, 1)}
                disabled={i === items.length - 1}
              >
                ↓
              </button>
              <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(i)}>
                删除
              </button>
            </div>
          </div>
          {renderRow(item, i, (partial) => patch(i, partial))}
        </div>
      ))}

      {items.length < max ? (
        <button type="button" className="btn" onClick={() => onChange([...items, makeNew()])}>
          + {addLabel}
        </button>
      ) : null}
    </div>
  )
}
