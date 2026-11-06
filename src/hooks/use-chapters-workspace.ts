"use client";

/**
 * use-chapters-workspace.ts - Authenticated & Preview Data Hook for Chapters (Memory).
 *
 * Implements the Memory layer of DueLine's product loop:
 * Ambition -> Action -> Evidence -> Memory
 *
 * Architecture & Security:
 * - Sealed chapters do NOT expose their confidential payload to the client.
 * - Ready-to-unlock chapters undergo a deliberate reveal operation (revealChapter)
 *   that sets unlocked_at before the message is presented.
 * - Reflections are strictly separate from the original unalterable message.
 * - Automatically interfaces with Supabase RPCs when configured, or seamlessly
 *   provides a persistent local-development preview adapter (localStorage)
 *   when backend Migration 0007 is pending deployment.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  groupChapterSections,
  validateChapterCreation,
  validateChapterReflection,
  type Chapter,
  type ChapterCategory,
  type ChapterSectionsResult,
} from "@/lib/dashboard-calculations";

export type ChaptersFilter = "all" | "ready_to_unlock" | "sealed" | "past";

const LOCAL_STORAGE_CHAPTERS_KEY = "dueline_chapters_preview_v2";
const LOCAL_STORAGE_MESSAGES_KEY = "dueline_chapter_messages_preview_v2";

/**
 * Initial curated showcase data for local development and preview mode.
 */
function getInitialSampleData(): { chapters: Chapter[]; messages: Record<string, string> } {
  const now = new Date();

  // 1. Ready to Unlock: Scheduled for 2 hours ago
  const readyUnlockDate = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  // 2. Sealed: Scheduled for 45 days in the future
  const sealedUnlockDate = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString();
  // 3. Past Unlocked (with reflection): Unlocked 10 days ago
  const pastWithReflUnlockDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const pastWithReflUnlockedAt = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
  // 4. Past Unlocked (awaiting reflection): Unlocked yesterday
  const pastAwaitingReflUnlockDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const pastAwaitingReflUnlockedAt = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();

  const chapters: Chapter[] = [
    {
      id: "ch-ready-01",
      owner_id: "demo-user",
      title: "Checkpoint: The Shift from Chaos to Deterministic Risk",
      category: "milestone",
      unlock_at: readyUnlockDate,
      unlocked_at: null,
      reflection: null,
      reflection_recorded_at: null,
      created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: readyUnlockDate,
    },
    {
      id: "ch-sealed-01",
      owner_id: "demo-user",
      title: "Letter to Myself at DueLine 1.0 Launch",
      category: "letter",
      unlock_at: sealedUnlockDate,
      unlocked_at: null,
      reflection: null,
      reflection_recorded_at: null,
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "ch-past-01",
      owner_id: "demo-user",
      title: "Founding Conviction: Building for Clarity, Not Addiction",
      category: "mindset",
      unlock_at: pastWithReflUnlockDate,
      unlocked_at: pastWithReflUnlockedAt,
      reflection:
        "Reading this now, I feel profound gratitude that we resisted dopamine hooks, badges, and noisy feeds. The Growth & Clarity design tokens and private evidence log feel enduring and calm.",
      reflection_recorded_at: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: pastWithReflUnlockedAt,
    },
    {
      id: "ch-past-02",
      owner_id: "demo-user",
      title: "Reflections on Architecture: Separation of Workspaces",
      category: "reflection",
      unlock_at: pastAwaitingReflUnlockDate,
      unlocked_at: pastAwaitingReflUnlockedAt,
      reflection: null,
      reflection_recorded_at: null,
      created_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: pastAwaitingReflUnlockedAt,
    },
  ];

  const messages: Record<string, string> = {
    "ch-ready-01":
      "If you're reading this, the time has arrived. Remember when estimated hours were just guesses and every deadline felt like an emergency? You committed to deterministic risk calculation and verifiable milestones. Don't let complacency slip back in. Keep execution rigorous and honest.",
    "ch-sealed-01":
      "Congratulations on reaching the 1.0 milestone. Look around at what you created: a serene productivity space that treats users as sovereign individuals, not ad targets. Take a full breath today. Be proud of the discipline it took.",
    "ch-past-01":
      "Today we decided: zero gamified streaks that guilt-trip you, zero social comparison feeds, and zero speculative AI summaries of your life. Build the deterministic risk engine first. Keep every step verifiable. Trust that serious creators want clarity over noise.",
    "ch-past-02":
      "We just completed the split between Today (Daily Execution), Goals (Ambition), and Journey (Evidence). Today is for ruthless focus. Journey is for quiet reflection. Make sure they never bleed into each other or create mental clutter.",
  };

  return { chapters, messages };
}

interface SupabaseRpcCaller {
  rpc: (
    fn: string,
    params: Record<string, unknown>
  ) => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
}

export function useChaptersWorkspace() {
  const { user, isAuthenticated, isConfigured, loading: authLoading } = useAuth();
  const isLocalPreview = !isAuthenticated || !isConfigured;

  // Deterministic initial state guarantees identical server and client initial render
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [activeFilter, setActiveFilter] = useState<ChaptersFilter>("all");
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(isAuthenticated && isConfigured));
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Hydrate preview mode data safely after initial client mount when unauthenticated/unconfigured
  useEffect(() => {
    if (!isLocalPreview) return;
    try {
      const storedC = localStorage.getItem(LOCAL_STORAGE_CHAPTERS_KEY);
      const storedM = localStorage.getItem(LOCAL_STORAGE_MESSAGES_KEY);
      if (storedC && storedM) {
        setChapters(JSON.parse(storedC));
        setMessages(JSON.parse(storedM));
      } else {
        const sample = getInitialSampleData();
        setChapters(sample.chapters);
        setMessages(sample.messages);
        try {
          localStorage.setItem(LOCAL_STORAGE_CHAPTERS_KEY, JSON.stringify(sample.chapters));
          localStorage.setItem(LOCAL_STORAGE_MESSAGES_KEY, JSON.stringify(sample.messages));
        } catch {}
      }
    } catch {
      const sample = getInitialSampleData();
      setChapters(sample.chapters);
      setMessages(sample.messages);
    }
  }, [isLocalPreview]);

  // Load cloud chapters when authenticated and configured
  useEffect(() => {
    if (authLoading || isLocalPreview || !user) {
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Supabase client not configured.");
      setIsLoading(false);
      return;
    }

    let isSubscribed = true;
    setIsLoading(true);

    async function loadCloudChapters() {
      try {
        const { data, error: queryError } = await (supabase as unknown as {
          from: (table: string) => {
            select: (cols: string) => {
              eq: (col: string, val: string) => {
                order: (col: string, opt: { ascending: boolean }) => Promise<{
                  data: Chapter[] | null;
                  error: { message: string } | null;
                }>;
              };
            };
          };
        })
          .from("chapters")
          .select("id, owner_id, title, category, unlock_at, unlocked_at, reflection, reflection_recorded_at, created_at, updated_at")
          .eq("owner_id", user!.id)
          .order("created_at", { ascending: false });

        if (!isSubscribed) return;

        if (queryError) {
          setError(queryError.message || "Failed to load chapters from cloud.");
          setChapters([]);
          setMessages({});
        } else {
          setChapters(data ?? []);
          setMessages({});
          setError(null);
        }
      } catch (err) {
        if (!isSubscribed) return;
        const msg = err instanceof Error ? err.message : "Failed to load cloud chapters";
        setError(msg);
        setChapters([]);
        setMessages({});
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    loadCloudChapters();

    return () => {
      isSubscribed = false;
    };
  }, [authLoading, isLocalPreview, user, refreshKey]);

  // Save changes to localStorage strictly when in local preview mode
  const syncToStorage = useCallback((updatedChapters: Chapter[], updatedMessages: Record<string, string>) => {
    if (!isLocalPreview) return;
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_CHAPTERS_KEY, JSON.stringify(updatedChapters));
        localStorage.setItem(LOCAL_STORAGE_MESSAGES_KEY, JSON.stringify(updatedMessages));
      }
    } catch (err) {
      console.warn("Failed to persist chapters preview to storage:", err);
    }
  }, [isLocalPreview]);

  /**
   * Categorizes chapters into the 3 canonical sections:
   * 1. Sealed
   * 2. Ready to Unlock
   * 3. Past / Unlocked
   */
  const sections: ChapterSectionsResult = useMemo(() => {
    return groupChapterSections(chapters, new Date());
  }, [chapters]);

  /**
   * Filtered list of chapters based on current active tab.
   */
  const filteredChapters = useMemo(() => {
    if (activeFilter === "ready_to_unlock") {
      return sections.readyToUnlock;
    }
    if (activeFilter === "sealed") {
      return sections.sealed;
    }
    if (activeFilter === "past") {
      return sections.past;
    }
    // "all": ready to unlock first, then sealed, then past
    return [...sections.readyToUnlock, ...sections.sealed, ...sections.past];
  }, [activeFilter, sections]);

  /**
   * Creates and seals a new Chapter into the time capsule.
   */
  const createChapter = useCallback(
    async (payload: {
      title: string;
      category: ChapterCategory;
      unlockAtIso: string;
      message: string;
    }): Promise<{ success: boolean; error?: string; chapter?: Chapter }> => {
      setError(null);

      // Validate inputs strictly using pure domain rules
      const validation = validateChapterCreation(
        {
          title: payload.title,
          category: payload.category,
          unlockAtIso: payload.unlockAtIso,
          message: payload.message,
        },
        new Date()
      );

      if (!validation.isValid) {
        return { success: false, error: validation.errors[0] };
      }

      // Cloud Supabase RPC execution when configured and authenticated
      if (!isLocalPreview && isConfigured && isAuthenticated) {
        const supabase = getSupabaseClient();
        if (!supabase) {
          const err = "Supabase client not configured.";
          setError(err);
          return { success: false, error: err };
        }

        try {
          const rpcCaller = supabase as unknown as SupabaseRpcCaller;
          const { data, error: rpcError } = await rpcCaller.rpc("create_chapter", {
            p_title: payload.title.trim(),
            p_category: payload.category,
            p_unlock_at: payload.unlockAtIso,
            p_message_payload: payload.message.trim(),
          });

          if (rpcError) {
            setError(rpcError.message);
            return { success: false, error: rpcError.message };
          }

          if (data) {
            const newChapter: Chapter = {
              id: String(data.id),
              owner_id: user?.id || "auth-user",
              title: String(data.title),
              category: data.category as ChapterCategory,
              unlock_at: String(data.unlock_at),
              unlocked_at: null,
              reflection: null,
              reflection_recorded_at: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            setChapters((prev) => [newChapter, ...prev]);
            return { success: true, chapter: newChapter };
          }
          const noDataErr = "No data returned from create_chapter RPC.";
          setError(noDataErr);
          return { success: false, error: noDataErr };
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to execute create_chapter RPC.";
          setError(msg);
          return { success: false, error: msg };
        }
      }

      // Local Preview Adapter Creation (Strictly isolated to unauthenticated preview mode)
      const newId = `ch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const nowIso = new Date().toISOString();

      const newChapter: Chapter = {
        id: newId,
        owner_id: user?.id || "demo-user",
        title: payload.title.trim(),
        category: payload.category,
        unlock_at: payload.unlockAtIso,
        unlocked_at: null,
        reflection: null,
        reflection_recorded_at: null,
        created_at: nowIso,
        updated_at: nowIso,
      };

      const nextChapters = [newChapter, ...chapters];
      const nextMessages = { ...messages, [newId]: payload.message.trim() };

      setChapters(nextChapters);
      setMessages(nextMessages);
      syncToStorage(nextChapters, nextMessages);

      return { success: true, chapter: newChapter };
    },
    [chapters, messages, syncToStorage, isLocalPreview, isConfigured, isAuthenticated, user]
  );

  /**
   * Breaks the seal and unlocks a chapter whose unlock time has arrived.
   */
  const revealChapter = useCallback(
    async (chapterId: string): Promise<{ success: boolean; payload?: string; error?: string }> => {
      setError(null);
      const target = chapters.find((c) => c.id === chapterId);
      if (!target) {
        return { success: false, error: "Chapter not found." };
      }

      const unlockTime = new Date(target.unlock_at).getTime();
      if (Date.now() < unlockTime) {
        return {
          success: false,
          error: "Cannot reveal chapter before the scheduled unlock timestamp.",
        };
      }

      // Cloud Supabase RPC execution when configured and authenticated
      if (!isLocalPreview && isConfigured && isAuthenticated) {
        const supabase = getSupabaseClient();
        if (!supabase) {
          const err = "Supabase client not configured.";
          setError(err);
          return { success: false, error: err };
        }

        try {
          const rpcCaller = supabase as unknown as SupabaseRpcCaller;
          const { data, error: rpcError } = await rpcCaller.rpc("reveal_chapter", {
            p_chapter_id: chapterId,
          });

          if (rpcError) {
            setError(rpcError.message);
            return { success: false, error: rpcError.message };
          }

          if (data) {
            const revealedPayload = String(data.message_payload);
            const unlockedAt = String(data.unlocked_at);

            setChapters((prev) =>
              prev.map((c) => (c.id === chapterId ? { ...c, unlocked_at: unlockedAt } : c))
            );
            return { success: true, payload: revealedPayload };
          }
          const noDataErr = "No data returned from reveal_chapter RPC.";
          setError(noDataErr);
          return { success: false, error: noDataErr };
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to execute reveal_chapter RPC.";
          setError(msg);
          return { success: false, error: msg };
        }
      }

      // Local Preview Adapter Reveal (Strictly isolated to unauthenticated preview mode)
      const nowIso = new Date().toISOString();
      const updatedChapters = chapters.map((c) =>
        c.id === chapterId ? { ...c, unlocked_at: c.unlocked_at || nowIso } : c
      );

      const payload = messages[chapterId] || "Your sealed message has been revealed.";

      setChapters(updatedChapters);
      syncToStorage(updatedChapters, messages);

      return { success: true, payload };
    },
    [chapters, messages, syncToStorage, isLocalPreview, isConfigured, isAuthenticated]
  );

  /**
   * Records a present-day revisit reflection on an unlocked Chapter.
   */
  const recordReflection = useCallback(
    async (
      chapterId: string,
      reflectionText: string
    ): Promise<{ success: boolean; error?: string }> => {
      setError(null);

      const validation = validateChapterReflection(reflectionText);
      if (!validation.isValid) {
        return { success: false, error: validation.errors[0] };
      }

      const target = chapters.find((c) => c.id === chapterId);
      if (!target) {
        return { success: false, error: "Chapter not found." };
      }

      if (!target.unlocked_at) {
        return { success: false, error: "Cannot record reflection on a sealed chapter." };
      }

      if (target.reflection) {
        return {
          success: false,
          error: "A reflection has already been recorded for this chapter and cannot be overwritten.",
        };
      }

      // Cloud Supabase RPC execution when configured and authenticated
      if (!isLocalPreview && isConfigured && isAuthenticated) {
        const supabase = getSupabaseClient();
        if (!supabase) {
          const err = "Supabase client not configured.";
          setError(err);
          return { success: false, error: err };
        }

        try {
          const rpcCaller = supabase as unknown as SupabaseRpcCaller;
          const { data, error: rpcError } = await rpcCaller.rpc("record_chapter_reflection", {
            p_chapter_id: chapterId,
            p_reflection: reflectionText.trim(),
          });

          if (rpcError) {
            setError(rpcError.message);
            return { success: false, error: rpcError.message };
          }

          if (data) {
            setChapters((prev) =>
              prev.map((c) =>
                c.id === chapterId
                  ? {
                      ...c,
                      reflection: String(data.reflection),
                      reflection_recorded_at: String(data.reflection_recorded_at),
                    }
                  : c
              )
            );
            return { success: true };
          }
          const noDataErr = "No data returned from record_chapter_reflection RPC.";
          setError(noDataErr);
          return { success: false, error: noDataErr };
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to execute record_chapter_reflection RPC.";
          setError(msg);
          return { success: false, error: msg };
        }
      }

      // Local Preview Adapter Reflection Recording (Strictly isolated to unauthenticated preview mode)
      const nowIso = new Date().toISOString();
      const updatedChapters = chapters.map((c) =>
        c.id === chapterId
          ? {
              ...c,
              reflection: reflectionText.trim(),
              reflection_recorded_at: nowIso,
            }
          : c
      );

      setChapters(updatedChapters);
      syncToStorage(updatedChapters, messages);

      return { success: true };
    },
    [chapters, messages, syncToStorage, isLocalPreview, isConfigured, isAuthenticated]
  );

  /**
   * Fetches the confidential message payload for an unlocked chapter.
   */
  const getChapterMessage = useCallback(
    (chapterId: string): string | null => {
      const chapter = chapters.find((c) => c.id === chapterId);
      if (!chapter || !chapter.unlocked_at) {
        return null;
      }
      return messages[chapterId] || null;
    },
    [chapters, messages]
  );

  /**
   * Resets local preview data back to the clean showcase sample state.
   */
  const resetPreviewData = useCallback(() => {
    if (!isLocalPreview) return;
    const sample = getInitialSampleData();
    setChapters(sample.chapters);
    setMessages(sample.messages);
    syncToStorage(sample.chapters, sample.messages);
  }, [isLocalPreview, syncToStorage]);

  const refreshChapters = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return {
    chapters,
    filteredChapters,
    sections,
    activeFilter,
    setActiveFilter,
    createChapter,
    revealChapter,
    recordReflection,
    getChapterMessage,
    resetPreviewData,
    refreshChapters,
    error,
    isLoading,
    isLocalPreview,
  };
}
