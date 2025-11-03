import type { Mesh, Vector3 } from "three";
import { toVector3, type NetId, type Vec3 } from "./primitives";
import type { Team } from "./team";
import type { Player } from "./player";


export class Pawn {
    id: NetId = -1;
    health: number = 100;
    team?: Team;
    name?: string;
    mesh: Mesh;
    moveSpeed: number = 1.0;
    currentTarget: Vector3 | null = null;

    constructor(name: string, mesh: Mesh) {
        this.name = name;
        this.mesh = mesh;
    }

    setPosition(position: Vec3) {
        this.mesh?.position.copy(toVector3(position));
    }

    setTargetPosition(position: Vec3) {
        this.currentTarget = toVector3(position);
    }

    update(delta: number) {
        if (this.health <= 0) {

        }
        else if (this.currentTarget) {
            const pos = this.mesh.position;
            const dist = pos.distanceTo(this.currentTarget);
            const step = this.moveSpeed * delta;

            if (dist <= step) {
                this.mesh.position.copy(this.currentTarget);
                this.currentTarget = null;
            } else {
                this.mesh.position.lerp(this.currentTarget, step / dist);
            }
        }
    }

    getController(): Player | undefined {
        return this.team?.controller;
    }

    isControlledBy(controller: Player): boolean {
        return this.getController()?.id === controller.id;
    }
}
