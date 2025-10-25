import type { Vec2, World } from "./world";

export type PawnId = number;

export class Pawn {
    id: PawnId = 0;
    world?: World;
    name?: string;
    field: Vec2 = { x: 0, y: 0 };

    move(field: Vec2) {
        this.field = field
    }
}
