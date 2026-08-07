import { supabase } from "./supabase";

// Supabase/PostgREST returns at most 1000 rows per request by default.
// Any query that reads a whole growing table (like BreakOrders) silently
// truncates once it passes 1000 rows, which drops the newest data.
// fetchAll pages through the full result set in 1000-row chunks.
//
// Usage:
//   const orders = await fetchAll(() =>
//     supabase.from("BreakOrders").select("*").eq("cancelled", false));
export async function fetchAll<T = any>(
  build: () => any,
  pageSize = 1000
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  // hard stop at 500k rows as a runaway guard
  for (let guard = 0; guard < 500; guard++) {
    const { data, error } = await build().range(from, from + pageSize - 1);
    if (error) { console.error("fetchAll error", error); break; }
    if (!data || data.length === 0) break;
    all.push(...(data as T[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}
