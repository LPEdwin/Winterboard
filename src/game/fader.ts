import * as THREE from 'three';

export function forEachMaterial(obj: THREE.Object3D, f: (m: THREE.Material) => void) {
    obj.traverse(o => {
        const m = (o as any).material as THREE.Material | THREE.Material[] | undefined;
        if (!m) return;
        Array.isArray(m) ? m.forEach(f) : f(m);
    });
}

export class Fader {

    hasFinished = false;

    private mats = new Set<THREE.Material>();
    private t = 0;

    constructor(root: THREE.Object3D, private duration = 0.5) {

        const cache = (x: THREE.Material) => {
            (x as any).userData.__orig ??= {
                transparent: x.transparent, depthWrite: x.depthWrite, opacity: (x as any).opacity ?? 1
            };
            x.transparent = true;
            x.depthWrite = false;
            x.needsUpdate = true;
            this.mats.add(x);
        };
        forEachMaterial(root, cache);
    }

    update(dt: number) {
        this.t = Math.min(this.t + dt, this.duration);
        const k = this.t / this.duration;
        this.mats.forEach(m => {
            if ('opacity' in m) (m as any).opacity = 1 - k;
        });
        if (this.t >= this.duration) {
            this.hasFinished = true;
        }
    }

    restore() {
        this.mats.forEach(m => {
            const o = (m as any).userData.__orig;
            if (!o) return;
            m.transparent = o.transparent; m.depthWrite = o.depthWrite;
            if ('opacity' in m) (m as any).opacity = o.opacity;
            delete (m as any).userData.__orig; m.needsUpdate = true;
        });
    }
}