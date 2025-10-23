import { Vector3 } from "three";

export type Vec3 = [number, number, number]

export const toVec3 = (v: { x: number; y: number; z: number }): Vec3 => [v.x, v.y, v.z];
export const fromVec3 = (v: Vec3) => new Vector3(v[0], v[1], v[2]);

export interface Player {
    id?: number;
    name?: string;
}

export type ActionType = 'Ability' | 'Attack' | 'Move' | 'None';

export interface PlayerAction {
    type: ActionType;
    targetPosition?: Vec3;
}