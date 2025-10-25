import type { Pawn, PawnId } from "./pawn";
import type { GameServer } from "./game-server";
import type { PlayerAction } from "./player-action";

export type Vec2 = { x: number, y: number }

export class World {
    private currentId: PawnId = 0
    private pawns: Pawn[] = [];
    server?: GameServer;

    addPawn(pawn: Pawn) {
        this.pawns.push(pawn);
        pawn.id = this.currentId++;
        pawn.world = this;
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
            // Todo: Use map for lookup and handle not found
            case 'move': this.pawns.find(x => x.id == action.payload.pawnId)!.move(action.payload.target);
        }
    }
}