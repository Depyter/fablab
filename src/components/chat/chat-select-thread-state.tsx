export function ChatSelectThreadState() {
  return (
    <div className="flex h-full w-full min-h-0 overflow-hidden relative">
      <div className="flex-1 w-full min-h-0">
        <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden p-8 text-center bg-[var(--fab-bg-main)] bg-[linear-gradient(var(--fab-grid)_1px,transparent_1px),linear-gradient(90deg,var(--fab-grid)_1px,transparent_1px)] [background-size:28px_28px]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          />
          <div className=" px-6 py-4 ">
            <h2 className="font-mono text-xl font-black text-[var(--fab-text-primary)]">
              Select a thread
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
}
