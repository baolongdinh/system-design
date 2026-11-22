# Slide 12 — Command queue: ordered intents, not facts

> **Ý chính:** **Command** là một ý định từ bên ngoài, **có thể bị từ chối** (lede nói đúng định nghĩa này). Command chờ trong một hàng đợi **FIFO** (sách dùng Kafka). State machine lấy từng command theo thứ tự và kiểm tra với state hiện tại. Có ba kết quả: **hợp lệ thì sinh event**; **không hợp lệ thì bị từ chối, 0 event**; **gửi lại cùng mã (`tx 7f3c`) thì không sinh event mới**, vì mã đó đã được ghi vào State (`seen: tx 7f3c`) **cùng bước** với hai event. Command queue chứa ý định; event log chứa sự thật.

**Phần:** Event sourcing · **Footer:** Book: Command p.521; Wallet service example, Fig 16, p.524 · Added: duplicate check by transaction id · **Bước:** 3 · Bốn định nghĩa của sách (Command, Event, State, State Machine; Fig 14–15, p.521–524) nằm trong notebook: command và event ở đây, state và state machine ở notebook 13.

---

## Hiểu nhanh trước khi nhìn hình

**Bốn khái niệm của event sourcing.** Slide 11 hứa bốn khái niệm. Slide 12 và 13 dùng cả bốn trên cùng ví dụ A→C $1:
- **Command:** ý định từ bên ngoài, "hãy chuyển $1 từ A sang C". Nó chưa phải sự thật và có thể bị từ chối.
- **Event:** thay đổi đã được chấp nhận, viết ở thì quá khứ: "A đã bị trừ $1", "C đã được cộng $1".
- **State:** dữ liệu hiện tại, ở đây là bảng số dư.
- **State machine:** bộ xử lý. Nó **validate** command (đọc state, sinh event) và **apply** event (sửa state). Slide 13 đi trọn một vòng của nó.

Slide này tập trung vào cặp đầu: command khác event thế nào.

**FIFO** (first in, first out): lệnh vào trước được xử lý trước. Trên hình, đầu hàng nằm **bên phải**.

Lúc đầu A = $1. Ba lệnh đang chờ, theo thứ tự xử lý:
1. `tx 7f3c: A→C $1`. A có $1, đủ. Hợp lệ. Sinh hai event `A −$1`, `C +$1`. A còn $0.
2. `tx 91ab: A→B $1`. A đã về $0. Bị từ chối. Không có event.
3. `retry 7f3c`: client chờ quá lâu nên gửi lại đúng lệnh 7f3c. State đã ghi `seen: tx 7f3c`. Không sinh event mới; trả lại kết quả cũ.

**Hai ý của tiêu đề.**
- **Thứ tự quyết định kết quả.** Nếu 91ab đứng trước, B nhận được $1 còn 7f3c bị từ chối.
- **Không phải command nào cũng thành event.** Queue chứa ý định đang chờ xét. Event log chỉ nhận thay đổi đã được chấp nhận.

**Chống trùng** (deduplication): nhận ra một lệnh đã xử lý để không làm lại lần hai. Ở đây dựa vào `transaction_id` của slide 5.

## 1. Slide này để làm gì

Đặt từ vựng cho phần còn lại: command là ý định, event là sự thật. Nhầm hai thứ này thì các slide sau rất khó hiểu. Rồi làm rõ hai điều thường bị nhầm: **thứ tự quyết định kết quả**, và **không phải command nào cũng thành event**. Slide cũng cho thấy chỗ lưu cụ thể giúp một lần gửi lại không trừ tiền hai lần.

## 2. Đọc hình

- **Lede:** *A command is an intent that may be rejected; commands wait in FIFO order. A starts at $1.* Câu đầu là định nghĩa command của sách, nói gọn.
- **Bên trái:** biểu tượng `Clients`, mũi tên `in` vào dải **Command queue (FIFO)**. Góc phải dải ghi `oldest at head`. Ba vé lệnh, từ trái (mới nhất) sang phải (cũ nhất):
  - `A→C $1 · retry 7f3c` (chữ xám)
  - `A→B $1 · tx 91ab`
  - `A→C $1 · tx 7f3c`, có nhãn `head` bên dưới
  - Dưới dải: `intents — may be rejected`.
- **Giữa:** mũi tên `out` vào bánh răng `validate` (*State machine*). Bên dưới là hình trụ **State** với hai dòng: `A: $1` và `seen: —` (chưa có mã nào). Một đường `read` nối State với đường vào bánh răng.
- **Bên phải, ba hàng kết quả, mỗi hàng một bước:**
  1. **Xanh lá:** `valid: A has $1 ≥ $1 ✓` → dải **Event log (append-only)** với hai ô `A −$1 · 7f3c`, `C +$1 · 7f3c`. Cùng lúc, State đổi thành `A: $0` và `seen: tx 7f3c`.
  2. **Đỏ cam:** `✕ A is $0 now → rejected`, cạnh một khay xám nét đứt `0 events written (empty)`.
  3. **Xám:** `tx 7f3c already seen` · `return earlier result`.

Hình cuối: State ghi `A: $0`, `seen: tx 7f3c`; event log có đúng hai ô.

Footer: *Book: Command p.521; Wallet service example, Fig 16, p.524* · *Added: duplicate check by transaction id*. Phần chống trùng là phần thêm ngoài sách.

## 3. Trình bày theo bước

Các bước tự chạy (0,6 giây một bước). Bấm A nếu muốn đi từng bước.

| Bước | Trên màn hình | Nói |
|---|---|---|
| 0 | Ba lệnh trong hàng, State `A: $1`, `seen: —` | "Command xếp trong một hàng FIFO; sách dùng Kafka. Đầu hàng ở bên phải, nên 7f3c được xử lý trước. Nhớ: A có $1." |
| 1 | Hàng xanh, hai event, State `A: $0`, `seen: tx 7f3c`; strip: *tx 7f3c valid: A −$1, C +$1* | "A có $1, lệnh hợp lệ. Sinh hai event, trừ A và cộng C, mỗi event mang mã 7f3c. Cùng bước đó, State ghi A còn $0, và ghi luôn: đã thấy 7f3c." |
| 2 | Hàng đỏ cam, khay rỗng; strip: *tx 91ab: A has $0 → rejected, no event* | "91ab đòi trừ A $1, nhưng A đã về $0. Bị từ chối, không event nào. Nếu 91ab đến trước thì chính nó thành công còn 7f3c bị từ chối. **Thứ tự quyết định kết quả.**" |
| 3 | Hàng xám; strip: *tx 7f3c again: already seen, same result* | "Client chờ quá lâu nên gửi lại 7f3c. State machine tra dòng `seen` trong State: 7f3c đã có. Không sinh event mới, chỉ trả kết quả cũ. Đây là `transaction_id` của slide 5 đang làm việc." |
| sau 3 | Chỉ hai dải | "Hai dải là hai thứ khác nhau. Queue chứa ý định, có thể bị từ chối. Event log chứa sự thật, luôn được apply." |

## 4. Giải thích sâu

- **Event sourcing là một pattern chung.** Bốn khái niệm là của event sourcing nói chung, một kỹ thuật xuất phát từ Domain-Driven Design; chúng không riêng cho ví điện tử. Sách định nghĩa chúng trước (Fig 14–15, p.521–524), rồi mới áp vào ví ở phần *Wallet service example* (Fig 16–17, p.524–525). Slide 12 vẽ lại Figure 16, slide 13 vẽ lại Figure 17.
- **Command, theo sách:** *"the intended action from the outside world"*. Thứ tự rất quan trọng, nên command thường nằm trong một hàng **FIFO**.
- **Event, theo sách:** kết quả của việc thực hiện một command đã được kiểm tra, *"a validated fact"*. Hai khác biệt với command:
  1. Event **phải được thực hiện**, vì nó là sự thật đã được xác nhận. Command thì có thể bị từ chối.
  2. Command có thể chứa yếu tố ngẫu nhiên hoặc I/O. Event mang dữ kiện đã chốt, nên apply nó luôn ra cùng kết quả (notebook 13, mục 4).

  Một command sinh **0..n** event: ở bước 1 là hai, ở bước 2 là không. Event giữ đúng thứ tự của command, nên cũng nằm trong một hàng FIFO: event log.
- **Vì sao FIFO.** Sách viết: *"In Event Sourcing, it is very important that everything has an order."* Kết quả của mỗi command phụ thuộc state. State lại phụ thuộc mọi command trước đó. Đổi thứ tự là đổi kết quả.
- **Command queue và event log khác nhau thế nào.**

  | | Command queue | Event log |
  |---|---|---|
  | Chứa | Ý định | Sự thật đã kiểm tra |
  | Có thể bị từ chối | Có | Không, phải apply |
  | Replay ra cùng kết quả | Không chắc | Có |
  | Dùng để | Xếp hàng chờ xử lý | Dựng lại state, kiểm toán, sao chép |

- **Phạm vi của thứ tự [Ngoài sách].** Thứ tự chỉ có nghĩa trong **một hàng do một state machine đọc**. Khi chia partition (slide 20), mỗi partition có hàng và log riêng. Giữa các partition không có thứ tự chung. Đó là lý do cần Saga coordinator (slide 21).
- **Chống trùng [Ngoài sách: cơ chế cụ thể].** Sách chỉ nói `transaction_id` dùng để deduplication (slide 5). Slide minh họa cơ chế bằng dòng `seen` trong State, ghi **cùng bước** với hai event và số dư mới. Ở slide này, trước khi chia partition, một command là cả giao dịch A→C. Nên `tx 7f3c` chính là mã của command đó.

## 5. Câu hỏi có thể gặp

- **"Kafka có bảo đảm FIFO không?"** Kafka chỉ bảo đảm thứ tự **trong một partition** của topic. Muốn đúng thứ tự cần thiết thì chọn key partition phù hợp, hoặc như sách: một state machine đọc một hàng **[Ngoài sách]**.
- **"Lệnh bị từ chối có để lại dấu vết không?"** Command vẫn nằm trong command queue, nên có dấu vết. Nhưng nó không đổi state vì không có event. Về sau (slide 18, notebook 18), thiết kế ghi cả **kết quả từ chối** theo mã thao tác, để lần gửi lại nhận đúng câu trả lời cũ **[Ngoài sách]**.
- **"State machine biết 7f3c đã xử lý nhờ đâu?"** Nhờ dòng `seen: tx 7f3c` trong State. Nó không nhớ "trong đầu"; nó tra một bản ghi có thật. Bản ghi đó dựng lại được từ event log, vì mỗi event mang nhãn `· 7f3c` **[Ngoài sách]**.
- **"Từ slide 20 trở đi vẫn chống trùng theo `tx 7f3c`?"** Không. Khi A và C nằm ở hai partition, giao dịch tách thành hai lệnh ở hai nơi, và mỗi lệnh có **mã thao tác** riêng: `tx 7f3c · debit A`, `tx 7f3c · credit C`. Khóa chống trùng là mã thao tác đó **[Ngoài sách]**. Từ slide 12 tới slide 19, cả giao dịch nằm trong một hàng, một nhóm, nên một mã `tx 7f3c` là đủ.
- **"Leader chết rồi client gửi lại thì sao?"** Tập mã đã xử lý nằm trong event log và được sao chép cùng log. Leader mới vẫn thấy mã đó, nên không trừ tiền hai lần. Notebook 18 đi chi tiết **[Ngoài sách]**.

## 6. Đừng nói sai

- Đừng nói "mọi command đều được ghi vào event log". Chỉ command hợp lệ mới sinh event.
- Đừng nói "event là command đã lưu". Event là kết quả đã được kiểm tra; command bị từ chối thì không có event nào.
- Đừng nói "state machine nhớ là đã xử lý 7f3c" mà không chỉ chỗ lưu. Chỗ lưu là dòng `seen: tx 7f3c` trong State.
- Đừng nói ghi `seen` là một bước riêng, làm sau khi apply xong. Nó được ghi cùng bước với thay đổi số dư.
- Đừng mang khóa `tx 7f3c` trần sang slide 20 trở đi. Ở đó khóa là mã thao tác, ví dụ `tx 7f3c · debit A`.

## 7. Giải thích chi tiết

**Hàng đợi làm hai việc: xếp hàng và chốt thứ tự.**

*Việc 1: đứng giữa "nhiều người gửi" và "một người xử lý".* Hàng nghìn client gửi request **cùng lúc**. State machine chỉ có **một luồng** và xử lý **từng lệnh một**. Không có hàng đợi, các luồng nhận request sẽ tranh nhau gọi thẳng vào state machine. Muốn an toàn thì phải khóa số dư, tức quay về chuyện tranh khóa của 2PC. Có hàng đợi, phía nhận chỉ việc nối command vào cuối hàng. State machine lấy lệnh kế tiếp khi tới lượt. Nhận song song, xử lý tuần tự, không khóa.

*Việc 2: thứ tự trong hàng là thứ tự xử lý.* Với A = $1:

```
thứ tự trên hình                 thứ tự đảo ngược
7f3c A→C $1  ✓  A=$0 C=$1        91ab A→B $1  ✓  A=$0 B nhận $1
91ab A→B $1  ✕  (A đã $0)        7f3c A→C $1  ✕  (A đã $0)
```

Cùng hai lệnh, cùng số dư ban đầu, thứ tự khác cho kết quả khác.

**Vì sao `seen` phải ghi cùng bước với số dư.** Thử hai cách ghi sai, mỗi cách có một crash ở giữa:
- *Ghi số dư trước, `seen` sau.* A đã về $0, chưa kịp ghi `seen` thì chết. Client gửi lại 7f3c. State machine không thấy dấu, nên trừ A lần nữa.
- *Ghi `seen` trước, số dư sau.* `seen: tx 7f3c` đã có, chưa kịp trừ A thì chết. Client gửi lại. State machine thấy dấu và báo "đã xong", trong khi tiền chưa hề chuyển.

Ghi chung một bước thì chỉ còn hai khả năng: có cả hai, hoặc không có gì. Đó là lý do `seen: tx 7f3c` hiện ra ở bước 1, không phải bước 3.

**Bản ghi `seen` dựng lại được từ log.** Mỗi event mang nhãn `· 7f3c`. Replay event log (slide 14) dựng lại cả số dư lẫn tập mã đã xử lý. Mất State cũng không mất khả năng chống trùng.

**Hàng đợi này về sau ở đâu?** Sách bắt đầu bằng Kafka, một cụm máy riêng. Ở slide 16, hàng đợi thành một file command trên đĩa cục bộ của node (và ở slide 18, file đó nằm trên leader Raft). Vai trò không đổi; chỉ chỗ lưu thay đổi.

## 8. Dẫn dắt sang slide 13

- **Điều slide này để lại:** đã biết lệnh nào được chấp nhận. Chưa thấy một lệnh hợp lệ đi qua hệ thống ra sao: đọc gì, ghi gì, theo thứ tự nào.
- **Câu nối gợi ý:** "Lệnh 7f3c đã được chấp nhận. Giờ ta đi theo đúng lệnh đó, từ lúc rời hàng đợi tới lúc số dư thay đổi. Có năm bước, và thứ tự năm bước này quan trọng không kém thứ tự trong hàng."
- **Người nghe sẽ thấy ở slide 13:** năm mũi tên đánh số giữa command queue, chức năng validate, State, event list và chức năng apply; cả hai chức năng thuộc **cùng một state machine** (vòng `one loop`).
