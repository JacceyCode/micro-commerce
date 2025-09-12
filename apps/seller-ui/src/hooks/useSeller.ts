// fetch user data from API

import { useQuery } from "@tanstack/react-query";
import axiosInstance from "../utils/axiosInstance";

const fetchSeller = async () => {
  const response = await axiosInstance.get("/auth/logged-in-seller");

  return response.data.seller;
};

const useSeller = () => {
  const {
    data: seller,
    error,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["seller"],
    queryFn: fetchSeller,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Retry once on failure
  });

  return { seller, error, isLoading, isError, refetch };
};

export default useSeller;
