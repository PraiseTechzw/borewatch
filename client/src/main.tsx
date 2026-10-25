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
    try {
      const session = await authClient.getSession();
      const token = session.data?.session?.token;
      return token ? { authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  },
})] });
createRoot(document.getElementById("root")!).render(<trpc.Provider client={trpcClient} queryClient={queryClient}><QueryClientProvider client={queryClient}><App /></QueryClientProvider></trpc.Provider>);
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => { void navigator.serviceWorker.register("/sw.js").catch((error) => console.warn("BoreWatch offline shell could not be registered", error)); });
}
