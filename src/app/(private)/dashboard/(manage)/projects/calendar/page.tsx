"use client";

import * as React from "react";
import { format, addDays, subDays, startOfToday, isSameDay } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  MoreHorizontal,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// --- Mock Data ---

const PROJECTS = [
  { id: "1", name: "Laser Cutter 1" },
  { id: "2", name: "3D Printer A (Prusa)" },
  { id: "3", name: "CNC Router" },
  { id: "4", name: "Vinyl Cutter" },
  { id: "5", name: "Electronics Lab" },
  { id: "6", name: "Woodworking Bench" },
];

/**
 * Mock Bookings with explicit ranges.
 * If a booking is 7 to 11, it should occupy 4 slots: 7, 8, 9, 10.
 * It "ends" at the start of the 11th hour.
 */
const MOCK_DATE = startOfToday();

const BOOKINGS = [
  {
    id: "1928309",
    projectId: "1",
    userName: "Renata",
    date: MOCK_DATE,
    startTime: 7,
    endTime: 9, // 2 hours (7-8, 8-9)
    title: "Enclosure Cut",
    color:
      "bg-[var(--chart-1)]/20 border-[var(--chart-1)] text-[var(--chart-1)]",
  },
  {
    id: "1928312",
    projectId: "1",
    userName: "Renata",
    date: MOCK_DATE,
    startTime: 9,
    endTime: 10, // 1 hour (9-10)
    title: "Spare Parts",
    color:
      "bg-[var(--chart-1)]/20 border-[var(--chart-1)] text-[var(--chart-1)]",
  },
  {
    id: "1928314",
    projectId: "1",
    userName: "Jauhari",
    date: MOCK_DATE,
    startTime: 11,
    endTime: 13, // 2 hours (11-12, 12-1)
    title: "Art Project",
    color:
      "bg-[var(--chart-2)]/20 border-[var(--chart-2)] text-[var(--chart-2)]",
  },
  {
    id: "1928310",
    projectId: "2",
    userName: "Marcel",
    date: MOCK_DATE,
    startTime: 7,
    endTime: 9,
    title: "Prototype v1",
    color:
      "bg-[var(--chart-3)]/20 border-[var(--chart-3)] text-[var(--chart-3)]",
  },
  {
    id: "1928313",
    projectId: "2",
    userName: "Dr. Yosep",
    date: MOCK_DATE,
    startTime: 9,
    endTime: 11,
    title: "Medical Model",
    color:
      "bg-[var(--chart-6)]/20 border-[var(--chart-6)] text-[var(--chart-6)]",
  },
  {
    id: "1928315",
    projectId: "2",
    userName: "Anita",
    date: MOCK_DATE,
    startTime: 11,
    endTime: 12,
    title: "Jewelry Mold",
    color:
      "bg-[var(--chart-2)]/20 border-[var(--chart-2)] text-[var(--chart-2)]",
  },
  {
    id: "1928311",
    projectId: "3",
    userName: "Damar",
    date: MOCK_DATE,
    startTime: 7,
    endTime: 11, // 4 hours (7-8, 8-9, 9-10, 10-11)
    title: "Cabinet Parts",
    color:
      "bg-[var(--chart-4)]/20 border-[var(--chart-4)] text-[var(--chart-4)]",
  },
];

// Hours from 07:00 to 22:00
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7);

export default function ProjectCalendarPage() {
  const [date, setDate] = React.useState<Date>(startOfToday());

  const handlePrevDay = () => setDate((prev) => subDays(prev, 1));
  const handleNextDay = () => setDate((prev) => addDays(prev, 1));
  const handleToday = () => setDate(startOfToday());

  const filteredBookings = React.useMemo(() => {
    return BOOKINGS.filter((b) => isSameDay(b.date, date));
  }, [date]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex flex-col gap-4 p-6 border-b sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground text-sm">
            Manage and monitor project schedules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-50">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="pl-8 w-full h-9"
            />
          </div>
          <Button
            variant="default"
            size="sm"
            className="gap-1 bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Booking
          </Button>
        </div>
      </div>

      {/* Navigation Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevDay}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextDay}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            className="font-semibold text-sm h-8"
            onClick={handleToday}
          >
            Today
          </Button>
          <div className="h-4 w-px bg-border mx-2" />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal h-8 px-3 text-sm",
                  !date && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "EEE, MMM dd") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Badge
            variant="secondary"
            className="rounded-md font-medium px-2 py-0.5"
          >
            Day View
          </Badge>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Scheduler Table */}
      <div className="flex-1 overflow-auto p-6">
        <div className="border rounded-lg bg-background shadow-sm overflow-hidden">
          <Table className="border-collapse table-fixed min-w-[1200px]">
            <TableHeader className="sticky top-0 z-40 shadow-sm">
              <TableRow className="hover:bg-transparent bg-muted">
                <TableHead className="w-[200px] sticky left-0 top-0 z-50 bg-muted border-b border-r font-bold">
                  Resources
                </TableHead>
                {HOURS.map((hour) => (
                  <TableHead
                    key={hour}
                    className="w-[160px] text-left pl-3 font-semibold border-b border-r sticky top-0 z-40 bg-muted"
                  >
                    {format(new Date().setHours(hour, 0, 0, 0), "hh:00 a")}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {PROJECTS.map((project) => (
                <TableRow
                  key={project.id}
                  className="h-36 hover:bg-transparent"
                >
                  <TableCell className="sticky left-0 z-20 bg-background border-b border-r font-semibold shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-sm">
                    {project.name}
                  </TableCell>

                  {HOURS.map((hour, index) => {
                    // Check if a booking starts exactly at this hour
                    const booking = filteredBookings.find(
                      (b) => b.projectId === project.id && b.startTime === hour,
                    );

                    if (booking) {
                      const duration = booking.endTime - booking.startTime;
                      // colSpan covers the current cell plus (duration - 1) subsequent cells
                      const clampedColSpan = Math.min(
                        duration,
                        HOURS.length - index,
                      );

                      return (
                        <TableCell
                          key={`${project.id}-${hour}`}
                          className="p-1 border-b border-r bg-muted/5 align-top"
                          colSpan={clampedColSpan}
                        >
                          <Card
                            className={cn(
                              "h-full border shadow-sm rounded-lg p-3 flex flex-col justify-between overflow-hidden",
                              booking.color,
                            )}
                          >
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold tracking-wider opacity-70 uppercase">
                                ID{booking.id}
                              </span>
                              <span className="font-bold text-sm truncate">
                                {booking.userName}
                              </span>
                            </div>
                            <div className="mt-auto flex items-center justify-between">
                              <span className="text-[10px] font-semibold whitespace-nowrap px-1.5 py-0.5 rounded bg-background/50">
                                {format(
                                  new Date().setHours(
                                    booking.startTime,
                                    0,
                                    0,
                                    0,
                                  ),
                                  "hh:mm a",
                                )}{" "}
                                -{" "}
                                {format(
                                  new Date().setHours(booking.endTime, 0, 0, 0),
                                  "hh:mm a",
                                )}
                              </span>
                              <Avatar className="h-6 w-6 border-2 border-background ring-1 ring-black/5">
                                <AvatarFallback className="text-[10px] font-bold bg-background">
                                  {booking.userName[0]}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          </Card>
                        </TableCell>
                      );
                    }

                    // Check if this hour is covered by a booking starting earlier
                    const isCovered = filteredBookings.some(
                      (b) =>
                        b.projectId === project.id &&
                        hour > b.startTime &&
                        hour < b.endTime,
                    );

                    if (isCovered) return null;

                    // Render an empty slot with an "Add" action
                    return (
                      <TableCell
                        key={`${project.id}-${hour}`}
                        className="group relative p-2 border-b border-r h-full transition-colors hover:bg-muted/10"
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 absolute inset-2 h-auto text-[10px] font-semibold text-muted-foreground gap-1 border-dashed border-2 hover:bg-background hover:text-primary transition-all duration-200"
                        >
                          <Plus className="h-3 w-3" />
                          Book
                        </Button>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
