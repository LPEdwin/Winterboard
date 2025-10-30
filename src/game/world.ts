import { Pawn } from "./pawn";
import { GameServer } from "./game-server";
import { createAction, type PlayerAction } from "./player-action";
import { Board } from "./board";
import { AxesHelper, Camera, GridHelper, Mesh, Raycaster, Scene, Vector2, Vector3, WebGLRenderer } from "three";
import { type NetId, type Team } from "./primitives";
import { localPlayer } from "./player";
import { isClient, isHost } from "../device";

export class World {
    public readonly scene;
    public readonly board: Board;
    server?: GameServer;
    private history: PlayerAction[] = [];
    private pawns = new Map<NetId, Pawn>();
    private teamsById = new Map<NetId, Team>;
    private get teams(): Team[] { return [...this.teamsById.values()]; }
    private get turnOrder(): number[] { return this.teams.map(x => x.id) };
    private turnCount: number = 0;
    private get currentTurnTeamId(): NetId | undefined {
        if (this.teams.length <= 0)
            return undefined;
        const mod = this.turnCount % this.turnOrder.length;
        return this.turnOrder[mod];
    }
    private get currentTurnTeam(): Team | undefined {
        if (this.currentTurnTeamId == undefined)
            return undefined;
        return this.teamsById.get(this.currentTurnTeamId);
    }

    private get hasLocalTurn(): boolean {
        if (this.currentTurnTeam == undefined)
            return false;
        return localPlayer.id == this.currentTurnTeam.controller?.id;
    }


    constructor(scene: Scene, board: Board) {
        this.scene = scene;
        this.board = board;

        scene.add(new AxesHelper(2));   // X=red, Y=green, Z=blue
        scene.add(new GridHelper(10, 10));
    }

    spawnTeam(team: Team) {
        let netId = team.id;
        if (netId) {
            if (this.teamsById.has(netId))
                throw new Error(`Team with nedId ${netId} already exists.`);
        }
        else {
            const keys = [...this.teamsById.keys()];
            netId = keys.length === 0 ? 0 : Math.max(...keys) + 1;
            team.id = netId;
        }
        this.teamsById.set(team.id!, team);
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
                this.turnCount++;
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

        if (event.button != 0 || !this.hasLocalTurn)
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
        if (!this.hasLocalTurn)
            return;
        const team = this.currentTurnTeam;
        if (!team)
            return;
        const hero = team.pawns[0];
        if (!hero)
            return;
        if (hero.netId == undefined)
            throw new Error(`Player pawn ${hero.name} is missing a nedId.`);
        const targetPosition = tile.getWorldPosition(new Vector3());
        const move = createAction('move', {
            turn: this.turnCount,
            playerId: localPlayer.id,
            teamId: team.id,
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