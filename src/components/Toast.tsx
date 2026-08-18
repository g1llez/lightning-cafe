type ToastProps = {
  message: string
}

export function Toast({ message }: ToastProps) {
  if (!message) {
    return null
  }

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border bg-bg-panel px-4 py-2 text-sm shadow-lg">
      {message}
    </div>
  )
}
