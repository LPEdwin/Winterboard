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
    private pawnsByMeshId = new Map<number, Pawn>;
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
        this.pawnsByMeshId.set(pawn.mesh.id, pawn);
        this.scene.add(pawn.mesh)
    }

    attachServer(server: GameServer) {
        this.server = server;
        server.on('action', action => this.playActionLocal(action));
    }

    private updateConnectingState() {
        if (!this.server?.isHost)
            return;
        const connectedPlayers = this.server?.connectedPlayers.length;
        const requiredPlayer = this.teams.filter(x => x.controller === undefined).length
        if (connectedPlayers == requiredPlayer) {
            this.assignPlayers();
        }
    }

    private assignPlayers() {
        if (!this.server?.isHost)
            return;
        const action = createAction('assign_players', {
            pairs: [...this.server!.connectedPlayers.map((p, i) => ({
                player: p,
                teamId: this.teams[i]!.id
            }))]
        });
        this.playAction(action);
    }

    matchIsReady(): boolean {
        return this.teams.every(x => x.controller !== undefined);
    }

    hasLocalTurn(): boolean {
        return this.getCurrentHero()?.isControlledBy(localPlayer) ?? false;
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
            case 'attack': {
                this.turnCount++;
                const id = action.payload.targetId;
                const target = this.pawnsById.get(id);
                target!.health -= 30;
                break;
            }
            case 'move': {
                this.turnCount++;
                const id = action.payload.pawnId;
                const pawn = this.pawnsById.get(id);
                if (!pawn)
                    throw new Error(`Pawn with id ${id} doesn't exist.`);
                pawn.setTargetPosition(action.payload.target);
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

        let [hit] = raycaster.intersectObjects<Mesh>(this.pawns.map(x => x.mesh), false);
        if (hit) {
            const pawn = this.pawnsByMeshId.get(hit.object.id)!;
            this.attack(pawn);
        }
        else {
            [hit] = raycaster.intersectObjects<Mesh>(this.board.tiles.map(x => x.mesh), false);
            if (hit) {
                const tile = hit.object;
                this.moveHeroTo(tile);
                this.board.highlightTile(tile);
            }
        }
    }

    private attack(target: Pawn) {
        const hero = this.getCurrentHero();
        if (!hero) {
            console.log('getCurrentHero returned undefined');
            return;
        }
        const attack = createAction('attack', {
            turn: this.turnCount,
            playerId: localPlayer.id,
            pawnId: hero.id,
            targetId: target.id
        });
        this.playAction(attack);
    }

    private moveHeroTo(tile: Mesh) {
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
        });
        this.playAction(move);
    }

    update(delta: number) {
        if (!this.matchIsReady())
            this.updateConnectingState()
        for (let p of this.pawnsById.values()) {
            p.update(delta);
        }
    }
}