import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { authClient } from "@/lib/auth";
import { trpc } from "@/lib/trpc";

export type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export const NEON_SESSION_QUERY_KEY = ["neon-auth-session"];

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/login" } = options ?? {};
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();
  const sessionQuery = useQuery({
    queryKey: NEON_SESSION_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await authClient.getSession();
      if (error) throw new Error(error.message);
      return Boolean(data?.session && data.user);
    },
    retry: false,
    refetchOnWindowFocus: false,
  });
  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: sessionQuery.data === true,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logout = useCallback(async () => {
    const { error } = await authClient.signOut();
    if (error) throw new Error(error.message);
    queryClient.setQueryData(NEON_SESSION_QUERY_KEY, false);
    utils.auth.me.setData(undefined, null);
    await utils.auth.me.invalidate();
  }, [queryClient, utils]);

  useEffect(() => {
    if (
      redirectOnUnauthenticated &&
      !sessionQuery.isLoading &&
      !sessionQuery.error &&
      sessionQuery.data !== true &&
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
  }, [redirectOnUnauthenticated, redirectPath, sessionQuery.data, sessionQuery.error, sessionQuery.isLoading]);

  const user = meQuery.data ?? null;

  return {
    user,
    role: user?.role ?? null,
    isAdmin: user?.role === "admin",
    loading: sessionQuery.isLoading || (sessionQuery.data === true && meQuery.isLoading),
    error: sessionQuery.error ?? meQuery.error ?? null,
    isAuthenticated: Boolean(user),
    refresh: async () => {
      await queryClient.invalidateQueries({ queryKey: NEON_SESSION_QUERY_KEY });
      return meQuery.refetch();
    },
    logout,
  };
}
