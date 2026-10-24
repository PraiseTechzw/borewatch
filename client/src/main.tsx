import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { authClient } from "./lib/auth";
import "./index.css";
const queryClient = new QueryClient();
const trpcClient = trpc.createClient({ links: [httpBatchLink({
  url: "/api/trpc",
  transformer: superjson,
  headers: async () => {
    const { data, error } = await authClient.token();
    if (error) throw new Error(error.message);
    return data?.token ? { authorization: `Bearer ${data.token}` } : {};
  },
})] });
createRoot(document.getElementById("root")!).render(<trpc.Provider client={trpcClient} queryClient={queryClient}><QueryClientProvider client={queryClient}><App /></QueryClientProvider></trpc.Provider>);
