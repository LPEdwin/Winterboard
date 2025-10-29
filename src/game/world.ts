import { Pawn } from "./pawn";
import { GameServer } from "./game-server";
import { createAction, type PlayerAction } from "./player-action";
import { Board, create8x8BoardAsync } from "./board";
import { AxesHelper, Camera, GridHelper, Mesh, Raycaster, Scene, Vector2, Vector3, WebGLRenderer } from "three";
import { createCaptainHookAsync, createHadesAsync, createMaleficentAsync, createMulanAsync, createScarAsync, createThumperAsync } from "./heroes";
import type { NetId, Team, TeamId } from "./primitives";

export async function createWorldAsync(scene: Scene): Promise<World> {
    const board = await create8x8BoardAsync(scene);
    const world = new World(scene, board);

    const teamA = {
        netId: 1,
        pawns: [
            await createScarAsync(),
            await createHadesAsync(),
            await createCaptainHookAsync()
        ]
    };

    const teamB = {
        netId: 2,
        pawns: [
            await createMaleficentAsync(),
            await createThumperAsync(),
            await createMulanAsync()
        ]
    };

    teamA.pawns.forEach((x, i) => {
        x.setPosition(board.getTileAnchor(i + 2, 0));
    });

    teamB.pawns.forEach((x, i) => {
        x.setPosition(board.getTileAnchor(i + 2, 7));
    });

    world.spawnTeam(teamA);
    world.spawnTeam(teamB);

    return world;
}

export class World {
    public readonly scene;
    private pawns = new Map<NetId, Pawn>();
    private teams = new Map<TeamId, Team>;
    public readonly board: Board;
    private get currentPawn(): Pawn {
        return this.pawns.values().next().value as Pawn;
    }
    server?: GameServer;

    constructor(scene: Scene, board: Board) {
        this.scene = scene;
        this.board = board;

        scene.add(new AxesHelper(2));   // X=red, Y=green, Z=blue
        scene.add(new GridHelper(10, 10));
    }

    spawnTeam(team: Team) {
        let netId = team.netId;
        if (netId) {
            if (this.teams.has(netId))
                throw new Error(`Team with nedId ${netId} already exists.`);
        }
        else {
            const keys = [...this.teams.keys()];
            netId = keys.length === 0 ? 0 : Math.max(...keys) + 1;
            team.netId = netId;
        }
        this.teams.set(team.netId!, team);
        for (let p of team.pawns)
            this.spawnPawn(p);
    }

    spawnPawn(pawn: Pawn) {
        let netId = pawn.netId;
        if (netId) {
            if (this.pawns.has(netId))
                throw new Error(`Pawn with nedId ${netId} already exists.`);
        }
        else {
            const keys = [...this.pawns.keys()];
            netId = keys.length === 0 ? 1 : Math.max(...keys) + 1;
            pawn.netId = netId;
        }
        this.pawns.set(pawn.netId!, pawn);
        if (pawn.mesh)
            this.scene.add(pawn.mesh)
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
                const id = action.payload.netId;
                const pawn = this.pawns.get(id);
                if (!pawn)
                    throw new Error(`Pawn with id ${id} doesn't exist.`);
                pawn.setTargetPosition(action.payload.target);
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
        if (playerPawn.netId == undefined)
            throw new Error(`Player pawn ${playerPawn.name} is missing a nedId.`);
        const targetPosition = tile.getWorldPosition(new Vector3());
        const move = createAction('move', { netId: playerPawn.netId, target: targetPosition })
        this.playAction(move);
    }

    update(delta: number) {
        for (let p of this.pawns.values()) {
            p.update(delta);
        }
    }
}