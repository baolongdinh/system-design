# Slide 15 — CQRS: one writer, many readers

> **Ý chính:** Có **một** state machine phụ trách phần ghi. Nó **đọc** write state để validate, **nối event vào log trước**, rồi mới **apply** event đó vào write state. Event được **publish** cho **nhiều read-only state machine**; mỗi cái dựng một view riêng (số dư, lịch sử giao dịch, view kiểm toán theo giờ). Các view có thể **trễ** so với phần ghi, mỗi cái một khác. Khi chúng đọc tiếp, chúng bắt kịp. Đó là **eventual consistency**.

**Phần:** Event sourcing · **Footer:** Book: CQRS, Fig 19, p.527–529 · **Bước:** 4

---

## Hiểu nhanh trước khi nhìn hình

**CQRS** (Command-Query Responsibility Segregation) nghĩa là tách việc **ghi** và việc **đọc** ra hai phía.

**Write side** (phía ghi) có đúng một state machine. Nó quyết định lệnh nào hợp lệ, ghi event vào log, rồi cập nhật **write state** (bảng số dư nội bộ của nó).

**Read side** (phía đọc) có nhiều **read-only state machine**. Mỗi cái đọc event log và dựng một **view** (còn gọi là projection hay read model): một bảng phục vụ một kiểu câu hỏi. Ví dụ: số dư cho client, lịch sử giao dịch, báo cáo kiểm toán.

**Tag `@ e107`** trên mỗi view là event cuối cùng view đó đã xử lý. Log đã tới e107 mà balance view mới `@ e106` thì view đó chậm một event. Client hỏi lúc đó có thể nhận số cũ.

**Eventual consistency** nghĩa là các view sẽ bắt kịp, miễn là chúng còn chạy và đọc tiếp. Nó **không** có nghĩa mọi view cập nhật cùng lúc.

**Log nối tiếp slide 13.** `e104 A −$1`, `e105 C +$1` là `tx 7f3c`, đã xong. Ở bước 1, lệnh đầu hàng `B→D $1` nối **cả cặp** `e106 B −$1`, `e107 D +$1`.

## 1. Slide này để làm gì

Trả lời câu hỏi: *client đọc số dư ở đâu?* Đồng thời giới thiệu **độ trễ của read side**. Ý này quay lại ở slide 21: read side của mỗi partition báo cho bên gọi, là Saga coordinator, biết một lệnh đã xong bằng cách push status.

## 2. Đọc hình

Một vạch đứt dọc chia **WRITE SIDE** (trái) và **READ SIDE (CQRS)** (phải).

**Write side:**
- **Command queue** với hai vé: `A→B $1` (sau) và `B→D $1` (đầu hàng, bên phải). Mũi tên vào bánh răng **Write state machine**.
- Hình trụ **Write state**: `A: $0`, `C: $1`, `B: $4`, `D: $2`. Mũi tên `read` đi **từ Write state vào bánh răng**: người ghi đọc state để kiểm tra lệnh.
- Mũi tên cam `append` từ bánh răng xuống dải **Event log**, đang có `e104 A −$1`, `e105 C +$1`.
- Mũi tên xanh `apply` đi **từ event log lên** Write state: state chỉ đổi bằng cách apply event đã nằm trong log.

**Read side**, ba hàng. Mỗi hàng là một bánh răng teal (read-only state machine) → một hình trụ teal (view), có tag offset:
- **Balance view** `@ e105`. **Client** ở góc phải gửi `query balance` vào view này.
- **Transaction history** `@ e105`.
- **Hourly audit view** `@ e101`.

**Theo từng bước:**
1. Hai ô mới `e106 B −$1`, `e107 D +$1` nối vào cuối log. Write state đổi `B: $3`, `D: $3` (chữ xanh). Balance view thành `@ e106`.
2. Ba đường nét đứt từ cuối log tới ba bánh răng teal, nhãn `async feed`.
3. Tag độ trễ bên phải từng view: balance `1 behind`; history `@ e107 ✓` `caught up`; audit `6 behind`.
4. Cả ba view `@ e107 ✓`, cả ba tag `caught up`, và một nhãn xanh `✓ eventually consistent`.

**Dải bước dưới hình:** *The writer appends e106, e107, then applies* · *Each reader follows the log at its own pace* · *Views lag by different amounts* · *All catch up: eventual consistency*.

Footer: *Book: CQRS, Fig 19, p.527–529*.

## 3. Trình bày theo bước

Các bước tự chạy (0,6 giây một bước). Bấm A nếu muốn đi từng bước.

| Bước | Trên màn hình | Nói |
|---|---|---|
| 0 | Vạch chia hai phía | "CQRS là tách ghi và đọc. Bên trái: một hàng command và **một** state machine phụ trách ghi. Nó đọc write state để validate, nối event vào log, rồi mới apply lên write state; để ý mũi tên `apply` đi từ log lên. A→C đã xong: e104, e105 đã nằm trong log. Bên phải: nhiều read-only state machine, mỗi cái tự dựng một view." |
| 1 | `e106 B −$1`, `e107 D +$1`; Write state `B: $3`, `D: $3` | "Người ghi lấy lệnh đầu hàng, B chuyển D $1. Đọc write state để kiểm tra, nối **cả cặp** e106, e107 vào log trước, rồi apply: B còn $3, D có $3." |
| 2 | Ba đường `async feed` | "Mỗi read-only state machine tự đọc log theo nhịp của nó, bất đồng bộ. Không ai chờ ai." |
| 3 | `1 behind`, `caught up`, `6 behind` | "Nên tại một thời điểm, mỗi view ở một chỗ khác nhau. Balance view ở e106, chậm một. History đã tới e107. Audit view còn ở e101, chậm sáu." |
| 4 | Cả ba `@ e107 ✓`, `✓ eventually consistent` | "Miễn các consumer còn chạy, từng view tới e107. Đó là eventual consistency: trễ khác nhau, không cập nhật cùng lúc." |
| sau 4 | — | "Độ trễ là bản chất của thiết kế, không phải lỗi. Hệ quả: vừa chuyển tiền xong mà hỏi số dư ngay thì có thể chưa thấy số mới. Mỗi view lưu vị trí đã đọc để khi bị chậm hoặc khởi động lại có thể đọc tiếp." |

## 4. Giải thích sâu

- **Ý của sách.** CQRS dẫn từ Martin Fowler. Cách nghĩ trực giác là chia sẻ một bản sao read-only của database. Event sourcing làm khác: *"Rather than publishing the State, Event Sourcing publishes all the events. The external world could rebuild any customized state itself."*
- **Vì sao nhiều view.** Mỗi nhu cầu đọc cần một cấu trúc khác nhau. Ví dụ của sách: một view số dư để phục vụ truy vấn; một view theo khoảng thời gian (ví dụ theo giờ) để điều tra trừ tiền hai lần, làm audit trail cho đối soát tài chính.
- **Độ trễ là bản chất:** *"The read-only State Machines lag behind to some extent, but will always catch up."*
- **Thứ tự của người ghi: đọc, nối, rồi apply.** Đây là cùng vòng lặp của slide 13. Nếu người ghi sửa state ngay từ command, và ghi event như một đầu ra song song, thì chết giữa hai việc sẽ để state đi trước log. Replay log không còn ra state hiện tại. Sách nói mọi thay đổi được lưu trước thành lịch sử bất biến; database chỉ là bản xem được cập nhật.
- **Một view chậm có thể thấy nửa giao dịch.** Ở bước 1, balance view `@ e106`: nó đã thấy B bị trừ nhưng chưa thấy D được cộng. Đó là một lý do nữa để **không bao giờ** dùng view để quyết định "đủ tiền không".

## 5. Câu hỏi có thể gặp

- **"Client muốn thấy số dư mới ngay sau khi ghi thì sao?"** Đó là bài toán read-your-writes (đọc được chính thứ mình vừa ghi). Thiết kế của sách không bắt bên gọi đọc view rồi đoán: read side push status của lệnh về cho bên gọi; ở thiết kế cuối, bên gọi đó là Saga coordinator (slide 21, notebook 21). Hoặc client chờ tới khi view đạt offset của event vừa ghi **[Ngoài sách: kỹ thuật]**.
- **"Projection hỏng thì sao?"** Xóa đi và replay lại từ event log, hoặc từ một snapshot (notebook 14). Projection luôn dựng lại được.
- **"Lệnh `A→B $1` đang chờ sẽ ra sao?"** Write state có A = $0, nên tới lượt nó bị từ chối, không có event. Người ghi kiểm tra bằng **write state**, không bằng balance view, vì view có thể trễ.
- **"Write side và read side có dùng chung database không?"** Không. Write state thuộc người ghi. Mỗi view là một kho riêng.

## 6. Đừng nói sai

- Đừng nói "write side và read side cùng một database".
- Đừng nói người ghi "cập nhật state rồi ghi event", hay làm hai việc song song. Nó nối event trước, rồi apply event đó.
- Đừng nói `A→C $1` còn đang chờ trong hàng. Event của nó (e104, e105) đã nằm trong log; lệnh chờ là `A→B $1`.
- Đừng nói bước 1 chỉ nối một event `B −$1`. Bước 1 nối cả cặp `e106`, `e107` của lệnh `B→D $1`.
- Đừng nói "eventually consistent" là "mọi view cập nhật cùng lúc, chỉ chậm một chút". Mỗi view trễ một kiểu.

## 7. Giải thích chi tiết

**"Sao không đọc thẳng từ write state?"** Câu này gần như chắc chắn sẽ được hỏi. Có năm lý do.

1. **Write state không có đủ thứ client cần.** Nó chỉ là map `tài khoản → số dư hiện tại`, vừa đủ để validate lệnh kế tiếp.

   | Nhu cầu | Write state có không? |
   |---|---|
   | Số dư hiện tại của A | Có |
   | Lịch sử giao dịch của A trong tháng | Không, chỉ giữ con số cuối |
   | Tổng tiền ra vào theo giờ để điều tra trừ hai lần | Không |
   | `tx 7f3c` đã xong chưa | Không |

   Những thứ này chỉ dựng được từ event log.
2. **Bảo vệ người ghi duy nhất.** Người ghi là **một luồng** gánh rất nhiều lệnh mỗi giây. Người dùng **xem** số dư nhiều hơn **chuyển** tiền rất nhiều. Đổ mọi truy vấn vào cùng chỗ thì chúng tranh CPU, I/O và cache với người ghi. Một truy vấn kiểm toán nặng có thể làm chậm cả việc chuyển tiền.
3. **Về sau write state không còn là "một database" để mà đọc.** Từ slide 16, write state là RocksDB trên đĩa cục bộ của từng node Raft, chia thành nhiều partition (slide 20). Đọc thẳng nghĩa là client phải biết tài khoản ở partition nào, node nào, và truy vấn dội vào chính các node đang chạy đồng thuận.
4. **Scale và chọn công nghệ độc lập [Ngoài sách].** Mỗi view có thể có nhiều bản sao, có cache, và dùng loại kho hợp nhất: key-value cho số dư, kho theo thời gian cho lịch sử, kho phân tích cho kiểm toán.
5. **Thêm view mới hay sửa view hỏng mà không đụng tới tiền.** Cần view phát hiện gian lận? Viết một read-only state machine mới, cho đọc log từ đầu. View lỗi? Xóa rồi replay. Write side không bị chạm tới.

**Một view được dựng thế nào.** Mỗi read-only state machine lặp ba việc:
1. Đọc event tiếp theo, bắt đầu từ **offset** đã dừng lần trước.
2. Apply event vào kho riêng của nó.
3. Ghi lại offset vừa xử lý. Đó là tag `@ e107` trên hình.

Cùng bốn event `e104 A −$1`, `e105 C +$1`, `e106 B −$1`, `e107 D +$1` dựng ra ba thứ khác nhau:

| View | Kho phù hợp **[Ngoài sách]** | Dữ liệu sau `@ e107` |
|---|---|---|
| Balance view | key-value | `A → $0`, `C → $1`, `B → $3`, `D → $3` |
| Transaction history | bảng theo tài khoản và thời gian | `(7f3c, A, −$1)`, `(7f3c, C, +$1)`, `(…, B, −$1)`, `(…, D, +$1)` |
| Hourly audit view | bảng tổng theo giờ | tổng trừ, tổng cộng, số event trong giờ |

**Các luật khi dựng view.**
- **View chỉ để đọc, không phải nguồn sự thật.** Validate lệnh chuyển tiền phải dựa vào write state.
- **Apply đúng thứ tự, không apply hai lần.** Nhờ offset, khởi động lại thì đọc tiếp đúng chỗ **[Ngoài sách: chi tiết triển khai]**.
- **Event phải đủ thông tin ngay từ đầu.** View chỉ dựng được những gì event có. Event không ghi thời điểm hay mã giao dịch thì về sau không view nào tra được theo thời gian hay theo giao dịch. Thiết kế event là thiết kế hợp đồng dữ liệu cho mọi view sau này.
- **Dựng lại từ đầu có thể rất lâu.** View cũng nên có snapshot riêng, cùng ý tưởng ở notebook 14.

**Cái giá: độ trễ.** Đó là `1 behind`, `6 behind` trên hình. Thiết kế xử lý theo hai cách:
- Muốn biết **lệnh của mình đã xong chưa**: read side push status về bên gọi; ở thiết kế cuối là Saga coordinator (slide 21).
- Muốn xem số dư: chấp nhận eventual consistency, vì view luôn bắt kịp.

**Câu chốt để nói.** Write state là **dụng cụ làm việc** của người ghi: giữ đúng thứ cần để quyết định lệnh có hợp lệ không. Read side là **mặt tiền** phục vụ người xem: hình dạng nào cũng được, đông bao nhiêu cũng được, mà không làm phiền người đang chuyển tiền.

## 8. Dẫn dắt sang slide 16

- **Điều slide này để lại:** thiết kế đã đúng, kiểm toán được (replay) và phục vụ được người đọc (CQRS). Nhưng mỗi lệnh vẫn phải đi qua Kafka và database ở máy khác.
- **Câu nối gợi ý:** "Hệ thống đã đúng và kiểm toán được. Nhưng nhìn lại write side: state machine xử lý từng lệnh một, và mỗi lệnh đi qua mạng tới Kafka và database. Nếu mỗi lượt chờ mạng mất cỡ một mili giây, một state machine chỉ làm được cỡ một nghìn lệnh mỗi giây. Ta bắt đầu phần deep dive: làm sao cho nhanh."
- **Người nghe sẽ thấy ở slide 16:** hai làn ngang cho cùng lệnh `tx 7f3c · A→C $1`. Làn trên đi qua mạng tới Kafka và database; làn dưới giữ command, event và state ngay trên node xử lý. Từ slide 16 tới 19, cả hệ thống vẫn là một nhóm máy giữ mọi tài khoản.
