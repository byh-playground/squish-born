// `node scripts/pwa.mjs`로 manifest·아이콘·공유 이미지·sw.js·<head> 태그를 만들고, `--check`는 커밋된 결과가 원본과 같은지만 확인합니다.
// 생성기는 dist fcd3a02(v0.39.1)에 고정한 GameKit pwa-build.mjs이며 sha256은 docs/gamekit.json과 scripts/check.cjs가 확인합니다.
import { chromium } from 'playwright';
import { buildPwa } from './vendor/gamekit/pwa-build.mjs';

const { changed } = await buildPwa({
    chromium,
    name: '꾹꾹 디펜스 / Squish Born',
    shortName: '꾹꾹 디펜스',
    description: '볼을 눌렀다 놓아 털실 동료를 부화시키고 작은 정원을 지키는 디펜스 게임입니다.',
    lang: 'ko',
    icon: 'assets/pwa/icon.svg',
    maskableIcon: 'assets/pwa/icon-maskable.svg',
    share: 'assets/pwa/share.svg',
    themeColor: '#f3eee4',
    backgroundColor: '#f3eee4',
    startUrl: './',
    scope: './',
    siteUrl: 'https://byh-playground.github.io/squish-born/',
    html: 'index.html',
    // 시작에 필요한 같은 origin 파일 전부: 페이지, 원본 ESM·CSS, 시작 화면과 렌더러가 읽는 SVG 원본·manifest, 그라디언트 어댑터.
    precache: ['index.html', 'src/**', 'assets/svg/*', 'assets/gradient-adapter.js'],
    out: '.',
    check: process.argv.includes('--check'),
});
console.log(changed.length ? 'PWA files written: ' + changed.join(', ') : 'PWA files up to date');
