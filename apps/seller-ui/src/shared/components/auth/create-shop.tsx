import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import axios, { AxiosError } from "axios";
import { categories } from "apps/seller-ui/src/utils/categories";

const CreateShop = ({
  sellerId,
  setActiveStep,
}: {
  sellerId: string;
  setActiveStep: (step: number) => void;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const createShopMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URI}/auth/create-shop`,
        data
      );

      return response.data;
    },
    onSuccess: () => setActiveStep(3),
  });

  const onSubmit = (data: any) => {
    const shopData = {
      ...data,
      sellerId,
    };

    createShopMutation.mutate(shopData);
  };

  const countWords = (text: string) => text.trim().split(/\s+/).length;

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <h3 className="text-2xl font-semibold text-center mb-4">
          Setup New Shop
        </h3>

        {/* Shop name */}
        <label className="block text-gray-700 mb-1">Shop name</label>
        <input
          type="text"
          placeholder="Shop name"
          className="w-full p-2 border border-gray-300 outline-0 !rounded mb-1"
          {...register("name", {
            required: "Name is required",
          })}
        />
        {errors.name && (
          <p className="text-red-500 text-sm mb-2">
            {String(errors.name.message)}
          </p>
        )}

        {/* Shop Bio */}
        <label className="block text-gray-700 mb-1">
          Shop Bio (100 words max)
        </label>
        <input
          type="text"
          placeholder="Shop bio..."
          className="w-full p-2 border border-gray-300 outline-0 !rounded mb-1"
          {...register("bio", {
            required: "Shop bio is required",
            validate: (value) =>
              countWords(value) <= 100 || "Bio must be 100 words or less",
          })}
        />
        {errors.bio && (
          <p className="text-red-500 text-sm mb-2">
            {String(errors.bio.message)}
          </p>
        )}

        {/* Shop address */}
        <label className="block text-gray-700 mb-1">Shop Address</label>
        <input
          type="text"
          placeholder="Shop address"
          className="w-full p-2 border border-gray-300 outline-0 !rounded mb-1"
          {...register("address", {
            required: "Shop address is required",
          })}
        />
        {errors.address && (
          <p className="text-red-500 text-sm mb-2">
            {String(errors.address.message)}
          </p>
        )}

        {/* Shop opening hours */}
        <label className="block text-gray-700 mb-1">Shop Opening Hours</label>
        <input
          type="text"
          placeholder="e.g., Mon-Fri: 9AM - 6PM"
          className="w-full p-2 border border-gray-300 outline-0 !rounded mb-1"
          {...register("opening_hours", {
            required: "Shop opening hours are required",
          })}
        />
        {errors.opening_hours && (
          <p className="text-red-500 text-sm mb-2">
            {String(errors.opening_hours.message)}
          </p>
        )}

        {/* Website */}
        <label className="block text-gray-700 mb-1">Website</label>
        <input
          type="url"
          placeholder="https://example.com"
          className="w-full p-2 border border-gray-300 outline-0 !rounded mb-1"
          {...register("website", {
            pattern: {
              value: /^(https?:\/\/)?([\w\d-]+\.)+\w{2,}(\/.*)?$/,
              message: "Enter a valid URL",
            },
          })}
        />
        {errors.website && (
          <p className="text-red-500 text-sm mb-2">
            {String(errors.website.message)}
          </p>
        )}

        {/* Categories */}
        <label className="block text-gray-700 mb-1">Category</label>
        <select
          className="w-full p-2 border border-gray-300 outline-0 rounded-[4px] mb-1"
          {...register("category", {
            required: "Category is required",
          })}
        >
          <option value="">Select a category</option>
          {categories.map((category) => (
            <option value={category.value} key={category.value}>
              {category.label}
            </option>
          ))}
        </select>
        {errors.categories && (
          <p className="text-red-500 text-sm">
            {String(errors.categories.message)}
          </p>
        )}

        <button
          type="submit"
          className="w-full text-lg cursor-pointer mt-4 bg-blue-600 text-white py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={createShopMutation.isPending}
        >
          {createShopMutation.isPending ? "Creating Shop..." : "Create Shop"}
        </button>

        {createShopMutation.isError &&
          createShopMutation.error instanceof AxiosError && (
            <p className="text-red-500 text-sm mt-2">
              {createShopMutation.error.response?.data.message ||
                createShopMutation.error.message}
            </p>
          )}
      </form>
    </div>
  );
};

export default CreateShop;
