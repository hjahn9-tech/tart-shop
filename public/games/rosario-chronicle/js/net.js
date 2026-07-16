// ============================================================
// 온라인 코옵 네트워킹 (M2) — 호스트 권위 + 씬 게스트
// 릴레이 서버(ws://:8081)를 통한 방 코드 기반 1:1 중계
// ============================================================
export const state = {
  role: null,            // 'host' | 'guest' | null
  connected: false,
  peer: false,           // 상대 접속 여부
  remoteInput: { ix: 0, iz: 0, skills: [false, false, false, false], world: false },
};

let ws = null;
let cb = {};

export function connect(room, asHost, callbacks, authName) {
  cb = callbacks || {};
  state.role = asHost ? 'host' : 'guest';
  // 릴레이 주소: ?relay=host:port 파라미터 > 로컬 기본값. https 페이지에서는 wss 필요.
  const param = new URLSearchParams(location.search).get('relay');
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const url = param ? `${proto}://${param}` : `${proto}://${location.hostname}:8081`;
  ws = new WebSocket(url);
  ws.onerror = () => { cb.onError && cb.onError('릴레이 서버에 연결할 수 없습니다 (코옵은 로컬/전용 서버에서)'); };
  ws.onopen = () => {
    state.connected = true;
    if (authName) send({ t: 'auth', name: authName });
    send({ t: asHost ? 'host' : 'join', room });
  };
  ws.onmessage = (e) => {
    let m;
    try { m = JSON.parse(e.data); } catch (err) { return; }
    switch (m.t) {
      case 'hosted': cb.onHosted && cb.onHosted(); break;
      case 'joined': state.peer = true; cb.onJoined && cb.onJoined(); break;
      case 'peer': state.peer = true; cb.onPeer && cb.onPeer(); break;
      case 'peerleft': state.peer = false; cb.onPeerLeft && cb.onPeerLeft(); break;
      case 'err': cb.onError && cb.onError(m.msg); break;
      case 'input': state.remoteInput = m.i; break;
      case 'savedata': cb.onSave && cb.onSave(m.data); break;
      default: cb.onMsg && cb.onMsg(m);
    }
  };
  ws.onclose = () => {
    const wasPeer = state.peer;
    state.connected = false; state.peer = false;
    if (wasPeer && cb.onPeerLeft) cb.onPeerLeft();
  };
}

export function send(o) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(o));
}
