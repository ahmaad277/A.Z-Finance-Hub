import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-provider";

type AuthUser = {
  user: Omit<User, "passwordHash">;
  isImpersonating: boolean;
  actualUserId: string;
  role?: any;
};

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<any, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
};

type LoginData = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { t } = useLanguage();

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<AuthUser | null, Error>({
    queryKey: ["/api/v2/auth/me"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/v2/auth/me");
        if (response.status === 401) {
          return null;
        }
        if (!response.ok) {
          throw new Error("Failed to fetch user");
        }
        return await response.json();
      } catch (error) {
        return null;
      }
    },
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/v2/auth/login", credentials);
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.setQueryData(["/api/v2/auth/me"], data);
      toast({
        title: t("تم تسجيل الدخول بنجاح", "Login successful"),
        description: t(`مرحباً ${data.user?.name}`, `Welcome ${data.user?.name}`),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("فشل تسجيل الدخول", "Login failed"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/v2/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/v2/auth/me"], null);
      toast({
        title: t("تم تسجيل الخروج", "Logged out"),
        description: t("تم تسجيل الخروج بنجاح", "You have been logged out successfully"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("فشل تسجيل الخروج", "Logout failed"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
