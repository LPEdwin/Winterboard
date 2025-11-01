import type { Player } from "./player";
import type { HashId, NetId, Vec3 } from "./primitives";

export type ActionMeta = {
    turn: number,
    playerId: HashId,
}

export type Actions = {
    cast: ActionMeta,
    attack: ActionMeta,
    move: ActionMeta & { pawnId: NetId, target: Vec3 },
    none: never,
    join_request: { player: Player },
    assign_players: { pairs: { player: Player, teamId: NetId }[] }
}

export type ActionOf<K extends keyof Actions> =
    Actions[K] extends never ? { type: K } : { type: K; payload: Actions[K] };

export type PlayerAction =
    { [K in keyof Actions]: ActionOf<K> }[keyof Actions];

export function createAction<K extends keyof Actions>(
    type: K,
    ...payload: Actions[K] extends never ? [] : [payload: Actions[K]]
): ActionOf<K> {
    return (payload.length ? { type, payload: payload[0] } : { type }) as ActionOf<K>;
}
