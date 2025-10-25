import type { PawnId } from "./pawn";
import type { Vec2 } from "./world";

export interface PlayerAction<K extends keyof Actions = keyof Actions> {
    type: K;
    payload: Actions[K];
}

export type Actions = {
    ability: never,
    attack: never,
    move: { pawnId: PawnId, target: Vec2 },
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