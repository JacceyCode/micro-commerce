"use client";

import {
  CartIcon,
  Heart,
  ProfileIcon,
  SearchIcon,
} from "../../../assets/icons";
import Link from "next/link";
import HeaderBottom from "./header-bottom";
import useUser from "apps/user-ui/src/hooks/useUser";

const Header = () => {
  const { user, isLoading } = useUser();

  return (
    <header className="w-full bg-white">
      <section className="w-[80%] py-5 m-auto flex items-center justify-between">
        <div>
          <Link href={"/"}>
            <span className="text-2xl font-semibold italic">MiCo</span>
          </Link>
        </div>
        <div className="w-[50%] relative">
          <input
            type="text"
            name=""
            id=""
            placeholder="Search for products..."
            className="w-full h-[55px] px-4 font-Poppins font-medium border-[2.5px] border-[#3489FF] outline-none rounded-md"
          />
          <div className="w-[60px] cursor-pointer flex items-center justify-center h-[55px] bg-[#3489FF] absolute top-0 right-0 rounded-r-md">
            <SearchIcon />
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            {!isLoading && user ? (
              <>
                <Link
                  href={"/profile"}
                  className="border-2 w-[50px] h-[50px] flex items-center justify-center rounded-full border-[#010f1c1a]"
                >
                  <ProfileIcon />
                </Link>
                <Link href={"/profile"}>
                  <span className="block font-medium">Hello, </span>
                  <span className="font-semibold">
                    {user?.name?.split(" ")[0]}
                  </span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href={"/login"}
                  className="border-2 w-[50px] h-[50px] flex items-center justify-center rounded-full border-[#010f1c1a]"
                >
                  <ProfileIcon />
                </Link>
                <Link href={"/login"}>
                  <span className="block font-medium">Hello, </span>
                  <span className="font-semibold">
                    {isLoading ? "..." : "Sign In"}
                  </span>
                </Link>
              </>
            )}
          </div>
          <div className="flex items-center gap-5">
            <Link href={"/wishlist"} className="relative">
              <Heart />
              <div className="size-6 border-2 border-white bg-red-500 rounded-full flex items-center justify-center absolute top-[-10px] right-[-10px] text-white font-medium text-sm">
                0
              </div>
            </Link>
            <Link href={"/cart"} className="relative">
              <CartIcon />
              <div className="size-6 border-2 border-white bg-red-500 rounded-full flex items-center justify-center absolute top-[-10px] right-[-10px] text-white font-medium text-sm">
                0
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-b-[#99999938]" />
      <HeaderBottom />
    </header>
  );
};

export default Header;
