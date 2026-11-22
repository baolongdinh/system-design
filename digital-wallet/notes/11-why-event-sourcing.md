# Slide 11 — A balance says what, not why

> **Ý chính:** Một bảng số dư bị ghi đè chỉ cho biết **cái gì** (C đang có $1). Nó không cho biết **vì sao**, **khi nào**, hay **có đúng không**. Kiểm toán viên hỏi ba câu mà bảng số dư không trả lời được. Vì vậy ta chuyển sang event sourcing: **lưu mọi thay đổi thành một sự kiện bất biến, rồi tính số dư từ các sự kiện đó**.

**Phần:** Event sourcing · **Footer:** Book: Event sourcing: background, p.520 · **Bước:** 2

---

## Hiểu nhanh trước khi nhìn hình

**Vấn đề.** Tới đây ta đã biết chuyển tiền xuyên nhiều database. Nhưng database chỉ giữ số dư mới nhất. Bảng ghi C = $1. Bản ghi đó không nói ai chuyển, lúc nào, và vì sao.

**Ghi đè (CRUD).** Mỗi lần đổi số dư, giá trị mới ghi lên giá trị cũ. Giá trị cũ mất. CRUD là kiểu lưu "tạo, đọc, sửa, xóa" quen thuộc.

**Event** (sự kiện) là một sự thật đã xảy ra, viết ở thì quá khứ: "A đã bị trừ $1", "C đã được cộng $1". **Bất biến** nghĩa là ghi một lần, không bao giờ sửa.

**Đổi nguồn sự thật.** Thay vì lưu số dư, ta lưu danh sách event. Số dư chỉ là thứ **tính ra**: đi qua các event từ đầu tới cuối và cộng trừ dần. Việc đi lại danh sách event như vậy gọi là **replay**.

**Một lưu ý.** Danh sách event giúp lần ra nguyên nhân và tính lại số dư cũ. Nó không tự chặn một thao tác nghiệp vụ sai. Vẫn cần kiểm tra đầu vào và kiểm toán.

## 1. Slide này để làm gì

Mở phần Event sourcing. Câu hỏi đổi từ "giao dịch có **đúng** không?" sang "ta có **chứng minh** được không?". Đó là yêu cầu thứ năm ở slide 2: *Reproducible: rebuild any past balance by replay*.

## 2. Đọc hình

Hình chia đôi bởi một vạch đứt nét dọc, ở giữa có vòng tròn `vs`.

- **Thẻ trái, *Current balances (mutable)*, badge 1:** một bảng hai cột `account_id`, `balance`. Hai dòng: `A $0`, `C $1`. Dưới bảng, chữ xám: `overwritten in place · history destroyed`.
- **Thẻ phải, *Event history (immutable)*, badge 2, có biểu tượng kính lúp:**
  - Bảng bốn cột: `event_id`, `change`, `context`, `time`.
  - `e104 · A −$1 · tx 7f3c · 10:02`
  - `e105 · C +$1 · tx 7f3c · 10:02`
  - Một mũi tên xanh đi xuống ô xanh lá `derived: A: $0, C: $1`, có dấu ✓.
- **Dưới hình, ba thẻ câu hỏi của kiểm toán viên** (thay cho dải bước):
  - *Balance at **any given time**?*
  - *Are past and current balances **correct**?*
  - *Is the logic correct **after a code change**?*

Hai event `e104`, `e105` là cùng giao dịch `tx 7f3c` mà slide 13 sẽ ghi.

Footer: *Book: Event sourcing: background, p.520*.

## 3. Trình bày theo bước

Các bước tự chạy (0,6 giây một bước). Bấm A nếu muốn đi từng bước.

| Bước | Trên màn hình | Nói |
|---|---|---|
| 1 | Thẻ trái: bảng số dư, `overwritten in place · history destroyed` | "Mọi thiết kế từ đầu tới giờ đều sửa số dư tại chỗ. Bảng nói C có $1. Nhưng ai đổi nó? Lúc nào? Đổi như vậy có đúng không? Bảng không trả lời được, vì giá trị cũ đã bị ghi đè." |
| 2 | Thẻ phải: `e104`, `e105`, rồi `derived: A: $0, C: $1` | "Giờ làm ngược lại: lưu từng thay đổi thành một event, và không bao giờ sửa. `e104`: A bị trừ $1. `e105`: C được cộng $1. Cả hai thuộc `tx 7f3c`, lúc 10:02. Số dư chỉ còn là thứ ta tính ra. Lưu ý: trước `e104` còn cả trăm event cũ, trong đó có lần A nhận $1. Replay phải đi từ đầu." |
| sau 2 | Chỉ ba thẻ câu hỏi | "Ví điện tử bị kiểm toán. Kiểm toán viên sẽ hỏi ba câu này. Bảng bên trái không trả lời được câu nào. Danh sách event bên phải trả lời được cả ba; slide 14 cho thấy cách làm." |

## 4. Giải thích sâu

- **Bối cảnh trong sách.** Interviewer khen giải pháp distributed transaction. Rồi nêu tình huống: người dùng có thể nhập sai thao tác ở tầng ứng dụng, và số tiền bị sai. *"We need a way to trace back the root cause of the issue and audit all account operations."*
- **Event sourcing** là một kỹ thuật của Domain-Driven Design (sách dẫn Eric Evans). Sự thật nằm ở chuỗi event. Số dư chỉ là một **bản xem** (view) được cập nhật từ chuỗi đó.
- **Cột `context` và `time` trả lời đúng câu mà thẻ trái không trả lời.** `tx 7f3c` nói thay đổi thuộc giao dịch nào, và từ đó lần ra request nào, của ai. `10:02` nói lúc nào. Hai cột này là chi tiết minh họa của slide; sách chỉ định nghĩa event là *"a validated fact"* **[Ngoài sách: tên cột cụ thể]**.
- **Bảng event không có cột trạng thái.** Event không đổi từ "đang chờ" sang "xong". Một cột trạng thái được sửa tại chỗ chính là kiểu CRUD mà slide này đang chê.

## 5. Câu hỏi có thể gặp

- **"Log của database (WAL, binlog) chẳng phải cũng là lịch sử sao?"** Log của database ghi thay đổi **vật lý** (trang, dòng), được dọn định kỳ, và không mang nghĩa nghiệp vụ. Event sourcing lưu sự kiện **nghiệp vụ** ("A đã bị trừ $1 trong `tx 7f3c`"), giữ lâu dài, dùng để kiểm toán và replay **[Ngoài sách: so sánh]**.
- **"Replay hai event `e104`, `e105` là ra A = $0 à?"** Không. Replay đúng hai event đó từ trạng thái trống cho A = −$1, C = +$1. A có $0 vì trước đó A đã nhận $1 trong các event cũ hơn. Replay phải đi **từ đầu** danh sách, hoặc từ một snapshot (notebook 14).
- **"Lưu mọi event thì có tốn chỗ không?"** Có. Snapshot giúp replay nhanh hơn (notebook 14). Lưu trữ lâu dài là chuyện chi phí, không phải chuyện tính đúng.
- **"Event có cột trạng thái, kiểu pending rồi committed, không?"** Không. Event ghi một lần và không sửa. Về sau, chữ "committed" ở Raft (slide 18) nghĩa là đa số node đã lưu vị trí đó trong log. Nó không phải một trường bị sửa trong event **[Ngoài sách: cách diễn đạt]**.
- **"Cột time lấy giờ ở đâu?"** Giờ được chốt vào event lúc tạo, như mọi dữ kiện khác của event (notebook 13, mục 4). Con số `10:02` chỉ là ví dụ **[Ngoài sách]**.

## 6. Đừng nói sai

- Đừng nói event sourcing "thay thế" distributed transaction. Thiết kế cuối vẫn cần Saga giữa các partition (slide 21).
- Đừng nói "hai event của giao dịch là đủ để dựng lại số dư". Phải replay từ đầu, kể cả các event cũ không vẽ trên hình.
- Đừng nói event có trạng thái được cập nhật. Event là sự thật đã xảy ra.
- Đừng gọi hai event này là `e1`, `e2`. Trên slide 11 và 13 chúng là `e104`, `e105`. `e1`, `e2` ở slide 14 thuộc một ví dụ riêng.

## 7. Giải thích chi tiết

**Hai cách lưu cùng một sự thật.**
- **Lưu kết quả:** bảng ghi `C = $1`. Mỗi lần đổi là ghi đè. Trước đó C có $0, nhưng con số $0 đã mất.
- **Lưu thay đổi:** ghi "A bị trừ $1 trong `tx 7f3c`, lúc 10:02" và "C được cộng $1 trong `tx 7f3c`, lúc 10:02". Không bao giờ sửa. Số dư là thứ tính ra.

**Replay bằng số.** Giả sử trong các event cũ, A đã nhận $1 và C chưa có gì.

```
trạng thái trống                     A = $0   C = $0
... các event cũ (A nhận $1) ...     A = $1   C = $0
e104  A −$1  tx 7f3c                 A = $0   C = $0
e105  C +$1  tx 7f3c                 A = $0   C = $1   ← ô "derived" trên hình
```

Bỏ các event cũ đi thì dòng cuối thành A = −$1. Đó là lý do phải replay **từ đầu**. Sách nói rõ: *"from the very beginning"*.

**Ba câu hỏi của kiểm toán viên, và vì sao bảng số dư không trả lời được.**
1. *Số dư tại một thời điểm bất kỳ?* Bảng chỉ có số hiện tại. Danh sách event thì replay tới thời điểm đó là ra.
2. *Số dư quá khứ và hiện tại có đúng không?* Bảng không có gì để đối chiếu. Danh sách event cho phép tính lại và so với số đang lưu.
3. *Logic có còn đúng sau khi đổi code?* Bảng không có dữ liệu đầu vào để chạy lại. Danh sách event thì chạy được qua cả code cũ lẫn code mới, rồi so kết quả.

Slide 14 làm cụ thể cả ba câu. Danh sách event cho **bằng chứng để kiểm tra**. Nó không tự chứng minh mọi code đều đúng.

**Đây là thay đổi tư duy lớn nhất của bài.** Từ slide này:
- **Nguồn sự thật** là chuỗi event.
- Database số dư chỉ là **bản xem tiện lợi**. Mất thì dựng lại được.

Điều này kéo theo cả loạt thay đổi phía sau: phân biệt command với event (slide 12), quy trình ghi (slide 13), replay (slide 14), read side riêng (slide 15), và cuối cùng là chỉ cần sao chép event list (slide 18).

**Lưu ý khi trình bày.** Event sourcing **không** thay thế distributed transaction. Ở thiết kế cuối, mỗi partition dùng event sourcing bên trong. Giữa các partition vẫn cần Saga. Nói trước ý này để người nghe không nghĩ phần Distributed transactions là vô ích.

## 8. Dẫn dắt sang slide 12

- **Điều slide này để lại:** "lưu sự kiện" còn mơ hồ. Lưu cái gì: lệnh người dùng gửi, hay kết quả sau khi kiểm tra?
- **Câu nối gợi ý:** "Event sourcing có bốn khái niệm: command, event, state và state machine. Bắt đầu với command: một ý định, xếp hàng theo thứ tự, và có thể bị từ chối."
- **Người nghe sẽ thấy ở slide 12:** một hàng đợi FIFO ba lệnh trước bánh răng `validate`: `tx 7f3c` được chấp nhận và sinh hai event, `tx 91ab` bị từ chối, và `retry 7f3c` không sinh event mới. Bốn khái niệm được nói dần qua slide 12 và 13 (notebook 12, 13).
