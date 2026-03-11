import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.hourly(
  "deleted orphaned uploads",
  { minuteUTC: 0 },
  internal.services.mutate.cleanOrphanedFiles,
);

export default crons;
