import { type Vector3, Object3D } from "three";
import { toVector3, type NetId, type Vec3 } from "./primitives";
import type { Team } from "./team";
import type { Player } from "./player";
import { Fader } from "./fader";
import type { HealthComponent } from "./health.component";


export class Pawn {
    id: NetId = -1;
    get health(): number { return this.hpComp.health };
    team?: Team;
    name?: string;
    mesh: Object3D;
    moveSpeed: number = 1.0;
    currentTarget: Vector3 | null = null;
    hpComp!: HealthComponent;

    private deathFader: Fader | undefined;

    constructor(name: string, mesh: Object3D) {
        this.name = name;
        this.mesh = mesh;
    }

    setPosition(position: Vec3) {
        this.mesh?.position.copy(toVector3(position));
    }

    setTargetPosition(position: Vec3) {
        this.currentTarget = toVector3(position);
    }

    applyDamage(amount: number) {
        this.hpComp.health -= amount;
    }

    update(delta: number) {
        if (this.health <= 0) {
            (this.deathFader ??= new Fader(this.mesh, 1)).update(delta);
            this.mesh.traverse(o => o.castShadow = false)
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

        this.hpComp.update();
    }

    getController(): Player | undefined {
        return this.team?.controller;
    }

    isControlledBy(controller: Player): boolean {
        return this.getController()?.id === controller.id;
    }
}
