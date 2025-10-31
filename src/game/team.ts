import type { Pawn } from "./pawn"
import type { Player } from "./player"
import type { NetId } from "./primitives"

export class Team {
    id: NetId = -1;
    pawns: Pawn[] = [];
    controller: Player | undefined

    constructor(pawns: Pawn[]) {
        this.pawns = [...pawns];
    }
}