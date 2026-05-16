import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

type MeResponse = {
  user: { id: string; name: string; email: string } | null;
  company: { id: string; name: string } | null;
};

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await apiClient.get<MeResponse>("/auth/me");
      return data;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
