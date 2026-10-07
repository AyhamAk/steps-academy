import { useQuery } from "@tanstack/react-query";

import { getSlotDescriptions } from "../services/scheduleApi";

/**
 * The academy's default line under each nursery slot.
 *
 * Under the "schedule" key, so every refresh of the timetable refreshes these
 * too. Until it loads, or if it fails, the app's built-in lines show.
 */
export function useSlotDescriptions() {
  return useQuery({
    queryKey: ["schedule", "slotDescriptions"],
    queryFn: getSlotDescriptions,
  });
}
