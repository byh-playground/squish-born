// bloom-gamekit pwa가 생성한 파일입니다. 직접 고치지 말고 생성 스크립트를 다시 실행하세요.
(function serviceWorker(config) {
  const SCOPE = self.registration.scope;
  const PREFIX = `bloom-pwa:${new URL(SCOPE).pathname}:`;
  const CACHE = PREFIX + config.version;
  const RUNTIME = PREFIX + "gamekit";
  const GAMEKIT = new RegExp(config.gamekit);
  self.addEventListener("install", (event) => {
    event.waitUntil(
      caches.open(CACHE).then(
        (cache) => cache.addAll(
          config.precache.map(
            (url) => GAMEKIT.test(url) ? new Request(url, { mode: "cors" }) : new Request(url, { cache: "reload" })
          )
        )
      )
    );
  });
  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches.keys().then(
        (keys) => Promise.all(
          keys.filter((key) => key.startsWith(PREFIX) && key !== CACHE && key !== RUNTIME).map((key) => caches.delete(key))
        )
      ).then(() => self.clients.claim())
    );
  });
  self.addEventListener("message", (event) => {
    if (event.data?.type === config.activateMessage) {
      self.skipWaiting();
    }
  });
  async function sameOrigin(request) {
    const STORE = await caches.open(CACHE);
    const NAVIGATE = request.mode === "navigate";
    let response = await STORE.match(request, { ignoreSearch: NAVIGATE });
    const ADDRESS = new URL(request.url);
    if (!response && NAVIGATE && ADDRESS.pathname.endsWith("/")) {
      response = await STORE.match(new URL("index.html", ADDRESS).href);
    }
    return response ?? fetch(request);
  }
  async function gamekit(request) {
    const CACHED = await caches.match(request);
    if (CACHED) {
      return CACHED;
    }
    const RESPONSE = await fetch(request);
    if (RESPONSE.ok) {
      const STORE = await caches.open(RUNTIME);
      await STORE.put(request, RESPONSE.clone());
    }
    return RESPONSE;
  }
  self.addEventListener("fetch", (event) => {
    const REQUEST = event.request;
    if (REQUEST.method !== "GET") {
      return;
    }
    if (new URL(REQUEST.url).origin === self.location.origin) {
      event.respondWith(sameOrigin(REQUEST));
    } else if (GAMEKIT.test(REQUEST.url)) {
      event.respondWith(gamekit(REQUEST));
    }
  });
})({
    "version": "fab8e8fad2952ee9",
    "activateMessage": "bloom-pwa:activate",
    "gamekit": "^https:\\/\\/cdn\\.jsdelivr\\.net\\/gh\\/byh-playground\\/bloom-gamekit@[0-9a-f]{40}\\/[A-Za-z0-9._/-]+$",
    "precache": [
        "assets/gradient-adapter.js",
        "assets/svg/enemy-boss.svg",
        "assets/svg/enemy-brute.svg",
        "assets/svg/enemy-moss.svg",
        "assets/svg/enemy-runner.svg",
        "assets/svg/enemy-tangle.svg",
        "assets/svg/field-background.svg",
        "assets/svg/hatch-background.svg",
        "assets/svg/knead-skin.svg",
        "assets/svg/manifest.json",
        "assets/svg/nest.svg",
        "assets/svg/unit-healer-gold.svg",
        "assets/svg/unit-healer.svg",
        "assets/svg/unit-mushroom-gold.svg",
        "assets/svg/unit-mushroom.svg",
        "assets/svg/unit-needle-gold.svg",
        "assets/svg/unit-needle.svg",
        "assets/svg/unit-spore-gold.svg",
        "assets/svg/unit-spore.svg",
        "assets/svg/unit-sprout-gold.svg",
        "assets/svg/unit-sprout.svg",
        "index.html",
        "manifest.webmanifest",
        "pwa/apple-touch-icon.png",
        "pwa/icon-192.png",
        "pwa/icon-512.png",
        "pwa/maskable-512.png",
        "src/main.js",
        "src/presentation/vector-path.js",
        "src/showcase.js",
        "src/styles/main.css",
        "https://cdn.jsdelivr.net/gh/byh-playground/bloom-gamekit@fcd3a02db452b2e469898b05aa797d754a89fb76/pwa.js",
        "https://cdn.jsdelivr.net/gh/byh-playground/bloom-gamekit@fcd3a02db452b2e469898b05aa797d754a89fb76/rendering.js",
        "https://cdn.jsdelivr.net/gh/byh-playground/bloom-gamekit@fcd3a02db452b2e469898b05aa797d754a89fb76/save.js",
        "https://cdn.jsdelivr.net/gh/byh-playground/bloom-gamekit@fcd3a02db452b2e469898b05aa797d754a89fb76/scenario.js",
        "https://cdn.jsdelivr.net/gh/byh-playground/bloom-gamekit@fcd3a02db452b2e469898b05aa797d754a89fb76/vector-assets-loader.js",
        "https://cdn.jsdelivr.net/gh/byh-playground/bloom-gamekit@fcd3a02db452b2e469898b05aa797d754a89fb76/vector-assets.js"
    ]
});
