import { createContext, useContext } from "react";
export type Mode = "consumer" | "merchant" | "admin";
export interface Route { name: string; params?: any }
export interface Nav { mode: Mode; route: Route; go: (name: string, params?: any) => void; setMode: (m: Mode, r?: Route) => void; back: () => void }
export const NavCtx = createContext<Nav>(null as any);
export const useNav = () => useContext(NavCtx);
