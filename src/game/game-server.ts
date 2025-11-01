import { type DataConnection, Peer, type PeerOptions } from 'peerjs';
import { createAction, type PlayerAction } from "./player-action";
import { getNewHashId } from './primitives';
import { localPlayer, type Player } from './player';

type Events = {
    action: (action: PlayerAction) => void,
    ready: () => void
}

export class GameServer {

    on<K extends keyof Events>(k: K, fn: Events[K]): () => void {
        ((this.listeners[k] as Set<Events[K]>) ??= new Set()).add(fn);
        return () => this.listeners[k]!.delete(fn);
    }

    once<K extends keyof Events>(k: K, fn: Events[K]): () => void {
        let off: () => void = () => { };
        const wrapper = ((...args: Parameters<Events[K]>) => {
            off();
            (fn as any)(...args);
        }) as Events[K];

        off = this.on(k, wrapper);
        return off;
    }

    get connectedPlayers(): Player[] {
        return [...this._playersByPeerId.values()];
    }
    private _playersByPeerId = new Map<string, Player>();

    get isClient() { return !this._isHost; }
    get isHost() { return this._isHost; }

    private _isHost = false;
    private static readonly baseUri = 'lpedwin_winterboard'
    private _hostName: string = '';
    private get peerId(): string { return GameServer.buildPeerUri(this._hostName); }
    private connections = new Set<DataConnection>;
    private peer?: Peer;
    private config: PeerOptions | undefined;
    private listeners: { [k in keyof Events]?: Set<Events[k]> } = {}

    private emit<K extends keyof Events>(k: K, ...args: Parameters<Events[K]>) {
        const set = this.listeners[k] as Set<Events[K]> | undefined;
        set?.forEach(fn => {
            (fn as (...a: Parameters<Events[K]>) => void)(...args);
        });
    }

    constructor(peerConfig?: PeerOptions) {
        this.config = peerConfig;
        window.addEventListener('pagehide', () => this.dispose(), { once: true });
    }

    static buildPeerUri(peerName: string) {
        return GameServer.baseUri + '_' + peerName;
    }

    static async host(hostName: string, peerConfig?: PeerOptions): Promise<GameServer> {
        const server = new GameServer(peerConfig);
        server._isHost = true;
        server._hostName = hostName;

        const peer = new Peer(server.peerId, server.config);
        server.peer = peer;
        server._playersByPeerId.set(server.peerId, localPlayer);
        peer.on('open', id => {
            console.log('Host peer created with id.', id);
            server.emit('ready');
        });
        peer.on('error', err => console.error('Host error.', err));
        peer.on('disconnected', () => console.warn('Host disconnected.'));
        peer.on('close', () => console.warn('Host closed.'));

        peer.on('connection', conn => {
            conn.on('open', () => {
                console.log('Client connected with id', conn.peer);
                server.connections.add(conn);
            });
            conn.on('data', d => {
                const action = d as PlayerAction;
                if (action.type === 'join_request') {
                    server._playersByPeerId.set(conn.peer, action.payload.player);
                }
                server.emit('action', d as PlayerAction);
            });
            conn.on('close', () => {
                console.log('Connection closed.');
                server.connections.delete(conn);
                server._playersByPeerId.delete(conn.peer)
            });
            conn.on('error', e => console.error('Connection error', e));
        });

        return server;
    }

    static async join(hostName: string, peerConfig?: PeerOptions, clientName?: string): Promise<GameServer> {
        const server = new GameServer(peerConfig);
        server._hostName = clientName ?? getNewHashId('xxxxx');
        const client = new Peer(server.peerId, server.config);

        server.peer = client;

        client.on('open', id => console.log('Client peer created with id', id));
        client.on('error', err => console.error('Client error', err));
        client.on('disconnected', () => console.warn('Client disconnected'));
        client.on('close', () => console.warn('Client closed'));

        client.on('open', () => {
            const conn = client.connect(GameServer.buildPeerUri(hostName));

            conn.on('data', d => server.emit('action', d as PlayerAction));
            conn.on('close', () => {
                console.log('Connection closed.');
                server.connections.delete(conn);
            });
            conn.on('error', e => console.error('Conn error', e));

            conn.on('open', () => {
                console.log('Client connection opened.');
                server.connections.add(conn);
                server.send(createAction('join_request', { player: localPlayer }));
                server.emit('ready');
            });
        });

        return server;
    }

    send(action: PlayerAction) {
        if (this.connections.size <= 0) {
            console.log("No data connection set.");
            return;
        }
        this.connections.forEach(x => x.send(action));
    }

    dispose() {
        this.connections.forEach(x => x.close());
        this.connections.clear();
        this.peer?.destroy();
    }
}