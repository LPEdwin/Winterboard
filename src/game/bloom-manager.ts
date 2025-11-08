import { Color, Layers, MeshBasicMaterial, type Mesh, type Scene } from "three";

export class BloomManager {

    static readonly BLOOM_LAYER_ID = 1;
    static readonly BLACK_COLOR = new Color(0x000000);
    static readonly BLACK_MATERIAL = new MeshBasicMaterial({ color: 0x000000 });
    private layer = new Layers();
    private cachedMaterials = new Map<Mesh, any>()

    constructor(public scene: Scene) {
        this.layer.set(BloomManager.BLOOM_LAYER_ID);
    }

    private background: any;

    overrideMaterialsToBlack() {
        this.background = this.scene.background;
        this.scene.background = BloomManager.BLACK_COLOR;
        this.scene.traverse(x => {
            const isMesh = (x as any).isMesh;
            if (!isMesh) return;
            const mesh = x as Mesh;
            if (!mesh.layers.test(this.layer)) {
                this.cachedMaterials.set(mesh, mesh.material);
                mesh.material = BloomManager.BLACK_MATERIAL;
            }
        });
    }

    restoreMaterials() {
        this.scene.background = this.background;
        this.scene.traverse(x => {
            const isMesh = (x as any).isMesh;
            if (!isMesh) return;
            const mesh = x as Mesh;
            const mat = this.cachedMaterials.get(mesh);
            if (mat) {
                mesh.material = mat;
                this.cachedMaterials.delete(mesh);
            }
        });
    }
}