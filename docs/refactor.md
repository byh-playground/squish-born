# 0.11.1 — 원본 이관과 공통 실행 정렬

0.11.0 원본 713,370바이트의 SHA-256은 origin.json에 보존한다. HTML의 내장 AUDIO_DATA와 Config(게임 수치), 재질·전투 구현은 변경하지 않았다. 기존 이름·저장 키·아트·보상 규칙을 유지했다. 포인터 해제와 좁은 화면 도감 복귀가 개선되는 호환 변경이므로 관리 규칙에 따라 PATCH를 올렸다.

## 변경과 소유권

- 공식 GameKit input.createDOMInput이 장치 포인터 수집, document fallback, capture, cancel, blur/pagehide 정리를 소유한다. 중복 DOM 포인터 listener와 수동 capture 코드를 삭제했다. 게임은 첫 포인터 우선권·월드 좌표·명령 순서만 결정한다. Space/1의 목표 위치 보조와 메뉴 단축키는 게임 정책이며 액션 bool로 여러 입력을 합치지 않는다.
- 공식 simloop.createLoop이 고정 60TPS, accumulator, catch-up, rAF를 소유한다. 기존 자체 accumulator와 다음 rAF 예약을 삭제했다. session capability는 실제 Simulation.update와 renderer.update를 호출한다. 시험용 엔진 대역이 아니다. pause/resume/restart마다 SDK timing을 초기화하며 숨김 동안 따라잡지 않는다.
- IS-A: 각 9개 재질 클래스는 WaxBall의 실제 하위 타입이다. HAS-A: CompositeBall은 현재 재질·순서·단계 진행을 소유한다. Simulation은 명령 큐·경제·보상·전투의 유일한 소유자다. 이 관계를 범용 component registry로 바꾸지 않았다. 새 선택 능력(CAN-BE)이 없어 인위적 mixin을 추가하지 않았다.
- 단독 플레이와 연습 모드는 같은 Simulation과 입력 경로를 쓴다. 재질의 완료 전이가 한 번만 hatch를 확정하고 renderer/audio는 확정 사건을 소비한다. 멀티·rollback이 없어 speculative event journal과 LocalInputPreview는 해당 없음이다. 가짜 프리뷰나 두 번째 권위 시뮬레이션을 만들지 않았다.
- 기존 previous/current 위치와 SDK alpha로 단독 60TPS의 표시 보간을 유지한다. 원격 표본·rollback·예측 전환이 없는 게임에 PresentationRuntime의 별도 history를 추가하지 않았다. 생성·제거는 원본 시뮬레이션 목록 수명과 일치하며 pause는 진행 중 압착과 오디오를 정리한다.
- 기존 AudioBus는 내장 녹음의 decode, 구간 재생, 가변 rate/pan, tag별 stop, 실시간 공기 소리를 소유한다. 공통 audio 모듈의 고정 sound-definition one-shot API로 억지로 치환하면 이 게임의 재질 소리 계약이 달라져 유지했다. 등록 버퍼와 source 종료는 실제 브라우저 오디오로 검증했다.
- 390px 화면의 키 큰 도감 modal이 가운데 정렬로 위쪽 밖에 배치되어 닫기 버튼에 도달하지 못했다. flex-start와 auto block margin으로 화면에 맞으면 중앙, 크면 위에서 스크롤되도록 수정했다.

## SDK와 전달

GitHub Releases 엔드포인트에 발행된 release는 없었으며 최신 공식 tag v0.3.0과 dist head가 같은 63c62dae8d339f6f0329c0940206806f69509630임을 확인했다. input/simloop의 공식 배포 바이트를 manifest SHA-256으로 확인하고 data URL ESM으로 내장했다. SDK 고지/주석을 바꾸지 않았다. 배포는 단일 HTML, runtime fetch 없음. 원본 없는 축약 엔진이나 rollback-netcode compatibility bundle은 없다.

## 실제 검증 근거

[수정 전 원본 기록](baseline-verification.json)은 모바일 도감 닫기 실패를 기록한다. 그 전에 마우스 early/cancel/Perfect/Good/과압/중복보상/오디오/저장과 모바일 early/cancel/Perfect가 실제 Edge에서 통과했다.

[수정 후 기록](verification-local.json)은 같은 사용자 시나리오 20개 PASS이다. OS trusted 마우스와 CDP touchStart/touchEnd/touchCancel을 사용하고, 원본 read-only BloomHatchery 진단 API로 결과를 관측한다. 게임 상태 주입·시계 교체·엔진 mock·임의 재질 생성은 하지 않는다. 자연스러운 새 게임 UI를 통해 공기빼기볼이 나오는 판에서 검사하므로 랜덤 특성 조합이 매번 다를 수 있다.

분석기 비영 출력은 실제 Web Audio 그래프 증거이며 사람이 스피커로 청취했다는 뜻은 아니다. 전체 물리 기기·장시간 균형·모든 재질/겹볼 조합은 미검증이다.

## 0.11.2 — 정식 표시명

문서 title, 상단 브랜드, 시작화면, 도움말, BUILD.name을 꾹꾹 디펜스 / Squish Born으로 정렬했다. 사용자에게 보이는 이름 변경이므로 PATCH를 올렸다. 기존 저장 키·내보내기 파일명·AUDIO_DATA·Config부터 게임/렌더 클래스 구간은 그대로다. 원본 출처의 0.11.0 이름과 과거 검증 기록은 역사적 사실로 보존한다.

## 0.11.3 — GameKit v0.3.1

공식 dist `72b09b260edf9650353017acb49c06873fe9f5a1` (source `baa96876876a08013ad28b5a71c83bfadd285fab`)의 input/simloop를 정확한 배포 바이트로 내장했다. input은 이전과 동일하며 simloop만 갱신되었다. manifest 원본과 SHA-256, 실행 진단 pin, 고정 사용자 시나리오의 기대 pin을 함께 동기화했다. BUILD_ID는 `20261014-squish-born-gamekit031-r1`이다. SDK의 호환 수정 적용이므로 PATCH만 올렸다.

네트워크 모듈·별도 엔진·호환 경로를 추가하지 않았다. 기존 Simulation/입력/렌더 소유권과 게임·오디오·그래픽·Config·저장 계약을 유지했다. SDK 바이트·pin·버전·BUILD_ID 교체를 제외한 HTML 전체가 직전 기준본과 같음을 비교했다.

[현재 검증 기록](verification-gamekit031-local.json)에 정적 PASS와 브라우저 환경 차단을 분리해 기록했다. 기존 고정 E2E를 실제 `/usr/bin/chromium`으로 실행하려 했으나 시작 단계에서 `socket() failed: Operation not permitted`로 중단되었다. 권한 확장 실행에서도 동일하여 게임 흐름은 실행되지 않았다. 실행별 180초 상한을 유지했고, 임시 런처는 저장소에 넣지 않았다. 과거 버전의 브라우저 결과를 이번 버전의 PASS로 재사용하지 않는다.
