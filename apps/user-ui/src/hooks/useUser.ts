// fetch user data from API

import { useQuery } from "@tanstack/react-query";
import axiosInstance from "../utils/axiosInstance";

const fetchUser = async () => {
  const response = await axiosInstance.get("/auth/logged-in-user");

  return response.data.user;
};

const useUser = () => {
  const {
    data: user,
    error,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["user"],
    queryFn: fetchUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Retry once on failure
  });

  return { user, error, isLoading, isError, refetch };
};

export default useUser;
