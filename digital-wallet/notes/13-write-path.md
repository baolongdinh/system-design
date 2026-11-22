# Slide 13 — Write path: one command, five steps

> **Ý chính:** **Một state machine validate command thành event, rồi apply event vào state** (đúng lede). Đường ghi cho lệnh A→C $1 gồm 5 bước, theo Figure 17 của sách: **đọc command → đọc state → validate và nối event → đọc event → apply vào state**. **Một state machine chạy cả năm bước, mỗi lần một command.** Lệnh kế tiếp (`A→B $1`) chỉ được đọc sau bước 5, nên nó thấy A = $0 và bị từ chối. State chỉ là sản phẩm phụ của event list, nên **luôn dựng lại được**. Vì apply event luôn **deterministic**, ta lưu event, không lưu command, làm bản ghi gốc.

**Phần:** Event sourcing · **Footer:** Book: Wallet service example, Fig 17, p.524–525 · **Bước:** 5 · Định nghĩa State, State Machine của sách (Fig 14–15, p.521–524) nằm trong notebook, mục 4; Command và Event ở notebook 12.

---

## Hiểu nhanh trước khi nhìn hình

**Bốn khái niệm trên một vòng.** Slide 12 đã đặt tên command và event. Slide này thêm hai khái niệm còn lại:
- **State** là dữ liệu hiện tại: bảng số dư, A = $1, C = $0.
- **State machine** là bộ xử lý, với hai chức năng. **Validate:** đọc state để kiểm tra command; hợp lệ thì sinh event, không hợp lệ thì dừng, không có event nào. **Apply:** áp event lên state.

```
command:   A→C $1
validate:  đọc state, A = $1 ≥ $1 → hợp lệ
event:     e104 A −$1, e105 C +$1
apply:     A: $1 → $0,  C: $0 → $1
→ rồi mới lấy command tiếp theo
```

**Deterministic** nghĩa là cùng đầu vào thì luôn ra cùng đầu ra. Apply cùng event lên cùng state ban đầu thì luôn ra cùng số dư.

**Năm bước trên hình.** Lúc đầu A = $1, C = $0. Lệnh `A→C $1` đứng đầu hàng. Một state machine làm năm bước:

1. Lấy lệnh ở đầu hàng: `A→C $1`.
2. Đọc số dư: A = $1.
3. Kiểm tra: $1 ≥ $1, hợp lệ. Nối hai event vào cuối event list: `e104 A −$1`, `e105 C +$1`.
4. Đọc hai event vừa nối.
5. Apply: A = $0, C = $1.

Xong bước 5, nó mới quay lại đầu hàng lấy lệnh kế tiếp, `A→B $1`. Lúc này A = $0, nên lệnh đó bị từ chối.

**Append-only** nghĩa là chỉ nối thêm vào cuối, không bao giờ sửa hay xóa.

**Đọc ảnh cuối.** Hình trụ State hiện kết quả sau bước 5: A = $0, C = $1. Nhãn `read balance (A = $1)` là giá trị đọc **ở bước 2**, trước khi apply. Hai con số thuộc hai thời điểm khác nhau; hình không tự mâu thuẫn.

**Điều chặn tiêu hai lần là vòng lặp, không phải hàng đợi.** FIFO chỉ quyết định `A→C` đi trước `A→B`. Chính việc "làm trọn năm bước rồi mới đọc lệnh sau" bảo đảm `A→B` thấy A = $0. Slide này chạy trên một node, chưa có Raft, nên **chưa có** khái niệm "khoản trừ đang chờ" (pending). Khái niệm đó chỉ xuất hiện ở slide 18.

## 1. Slide này để làm gì

Ghép bốn khái niệm (command, event, state, state machine; slide 12 đã mở) thành một quy trình đánh số, để người nghe "chạy tay" được. Đồng thời chốt luật: **một state machine, hai chức năng, mỗi lần một command**.

## 2. Đọc hình

- **Lede:** *One state machine validates a command into events, then applies them to state. A $1, C $0.* Câu đầu là định nghĩa state machine của sách, nói gọn.
- **Trái trên:** `Client`, mũi tên `in` vào **cuối** dải **Command queue (FIFO)**. Trong hàng, từ trái sang phải: `A→D $1` (mới nhất), `A→B $1`, và `A→C $1` ở đầu hàng, nhãn `head`. Đây là lệnh ta đi theo.
- **Giữa trên:** bánh răng nhãn `State machine` / `validate`.
- **Phải:** hình trụ **State** với bốn dòng: `A: $1`, `B: $4`, `C: $0`, `D: $2`.
- **Giữa dưới:** dải **Event list (append-only)**. Bên trái là lịch sử cũ, mờ: `···`, `e102 B −$1`, `e103 D +$1`. Đầu nối vào ở bên phải, có dấu `»`.
- **Phải dưới:** bánh răng thứ hai, nhãn `same state machine` / `apply`.
- **Đường nét đứt** từ bánh răng apply vòng lên bánh răng validate, nhãn `one loop`.

**Năm mũi tên đánh số, mỗi bước hiện một mũi tên:**
1. Đầu hàng → validate: `read command`.
2. Validate → State: `read balance (A = $1)`.
3. Validate → event list, tách làm hai nhánh xanh: `valid → emit e104, e105`. Hai ô mới `e104 A −$1`, `e105 C +$1` xuất hiện ở cuối list.
4. Cuối list → bánh răng apply: `read next event`.
5. Apply → State: `apply → A: $0, C: $1`. Hai dòng A và C trong State đổi thành `$0` và `$1`, tô sáng.

**Dải bước dưới hình:** *Read the next command* · *Read the balance: A = $1* · *Validate; append e104, e105* · *Read the new events* · *Apply: A = $0, C = $1*.

Footer: *Book: Wallet service example, Fig 17, p.524–525*.

## 3. Trình bày theo bước

Các bước tự chạy (0,6 giây một bước). Với slide này nên bấm A để đi từng bước; mỗi bước có một câu riêng.

| Bước | Mũi tên | Nói |
|---|---|---|
| 0 | Toàn cảnh | "Hàng đợi, state machine với chức năng validate, State, event list, cùng state machine đó với chức năng apply, và vòng nét đứt `one loop`. Lệnh A→C $1 đang ở đầu hàng. A có $1, C có $0." |
| 1 | `read command` | "State machine lấy lệnh ở đầu hàng: A→C $1." |
| 2 | `read balance (A = $1)` | "Nó đọc số dư cần thiết: A có $1." |
| 3 | `valid → emit e104, e105` | "A đủ tiền, hợp lệ. Sinh **một event cho mỗi tài khoản**: e104 trừ A, e105 cộng C. Nối vào cuối event list. List chỉ nối thêm, không bao giờ sửa." |
| 4 | `read next event` | "Cùng state machine đó, giờ bằng chức năng apply, đọc event vừa nối." |
| 5 | `apply → A: $0, C: $1` | "Apply: A về $0, C có $1. Chỉ lúc này vòng lặp mới quay lại đầu hàng, đọc A→B $1. Lệnh đó thấy A = $0 và bị từ chối." |
| sau 5 | Chỉ hai bánh răng và `one loop` | "Ba bước đầu là validate: đọc state, không sửa state, đầu ra là event. Hai bước sau là apply: đọc event, sửa state. Hai chức năng, một state machine, một vòng lặp." |

## 4. Giải thích sâu

- **Định nghĩa của sách (p.521–524).**
  - *State:* thứ thay đổi khi apply event. Ở ví, đó là map `account → balance`, lưu trong key-value store hoặc database quan hệ.
  - *State machine:* validate command và sinh event; apply event để cập nhật state. Yêu cầu: hành vi **deterministic**, không đọc gì ngẫu nhiên từ bên ngoài, và apply một event lên một state luôn ra cùng kết quả.
  - *Figure 14* vẽ dòng chảy command → state machine → event → state. *Figure 15* thêm chiều thời gian: command được xử lý **từng cái một**. Figure 17 trên slide là chính dòng chảy đó, áp vào ví.
- **Vì sao lưu event, không lưu command.** Lúc validate, hệ thống có thể đọc thông tin bên ngoài hoặc tạo giá trị mới (một mã, một giờ). Nên cùng một command không chắc lần nào cũng sinh cùng event. Event thì đã chốt mọi giá trị, và apply event luôn ra cùng kết quả. Muốn tái lập hệ thống, ta **lưu event**, không lưu command để chạy lại. Ý này quay lại ở slide 17: chỉ event list cần được bảo vệ, và chỉ nó được sao chép.
- **Một state machine, hai chức năng.** Bước 1–3 là **validate**: đọc state, không sửa state, đầu ra là event. Bước 4–5 là **apply**: đọc event, sửa state, không bao giờ từ chối. Sách vẽ hai bánh răng chỉ theo quy ước (*"we usually draw two State Machines"*), và state machine xét command *"one by one in FIFO order"*.
- **Lưu event trước, apply sau.** Chết sau bước 3: event đã nằm trong list, khởi động lại chỉ cần apply tiếp. Chết trước bước 3: coi như lệnh chưa được xử lý; nó vẫn nằm trong hàng. Không bao giờ có lúc state đã đổi mà list không ghi lại.
- **"State is a by-product".** Database số dư giờ chỉ là kết quả của hàm apply chạy trên event list. Mất database thì replay là có lại (slide 14). Đây là đảo ngược so với slide 6–10, nơi số dư chính là sự thật.
- **Một event cho mỗi tài khoản.** Sách ghi `A: −$1` và `C: +$1` thành hai event riêng. Cách này khớp với việc về sau A và C nằm ở hai partition khác nhau (slide 20).
- **Giới hạn của mức này.** Một state machine xử lý tuần tự, và mỗi bước có thể đi qua mạng (Kafka, database). Sách gọi tên vấn đề: *"only handles one Event at a time and it needs to communicate with several external systems"*. Phần sau (slide 16–19) làm mỗi vòng nhanh hơn. Nó không tách validate và apply thành hai worker.

## 5. Câu hỏi có thể gặp

- **"Hai lệnh trừ A $1 tới gần như cùng lúc, A chỉ có $1, có lọt cả hai không?"** Không. Hai lệnh vào hàng theo thứ tự. State machine làm trọn năm bước cho lệnh đầu, rồi mới đọc lệnh sau. Khi lệnh sau được validate, A đã là $0. Nếu tách thành hai worker và để validate đọc A = $1 cũ, cả hai lệnh đều được duyệt. Đó là lỗi của thiết kế, không phải tính chất của event sourcing (bảng ở mục 7).
- **"Chết giữa bước 4 và 5 thì apply có bị lặp không?"** Cần nhớ vị trí (offset) của event cuối đã apply, hoặc làm apply idempotent (chạy lại cũng không cộng hai lần) **[Ngoài sách: chi tiết triển khai]**.
- **"Chờ apply xong mới đọc lệnh tiếp thì có chậm không?"** Ở mức này có. Phần sau làm mỗi vòng nhanh hơn bằng đĩa cục bộ. Khi có Raft (slide 18), leader có thể validate lệnh kế tiếp trước khi lệnh trước được apply; khi đó phải trừ cả các khoản đang chờ khỏi số dư khả dụng **[Ngoài sách]**.
- **"`···`, e102, e103 là gì?"** Lịch sử trước đó. `e102 B −$1`, `e103 D +$1` là cặp event của một giao dịch B→D $1 trước đó. Một command luôn nối cả cặp event của nó cùng lúc.
- **"Vì sao ghi rồi lại đọc? Trông thừa."** Xem mục 7: mỗi cặp ghi/đọc có lý do riêng.
- **"Ví dụ nào cho thấy sinh event có ngẫu nhiên?"** Gán một mã hay một giờ lúc tạo event; gọi dịch vụ ngoài để tra tỷ giá. Kết quả được *chốt* vào event, nên replay về sau không phải gọi lại **[Ngoài sách: ví dụ]**.
- **"Rốt cuộc có mấy state machine?"** Một. Nó có hai chức năng nên sách vẽ hai lần. Vẽ tách ra để thấy hai ràng buộc khác nhau: validate được phép từ chối, apply thì không bao giờ.
- **"Validate có ghi gì vào state không?"** Không. Nó chỉ đọc state (bước 2). Đầu ra của nó là event. Chỉ apply mới sửa state (bước 5).

## 6. Đừng nói sai

- Đừng đảo bước 3 và 5 (apply trước, ghi event sau). Như vậy crash sẽ làm mất tính tái lập.
- Đừng nói "state machine thứ hai", "apply worker" hay "validator". Nói "cùng state machine đó", "chức năng validate", "chức năng apply", "vòng lặp".
- Đừng nói validate có thể chuyển sang lệnh sau trong khi apply còn đang chạy. Lệnh sau chỉ được đọc sau bước 5.
- Đừng nói validate cập nhật state. Validate chỉ đọc.
- Đừng nói "lưu command để chạy lại là đủ". Chạy lại command có thể ra event khác; bản ghi gốc là event.
- Đừng nói slide này dùng "pending debit" để chặn lần trừ thứ hai. Ở đây chỉ có vòng lặp. Pending chỉ xuất hiện với Raft ở slide 18. Read view của CQRS (slide 15) được phép chậm, nên không bao giờ là căn cứ kiểm tra đủ tiền.

## 7. Giải thích chi tiết

**Một vòng lặp khác hai worker thế nào.** A bắt đầu $1; hàng có `A→C $1` rồi `A→B $1`.

| Lúc | Hai worker riêng (sai) | Một vòng lặp (đúng, như slide) |
|---|---|---|
| t1 | validate A→C: A = $1 ✓, ghi e104, e105 | validate A→C: A = $1 ✓, ghi e104, e105 |
| t2 | validate A→B: State vẫn A = $1 ✓ (apply chưa xong) | apply e104, e105: A = $0, C = $1 |
| t3 | apply e104, e105: A = $0 | đọc A→B, validate: A = $0 ✕, từ chối |
| t4 | apply event của A→B: A = −$1 | đọc lệnh tiếp theo (A→D) |

Cột trái là lý do hình ghi `same state machine` và vẽ vòng `one loop`.

**Vì sao ghi rồi lại đọc.** Trên hình chỉ có một lệnh và state machine đang rảnh, nên trông như ghi xong đọc ngay. Thực tế mỗi cặp có lý do riêng.

*Ghi rồi đọc command (vào hàng, rồi bước 1).*
- Hai việc do **hai bên khác nhau** làm. Phía nhận request nối lệnh vào cuối hàng. State machine lấy ra khi tới lượt.
- Khi tải cao, hai việc **cách nhau về thời gian**. State machine có thể đang bận một lệnh trong khi ba lệnh khác dồn vào hàng (bảng thời gian ở notebook 12).
- Ghi để **chốt thứ tự** và có bản ghi lâu dài; đọc để **xử lý tuần tự**.
- Khi lệnh có sẵn trong bộ nhớ, lần đọc gần như không tốn gì. Sách viết: *"we process Command and Event right after they are persisted. We may cache them in memory to save the time of loading them back from the local disk."*

*Ghi rồi đọc event (bước 3, rồi bước 4).* Lý do này quan trọng hơn. Vì sao không apply luôn kết quả vừa validate? Vì **apply chỉ lấy đầu vào từ event list**. Nhờ vậy cùng một đoạn code apply chạy y hệt trong mọi tình huống:

| Tình huống | Apply lấy event từ đâu |
|---|---|
| Xử lý lệnh bình thường (bước 4) | event list |
| Khởi động lại, replay (slide 14) | event list |
| Follower trong Raft: không validate, chỉ apply event đã commit nhận từ leader (slide 18) | event list |
| Read side dựng view riêng (slide 15) | event list |

Nếu lúc chạy thật apply đi "đường tắt" từ kết quả validate, thì chạy thật và replay là **hai đường code khác nhau**. Khi đó không còn bảo đảm replay ra đúng kết quả cũ. Mà đó lại là toàn bộ lý do dùng event sourcing.

**Ý lớn của slide: state chỉ là sản phẩm phụ.** Bảng số dư là kết quả của việc apply event list theo thứ tự. Mất bảng thì replay là có lại, miễn event list còn nguyên và apply deterministic.

## 8. Dẫn dắt sang slide 14

- **Điều slide này để lại:** state chỉ là kết quả của việc apply event theo thứ tự. Câu hỏi tự nhiên: vậy có tính lại được state ở một thời điểm bất kỳ không?
- **Câu nối gợi ý:** "Nếu state chỉ là kết quả của việc apply event theo thứ tự, thì muốn biết số dư hôm qua, tuần trước, hay đúng lúc khách khiếu nại, ta chỉ cần apply lại event tới mốc đó. Đây là lúc trả lời ba câu hỏi của kiểm toán viên ở slide 11."
- **Người nghe sẽ thấy ở slide 14:** một ví dụ riêng (A bắt đầu với $2): event log từ đầu, một mốc thời gian T, và replay với code v1 và v2.
