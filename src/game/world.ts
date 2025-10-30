import { Pawn } from "./pawn";
import { GameServer } from "./game-server";
import { createAction, type PlayerAction } from "./player-action";
import { Board, create8x8BoardAsync } from "./board";
import { AxesHelper, Camera, GridHelper, Mesh, Raycaster, Scene, Vector2, Vector3, WebGLRenderer } from "three";
import { createCaptainHookAsync, createHadesAsync, createMaleficentAsync, createMulanAsync, createScarAsync, createThumperAsync } from "./heroes";
import { type NetId, type Team } from "./primitives";
import { localPlayer } from "./player";
import { isClient, isHost } from "../device";

export async function createWorldAsync(scene: Scene): Promise<World> {
    const board = await create8x8BoardAsync(scene);
    const world = new World(scene, board);

    const teamA: Team = {
        netId: 0,
        pawns: [
            await createScarAsync(),
            await createHadesAsync(),
            await createCaptainHookAsync()
        ],
        controlledBy: 'None',
        controller: undefined
    };

    const teamB: Team = {
        netId: 1,
        pawns: [
            await createMaleficentAsync(),
            await createThumperAsync(),
            await createMulanAsync()
        ],
        controlledBy: 'None',
        controller: undefined
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
    public startingTeamId: NetId = 0;
    private pawns = new Map<NetId, Pawn>();
    private teamsById = new Map<NetId, Team>;
    private get teams(): Team[] { return [...this.teamsById.values()]; }
    private get localTeam(): Team | undefined {
        return this.teams
            .find(x => x.controller?.id === localPlayer.id);
    }

    private get isStartingTeam(): boolean {
        return this.localTeam?.netId == this.startingTeamId;
    }
    private history: PlayerAction[] = [];
    private get turnHistory() {
        return this.history.filter(x => x.type == 'move');
    }
    private get isLocalTurn(): boolean {
        return (!this.isStartingTeam && this.turnHistory.length % 2 == 1)
            || (this.isStartingTeam && this.turnHistory.length % 2 == 0);
    }
    public readonly board: Board;

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
            if (this.teamsById.has(netId))
                throw new Error(`Team with nedId ${netId} already exists.`);
        }
        else {
            const keys = [...this.teamsById.keys()];
            netId = keys.length === 0 ? 0 : Math.max(...keys) + 1;
            team.netId = netId;
        }
        this.teamsById.set(team.netId!, team);
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

        if (isClient()) {
            const unsubscribe = server.on('ready', () => {
                server.send(createAction('join_request', { player: localPlayer }));
                unsubscribe();
            })
        }
    }

    playAction(action: PlayerAction) {
        this.server?.send(action);
        this.playActionLocal(action);
    }

    playActionLocal(action: PlayerAction) {
        this.history.push(action);
        switch (action.type) {
            case 'move': {
                const id = action.payload.pawnId;
                const pawn = this.pawns.get(id);
                if (!pawn)
                    throw new Error(`Pawn with id ${id} doesn't exist.`);
                pawn.setTargetPosition(action.payload.target);
                break;
            }
            case 'join_request': {
                if (isHost()) {
                    const response = createAction('assign_players', {
                        pairs: [{
                            player: localPlayer,
                            teamId: this.teams[0]!.netId!
                        },
                        {
                            player: action.payload.player,
                            teamId: this.teams[1]!.netId!
                        }]
                    });
                    this.playAction(response);
                }
                break;
            }
            case 'assign_players': {
                for (let p of action.payload.pairs) {
                    const teamId = p.teamId;
                    const team = this.teamsById.get(teamId)
                    if (!team)
                        throw new Error(`Can't assign player as team with id ${teamId} doesn't exist.`);
                    team.controlledBy = 'Player';
                    team.controller = p.player;
                }
                break;
            }
        }
    }

    handlePointerEvent(event: PointerEvent, camera: Camera, renderer: WebGLRenderer) {

        if (event.button != 0 || !this.isLocalTurn)
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
        if (this.localTeam === undefined || this.localTeam.netId == undefined || this.localTeam.pawns.length <= 0)
            return;
        const hero = this.localTeam.pawns[0]!;
        if (hero.netId == undefined)
            throw new Error(`Player pawn ${hero.name} is missing a nedId.`);
        const targetPosition = tile.getWorldPosition(new Vector3());
        const move = createAction('move', {
            turn: 0,
            playerId: localPlayer.id,
            teamId: this.localTeam.netId,
            pawnId: hero.netId,
            target: targetPosition
        })
        this.playAction(move);
    }

    update(delta: number) {
        for (let p of this.pawns.values()) {
            p.update(delta);
        }
    }
}