import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types.generated";
import { toast } from "@/hooks/use-toast";

export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"] & {
  usage_count?: number;
};

export function useCategories() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("categories")
        .select("*, usage_count:thought_categories(count)")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      // Map usage_count from nested select
      const mapped = (data || []).map((c: any) => ({
        ...c,
        usage_count: Array.isArray(c.usage_count) && c.usage_count[0] ? Number(c.usage_count[0].count) : 0,
      }));
      setCategories(mapped);
    } catch (e) {
      console.error(e);
      toast({ title: "Failed to load categories", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const createCategory = useCallback(async (name: string, color?: string | null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const maxOrder = categories.reduce((m, c) => Math.max(m, c.sort_order ?? 0), 0);
      const { data, error } = await supabase
        .from("categories")
        .insert({ user_id: user.id, name, color: color ?? null, sort_order: maxOrder + 1 })
        .select()
        .single();
      if (error) throw error;
      toast({ title: "Category created" });
      await fetchCategories();
      return data as CategoryRow;
    } catch (_) {
      toast({ title: "Failed to create category", variant: "destructive" });
      return null;
    }
  }, [categories, fetchCategories]);

  const updateCategory = useCallback(async (id: string, updates: Partial<Pick<CategoryRow, "name" | "color">>) => {
    try {
      const { error } = await supabase
        .from("categories")
        .update({ ...updates })
        .eq("id", id);
      if (error) throw error;
      await fetchCategories();
    } catch (_) {
      toast({ title: "Failed to update category", variant: "destructive" });
    }
  }, [fetchCategories]);

  const deleteCategory = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
      await fetchCategories();
    } catch (_) {
      toast({ title: "Failed to delete category", variant: "destructive" });
    }
  }, [fetchCategories]);

  const moveCategory = useCallback(async (id: string, direction: "up" | "down") => {
    const idx = categories.findIndex((c) => c.id === id);
    if (idx === -1) return;
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= categories.length) return;

    const a = categories[idx];
    const b = categories[swapWith];

    try {
      const { error: e1 } = await supabase
        .from("categories")
        .update({ sort_order: b.sort_order ?? 0 })
        .eq("id", a.id);
      const { error: e2 } = await supabase
        .from("categories")
        .update({ sort_order: a.sort_order ?? 0 })
        .eq("id", b.id);
      if (e1 || e2) throw new Error("Reorder failed");
      await fetchCategories();
    } catch (_) {
      toast({ title: "Failed to reorder", variant: "destructive" });
    }
  }, [categories, fetchCategories]);

  return {
    categories,
    loading,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    moveCategory,
  };
}
