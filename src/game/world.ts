import { Pawn, type PawnId } from "./pawn";
import { GameServer } from "./game-server";
import { createAction, type PlayerAction } from "./player-action";
import { Board, create8x8BoardAsync } from "./board";
import { Camera, Material, Mesh, MeshStandardMaterial, Raycaster, Scene, Vector2, Vector3, WebGLRenderer } from "three";
import { createScarAsync } from "./scar";

export type Vec2 = { x: number, y: number }
export type Vec3 = { x: number, y: number, z: number }
export function toVector3(v: Vec3) { return new Vector3(v.x, v.y, v.z); }
export function fromVector3(v: Vector3) { return { x: v.x, y: v.y } }

export async function createWorldAsync(scene: Scene): Promise<World> {
    const board = await create8x8BoardAsync(scene);
    const world = new World(board);

    const scar = await createScarAsync();
    world.addPawn(scar);
    if (scar.mesh)
        scene.add(scar.mesh);

    return world;
}

export class World {
    public readonly scene;
    private currentId: PawnId = 0
    private pawns = new Map<PawnId, Pawn>();
    public readonly board: Board;
    private get currentPawn(): Pawn {
        return this.pawns.values().next().value as Pawn;
    }
    server?: GameServer;

    constructor(board: Board) {
        this.scene = new Scene();
        this.board = board;
    }

    addPawn(pawn: Pawn) {
        pawn.id = this.currentId++;
        pawn.world = this;
        this.pawns.set(pawn.id, pawn);
    }

    attachServer(server: GameServer) {
        this.server = server;
        server.on('action', action => this.playActionLocal(action));
        window.addEventListener('pagehide', () => server.dispose(), { once: true });
    }

    playAction(action: PlayerAction) {
        this.server?.send(action);
        this.playActionLocal(action);
    }

    playActionLocal(action: PlayerAction) {
        switch (action.type) {
            case 'move': {
                const id = action.payload.pawnId;
                const pawn = this.pawns.get(id);
                if (!pawn)
                    throw new Error(`Pawn with id ${id} doesn't exist.`);
                pawn.move(action.payload.target);
            }
        }
    }

    handlePointerEvent(event: PointerEvent, camera: Camera, renderer: WebGLRenderer) {

        if (event.button != 0)
            return;

        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new Raycaster();
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(this.board.tiles, false);

        if (intersects.length > 0) {
            const tile = intersects[0]?.object as Mesh;
            this.tileSelected(tile);
            this.board.highlightTile(tile);
        }
    }

    private tileSelected(tile: Mesh) {
        const playerPawn = this.currentPawn;
        const targetPosition = tile.getWorldPosition(new Vector3());
        targetPosition.x += 0.4;
        targetPosition.y = playerPawn.mesh!.position.y;
        const move = createAction('move', { pawnId: playerPawn.id, target: targetPosition })
        this.playAction(move);
    }

    update(delta: number) {
        for (let p of this.pawns.values()) {
            p.update(delta);
        }
    }
}