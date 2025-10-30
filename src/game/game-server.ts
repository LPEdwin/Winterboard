import { Peer, type DataConnection } from 'peerjs';
import { type PlayerAction } from "./player-action";
import { getRole } from "../device";

type Events = {
    action: (action: PlayerAction) => void,
    ready: () => void
}

export async function createServerAsync(): Promise<GameServer | undefined> {
    const role = getRole();
    switch (role) {
        case 'client': return GameServer.join();
        case 'host': return GameServer.host();
        case undefined: undefined;
    }
}

export class GameServer {

    static readonly baseId = 'lpedwin_winterboard2'
    static readonly matchId: string = 'xDg5LkoLfF';
    static get playerId(): string { return getRole() == 'client' ? 'Player2' : 'Player1'; }
    static readonly hostId: string = this.baseId + `_${this.matchId}_Player1`;
    static get id() { return this.baseId + `_${this.matchId}_${this.playerId}`; }
    private conn: DataConnection | undefined = undefined;
    private otherId?: string;
    private peer?: Peer;


    private listeners: { [k in keyof Events]?: Set<Events[k]> } = {}

    private emit<K extends keyof Events>(k: K, ...args: Parameters<Events[K]>) {
        const set = this.listeners[k] as Set<Events[K]> | undefined;
        set?.forEach(fn => {
            (fn as (...a: Parameters<Events[K]>) => void)(...args);
        });
    }

    on<K extends keyof Events>(k: K, fn: Events[K]): () => void {
        ((this.listeners[k] as Set<Events[K]>) ??= new Set()).add(fn);
        return () => this.listeners[k]!.delete(fn);
    }

    static async host(): Promise<GameServer> {
        const host = new Peer(this.id);
        const server = new GameServer();
        server.peer = host;
        host.on('open', id => console.log('Host created with id', id));
        host.on('error', err => console.error('Host error', err));

        host.on('connection', conn => {
            server.emit('ready');
            conn.on('data', d => server.emit('action', d as PlayerAction));
            conn.on('close', () => {
                console.log('Connection closed.');
                if (server.conn === conn) server.conn = undefined;
            });
            conn.on('error', e => console.error('Conn error', e));

            conn.on('open', () => {
                console.log('Client connected with id', conn.peer);
                server.conn = conn;
                server.otherId = conn.peer;
            });
        });

        return server;
    }

    static async join(): Promise<GameServer> {
        const client = new Peer(this.id);
        const server = new GameServer();
        server.peer = client;

        client.on('open', id => console.log('Peer created with id', id));
        client.on('error', err => console.error('Peer error', err));

        client.on('open', () => {
            const conn = client.connect(this.hostId);

            conn.on('data', d => server.emit('action', d as PlayerAction));
            conn.on('close', () => {
                console.log('Connection closed.');
                if (server.conn === conn) server.conn = undefined;
            });
            conn.on('error', e => console.error('Conn error', e));

            conn.on('open', () => {
                console.log('Client connection opened.');
                server.emit('ready');
                server.conn = conn;
            });
        });

        return server;
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