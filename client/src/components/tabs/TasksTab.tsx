import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { User, Task, UserTask } from "@shared/schema";

export default function TasksTab() {
  const { firebaseUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery<User>({
    queryKey: ["/api/users", firebaseUser?.uid],
    enabled: !!firebaseUser?.uid,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/users/${firebaseUser?.uid}`);
      return response.json();
    }
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/tasks");
      return response.json();
    }
  });

  const { data: userTasks = [], refetch: refetchUserTasks } = useQuery<UserTask[]>({
    queryKey: ["/api/user-tasks", user?.uid],
    enabled: !!user?.uid,
  });

  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  const handleOpenTask = (taskId: string, url: string) => {
    // Open the task URL in a new tab
    window.open(url, "_blank");
    // Mark task as opened
    setCompletedTasks(prev => new Set([...prev, taskId]));
  };

  const handleClaimPoints = async (taskId: string) => {
    if (!user) return;

    try {
      const response = await apiRequest("POST", `/api/user-tasks/${user?.uid}/${taskId}/claim`);
      if (response.ok) {
        toast({
          title: "Points Claimed!",
          description: "You've earned 1000 AOC Points!",
        });

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/users", user.uid] });
        queryClient.invalidateQueries({ queryKey: ["/api/user-tasks", user.uid] });

        // Remove from completed tasks set
        setCompletedTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
      } else {
        throw new Error("Failed to claim points");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to claim points. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isTaskCompleted = (taskId: string) => {
    return userTasks.some(ut => ut.taskId === taskId && ut.completed);
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "twitter":
        return "🐦";
      case "instagram":
        return "📷";
      case "telegram":
        return "✈️";
      default:
        return "📱";
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "twitter":
        return "bg-blue-500";
      case "instagram":
        return "bg-pink-500";
      case "telegram":
        return "bg-blue-400";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <motion.h2
        className="text-3xl font-retro text-accent mb-8 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        TASKS
      </motion.h2>

      <div className="space-y-4">
        {tasks.map((task, index) => {
          const completed = isTaskCompleted(task.id);

          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card className="glass-effect border-gray-700/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 ${getPlatformColor(task.platform)} rounded-full flex items-center justify-center`}>
                        <span className="text-white text-xl">
                          {getPlatformIcon(task.platform)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{task.name}</h3>
                        <p className="text-text-secondary">{task.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-success font-bold">+{task.points} AOCp</span>
                      {completed ? (
                        <div className="text-success flex items-center gap-2">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm">Completed</span>
                        </div>
                      ) : completedTasks.has(task.id) ? (
                        <Button
                          onClick={() => handleClaimPoints(task.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
                        >
                          Claim Points
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleOpenTask(task.id, task.url)}
                          className="bg-accent hover:bg-accent/80 text-white px-6 py-2"
                        >
                          Complete Task
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {tasks.length === 0 && (
        <div className="text-center text-text-secondary py-12">
          <div className="text-6xl mb-4">📝</div>
          <p className="text-xl">No tasks available at the moment.</p>
          <p className="text-sm mt-2">Check back later for new opportunities to earn AOC Points!</p>
        </div>
      )}
    </div>
  );
}