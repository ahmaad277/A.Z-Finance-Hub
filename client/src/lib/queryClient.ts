import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Cache persistence helpers
const CACHE_KEY = "azfinance-query-cache";
const CACHE_VERSION = "v2"; // Updated to clear old cache
const CACHE_TIME = 1000 * 60 * 60 * 24; // 24 hours

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Save cache to localStorage
export function saveCache() {
  try {
    const cache = queryClient.getQueryCache().getAll();
    const serializedCache = cache.map(query => ({
      queryKey: query.queryKey,
      state: query.state,
    }));
    
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      version: CACHE_VERSION,
      timestamp: Date.now(),
      queries: serializedCache,
    }));
  } catch (error) {
    console.warn('[Cache] Failed to save cache:', error);
  }
}

// Load cache from localStorage
export function loadCache() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return;
    
    const { version, timestamp, queries } = JSON.parse(cached);
    
    // Check version and age
    if (version !== CACHE_VERSION || Date.now() - timestamp > CACHE_TIME) {
      localStorage.removeItem(CACHE_KEY);
      return;
    }
    
    // Restore queries
    queries.forEach(({ queryKey, state }: any) => {
      queryClient.setQueryData(queryKey, state.data);
    });
    
    console.log('[Cache] Loaded cache with', queries.length, 'queries');
  } catch (error) {
    console.warn('[Cache] Failed to load cache:', error);
    localStorage.removeItem(CACHE_KEY);
  }
}

// Clear cache
export function clearCache() {
  localStorage.removeItem(CACHE_KEY);
  queryClient.clear();
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Auto-save cache periodically and on page unload
if (typeof window !== 'undefined') {
  // Save cache every 30 seconds
  setInterval(saveCache, 30000);
  
  // Save cache before page unload
  window.addEventListener('beforeunload', saveCache);
  
  // Load cache on startup
  loadCache();
}
