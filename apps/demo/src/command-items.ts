export type CommandGroup = "Suggestions" | "Workspace" | "Settings";

export interface CommandItem {
  group: CommandGroup;
  icon: string;
  id: string;
  keywords: readonly string[];
  label: string;
  shortcut?: string;
}

export const commandItems: readonly CommandItem[] = [
  {
    id: "calendar",
    label: "Calendar",
    group: "Suggestions",
    icon: "◫",
    keywords: ["date", "schedule"],
    shortcut: "⌘K",
  },
  {
    id: "search-emoji",
    label: "Search emoji",
    group: "Suggestions",
    icon: "☺",
    keywords: ["symbol", "icon"],
    shortcut: "⌘E",
  },
  {
    id: "calculator",
    label: "Calculator",
    group: "Suggestions",
    icon: "＋",
    keywords: ["math", "number"],
  },
  {
    id: "new-note",
    label: "Create a note",
    group: "Workspace",
    icon: "✎",
    keywords: ["new", "document"],
    shortcut: "⌘N",
  },
  {
    id: "open-project",
    label: "Open project",
    group: "Workspace",
    icon: "◇",
    keywords: ["workspace", "folder"],
    shortcut: "⌘O",
  },
  {
    id: "invite",
    label: "Invite teammate",
    group: "Workspace",
    icon: "＋",
    keywords: ["person", "collaborator"],
  },
  {
    id: "profile",
    label: "Profile",
    group: "Settings",
    icon: "○",
    keywords: ["account", "user"],
    shortcut: "⌘P",
  },
  {
    id: "billing",
    label: "Billing",
    group: "Settings",
    icon: "▣",
    keywords: ["payment", "invoice"],
    shortcut: "⌘B",
  },
  {
    id: "preferences",
    label: "Preferences",
    group: "Settings",
    icon: "⌘",
    keywords: ["settings", "configuration"],
    shortcut: "⌘,",
  },
] as const;

export const commandSearchKeys = [
  { name: "label", weight: 1 },
  { name: "keywords", weight: 0.72 },
  { name: "group", weight: 0.4 },
] as const;

export const commandGroups: readonly CommandGroup[] = [
  "Suggestions",
  "Workspace",
  "Settings",
];
