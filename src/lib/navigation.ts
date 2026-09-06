// One list of nav destinations and written labels. The header, the footer and the
// mobile menu all read from here so a label never disagrees between the three navs.

export type NavKey =
  | "home"
  | "about"
  | "major"
  | "labs"
  | "harnesses"
  | "models"
  | "digest"
  | "feeds"
  | "stories"
  | "watchlist"
  | "none";

export interface NavItem {
  href: string;
  label: string;
  key: NavKey;
  /** Shown in the compact desktop header, which only has room for the main destinations. */
  header: boolean;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Latest", key: "home", header: true },
  { href: "/major-updates/", label: "Major updates", key: "major", header: true },
  { href: "/labs/", label: "Labs and providers", key: "labs", header: true },
  { href: "/harnesses/", label: "Agent tools", key: "harnesses", header: true },
  { href: "/models/", label: "Model releases", key: "models", header: true },
  { href: "/digest/daily/", label: "News by date", key: "digest", header: true },
  { href: "/stories/", label: "All stories", key: "stories", header: false },
  { href: "/watchlist/", label: "My watchlist", key: "watchlist", header: false },
  { href: "/feeds/", label: "Feeds", key: "feeds", header: false },
  { href: "/about/", label: "About", key: "about", header: false },
];

export const HEADER_NAV: NavItem[] = PRIMARY_NAV.filter((item) => item.header);
