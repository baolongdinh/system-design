# Slide 8 — Attempt 2b: Try-Confirm/Cancel (TC/C)

> **Ý chính:** TC/C chia lần chuyển thành hai pha, do **ứng dụng** điều phối. Mỗi pha là một local transaction riêng, commit ngay, nên khóa database chỉ giữ rất ngắn. **Try chỉ giữ chỗ**: DB A giữ $1 (*held*), DB C ghi *pending* +$1. Chưa đồng nào di chuyển, và chưa ai tiêu được $1 đó. **Confirm** áp dụng chỗ giữ: A = $0, C = $1. **Cancel** nhả chỗ giữ: A vẫn $1, **không có gì phải hoàn**, vì chưa có gì bị trừ. **[Ngoài sách: mô hình giữ chỗ — cách TCC thường được hiện thực]** Ví dụ của sách đơn giản hơn: Try **trừ thẳng** A −$1, nên Cancel phải cộng trả A, và trông rất giống Saga (§4).

**Chặng:** 2, Distributed transactions · **Nguồn:** Book: TC/C, Fig 7–9, Table 4, p.507–514 (ví dụ ví tiền của sách: Table 2); phần phục hồi trong notebook (mục 5, 7): Fig 10–12, p.512–516 · **Footer `Added:`** held / pending reservations; the book debits A in Try · **Bước bấm:** 3

---

## Hiểu nhanh trước khi nhìn hình

**Khác 2PC ở đâu:** 2PC giữ một transaction và khóa suốt hai pha. TC/C thì không. Mỗi bước là một **local transaction**, tức transaction trong một database, commit xong là nhả khóa. Muốn mỗi bước commit ngay mà vẫn hủy được, Try **không làm thật**. Nó chỉ **giữ chỗ**. Chỗ giữ là dữ liệu đã commit trong bảng tài khoản, không phải khóa database.

**Vài từ cần biết** **[Ngoài sách: mô hình giữ chỗ — cách TCC thường được hiện thực]**:
- **held** (đang giữ): phần số dư của A bị đóng băng cho một transfer id. Nó vẫn nằm trong số dư của A, nhưng A không tiêu được. Số **khả dụng** = balance − held.
- **pending** (chờ vào): khoản sắp vào của C, ghi kèm transfer id. Nó chưa nằm trong số dư, nên C chưa tiêu được.
- **Coordinator**: vẫn là wallet service, như ở 2PC.
- **NOP** (no operation): lệnh "không làm gì". Chỉ có trong ví dụ của sách (§4), không có trên slide.

**Chạy tay với A = $1, C = $0:**
1. **Try:** DB A giữ $1: balance $1, held $1, khả dụng $0. DB C ghi pending $1: balance $0. Mỗi bên commit ngay. Chưa đồng nào di chuyển. Tổng số dư A + C vẫn **$1**.
2. **Confirm** (nếu cả hai trả lời yes): ở A, balance $1 → $0, held $1 → $0. Ở C, pending chuyển vào balance: C = $1. Tổng $1.
3. **Cancel** (nếu C trả lời no ở Try): A nhả chỗ giữ, held $1 → $0, balance vẫn $1. C chưa ghi pending nào, nên không phải làm gì. Tổng $1. Lần chuyển bị hủy, và không có gì phải hoàn.

Trạng thái sau Try vẫn **nhìn thấy được**: A có $1 bị giữ, C có $1 pending. Nhưng không ai tiêu được $1 đó. Chỉ kết quả sau Confirm hoặc Cancel mới là kết quả cuối.

## 1. Slide này để làm gì

Cho thấy cách tránh khóa dài của 2PC, và cái giá mới: **ứng dụng phải tự điều phối**. Mỗi bên cần đủ ba thao tác Try, Confirm, Cancel, thêm cột held / pending, và coordinator phải lưu tiến độ. Đổi lại, hoàn tác chỉ là **nhả chỗ giữ**.

## 2. Đọc hình

**Dòng ngữ cảnh:** *Try reserves, Confirm applies, Cancel releases. A starts at $1, C at $0.*

**Ba khung, mỗi khung hiện ở một bước.** Mỗi khung có tiêu đề, một coordinator (lục giác tím) ở trên, hai hình trụ DB A và DB C ở dưới, và một viên ở đáy. Thẻ trong mỗi DB có hai dòng: `balance` và `held` (DB A), hoặc `balance` và `pending` (DB C).

| Khung | Lệnh tới DB A | Lệnh tới DB C | Thẻ trong DB | Viên ở đáy |
|---|---|---|---|---|
| **1 · Phase 1: Try** (tiêu đề xám) | `hold $1`, mũi tên liền | `pending +$1`, mũi tên liền | A: balance `$1`, held `$1`; C: balance `$0`, pending `$1` | `$1 reserved · nothing moved yet`, viền vàng hổ phách |
| **2 · Phase 2: Confirm** (tiêu đề xanh lá) | `apply`, mũi tên xanh lá | `apply`, mũi tên xanh lá | A: balance `$1 → $0`, held `$1 → $0`; C: balance `$0 → $1`, pending `$1 → $0` (xanh lá) | `A + C = $1 ✓`, nền xanh lá |
| **3 · Phase 2: Cancel** (tiêu đề đỏ) | `release`, mũi tên đỏ nét đứt | `no-op`, mũi tên xám chấm chấm | A: balance `$1`, held `$1 → $0` (đỏ); C: balance `$0`, pending `$0`, không đổi | `nothing to undo · A $1, C $0` |

Để ý ba điều:
- **Không còn dòng `A + C = $0`.** Hết Try, số dư của A vẫn là $1. Cái tạm về $0 chỉ là phần **tiêu được**. Viên vàng ghi đúng ý đó: *$1 reserved, nothing moved yet*.
- **Mũi tên đỏ nét đứt ở khung 3 là lệnh Cancel, không phải bước bù.** Nó chỉ nhả chỗ giữ. Số dư của A không đổi, nên viên ở đáy ghi *nothing to undo*. Đối chiếu với slide 9: ở đó `A +$1` là một giao dịch bù thật.
- **Lệnh `no-op` tới C.** Cancel gửi tới mọi bên; bên nào có chỗ giữ thì nhả. Ở ca trên hình, C trả lời **no** ngay ở Try, nên C chưa ghi pending gì: balance `$0`, pending `$0`, không đổi. Nếu C đã kịp ghi pending (ví dụ Try ở C commit nhưng coordinator vẫn Cancel vì hết thời gian chờ), Cancel sẽ bỏ pending đó. **[Ngoài sách]**

**Dải bước dưới sơ đồ:**
1. Try: hold $1 on A; C gets $1 pending
2. Confirm: apply the hold and the pending $1
3. C says no → Cancel: release A's hold

**Footer:** *Book: TC/C, Fig 7–9, Table 4, p.507–514* · *Added: held / pending reservations; the book debits A in Try*; góc phải ghi phần *Distributed transactions*. Dòng Added báo hai điều: held / pending là phần thêm ngoài sách, và ví dụ của sách trừ thẳng A ở Try (§4).

## 3. Trình bày theo bước

Mặc định các bước tự chạy, cách nhau 0,6 giây. Nhấn A nếu muốn bấm từng bước.

| Bước | Hình và dải bước | Nói |
|---|---|---|
| 0 | Chưa có khung nào | "TC/C là Try-Confirm/Cancel. Nguyên tắc: **Try chỉ giữ chỗ**, Confirm mới làm thật, Cancel nhả chỗ đã giữ. Mỗi pha là một local transaction riêng, commit xong là nhả khóa database. Người điều phối là ứng dụng, không phải database." |
| 1 | Khung Try; ô 1 hiện | "Coordinator bảo DB A **giữ** một đô. Số dư của A vẫn là một đô, nhưng đô đó bị đóng băng, A không tiêu được nữa. DB C ghi **pending** cộng một đô: tiền sắp vào, C chưa tiêu được. Mỗi bên commit ngay. Chưa đồng nào thật sự di chuyển; chỉ có chỗ được giữ." |
| 2 | Khung Confirm; ô 2 hiện | "Cả hai Try thành công thì Confirm. A trừ một đô từ phần đã giữ, C chuyển một đô pending vào số dư. Confirm chỉ dùng phần đã giữ, nên không thể thất bại vì thiếu tiền. Tổng A cộng C luôn là một đô." |
| 3 | Khung Cancel; ô 3 hiện | "Nếu C trả lời no ở Try, ví dụ C là tài khoản bị cấm nhận tiền, thì Cancel **nhả chỗ giữ** của A. C không có gì pending nên không phải làm gì. Không có gì phải hoàn, vì chưa có gì bị trừ." |

Sau bước 3, nói phần **so với sách** (§4): "Ví dụ của sách đơn giản hơn: Try trừ thẳng A một đô và gửi NOP cho C. Vì vậy hết Try, tổng A cộng C tạm thời là không, và Cancel phải cộng trả A một đô. Cách đó rất giống Saga. Mô hình giữ chỗ là cách TCC thường được làm trong thực tế: tiền không biến mất, nó đang bị giữ."

Rồi hỏi khán giả: "Sao không cộng thẳng cho C ngay trong Try?" Trả lời bằng Table 4 (§4): C có thể tiêu đô đó trước khi kịp Cancel. Ghi pending, tức chưa tiêu được, giải quyết đúng chỗ này.

Nếu được hỏi "wallet service chết giữa chừng thì sao": trả lời bằng phase status table và cờ out-of-order (§5, §7). Slide không vẽ phần này.

## 4. Giải thích sâu

- **Khác biệt cốt lõi với 2PC** (Table 3 của sách). Ở 2PC, khi sang pha 2, các local transaction **chưa xong**, vẫn đang khóa; pha 2 là để commit hoặc hủy chúng. Ở TC/C, khi sang pha 2, mọi local transaction **đã xong**; pha 2 là chạy **giao dịch mới**. Với mô hình giữ chỗ, Confirm áp dụng chỗ giữ, còn Cancel nhả chỗ giữ **[Ngoài sách: mô hình giữ chỗ]**.
- **Chỗ giữ không phải khóa của 2PC** **[Ngoài sách]**. Khóa của 2PC chặn mọi transaction chạm hàng của A, suốt hai pha. Chỗ giữ chỉ đóng băng đúng $1 của transfer `7f3c`. Nó là dữ liệu đã commit, sống qua lần khởi động lại, và được nhả bằng logic ứng dụng. Trong lúc đó, các lệnh khác trên A vẫn chạy: `D→A $5` cộng được ngay, và một lệnh trừ khác được duyệt nếu phần khả dụng còn đủ.
- **Cancel nhả đúng chỗ giữ đã ghi, không phải "nhả $1" cố định.** Sách viết Cancel là *"another transaction that reverts the effect of the transaction in the Try phase"*. Với mô hình giữ chỗ, tác động của Try là chỗ giữ, nên đảo ngược nó là nhả chỗ giữ. Nếu Try trên A **chưa từng** commit, A không có chỗ giữ nào, và Cancel phía A không làm gì. Kịch bản "lệnh đến sai thứ tự" ở §7 có đúng trường hợp này.
- **Confirm không thất bại vì thiếu tiền** **[Ngoài sách]**. Confirm chỉ dùng phần đã giữ ở Try. Nó vẫn có thể gặp lỗi mạng, nên coordinator gửi lại với cùng transfer id cho tới khi xong (§5).
- **Vì sao gọi là "cấp cao" (high-level).** Phần điều phối và hoàn tác nằm trong **business logic**. Lợi: *database-agnostic*, database nào có transaction cũng dùng được, không cần XA. Hại: ứng dụng phải tự xử lý mọi phức tạp của giao dịch phân tán.

### Sách đơn giản hoá: Try trừ thẳng A

Ví dụ ví tiền của sách (Table 2, Fig 7–9) không có cột held / pending. Mỗi pha thay đổi số dư thật:

| Pha | Ví dụ của sách | Mô hình giữ chỗ trên slide |
|---|---|---|
| Try | A −$1, commit. C nhận NOP | A giữ $1 (balance $1, held $1). C ghi pending $1 |
| Sau Try | A = $0, C = $0. Tổng **$0** (Fig 11, sách gọi là *unbalanced*) | Tổng số dư vẫn **$1**; $1 bị giữ, không ai tiêu được |
| Confirm | A nhận NOP. C +$1 | A áp dụng chỗ giữ, C áp dụng pending |
| Cancel | A **+$1**, một giao dịch ngược. C nhận NOP | A nhả chỗ giữ. C bỏ pending nếu có |
| Cancel giống gì | Bước bù của Saga | Không giống bù: số dư không đổi |

Sách gọi việc Cancel đảo ngược phần đã commit là *undo*. Trong bản của sách, undo nghĩa là cộng trả A, nên TC/C của sách trông như một Saga có hai pha. Câu định nghĩa chung của sách thì nói pha đầu là *reserve resources*. Mô hình giữ chỗ làm đúng câu định nghĩa đó.

**Table 4 nhìn lại theo mô hình giữ chỗ.** Sách xét ba lựa chọn cho Try, với giả định mỗi lệnh đổi số dư thật:
1. **A −$1, C NOP**: sách nói hợp lệ, và chọn cách này. Mô hình giữ chỗ thay "trừ" bằng "giữ": tổng số dư không hụt, Cancel nhả thay vì cộng trả.
2. **A NOP, C +$1**: sách nói không hợp lệ. Nếu sau đó phải Cancel, trong lúc chờ C có thể đã tiêu $1. Đến lúc trừ lại C thì không còn gì để trừ. Pending, tức **chưa tiêu được**, giải đúng lý do này. Nhưng "A NOP" vẫn sai: A chưa bị giữ, có thể tiêu $1 trước Confirm, và Confirm sẽ thất bại vì thiếu tiền. Vì vậy mô hình giữ chỗ làm **cả hai**: giữ ở A và pending ở C.
3. **A −$1 và C +$1 cùng lúc**: sách nói không hợp lệ, vì C có thể được cộng trong khi A trừ thất bại, rất khó xử lý. Đổi thành **giữ ở A và pending ở C cùng lúc** thì an toàn. Một bên thất bại thì Cancel nhả bên kia. Chưa ai tiêu được gì, nên không có gì phải thu hồi. Đây là lý do slide 10 ghi TC/C *any order or parallel within a phase*.

Kết luận: sách chỉ chấp nhận lựa chọn 1 **vì Try của sách đổi số dư thật**. Quy tắc **trừ trước, cộng sau** của sách vẫn nguyên giá trị cho Saga (slide 9) và thiết kế cuối (slide 21). Saga không có pending: mỗi lệnh cộng là tiền tiêu được ngay.

## 5. Câu hỏi có thể gặp

- **"Sau Try, tổng có còn $1 không? Có vi phạm tính nguyên tử không?"** Tổng **số dư** A + C vẫn là $1. Nhưng tổng phần **tiêu được** tạm thời là $0: $1 của A bị giữ, $1 của C còn pending. Nếu hiểu nguyên tử là "không ai thấy trạng thái dở dang", như một transaction ACID duy nhất, thì TC/C **không có** tính chất đó: ứng dụng thấy chỗ giữ. Transactional guarantee vẫn được giữ, vì coordinator sẽ đi tiếp tới Confirm hoặc Cancel. Trong ví dụ của sách, Try trừ thẳng, nên ứng dụng thấy A = $0, C = $0 (Fig 11).
- **"Wallet service chết sau Try, trước Confirm. Khởi động lại thì sao?"** Trong lúc chờ, $1 của A vẫn bị giữ và C vẫn pending. Không ai tiêu được, nên không mất hay sinh ra đồng nào. Nhưng $1 đó bị đóng băng cho tới khi có người đi tiếp. Coordinator ghi tiến độ vào một **phase status table** (Fig 10), bằng transaction. Sách nói bảng thường nằm trong database của tài khoản bị trừ, ở đây là DB A. Mỗi lần chuyển có một dòng: Try ở mỗi database đã tới đâu, pha 2 là Confirm hay Cancel, pha 2 xong chưa. Khởi động lại thì đọc bảng và **gửi lại phần chưa xong**. Coordinator không giữ gì riêng, nên máy khác đọc bảng cũng làm tiếp được. §7 đi qua ví dụ `7f3c`.
- **"Vì sao đặt bảng ở DB A?" [Ngoài sách: diễn giải]** Sách chỉ nói *usually*. Cách hiểu hợp lý: cập nhật dòng tiến độ nằm chung local transaction với lệnh giữ chỗ ở A. Vậy "đã giữ $1 ở A" và "đã ghi nhận đã giữ" không bao giờ lệch nhau.
- **"Gửi lại có an toàn không?"** Chỉ khi mỗi database áp dụng một transfer id **tối đa một lần** **[Ngoài sách]**. Bảng ở DB A, còn Confirm commit ở cả DB A và DB C; không transaction nào bao được cả hai. Nếu C đã commit Confirm mà coordinator chết trước khi cập nhật dòng, nó sẽ gửi Confirm lần nữa. Gắn chỗ giữ với transfer id thì Confirm lần hai không tìm thấy pending nào còn mở cho `7f3c`, và bỏ qua. Nếu Confirm chỉ là "cộng $1 vào C", không chống trùng, thì C = $2. Đây là quy tắc của slide 5. Try không có phản hồi cũng vậy: gửi lại với cùng transfer id, hoặc hết thời gian chờ thì chuyển sang Cancel.
- **"Lệnh Cancel tới trước lệnh Try thì sao?"** (Fig 12) Database nhận Cancel, ví dụ DB C, chưa có pending nào để bỏ. Nó ghi một **cờ out-of-order**: đã thấy Cancel, chưa thấy Try. Try đến muộn kiểm tra cờ, có cờ thì trả về thất bại và không ghi pending. Cờ nằm ở chính DB C, nên Try kiểm tra được ngay trong local transaction của DB C **[Ngoài sách: chi tiết kiểm tra]**. Kịch bản đầy đủ ở §7.
- **"Giữ chỗ có phải cũng là khóa, như 2PC?"** Không. Xem §4: khóa database của TC/C chỉ nằm trong từng local transaction. Chỗ giữ là dữ liệu nghiệp vụ, chỉ đóng băng đúng số tiền của một transfer **[Ngoài sách]**.
- **"Nếu chính Try trên A thất bại thì Cancel có nhả gì ở A không?"** Không. A thiếu tiền nên Try không ghi chỗ giữ nào. Cancel phía A không có gì để nhả. Kịch bản "lệnh đến sai thứ tự" ở §7 đi qua đúng trường hợp này.
- **"Sách định nghĩa pha đầu là 'reserve resources'. Sao ví dụ của sách lại trừ thẳng?"** Sách đơn giản hoá cho dễ theo dõi: không thêm cột held / pending. Slide làm theo câu định nghĩa, và ghi rõ ở footer: *Added: held / pending reservations; the book debits A in Try*.
- **"Vậy TC/C của sách khác Saga ở đâu?"** Theo Table 5 của sách: TC/C gọi các bên **trong một pha** song song được, Saga thì tuần tự. Phần hoàn tác thì gần như giống nhau, vì cả hai cộng trả A. Với mô hình giữ chỗ, khác biệt rõ hơn: Cancel chỉ nhả chỗ giữ, và trạng thái giữa không tiêu được (slide 10).
- **"NOP để làm gì?"** NOP chỉ có trong ví dụ của sách: mọi bên đều nhận một lệnh trong mỗi pha và trả lời. Trong mô hình giữ chỗ, C nhận pending thay cho NOP. Try trên C cũng là bước kiểm tra: C có được phép nhận tiền không. Đó chính là chỗ có thể sinh ra câu trả lời "no".
- **"TC/C và TCC có phải là một?"** Cùng một ý, Try-Confirm-Cancel **[Ngoài sách: tên gọi phổ biến]**.

## 6. Đừng nói sai

- Đừng nói "Try trừ A" khi chỉ vào slide. Try chỉ **giữ chỗ**: số dư của A vẫn $1, chỉ bị đóng băng. Trừ thẳng là ví dụ đơn giản của sách. Nếu nhắc tới, nói rõ "sách đơn giản hoá".
- Đừng nói "Cancel cộng trả" hay "Cancel hoàn tiền cho A". Nói: "Cancel nhả chỗ giữ; chưa có gì bị trừ nên không có gì để hoàn".
- Đừng nói "Cancel luôn nhả $1". Nói: "Cancel nhả đúng chỗ giữ mà Try đã ghi; Try chưa ghi gì thì Cancel không làm gì".
- Đừng nói "sau Try, A + C = $0" khi nói về slide. Nói: "tổng số dư vẫn $1; $1 đang bị giữ, coordinator còn nợ một Confirm hoặc một Cancel".
- Đừng nói "pending của C là tiền của C". C chưa tiêu được cho tới Confirm.
- Đừng nói "giữ chỗ là nội dung sách". Sách định nghĩa pha đầu là *reserve resources*, nhưng held / pending là phần thêm (footer Added).
- Đừng nói "Cancel là rollback". Đó là một transaction mới. Lịch sử của A có cả lần giữ lẫn lần nhả.

## 7. Giải thích chi tiết

**Đổi chỗ đặt logic.** Ở 2PC, database giữ transaction mở suốt hai pha. Ở TC/C, **ứng dụng** điều phối, và chia lần chuyển thành các **local transaction độc lập**. Mỗi local transaction commit ngay và nhả khóa ngay. Không còn thanh khóa dài như slide 7. Thứ còn "giữ" qua hai pha là **chỗ giữ** trong dữ liệu, không phải khóa **[Ngoài sách: mô hình giữ chỗ]**.

**Đi qua ba khung với A = $1, C = $0.**
- **Try.** Ở DB A, kiểm tra khả dụng đủ $1, ghi held $1, commit luôn: balance $1, held $1, khả dụng $0. Ở DB C, kiểm tra C được nhận tiền, ghi pending $1, commit: balance $0. Tổng số dư vẫn $1. Khung giữa của slide 3 hiện ra dưới dạng **chỗ giữ**: ai đọc cũng thấy, nhưng không ai tiêu được. Coordinator biết mình đang ở đâu, và biết còn nợ một bước.
- **Confirm** (cả hai đã trả lời yes). Ở A: balance $1 → $0, held $1 → $0. Ở C: pending $1 vào balance, C = $1. Mỗi bên một local transaction mới. Tổng $1.
- **Cancel** (C trả lời no, ví dụ C là tài khoản bị cơ quan quản lý cấm nhận tiền). Ở A: nhả chỗ giữ, held $1 → $0, balance vẫn $1. C chưa ghi pending, nên không có gì để bỏ. Tổng $1. Lần chuyển bị hủy, không cần giao dịch ngược nào.

**Cancel có điều kiện.** Hãy nói rõ: Cancel không phải "nhả $1 cho A". Cancel là "nhả mọi chỗ giữ mà Try của transfer này đã ghi". Ở đây Try trên A đã giữ $1, nên Cancel nhả $1 đó. Nếu Try trên A **thất bại**, A không có chỗ giữ, thì Cancel phía A không làm gì. Phía C cũng vậy: có pending thì bỏ, không có thì thôi (ca trên hình: `no-op`).

**Vì sao C nhận pending, không nhận tiền thật.** Thử cộng thẳng C trong Try. Sau Try, C = $1 trong khi A vẫn $1. Người giữ C tiêu ngay $1 đó. Rồi Try phía A thất bại, phải Cancel phía C: trừ C $1. Nhưng C đã $0. Không còn gì để trừ. Tiền đã bị tạo ra từ hư không. Đây là lập luận của sách chống lựa chọn 2 (Table 4). Với pending, C thấy $1 sắp vào nhưng không tiêu được, và Cancel chỉ việc bỏ pending. Phía A cũng phải **giữ**, không phải NOP: nếu không, A có thể tiêu $1 trước Confirm.

**Cái giá mới.** Ưu điểm: bất kỳ database nào có transaction cũng dùng được. Nhược điểm: toàn bộ sự phức tạp của giao dịch phân tán giờ là **code của ứng dụng**: ba thao tác cho mỗi bên, cột held / pending, mọi lệnh trừ phải kiểm tra phần khả dụng chứ không chỉ số dư, theo dõi tiến độ, xử lý lỗi mạng. Câu hỏi tự nhiên: nếu chính ứng dụng chết giữa chừng, sau Try và trước Confirm, thì sao?

**Lời đáp: phase status table (Fig 10).** Coordinator ghi tiến độ của mỗi lần chuyển vào một bảng, bằng transaction, **trước** khi gửi bước tiếp theo. Sách nói bảng thường nằm trong database của tài khoản bị trừ, ở đây là DB A. Dòng của `7f3c`, ngay trước khi Confirm bắt đầu:

| Trường | Giá trị | Nghĩa |
|---|---|---|
| Transfer | `7f3c · A → C, $1` | Mã và nội dung lần chuyển |
| Try, DB A | response received: yes | Sách có ba mức: *not sent yet*, *has been sent*, *response received* |
| Try, DB C | response received: yes | Cả hai đã trả lời yes, nên mới chọn được Confirm |
| Second phase | Confirm | Tính ra từ kết quả Try |
| Its status | not started | Pha 2 chưa chạy |
| Out-of-order flag | — | `7f3c` không có lệnh nào đến sai thứ tự |

**Phục hồi sau khi coordinator khởi động lại, với `7f3c`.**
1. Try giữ $1 ở A: balance $1, held $1. Dòng ghi *Try, DB A: yes*.
2. C ghi pending $1 và trả lời yes. Dòng ghi *Try, DB C: yes*, *Second phase: Confirm*, *not started*. Đây là đúng dòng trong bảng trên.
3. Wallet service chết ở đây. A: balance $1, held $1. C: balance $0, pending $1. Không ai tiêu được $1 đó.
4. Một bản wallet service khác khởi động và đọc dòng. Thấy Confirm chưa chạy, nó gửi Confirm kèm id `7f3c` tới cả DB A và DB C.
5. A = $0, C = $1. Dòng cập nhật thành Confirm đã xong. Tổng vẫn $1.

Nếu Confirm ở C thật ra đã commit trước khi chết, DB C thấy pending của `7f3c` đã được áp dụng và bỏ qua. C vẫn $1, không thành $2 **[Ngoài sách: chống trùng theo transfer id]**. Cần điều này vì bảng nằm ở DB A còn Confirm commit ở DB C: không transaction nào bao được cả hai.

**Hệ quả 1: chỗ giữ thay cho khoảng hụt (Fig 11).** Trong ví dụ của sách, Try trừ thẳng, nên theo thời gian A + C đi từ $1 (trước Try) xuống $0 (sau Try) rồi về $1 (sau Confirm). Sách gọi khoảng giữa là trạng thái *unbalanced*, và kết luận rằng giao dịch phân tán lúc chạy luôn có lúc dữ liệu lệch như vậy. Ở 2PC, tầng database giấu nó đi; ở TC/C, ứng dụng thấy và tự xử lý. Mô hình giữ chỗ không xóa được "lúc lệch" đó. Nó **đặt tên** cho nó: số dư A + C vẫn $1, và $1 đang chuyển nằm ở cột held của A, gắn nhãn `7f3c`. Phần tiêu được thì vẫn tạm về $0 **[Ngoài sách: mô hình giữ chỗ]**. Đó không phải mất tiền, và không vi phạm transactional guarantee: lần chuyển chưa kết thúc, coordinator còn nợ một Confirm hoặc một Cancel.

**Hệ quả 2: lệnh đến sai thứ tự (Fig 12).** Đây là **một lần chuyển A → C khác**, không phải `7f3c`:
1. Coordinator gửi Try cho A và cho C. Try tới A thất bại, ví dụ A không đủ khả dụng. A không bị giữ gì, vẫn $1.
2. Coordinator nhận "no", chuyển sang Cancel, gửi Cancel cho cả A và C. Phía A không có chỗ giữ nào để nhả.
3. Lệnh Try gửi cho C bị kẹt trên mạng. Lệnh Cancel tới C **trước**. C chưa thấy Try nào, không có pending để bỏ. Nó ghi một **cờ out-of-order**: "đã thấy Cancel, chưa thấy Try".
4. Try đến muộn. C kiểm tra cờ, thấy cờ, nên **từ chối** và không ghi pending. C vẫn $0, không có gì treo.

Không có cờ, C sẽ chạy Try muộn đó và ghi pending $1, trong khi coordinator đã xong việc và không ai gửi Confirm hay Cancel nữa. Pending đó treo mãi. Tệ hơn nếu Try muộn rơi vào A: $1 của A bị giữ mãi, không ai nhả. Trong ví dụ của sách, Try muộn ở A còn tệ hơn nữa: nó trừ thật A, và không ai cộng trả **[Ngoài sách: suy luận]**. Luật của sách: mỗi node được phép Cancel khi chưa nhận Try, và Try luôn kiểm tra cờ; đây là lý do bảng có trường out-of-order flag. Cờ nằm ở DB C, database đã nhận Cancel, và Try muộn kiểm tra nó ngay trong local transaction của DB C **[Ngoài sách: chi tiết kiểm tra]**. Nếu cờ nằm ở DB A, C phải đọc chéo sang database khác, và lần đọc đó không nguyên tử với Try.

**Quy tắc chung rút ra.** Coordinator ghi quyết định trước khi hành động. Gửi lại chỉ an toàn vì bên nhận chống trùng theo mã thao tác. Hai ý này đi theo ta tới Saga (slide 9) và Saga qua hai partition (slide 21; nhánh P2 không trả lời ở notebook 21).

## 8. Dẫn dắt sang slide 9

- **Điều slide này để lại:** TC/C đúng nhưng nhiều việc: ba thao tác cho mỗi bên (Try, Confirm, Cancel), thêm cột giữ chỗ, lưu tiến độ trong phase status table, xử lý lệnh đến sai thứ tự (§7).
- **Câu nối gợi ý:** "TC/C đúng, nhưng nhiều việc: ba thao tác cho mỗi bên, thêm cột giữ chỗ, lưu tiến độ, xử lý lệnh đến sai thứ tự. Saga đơn giản hơn: chạy từng bước theo thứ tự, hỏng thì bù."
- **Khán giả sẽ thấy ở slide 9:** headline *Attempt 2c: Saga*, dòng ngữ cảnh *Steps run in a fixed order; a failure is undone in reverse.* Bên trái là *Saga coordinator* nối với *phase status table*, và chuỗi `start → A −$1 → C +$1 → success`. Rồi DB C từ chối `C +$1`, các bước bù chạy theo thứ tự ngược: *Compensate C* trước, rồi *Compensate A* (`A +$1`), và client nhận lỗi. Bên phải là khung *Coordination models*: orchestration và choreography. Chỗ cần nhấn: Saga **không có chỗ giữ**, nên `A −$1` là trừ thật, và `A +$1` là một giao dịch bù thật.
