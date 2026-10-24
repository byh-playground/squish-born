import { installShowcase } from 'https://cdn.jsdelivr.net/gh/byh-playground/bloom-gamekit@566306b49bf205c908839ad8527c4a72d778a45f/scenario.js';
const REAL_KEYS = {bubble:80,keyboard:75,honey:75,chocolate:75,soda:75,butter:90};
function perform(name, win) {
    if (name !== 'hatch') return true;
    const api = win.BloomHatchery;
    if (!api) return false;
    const egg = api.inspect().simulation.eggs[0];
    if (!egg || egg.state !== 'sealed' || egg.press) return true;
    const best = egg.best;
    const duration = REAL_KEYS[egg.material] || Math.min(1100, Math.max(140, Math.round((best?.threshold || 0.54) * 1000 + 35)));
    const input = down => win.document.dispatchEvent(new win.KeyboardEvent(down ? 'keydown' : 'keyup', {key:' ', code:'Space', bubbles:true, cancelable:true}));
    input(true);
    win.setTimeout(() => input(false), duration);
    return true;
}
const SHOWCASE = installShowcase({
    title:'꾹꾹 디펜스',
    launcher:'#startBtn',
    playSelector:'#startBtn',
    durationMs:26000,
    ready:win=>!!win.BloomHatchery?.inspect,
    custom:perform,
    timeline:[
  {
    "atMs": 0,
    "action": "chapter",
    "index": 0,
    "title": "손끝에서 동료가 태어납니다",
    "caption": "재질의 금과 주름을 보고 알맞은 순간 누르고 떼세요."
  },
  {
    "atMs": 700,
    "action": "click",
    "selector": "#startBtn"
  },
  {
    "atMs": 1800,
    "action": "custom",
    "name": "hatch"
  },
  {
    "atMs": 4100,
    "action": "custom",
    "name": "hatch"
  },
  {
    "atMs": 6200,
    "action": "custom",
    "name": "hatch"
  },
  {
    "atMs": 8000,
    "action": "chapter",
    "index": 1,
    "title": "정원을 지키는 자동 전투",
    "caption": "부화한 동료가 적을 공격하고, 직접 부화할수록 수비가 단단해집니다."
  },
  {
    "atMs": 8600,
    "action": "custom",
    "name": "hatch"
  },
  {
    "atMs": 10800,
    "action": "custom",
    "name": "hatch"
  },
  {
    "atMs": 12800,
    "action": "custom",
    "name": "hatch"
  },
  {
    "atMs": 15700,
    "action": "chapter",
    "index": 2,
    "title": "재질마다 다른 손맛",
    "caption": "완벽한 손길은 더 많은 동료와 조개 보상으로 연결됩니다."
  },
  {
    "atMs": 16200,
    "action": "custom",
    "name": "hatch"
  },
  {
    "atMs": 18400,
    "action": "custom",
    "name": "hatch"
  },
  {
    "atMs": 20700,
    "action": "custom",
    "name": "hatch"
  },
  {
    "atMs": 23000,
    "action": "custom",
    "name": "hatch"
  }
]
});

// Restore direct introduction links after the game's own menu router has booted.
if (window.__BLOOM_SHOWCASE_DEEPLINK && SHOWCASE) {
    window.addEventListener('load', () => SHOWCASE.open(), { once: true });
}
