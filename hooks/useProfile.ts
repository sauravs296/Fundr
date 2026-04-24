"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ProfileRow } from "@/types/supabase";

interface UseProfileState {
  profile: ProfileRow | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useProfile(): UseProfileState {
  const supabase = useMemo(() => createClient(), []);
  const { user, isLoading: isAuthLoading } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!user) {
      return;
    }

    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      setError(profileError.message);
      return;
    }

    setError(null);
    setProfile(data ?? null);
    setLoadedUserId(user.id);
  };

  useEffect(() => {
    if (isAuthLoading || !user) {
      return;
    }

    let cancelled = false;

    const fetchOnUserChange = async () => {
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (profileError) {
        setError(profileError.message);
        return;
      }

      setError(null);
      setProfile(data ?? null);
      setLoadedUserId(user.id);
    };

    void fetchOnUserChange();

    return () => {
      cancelled = true;
    };
  }, [isAuthLoading, user, supabase]);

  const isLoading =
    isAuthLoading || (Boolean(user) && loadedUserId !== user?.id && !error);

  return {
    profile: user ? profile : null,
    isLoading,
    error,
    refresh: fetchProfile,
  };
}
