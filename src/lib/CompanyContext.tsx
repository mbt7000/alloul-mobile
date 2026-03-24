import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getMyCompany, getSubscriptionStatus, type CompanyInfo } from "./api";
import { useAuth } from "./AuthContext";

interface CompanyContextType {
  company: CompanyInfo | null;
  isMember: boolean;
  isActive: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType>({
  company: null, isMember: false, isActive: false, loading: true, refresh: async () => {},
});

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setCompany(null); setIsActive(false); setLoading(false); return; }
    try {
      const [c, sub] = await Promise.all([getMyCompany(), getSubscriptionStatus()]);
      setCompany(c);
      setIsActive(sub.status === "active" || sub.status === "trialing");
    } catch { setCompany(null); setIsActive(false); }
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <CompanyContext.Provider value={{ company, isMember: !!company, isActive, loading, refresh }}>
      {children}
    </CompanyContext.Provider>
  );
}

export const useCompany = () => useContext(CompanyContext);
