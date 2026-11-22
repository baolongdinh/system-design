# System Design — Slides

Bộ slide HTML về system design, dùng để giảng dạy và trình bày. Mỗi topic nằm trong một thư mục riêng,
mở `index.html` của topic đó bằng trình duyệt là trình chiếu được (không cần build, không cần server).

## Topics

| Topic | Thư mục | Nội dung |
|---|---|---|
| Digital Wallet at Scale | [`digital-wallet/`](digital-wallet/) | 23 slide: 2PC, TC/C, Saga, event sourcing, CQRS, Raft, partition — theo một giao dịch A chuyển cho C $1 |

## Cấu trúc một topic

```
<topic>/
  index.html     # deck, mở trực tiếp để trình chiếu
  css/ js/ assets/
  notes/         # kịch bản trình bày + ghi chú sâu từng slide
  export/        # bản PDF (có / không kèm ghi chú)
  README.md
```

## Thêm topic mới

1. Tạo thư mục `<topic-name>/` (kebab-case, theo tên topic) với `index.html` và các file nó cần lúc chạy.
2. Thêm một dòng vào bảng Topics ở trên và một mục trong `index.html` ở thư mục gốc.

## Trình chiếu

- Mở `<topic>/index.html` trực tiếp, hoặc chạy `python3 -m http.server` ở thư mục gốc rồi vào `http://localhost:8000/<topic>/`.
- Nếu bật GitHub Pages (Settings → Pages → branch `main`, thư mục `/`), trang gốc là mục lục các topic.
