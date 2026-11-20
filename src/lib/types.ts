import type { Database } from "./database.types";

type Tables = Database["public"]["Tables"];

export type Profile = Tables["profiles"]["Row"];
export type Phase = Tables["phases"]["Row"];
export type Project = Tables["projects"]["Row"];
export type Task = Tables["tasks"]["Row"];
export type Update = Tables["updates"]["Row"];
export type Event = Tables["events"]["Row"];
export type Responsibility = Tables["responsibilities"]["Row"];
export type Report = Tables["reports"]["Row"];

export type TaskInsert = Tables["tasks"]["Insert"];
export type TaskPatch = Tables["tasks"]["Update"];
export type ProjectInsert = Tables["projects"]["Insert"];
export type ProjectPatch = Tables["projects"]["Update"];
export type UpdateInsert = Tables["updates"]["Insert"];
export type UpdatePatch = Tables["updates"]["Update"];
export type EventInsert = Tables["events"]["Insert"];

export type ProjectStatus = Database["public"]["Enums"]["project_status"];
export type TaskStatus = Database["public"]["Enums"]["task_status"];
export type ThemePref = "system" | "light" | "dark";
