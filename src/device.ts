const localServer = new URLSearchParams(location.search).get('server');
export const useLocalServer = () => !!localServer;

const hostName = new URLSearchParams(location.search).get('host');
export const getHostFromUrl = () => hostName;

export type Role = 'host' | 'client';
const r = new URLSearchParams(location.search).get('role');
const role: Role | undefined = r === 'host' || r === 'client' ? r : undefined;

export const getRole = () => role;
export const isClient = () => role == 'client';
export const isHost = () => role == 'host';

let _isMobile: boolean | undefined;

export function isMobile(): boolean {
    if (_isMobile)
        return _isMobile;

    const ua = navigator.userAgent || '';
    const chMobile = (navigator as any).userAgentData?.mobile === true; // Chrome/Edge
    const touch = navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
    const iPadOS = /Mac/.test(ua) && touch; // iPad iOS13+ without platform
    const uaMobile = /Android|iPhone|iPad|iPod/i.test(ua);
    _isMobile = !!(chMobile || uaMobile || iPadOS);
    return _isMobile;
}
