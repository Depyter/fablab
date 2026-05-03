export function getCalendarResourceGroupLabel(category: string | null) {
  if (!category) return undefined;

  return category.charAt(0) + category.slice(1).toLowerCase();
}

export function getCalendarServiceGroupLabel(type: string) {
  return type === "WORKSHOP" ? "Workshops" : "Fabrication";
}
