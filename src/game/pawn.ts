import type { Mesh, Vector3 } from "three";
import { toVector3, type NetId, type Vec3 } from "./primitives";


export class Pawn {
    netId: NetId = -1;
    name?: string;
    mesh?: Mesh;
    moveSpeed: number = 1.0;
    currentTarget: Vector3 | null = null;

    setPosition(position: Vec3) {
        this.mesh?.position.copy(toVector3(position));
    }

    setTargetPosition(position: Vec3) {
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
