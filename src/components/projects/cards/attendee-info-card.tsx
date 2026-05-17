"use client";

import type { ProjectData } from "../project-details-content";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

interface AttendeeInfoCardProps {
  project: ProjectData;
}

export function AttendeeInfoCard({ project }: AttendeeInfoCardProps) {
  const client = project.client;
  if (!client) return null;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Attendee</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
            Name
          </p>
          <p className="text-sm font-bold text-black">{client.name}</p>
        </div>

        <div className="h-px bg-black" />

        <div className="grid min-w-0 grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
              Email
            </p>
            <p className="text-sm font-bold text-black break-all">{client.email}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
              Status
            </p>
            <p className="text-sm font-black uppercase tracking-tighter text-black">
              {project.status}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
