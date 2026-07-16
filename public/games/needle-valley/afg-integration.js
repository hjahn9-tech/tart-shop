/*
 * afg-integration.js — Google H5 Games Ads (Ad Placement API) 표준 래퍼
 * -------------------------------------------------------------------
 * ⚠️ 이 파일은 게임 HTML 안에서 로드됩니다. (포털 iframe이 아니라 게임 document)
 *    Ad Placement API(adBreak/adConfig)는 반드시 게임 canvas와 같은 document에
 *    있어야 광고가 노출됩니다. 임의로 포털로 옮기지 마세요.
 *
 * 동작 모드
 *  - 실물 모드: window.__ADSENSE_CLIENT 에 ca-pub-... 가 설정되고 adsbygoogle.js가
 *    로드되어 있으면 진짜 adBreak()를 호출합니다.
 *  - 테스트 모드: 클라이언트 ID가 없으면(=지금) 자리표시자 오버레이 + 콘솔 로깅으로
 *    광고 트리거/콜백/일시정지·재개 동기화를 검증합니다. (AdSense 승인 전 단계)
 *
 * 게임이 쓰는 API
 *    AFG.interstitial({ name, onBeforeAd, onAfterAd })
 *    AFG.rewarded({ name, onBeforeAd, onReward, onAfterAd, onDismiss })
 */
(function () {
  var CLIENT = window.__ADSENSE_CLIENT || null;
  var REAL = !!(CLIENT && Array.isArray(window.adsbygoogle));

  // 표준 adBreak/adConfig 브릿지 (실물 모드에서만 실제 push)
  var adBreak =
    window.adBreak ||
    function (o) {
      (window.adsbygoogle = window.adsbygoogle || []).push(o);
    };

  function log(evt, name, extra) {
    // Phase 4에서 여기 GA4/자체 로깅을 연결한다. 지금은 콘솔로 검증.
    console.log(
      "[AFG]",
      (REAL ? "real" : "test") + ":" + evt,
      name || "",
      extra || ""
    );
  }

  // ---- 테스트 모드 자리표시자 오버레이 -------------------------------
  function showPlaceholder(label, ms, done) {
    var el = document.createElement("div");
    el.style.cssText =
      "position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;" +
      "align-items:center;justify-content:center;background:rgba(15,10,10,.92);" +
      "color:#fff8f0;font-family:system-ui,sans-serif;text-align:center;gap:10px";
    var count = Math.ceil(ms / 1000);
    el.innerHTML =
      '<div style="font-size:13px;letter-spacing:.2em;opacity:.6">광고 (테스트)</div>' +
      '<div style="font-size:20px;font-weight:700">' +
      label +
      "</div>" +
      '<div data-c style="font-size:13px;opacity:.7"></div>';
    document.body.appendChild(el);
    var c = el.querySelector("[data-c]");
    var t = setInterval(function () {
      count -= 1;
      if (c) c.textContent = count > 0 ? count + "초…" : "";
    }, 1000);
    setTimeout(function () {
      clearInterval(t);
      el.remove();
      done();
    }, ms);
  }

  // ---- 인터스티셜: game over → 메뉴 복귀 시 ---------------------------
  function interstitial(opts) {
    opts = opts || {};
    var name = opts.name || "interstitial";
    var before = opts.onBeforeAd || function () {};
    var after = opts.onAfterAd || function () {};

    log("request", name);
    if (REAL) {
      adBreak({
        type: "next",
        name: name,
        beforeAd: function () {
          log("beforeAd", name);
          before();
        },
        afterAd: function () {
          log("afterAd", name);
          after();
        },
      });
      return;
    }
    // 테스트 모드
    before();
    log("beforeAd", name);
    showPlaceholder("전면 광고", 2000, function () {
      log("afterAd", name);
      after();
    });
  }

  // ---- 리워드: "이어하기" 선택 시 ------------------------------------
  function rewarded(opts) {
    opts = opts || {};
    var name = opts.name || "rewarded";
    var before = opts.onBeforeAd || function () {};
    var reward = opts.onReward || function () {};
    var after = opts.onAfterAd || function () {};
    var dismiss = opts.onDismiss || function () {};
    var granted = false;

    log("request", name);
    if (REAL) {
      adBreak({
        type: "reward",
        name: name,
        beforeAd: function () {
          log("beforeAd", name);
          before();
        },
        beforeReward: function (showAdFn) {
          // 광고 사용 가능 → 즉시 노출
          showAdFn();
        },
        adViewed: function () {
          log("reward", name);
          granted = true;
          reward();
        },
        adDismissed: function () {
          log("dismiss", name);
          dismiss();
        },
        afterAd: function () {
          log("afterAd", name);
          after();
        },
      });
      return;
    }
    // 테스트 모드: 항상 리워드 지급으로 가정
    before();
    log("beforeAd", name);
    showPlaceholder("리워드 광고", 2000, function () {
      granted = true;
      log("reward", name);
      reward();
      log("afterAd", name);
      after();
    });
  }

  // ad frequency hint (실물 모드에서 adsbygoogle.js의 data-ad-frequency-hint와 함께 사용)
  window.AFG = {
    mode: REAL ? "real" : "test",
    interstitial: interstitial,
    rewarded: rewarded,
  };
  log("ready", "AFG", "mode=" + window.AFG.mode);
})();
