export default function ChatPage() {
  return (
    <div
      className="relative flex h-full flex-col items-center justify-center overflow-hidden w-full text-center"
      style={{ background: "var(--fab-bg-main)" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(var(--fab-grid) 1px, transparent 1px),
            linear-gradient(90deg, var(--fab-grid) 1px, transparent 1px)
          `,
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative z-[1] max-w-sm">
        <p
          className="font-mono text-2xl font-semibold"
          style={{
            color: "var(--fab-text-dim)",
          }}
        >
          Select a thread
        </p>
      </div>
    </div>
  );
}
