import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect } from "react";

export type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/login" } = options ?? {};
  const utils = trpc.useUtils();
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      if (!(error instanceof TRPCClientError) || error.data?.code !== "UNAUTHORIZED") {
        throw error;
      }
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  useEffect(() => {
    if (
      redirectOnUnauthenticated &&
      !meQuery.isLoading &&
      !logoutMutation.isPending &&
      !meQuery.data &&
      window.location.pathname !== redirectPath
    ) {
      const currentPath = window.location.pathname;
      const currentSearch = window.location.search;
      const fullTarget = currentPath + currentSearch;
      const destination =
        fullTarget && fullTarget !== "/" && !fullTarget.startsWith("/login")
          ? `${redirectPath}?returnTo=${encodeURIComponent(fullTarget)}`
          : redirectPath;
      window.location.assign(destination);
    }
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    meQuery.isLoading,
    meQuery.data,
    logoutMutation.isPending,
  ]);

  const user = meQuery.data ?? null;

  return {
    user,
    role: user?.role ?? null,
    isAdmin: user?.role === "admin",
    loading: meQuery.isLoading || logoutMutation.isPending,
    error: meQuery.error ?? logoutMutation.error ?? null,
    isAuthenticated: Boolean(user),
    refresh: () => meQuery.refetch(),
    logout,
  };
}
