import { Mesh, Group, PlaneGeometry, MeshBasicMaterial, Box3 } from "three";
import type { Pawn } from "./pawn";

export class HealthComponent {

    health: number = 100;

    width: number = 0.6;
    height: number = 0.07;

    private constructor(
        private hpForeground: Mesh,
        private hpBackground: Mesh
    ) { }

    static addComponent(pawn: Pawn) {
        const mesh = pawn.mesh;
        const hpBarGroup = new Group();

        const w = 0.6;;
        const h = 0.07;;

        const bgGeom = new PlaneGeometry(w + 0.06, h + 0.06);
        const bgMat = new MeshBasicMaterial({ color: 0xffffff, depthWrite: false });
        const hpBackground = new Mesh(bgGeom, bgMat);

        const fgGeom = new PlaneGeometry(w, h);
        const fgMat = new MeshBasicMaterial({ color: 0xff0000, depthWrite: false });
        const hpForeground = new Mesh(fgGeom, fgMat);

        hpBackground.position.set(0, 0, 0.001);
        hpForeground.position.set(0, 0, 0.002);

        hpBarGroup.add(hpBackground);
        hpBarGroup.add(hpForeground);

        let yOffset = 1.0;
        // handle both Mesh and Group: compute bounding box from the whole Object3D
        const box = new Box3().setFromObject(mesh);
        if (!box.isEmpty()) {
            const height = box.max.y - box.min.y;
            yOffset = height + h + 0.1;
        }

        hpBarGroup.position.set(0, yOffset, 0);

        mesh.add(hpBarGroup);

        pawn.hpComp = new HealthComponent(hpForeground, hpBackground);
    }

    update() {
        const pct = Math.max(0, Math.min(1, this.health / 100));
        this.hpForeground.scale.x = pct;

        // Because scaling occurs around the geometry center, offset the foreground so it appears to shrink from right to left
        // When pct = 1 -> offset = 0; when pct = 0 -> offset = -width/2
        const offsetX = -(this.width * (1 - pct)) / 2;
        this.hpForeground.position.x = offsetX;
    }
}