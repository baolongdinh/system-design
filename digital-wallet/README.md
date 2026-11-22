# Digital Wallet at Scale — bộ slide HTML, bản 4 (23 slide)

Bản 4 quay về nội dung và sơ đồ của bản 2 (35 slide), làm gọn theo cách trình bày của bản 3:
mỗi slide có **một headline, một dòng ngữ cảnh, một hình, và một dải chú thích theo bước** ở dưới hình.
Thanh chặng, breadcrumb, hộp callout, caption và thanh takeaway của bản 2 đã bỏ.

Cả bài đi theo một giao dịch: **A chuyển cho C $1** (ban đầu A = $1, C = $0), qua bảy phần:

| Phần | Slide | Nội dung |
|---|---|---|
| Scope | 2–5 | yêu cầu, quy tắc "đi cả hai hoặc không", tải 2M/s, API |
| In-memory shards | 6 | Redis shard làm mất $1 khi service chết |
| Distributed transactions | 7–10 | 2PC (và cái giá của nó), TC/C, Saga, so sánh |
| Event sourcing | 11–15 | vì sao cần, hàng đợi lệnh, đường ghi, replay, CQRS |
| Local files | 16 | vì sao dùng file cục bộ, và cái giá: node thành single point of failure |
| Raft | 17–18 | thứ gì phải sống sót (chỉ event) và vì sao cần follower; append và commit, rồi mọi máy apply |
| Scale out + Saga | 19–23 | trần của một nhóm, partition, Saga qua P1 và P2, bản đồ cuối, rồi kế hoạch tải để đối chiếu với mục tiêu ban đầu (slide cuối) |

So với bản 2, mười slide đã bỏ: sáu slide đi quá sâu vào edge case (mmap/dirty page, leader chết,
snapshot, ring buffer, hai slide phụ lục pull vs push và Figure 29 đủ 15 bước) và bốn slide trùng ý với
slide khác (phục hồi TC/C, cái giá của 2PC, bốn khái niệm event sourcing, ba loại dữ liệu trên node).
Nội dung của chúng chuyển vào lời nói hoặc notebook của slide liên quan.

**Lượt soát v4b** (`docs/v4b-review-brief.md`):
- thêm slide 17 "What must survive a crash?" để nối vào Raft (vì sao nhân bản, nhân bản cái gì, vì sao cần follower);
- slide 16–19 là một nhóm Raft giữ mọi tài khoản và theo trọn giao dịch A→C $1 (e43, e44); giao dịch chỉ tách thành hai thao tác từ slide 20;
- bỏ "Commit → state → status": việc mọi máy apply sau commit nằm trong lời nói slide 18; việc read path đẩy kết quả về Saga coordinator đang chờ nằm trong lời nói slide 21;
- slide 23 (cuối) tính tải từng tầng cho rõ: một nhóm Raft gom lô (1 fsync + 1 vòng mạng cho khoảng 100 lệnh) làm khoảng 100.000 thao tác/s, chạy ở 70% là 70.000; tầng ví khoảng 29 nhóm, tầng Saga chia theo mã giao dịch khoảng 43 shard (3 lần ghi theo Figure 29), tổng 72 nhóm, 216 replica slot; tài khoản nóng là thứ duy nhất thêm nhóm không giải được;
- "Capacity plan" là slide cuối, sau bản đồ kiến trúc: đối chiếu năm yêu cầu ở slide 2 rồi tính tải 1M giao dịch/s (`tools/swap_slides.py 22 23`);
- bỏ "One command becomes an event" (gộp vào bước 1 của slide Raft) và "Failure between two partitions" (ngoài sách, chuyển vào lời nói và notebook 22).

Slide đã bỏ được lưu ở
`.work/removed/`; xoá thêm slide bằng `python3 tools/remove_slides.py N`.

Các bản cũ vẫn mở được:
- `.work/v2-35-slides/index.html` — bản 2, 35 slide
- `.work/v3-25-slides/index.html` — bản 3, 25 slide tối giản

## Mở và trình chiếu

Mở `index.html` bằng Chrome, Edge, Safari hoặc Firefox. Bộ slide chạy offline. Hoặc:

```bash
python3 -m http.server 8765
```

rồi mở `http://localhost:8765`.

**Các bước tự chạy**, 0,6 giây một bước. Dải chú thích dưới hình hiện dần theo bước, đánh số khớp với
các vòng số trên sơ đồ, và giữ lại toàn bộ khi slide đã chạy xong, nên người xem đọc được cả khi lỡ lời
người nói. Nhấn **A** để chuyển sang bấm từng bước.

| Phím | Tác dụng |
|---|---|
| → Space PgDn | slide đang chạy thì hiện hết; nếu đã hết thì sang slide sau |
| ← PgUp | slide trước, hiện đầy đủ |
| R | chạy lại các bước |
| A | bật/tắt tự chạy bước |
| ↓ ↑ | slide sau / trước |
| 12 Enter | nhảy tới slide 12 |
| N | ghi chú người nói |
| P | cửa sổ presenter: ghi chú, slide kế tiếp, đồng hồ |
| G | danh sách slide theo phần |
| F | toàn màn hình · B màn hình đen · ? trợ giúp |
| X | ẩn / hiện dòng "Next →" ở góc trên phải (tên slide kế tiếp, để dẫn dắt) |

## Cách trình bày

- **Nền giấy kẻ ô và màu theo khái niệm của bản 2**: command xanh lam, event vàng đất, state xanh đen,
  read view xanh mòng két, coordinator tím, ok xanh lá, lỗi đỏ cam.
- **Một headline (sans, 52 px) và một dòng ngữ cảnh**; không còn thanh chặng ở trên.
- **Một hình** trong khung 1472 × 560. Chữ trong sơ đồ tối thiểu 20 px.
- **Một dải chú thích theo bước**: mỗi bước một ô, tối đa hai dòng ngắn, bước đang chạy được tô vàng.
- **Góc trên phải**: "Next → NN tên slide kế tiếp", nhắc người trình bày câu dẫn sang slide sau (phím X để ẩn).
- **Footer**: nguồn sách (**Book:**), nhãn **Added:** khi vượt ra ngoài sách, tên phần, thanh bảy phần, số slide.

Research về chuẩn trình bày: `docs/slide-design-research.md`. Brief làm gọn sơ đồ: `docs/v4-tidy-brief.md`; brief lượt soát v4b: `docs/v4b-review-brief.md`.

## Kịch bản và notebook

- `notes/kich-ban-trinh-bay.md` — lời nói từng slide, xuất từ ghi chú trong `index.html`
  (`python3 tools/export_script.py`).
- `notes/00-index.md` — mục lục notebook.
- `notes/NN-*.md` — notebook tiếng Việt cho từng slide.

## Cấu trúc

```
index.html                 23 slide; SVG nhúng sẵn; ghi chú người nói trong <aside class="notes">
css/deck.css               khung, nền giấy, headline, khung hình, dải chú thích, footer, bước, overlay
css/slides.css             bìa, thẻ yêu cầu (2), bảng API (5), bảng so sánh (10), câu hỏi kiểm toán (11)
js/deck.js                 engine: bước tự chạy, data-step / data-step-only / data-hl / data-dim, presenter
assets/diagrams/sNN-*.svg  21 sơ đồ (Antigravity)
assets/icons, img, kit     icon yêu cầu và cách tiếp cận, ảnh bìa, kit v2 (Antigravity)
assets/fonts/              IBM Plex Sans / Mono (SIL OFL)
docs/                      hệ thiết kế, brief, research, báo cáo của Antigravity
notes/                     kịch bản và notebook
tools/                     sync_svg.py, check_svg.py, build_manifest.py, export_script.py, remove_slides.py, swap_slides.py
.work/                     các bản cũ và file làm việc
```

## Deploy lên Vercel

Deck là trang tĩnh, không cần build. `.vercelignore` chỉ cho phép đúng các file trang cần khi chạy:
`index.html`, `vercel.json`, `css/`, `js/`, `assets/fonts`, `assets/icons`, `assets/img/cover.png`
(25 file, khoảng 5,5 MB). `.work/` (có bản cũ và toàn văn chương sách), `notes/`, `docs/`, `tools/`, `export/`,
nguồn SVG (đã nhúng vào `index.html`) và kit v2 không được đẩy lên. `vercel.json` gắn
`X-Robots-Tag: noindex` để trang không lên kết quả tìm kiếm, và cache dài cho phông chữ.

Bản đang chạy: **https://digital-wallet-at-scale.vercel.app** (project `digital-wallet-at-scale`, team `agent-fabric1`).
Thư mục đã được gắn với project (`.vercel/`), nên deploy lại chỉ cần:

```bash
npx vercel deploy --prod
```

`.env.local` và `.vercel/` do Vercel CLI tạo, chứa token; chúng không được đẩy lên và không nên chia sẻ.

Lưu ý: lời nói của người trình bày nằm trong `index.html` (`<aside class="notes">`), nên ai có link cũng xem được
(phím N, hoặc xem mã nguồn).

## Chỉnh sửa

- **Sửa sơ đồ:** sửa file trong `assets/diagrams/`, chạy `python3 tools/sync_svg.py` để nhúng lại,
  `python3 tools/check_svg.py` để kiểm tra va chạm nhãn và cỡ chữ.
- **Sửa lời nói:** sửa `<aside class="notes">` trong `index.html`, rồi `python3 tools/export_script.py`.
- **Sửa dải chú thích:** `<ol class="strip">` trong slide; mỗi `<li data-step="N">` là một bước.
- **Manifest:** `python3 tools/build_manifest.py`.

## Ai làm gì (Agent Fabric)

- **Claude**: điều phối, chọn slide giữ và bỏ, viết HTML/CSS/JS, headline, dải chú thích, bảng, ghi chú,
  notebook; brief cho Antigravity; nhúng và kiểm tra.
- **Antigravity**: toàn bộ đồ họa. Các sơ đồ là bản v2 do Antigravity vẽ, nay được Antigravity làm gọn cho
  bản 4; slide 17 mới do Antigravity vẽ trong lượt v4b. Task id: `ASSET_MANIFEST.md` và `.work/v2-35-slides/ASSET_MANIFEST.md`.

## Kiểm tra đã chạy (bản 4, 23 slide, sau lượt soát v4b)

| Kiểm tra | Kết quả |
|---|---|
| `tools/check_svg.py`: nhãn chạm nét, nhãn chồng nhau, chữ dưới 20 px, tràn khung, id thiếu tiền tố `sNN-` | 0 lỗi / 21 sơ đồ |
| Chữ chồng nhau trên mọi slide × mọi bước, ở 1920×1080 và 1280×720 | 90 trạng thái mỗi cỡ, 0 lỗi |
| Bố cục: trong khung, headline một dòng, hình không đè dải chú thích, footer không bị cắt | 0 lỗi (riêng tiêu đề bìa 2 dòng là cố ý) |
| Tự chạy: mỗi slide tự đi tới bước cuối | 23 / 23 |
| Bấm → từ slide 1 tới 23 | 23 / 23 chạy hết |
| Chưa làm | chạy thử với người trình bày; thử trên máy chiếu |
