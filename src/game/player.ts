import { getNewHashId, type HashId } from "./primitives";

export type Player = {
    id: HashId,
    name: string
}

export let localPlayer: Player = { id: getNewHashId(), name: 'Default Player' };