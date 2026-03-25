import { useMemo } from "react";
import { useTasks } from "./useTasks";
import { useStormSessions } from "./useStormSessions";

export function useSearch(queryText, filters = {}) {
  const { tasks } = useTasks();
  const { sessions } = useStormSessions();

  return useMemo(() => {
    if (!queryText || !queryText.trim()) return { tasks: [], storms: [] };
    const q = queryText.toLowerCase().trim();

    const filteredTasks = tasks.filter((t) => {
      if (filters.status && t.status !== filters.status) return false;
      return (
        (t.title || "").toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        (t.tags || []).some((tag) => tag.toLowerCase().includes(q))
      );
    });

    const filteredStorms = sessions.filter(
      (s) =>
        (s.title || "").toLowerCase().includes(q) ||
        (s.rawInput || "").toLowerCase().includes(q) ||
        (s.expandedContent || "").toLowerCase().includes(q) ||
        (s.sensibleContent || "").toLowerCase().includes(q)
    );

    return { tasks: filteredTasks, storms: filteredStorms };
  }, [tasks, sessions, queryText, filters]);
}
