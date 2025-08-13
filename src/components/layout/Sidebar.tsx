// components/layout/Sidebar.tsx
import React, { useEffect, useState, useRef } from "react";
import { useLocation, Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faChevronLeft,
  // Add default collapsed icon here or accept via prop
} from "@fortawesome/free-solid-svg-icons";
// import { ROUTES } from "../../lib/constants"; // Not directly used in Sidebar, paths come from menuItems

// Props for each item in the menuItems array
interface MenuItemProps {
  href: string;
  label: string;
  icon?: React.ReactNode;
  isActiveCheck?: (pathname: string, href: string) => boolean;
}

// NavItem Component (defined inside Sidebar file)
interface NavItemComponentProps extends MenuItemProps {
  isTextHidden?: boolean; // True if sidebar is collapsed (desktop) and text should be hidden
  onLinkClick?: () => void; // To handle mobile menu close
}

const NavItem: React.FC<NavItemComponentProps> = ({
  href,
  label,
  icon,
  isActiveCheck,
  isTextHidden,
  onLinkClick,
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
        onClick={onLinkClick}
        // Added h-[40px] for consistent height
        className={`flex items-center px-3 py-2.5 text-sm rounded-md transition-colors duration-150 ease-in-out group w-full h-[40px] ${
          isActive
            ? "bg-golden-accent text-text-on-accent font-medium shadow-inner"
            : "text-text-secondary hover:text-text-primary hover:bg-dark-tertiary"
        } ${isTextHidden ? "justify-center" : ""}`}
        aria-current={isActive ? "page" : undefined}
        title={isTextHidden ? label : undefined}
      >
        {icon && (
          <span
            className={`h-5 w-5 flex-shrink-0 ${
              isActive
                ? "text-text-on-accent"
                : "text-text-secondary group-hover:text-text-primary"
            } ${!isTextHidden ? "mr-3" : "mr-0"}`} // Apply mr-3 only when text is visible
          >
            {icon}
          </span>
        )}
        {!isTextHidden && <span className="truncate">{label}</span>}
      </Link>
    </li>
  );
};

// Props for the main Sidebar component
interface SidebarProps {
  // Sidebar Header
  title: string; // Text title for the header when expanded
  collapsedIcon?: React.ReactNode; // Icon or short text for the header when collapsed
  headerLink?: string; // Link for the header title/icon

  // Navigation Items
  menuItems: MenuItemProps[]; // Array of navigation links

  // Mobile state control (passed from parent Layout)
  isOpen?: boolean; // Controls visibility on small screens
  onClose?: () => void; // Callback to close sidebar

  // Optional: Pass function to call on link click (useful for mobile close)
  onLinkClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  title,
  collapsedIcon = <span className="text-2xl font-bold">S</span>, // Default collapsed icon (can be overridden)
  headerLink = "#", // Default link for the header
  menuItems,
  isOpen = false,
  onClose,
  onLinkClick,
}) => {
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showExpandedContent, setShowExpandedContent] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkMobileView = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint
      setIsMobileView(mobile);
      // If resizing from mobile (open) to desktop, ensure mobile overlay state is closed
      if (!mobile && isOpen && onClose) {
        onClose();
      }
    };

    checkMobileView();
    window.addEventListener("resize", checkMobileView);
    return () => {
      window.removeEventListener("resize", checkMobileView);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (isMobileView) {
      // On mobile, expanded content follows mobile menu state
      setShowExpandedContent(isOpen);
    } else {
      // Desktop view
      if (isDesktopCollapsed) {
        // Collapsing: Hide expanded content after a delay
        timeoutRef.current = setTimeout(
          () => setShowExpandedContent(false),
          100
        ); // Shorter delay for content to disappear
      } else {
        // Expanding: Show expanded content immediately
        setShowExpandedContent(true);
      }
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isDesktopCollapsed, isMobileView, isOpen]);

  const currentTextHiddenState = isMobileView ? !isOpen : !showExpandedContent;

  const toggleDesktopSidebar = () => {
    if (!isMobileView) {
      setIsDesktopCollapsed((prev) => !prev);
    }
  };

  // Dynamically build sidebar classes
  const sidebarBaseClasses =
    "z-50 bg-dark-secondary border-r border-dark-tertiary flex flex-col transition-all duration-300 ease-in-out";
  let sidebarDynamicClasses = "";

  if (isMobileView) {
    sidebarDynamicClasses = `fixed h-full top-0 left-0 ${
      isOpen
        ? "w-[200px] translate-x-0"
        : "w-0 -translate-x-full border-transparent overflow-hidden"
    }`;
  } else {
    // Desktop view
    sidebarDynamicClasses = `sticky top-0 h-screen ${
      isDesktopCollapsed ? "w-[72px]" : "w-[200px]"
    }`;
  }

  const handleNavItemClick = () => {
    // Call the parent-provided onLinkClick (if any)
    if (onLinkClick) onLinkClick();
    // Also handle mobile close if needed (redundant if onLinkClick does it, but safe)
    if (isMobileView && isOpen && onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay for small screens (mobile) when sidebar is open */}
      {isMobileView && isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`${sidebarBaseClasses} ${sidebarDynamicClasses}`}>
        {/* Desktop Toggle Button - Refined transitions */}
        {!isMobileView && (
          <button
            onClick={toggleDesktopSidebar}
            className={`
              absolute top-1/2 -translate-y-1/2
              ${isDesktopCollapsed ? " -right-[14px]" : " -right-[14px]"}
              z-[51]
              bg-dark-primary hover:bg-golden-accent
              text-text-secondary hover:text-text-on-accent
              border border-dark-tertiary
              w-7 h-7 flex items-center justify-center
              rounded-full shadow-lg transition-colors duration-200 ease-in-out
              transform ${isDesktopCollapsed ? "rotate-180" : "rotate-0"}
              transition-transform duration-200 ease-in-out
              group
            `}
            aria-label={
              isDesktopCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
          >
            <FontAwesomeIcon icon={faChevronLeft} className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Sidebar Header/Logo */}
        <div
          className={`h-16 flex items-center border-b border-dark-tertiary flex-shrink-0
            transition-all duration-100 ease-in-out
            ${
              currentTextHiddenState && !isMobileView
                ? "justify-center px-0"
                : "justify-between px-4"
            }`}
        >
          {/* Conditional rendering for logo/title based on showExpandedContent */}
          {showExpandedContent || (isMobileView && isOpen) ? (
            <Link
              to={headerLink}
              className="text-xl font-bold text-golden-accent hover:text-golden-accent-hover transition-colors truncate"
              onClick={isMobileView && onClose ? onClose : undefined} // Close mobile menu on header link click
            >
              {title}
            </Link>
          ) : (
            !isMobileView && ( // Only show collapsed logo on desktop collapsed
              <Link
                to={headerLink}
                className="text-golden-accent hover:text-golden-accent-hover flex items-center justify-center h-full"
                title={title} // Tooltip for collapsed icon
              >
                {collapsedIcon}
              </Link>
            )
          )}

          {/* Mobile close button (only shown on mobile when menu is open) */}
          {isMobileView && isOpen && (
            <button
              className="text-text-secondary hover:text-text-primary ml-auto"
              onClick={onClose}
              aria-label="Close menu"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav
          className={`flex-grow overflow-y-auto overflow-x-hidden transition-all duration-100 ease-in-out
                        ${
                          currentTextHiddenState && !isMobileView
                            ? "px-0" // No horizontal padding when collapsed desktop
                            : "px-3" // Normal horizontal padding when expanded desktop or mobile
                        } py-4`} // Vertical padding remains consistent
        >
          <ul
            className={`space-y-1.5 ${
              currentTextHiddenState && !isMobileView
                ? "flex flex-col items-center" // Center items when collapsed desktop
                : ""
            }`}
          >
            {menuItems.map((item) => (
              <NavItem
                key={item.href}
                {...item}
                isTextHidden={currentTextHiddenState}
                onLinkClick={handleNavItemClick} // Use the shared handler
              />
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
