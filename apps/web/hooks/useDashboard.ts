import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { DashboardSummary } from "@/types/dashboard";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: async () => {
      const { data } = await apiClient.get<DashboardSummary>("/dashboard/summary");
      return data;
    },
  });
}
