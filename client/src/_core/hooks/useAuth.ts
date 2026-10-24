import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect } from "react";
type UseAuthOptions = { redirectOnUnauthenticated?: boolean; redirectPath?: string };
export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/login" } = options ?? {};
  const utils = trpc.useUtils();
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const logoutMutation = trpc.auth.logout.useMutation({ onSuccess: () => utils.auth.me.setData(undefined, null) });
  const logout = useCallback(async () => {
    try { await logoutMutation.mutateAsync(); } catch (error) { if (!(error instanceof TRPCClientError) || error.data?.code !== "UNAUTHORIZED") throw error; }
    finally { utils.auth.me.setData(undefined, null); await utils.auth.me.invalidate(); }
  }, [logoutMutation, utils]);
  useEffect(() => { if (redirectOnUnauthenticated && !meQuery.isLoading && !logoutMutation.isPending && !meQuery.data && window.location.pathname !== redirectPath) window.location.assign(redirectPath); }, [redirectOnUnauthenticated, redirectPath, meQuery.isLoading, meQuery.data, logoutMutation.isPending]);
  return { user: meQuery.data ?? null, loading: meQuery.isLoading || logoutMutation.isPending, error: meQuery.error ?? logoutMutation.error ?? null, isAuthenticated: Boolean(meQuery.data), refresh: () => meQuery.refetch(), logout };
}
