// Original exhibition copy. No external articles or unpublished product facts.
"use strict";

const SCROLL_CHAPTERS = [
  ["指先から、遠くまで。", "小さく合わせる、大きく進む。", "まずはゆっくり、文章を動かしてみてください。行と行の間、文字の輪郭、余白の幅。ほんの少しの移動でも、止まっている基準線と見比べると変化が分かります。"],
  ["一行を、選ぶ。", "止めたいところで、止める。", "長い文章を読むとき、いつも大きく動かす必要はありません。次の一行へ進んだり、気になった一節へ戻ったり。細かな往復が、読み進めるリズムをつくります。"],
  ["余白を、渡る。", "密度が変わると、動きが見える。", "文字が続く場所と、空間が広がる場所。同じ距離を動いていても、見える景色は変わります。余白を通り過ぎる瞬間と、新しい段落が現れる瞬間を見比べてください。"],
  ["目印に、合わせる。", "番号のついた線を、基準線へ。", "右側に止まっている目印を見ながら、番号のついた線を近づけてみましょう。行き過ぎたら、少しだけ戻ります。合わせるための特別なモードはありません。"],
  ["遠くの章へ。", "今度は、長い距離を進む。", "細かく合わせたあとは、少し先の章へ。操作を強めたとき、文章がどこまで進むか確かめてください。章番号と全体の進捗は、移動が速くても現在地を教えてくれます。"],
  ["並びを、追う。", "短い行が、次々と通り過ぎる。", "短い言葉が縦に並ぶと、上下への移動を追いやすくなります。表のような行を眺めながら、速度を変えてみてください。読み取れる速さへ戻す操作も、体験の一部です。"],
  ["途中で、戻る。", "進むことと、戻ること。", "目的の場所を通り過ぎても、最初からやり直す必要はありません。方向を変え、目印をもう一度探します。遠くまで進む操作と、最後のわずかな調整をつなげてみましょう。"],
  ["文字を、眺める。", "長い段落と、短いひとこと。", "文章にはさまざまな長さがあります。画面いっぱいに続く説明もあれば、たった一行で終わる言葉もあります。その違いが、指先の操作を目で確かめる手がかりになります。"],
  ["手元と、画面。", "入力した分だけ、景色が変わる。", "上の欄に文字を打ちながら、この文章も動かせます。カーソルの場所を選び直す必要はありません。キーの点灯、文字の入力、文章の移動を一緒に試してみてください。"],
  ["もう一度、ゆっくり。", "最後は、一つの目印へ。", "終わりが近づいたら、また小さな動きへ戻してみましょう。長い距離を進むことと、狙った位置に止めること。その両方を、同じ画面で確かめられます。"],
];

function buildScrollContent(container) {
  const fragment = document.createDocumentFragment();
  const rowWords = ["指先の動き", "文字の間隔", "次の一行", "余白の広がり", "離れた目印"];
  SCROLL_CHAPTERS.forEach(([title, lead, body], chapter) => {
    const section = document.createElement("section");
    section.className = "scroll-chapter";
    section.dataset.chapter = String(chapter + 1);
    const number = String(chapter + 1).padStart(2, "0");
    section.innerHTML = `<header class="chapter-head"><span class="chapter-number">${number}</span><div><span class="chapter-kicker">FIELD NOTES / ${number}</span><h3>${title}</h3></div></header>`;
    const intro = document.createElement("p");
    intro.className = "chapter-lead";
    intro.textContent = lead;
    section.appendChild(intro);
    for (let group = 0; group < 2; group++) {
      const marker = document.createElement("div");
      marker.className = "scroll-target";
      marker.innerHTML = `<span>${number} — ${String(group + 1).padStart(2, "0")}</span><i></i><span>ALIGN</span>`;
      const paragraph = document.createElement("p");
      paragraph.textContent = body;
      section.append(marker, paragraph);
      const rows = document.createElement("div");
      rows.className = "reference-rows";
      for (let row = 0; row < 3; row++) {
        const item = document.createElement("div");
        const line = chapter * 6 + group * 3 + row + 1;
        item.innerHTML = `<span>${String(line).padStart(3, "0")}</span><span>${rowWords[(chapter + row + group) % rowWords.length]}</span><span>············</span>`;
        rows.appendChild(item);
      }
      section.appendChild(rows);
    }
    fragment.appendChild(section);
  });
  const end = document.createElement("p");
  end.className = "scroll-end";
  end.textContent = "END OF NOTES — 上へ戻って、もう一度。";
  fragment.appendChild(end);
  container.replaceChildren(fragment);
}
