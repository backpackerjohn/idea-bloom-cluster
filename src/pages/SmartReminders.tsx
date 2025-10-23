import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, CheckCircle2, Circle } from "lucide-react";
import { useReminders } from "@/hooks/useReminders";

export default function SmartReminders() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const { reminders, isLoading, addReminder, toggleReminder } = useReminders();

  const [title, setTitle] = useState("");
  const [dueAtLocal, setDueAtLocal] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setIsAuthenticated(true);
      }
    });
  }, [navigate]);

  const pending = useMemo(() => reminders.filter(r => r.status === "pending"), [reminders]);
  const done = useMemo(() => reminders.filter(r => r.status === "done"), [reminders]);

  async function handleAdd() {
    const trimmed = title.trim();
    if (!trimmed) return;
    const iso = dueAtLocal ? new Date(dueAtLocal).toISOString() : null;
    addReminder({ title: trimmed, dueAt: iso });
    setTitle("");
    setDueAtLocal("");
  }

  if (!isAuthenticated) return null;
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-success/20 to-success/5 flex items-center justify-center">
          <Bell className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Smart Reminders</h1>
          <p className="text-muted-foreground">Context-aware reminders with simple scheduling</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add a reminder</CardTitle>
          <CardDescription>Quickly create a reminder with an optional due date/time.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-3">
            <Input
              placeholder="Reminder title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
            />
            <Input
              type="datetime-local"
              value={dueAtLocal}
              onChange={(e) => setDueAtLocal(e.target.value)}
              disabled={isLoading}
            />
            <Button onClick={handleAdd} disabled={isLoading || !title.trim()}>Add</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pending</CardTitle>
            <CardDescription>{pending.length} active</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Loading reminders…</p>
            ) : pending.length === 0 ? (
              <p className="text-muted-foreground text-sm">No pending reminders</p>
            ) : (
              <ul className="space-y-2">
                {pending.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 p-3 border rounded-md">
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => toggleReminder({ id: r.id, done: true })}
                      aria-label="Mark done"
                    >
                      <Circle className="h-5 w-5" />
                    </button>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{r.title}</div>
                      {r.due_at && (
                        <div className="text-xs text-muted-foreground">
                          Due {new Date(r.due_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completed</CardTitle>
            <CardDescription>{done.length} done</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Loading reminders…</p>
            ) : done.length === 0 ? (
              <p className="text-muted-foreground text-sm">No completed reminders</p>
            ) : (
              <ul className="space-y-2">
                {done.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 p-3 border rounded-md">
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => toggleReminder({ id: r.id, done: false })}
                      aria-label="Mark pending"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </button>
                    <div className="flex-1">
                      <div className="text-sm font-medium line-through text-muted-foreground">{r.title}</div>
                      {r.completed_at && (
                        <div className="text-xs text-muted-foreground">
                          Completed {new Date(r.completed_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
