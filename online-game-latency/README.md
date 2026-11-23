# Latency in Online Games — bộ slide HTML (Deck 1, 24 slide + phụ lục A1–A8)

Deck 1 của series game online: **xử lý và tối ưu độ trễ**. Cả bài đi theo **một phát bắn**: An (xanh dương) bắn
Bình (cam) đang chạy qua khoảng trống về phía một bức tường thấp, qua một server authoritative. Mỗi slide có
**một headline, tối đa một dòng ngữ cảnh, một hình, và một dải bước đánh số** (bên phải hình, hoặc dưới hình),
giống cách làm của deck Digital Wallet. Chữ trên slide bằng tiếng Anh, tối giản; lời nói tiếng Việt nằm trong ghi chú.

Giả định chạy suốt bài: server 64 tick/s (15,6 ms), snapshot 20/s (50 ms), client 60 FPS (16,7 ms), RTT 40 ms cho cả
hai người. Mọi tổng ms là **ước tính minh họa** (tag "est." trên slide).

| Phần | Slide | Nội dung |
|---|---|---|
| Mở đầu | 1 | Cảnh An – Bình – server, mỗi chiều 20 ms |
| Setup | 2–4 | năm từ vựng, bốn mục tiêu (scorecard), vì sao game bắn súng khó nhất |
| Netcode techniques | 5–13 | dumb client, trust client, prediction, reconciliation, snapshot nhảy cóc, interpolation, ba sự thật, lag compensation, authority vẫn ở server |
| Latency budget | 14–17 | thanh ngân sách ~190 ms, tăng tần suất gửi/tick, FPS của client, case Valorant |
| Infrastructure | 18–22 | server trong nước vs cáp biển, chọn region theo ping, backbone/relay, tick của server Go, đo trong production |
| Wrap-up | 23–24 | rollback và lockstep, tổng kết 190 → ~71 ms |
| Appendix | A1–A8 | chết sau tường, bảng triệu chứng, sub-tick, nén, input delay, interest management, UDP/WebTransport, bảng tính ngân sách |

**Scorecard** bốn ô (Instant · Smooth · Fair · Cheat-proof) nằm ở góc trên phải từ slide 5; mỗi slide kỹ thuật lật
đúng một ô (viền magenta), slide 13 cho thấy cả bốn ô xanh. Magenta chỉ dùng cho "thứ mới trên slide này".

Luật kể chuyện (người trình bày yêu cầu):
- chỉ good case trên slide; edge case nằm trong ghi chú hoặc phụ lục (A1, A2, A5);
- mỗi thành phần mới có lý do trên màn hình trước khi xuất hiện (ô đỏ ở slide trước);
- không slide nào dựa vào thứ được giới thiệu sau;
- slide đọc được khi không có người nói, nhờ hình, nhãn và con số.

## Cách mở

Mở `index.html` trực tiếp (file://) hoặc qua server tĩnh. Không cần build, không cần mạng (SVG nhúng sẵn, font kèm theo).

| Phím | Tác dụng |
|---|---|
| → / Space | hết bước của slide thì sang slide sau |
| ← | slide trước (hiện đủ) |
| R | chạy lại các bước |
| A | tắt/bật tự chạy bước (tắt thì → đi từng bước) |
| N | ghi chú người nói (tiếng Việt) · P cửa sổ presenter |
| G | danh sách slide · F toàn màn hình · B màn hình đen · ? trợ giúp |
| X | ẩn/hiện dòng "Next →" trong footer |
| E / ⇧E | xuất PDF slide / slide + ghi chú |
| `#12.3` trong URL | mở slide 12 ở bước 3 |

## Cách trình bày (khác deck Digital Wallet ở đâu)

- Cùng engine (`js/deck.js`): bước tự chạy 0,6 s, `data-step` / `data-step-only` / `data-hl` / `data-dim`, presenter, xuất PDF.
- Bảng màu theo style guide của series: An `#2563EB`, Bình `#EA580C`, server/hạ tầng `#1F2937`, magenta `#DB2777` chỉ cho cái mới,
  ✓ `#16A34A` / ✗ `#DC2626` chỉ trên scorecard. Nền `#F8FAFC`, slide hero nền `#0F172A`.
- Dải bước chuyển sang **cột bên phải** hình (hình 1080 × 640); slide hình rộng dùng dải bước nằm ngang.
- Footer không còn "Book:"; thay bằng **Sources:** (`data-source`) và dòng credit hình (`data-credit`), rồi "Next →", tên phần, thanh sáu phần, số slide.
- Font giữ IBM Plex Sans/Mono của engine (offline, có tiếng Việt cho ghi chú) thay vì Inter trong style guide.

## Kịch bản

- `notes/kich-ban-trinh-bay.md` — lời nói từng slide, xuất từ `<aside class="notes">` trong `index.html` (`python3 tools/export_script.py`).
- Số liệu và nguồn: báo cáo `reports/Độ trễ và scale game online.md` (mục Deck 1 và "Những con số không được nói như sự thật").

## Cấu trúc

```
index.html                 24 slide + A1–A8; SVG nhúng sẵn; ghi chú người nói trong <aside class="notes">
css/deck.css               khung, headline, hình, dải bước, scorecard nhỏ, footer, bước, overlay, in ấn
css/slides.css             slide hero (1, 24), scorecard lớn (3, 13, 24), chip, thẻ, bảng phụ lục
js/deck.js                 engine (từ deck Digital Wallet): bước tự chạy, presenter, PDF
assets/diagrams/d1-*.svg   sơ đồ (nguồn; đã nhúng vào index.html)
assets/img/                ảnh gen: nhân vật, token, bản đồ, cảnh; assets/img/search/ ảnh thật + CREDITS.md
assets/fonts/              IBM Plex Sans / Mono (SIL OFL)
docs/diagram-brief.md      brief chung cho agent vẽ sơ đồ (luật màu, chữ, bước, tọa độ bản đồ)
notes/                     kịch bản trình bày
export/                    PDF (slide; slide + ghi chú)
tools/                     sync_svg.py, check_svg.py, shots.py, export_script.py, export_pdf.py, cdp.py
```

Nhân vật dùng chung với Deck 2: `../shared/common-an-sheet.png`, `../shared/common-binh-sheet.png`.

## Chỉnh sửa

- **Sơ đồ:** sửa `assets/diagrams/d1-*.svg` → `python3 tools/sync_svg.py` (nhúng lại) → `python3 tools/check_svg.py` (nhãn chạm nét, chồng nhau, chữ < 20 px, tràn khung, id thiếu tiền tố `sNN-`/`aN-`).
- **Bố cục:** `python3 tools/shots.py` chụp mọi slide ở bước cuối vào `.work/shots/` và báo phần tử tràn khung, đè dải bước/footer, ảnh hỏng, sơ đồ còn thiếu.
- **Lời nói:** sửa `<aside class="notes">` → `python3 tools/export_script.py`.
- **PDF:** `python3 tools/export_pdf.py --all` → `export/latency-online-games.pdf` và `export/latency-online-games-notes.pdf`.

## Ai làm gì (Agent Fabric)

- **Claude**: điều phối; HTML/CSS/JS, restyle engine, headline, dải bước, scorecard, ghi chú tiếng Việt; brief cho các agent;
  sơ đồ slide 2 (từ vựng) và 18 (vòng ping trên bản đồ cáp); duyệt và sửa mọi hình; kiểm tra và xuất.
- **Antigravity**: toàn bộ ảnh gen (hai character sheet, token, bản đồ top-down, cảnh slide 1, 6, 11, A1) và các sơ đồ SVG còn lại.
- **Codex**: được giao ba lô sơ đồ, cả ba dừng vì hết quota (để lại bản nháp s10–s12, A1, s14, s15); Antigravity làm lại.
- **Claude (subagent tìm ảnh)**: tìm và tải ảnh thật, ghi nguồn trong `assets/img/search/CREDITS.md`.

## Nguồn ảnh

Ảnh thật (dùng cho giảng dạy, mỗi ảnh có một dòng credit trên slide; URL đầy đủ trong `assets/img/search/CREDITS.md`):

| File | Slide | Credit |
|---|---|---|
| cs2.jpg | 4 | Image: Valve |
| fortnite.jpg | 4 | Image: Epic Games |
| aoe4.jpg, aoe4-battle2.jpg | 4, 23 | Image: Xbox Game Studios |
| valorant.jpg | 4 | Image: Riot Games |
| valve-lagcomp.jpg | 12 | Image: Valve Developer Wiki |
| riot-peekers-advantage.png | 17 | Image: Riot Games ("Peeking into VALORANT's Netcode", figure 2) |
| cable-map-vn.png | 18 | Map: TeleGeography (submarinecablemap.com) |
| riot-direct.png | 20 | Image: Riot Games ("Fixing the Internet", part II) |
| go-gopher.png | 21 | Gopher: Renee French (CC BY 4.0) |
| sf6.jpg | 23 | Image: Capcom |
| rocket-league.jpg | A2 | Image: Psyonix / Epic Games |
| cs2-subtick.jpg | A3 | Image: Valve |
| gaffer-compression.png | A4 | Image: Glenn Fiedler |
| unreal-replication-graph.png | A6 | Image: Epic Games |

Ảnh gen (Antigravity): `common-an-sheet.png`, `common-binh-sheet.png` (bản sao ở `../shared/`), `common-token-an.png`,
`common-token-binh.png`, `common-d1-map.png` (bản đồ top-down dùng trên slide 2, 9–12, A1), `d1-s11-an-pov.png`
(slide 11, cũng là ảnh bìa slide 1 và nền slide 24), `d1-s11-binh-pov.png` (slide 11 và A1).

Ba ảnh trong outline chưa có bản gen đạt: `d1-s01-hero-courtyard.png`, `d1-s06-modded-client.png`, `d1-a1-behind-wall.png`.
Lượt đầu Antigravity ghép bằng PIL (hình phẳng, cắt dán nhân vật), bị loại (lưu ở `.work/rejected/`); lượt làm lại bị chặn vì
hết quota tạo ảnh. Slide 1 và 24 dùng ảnh POV của An thay ảnh bìa, slide 6 bỏ ảnh minh họa, A1 dùng ảnh POV của Bình.

Không tìm được: sơ đồ Steam Datagram Relay của Valve (không có ảnh công khai), nên slide 20 chỉ có ảnh Riot Direct.

## Kiểm tra đã chạy

| Kiểm tra | Kết quả |
|---|---|
| `tools/check_svg.py`: nhãn chạm nét, nhãn chồng nhau, chữ < 20 px, tràn khung, id thiếu tiền tố | 0 lỗi / 28 sơ đồ |
| `tools/shots.py`: mọi slide ở bước cuối, 1600×900: tràn khung, headline 2 dòng, hình đè dải bước/footer/scorecard, ảnh hỏng, sơ đồ thiếu | 0 lỗi / 32 slide; đã xem từng ảnh chụp và sửa |
| Tự chạy bước | slide 5 tự đi 0→5, slide 14 tự đi tới 8/8 |
| `tools/export_pdf.py --all` | 32 trang (slide), 64 trang (slide + ghi chú), khoảng 14 MB mỗi file |
| `tools/export_script.py` | `notes/kich-ban-trinh-bay.md` |
| Chưa làm | chạy thử với người trình bày; thử trên máy chiếu; xem từng bước trung gian của mọi slide (mới xem bước cuối) |
