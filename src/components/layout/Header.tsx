// components/layout/Header.tsx
import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faUserCircle,
  faChevronDown,
  faRightFromBracket,
  // faUserEdit, // Optional profile icon
} from "@fortawesome/free-solid-svg-icons";
import Button from "../ui/Button"; // Adjust path as needed
import { useAuth } from "../../context/AuthContext"; // Adjust path as needed
import { ROUTES } from "../../lib/constants"; // Adjust path as needed

interface MainNavItemProps {
  href: string;
  label: string;
  isActiveCheck?: (pathname: string, href: string) => boolean;
}

interface HeaderProps {
  title: string;
  titleLink?: string;
  onOpenSidebar?: () => void;
  isAuthenticated: boolean;
  onLogout: () => void;
  // Make profileRoute required or provide a more specific default if needed
  // For safety, keeping a default, but layouts *should* pass the correct one
  profileRoute?: string; // Explicitly expect a profile route
  mainNavItems?: MainNavItemProps[];
}

const HeaderNavLink: React.FC<MainNavItemProps> = ({
  href,
  label,
  isActiveCheck,
}) => {
  const location = useLocation();
  const pathname = location.pathname;
  const isActive = isActiveCheck
    ? isActiveCheck(pathname, href)
    : pathname.startsWith(href);

  return (
    <li>
      <Link
        to={href}
        className={`flex items-center px-2 py-1 rounded text-sm font-medium transition-colors ${
          isActive
            ? "text-golden-accent bg-dark-tertiary"
            : "text-text-secondary hover:text-text-primary hover:bg-dark-tertiary"
        }`}
      >
        {label}
      </Link>
    </li>
  );
};

const Header: React.FC<HeaderProps> = ({
  title,
  titleLink = "#",
  onOpenSidebar,
  isAuthenticated,
  onLogout,
  profileRoute = "", // Receive the specific profile route
  mainNavItems,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  const closeDropdown = () => {
    setIsDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        closeDropdown();
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleProfileClick = () => {
    closeDropdown();
  };

  const handleLogoutClick = () => {
    closeDropdown();
    onLogout();
  };

  const { user } = useAuth(); // Get user details for dropdown header if needed

  return (
    <header className="bg-dark-secondary shadow-sm h-16 flex items-center justify-between px-6 py-4 w-full sticky top-0 z-30 border-b border-dark-tertiary flex-shrink-0">
      <div className="flex items-center h-full">
        {onOpenSidebar && (
          <button
            onClick={onOpenSidebar}
            className="text-text-secondary hover:text-text-primary focus:outline-none lg:hidden mr-4 rounded-full p-2 bg-dark-tertiary hover:bg-dark-border transition-colors duration-150 ease-in-out"
            aria-label="Open sidebar"
          >
            <FontAwesomeIcon icon={faBars} size="lg" />
          </button>
        )}

        <Link
          to={titleLink}
          className="text-xl font-bold text-golden-accent hover:text-golden-accent-hover transition-colors duration-150 ease-in-out"
        >
          {title}
        </Link>
      </div>

      <div className="flex items-center space-x-3 sm:space-x-4 h-full">
        {mainNavItems && !onOpenSidebar && (
          <ul className="flex items-center space-x-3 sm:space-x-4">
            {mainNavItems.map((item) => (
              <HeaderNavLink key={item.href} {...item} />
            ))}
          </ul>
        )}

        {isAuthenticated && (
          <div className="relative h-full flex items-center z-40">
            <button
              ref={buttonRef}
              onClick={toggleDropdown}
              className="flex items-center text-text-secondary hover:text-text-primary focus:outline-none rounded-full px-3 py-2 bg-dark-tertiary hover:bg-dark-border transition-colors duration-150 ease-in-out"
              aria-label="User menu"
              aria-haspopup="true"
              aria-expanded={isDropdownOpen}
            >
              <FontAwesomeIcon
                icon={faUserCircle}
                size="lg"
                className="h-6 w-6 flex-shrink-0"
              />
              <FontAwesomeIcon
                icon={faChevronDown}
                className={`ml-1 h-3 w-3 transition-transform duration-200 ease-in-out ${
                  isDropdownOpen ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>

            {isDropdownOpen && (
              <div
                ref={dropdownRef}
                className="absolute right-0 top-full mt-3 w-52 bg-dark-secondary rounded-lg shadow-xl focus:outline-none z-50 border border-dark-tertiary"
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="user-menu-button"
              >
                {/* Profile Link uses the passed profileRoute prop */}
                {profileRoute && (
                  <Link
                    to={profileRoute}
                    onClick={handleProfileClick}
                    className="flex items-center px-4 py-2 text-sm text-text-primary hover:bg-dark-tertiary transition-colors duration-100 ease-in-out"
                    role="menuitem"
                  >
                    {/* Optional: Profile Icon */}
                    {/* <FontAwesomeIcon icon={faUserEdit} className="mr-2 h-4 w-4" /> */}
                    My Profile
                  </Link>
                )}

                <button
                  onClick={handleLogoutClick}
                  className="flex items-center w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-dark-tertiary transition-colors duration-100 ease-in-out"
                  role="menuitem"
                >
                  <FontAwesomeIcon
                    icon={faRightFromBracket}
                    className="mr-2 h-4 w-4"
                  />
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
