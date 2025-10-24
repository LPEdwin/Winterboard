import { Vector3 } from "three";

export type Vec3 = [number, number, number]

export const toVec3 = (v: { x: number; y: number; z: number }): Vec3 => [v.x, v.y, v.z];
export const fromVec3 = (v: Vec3) => new Vector3(v[0], v[1], v[2]);


export interface PlayerAction<K extends keyof Actions = keyof Actions> {
    type: K;
    payload: Actions[K];
}

export type Actions = {
    ability: never,
    attack: never,
    move: { target: Vec3 },
    none: never
}

export function createAction<K extends keyof Actions>(
    type: K,
    ...payload: Actions[K] extends never ? [] : [payload: Actions[K]]
) {
    return (payload.length
        ? { type, payload: payload[0] }
        : { type }) as Actions[K] extends never // explicitly define return type
        ? { type: K }
        : { type: K, payload: Actions[K] };
}