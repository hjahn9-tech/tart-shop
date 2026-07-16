import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "소개",
  description: "Tart Shop이 무엇이고 어떻게 게임을 만드는지 소개합니다.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <article className="prose-tart mx-auto max-w-2xl">
      <h1 className="font-serif-display text-4xl text-cocoa">Tart Shop 소개</h1>
      <p>
        Tart Shop은 브라우저에서 바로 즐기는 원터치 미니게임 아케이드입니다. 설치도
        회원가입도 필요 없어요. 디저트 가게를 콘셉트로, 짧게 한 판 즐기기 좋은 게임을
        직접 기획하고 만들어 올립니다.
      </p>

      <h2>우리가 만드는 방식</h2>
      <p>
        게임은 모두 브라우저에서 바로 실행되는 HTML5로 만듭니다. 게임마다 폴더를 따로
        두어 서로 간섭하지 않고, 소개와 공략도 게임별로 직접 씁니다. 숫자를 무작정
        늘리기보다 한 판이라도 제대로 즐길 수 있게 다듬는 쪽을 택했어요.
      </p>

      <h2>연락처</h2>
      <p>
        문의나 피드백은 이메일{" "}
        <a className="text-berry underline" href="mailto:hello@tart-shop.example">
          hello@tart-shop.example
        </a>
        로 보내주세요. 남겨주신 의견은 다음 게임을 만들 때 실제로 반영합니다.
      </p>
    </article>
  );
}
