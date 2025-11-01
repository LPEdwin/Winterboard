import type { Pawn } from "./pawn"
import type { Player } from "./player"
import type { NetId } from "./primitives"

export class Team {
    id: NetId = -1;
    pawns: Pawn[] = [];
    controller: Player | undefined

    constructor(pawns: Pawn[]) {
        this.addPawns(pawns)
    }

    addPawns(pawns: Pawn[]) {
        if (pawns.some(x => x.team)) {
            throw Error('Pawns are already attached to a team.');
        }
        pawns.forEach(x => x.team = this);
        this.pawns.push(...pawns)
    }
}