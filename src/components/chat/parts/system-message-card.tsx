"use client";

import { Calendar } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { FieldSeparator } from "@/components/ui/field";
import { MessageAttachments } from "@/components/chat/parts/message-attachments";
import type { MessageFile } from "@/components/chat/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SystemMessageType =
  | "project-created"
  | "status-updated"
  | "payment-recorded"
  | "pricing-updated"
  | "schedule-updated"
  | "details-updated"
  | "thread-archived"
  | "generic";

interface ParsedSystemMessage {
  type: SystemMessageType;
  data: Record<string, string>;
  rawLines: string[];
}

// ---------------------------------------------------------------------------
// Parser — detect system message type and extract structured data
// ---------------------------------------------------------------------------

function parseSystemMessage(content: string): ParsedSystemMessage {
  const lines = content.split("\n").map((l) => l.trim());
  const first = lines[0] ?? "";

  // Project created
  if (/^New project created:\s*/i.test(first)) {
    const data: Record<string, string> = {};
    const m = first.match(/^New project created:\s*(.*)$/i);
    if (m) data.title = m[1];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const sepIdx = line.indexOf(":");
      if (sepIdx >= 0) {
        const key = line.slice(0, sepIdx).trim();
        const val = line.slice(sepIdx + 1).trim();
        data[key] = val;
      }
    }
    return { type: "project-created", data, rawLines: lines };
  }

  // Payment recorded
  if (/^Payment recorded\./i.test(first)) {
    const data: Record<string, string> = {};
    data.title = first;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const sepIdx = line.indexOf(":");
      if (sepIdx >= 0) {
        const key = line.slice(0, sepIdx).trim().replace(/^- /, "");
        const val = line.slice(sepIdx + 1).trim();
        data[key] = val;
      }
    }
    return { type: "payment-recorded", data, rawLines: lines };
  }

  // Pricing updated
  if (/^Usage pricing updated:/i.test(first)) {
    return { type: "pricing-updated", data: { title: first }, rawLines: lines };
  }

  // Schedule updated
  if (/^Project schedule updated:/i.test(first)) {
    return {
      type: "schedule-updated",
      data: { title: first },
      rawLines: lines,
    };
  }

  // Status updated
  if (/^Status updated to:/i.test(first)) {
    return { type: "status-updated", data: { title: first }, rawLines: lines };
  }

  // Thread archived
  if (/^This thread has been archived/i.test(first)) {
    return {
      type: "thread-archived",
      data: { title: first },
      rawLines: lines,
    };
  }

  // Maker/Admin/Client updated
  if (/^(Maker|Admin|Client) updated:/i.test(first)) {
    return {
      type: "details-updated",
      data: { title: first },
      rawLines: lines,
    };
  }

  // Generic fallback
  return { type: "generic", data: {}, rawLines: lines };
}

// ---------------------------------------------------------------------------
// Field grid helper — renders key-value pairs in a 2-column grid
// ---------------------------------------------------------------------------

function FieldGrid({ fields }: { fields: [string, string][] }) {
  if (fields.length === 0) return null;
  return (
    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
      {fields.map(([key, value]) => (
        <div key={key}>
          <p className="text-[11px] opacity-40 uppercase">{key}</p>
          <strong className="font-semibold uppercase opacity-80">
            {value}
          </strong>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Markdown content block (shared fallback)
// ---------------------------------------------------------------------------

function MarkdownBlock({ content }: { content: string }) {
  if (!content) return null;
  return (
    <div className="prose prose-sm max-w-none prose-p:my-0 prose-p:leading-relaxed prose-strong:font-medium prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-strong:text-inherit prose-a:text-inherit opacity-85">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bullet list block (for system messages with dash-prefixed lines)
// ---------------------------------------------------------------------------

function BulletListBlock({ lines }: { lines: string[] }) {
  const items = lines.filter((l) => l.startsWith("- "));
  if (items.length === 0) return null;
  return (
    <ul className="mt-1 space-y-0.5 text-sm opacity-85">
      {items.map((item, i) => (
        <li key={i} className="leading-relaxed">
          <ReactMarkdown
            components={{
              p: ({ children }) => <span>{children}</span>,
            }}
          >
            {item.replace(/^- /, "")}
          </ReactMarkdown>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Shared attachments block
// ---------------------------------------------------------------------------

function AttachmentsBlock({ files }: { files: MessageFile[] }) {
  if (files.length === 0) return null;
  return (
    <div className="mt-2">
      <MessageAttachments files={files} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card renderers for each system message type
// ---------------------------------------------------------------------------

function ProjectCreatedCard({
  data,
  files,
}: {
  data: Record<string, string>;
  files: MessageFile[];
}) {
  const booking = data["Booking"] ?? "";
  const title = data.title ?? data["Service"] ?? "Project Created";

  return (
    <div className="flex gap-3 items-start">
      <div className="flex-1 min-w-0">
        <div className="flex flex-col items-start">
          <div className="flex flex-row items-center gap-2">
            <div className="text-sm font-bold text-[15px] opacity-85">
              {title}
            </div>
            {data["Service"] && (
              <>
                <span className="opacity-40">•</span>
                <div className="text-[15px] opacity-70 truncate">
                  {data["Service"]}
                </div>
              </>
            )}
          </div>
          {booking && (
            <div className="flex flex-row gap-1 items-center text-right mt-1 opacity-75">
              <Calendar className="inline-block h-3.5 w-3.5 mr-1 opacity-60" />
              <div className="text-xs">{booking}</div>
            </div>
          )}
        </div>

        <div className="mt-1 opacity-30">
          <FieldSeparator />
        </div>

        <FieldGrid
          fields={(
            [
              ["Type", data["Type"]],
              ["Fulfillment", data["Fulfillment"]],
              ["Material", data["Material"]],
              ["Pricing", data["Pricing"]],
            ] as [string, string][]
          ).filter(([, v]) => v)}
        />

        {data["Description"] && (
          <p className="mt-3 text-sm opacity-75 truncate">
            {data["Description"]}
          </p>
        )}

        <AttachmentsBlock files={files} />
      </div>
    </div>
  );
}

function StatusUpdatedCard({
  data,
  rawLines,
  files,
}: {
  data: Record<string, string>;
  rawLines: string[];
  files: MessageFile[];
}) {
  return (
    <div>
      <MarkdownBlock content={data.title ?? ""} />
      <BulletListBlock lines={rawLines} />
      <AttachmentsBlock files={files} />
    </div>
  );
}

function PaymentRecordedCard({
  data,
  files,
}: {
  data: Record<string, string>;
  files: MessageFile[];
}) {
  return (
    <div>
      <MarkdownBlock content={data.title ?? ""} />
      <FieldGrid
        fields={(
          [
            ["Receipt #", data["Receipt #"]],
            ["Payment Mode", data["Payment mode"]],
            ["Proof", data["Proof"]],
          ] as [string, string][]
        ).filter(([, v]) => v)}
      />
      <AttachmentsBlock files={files} />
    </div>
  );
}

function BulletListCard({
  data,
  rawLines,
  files,
}: {
  data: Record<string, string>;
  rawLines: string[];
  files: MessageFile[];
}) {
  return (
    <div>
      <MarkdownBlock content={data.title ?? ""} />
      <BulletListBlock lines={rawLines} />
      <AttachmentsBlock files={files} />
    </div>
  );
}

function DetailsUpdatedCard({
  data,
  files,
}: {
  data: Record<string, string>;
  files: MessageFile[];
}) {
  return (
    <div>
      <MarkdownBlock content={data.title ?? ""} />
      <AttachmentsBlock files={files} />
    </div>
  );
}

function ThreadArchivedCard({
  data,
  files,
}: {
  data: Record<string, string>;
  files: MessageFile[];
}) {
  return (
    <div>
      <p className="text-sm leading-relaxed opacity-75">{data.title}</p>
      <AttachmentsBlock files={files} />
    </div>
  );
}

function GenericCard({
  content,
  files,
}: {
  content: string;
  files: MessageFile[];
}) {
  return (
    <div>
      <MarkdownBlock content={content} />
      <AttachmentsBlock files={files} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SystemMessageCard({
  content,
  files,
}: {
  content: string;
  files: MessageFile[];
}) {
  const parsed = parseSystemMessage(content);

  switch (parsed.type) {
    case "project-created":
      return <ProjectCreatedCard data={parsed.data} files={files} />;
    case "status-updated":
      return (
        <StatusUpdatedCard
          data={parsed.data}
          rawLines={parsed.rawLines}
          files={files}
        />
      );
    case "payment-recorded":
      return <PaymentRecordedCard data={parsed.data} files={files} />;
    case "pricing-updated":
    case "schedule-updated":
      return (
        <BulletListCard
          data={parsed.data}
          rawLines={parsed.rawLines}
          files={files}
        />
      );
    case "details-updated":
      return <DetailsUpdatedCard data={parsed.data} files={files} />;
    case "thread-archived":
      return <ThreadArchivedCard data={parsed.data} files={files} />;
    case "generic":
    default:
      return <GenericCard content={content} files={files} />;
  }
}
