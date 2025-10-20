export function isMobile(): boolean {
    const ua = navigator.userAgent || '';
    const chMobile = (navigator as any).userAgentData?.mobile === true; // Chrome/Edge
    const touch = navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
    const iPadOS = /Mac/.test(ua) && touch; // iPad iOS13+ without platform
    const uaMobile = /Android|iPhone|iPad|iPod/i.test(ua);
    return !!(chMobile || uaMobile || iPadOS);
}
