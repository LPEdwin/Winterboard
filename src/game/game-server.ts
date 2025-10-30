import { Peer, type PeerOptions, type DataConnection } from 'peerjs';
import { type PlayerAction } from "./player-action";
import { getRole } from "../device";

type Events = {
    action: (action: PlayerAction) => void,
    ready: () => void
}

export class GameServer {

    private static readonly baseId = 'lpedwin_winterboard'
    private static readonly matchId: string = 'xDg5LkoLfF';
    private static get playerId(): string { return getRole() == 'client' ? 'Player2' : 'Player1'; }
    private static readonly hostId: string = this.baseId + `_${this.matchId}_Player1`;
    private static get id() { return this.baseId + `_${this.matchId}_${this.playerId}`; }
    private conn: DataConnection | undefined = undefined;
    private peer?: Peer;
    private config: PeerOptions | undefined;
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

    constructor(config?: PeerOptions) {
        this.config = config;
    }

    static async host(): Promise<GameServer> {
        const server = new GameServer();
        const host = new Peer(this.id, server.config);
        server.peer = host;
        host.on('open', id => console.log('Host peer created with id', id));
        host.on('error', err => console.error('Host error', err));
        host.on('disconnected', () => console.warn('Host disconnected'));
        host.on('close', () => console.warn('Host closed'));

        host.on('connection', conn => {
            console.log(`Host is ready.`);
            server.emit('ready');
            conn.on('data', d => server.emit('action', d as PlayerAction));
            conn.on('close', () => {
                console.log('Connection closed.');
                if (server.conn === conn) server.conn = undefined;
            });
            conn.on('error', e => console.error('Connection error', e));

            conn.on('open', () => {
                console.log('Client connected with id', conn.peer);
                server.conn = conn;
            });
        });

        return server;
    }

    static async join(): Promise<GameServer> {
        const server = new GameServer();
        const client = new Peer(this.id, server.config);

        server.peer = client;

        client.on('open', id => console.log('Client peer created with id', id));
        client.on('error', err => console.error('Client error', err));
        client.on('disconnected', () => console.warn('Client disconnected'));
        client.on('close', () => console.warn('Client closed'));

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
                server.conn = conn;
                server.emit('ready');
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