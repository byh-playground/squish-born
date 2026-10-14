# 꾹꾹 디펜스 · Squish Born

재질마다 다른 볼을 누르고 떼어 털실 동료를 부화시키고, 작은 정원을 지키는 자동 디펜스입니다. 바삭·쪼물·팝·버터·키캡·꿀·초콜릿·탄산·공기빼기 9종을 만지며 Good·Perfect·무결점 보상과 동료 도감을 모읍니다.

**[바로 플레이 · Play](https://byh-playground.github.io/squish-born/)** · **0.11.1** · [단일 HTML 프리뷰](https://htmlpreview.github.io/?https://github.com/byh-playground/squish-born/blob/main/index.html)

![실제 Edge에서 동료를 부화시킨 게임 화면](docs/squish-born-desktop.png)

Press, hold and release textured balls to hatch yarn companions in a cozy auto-defense game. Nine materials reward different timing. Practice without combat or defend the garden together.

## 조작·실행

- PC 마우스 / 터치: 볼의 금·주름·기포를 눌렀다 재질에 맞는 순간 놓습니다. 공기빼기볼은 가운데를 꾹 눌러 거의 납작해질 때 놓습니다.
- Space / 1: 현재 목표 위치 보조. 누르는 시간은 직접 조절합니다. P / Esc 또는 상단 일시정지 버튼으로 쉽니다.
- 처음 화면에서 정원 방어 또는 전투 없는 연습을 선택합니다. 도감·소리 설정은 상단에서 엽니다.

빌드가 필요 없습니다. 실행 파일은 **index.html 하나**이며 공식 GameKit 두 모듈과 녹음 음원까지 내장합니다. Node.js 22 이상에서:

```sh
npm run dev
# http://127.0.0.1:8767
npm ci
npm run check
npm test
```

Windows 검증은 설치된 Edge를 사용합니다. 다른 환경은 Playwright Chromium을 설치하고 BROWSER_CHANNEL=chromium을 지정합니다. TEST_URL로 공개 Pages에 같은 사용자 시나리오를 실행할 수 있습니다. 실행당 상한은 180초입니다.

## 검증·배포

[실제 Edge 155 검증](docs/verification-local.json): 20개 PASS, 오류 0. 마우스·390×844 터치 압착, 조기 해제·취소·과압, Good 1명/무결점 3명 부화, 중복 보상 없음, 오디오 20개 버퍼·실제 출력 샘플, 도감·일시정지·재시작·저장 복원, 방어 웨이브를 확인했습니다. [모바일 화면](docs/squish-born-mobile.png).

물리 스마트폰·스피커 청취·5웨이브 전체 밸런스·9종의 모든 특성과 겹볼 조합은 이번 재검증 범위가 아닙니다. 멀티플레이 기능은 없습니다. 원본의 과거 검증 주장을 현재 PASS로 합산하지 않습니다.

PR CI는 실제 내장 SDK 해시와 ESM 구문을 검사합니다. main 병합 시 동일 index.html을 GitHub Actions Pages에 배포합니다. CI 구문 검사와 실제 브라우저 검증 기록은 별개입니다.

## 원본·공통 모듈·권리

원본은 **왁뿌 부화장 0.11.0**, 게임 안의 기존 이름과 그림·재질·조작을 보존했습니다. [원본 출처·SHA-256](docs/origin.json) · [이번 수정과 구조 검토](docs/refactor.md) · [GameKit 고정 정보](docs/gamekit.json).

GameKit **v0.3.0** / dist **63c62dae8d339f6f0329c0940206806f69509630**의 공식 input·simloop를 그대로 내장합니다. 이전 pointer capture/listener와 자체 accumulator/rAF chain을 제거했습니다. 게임 판정·보상·전투는 하나의 Simulation, 각 재질은 WaxBall 하위 타입, 겹볼은 기존 재질을 조합해 상태를 소유합니다. 단독 로컬 플레이에 불필요한 네트워크·예측·호환 번들은 추가하지 않았습니다.

[음원 출처·CC0 확인](docs/audio-sources.md)을 읽어 주세요. 모든 기존 음원·그래픽 고지를 유지했습니다. 게임 전체에 MIT 등 새 라이선스를 임의 부여하지 않습니다. 공개됨이 별도 재사용 라이선스를 의미하지 않습니다.

[개발 규칙](https://github.com/byh-playground/bloom-reference/blob/1ab53f97402638ae58ae8c77fba8d18530dea7d6/rules/development.html) · [관리·검증 규칙](https://github.com/byh-playground/bloom-reference/blob/1ab53f97402638ae58ae8c77fba8d18530dea7d6/rules/project-management.html) · [UI/UX 규칙](https://github.com/byh-playground/bloom-reference/blob/1ab53f97402638ae58ae8c77fba8d18530dea7d6/rules/visual-ux.html)
