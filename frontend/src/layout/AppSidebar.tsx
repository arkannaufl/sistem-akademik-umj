import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";

// Assume these icons are imported from an icon library
import {
  BoxCubeIcon,
  ChevronDownIcon,
  HorizontaLDots,
  ListIcon,
  PieChartIcon,
  PlugInIcon,
  TableIcon,
  UserIcon,
  GroupIcon,
  PlusIcon,
} from "../icons";
import { useSidebar } from "../context/SidebarContext";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: {
    name: string;
    path?: string;
    pro?: boolean;
    new?: boolean;
    subItems?: { 
      name: string; 
      path: string;
      pro?: boolean;
      new?: boolean;
    }[];
  }[];
};

const navItems: NavItem[] = [
  {
    icon: <ListIcon />,
    name: "Tahun Ajaran",
    path: "/tahun-ajaran",
  },
  {
    icon: <TableIcon />,
    name: "Akademik",
    subItems: [
      { name: "Mata Kuliah", path: "/mata-kuliah" },
      { name: "PBL", path: "/pbl" },
      { name: "CSR", path: "/csr" },
      { name: "Peta Akademik", path: "/peta-akademik" },
    ],
  },
  {
    icon: <PlusIcon />,
    name: "Generate Mahasiswa",
    subItems: [
      { name: "Kelompok", path: "/generate/kelompok" },
      { name: "Kelas", path: "/generate/kelas" },
    ],
  },
  {
    icon: <GroupIcon />,
    name: "Tim Akademik",
    path: "/tim-akademik",
  },
  {
    icon: <UserIcon />,
    name: "Dosen",
    path: "/dosen",
  },
  {
    icon: <UserIcon />,
    name: "Mahasiswa",
    path: "/mahasiswa",
  },
  {
    icon: <BoxCubeIcon />,
    name: "Ruangan",
    path: "/ruangan",
  },
  {
    icon: <PieChartIcon />,
    name: "Reporting",
    subItems: [
      { name: "Reporting Dosen", path: "/reporting/dosen" },
      { name: "History Aplikasi", path: "/reporting/histori" },
    ],
  },
];

const othersItems: NavItem[] = [
  {
    icon: <PieChartIcon />,
    name: "Charts",
    subItems: [
      { name: "Line Chart", path: "/line-chart", pro: false },
      { name: "Bar Chart", path: "/bar-chart", pro: false },
    ],
  },
  {
    icon: <BoxCubeIcon />,
    name: "UI Elements",
    subItems: [
      { name: "Alerts", path: "/alerts", pro: false },
      { name: "Avatar", path: "/avatars", pro: false },
      { name: "Badge", path: "/badge", pro: false },
      { name: "Buttons", path: "/buttons", pro: false },
      { name: "Images", path: "/images", pro: false },
      { name: "Videos", path: "/videos", pro: false },
    ],
  },
  {
    icon: <PlugInIcon />,
    name: "Authentication",
    subItems: [
      { name: "Sign Up", path: "/signup", pro: false },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [openNestedMenus, setOpenNestedMenus] = useState<Record<string, boolean>>({});
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback(
    (path: string) => {
      if ((path === "/tahun-ajaran" && (location.pathname === "/" || location.pathname === "/tahun-ajaran"))) {
        return true;
      }
      return location.pathname === path;
    },
    [location.pathname]
  );

  const toggleNestedMenu = (menuKey: string) => {
    setOpenNestedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  useEffect(() => {
    let submenuMatched = false;
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? navItems : othersItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          // Check if any of the subItems or their nested subItems are active
          const isNavSubItemOrNestedActive = nav.subItems.some((subItem, subIndex) => {
            if (subItem.subItems) {
              // If subItem has nested subItems, check if any nested item is active
              return subItem.subItems.some((nestedItem) => {
                if (isActive(nestedItem.path)) {
                  setOpenNestedMenus(prev => ({
                    ...prev,
                    [`${menuType}-${index}-${subIndex}`]: true
                  }));
                  return true;
                }
                return false;
              });
            } else {
              // If subItem does not have nested subItems, check if the subItem itself is active
              return isActive(subItem.path || '');
            }
          });

          if (isNavSubItemOrNestedActive) {
            setOpenSubmenu({
              type: menuType as "main" | "others",
              index,
            });
            submenuMatched = true;
          }
        }
        // Check if current path matches the main menu item (for items without subItems)
        else if (nav.path && isActive(nav.path)) {
          setOpenSubmenu({
            type: menuType as "main" | "others",
            index,
          });
          submenuMatched = true;
        }
      });
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        requestAnimationFrame(() => {
          setTimeout(() => {
            setSubMenuHeight((prevHeights) => ({
              ...prevHeights,
              [key]: subMenuRefs.current[key]?.scrollHeight || 0,
            }));
          }, 0);
        });
      }
    }
  }, [openSubmenu, openNestedMenus]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  const renderNestedSubMenuItems = (subItems: NavItem['subItems'], parentKey: string) => (
    <ul className="mt-2 space-y-1 ml-9">
      {subItems?.map((subItem, index) => (
        <li key={subItem.name}>
          {subItem.subItems ? (
            <div>
              <button
                onClick={() => toggleNestedMenu(`${parentKey}-${index}`)}
                className={`menu-dropdown-item w-full text-left ${
                  isActive(subItem.path || '') ? 'menu-dropdown-item-active' : 'menu-dropdown-item-inactive'
                }`}
              >
                {subItem.name}
                <ChevronDownIcon className={`ml-auto w-4 h-4 transition-transform duration-300 ease-in-out ${
                  openNestedMenus[`${parentKey}-${index}`] ? "rotate-180" : ""
                }`} />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  openNestedMenus[`${parentKey}-${index}`] 
                    ? "max-h-[500px] opacity-100" 
                    : "max-h-0 opacity-0"
                }`}
              >
                <ul className="mt-2 space-y-1 ml-4">
                  {subItem.subItems.map((nestedItem) => (
                    <li key={nestedItem.name}>
                      <Link
                        to={nestedItem.path}
                        className={`menu-dropdown-item ${
                          isActive(nestedItem.path)
                            ? "menu-dropdown-item-active"
                            : "menu-dropdown-item-inactive"
                        }`}
                      >
                        {nestedItem.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <Link
              to={subItem.path || '#'}
              className={`menu-dropdown-item ${
                isActive(subItem.path || '')
                  ? "menu-dropdown-item-active"
                  : "menu-dropdown-item-inactive"
              }`}
            >
              {subItem.name}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >
              <span
                className={`menu-item-icon-size  ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                to={nav.path}
                className={`menu-item group ${
                  isActive(nav.path)
                    ? "bg-brand-100 text-brand-700 dark:bg-brand-900/80 dark:text-brand-300 font-semibold"
                    : "menu-item-inactive"
                }`}
              >
                <span
                  className={`menu-item-icon-size ${
                    isActive(nav.path)
                      ? "text-brand-700 dark:text-brand-300"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              {renderNestedSubMenuItems(nav.subItems, `${menuType}-${index}`)}
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link to="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <img
                className="dark:hidden"
                src="/images/logo/logo-icon.svg"
                alt="Logo"
                width={210}
                height={40}
              />
              <img
                className="hidden dark:block"
                src="/images/logo/logo-dark.svg"
                alt="Logo"
                width={210}
                height={40}
              />
            </>
          ) : (
            <img
              src="/images/logo/logo.svg"
              alt="Logo"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>
          </div>
        </nav>
        {/* Hapus SidebarWidget agar tidak error */}
      </div>
    </aside>
  );
};

export default AppSidebar;
