import { common } from './common.js';
import { game } from './Game.js';
import { defaultSeed, defaultSeeds, FRAMERATE, setDefaultSeed, TYPES } from './global.js';
import { playSound, sounds } from './sound.js';

const FRAME_LENGTH = FRAMERATE;

const searchParams = new URLSearchParams(window.location.search);

const debugNetwork = searchParams.get('debugNetwork');

const debugPingPong = searchParams.get('debugPingPong');

const debugNetworkStats = searchParams.get('debugNetworkStats');

const getIdFromURL = () => searchParams.get('id');

// were we given an ID from a friend to connect to?
const remoteID = getIdFromURL();

// PeerJS option: ordered, guaranteed delivery ("file transfer") vs. not ("gaming")
let reliable = !searchParams.get('unreliable');

let peer;
let peerConnection;

const avg = (a) => a.reduce((x,y) => x + y) / a.length;

let pingStack = [];

// averaging period for ping / lead times
const stackSize = 5;

// last received packet
let timePair = {
  t1: null,
  t2: null
};

const statsByType = {};

function updateStatsByType(type, direction) {
  
  // e.g., type = 'PING', direction = 'tx'

  if (!statsByType[type]) {
    statsByType[type] = {
      tx: 0,
      rx: 0
    }
  }

  statsByType[type][direction]++;

}

function startDebugNetworkStats() {

  if (!debugNetworkStats) return;

  window.setInterval(() => {
    if (net.connected) console.log(statsByType);
  }, 10000);
  
}

// filter certain message types, so lights blink mostly with user actions vs. all the time
const blinkingLightsExempt = {
  RAW_COORDS: true,
  PING: true,
  PONG: true
};

// for "blinking LED" lights
let oLights;
let oLightsSubSprite;

let incomingOffset = 0;
let outgoingOffset = 0;

let lastLEDOffset;

// certain messages bypass the queue, and are processed immediately
const processImmediateTypes = {
  SYN: true,
  SYNACK: true,
  ACK: true
};

const connectionText = `Connecting, “${reliable ? 'reliable' : 'fast'}” delivery...`;

const showLocalMessage = (html) => console.log(html);

function sendDelayedMessage(obj, callback) {

  /**
   * Send in "time to get there" (half-trip = half-pingtime), plus a few frames.
   * This should help keep objects consistent on both sides, i.e., a balloon dies,
   * but has time to kill the helicopter that ran into it before dying itself.
   */

  // current difference in frame count implies lag, in FRAME_LENGTH msec per frame
  const delta = Math.max(1, game.objects.gameLoop.data.frameCount - game.objects.gameLoop.data.remoteFrameCount);

  /**
   * If playing on LAN / via wifi etc., half-trip might be a few miliseconds.
   * We want to ensure this message arrives "late", to avoid killing something early.
   */
  const MIN_FRAME_DELAY = 3 * FRAME_LENGTH;

  // Take the greater of half-trip vs. computed delta in frames between clients, vs. MIN_FRAME_DELAY.
  const delay = Math.max(MIN_FRAME_DELAY, Math.max((delta + 1) * FRAME_LENGTH, net.halfTrip));

  if (debugNetwork) console.log(`💌 sendDelayedMessage(): sending in ${delay.toFixed(2)} msec. Network Δ = ${delta}, ${(delta * FRAME_LENGTH).toFixed(2)} msec`, obj);

  common.setFrameTimeout(() => sendMessage(obj, callback), delay);

}

function sendMessage(obj, callback, delay) {

  if (debugNetwork) console.log('💌 sendMessage', game.objects.gameLoop.data.frameCount);

  // decorate with timing information
  // hat tip: https://github.com/mitxela/webrtc-pong/blob/master/pong.htm
  peerConnection?.send({
    ...obj,
    frameCount: game.objects.gameLoop.data.frameCount,
    t1: timePair.t1,
    t2: timePair.t2,
    tSend: performance.now()
  });

  net.sentPacketCount++;

  // only certain messages cause "modem lights" to blink.
  if (!blinkingLightsExempt[obj.type]) net.outgoingLEDCount++;

  updateStatsByType(obj.type, 'tx');

  if (debugNetwork) {
    if (obj.type === 'GAME_EVENT') {
      if (!window.gameEventsTx) {
        window.gameEventsTx = [];
      }
      window.gameEventsTx.push(obj);
    } else if (obj.type === 'ADD_OBJECT') {
      if (!window.addObjectsTx) {
        window.addObjectsTx = [];
      }
      window.addObjectsTx.push(obj);
    }
  }

  if (!callback) return;

  // execute this locally after a (default) half-ping-time delay.

  setTimeout(callback, delay);

}

function pingTest() {

  sendMessage({ type: 'SYN', seed: defaultSeed, seeds: defaultSeeds });

}

const messageActions = {

  'RAW_COORDS': (data) => {

    // mouse and viewport coordinates, "by id."

    let helicopter = game.objectsById[data.id];

    if (!data?.id || !helicopter) {
      console.warn(`RAW_COORDS: No helicopter by ID ${data.id}?`);
      return;
    }

    if (!helicopter.data.isRemote) {
      console.warn('RAW_COORDS: WTF, incoming data for local helicopter? Bad logic / ID mis-match??', helicopter.data.id, data);
      return;
    }

    if (helicopter.data.isCPU) {

      // *** CPU PLAYER ***
      if (data.x !== null) helicopter.data.x = data.x;
      if (data.y !== null) helicopter.data.y = data.y;

      helicopter.data.vX = data.vX;
      helicopter.data.vY = data.vY;

    } else {

      // *** HUMAN PLAYER ***
      helicopter.data.mouse.x = (data.x || 0);
      helicopter.data.mouse.y = (data.y || 0);

      // view
      helicopter.data.scrollLeft = data.scrollLeft;
      helicopter.data.scrollLeftVX = data.scrollLeftVX;
      
    }

    if (debugNetwork) {
      console.log('RX: RAW_MOUSE_COORDS + view -> helicopter.data', data);
    }

  },

  'REMOTE_ORDER': (data) => {

    // net.sendMessage({ type: 'REMOTE_ORDER', orderType: type, options, id: player.data.id });
    if (debugNetwork) console.log('RX: REMOTE_ORDER', data);

    if (debugNetwork && !game.objectsById[data.id]) {
      console.warn('REMOTE_ORDER: WTF, no objectsById for data.id (remote friendly helicopter, co-op?', data.id);
    }

    // assume remote is a friendly player, at this point...
    game.objects.inventory.order(data.orderType, data.options, game.objectsById[data.id]);

  },

  'NOTIFICATION': (data) => {

    // TODO: move this into inventory

    if (debugNetwork) console.log('RX: NOTIFICATION', data);

    let msg = `${data.html}`;

    if (data.notificationType === 'remoteOrder') {
      // PeerJS seems to mangle emoji sent over the wire.
      msg = `📦 ${msg} 🛠️`;
    }

    // indicating this is a remote thing
    msg += ' 📡';

    game.objects.notifications.add(msg);

    // and make a noise
    if (sounds.inventory.begin) {
      playSound(sounds.inventory.begin);
    }

  },

  'ADD_OBJECT': (data) => {

    // e.g.
    /*
    net.sendMessage({
      type: 'ADD_OBJECT',
      objectType: bomb.type,
      params: {
        ...bombArgs,
        // redefine `parent` as an ID for lookup on the other side
        parent: exports.data.id // local player here -> remote player there
      }
    });
    */

    if (debugNetwork) {

      console.log('RX: ADD_OBJECT', data);

      if (!window.addObjectsRx) window.addObjectsRx = [];

      window.addObjectsRx.push(data);

    }

    // TODO: DRY as with params.parent
    if (data.params?.target) {

      const obj = game.findObjectById(data.params.target, 'ADD_OBJECT: no target?', data.params.target);
      if (!obj) return;

      // re-assign to the live object, as it was intended.
      data.params.target = obj;

    }

    // this should be something created by the "remote" player / helicopter.

    // TODO: refactor proper key input delays, so this isn't entirely needed.
    let syncAndFastForward;

    // if params.parent specified, it's an ID; do a look-up.
    // this should simply be the "remote" helicopter, here.
    // TODO: make this ID -> object lookup business a nice utility method.
    if (data.params?.parent) {

      if (typeof data.params.parent !== 'string') {
        // TODO: maybe leave this and do the ID swap here.
        console.warn('ADD_OBJECT: parent is an object, not an ID string?', data.params.parent.data.id);
        return;
      }

      const obj = game.findObjectById(data.params.parent, 'ADD_OBJECT: no parent?', data.params.parent);
      if (!obj) return;

      // re-assign to the live object, as it was intended.
      data.params.parent = obj;

      // HACK: until input delay for gunfire, smart missiles and bombs, let's try this.
      // SPECIAL HANDLING: if the parent is a remote helicopter, "re-sync" coordinates and try fast-forwarding by the delta of frames.
      if (data.params.parent.data.type === TYPES.helicopter) {

        // console.log('type for re-sync', data.objectType);

        if (data.objectType === TYPES.gunfire) {

          syncAndFastForward = true;

          // console.log('RE-SYNCING remote gunfire', data);

          // get params based on the current state, then fast-forward
          let newParams = data.params.parent.getGunfireParams();

          data.params.x = newParams.x;
          data.params.y = newParams.y;
 
          data.params.vX = newParams.vX;
          data.params.vY = newParams.vY;

        } else if (data.objectType === TYPES.smartMissile) {

          syncAndFastForward = true;

          // console.log('RE-SYNCING remote smart missile', data);

          // get params based on the current state, then fast-forward
          let newParams = data.params.parent.getSmartMissileParams();

          data.params.x = newParams.x;
          data.params.y = newParams.y;
            
        } else if (data.objectType === TYPES.bomb) {

          syncAndFastForward = true;

          // console.log('RE-SYNCING remote bomb', data);

          // get params based on the current state, then fast-forward
          let newParams = data.params.parent.getBombParams();

          data.params.x = newParams.x;
          data.params.y = newParams.y;

          data.params.vX = newParams.vX;
          data.params.vY = newParams.vY;
          
        }
        
      }

    }

    // flag as "from the network", to help avoid confusion.
    const newObject = game.addObject(data.objectType, {
      ...data.params,
      fromNetworkEvent: true
    });

    if (newObject && syncAndFastForward) {
      // this thing has been re-synced to the helicopter position, after delivery.
      // console.log('fast-forwarding new object');
      // we know precisely how many frames behind (or ahead) the remote is, because we have their frame count here vs. ours.
      // notwithstanding, try to round down to nearest 1-frame delay.
      const frameLagBetweenPeers = Math.max(0, Math.min(game.objects.gameLoop.data.frameCount - data.frameCount, Math.floor(net.halfTrip / FRAMERATE)));
      console.log('fast-forward object, lag between peers - based on packet.frameCount:', game.objects.gameLoop.data.frameCount - data.frameCount, 'vs. halfTrip / FRAMERATE:', (net.halfTrip / FRAMERATE), 'result:', frameLagBetweenPeers);
      for (let i = 0; i < frameLagBetweenPeers; i++) {
        newObject.animate();
      }
    }

  },

  'GAME_EVENT': (data) => {

    /**
     * An RPC of sorts. Can take an object of params: {}, OR, a value.
     * net.sendMessage({ type: 'GAME_EVENT', id: target.data.id, method: 'die', params: { attackerId: attacker.data.id }});
     * net.sendMessage({ type: 'GAME_EVENT', id: data.id, method: 'capture', value: isEnemy });
     * data = { id, method, params = [] }
     */

    const obj = game.findObjectById(data.id, 'GAME_EVENT: data.id');
    if (!obj) return;

    if (!obj[data.method]) {
      console.warn(`GAME_EVENT: WTF no method ${data.method} on data.id ${data.id}?`, data.method);
      return;
    }

    if (data.value !== undefined) {

      // arguments as single value / array

      if (debugNetwork) console.log('GAME_EVENT: calling method', obj.data.id, obj[data.method], data.value);

      if (data.value instanceof Array) {
        obj[data.method](...data.value);  
      } else {
        obj[data.method](data.value);
      }
      
    } else if (data.params) {

      // arguments as object

      if (data.method === 'die') {

        // hackish: mark the object so we don't send a redundant GAME_EVENT back, when it dies.
        obj.data.dieViaGameEvent = true;

        const attacker = game.findObjectById(data.params.attackerId, 'GAME_EVENT: Could not find attacker by ID, may have died.');

        if (attacker) {

          // HACKISH: if die(), do what common does and mutate the target.
          obj.data.attacker = attacker;

          obj[data.method]({ attacker });

        } else {

          // method, sans-attacker
          obj[data.method]();

        }

      } else {

        // with params
        obj[data.method]({ ...data.params });

      }
     
    } else {

      // no arguments
      obj[data.method]();

    }

  },

  'SYN': (data) => {

    if (data.seed !== undefined) {
      if (debugNetwork) console.log('network SYN: received seed', data);
      setDefaultSeed(data.seed, data.seeds);
    }

    sendMessage({ type: 'SYNACK' });

    if (pingStack.length && pingStack.length < stackSize) {
      showLocalMessage(`${connectionText}<br />Ping: ${avg(pingStack).toFixed(1)}ms`);
    }

  },

  'SYNACK': (/*data*/) => {

    if (pingStack.length < stackSize) {

      showLocalMessage(`Ping ${pingStack.length}/${stackSize}: ${avg(pingStack).toFixed(1)}ms`);

      // do more SYN -> ACK until we fill the stack
      sendMessage({ type: 'SYN' });

      return;

    }

    // "The first is usually unrepresentative, throw away"
    pingStack.shift();

    let halfTrip = avg(pingStack) / 2;

    console.log(`half-roundtrip, time to reach remote: ${halfTrip}ms`);

    sendMessage({ type: 'ACK' });

    // wait for half the roundtrip time before starting the first frame
    setTimeout(() => { net.startGame?.() }, halfTrip);

  },

  'ACK': (data) => {
    console.log('Got ACK: starting game', data);
    net.startGame?.();
  },

  'PING': (data) => {
    if (debugPingPong) console.log('RX: PING', data);
    net.sendMessage({ type: 'PONG' });
  },

  'PONG': (data) => {
    if (debugPingPong) console.log('RX: PONG', data);
  },


};

function processData(data) {

  // somebody loves us; we have a message. 💌

  if (debugNetwork) console.log('💌 RX: processData', data);

  net.newPacketCount++;

  // firstly, process roundtrip / half-trip, ping time data.
  let ping, recTime = performance.now();

  // update with the latest
  timePair.t1 = data.tSend;
  timePair.t2 = recTime;

  if (data.t1) {

    // calculate roundtrip /\/\/ -> half-trip, time to reach remote - delay / latency.
    let t1 = data.t1,
       t2 = data.t2,
       t3 = data.tSend,
       t4 = recTime;

    ping = t4 - t1 - (t3 - t2);

    pingStack.push(ping);

    if (pingStack.length > stackSize) {
      pingStack.shift();
    }

    net.halfTrip = avg(pingStack) / 2;

  }

  if (!data?.type) {
    console.warn('💌 net::processData(): WTF no message type?', data);
    return;
  }

  updateStatsByType(data.type, 'rx');

  // hack: these don't count toward "blinking lights."
  if (!blinkingLightsExempt[data.type]) {
    net.incomingLEDCount++;
  }

  // special case: run things like ping test and ping/pong immediately, no queueing.
  if (processImmediateTypes[data.type]) {

    if (messageActions[data.type]) {
      messageActions[data.type](data);
    } else {
      console.warn('💌 net::processData(): unknown message type?', data.type);
    }

    return;

  }

  // messages will be processed within the game loop.
  rxQueue.push(data);

}

function processMessage(data) {

  if (!data?.type) {
    console.warn('💌 net::processMessage(): WTF no data or type?', data);
    return;
  }

  if (messageActions[data.type]) {
    messageActions[data.type](data);
  } else {
    console.warn('💌 net::processMessage(): unknown message type?', data.type);
  }

}

function processRXQueue(localFrameCount = game.objects.gameLoop.data.frameCount) {

  /**
   * Given a frame count, find and process all network messages received up to that frame count.
   * 
   * The remote frame count is the latest-received / newest message in the queue.
   * We'll use this to "fast-forward" and catch up to the remote, if our window was in the background etc.
   * TODO: break this number out into per-client-ID objects, if and when multiplayer is implemented.
   */

  if (rxQueue.length) {
    game.objects.gameLoop.data.remoteFrameCount = rxQueue[rxQueue.length - 1].frameCount;
  }

  let remaining = [];

  // Accommodate for a number of frames' difference.
  const frameLagBetweenPeers = Math.ceil(net.halfTrip / FRAME_LENGTH);

  for (var i = 0, j = rxQueue.length; i < j; i++) {
    if (localFrameCount >= rxQueue[i].frameCount - frameLagBetweenPeers) {
      processMessage(rxQueue[i]);
    } else {
      remaining.push(rxQueue[i]);
    }
  }

  rxQueue = remaining;

}

function updateUI() {

  /**
   * LED lights, shamelessly stolen from Windows 9x/XP's `lights.exe`,
   * which showed modem lights in the taskbar.
   * 
   * Tangengially-related YouTube throwbacks to HyperTerminal and dial-up:
   * https://www.youtube.com/shorts/ObpkS96EksM
   * https://www.youtube.com/shorts/W4XM5-HFzhY
   */

  // tick-style values for packets, so they stay lit for a few frames.
  if (net.outgoingLEDCount) {
    outgoingOffset += (net.outgoingLEDCount * 3);
    net.outgoingLEDCount = 0;
  }

  if (net.incomingLEDCount) {
    incomingOffset += (net.incomingLEDCount * 3);
    net.incomingLEDCount = 0;
  }

  let offset = 0;

  // which lights go green?
  if (outgoingOffset) {
    offset = (incomingOffset ? 3 : 1);
  } else if (incomingOffset) {
    offset = 2;
  }

  // reverse pattern, making lights blink after the first frame.
  if ((outgoingOffset && outgoingOffset % 3 !== 0) || (incomingOffset && incomingOffset % 3 !== 0)) {
    offset = 3 - offset;
  }

  if (incomingOffset) incomingOffset--;
  if (outgoingOffset) outgoingOffset--;

  if (offset !== lastLEDOffset) {
    lastLEDOffset = offset;
    oLightsSubSprite.style.setProperty('transform', `translate(${-16 * offset}px, 0px`);
  }

}

// received messages, queued and processed per-frame
let rxQueue = [];

const net = {

  debugNetwork,
  connected: false,
  halfTrip: 0,

  // referenced by game loop for lock-step
  newPacketCount: 0,
  sentPacketCount: 0,

  // all others - for blinking lights
  incomingLEDCount: 0,
  outgoingLEDCount: 0,

  active: false,
  isHost: !remoteID,

  processRXQueue,
  updateUI,
  sendDelayedMessage,
  sendMessage,

  init: (onInitCallback, startGameCallback) => {

    if (!window.Peer) {

      // go get it.
      if (debugNetwork) console.log('Loading PeerJS...');

      var script = document.createElement('script');

      script.onload = () => net.init(onInitCallback, startGameCallback);

      // TODO: show in the UI.
      script.onerror = (e) => console.log('Error loading PeerJS', e);
      script.src = 'script/peerjs@1.4.7.js';

      document.head.appendChild(script);

      return;

    }

    oLights = document.getElementById('lights');
    oLightsSubSprite = oLights.childNodes[0];

    document.getElementById('network-status').style.display = 'inline-block';

    console.log(`Using ${reliable ? 'reliable' : 'fast'} delivery`);

    // PeerJS options
    const debugConfig = {
      // debug: 3
    };
    
    peer = new window.Peer(null, debugConfig);

    if (debugNetwork) console.log('net.init()', peer);

    // hackish: here's what will be called when the ping test is complete.
    net.startGame = () => startGameCallback?.();

    peer.on('open', (id) => {
      
      // show a link to send to a friend
      if (debugNetwork) console.log('got ID', id);

      if (!remoteID) {

        // you're going to be the host.
        net.isHost = true;

        // provide the ID to the host for display; otherwise, ignore.
        onInitCallback?.(id);

      } else {

        // you are the guest, connecting to the host.
        net.isHost = false;

        if (debugNetwork) console.log('Connecting...');

        net.connect(remoteID, onInitCallback);

      }

    });

    peer.on('connection', (conn) => {

      // "SERVER" (host) - incoming connection

      peerConnection = conn;

      net.active = true;

      // Client has connected to us
      if (debugNetwork) console.log('HOST: Connection received from remote client', conn);

      conn.on('open', () => {

        if (debugNetwork) console.log('HOST: connection opened');

        net.connected = true;

        conn.on('data', (data) => processData(data));

        if (debugNetwork) console.log('starting ping test');

        pingTest();

        startDebugNetworkStats();

      });

      conn.on('close', () => {

        const msg = '💥 Network connection has closed. ☠️';

        game.objects.notifications.add(msg);

        net.connected = false;

        showLocalMessage(msg);

      });

    });

  },

  connect: (peerID, callback) => {

    // CLIENT / GUEST: connecting to host / server
  
    if (!peerID) {
      console.warn('connect: need peerID');
      return;
    }
  
    // "reliable" or "fast" delivery options - PeerJS makes fast the default.
    const options = {
      reliable
    };
  
    showLocalMessage(connectionText);
  
    const connection = peer.connect(peerID, options);
 
    connection.on('data', (data) => processData(data));

    connection.on('open', () => {
  
      // connection opened to PeerServer
  
      if (debugNetwork) console.log('connection opened to PeerServer');
  
      net.connected = true;
  
      peerConnection = connection;

      net.active = true;

      startDebugNetworkStats();

      callback?.();
    
    });
  
    connection.on('close', () => {
  
      if (debugNetwork) console.log('connection close!');
  
      const msg = '💥 Connection has closed. ❌👻';
  
      net.connected = false;
 
      showLocalMessage(msg);
      
    });
  
  },

  remoteID

};

export { net };