import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "Tart Shop의 개인정보 및 광고(쿠키) 정책 안내.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <article className="prose-tart mx-auto max-w-2xl">
      <h1 className="font-serif-display text-4xl text-cocoa">개인정보처리방침</h1>
      <p>
        Tart Shop(&ldquo;서비스&rdquo;)은 이용자의 개인정보를 소중히 다룹니다. 이
        방침은 서비스가 어떤 정보를 어떻게 처리하는지 안내합니다.
      </p>

      <h2>수집하는 정보</h2>
      <p>
        서비스는 회원가입을 요구하지 않고, 이름이나 이메일 같은 개인 식별 정보를 직접
        수집하지 않습니다. 최고 점수 같은 게임 기록은 이용자의 브라우저 안에만
        저장됩니다.
      </p>

      <h2>광고와 쿠키</h2>
      <p>
        서비스는 Google이 제공하는 광고(Google H5 Games Ads / AdSense)를 게재할 수
        있습니다. Google을 비롯한 제3자 광고 사업자는 쿠키를 사용해 이용자의 관심사에
        맞는 광고를 제공할 수 있습니다. 이용자는{" "}
        <a
          className="text-berry underline"
          href="https://www.google.com/settings/ads"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google 광고 설정
        </a>
        에서 맞춤 광고를 관리하거나 해제할 수 있습니다.
      </p>

      <h2>문의</h2>
      <p>
        개인정보 관련 문의는{" "}
        <a className="text-berry underline" href="mailto:hello@tart-shop.example">
          hello@tart-shop.example
        </a>
        로 보내주세요.
      </p>
    </article>
  );
}
