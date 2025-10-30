// npx --yes -p peer peerjs --port 9000 --key peerjs
export const PEER_JS_CONFIG = {
    host: '127.0.0.1',
    port: 9000,
    path: '/',
    secure: false,
    key: 'peerjs',
    debug: 3 as const,
    pingInterval: 5000,
    config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
};