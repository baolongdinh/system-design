# Slide 14 — Replay: rebuild any past balance

> **Ý chính:** Event list **bất biến** cộng với hàm apply **deterministic** thì mọi lần replay đều cho cùng kết quả. Nhờ đó trả lời được ba câu hỏi của kiểm toán viên: số dư tại thời điểm T, số dư hiện tại có đúng không, và logic có còn đúng sau khi đổi code không. Replay từ đầu thì chậm dần theo lịch sử; **snapshot** (không vẽ trên slide, xem mục 5 và 7) cho phép bắt đầu từ một mốc đã lưu.

**Phần:** Event sourcing · **Footer:** Book: Reproducibility, Fig 18, p.525–527 · **Bước:** 3 · Phần snapshot (chỉ có trong notebook): Book: Snapshot, Fig 22, p.532–534

---

## Hiểu nhanh trước khi nhìn hình

**Đây là một ví dụ riêng.** A bắt đầu với **$2**, không phải $1 như `tx 7f3c` ở slide 11, 12, 13. Vì vậy `e1`, `e2` ở đây **không phải** `e104`, `e105` của slide 11.

**Replay** là tính lại số dư từ event, không phải chạy lại lệnh chuyển tiền. Không ai bị trừ tiền lần nữa. Ta lấy trạng thái ban đầu (`genesis`), apply từng event theo thứ tự, và dừng ở mốc cần xem.

**Với số trên hình:**
- Trạng thái ban đầu: A $2, C $0, D $0.
- Sau e2 (mốc T): A $1, C $1, D $0.
- Sau e6 (hiện tại): A $0, C $0, D $2.

**Ba câu hỏi, ba cách dùng replay:** số dư lúc T (replay tới T); số dư hiện tại có đúng không (replay tới cuối, so với database); logic có còn đúng sau khi đổi code (chạy cùng event list qua code cũ và mới, so kết quả).

**Hai điều kiện.** Event không bao giờ bị sửa. Hàm apply deterministic: cùng state, cùng event thì luôn ra cùng kết quả.

**Snapshot** là ảnh chụp state tại một vị trí trong log, lưu thành file. Có nó thì không phải replay từ `genesis` mỗi lần.

## 1. Slide này để làm gì

Giữ lời hứa ở slide 2 (*Reproducible: rebuild any past balance by replay*) và trả lời ba câu hỏi của kiểm toán viên ở slide 11. Notebook này cũng giữ nội dung snapshot, vốn là một slide riêng ở bản 2 và nay đã bỏ khỏi deck.

## 2. Đọc hình

- **Trên cùng:** dải **Event log (immutable)**, đọc trái sang phải:

  | Ô | Nội dung | Thuộc giao dịch |
  |---|---|---|
  | `genesis` | `A $2, C $0, D $0` | trạng thái ban đầu |
  | `e1`, `e2` | `A −$1`, `C +$1` | A→C $1 |
  | `e3`, `e4` | `A −$1`, `D +$1` | A→D $1 |
  | `e5`, `e6` | `C −$1`, `D +$1` | C→D $1 |

  Cuối dải có dấu `»`: log còn được nối tiếp.
- **Bước 1:** vạch đỏ nét đứt `time T` cắt dải ngay sau e2. Mũi tên xanh dương `replay genesis → T` từ `genesis` tới vạch. Thẻ `state at T: A $1, C $1, D $0`, dòng lớn `A: $1 C: $1 D: $0`, góc phải `Σ = $2`.
- **Bước 2:** mũi tên xanh lá `replay to current (after e6)` đi tiếp từ vạch T tới cuối dải. Thẻ `current: A $0, C $0, D $2`, dòng lớn `A: $0 C: $0 D: $2`, `Σ = $2`, chip `✓ matches DB`.
- **Bước 3:** hàng dưới cùng: bánh răng `code v1` → thẻ `state output (code v1)` `A: $0, C: $0, D: $2`; bánh răng `code v2` → thẻ `state output (code v2)` với cùng số; mũi tên tới chip xanh `identical ✓`.

**Dải bước dưới hình:** *Balance at time T? Replay up to T* · *Correct now? Recompute and compare* · *After a code change? Run both versions*. Ba ô này là ba câu hỏi của kiểm toán viên ở slide 11.

Lede kết thúc bằng *(Here A starts at $2.)*. Footer: *Book: Reproducibility, Fig 18, p.525–527*.

## 3. Trình bày theo bước

Các bước tự chạy (0,6 giây một bước). Bấm A nếu muốn đi từng bước.

| Bước | Trên màn hình | Nói |
|---|---|---|
| 0 | Dải event log | "Nói ngay: đây là ví dụ riêng, A bắt đầu với $2. Log bắt đầu từ trạng thái ban đầu: A $2, C và D không có gì. Rồi ba giao dịch, mỗi giao dịch hai event: A chuyển C $1, A chuyển D $1, C chuyển D $1." |
| 1 | `time T`, `replay genesis → T`, thẻ `state at T` | "Muốn biết số dư lúc T, ngay sau giao dịch đầu: bắt đầu từ trạng thái ban đầu, apply event tới T. A $1, C $1, D $0. Tổng vẫn $2. Đó là câu hỏi thứ nhất." |
| 2 | `replay to current (after e6)`, `✓ matches DB` | "Apply tiếp tới event cuối: A $0, C $0, D $2. So với bảng số dư trong database: khớp. Đó là câu hỏi thứ hai: tính lại từ lịch sử rồi so." |
| 3 | `code v1`, `code v2`, `identical ✓` | "Câu hỏi thứ ba: đổi code rồi, logic có còn đúng? Chạy cùng event list qua code cũ và code mới. Giống nhau là bằng chứng code mới không đổi kết quả trên lịch sử này. Khác nhau là đã tìm ra chỗ cần điều tra." |
| sau 3 | Chỉ lede | "Vì sao lần nào cũng ra cùng kết quả? Hai điều kiện, thiếu một là hỏng: event không bao giờ bị sửa, và hàm apply deterministic." |

## 4. Giải thích sâu

- **So với các thiết kế trước.** Sách viết: *"historical balance information is lost during the update operation"*. Với event sourcing, *"all changes are saved first as immutable history"*; database chỉ là *"an updated view"*.
- **Vì sao chắc chắn ra cùng kết quả.** Sách: *"Because the Event list is immutable and the State Machine logic is deterministic, it is guaranteed that the historical states generated from each replay are the same."*
- **Kết luận của sách.** Nhờ khả năng kiểm toán, event sourcing *"is often chosen as the de facto solution for the wallet service"*.
- **Câu hỏi thứ ba có giới hạn.** Hai kết quả giống nhau là một bằng chứng kiểm thử **trên lịch sử này**. Nó không chứng minh code mới đúng với mọi tình huống tương lai.

## 5. Câu hỏi có thể gặp

- **"e1, e2 ở đây có phải hai event của `tx 7f3c` không?"** Không. Đây là ví dụ riêng, A bắt đầu $2. Hai event của 7f3c là `e104`, `e105`, với A từ $1 về $0.
- **"Replay từ đầu với hàng tỷ event thì mất bao lâu?"** Rất lâu. Lời giải của sách là **snapshot**. Sách viết: định kỳ dừng state machine và *"save the current State into a file. This is called a snapshot."* Từ đó state machine *"does not have to restart from the very beginning anymore"*: nó đọc snapshot, *"verify where it left off"*, rồi xử lý tiếp.
- **"Snapshot chứa những gì?"**
  - State tại một vị trí trong log: các số dư. (Sách.)
  - Vị trí đó, tức event cuối cùng đã được tính vào snapshot, ví dụ `last applied: e2`. Đây là ý *"verify where it left off"* của sách.
  - Tập mã thao tác đã apply (tập chống trùng), ít nhất trong khoảng thời gian bên gọi còn có thể gửi lại **[Ngoài sách]**. Lý do ở mục 7.
- **"Khôi phục bằng snapshot thế nào?"** Nạp snapshot, rồi replay **chỉ các event sau vị trí của nó**. Thời gian khôi phục tăng theo số event sau snapshot, không theo cả lịch sử. Khi có Raft (slide 18), chỉ replay event **đã commit** **[Ngoài sách: suy ra từ quy tắc commit]**.
- **"Snapshot lưu ở đâu?"** Sách: *"A snapshot is a giant binary file and a common solution is to save it in an object storage solution, such as HDFS."* Lưu ngoài node vì nếu đĩa của node hỏng, snapshot trên đĩa đó mất theo, đúng lúc cần nó nhất **[Ngoài sách: lý do]**.
- **"Ai cần snapshot ngoài lúc khôi phục?"** Đội tài chính. Sách: *"the finance team often requires a snapshot to be taken at 00:00"* để đối soát giao dịch trong ngày. Có snapshot thì một read-only state machine chỉ cần nạp một snapshot, không phải đọc từ đầu.
- **"Máy chỉ khởi động lại thì có cần tải snapshot không?"** Thường không. Đĩa còn nguyên thì state cục bộ (RocksDB, slide 16) còn nguyên; nó chỉ apply tiếp từ vị trí đã apply. Snapshot ở object storage dành cho lúc mất đĩa, lúc thêm một replica mới, và cho đối soát **[Ngoài sách: phân loại]**.
- **"Có snapshot rồi thì xóa event cũ được không?"** Về kỹ thuật, event trước snapshot không còn cần cho việc khôi phục. Nhưng event log là nguồn sự thật và là bản ghi kiểm toán. Giữ hay chuyển sang kho lưu trữ là quyết định nghiệp vụ **[Ngoài sách]**.
- **"Muốn sửa một giao dịch sai thì sửa event à?"** Không bao giờ. Ghi một event mới để bù, ví dụ hoàn tiền. Lịch sử vẫn kể đúng chuyện đã xảy ra, kể cả chuyện từng sai **[Ngoài sách: thực hành chuẩn]**.

## 6. Đừng nói sai

- Đừng nói `e1`, `e2` ở đây là `tx 7f3c`, hay "tiếp tục ví dụ slide 13". Đây là ví dụ riêng, A bắt đầu $2.
- Đừng nói replay là "chạy lại lệnh chuyển tiền". Replay chỉ apply event đã có; không validate lại, không chuyển tiền lại.
- Đừng nói "snapshot thay thế event log". Snapshot là điểm xuất phát; event log vẫn là nguồn sự thật.
- Đừng nói "khôi phục mất thời gian cố định". Nó bằng thời gian nạp snapshot cộng thời gian replay phần sau snapshot.
- Đừng nói snapshot chỉ cần số dư. Nó phải ghi đúng vị trí trong log, và (ngoài sách) cả tập chống trùng.

## 7. Giải thích chi tiết

**Tự nhẩm trước khi trình bày** (genesis: A $2, C $0, D $0):

| Sau event | A | C | D | Tổng |
|---|---|---|---|---|
| genesis | 2 | 0 | 0 | 2 |
| e1 `A −$1` | 1 | 0 | 0 | 1 (tạm lệch) |
| e2 `C +$1` → **mốc T** | 1 | 1 | 0 | 2 |
| e3 `A −$1` | 0 | 1 | 0 | 1 (tạm lệch) |
| e4 `D +$1` | 0 | 1 | 1 | 2 |
| e5 `C −$1` | 0 | 0 | 1 | 1 (tạm lệch) |
| e6 `D +$1` → **hiện tại** | 0 | 0 | 2 | 2 |

Tổng chỉ bằng $2 sau khi xong **cặp** event của mỗi transfer. Giữa hai event, $1 "đang trên đường" như ở slide 3; đó không phải lỗi.

**Nếu replay và database lệch nhau** thì database sai, vì event log mới là nguồn sự thật.

**Snapshot, bằng chính ví dụ trên hình.** Thẻ `state at T` đã gần là một snapshot. Lưu nó thành file, ghi kèm vị trí: `snapshot @ e2: A $1, C $1, D $0`. Lần sau cần số dư hiện tại:

```
không có snapshot:  genesis → e1 → e2 → e3 → e4 → e5 → e6     (6 event)
có snapshot @ e2:   nạp snapshot → e3 → e4 → e5 → e6           (4 event)
kết quả:            A $0, C $0, D $2   (giống hệt)
```

Ở đây chỉ bớt 2 event. Với một log hàng tỷ event, snapshot hằng ngày nghĩa là chỉ phải replay event của một ngày.

**Cùng ý đó trên nhóm máy của phần sau** (slide 16–18). Ở đó cả hệ thống là một nhóm Raft giữ mọi tài khoản. Nhóm có snapshot @ e40: A $1, B $4, C $0, D $2. Bốn event sau đó:

| Sau | A | B | C | D | Ghi chú |
|---|---|---|---|---|---|
| snapshot @ e40 | $1 | $4 | $0 | $2 | nạp từ object storage |
| e41 `B −$1` | $1 | $3 | $0 | $2 | |
| e42 `D +$1` | $1 | $3 | $0 | $3 | đúng state ở slide 16–18, trước khi tx 7f3c commit |
| e43 `A −$1` (`tx 7f3c`) | **$0** | $3 | $0 | $3 | |
| e44 `C +$1` (`tx 7f3c`) | $0 | $3 | **$1** | $3 | đúng state ở slide 18, sau commit và apply |

**Vì sao vị trí trong log là phần quan trọng nhất.**
- Ghi nhầm "tới e39" trong khi thật ra đã có e40: replay apply e40 **hai lần**.
- Ghi nhầm "tới e41" trong khi thật ra mới tới e40: replay **bỏ sót** e41, B sẽ là $4 thay vì $3.

Vì vậy state và vị trí phải được chụp **cùng một lúc**. Đó là lý do sách mô tả việc dừng state machine khi chụp: dừng thì state không đổi giữa chừng. Thực tế có thể chụp không dừng (copy-on-write), hoặc chụp từ một follower **[Ngoài sách]**.

**Vì sao snapshot cần cả tập chống trùng** **[Ngoài sách]**. Mỗi giao dịch có mã riêng, ví dụ `tx 7f3c`; từ slide 20 là mã của từng thao tác, như `tx 7f3c · debit A`. Mã đó nằm trong event, nên tập mã đã apply cũng là một phần của state dựng từ log. Thử tình huống sau:
1. Thao tác X được apply ở e39. Câu trả lời cho bên gọi bị mất; bên gọi sẽ gửi lại.
2. Một replica mất đĩa, được dựng lại từ snapshot @ e40 chỉ có số dư. Replay e41–e44 chỉ đưa mã của các event đó vào tập. Mã của X không có.
3. Replica đó thành leader. Bên gọi gửi lại X với cùng mã.
4. Leader mới không thấy X trong tập, nên ghi một event mới. X được apply **hai lần**.

Snapshot có cả tập mã thì replica dựng lại giống hệt mọi replica khác, và bước 4 trả lại kết quả cũ. Notebook 18 kể phần leader mới chi tiết hơn.

## 8. Dẫn dắt sang slide 15

- **Điều slide này để lại:** event log trả lời được mọi câu hỏi về lịch sử. Nhưng client bên ngoài không thể tự replay mỗi lần muốn xem số dư.
- **Câu nối gợi ý:** "Kiểm toán viên đã có câu trả lời. Còn người dùng? Họ mở app là muốn thấy số dư và lịch sử giao dịch, không phải chờ replay. Event sourcing phục vụ họ theo một cách riêng: nó không chia sẻ state, nó **publish event**, ai cần gì thì tự dựng. Đó là CQRS."
- **Người nghe sẽ thấy ở slide 15:** một write side với một writer, và nhiều read-only state machine ở phía đọc, mỗi cái chậm một khoảng khác nhau.
