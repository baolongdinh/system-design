# Slide 3 — The rule every design must keep

> **Ý chính:** Chuyển $1 từ A sang C thực chất là **hai cập nhật**: `A −$1` và `C +$1`. Hai cập nhật đó phải hành xử như một. Giữa chúng luôn có một khoảnh khắc A đã bị trừ mà C chưa được cộng. Mọi thiết kế phía sau sẽ được đánh giá ở cách nó xử lý khoảnh khắc đó.

**Chặng:** 0, Scope · **Nguồn:** Book: In-memory sharding p.503; Unbalanced balance p.513 · Added: the in-flight frame · **Bước bấm:** 3

---

## Hiểu nhanh trước khi nhìn hình

**Điểm xuất phát:** A có $1, C có $0. Tổng A + C = $1.

**Khoảnh khắc ở giữa:** Máy tính làm hai cập nhật lần lượt, không làm "cùng một lúc". Nếu trừ A trước thì ngay sau đó A = $0 mà C vẫn $0. Tổng chỉ còn $0. Một đô "đang bay" (in flight). Slide gọi khoảnh khắc này là **khung giữa** (In between).

**Điều phải bảo đảm:** Từ khung giữa chỉ có hai lối ra:
- **đi tiếp cho xong**: cộng C, được A = $0, C = $1;
- **hoàn tác**: trả $1 cho A, được A = $1, C = $0.

Điều không được phép là **dừng lại ở giữa**, rồi coi A = $0, C = $0 là kết quả.

**Hai từ cần nhớ:**
- **Atomic** (nguyên tử): nhìn từ phía nghiệp vụ, hai cập nhật hoặc cùng có hiệu lực, hoặc cùng không.
- **Conserved** (bảo toàn): khi lần chuyển kết thúc, A + C vẫn bằng $1 như lúc đầu.

## 1. Slide này để làm gì

Cho khán giả **một thước đo duy nhất** để so mọi thiết kế: *thiết kế này làm gì với khung giữa?*

## 2. Đọc hình

**Dòng ngữ cảnh:** *A→C $1 is two updates, `A −$1` and `C +$1`. They must act as one.*

**Ba khung, từ trái sang phải.** Mỗi khung có hai thẻ tài khoản (A và C) và một dòng tổng ở đáy:

| Khung | A | C | Dòng tổng | Nhìn thế nào |
|---|---|---|---|---|
| **Before** | $1 | $0 | `A + C = $1` | Viền xanh đậm, luôn hiện |
| **In between** | $0 | $0 | `A + C = $0` | Viền đỏ nét đứt, nhãn `$1 in flight` ở góc trên, số $0 của A tô đỏ |
| **After** | $0 | $1 | `A + C = $1` | Viền xanh lá, dấu ✓ ở góc trên, số $1 của C tô xanh lá |

**Hai mũi tên nối các khung:**
- Before → In between: nhãn `debit A −$1`, huy hiệu 1.
- In between → After: nhãn `credit C +$1`, huy hiệu 2.

**Hai nhánh cong dưới khung giữa** (bước 3):
- nhánh **đỏ nét đứt** cong sang trái, về phía Before: `undo it: refund A +$1`;
- nhánh **xanh lá nét liền** cong sang phải, về phía After: `finish it: credit C`.

**Dải bước dưới sơ đồ:**
1. `A −$1` first: $1 is in flight
2. `C +$1`: the sum is back to $1
3. From the middle: finish or undo, never stop

**Footer:** *Book: In-memory sharding p.503; Unbalanced balance p.513* và *Added: the in-flight frame*. Chữ "Added" báo rằng cách đóng khung "khung giữa" là của bộ slide **[Ngoài sách]**. Quy tắc kế toán "tổng không đổi" là của sách.

## 3. Trình bày theo bước

Mặc định các bước tự chạy, cách nhau 0,6 giây. Nhấn A nếu muốn bấm từng bước và nói theo từng ô.

| Bước | Hình và dải bước | Nói |
|---|---|---|
| 0 | Chỉ khung Before | "A có một đô, C không có gì. Tổng là một đô." |
| 1 | Mũi tên `debit A −$1` và khung In between; ô 1 hiện | "Cập nhật đầu tiên là trừ A. Ngay sau đó A còn 0, C cũng vẫn 0. Tổng bằng **không**. Một đô đang bay giữa đường. Mình gọi đây là khung giữa." |
| 2 | Mũi tên `credit C +$1` và khung After; ô 2 hiện | "Cập nhật thứ hai là cộng cho C. C có một đô, tổng quay về một đô. Đây là đích đến." |
| 3 | Hai nhánh `undo it` và `finish it` dưới khung giữa; ô 3 hiện | "Từ khung giữa chỉ có hai lối ra: đi tiếp cho xong, hoặc hoàn tác. Điều duy nhất không được phép là **dừng lại ở giữa**." |

Sau bước 3, nói ba ý cần nhớ (slide không ghi, nên phải nói):
- **Atomic:** hai cập nhật hoặc cùng có hiệu lực, hoặc cùng không.
- **Conserved:** sau khi chuyển xong, A + C bằng trước khi chuyển. Sách gọi đây là quy tắc cơ bản của kế toán.
- **Khung giữa là có thật:** khi A và C nằm trên hai máy khác nhau, không có cơ chế nào tự động giấu nó đi.

## 4. Giải thích sâu

- **Câu của sách.** Phần TC/C (p.513) nhắc *"a fundamental rule of accounting that the sum should remain the same after a transaction"*. Từ "after" quan trọng: quy tắc nói về **lúc kết thúc**, không nói về từng micro giây ở giữa.
- **Một database đơn lẻ cũng có khung giữa, nhưng giấu nó đi.** Database dùng transaction và khóa (lock). Không ai đọc được trạng thái dở dang. Nếu máy chết giữa chừng, database tự rollback, tức tự hủy phần chưa xong.
- **Hai máy thì không giấu được.** Khi A ở máy 1, C ở máy 2, một transaction cục bộ (local transaction, tức transaction trong một database) không bao trọn được cả hai. Cần thêm cơ chế:
  - hoặc **che** khung giữa, như 2PC;
  - hoặc **theo dõi và xử lý** nó, như TC/C và Saga.
- **Báo trước để khán giả nhận ra khi gặp lại:**
  - Redis (slide 6) **kẹt lại** ở khung giữa khi service chết.
  - 2PC (slide 7) **khóa** để không ai thấy khung giữa.
  - TC/C (slide 8) biến khung giữa thành **chỗ giữ**: $1 của A bị đóng băng, C có $1 pending, chưa ai tiêu được. Tổng số dư không hụt; lùi lại chỉ là nhả chỗ giữ **[Ngoài sách: mô hình giữ chỗ]**. Ví dụ đơn giản của sách trừ thẳng A ở Try, nên để lộ đúng khung giữa A = $0, C = $0 (notebook 8).
  - Saga (slide 9) **để lộ** khung giữa thật, đi từng bước theo thứ tự, và lùi lại bằng một bước bù.
  - Thiết kế cuối (slide 21) dùng Saga qua hai partition. Coordinator ghi mỗi bước xuống trước khi gửi bước tiếp theo, nên không bao giờ "quên" mình đang ở khung giữa.

## 5. Câu hỏi có thể gặp

- **"Sao không cộng C trước rồi mới trừ A?"** Nếu C nhận tiền trước, người giữ C có thể tiêu ngay khoản đó. Đến lúc cần hoàn tác thì không thu lại được. Đây là lập luận "choice 2 không hợp lệ" của sách (Table 4, notebook 8). Slide 8 né chỗ này bằng **pending**: C thấy $1 sắp vào nhưng chưa tiêu được **[Ngoài sách: mô hình giữ chỗ]**.
- **"Làm cả hai cùng lúc được không?"** Sách gọi đó là choice 3. Nó rất khó xử lý khi một bên thành công còn một bên thất bại (Table 4, notebook 8). Nếu cả hai chỉ là giữ chỗ, giữ ở A và pending ở C, thì làm cùng lúc được, vì chưa ai tiêu được gì **[Ngoài sách: mô hình giữ chỗ]**.
- **"Tổng $0 ở khung giữa có phải là mất tiền không?"** Chưa. Đó là một lần chuyển **chưa xong**. Mất tiền thật là khi hệ thống dừng ở đó và không ai đi tiếp hay hoàn tác. Slide 6 cho thấy đúng chuyện đó.

## 6. Đừng nói sai / phần ngoài sách

- **[Ngoài sách]** Cách đóng khung "khung giữa, finish or undo" là diễn giải của bộ slide. Vì vậy footer ghi *Added: the in-flight frame*. Bản thân quy tắc kế toán (tổng không đổi) là nội dung sách.
- Đừng nói "hai cập nhật xảy ra cùng một thời điểm". Chúng luôn xảy ra lần lượt. "Atomic" nói về **kết quả nhìn thấy được**, không nói về thời điểm vật lý.

## 7. Giải thích chi tiết

**Một lần chuyển tiền là hai cập nhật.** Về mặt dữ liệu, "chuyển $1 từ A sang C" là hai thao tác riêng:
- `A = A − 1`, tức A từ $1 xuống $0;
- `C = C + 1`, tức C từ $0 lên $1.

Luôn có một thao tác xảy ra trước.

**Khung giữa là gì.** Giả sử trừ A trước. Trong một khoảng thời gian, dù rất ngắn, A = $0 và C = $0. Tổng tiền là $0. Một đô đang bay. Đây không phải lỗi. Đây là bản chất của việc làm hai thao tác lần lượt. Câu hỏi thật chỉ là: **khung giữa được xử lý thế nào?**

**Hai lối ra hợp lệ, một lối cấm.**
- Đi tiếp: cộng C. Kết quả A = $0, C = $1, tổng $1. Lần chuyển thành công.
- Lùi lại: trả $1 cho A. Kết quả A = $1, C = $0, tổng $1. Lần chuyển coi như chưa xảy ra.
- Cấm: đứng yên ở A = $0, C = $0. Tổng $0. Một đô biến mất.

Hai lối ra hợp lệ đều giữ tổng bằng $1. Đó chính là "conserved".

**Vì sao trên một máy thì dễ, trên hai máy thì khó.** Trên một database, transaction và khóa **giấu** khung giữa giùm ta. Không ai đọc được trạng thái dở dang. Máy chết giữa chừng thì database tự rollback. Khi A ở máy 1 còn C ở máy 2, không có transaction nào bao trọn cả hai. Ta phải tự lo.

**Vì sao trừ trước, cộng sau.** Nếu cộng C trước, khung giữa sẽ là A = $1, C = $1: tổng $2, tức tiền bị **tự sinh ra**. Tệ hơn, người giữ C có thể tiêu $1 đó ngay. Trừ A trước thì khung giữa là "thiếu" chứ không "thừa", và việc hoàn tác chỉ là trả lại cho A. Sách dùng đúng lập luận này cho TC/C (Table 4) và Saga. Slide 8 đi thêm một bước: Try không trừ cũng không cộng thật, chỉ giữ chỗ, nên khung giữa không "thiếu" mà cũng không "thừa" **[Ngoài sách: mô hình giữ chỗ]**.

**Dùng slide này như một cây thước.** Mỗi thiết kế sau sẽ bị hỏi lại: *bạn làm gì với khung giữa?*
- Redis: bị kẹt ở đó.
- 2PC: khóa lại cho không ai thấy.
- TC/C: giữ chỗ thay vì làm thật, nên khung giữa hiện ra dưới dạng held / pending, chưa ai tiêu được; lùi lại là nhả chỗ giữ **[Ngoài sách: mô hình giữ chỗ; ví dụ của sách trừ thẳng A ở Try]**.
- Saga: để lộ ra thật, nhưng biết đi tiếp hoặc bù.
- Thiết kế cuối: Saga qua hai partition, ghi tiến độ của từng bước vào một bảng trạng thái (phase status table) trước khi gửi bước tiếp theo.

## 8. Dẫn dắt sang slide 4

- **Điều slide này để lại:** đã có quy tắc đúng, nhưng chưa biết hệ thống phải lớn tới đâu. Vì vậy chưa biết khung giữa sẽ xuất hiện "giữa các máy" thường xuyên cỡ nào.
- **Câu nối gợi ý:** "Giữ quy tắc này trong đầu. Giờ mình tính quy mô: một triệu giao dịch mỗi giây thì cần bao nhiêu máy, và vì sao con số đó quan trọng với thiết kế."
- **Khán giả sẽ thấy ở slide 4:** phép tính `1,000,000 × 2 = 2,000,000` ở trên cùng, và ba hàng biểu tượng rack cho ba mức TPS mỗi node.
