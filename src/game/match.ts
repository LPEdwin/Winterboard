import { Peer, type DataConnection } from 'peerjs';
import type { PlayerAction } from "./player";
import { isMobile } from "../device";

export class Match {

    static readonly baseId = 'lpedwin_winterboard'
    static readonly matchId: string = 'xDg5LkoLfF';
    static get playerId(): string { return isMobile() ? 'Player2' : 'Player1'; }
    static readonly hostId: string = this.baseId + `_${this.matchId}_Player1`;
    static get id() { return this.baseId + `_${this.matchId}_${this.playerId}`; }
    private conn: DataConnection | undefined = undefined;
    private otherId?: string;

    onAction?: (action: PlayerAction) => void;

    constructor(private peer: Peer) { }

    static async host(): Promise<Match> {
        const host = new Peer(this.id);
        host.on('error', err => console.log('Error', err))
        const game = new Match(host);
        host.on('open', id => { console.log('Host created with id', id); });
        // when other connects
        host.on('connection', conn => {
            game.conn = conn;
            game.otherId = conn.peer;
            conn.on('data', data => {
                console.log('Received', data);
                if (game.onAction)
                    game.onAction(data as PlayerAction);
            });
            conn.on('close', () => {
                console.log('Connection closed.');
                game.conn = undefined;
            });
            conn.send("Current game state");
        })
        return game;
    }

    static async join(): Promise<Match> {
        const client = new Peer(this.id);
        client.on('error', err => console.log('Error', err))
        const game = new Match(client);
        client.on('open', id => {
            console.log('Client created with id', id);
            const conn = client.connect(this.hostId);
            game.conn = conn;
            conn.on('open', () => console.log('Client connection opened.'));
            conn.on('close', () => {
                console.log('Connection closed.');
                game.conn = undefined;
            });
            conn.on('data', data => {
                console.log('Received data', data);
                if (game.onAction)
                    game.onAction(data as PlayerAction);
            });
        });

        return game;
    }

    play(action: PlayerAction) {
        if (this.conn)
            this.conn.send(action)
        else
            console.log("No data connection set.");
    }

    dispose() {
        this.conn?.close();
        this.peer.destroy();
    }
}