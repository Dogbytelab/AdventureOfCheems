import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Task, UserTask, NFTReservation } from "@shared/schema";

export function useTasks() {
  return useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });
}

export function useUserTasks(userId: string) {
  return useQuery<UserTask[]>({
    queryKey: ["/api/user-tasks", userId],
    enabled: !!userId,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/user-tasks/${userId}`);
      return response.json();
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, taskId }: { userId: string; taskId: string }) => {
      const response = await apiRequest("POST", `/api/user-tasks/${userId}/${taskId}/complete`);
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
    mutationFn: async (reservation: { userId: string; nftType: string; price: number; txHash: string; walletAddress: string; solAmount: string }) => {
      const response = await apiRequest("POST", `/api/nft-reservations/${reservation.userId}`, reservation);
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/nft-reservations", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/nft-supply"] });
    },
  });
}

export function useNFTReservations(userId: string) {
  return useQuery<NFTReservation[]>({
    queryKey: ["/api/nft-reservations", userId],
    enabled: !!userId,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/nft-reservations/${userId}`);
      return response.json();
    },
  });
}
