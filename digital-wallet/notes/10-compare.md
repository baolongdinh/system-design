# Slide 10 — 2PC, TC/C and Saga side by side

> **Ý chính:** Cả ba cách đều đưa một transfer tới kết quả đúng (transactional guarantee). Chúng khác nhau ở **nơi đặt logic điều phối**, **khóa giữ bao lâu**, **hoàn tác bằng cách nào**, **thứ tự chạy**, **trạng thái giữa trông ra sao**, và **coordinator chết thì sao**. 2PC giấu trạng thái giữa trong database. TC/C biến nó thành **chỗ giữ** (held / pending, chưa ai tiêu được), nên hoàn tác chỉ là nhả chỗ giữ **[Ngoài sách: mô hình giữ chỗ]**. Saga để lộ thật: A đã bị trừ, và hoàn tác là một bước bù. Sách không chọn người thắng; tiêu chí chính là **độ trễ** và **số lượng service**.

**Phần:** Distributed transactions · **Footer:** Book: 2PC vs TC/C, Table 3; TC/C vs Saga, Table 5, p.512–519 · Added: TC/C reservations; 2PC “leans toward” · **Bước:** không có

---

## Hiểu nhanh trước khi nhìn hình

**Bảng trả lời ba câu hỏi:** ai giữ tiến độ, khóa tồn tại bao lâu, và lỗi được sửa bằng cách nào. Đọc theo từng hàng. Mỗi hàng là một câu so sánh.

**Khác biệt quan trọng nhất nằm ở trạng thái dở dang và cách hoàn tác.**
- **2PC** chưa commit gì cho tới khi mọi bên cùng đồng ý. Nó giữ khóa suốt thời gian đó. Bên ngoài không bao giờ thấy trạng thái giữa. Lỗi thì **abort** trước khi commit.
- **TC/C** commit từng bước nhỏ ngay, nhưng Try chỉ **giữ chỗ**: $1 của A bị đóng băng (held), C có $1 pending. Tổng số dư A + C vẫn $1, và không ai tiêu được $1 đang chuyển. Lỗi thì **nhả chỗ giữ**, vì chưa có gì bị trừ thật **[Ngoài sách: mô hình giữ chỗ — cách TCC thường được hiện thực]**.
- **Saga** commit từng bước và **làm thật** ngay. Giữa hai bước có lúc A = $0 và C = $0, và người khác đọc được trạng thái đó. Lỗi thì chạy một **bước bù**, tức một giao dịch ngược, vì bước trước đã commit thật.

Vì vậy đừng gọi cả ba là "atomic như nhau". Cả ba cho **transactional guarantee**: giao dịch cuối cùng xong hẳn hoặc được đưa về như cũ. Chỉ 2PC giấu được nửa giao dịch. TC/C không giấu, nhưng nửa giao dịch của nó không tiêu được.

**XA** là chuẩn để database tham gia 2PC: database phải hỗ trợ lệnh prepare.

## 1. Slide này để làm gì

Tổng kết phần Distributed transactions. Ta đã có ba cách điều phối debit và credit tới kết quả đúng. Nhưng chưa cách nào trả lời được câu hỏi: *vì sao số dư lại là con số này?* Câu hỏi đó mở ra slide 11.

## 2. Đọc bảng theo hàng (không đọc theo cột)

Bảng có ba cột (2PC, TC/C, Saga) và bảy hàng. Ba ô chữ đỏ cam là ba điểm yếu: hai của 2PC (Locks, Coordinator crash) và một của Saga (In-between state). Hàng cuối in nghiêng là gợi ý khi chọn.

| Hàng trên slide | 2PC | TC/C | Saga |
|---|---|---|---|
| **Where it lives** — logic nằm ở đâu | Database (cần prepare / XA) | Business logic của ứng dụng | Business logic của ứng dụng |
| **Locks** — khóa | Giữ từ lần ghi đầu tới hết pha 2 (chữ đỏ cam) | Chỉ trong từng local transaction | Chỉ trong từng local transaction |
| **Undo** — hoàn tác | Abort trước khi commit | Nhả các chỗ giữ | Bù: một bước ngược mới |
| **Order** — thứ tự chạy | Prepare tất cả, rồi commit tất cả | Các bên trong một pha chạy theo thứ tự bất kỳ hoặc song song | Lần lượt từng bước |
| **In-between state** — trạng thái giữa | Giấu trong database | Đang giữ: held / pending, chưa tiêu được | Lộ thật: A đã bị trừ (chữ đỏ cam) |
| **Coordinator crash** — coordinator chết | Các bên kẹt, hàng dữ liệu vẫn bị khóa (chữ đỏ cam) | Làm tiếp từ phase status | Làm tiếp từ phase status |
| **Leans toward** — nghiêng về (in nghiêng) | Ít bên tham gia, có XA **[Ngoài sách]** | Nhạy độ trễ, nhiều service | Ít service, không đòi độ trễ khắt khe |

Footer ghi hai phần thêm ngoài sách: cột TC/C theo mô hình giữ chỗ (hàng Undo và In-between state), và ô "Leans toward" của cột 2PC (*Added: TC/C reservations; 2PC “leans toward”*).

## 3. Lời dẫn gợi ý

> "Mình đề nghị đọc bảng theo hàng. Hàng đầu: 2PC sống trong database, hai cách còn lại sống trong code ứng dụng. Hàng 'Locks' là khác biệt lớn nhất: 2PC giữ khóa xuyên hai pha, hai cách kia chỉ khóa trong từng bước nhỏ. Hàng 'Undo': 2PC abort trước khi commit; TC/C nhả chỗ giữ, vì chưa có gì bị trừ thật; Saga chạy một bước bù, vì bước trước đã commit thật. Hàng 'Order': TC/C gọi các bên **trong cùng một pha** song song được; Try giữ chỗ ở cả hai bên cùng lúc cũng được, vì chưa đồng nào di chuyển; tiền chỉ thật sự đổi chỗ ở Confirm. Saga thì lần lượt: trừ A xong mới cộng C. Hàng 'In-between state': 2PC giấu trạng thái giữa trong database; TC/C để lộ nó dưới dạng chỗ giữ, không ai tiêu được; Saga để lộ thật, A đã bị trừ mà C chưa được cộng. Hàng 'Coordinator crash': 2PC kẹt và vẫn giữ khóa; TC/C và Saga đọc phase status table rồi làm tiếp. Với bài chuyển tiền chỉ có hai thao tác, sách nói chọn TC/C hay Saga đều được."

## 4. Giải thích sâu

- **Hàng "Undo" là hệ quả trực tiếp của slide 8 và 9.** 2PC chưa commit gì nên chỉ cần abort. TC/C theo mô hình giữ chỗ: Try chỉ ghi held ở A và pending ở C, nên Cancel nhả chúng ra, số dư không đổi **[Ngoài sách: mô hình giữ chỗ]**. Saga: `A −$1` đã commit thật, nên muốn quay lại phải chạy `A +$1` như một giao dịch mới (Figure 13). Trong ví dụ đơn giản của sách, Try của TC/C trừ thẳng A, nên Cancel của sách cũng là cộng trả A, giống hệt bước bù của Saga (notebook 8).
- **"Any order or parallel" chỉ nói về các bên trong cùng một pha.** Ở TC/C, các lệnh Try có thể gửi tới các database theo thứ tự bất kỳ, hoặc cùng lúc. Các lệnh Confirm cũng vậy. Giữa hai pha, thứ tự cố định: Confirm chỉ chạy sau khi mọi Try trả lời yes. Với mô hình giữ chỗ, giữ $1 ở A và ghi pending ở C cùng lúc là an toàn, vì chưa ai tiêu được gì; một bên thất bại thì Cancel nhả bên kia. Ví dụ của sách thì khác: Try đổi số dư thật, nên sách cấm cộng C trước hoặc cùng lúc với trừ A (lựa chọn 2 và 3 của Table 4, notebook 8). Saga không có pending, nên vẫn phải trừ trước, cộng sau.
- **Hàng "In-between state" và Table 5 của sách.** Table 5 (p.519) ghi cả TC/C và Saga đều có thể để lộ trạng thái dở dang. Lý do: ví dụ TC/C của sách trừ thẳng A ở Try, nên sau Try ai đọc cũng thấy A = $0, C = $0 (Fig 11). Với mô hình giữ chỗ, TC/C chỉ lộ **chỗ giữ**: A vẫn $1 nhưng $1 đó bị đóng băng, C có $1 pending. Số dư không hụt, phần tiêu được thì tạm về $0 **[Ngoài sách: sách (Table 5) ghi cả TC/C và Saga đều có thể lộ trạng thái dở dang, vì ví dụ TC/C của sách trừ thẳng A ở Try; với mô hình giữ chỗ, TC/C chỉ lộ chỗ giữ]**. Ô của Saga tô đỏ cam vì đó là trạng thái **tiêu được**: A đã thật sự mất $1.
- **Hàng "Coordinator crash" gom lại điều slide 7 và 9 đã cho thấy, cùng phần phục hồi TC/C trong notebook 8.** Ở 2PC, database đã trả lời "yes" ở pha prepare thì không tự commit hay abort được. Nó chờ trong trạng thái *in doubt* (chưa biết số phận) và giữ khóa (slide 7, notebook 7; thuật ngữ *in doubt* là phần thêm ngoài sách). Ở TC/C (Figure 10) và Saga (Figure 29), coordinator đọc phase status table rồi gửi lại phần chưa xong. Gửi lại an toàn vì mỗi bên bỏ qua mã thao tác đã áp dụng **[Ngoài sách: phần chống trùng]**. Với TC/C giữ chỗ, trong lúc coordinator chết, $1 của A bị đóng băng nhưng không mất; với Saga, A đã bị trừ và chờ được cộng tiếp hoặc bù.
- **Hai bảng của sách.** Table 3 (p.512) so 2PC với TC/C: ở 2PC, khi pha hai bắt đầu thì các local transaction **chưa xong** và còn khóa; ở TC/C chúng **đã xong** và đã nhả khóa. Table 5 (p.519) so TC/C với Saga: cả hai đều ở tầng ứng dụng, đều có coordinator (Saga ở chế độ orchestration), đều để lộ trạng thái dở dang (theo ví dụ trừ thẳng của sách); khác ở chỗ TC/C chạy song song được còn Saga thì không.
- **Vì sao Saga là "xu hướng".** Sách viết Saga là *"the de-facto standard in a microservice architecture"*, và: *"If we want to go with the trend in microservice architecture, choose Saga."*

## 5. Câu hỏi có thể gặp

- **"Vậy rốt cuộc ví chọn gì?"** Thiết kế cuối của sách dùng Saga (hoặc TC/C) để điều phối **giữa các partition**. Bên trong mỗi partition, nó dùng event sourcing (slide 20–21).
- **"2PC bị loại hoàn toàn?"** Không. Ô "Leans toward" của 2PC là diễn giải thêm, có ghi ở footer: 2PC hợp với ít bên tham gia và môi trường hỗ trợ XA.
- **"Sao sách lại ghi TC/C cũng lộ trạng thái dở dang?"** Vì ví dụ TC/C của sách trừ thẳng A ở Try (Table 5, Fig 11). Bảng trên slide theo mô hình giữ chỗ, nên ô TC/C ghi *Reserved*, và footer ghi *Added: TC/C reservations* **[Ngoài sách]**.
- **"Chỗ giữ của TC/C có phải cũng là khóa, như 2PC?"** Không **[Ngoài sách]**. Khóa của 2PC chặn mọi transaction chạm hàng của A. Chỗ giữ chỉ đóng băng đúng $1 của một transfer, là dữ liệu đã commit; các lệnh khác trên A vẫn chạy với phần khả dụng còn lại.
- **"TC/C chạy song song được, vậy gửi Try và Confirm cùng lúc cho nhanh?"** Không. Song song chỉ áp dụng trong **cùng một pha**. Confirm chỉ chạy sau khi mọi Try đã trả lời yes, vì chỉ khi đó coordinator mới biết chọn Confirm hay Cancel.
- **"Coordinator chết giữa chừng, ba cách khác nhau thế nào?"** 2PC: các database đã hứa thì kẹt, khóa vẫn giữ, mọi transfer khác chạm A phải xếp hàng. TC/C và Saga: không có khóa treo; coordinator khởi động lại (hoặc máy khác) đọc phase status table và làm tiếp. TC/C để lại một chỗ giữ chờ áp dụng hoặc nhả; Saga để lại một lần trừ chờ cộng tiếp hoặc bù.

## 6. Đừng nói sai

- Đừng biến bảng thành quy tắc kiểu "2PC cho nhất quán, TC/C cho tốc độ, Saga cho microservice". Sách không nói như vậy.
- Đừng nói "TC/C chạy theo thứ tự bất kỳ". Nói: "các bên **trong mỗi pha** chạy theo thứ tự bất kỳ hoặc song song; Confirm chỉ chạy sau khi mọi Try trả lời yes".
- Đừng nói "cả ba đều atomic". Nói: "cả ba cho transactional guarantee; chỉ 2PC giấu được trạng thái dở dang; TC/C để lộ nó dưới dạng chỗ giữ, chưa tiêu được".
- Đừng nói "Cancel của TC/C là bù, giống Saga" khi chỉ vào bảng. Trên slide, Cancel nhả chỗ giữ. Cancel cộng trả A chỉ có trong ví dụ đơn giản của sách.
- Đừng nói "theo sách, TC/C không lộ trạng thái dở dang". Table 5 của sách nói ngược lại; ô *Reserved* là phần thêm (footer Added).
- Đừng nói "Saga không cần lưu tiến độ" hay "coordinator của TC/C hay Saga chết thì kẹt như 2PC". Cả hai làm tiếp từ phase status table.

## 7. Giải thích chi tiết

**Đi qua bảng với `tx 7f3c` (A $1 → C, A = $1, C = $0 lúc đầu).**
- **2PC.** DB A ghi `A −$1`, DB C ghi `C +$1`, nhưng chưa commit; hàng của A và C bị **khóa**. Coordinator hỏi cả hai "prepare được không?", cả hai trả lời yes. Coordinator gửi commit; lúc đó thay đổi mới có hiệu lực, A = $0, C = $1, và khóa được nhả. Từ lần ghi đầu tới lúc commit, mọi transfer khác chạm A hay C phải chờ (slide 7).
- **TC/C** **[Ngoài sách: mô hình giữ chỗ]**. Try: DB A giữ $1 và commit ngay (balance $1, held $1); DB C ghi pending $1 và commit (balance $0). Hai lệnh Try chạy song song được. Confirm: A balance $1 → $0, C balance $0 → $1. Khóa chỉ tồn tại bên trong từng bước nhỏ.
- **Saga.** Bước 1: A −$1, commit. Coordinator ghi tiến độ. Bước 2: C +$1, commit. Cũng chỉ khóa trong từng bước.

**Giữa hai bước, mỗi cách trông thế nào.**
- 2PC: không ai thấy gì thay đổi; A vẫn $1, C vẫn $0, nhưng cả hai bị khóa.
- TC/C: A + C vẫn $1 trong số dư. $1 của A bị giữ, $1 của C còn pending. Ai đọc cũng thấy chỗ giữ, nhưng không ai tiêu được $1 đó.
- Saga: A = $0, C = $0. Ai đọc lúc đó sẽ thấy $1 "đang trên đường". Đây là khung giữa ở slide 3, để lộ nguyên vẹn.

**Khi lỗi:**
- 2PC hủy những gì chưa commit. Chưa có gì thay đổi thật, nên không cần bù.
- TC/C chạy pha Cancel: nhả chỗ giữ của A, bỏ pending của C nếu có. A vẫn $1, không cần giao dịch ngược.
- Saga chạy các bước bù theo thứ tự ngược: bù C, rồi cộng trả A $1 bằng một giao dịch mới.

**So với ví dụ của sách.** Trong ví dụ của sách, Try trừ thẳng A $1 và gửi NOP cho C. Khi đó TC/C trông giống Saga ở cả hai hàng: giữa hai pha A = $0, C = $0, và Cancel phải cộng trả A. Đó là lý do Table 5 của sách ghi cả hai đều lộ trạng thái dở dang (notebook 8).

**Chọn cái nào, đúng theo sách (p.519):**
- Không đòi độ trễ khắt khe, hoặc rất ít service, như bài chuyển tiền có hai thao tác: TC/C hay Saga **đều được**.
- Muốn theo xu hướng microservice: Saga.
- Nhạy độ trễ và có nhiều service hay nhiều thao tác: TC/C có thể tốt hơn, vì các bên trong một pha chạy song song được.

**Điểm chung còn thiếu.** Cả ba chỉ quan tâm **trạng thái cuối**: số dư sau giao dịch. Không cách nào được thiết kế để giữ một **lịch sử** cho phép trả lời "vì sao số dư lại như thế này". Ta có thể gắn thêm audit log cho bất kỳ cách nào. Nhưng yêu cầu thứ năm ở slide 2 (*Reproducible: rebuild any past balance by replay*) đòi một lời giải có hệ thống. Chương này chọn event sourcing cho việc đó.

**Gợi ý trình bày.** Cuối slide, hỏi người nghe: "Giả sử A khiếu nại 'tôi mất $1'. Với bất kỳ thiết kế nào trong ba cái này, các bạn trả lời bằng gì?" Câu trả lời: chỉ có con số số dư hiện tại. Đó là cầu nối sang slide 11.

## 8. Dẫn dắt sang slide 11

- **Điều slide này để lại:** transactional guarantee đã có, nhưng hệ thống không giải thích được lịch sử của chính nó. Cả ba mới lo **điều phối** trừ và cộng; chưa cách nào giữ một lịch sử bất biến để replay.
- **Câu nối gợi ý:** "Interviewer khen giải pháp này. Rồi đặt một tình huống: người dùng nhập sai một thao tác, số tiền bị sai. Làm sao truy ra nguyên nhân, và làm sao kiểm toán được mọi thay đổi?"
- **Người nghe sẽ thấy ở slide 11:** bảng số dư bị ghi đè đối diện với một danh sách event. Đây là phần Event sourcing.
