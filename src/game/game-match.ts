import { Peer, type DataConnection } from 'peerjs';
import type { PlayerAction } from "./player";
import { getRole } from "../device";

export class GameServer {

    static readonly baseId = 'lpedwin_winterboard'
    static readonly matchId: string = 'xDg5LkoLfF';
    static get playerId(): string { return getRole() == 'client' ? 'Player2' : 'Player1'; }
    static readonly hostId: string = this.baseId + `_${this.matchId}_Player1`;
    static get id() { return this.baseId + `_${this.matchId}_${this.playerId}`; }
    private conn: DataConnection | undefined = undefined;
    private otherId?: string;
    private peer?: Peer;

    onAction?: (action: PlayerAction) => void;


    static async host(): Promise<GameServer> {
        const host = new Peer(this.id);
        const game = new GameServer();
        game.peer = host;
        host.on('open', id => console.log('Host created with id', id));
        host.on('error', err => console.error('Host error', err));

        host.on('connection', conn => {
            conn.on('data', d => game.onAction?.(d as PlayerAction));
            conn.on('close', () => {
                console.log('Connection closed.');
                if (game.conn === conn) game.conn = undefined;
            });
            conn.on('error', e => console.error('Conn error', e));

            conn.on('open', () => {
                game.conn = conn;
                game.otherId = conn.peer;
                conn.send('Current game state');
            });
        });

        return game;
    }

    static async join(): Promise<GameServer> {
        const client = new Peer(this.id);
        const game = new GameServer();
        game.peer = client;

        client.on('open', id => console.log('Peer created with id', id));
        client.on('error', err => console.error('Peer error', err));

        client.on('open', () => {
            const conn = client.connect(this.hostId);

            conn.on('data', d => game.onAction?.(d as PlayerAction));
            conn.on('close', () => {
                console.log('Connection closed.');
                if (game.conn === conn) game.conn = undefined;
            });
            conn.on('error', e => console.error('Conn error', e));

            conn.on('open', () => {
                console.log('Client connection opened.');
                game.conn = conn;
            });
        });

        return game;
    }


    send(action: PlayerAction) {
        if (this.conn)
            this.conn.send(action)
        else
            console.log("No data connection set.");
    }

    dispose() {
        this.conn?.close();
        this.peer?.destroy();
    }
}