import { Vector3 } from "three";
import type { Pawn } from "./pawn";
import type { Player } from "./player";

export type Vec2 = { x: number, y: number }
export type Vec3 = { x: number, y: number, z: number }
export function toVector3(v: Vec3) { return new Vector3(v.x, v.y, v.z); }
export function fromVector3(v: Vector3) { return { x: v.x, y: v.y } }

export type NetId = number;

export type Team = {
    netId: NetId | undefined,
    pawns: Pawn[],
    controlledBy: 'None' | 'Ai' | 'Player',
    controller: Player | undefined
}