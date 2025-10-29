import { Scene, Mesh, Color, MeshStandardMaterial, BufferGeometry, PlaneGeometry, ShadowMaterial, Material, Vector3 } from "three";
import { loadGLB } from "../loaders";
import { type Vec2 } from "./primitives";

export async function create8x8BoardAsync(scene: Scene): Promise<Board> {
    const boardSize = 8;
    const tileSize = 1;
    const tiles: Mesh[] = [];

    const evenColor = new Color(0.082, 0.509, 0.690).convertSRGBToLinear();
    const oddColor = new Color(0.286, 0.851, 0.882).convertSRGBToLinear();;

    const evenMat = new MeshStandardMaterial({
        metalness: 0.1,
        roughness: 0.35,
        color: evenColor
    });

    const oddMat = new MeshStandardMaterial({
        metalness: 0.1,
        roughness: 0.35,
        color: oddColor
    });

    const tileLookup = new Map<Mesh, Vec2>();
    const tileSrc = (await loadGLB("/models/box.glb")).children[0] as Mesh;
    const tileGeometry = (tileSrc.geometry as BufferGeometry).clone();
    tileGeometry.computeBoundingBox();

    for (let x = 0; x < boardSize; x++) {
        for (let z = 0; z < boardSize; z++) {
            const tile = new Mesh(tileGeometry, (x + z) % 2 === 0 ? evenMat : oddMat);
            tile.scale.multiplyScalar(0.98);
            tile.castShadow = false;
            tile.receiveShadow = true;
            tile.position.set(
                (x - boardSize / 2 + 0.5) * tileSize,
                0,
                (z - boardSize / 2 + 0.5) * tileSize
            );
            tileLookup.set(tile, { x, y: z });
            tile.name = `tile_${x}_${z}`;
            scene.add(tile);
            tiles.push(tile);
        }
    }

    // Shadow receiver
    const shadowPlane = new Mesh(
        new PlaneGeometry(boardSize * tileSize, boardSize * tileSize),
        new ShadowMaterial({ opacity: 0.25 })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    return new Board({ x: 8, y: 8 }, tiles, tileLookup);
}

export class Board {

    get tiles() { return [...this._tiles]; }

    private _bboxSize: Vector3;
    private highlightedTile: Mesh | null = null;
    private restoreMaterial: Material | Material[] | null = null

    private highlighMaterial = new MeshStandardMaterial(
        {
            color: 0x000000,
            emissive: 0xeeeeee,
        }
    );

    constructor(
        private _size: Vec2,
        private _tiles: Mesh[],
        private _tileLookup: Map<Mesh, Vec2>
    ) {
        if (_tiles.length <= 0) {
            this._bboxSize = new Vector3();
        }
        const bbox = _tiles[0]!.geometry.boundingBox;
        this._bboxSize = bbox!.max.clone().sub(bbox!.min);
    }

    getTileIndex(tile: Mesh) {
        return this._tileLookup.get(tile);
    }

    getTile(x: number, y: number): Mesh {
        if (!Number.isInteger(x) || !Number.isInteger(y))
            throw new Error("Indices aren't intergers");
        if (x < 0 || y < 0 || x >= this._size.x || y >= this._size.y)
            throw new Error('Index out of bounds.');
        return this.tiles[this._size.x * x + y]!;
    }

    getTileAnchor(x: number, y: number): Vector3 {
        const tile = this.getTile(x, y);
        return tile.position.clone();
    }

    highlightTile(tile: Mesh | null) {
        if (this.highlightedTile) {
            this.highlightedTile.material = this.restoreMaterial!;
        }
        if (!tile) {
            this.highlightedTile = null;
            this.restoreMaterial = null;
            return;
        }
        this.highlightedTile = tile;
        this.restoreMaterial = tile.material;
        this.highlightedTile.material = this.highlighMaterial;
    }
}