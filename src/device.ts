let _isMobile: boolean | undefined;

const role: string | undefined = new URLSearchParams(location.search).get('role') ?? undefined;
const isClient = role === 'client';
const isHost = role === 'host';
const hasRole = isClient || isHost;

export function isMobile(): boolean {
    if (_isMobile) return _isMobile;
    if (hasRole) {
        _isMobile = isClient;
        return _isMobile;
    }
    const ua = navigator.userAgent || '';
    const chMobile = (navigator as any).userAgentData?.mobile === true; // Chrome/Edge
    const touch = navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
    const iPadOS = /Mac/.test(ua) && touch; // iPad iOS13+ without platform
    const uaMobile = /Android|iPhone|iPad|iPod/i.test(ua);
    _isMobile = !!(chMobile || uaMobile || iPadOS);
    return _isMobile;
}
