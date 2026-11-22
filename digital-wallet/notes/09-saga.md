# Slide 9 — Attempt 2c: Saga

> **Ý chính:** Saga chạy các bước **theo một thứ tự cố định**. Mỗi bước là một local transaction tự commit. Nếu một bước bị từ chối, Saga **bù ngược** các bước đã có hiệu lực bằng *compensating transaction* (giao dịch bù). Với ví: trừ A trước, cộng C sau. Cách điều phối được ưu tiên là **orchestration**: một coordinator ra lệnh, và **ghi kết quả từng bước vào phase status table trước khi ra lệnh bước kế tiếp**.

**Phần:** Distributed transactions · **Footer:** Book: Saga, Fig 13, p.517–519 · **Bước:** 4

---

## Hiểu nhanh trước khi nhìn hình

Ví dụ vẫn là A chuyển $1 cho C. Ban đầu A = $1, C = $0.

**Saga là một chuỗi bước nhỏ.** Không có transaction lớn nào bọc cả chuỗi.
- Bước 1: database của A trừ $1 và commit ngay. A = $0.
- Coordinator ghi "A xong" vào phase status table của nó.
- Bước 2: coordinator mới gửi lệnh cộng $1 cho database của C. C = $1. Xong.

**Local transaction** là transaction chỉ chạm một database. Nó commit xong là xong, không chờ ai.

**Phase status table** là bảng tiến độ của coordinator. Mỗi dòng ghi một bước đã xong hay chưa. Coordinator khởi động lại thì đọc bảng này để biết làm tiếp từ đâu.

**Nếu C từ chối lệnh cộng.** A đã thật sự mất $1. Không thể "hủy" commit cũ. Saga chạy một giao dịch mới: cộng trả A $1. Giao dịch đó gọi là **compensating transaction** (giao dịch bù). Nó không xóa lần trừ; nó là một lần ghi mới.

**Chỉ bù khi kết quả đã biết chắc.** "C từ chối" là đã biết. "C chưa trả lời" (timeout) là chưa biết; notebook 21 (phần *Khi P2 không trả lời*) xử lý trường hợp đó.

**Ai điều khiển chuỗi?** Hai cách:
- **Orchestration:** một coordinator ra lệnh từng bước. Sách nói ví thường chọn cách này.
- **Choreography:** không có coordinator. Mỗi service nghe event của service khác rồi tự làm phần mình.

## 1. Slide này để làm gì

Trình bày cách thứ ba để chuyển tiền xuyên hai database. Thiết kế cuối dùng lại cách này ở slide 21. Người nghe cần nắm chắc ba ý: trừ trước cộng sau; coordinator ghi tiến độ trước mỗi lệnh; bù là giao dịch mới, chỉ chạy khi kết quả đã biết.

## 2. Đọc hình

Hình có hai vùng: luồng giao dịch bên trái, khung *Coordination models* bên phải.

**Vùng trái, luôn hiện:**
- Góc trên: lục giác tím **Saga coordinator**, nối bằng nét đứt với bảng **phase status table**. Bảng có hai dòng: `A −$1` và `C +$1`.
- Hàng giữa, đọc trái sang phải: `start` → ô `A −$1` (đầu ô: *Phase 1 · DB A*) → ô `C +$1` (*Phase 2 · DB C*) → vòng tròn xanh `success`.

**Theo từng bước:**
- **Bước 1 (xanh lá):** mũi tên từ `start` vào `A −$1`. Từ `A −$1`, đường xanh đi **lên bảng** của coordinator, rồi từ bảng đi **xuống** ô `C +$1`, rồi tới `success`. Cả hai dòng trong bảng hiện `done ✓`. Đường vòng qua bảng nói rằng coordinator ghi "A xong" rồi mới gửi lệnh cho C.
- **Bước 2 (đỏ cam):** dòng `C +$1` trong bảng đổi thành `rejected`. Phía trên ô C có dấu ✕ và chữ `C +$1 rejected`.
- **Bước 3 (đỏ cam, nét đứt):** từ ô `C +$1` một mũi tên đi xuống, nhãn `compensate`, tới ô **Compensate C** `C −$1`. Từ đó mũi tên chạy sang trái, nhãn `reverse order`, tới ô **Compensate A** `A +$1`.
- **Bước 4:** mũi tên tiếp tục sang trái tới dấu ✕ đỏ cam, nhãn `error to client`.

Hình cuối (sau bước 4): bảng ghi `A −$1 done ✓` và `C +$1 rejected`. Hàng trên là đường đi tới; hàng dưới là đường bù, đọc từ **phải sang trái**.

**Khung phải, *Coordination models*:**
- **Orchestration**, gắn nhãn xanh `preferred ✓`: một lục giác *Coordinator* với hai mũi tên tím tới `DB A` và `DB C`. Một bên ra lệnh, hai bên làm.
- **Choreography:** ba ô `Order` → `Wallet A` → `Wallet C`, nối nhau bằng mũi tên event. Một đường đứt nét từ `Wallet C` vòng về `Order`: kết quả cũng đi ngược lại bằng event. Không có ai đứng giữa.

Footer: *Book: Saga, Fig 13, p.517–519*.

## 3. Trình bày theo bước

Các bước tự chạy (0,6 giây một bước). Bấm A nếu muốn đi từng bước; R để chạy lại. Bảng dưới là thứ tự để nói.

| Bước | Trên màn hình | Nói |
|---|---|---|
| 0 | Coordinator, bảng hai dòng, hàng `start` → `A −$1` → `C +$1` → `success`; khung *Coordination models* | "Saga bỏ hẳn hai pha. Các bước chạy lần lượt, mỗi bước tự commit. Với n bước, ta chuẩn bị 2n thao tác: n bước làm, n bước bù." |
| 1 | Đường xanh đi qua bảng; hai dòng `done ✓`; strip: *A −$1, then C +$1, then success* | "Trừ A $1, commit. Coordinator ghi 'A xong' vào bảng, rồi mới gửi lệnh cộng C. Cộng C $1, commit, báo thành công. Trừ trước, cộng sau: Saga không giữ chỗ, nên cộng C trước thì C tiêu được ngay." |
| 2 | Dòng C thành `rejected`, ✕ `C +$1 rejected`; strip: *C's database rejects C +$1* | "Giờ giả sử database của C **từ chối** lệnh cộng. Kết quả đã biết chắc. Nhớ: timeout thì khác, timeout là chưa biết gì." |
| 3 | Ô bù `C −$1`, `A +$1`, nhãn `reverse order`; strip: *Compensate in reverse: C, then A +$1* | "Saga bù ngược từ bước lỗi về bước đầu: bù cho C trước, rồi cộng trả A $1. Cộng trả là một giao dịch mới, không xóa dòng trừ." |
| 4 | ✕ `error to client`; strip: *The client receives an error* | "Client nhận lỗi. A về $1, C vẫn $0." |
| sau 4 | Chỉ khung *Coordination models* | "Ai điều khiển chuỗi này? Choreography hay orchestration. Sách nói ví thường chọn orchestration." |

## 4. Giải thích sâu

- **Ba luật của Saga (p.517).** (1) Mọi thao tác xếp thành một chuỗi, mỗi thao tác là một transaction độc lập trên database của nó. (2) Thao tác trước xong thì thao tác sau mới được kích hoạt. (3) Một thao tác hỏng thì quay ngược từ thao tác hiện tại về thao tác đầu bằng compensating transaction.
- **Không chạy song song được.** Vì luật (2), Saga luôn tuần tự. TC/C thì gọi được các bên **trong cùng một pha** song song (Table 5). Với mô hình giữ chỗ ở slide 8, Try giữ $1 ở A và ghi pending ở C cùng lúc được, vì chưa ai tiêu được gì; tiền chỉ đổi chỗ ở Confirm **[Ngoài sách: mô hình giữ chỗ]**.
- **Vì sao trừ trước cộng sau.** Cùng lý do với Table 4 của sách (notebook 8). Nếu cộng C trước rồi phải bù, C có thể đã tiêu mất $1 đó. TC/C giữ chỗ né được chuyện này bằng pending, tức chưa tiêu được. Saga không có pending: mỗi lệnh cộng là tiền thật, nên phải trừ trước.
- **Bù khác Cancel của TC/C trên slide 8.** Bù của Saga là một giao dịch ngược thật, `A +$1`, vì `A −$1` đã commit. Cancel trên slide 8 chỉ nhả chỗ giữ, số dư không đổi **[Ngoài sách: mô hình giữ chỗ]**. Trong ví dụ đơn giản của sách, Try của TC/C trừ thẳng A, nên Cancel của sách cũng là cộng trả A, giống hệt bước bù ở đây.
- **Vì sao đường xanh đi qua bảng.** Trong orchestration, chính coordinator khởi động bước 2, không phải DB A. Sách (Figure 29) cho coordinator tạo bản ghi khi nhận giao dịch, và ghi "Partition 1 thành công" **trước khi** gửi lệnh cho Partition 2. Lý do bằng một crash cụ thể: mục 7.
- **Vì sao Figure 13 vẽ cả "Compensate C".** Sách mô tả rollback *"from the current operation to the first operation in reverse order"*, nên mỗi bước có một bước bù, kể cả bước vừa hỏng. Trong thực tế, C chưa từng được cộng, nên bù cho C không làm gì (no-op). Nhưng từ lúc đó, C phải từ chối mọi lệnh `C +$1` đến muộn của giao dịch này **[Ngoài sách: diễn giải thực hành]**. Lý do nằm ở mục 7.
- **Choreography và orchestration (p.518).** Choreography hoàn toàn phi tập trung và bất đồng bộ. Mỗi service phải giữ một state machine riêng để biết phản ứng ra sao khi service khác phát event; nhiều service thì rất khó quản lý. Orchestration dùng một coordinator; sách nói nó *"handles complexity well"*, nên thường được chọn cho ví.

## 5. Câu hỏi có thể gặp

- **"Coordinator của Saga có phải điểm hỏng đơn như 2PC?"** Nó lưu tiến độ vào phase status table, nên khởi động lại vẫn làm tiếp được. Quan trọng hơn: nó **không giữ khóa** trên dữ liệu trong lúc chờ.
- **"Coordinator chết đúng lúc A đã trừ mà chưa gửi lệnh cho C?"** Bảng ghi `A −$1 done`, dòng C chưa xong. Coordinator mới đọc bảng và gửi `C +$1` với cùng mã thao tác của `tx 7f3c`. Nếu lần gửi trước đã tới nơi, C nhận ra mã đó và không cộng lần hai **[Ngoài sách: phần chống trùng; phần ghi bảng là Figure 29]**.
- **"C không trả lời, hết timeout, bù luôn được không?"** Không. Lệnh `C +$1` có thể vẫn đang trên đường và commit sau đó. Phải gửi lại với cùng mã thao tác, hoặc hỏi trạng thái, cho tới khi biết chắc (notebook 21) **[Ngoài sách]**.
- **"Bước bù cũng thất bại thì sao?"** Gửi lại tới khi thành công. Vì vậy bước bù cần mã thao tác riêng, ví dụ `tx 7f3c · refund A` ở notebook 21, để gửi lại nhiều lần mà A chỉ được cộng một lần **[Ngoài sách]**.
- **"Nếu chính bước trừ A bị từ chối (A chỉ có $0)?"** Không có gì để bù. Saga dừng, báo lỗi.
- **"Saga có giấu trạng thái dở dang không?"** Không. Giữa hai bước, ai đọc số dư sẽ thấy A = $0 và C = $0 (Table 5). Table 5 ghi TC/C cũng vậy, vì ví dụ TC/C của sách trừ thẳng A ở Try. Với mô hình giữ chỗ ở slide 8, TC/C chỉ lộ chỗ giữ: A vẫn $1 nhưng bị đóng băng, C có $1 pending **[Ngoài sách: mô hình giữ chỗ]**.

## 6. Đừng nói sai

- Đừng nói "bù là rollback" hay "xóa giao dịch". Nói: "bù là một giao dịch mới; nó không xóa lần trừ".
- Đừng nói "A xong thì tự kích hoạt C". Nói: "coordinator ghi A xong vào bảng, rồi mới gửi lệnh cho C".
- Đừng nói "Saga đơn giản vì không cần lưu trạng thái". Coordinator giữ phase status table (Figure 29).
- Đừng nói "bước 2 lỗi thì hoàn A" với nghĩa mọi kiểu lỗi. Nói: "C **từ chối** thì hoàn A; timeout thì gửi lại với cùng mã" **[Ngoài sách: phần timeout]**.
- Đừng nói "Saga làm giao dịch nguyên tử". Nói: "Saga đi cho xong hoặc bù cho hết; trạng thái giữa vẫn lộ ra".

## 7. Giải thích chi tiết

**Hai lần chạy của `tx 7f3c`, kèm bảng tiến độ.** Hình gộp hai lần chạy vào một khung: hàng trên là lần suôn sẻ, hàng dưới là lần C từ chối.

```
lần suôn sẻ (bước 1)                              A     C
  coordinator nhận tx 7f3c, tạo bản ghi           $1    $0
  DB A: A −$1, commit                             $0    $0   ($1 đang "trên đường")
  bảng: A −$1 done ✓
  DB C: C +$1, commit                             $0    $1
  bảng: C +$1 done ✓  → success

lần C từ chối (bước 2–4)
  DB A: A −$1, commit; bảng: A −$1 done ✓         $0    $0
  DB C: từ chối C +$1; bảng: C +$1 rejected
  bù C: no-op (C chưa từng được cộng)             $0    $0
  bù A: A +$1, commit (giao dịch mới)             $1    $0
  → error to client
```

Sau lần thứ hai, A đã bị ghi hai lần: `A −$1` rồi `A +$1`. Số dư cuối của A là $1, giống hệt lúc đầu. Bảng số dư chỉ giữ con số cuối, nên nhìn nó không ai biết đã có một lần trừ và một lần hoàn. Đây là manh mối cho slide 11.

**Vì sao coordinator phải ghi trước khi gửi.** Đặt một crash vào giữa hai bước. A đã bị trừ và commit. Coordinator chết trước khi gửi lệnh cho C. Nếu không có bản ghi nào, không ai biết phải cộng tiếp C hay hoàn A. A mất $1, C không nhận được gì: đúng đồng đô bị mất ở slide 6. Có bản ghi `A −$1 done`, coordinator mới đọc bảng là biết: gửi tiếp `C +$1`.

**Vì sao "từ chối" khác "timeout", bằng số** **[Ngoài sách: sách không bàn timeout của Saga]**.
1. Lệnh `C +$1` bị trễ trên mạng. Coordinator chờ quá lâu và coi là lỗi.
2. Coordinator bù. C chưa thấy lệnh cộng, nên bù cho C là no-op. A được hoàn: A = $1.
3. Lệnh trễ tới C và commit: C = $1.
4. Tổng A + C = $2. Lúc đầu tổng là $1. Hệ thống vừa **tạo ra $1**.

Đây là cùng loại lỗi "Cancel đến trước Try" của TC/C (notebook 8). Hai luật đóng lỗ này:
- Chỉ bù khi kết quả **đã biết**: C trả lời "rejected" và ghi bền câu trả lời đó.
- Sau khi bù, C **từ chối mọi `C +$1` đến muộn** của giao dịch này, giống cờ out-of-order của TC/C (notebook 8).

Notebook 21 (phần *Khi P2 không trả lời*) đi tiếp đúng chỗ này: P2 không trả lời, coordinator gửi lại với cùng mã thao tác, và chỉ bù sau khi có một lời từ chối đã lưu.

**Vì sao Saga quan trọng với phần sau.** Ở slide 20, A và C nằm ở hai partition khác nhau. Lúc đó ta dùng lại đúng Saga kiểu orchestration, kèm phase status table (slide 21). Nên Saga không phải phương án bị loại. Nó là công cụ sẽ dùng lại.

## 8. Dẫn dắt sang slide 10

- **Điều slide này để lại:** đã có ba cách đưa một giao dịch xuyên database tới kết quả đúng. Chỉ 2PC giấu được trạng thái dở dang. TC/C giữ chỗ để lộ nó dưới dạng held / pending, chưa tiêu được; Saga để lộ thật. Người nghe cần một cái nhìn so sánh.
- **Câu nối gợi ý:** "Ba cách đều đưa giao dịch tới một kết quả đúng. 2PC che trạng thái trung gian; TC/C giữ chỗ để không ai tiêu được tiền đang chuyển; Saga để lộ nó và bù khi hỏng. TC/C và Saga đều làm tiếp được sau crash nhờ phase status table. Vậy chúng khác nhau ở đâu, và khi nào chọn cái nào?"
- **Người nghe sẽ thấy ở slide 10:** một bảng so sánh ba cột, bảy hàng, có hàng *Undo* và *In-between state*. Dặn đọc **theo hàng**.
