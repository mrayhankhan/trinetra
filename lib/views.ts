// Shared view identifiers used by the icon rail, the agent, and the console.

import {
  MessageSquare,
  Share2,
  Map,
  UserSearch,
  Bell,
  type LucideIcon,
} from "lucide-react";

export type ViewId =
  | "conversation"
  | "network"
  | "map"
  | "profiles"
  | "alerts"
  | "timeline";

export interface RailItem {
  id: ViewId;
  icon: LucideIcon;
  label: string;
}

export const RAIL_ITEMS: RailItem[] = [
  { id: "network", icon: Share2, label: "Network" },
  { id: "map", icon: Map, label: "Hotspot map" },
  { id: "profiles", icon: UserSearch, label: "Profiles" },
  { id: "timeline", icon: MessageSquare, label: "Timeline" },
  { id: "alerts", icon: Bell, label: "Alerts" },
];
