import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  due_at: string | null;
  status: "pending" | "done";
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export function useReminders() {
  const queryClient = useQueryClient();

  const { data: reminders = [], isLoading } = useQuery<Reminder[]>({
    queryKey: ["reminders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .order("status", { ascending: true })
        .order("due_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Reminder[];
    },
  });

  const addReminder = useMutation({
    mutationFn: async ({ title, dueAt }: { title: string; dueAt: string | null }) => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("reminders")
        .insert({ user_id: userId, title, due_at: dueAt, status: "pending" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
    },
  });

  const toggleReminder = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase
        .from("reminders")
        .update({ status: done ? "done" : "pending", completed_at: done ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
    },
  });

  return { reminders, isLoading, addReminder: addReminder.mutate, toggleReminder: toggleReminder.mutate };
}
