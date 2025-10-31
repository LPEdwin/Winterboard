import { Vector3 } from "three";
import type { Pawn } from "./pawn";
import type { Player } from "./player";

export type Vec2 = { x: number, y: number }
export type Vec3 = { x: number, y: number, z: number }
export function toVector3(v: Vec3) { return new Vector3(v.x, v.y, v.z); }
export function fromVector3(v: Vector3) { return { x: v.x, y: v.y } }

export type HashId = string;

const ALPH = 'abcdefghijklmnopqrstuvwxyz0123456789';

function randChar(): string {
    if (globalThis.crypto?.getRandomValues) {
        const b = new Uint8Array(1);
        globalThis.crypto.getRandomValues(b);
        return ALPH[b[0]! % ALPH.length]!;
    }
    return ALPH[Math.floor(Math.random() * ALPH.length)]!;
}

export function getNewHashId(pattern = 'xxxx-xxxx-xxxx-xxxx'): HashId {
    return pattern.replace(/x/g, randChar);
}

export type NetId = number;

export type Team = {
    id: NetId,
    pawns: Pawn[],
    controller: Player | undefined
}