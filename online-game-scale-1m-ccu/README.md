# Scaling an online game to 1M CCU — bộ slide HTML, bản 2 (40 slide)

Deck 2 của series game online (Deck 1 là độ trễ, `../latency-slides/`). Cả bài đi theo **một game giả định**,
"Trận Đồng" (5v5, 10 người/trận, studio Việt), lớn dần qua bốn mốc **~500 → 10K → 100K → 1M CCU**, và **một
người chơi**: Bình (hoodie cam). Luật kể: **chỉ thêm một thành phần khi phép tính dung lượng cho thấy thiết kế cũ gãy**.

| Phần | Slide | Nội dung |
|---|---|---|
| Setup | 1–5 | bìa; tải thật có thể gấp 50× kế hoạch; năm hệ thống trong buổi tối của Bình; bảy giả định + một số đo thật của Riot (công thức chính); bảng mục tiêu có ngưỡng |
| ~500 CCU | 6–7 | slide chuyển mốc; một binary Go + Postgres, 36 trận / host 36 core |
| 10K CCU | 8–11 | chuyển mốc; tách match server (stateful) khỏi platform (stateless); matchmaker + allocator (Ready); frame time là đòn bẩy chi phí |
| 100K CCU | 12–15 | chuyển mốc; deploy API làm rơi mọi socket; tầng gateway epoll; session directory |
| 1M · dung lượng | 16–21 | chuyển mốc; shard hồ sơ; ticket store; pool tìm trận; ~560 host + đệm Ready; băng thông |
| 1M · sự cố | 22–29 | chuyển mốc; login queue; health check riêng + timeout; pub/sub thay full mesh; region; control plane; thang tắt tính năng; load test |
| Wrap-up | 30–31 | cú bấm của Bình qua 8 thành phần; "Add a component only when the math breaks" + bảng mục tiêu điền đủ |
| Phụ lục | 32–40 (B1–B9) | bảng dung lượng đầy đủ; ba loại game; Fortnite 6 sự cố; Roblox freelist; leaderboard ZSET; outbox; vendor 2026; Discord guild; Pokémon GO 50× |

Nguồn nội dung: `../../reports/Độ trễ và scale game online.md`. Lượt soát v2: `.work/review/` (xem dưới).

## Chạy

Mở `index.html` trực tiếp (file://) hoặc qua server tĩnh bất kỳ; không cần build, không cần mạng.
Server dev của phiên làm việc: cấu hình `deck2-1m-ccu` (port 8792) trong `../../.claude/launch.json`.

| Phím | Tác dụng |
|---|---|
| → Space PgDn | nếu slide còn đang chạy bước thì hiện trọn slide; nếu xong thì sang slide sau |
| ← PgUp | slide trước (hiện trọn) |
| R | chạy lại các bước của slide · A bật / tắt tự chạy bước |
| ↓ ↑ | slide sau / trước · Home / End |
| 12 Enter | nhảy tới slide 12 (phụ lục là 32–40) |
| N | ghi chú người nói · P cửa sổ presenter |
| G | danh sách slide theo phần · F toàn màn hình · B màn hình đen · ? trợ giúp |
| X | ẩn / hiện dòng "Next →" góc trên phải |
| E ⇧E | xuất PDF: slide / slide + ghi chú |

## Cách trình bày (luật v2, từ `.work/review/design-direction.md`)

- **Engine** giống Digital Wallet (`js/deck.js`), khung **1920 × 1080**: headline ≤ 10 từ, một dòng ngữ cảnh,
  hình 1240 × 720 bên trái, **dải bước đánh số bên phải** (chữ 30 px), rồi một ảnh minh chứng.
- **Magenta #DB2777 chỉ cho thành phần mới của slide** (và giá trị giả định, chữ nghiêng). Số bước là vòng tròn mực;
  "(est.)" màu xám nghiêng. **Cam #EA580C chỉ cho Bình.** ✓ ✗ ~ xanh/đỏ/hổ phách chỉ ở bảng mục tiêu.
- **Ba lớp số:** số có nguồn màu mực kèm nguồn; số suy ra luôn có "est."; giả định magenta nghiêng.
  Mọi con số dung lượng thống nhất một nguồn (bảng B1): 10K ≈ 20 → ~5 host; 1M = 70K trận ≈ 467 → **~560 host**,
  đệm Ready ~3.000 server ≈ 20 host; DB 39K writes/s vs 1 primary ≈ 10K (giả định) → 4 shard; login 3.300/s,
  admit 2.000/s, vị trí 360.000 ≈ 3 phút.
- **Bảng mục tiêu có ngưỡng:** Fast to match (< 30 s), No drops (crash/deploy mất ≤ 1 trận), Sane cost ($/CCU phẳng).
  Slide 5 giới thiệu; **5 slide chuyển mốc** dùng lại lưới đó (dòng hiện tại tô vàng); slide 31 điền đủ.
  Từ slide 7, **thẻ nhỏ góc phải** giữ các mốc đã qua, tự tìm ô vừa đổi (`data-score`) và in một dòng lý do (`data-why`).
- **Canvas kiến trúc cố định** (`tools/build_canvas.py`): mọi box ở đúng tọa độ báo cáo, không bao giờ dời chỗ;
  box không liên quan mờ 35 %, mỗi box có icon tab (queue, gateway, API, directory, pub/sub, funnel, target, servers),
  đường của Bình luôn màu cam, Gateway luôn là pod A B C …; mỗi tuyên bố "quá tải" là **thanh so với ngưỡng** có số.
- **Ảnh là bằng chứng, không trang trí:** trích nguyên văn postmortem, biểu đồ thật, màn hình lỗi thật; chú thích = điều
  ảnh chứng minh · nguồn; không dùng lại cùng một key art.
- **Bìa và slide kết:** nền "1 chấm = 1 người chơi, Bình màu cam" vẽ bằng code (`assets/img/d2-cover-dots.svg`)
  thay cho ảnh đám đông AI.

## Cấu trúc

```
index.html                 40 slide; SVG nhúng sẵn; ghi chú tiếng Việt trong <aside class="notes">
css/deck.css               khung 1920×1080, dải bước, mini-scorecard + dòng lý do, lưới mục tiêu, footer, bước, in
css/fonts.css              IBM Plex Sans / Mono (SIL OFL)
css/slides.css             bìa, slide chuyển mốc, hook (1), chân dung (2), bảng (B1), kv / calc / note chip, finale
js/deck.js                 engine + scorecard (data-score / data-why / .scoregrid) + footer nguồn/ảnh + data-title
assets/diagrams/           d2-sNN-*.svg, d2-bN-*.svg, d2-s06-blast, d2-s07-lifecycle, d2-s14-pairs, d2-canvas-master
assets/img/                ảnh minh chứng (ev-*), ảnh game (img-*), ảnh gen (d2-s02-binh-evening.jpg), CREDITS.md
docs/diagram-brief*.md     brief v1 và v2 gửi cho Codex / Antigravity
notes/kich-ban-trinh-bay.md  kịch bản, xuất từ index.html
export/                    PDF: scaling-to-1m-ccu.pdf (40 trang), …-notes.pdf (80 trang)
tools/                     build_canvas.py, sync_svg.py, check_svg.py (+ svgcheck.html), gallery.html,
                           export_script.py, export_pdf.py (+ cdp.py)
.work/review/              ảnh chụp từng slide, 3 bản critique, design-direction, plan-v2, script chụp và audit
.work/retired/             ảnh / SVG không còn dùng (giữ lại để đối chiếu)
```

## Chỉnh sửa

- **Canvas kiến trúc:** sửa `BOXES` hoặc hàm `sNN()` trong `tools/build_canvas.py`, chạy nó, rồi `tools/sync_svg.py`.
- **Sơ đồ khác:** sửa file trong `assets/diagrams/`, chạy `python3 tools/sync_svg.py`, rồi `python3 tools/check_svg.py`
  (chữ < 22 px, nhãn chồng nhau, nét đi qua chữ, tràn khung, id thiếu tiền tố `sNN-` / `bN-`; checker bỏ qua cặp phần tử
  không bao giờ cùng hiện nhờ `data-step-only`).
- **Xem nhanh một hình:** `/tools/gallery.html?f=d2-s12-db-shard.svg` qua server dev.
- **Scorecard:** `data-score="1M ✓ ✓ ~"` (thêm `drop|fast|cost|none` ở cuối để chỉ định ô đổi) và `data-why="…"` trên slide.
- **Lời nói:** sửa `<aside class="notes">`, rồi `python3 tools/export_script.py`. **PDF:** `python3 tools/export_pdf.py --all`.

## Ai làm gì (Agent Fabric)

- **Claude** (phiên này): điều phối; engine 1920×1080, scorecard và slide chuyển mốc; `index.html` (headline, dải bước,
  ghi chú tiếng Việt, số liệu thống nhất); **master canvas và 12 slide kiến trúc** + panel blast radius / Agones
  lifecycle; nền bìa dạng chấm; soát mọi hình peer giao, sửa slide 15, 18 (v1), 23 (v2) và chuỗi tham chiếu slide.
- **4 agent Claude (subagent) cho lượt soát v2:** 1 nghiên cứu hướng thiết kế (`design-direction.md`, 15 nguồn),
  3 critique độc lập slide 1–9, 10–18, 19–25 + phụ lục.
- **Antigravity** (agent-fabric): v1 — SVG slide 3, 31 (cũ) và phụ lục, ảnh `common-crowd-unit.png`;
  v2 — vẽ lại slide 2, 3, 4, 11, 19, 20, 21, 24, 28, 29, 30 và B3–B9 (nhận lại phần Codex khi Codex hết quota).
- **Codex** (agent-fabric): v1 — SVG slide 2, 4, 5, 11, 19–21, 24, 28–30; v2 — ảnh **Bình buổi tối**
  (`d2-s02-binh-evening`, GPT Image). Hai lượt SVG v2 và ảnh bìa của Codex thất bại vì hết quota.
- **Subagent tìm ảnh** (Claude): ảnh game và 12 ảnh minh chứng `ev-*`, ghi nguồn trong `assets/img/CREDITS.md`.

## Ảnh

**Gen / vẽ:** `d2-s02-binh-evening.jpg` (slide 3, Codex GPT Image, tham chiếu `../shared/common-binh-sheet.png`);
`common-crowd-unit.png` (slide 23, Antigravity); `d2-cover-dots.svg` (bìa + slide 31, Claude vẽ bằng code).

**Ảnh thật** (credit dưới ảnh và ở footer; nguồn đầy đủ trong `assets/img/CREDITS.md`):

| File | Slide | Chứng minh | Credit |
|---|---|---|---|
| img-pokemongo.jpg | 2 | 50× tải kế hoạch | Niantic / The Pokémon Company |
| img-fortnite-2018.jpg | 2 | 60K → 3.4M CCU | Epic Games |
| ev-riot-frametime.png | 11 | 2,34 ms = 3 trận/core | Riot Games |
| ev-lol-friends.png | 13 | mỗi bạn online = 1 socket | Riot Games |
| ev-gopher-1m-ws.png | 14 | 1M socket Go: ~20 GB → ~600 MB | Eran Yanay, GopherCon IL 2019 |
| ev-epic-mongo-quote.png | 18 | 15% truy vấn / 11% ghi trên một shard, ghi > 40 s | Epic Games postmortem |
| ev-wow-queue.png | 23 | hàng chờ người chơi nhìn thấy | Blizzard Entertainment |
| ev-epic-health-quote.png | 24 | worker chờ Memcached → health fail → LB rút node | Epic Games postmortem |
| ev-sea-cables.png | 26 | cáp biển VN / SG (pin đặt theo tọa độ đã kiểm) | TeleGeography |
| ev-roblox-outage.png | 27 | người chơi Roblox rơi về ~0 ngày 28/10/2021 | Roblox postmortem |
| ev-helldivers-capacity.png | 28 | "Servers at capacity" | Arrowhead / Sony Interactive |
| ev-nakama-ccu.png | 29 | ~2,04M CCU giữ 4 giờ | Heroic Labs / AWS |
| img-valorant.jpg, img-star-citizen.jpg, img-clash-of-clans.jpg | B2 | ba loại game | Riot · CIG · Supercell |
| img-epic-postmortem-latency.png | B3 | p99 ~18 s ngày 3/2/2018 | Epic Games |
| img-discord.png | B8 | presence / bạn bè online | Discord |

## Kiểm tra đã chạy (v2)

| Kiểm tra | Kết quả |
|---|---|
| `tools/check_svg.py` trên mọi SVG đang dùng (chữ ≥ 22 px, chồng nhãn, nét qua chữ, tràn khung, id) | 0 lỗi |
| `tools/sync_svg.py` | 33 hình nhúng, 0 thiếu |
| Audit JS 40 slide ở trạng thái cuối (`.work/review/audit.py`): headline/ngữ cảnh một dòng, cột phải không tràn, mọi ảnh tải được, không phần tử nào ra ngoài khung, footer không bị cắt, dòng lý do không đè cột phải | 0 lỗi |
| Xem từng slide ở 1920×1080 (`.work/review/shots/`) | 40 / 40 |
| `tools/export_pdf.py --all` | 40 trang slide; 80 trang slide + ghi chú; mọi slide ở bước cuối |

## Còn lại

- Chưa chạy thử với người trình bày, chưa thử trên máy chiếu.
- B8: các đường fan-out tới cột session thứ 2–3 luồn sau cột thứ nhất nên trông như nối chuỗi (phụ lục, chưa sửa).
- Vài ảnh minh chứng nhỏ chữ khi hiển thị 480 px (biểu đồ Nakama, Roblox); con số đã được ghi lại trong chú thích.
