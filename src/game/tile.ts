import type { Mesh } from "three";
import type { Vec2 } from "./primitives";

export class Tile {
    constructor(public mesh: Mesh, public index: Vec2) { }
}