import type { Mesh, Vector3 } from "three";
import { toVector3, type Vec3, type World } from "./world";

export type PawnId = number;

export class Pawn {
    id: PawnId = 0;
    world?: World;
    name?: string;
    mesh?: Mesh;
    moveSpeed: number = 1.0;
    currentTarget: Vector3 | null = null;

    move(position: Vec3) {
        this.currentTarget = toVector3(position);
    }

    update(delta: number) {
        if (this.currentTarget) {
            const pos = this.mesh!.position;
            const dist = pos.distanceTo(this.currentTarget);
            const step = this.moveSpeed * delta;

            if (dist <= step) {
                this.mesh!.position.copy(this.currentTarget);
                this.currentTarget = null;
            } else {
                this.mesh!.position.lerp(this.currentTarget, step / dist);
            }
        }
    }
}
