export const STATUS_STYLES: Record<string, { badge: string; cover: string }> = {
  pending: {
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    cover: "from-amber-500/20 to-amber-500/5",
  },
  approved: {
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    cover: "from-blue-500/20 to-blue-500/5",
  },
  completed: {
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    cover: "from-emerald-500/20 to-emerald-500/5",
  },
  paid: {
    badge: "bg-teal-100 text-teal-700 border-teal-200",
    cover: "from-teal-500/20 to-teal-500/5",
  },
  rejected: {
    badge: "bg-red-100 text-red-700 border-red-200",
    cover: "from-red-500/20 to-red-500/5",
  },
  cancelled: {
    badge: "bg-red-100 text-red-700 border-red-200",
    cover: "from-red-500/20 to-red-500/5",
  },
};
