import { Vector3 } from "three";
import type { Pawn } from "./pawn";

export type Vec2 = { x: number, y: number }
export type Vec3 = { x: number, y: number, z: number }
export function toVector3(v: Vec3) { return new Vector3(v.x, v.y, v.z); }
export function fromVector3(v: Vector3) { return { x: v.x, y: v.y } }

export type PawnId = number;
export type NetId = number;

export type TeamId = number;
export type Team = { netId: TeamId | undefined, pawns: Pawn[] }