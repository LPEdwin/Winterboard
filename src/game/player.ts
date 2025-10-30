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

export type Player = {
    id: HashId,
    name: string
}

export let localPlayer: Player = { id: getNewHashId(), name: 'Default Player' };