export function ChatSelectThreadState() {
  return (
    <div className="flex h-full w-full min-h-0 overflow-hidden relative">
      <div className="flex-1 w-full min-h-0">
        <div
          className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden p-8 text-center"
          style={{
            background: "var(--fab-bg-main)",
            backgroundImage: `
              linear-gradient(var(--fab-grid) 1px, transparent 1px),
              linear-gradient(90deg, var(--fab-grid) 1px, transparent 1px)
            `,
            backgroundSize: "28px 28px",
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          />
          <h2
            className="mb-3 font-mono text-2xl font-semibold"
            style={{ color: "var(--fab-text-primary)" }}
          >
            Select a thread
          </h2>
        </div>
      </div>
    </div>
  );
}
