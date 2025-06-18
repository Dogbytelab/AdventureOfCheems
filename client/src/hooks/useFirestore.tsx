import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Task, UserTask, NFTReservation } from "@shared/schema";

export function useTasks() {
  return useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });
}

export function useUserTasks(userId: number) {
  return useQuery<UserTask[]>({
    queryKey: ["/api/user-tasks", userId],
    enabled: !!userId,
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, taskId }: { userId: number; taskId: number }) => {
      const response = await apiRequest("POST", "/api/user-tasks", { userId, taskId });
      return response.json();
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-tasks", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
  });
}

export function useCreateNFTReservation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (reservation: { userId: string; nftType: string; txHash: string }) => {
      const response = await apiRequest("POST", `/api/nft-reservations/${reservation.userId}`, {
        nftType: reservation.nftType,
        txHash: reservation.txHash
      });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/nft-reservations", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/nft-supply"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", variables.userId] });
    },
  });
}

export function useNFTReservations(userId: string) {
  return useQuery<NFTReservation[]>({
    queryKey: ["/api/nft-reservations", userId],
    enabled: !!userId,
  });
}
