"use client";

import { useIsAuthenticated, useLogout, useMenu } from "@refinedev/core";
import Link from "next/link";

export const Menu = () => {
  const auth = useIsAuthenticated();
  const { mutate: logout } = useLogout();
  const { menuItems, selectedKey } = useMenu();
  const isAuthenticated = auth.data?.authenticated === true;

  return (
    <nav className="menu">
      <ul>
        {menuItems.map((item) => (
          <li key={item.key}>
            <Link
              href={item.route ?? "/"}
              className={selectedKey === item.key ? "active" : ""}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      {!auth.isLoading &&
        (isAuthenticated ? (
          <button onClick={() => logout()} type="button">
            Logout
          </button>
        ) : (
          <Link href="/login">Login</Link>
        ))}
    </nav>
  );
};
