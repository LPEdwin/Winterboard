import { Pawn } from "./pawn";
import { GameServer } from "./game-server";
import { createAction, type PlayerAction } from "./player-action";
import { Board } from "./board";
import { AxesHelper, Camera, GridHelper, Mesh, Raycaster, Scene, Vector2, Vector3, WebGLRenderer } from "three";
import { getNewNetId, type NetId, } from "./primitives";
import { localPlayer } from "./player";
import type { Team } from "./team";

export class World {
    private readonly scene: Scene;
    private readonly board: Board;
    private pawnsById = new Map<NetId, Pawn>();
    private get pawns(): Pawn[] { return [...this.pawnsById.values()]; }
    private teamsById = new Map<NetId, Team>;
    private get teams(): Team[] { return [...this.teamsById.values()]; }

    server?: GameServer;
    private history: PlayerAction[] = [];

    private turnCount: number = 0;

    constructor(scene: Scene, board: Board) {
        this.scene = scene;
        this.board = board;

        scene.add(new AxesHelper(2));   // X=red, Y=green, Z=blue
        scene.add(new GridHelper(10, 10));
    }

    spawnTeam(team: Team) {
        team.id = getNewNetId(this.teams.map(x => x.id));
        this.teamsById.set(team.id, team);
        for (let p of team.pawns)
            this.spawnPawn(p);
    }

    spawnPawn(pawn: Pawn) {
        pawn.id = getNewNetId(this.pawns.map(x => x.id));
        this.pawnsById.set(pawn.id, pawn);
        if (pawn.mesh)
            this.scene.add(pawn.mesh)
    }

    attachServer(server: GameServer) {
        this.server = server;
        server.on('action', action => this.playActionLocal(action));
        window.addEventListener('pagehide', () => server.dispose(), { once: true });

        if (server.isClient) {
            const unsubscribe = server.on('ready', () => {
                server.send(createAction('join_request', { player: localPlayer }));
                unsubscribe();
            })
        }
    }

    matchIsReady(): boolean {
        return this.teams.every(x => x.controller !== undefined);
    }

    hasLocalTurn(): boolean {
        return this.getCurrentHero()?.team?.controller === localPlayer;
    }

    canHandleInput(): boolean {
        return this.matchIsReady()
            && this.hasLocalTurn();
    }

    getCurrentHero(): Pawn | undefined {
        const totalPawns = this.pawns.length;
        const turn = this.turnCount;
        return this.pawns[turn % totalPawns];
    }

    playAction(action: PlayerAction) {
        this.server?.send(action);
        this.playActionLocal(action);
    }

    playActionLocal(action: PlayerAction) {
        this.history.push(action);
        switch (action.type) {
            case 'move': {
                this.turnCount++;
                const id = action.payload.pawnId;
                const pawn = this.pawnsById.get(id);
                if (!pawn)
                    throw new Error(`Pawn with id ${id} doesn't exist.`);
                pawn.setTargetPosition(action.payload.target);
                break;
            }
            case 'join_request': {
                if (this.server?.isHost === true) {
                    const response = createAction('assign_players', {
                        pairs: [{
                            player: localPlayer,
                            teamId: this.teams[0]!.id!
                        },
                        {
                            player: action.payload.player,
                            teamId: this.teams[1]!.id!
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
                    team.controller = p.player;
                }
                break;
            }
        }
    }

    handlePointerEvent(event: PointerEvent, camera: Camera, renderer: WebGLRenderer) {

        if (event.button != 0 || !this.canHandleInput())
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
        const hero = this.getCurrentHero();
        if (!hero) {
            console.log('getCurrentHero returned undefined');
            return;
        }
        const targetPosition = tile.getWorldPosition(new Vector3());
        const move = createAction('move', {
            turn: this.turnCount,
            playerId: localPlayer.id,
            pawnId: hero.id,
            target: targetPosition
        })
        this.playAction(move);
    }

    update(delta: number) {
        for (let p of this.pawnsById.values()) {
            p.update(delta);
        }
    }
}