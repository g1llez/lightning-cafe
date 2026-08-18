type PlusMenuProps = {
  open: boolean
  onToggle: () => void
  items: { label: string; onClick: () => void }[]
  label: string
}

export function PlusMenu({ open, onToggle, items, label }: PlusMenuProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="flex h-7 w-7 items-center justify-center rounded-md border border-accent/70 bg-bg-panel text-accent"
        aria-label={label}
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
          <path
            d="M8 2.5v11M2.5 8h11"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-md border border-border bg-bg-panel py-1 shadow-lg">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                item.onClick()
                onToggle()
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-bg-secondary"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
