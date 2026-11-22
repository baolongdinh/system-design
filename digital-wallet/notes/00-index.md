# Sổ tay người trình bày — mục lục (bản 4, 23 slide)

Mỗi slide có một notebook. Slide có headline, một dòng ngữ cảnh, một sơ đồ và một dải chú thích theo bước;
lời nói đầy đủ nằm trong ghi chú (`index.html`, phím N hoặc P) và trong `kich-ban-trinh-bay.md`.
Notebook là nơi giải thích kỹ hơn và trả lời câu hỏi. Ý nào vượt ra ngoài Chapter 12 được gắn
**[Ngoài sách]**.

## Ví dụ xuyên suốt

A → C, $1. Ban đầu A = $1, C = $0. Giao dịch `tx 7f3c`. Ở slide 16–19 cả hệ thống là một nhóm Raft giữ mọi tài khoản,
tx 7f3c sinh hai event `e43 A −$1` và `e44 C +$1`. Từ slide 20, A ở P1 và C ở P2: giao dịch tách thành hai thao tác
(`e43 A −$1` ở P1, `e88 C +$1` ở P2). Một số slide dùng ví dụ phụ, có ghi rõ (slide 14: A bắt đầu $2).

## Thời lượng (~35 phút)

| Phần | Slide | Notebook |
|---|---|---|
| Mở đầu | 1 | [01](01-cover.md) |
| Scope | 2–5 | [02](02-scope.md) · [03](03-invariant.md) · [04](04-scale.md) · [05](05-api.md) |
| In-memory shards | 6 | [06](06-redis.md) |
| Distributed transactions | 7–10 | [07](07-2pc.md) · [08](08-tcc.md) · [09](09-saga.md) · [10](10-compare.md) |
| Event sourcing | 11–15 | [11](11-why-event-sourcing.md) · [12](12-command-queue.md) · [13](13-write-path.md) · [14](14-replay.md) · [15](15-cqrs.md) |
| Local files | 16 | [16](16-why-local.md) |
| Raft | 17–18 | [17](17-what-survives.md) · [18](18-raft-commit.md) |
| Scale out + Saga | 19–23 | [19](19-group-ceiling.md) · [20](20-partition-route.md) · [21](21-saga-timeline.md) · [22](22-final-map.md) · [23](23-capacity-plan.md) |

Phần cuối đi theo thứ tự: 19 trần của một nhóm · 20 chia partition theo tài khoản · 21 Saga qua P1 và P2 ·
22 bản đồ kiến trúc cuối, kèm phần nhìn lại năm lần đổi · 23 quay lại mục tiêu: đối chiếu năm yêu cầu của slide 2
với bản đồ, rồi tính cỡ cho 1 triệu transfer/s. Slide 23 là slide kết: lời cảm ơn và gợi ý hỏi đáp ở notebook 23, mục 8.

## Nội dung đã bỏ khỏi slide, nay nằm trong notebook

| Slide đã bỏ | Chuyển vào |
|---|---|
| mmap: write, dirty page, flush (bản 2) | notebook 16 (vì sao dùng file cục bộ) |
| Leader chết: committed hay chưa (bản 2) | notebook 18 (Raft) |
| Snapshot và replay (bản 2) | notebook 14 (replay) |
| Ring buffer ở cửa vào, LMAX (bản 2) | notebook 19 (trần của một nhóm) |
| Pull vs push (phụ lục bản 2) | notebook 21 (câu hỏi "Sao coordinator không hỏi lại (pull)?") |
| Figure 29 đủ 15 bước (phụ lục bản 2) | notebook 21 (Saga qua P1 và P2) |
| TC/C recovery: phase status table | notebook 8 (TC/C) |
| Why 2PC struggles at 1M TPS | lời nói slide 7, notebook 7 |
| Event sourcing in four terms | dòng ngữ cảnh slide 12–13, notebook 12–13 |
| Inside one node: three kinds of data | lời nói slide 16, notebook 16 |
| One command becomes an event | bước 1 slide 18 (Raft), notebook 18 |
| Failure between two partitions | lời nói slide 21, notebook 21 (mục "Khi P2 không trả lời") |
| Commit → state → status (bản 4b) | lời nói slide 18 (apply) và slide 21 (push về Saga coordinator), notebook 18 và 21 |

Các slide đã bỏ (HTML, sơ đồ, notebook) được lưu ở `.work/removed/`.

## Kịch bản

- `kich-ban-trinh-bay.md`: lời nói từng slide, xuất từ `index.html`.
- Bản 2 (35 slide) và notebook cũ: `.work/v2-35-slides/notes/`. Bản 3 (25 slide): `.work/v3-25-slides/notes/`.
