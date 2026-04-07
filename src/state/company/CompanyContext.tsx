import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getMyCompany, getSubscriptionStatus, getMyRole, type CompanyInfo, type CompanyRole } from "../../api";
import { useAuth } from "../auth/AuthContext";

interface CompanyContextType {
  company: CompanyInfo | null;
  isMember: boolean;
  isActive: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  // Role
  myRole: CompanyRole | null;
  isOwner: boolean;
  isAdmin: boolean;     // owner or admin
  isManager: boolean;   // owner, admin, or manager
}

const CompanyContext = createContext<CompanyContextType>({
  company: null,
  isMember: false,
  isActive: false,
  loading: true,
  refresh: async () => {},
  myRole: null,
  isOwner: false,
  isAdmin: false,
  isManager: false,
});

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [myRole, setMyRole] = useState<CompanyRole | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setCompany(null);
      setIsActive(false);
      setMyRole(null);
      setLoading(false);
      return;
    }
    try {
      const fallback = {
        company: null as CompanyInfo | null,
        status: null as string | null,
        role: null as CompanyRole | null,
      };
      const bootData = await Promise.race([
        Promise.all([getMyCompany(), getSubscriptionStatus(), getMyRole()]).then(
          ([c, sub, roleResp]) => ({
            company: c,
            status: sub.status,
            role: roleResp.role,
          })
        ),
        new Promise<typeof fallback>((resolve) => {
          setTimeout(() => resolve(fallback), 9000);
        }),
      ]);
      setCompany(bootData.company);
      setIsActive(bootData.status === "active" || bootData.status === "trialing");
      setMyRole(bootData.role);
    } catch {
      setCompany(null);
      setIsActive(false);
      setMyRole(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isOwner = myRole === "owner";
  const isAdmin = myRole === "owner" || myRole === "admin";
  const isManager = myRole === "owner" || myRole === "admin" || myRole === "manager";

  return (
    <CompanyContext.Provider
      value={{
        company,
        isMember: !!company,
        isActive,
        loading,
        refresh,
        myRole,
        isOwner,
        isAdmin,
        isManager,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export const useCompany = () => useContext(CompanyContext);
