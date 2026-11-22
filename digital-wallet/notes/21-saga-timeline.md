# Slide 21 — Saga: one transfer across P1 and P2

> **Ý chính:** Slide đi lại tx 7f3c **từ đầu**, lần này qua cả hai partition. **Saga coordinator** giữ thứ tự **giữa** hai partition. Việc đầu tiên nó làm là **ghi** tx 7f3c vào **phase status table**, trước khi gửi bất cứ lệnh nào. Bảng này **bền**, và mỗi phase được ghi **trước** lần gửi kế tiếp. Coordinator gửi `A −$1` tới P1 rồi **giữ lời gọi và chờ**. Bên trong P1 là đúng slide 18, chỉ cho nửa trừ: validate, e43, Raft commit, apply. Read path của P1 (phía đọc của CQRS, slide 15) ghi status rồi **đẩy** về coordinator qua reverse proxy của P1 (Figure 29, bước 5–6); không ai phải hỏi lại. Coordinator nhận **P1 success**, ghi `P1 done`. Nhưng **P1 success chưa phải giao dịch xong**: C vẫn $0. **Chỉ khi đó** nó mới gửi `C +$1` tới P2. Nhận P2 success, ghi `P2 done`, ghi `tx done`, rồi trả kết quả cho client. Giữa hai nửa có một trạng thái trung gian thật: **A $0 · C $0**, một đô **đang chuyển**. Và C có $1 **ngay khi e88 được apply**, trước khi Saga đóng giao dịch. Saga **theo dõi** các trạng thái đó; nó **không atomic** và không cô lập.

**Chặng:** 6 · Scale out + Saga · **Nguồn (footer `Book:`):** Distributed event sourcing, Fig 29 steps 1–15, p.542–545; Saga, Figure 13 (p.517–519); phase status table của TC/C, Figure 10 (p.512–516) · **Thêm vào slide:** lần ghi `tx done` riêng và dải số dư trung gian là diễn giải triển khai; Figure 29 chỉ nêu ba lần ghi bảng (tạo tx, P1 success, P2 success), rồi trả kết quả · **Bước bấm:** 4 (tự chạy, 0,6 giây mỗi bước; nhấn A để bấm từng bước) · Nhánh lỗi ở mục 7 (*Khi P2 không trả lời*) là **[Ngoài sách]**; trước đây nó là một slide riêng, đã bỏ ở bản này.

---

## Hiểu nhanh trước khi nhìn hình

**Hai từ cần định nghĩa.**
- **Saga coordinator:** dịch vụ điều phối một giao dịch gồm nhiều bước, chạy lần lượt từng bước. Nếu một bước hỏng, nó chạy các bước bù theo thứ tự ngược (slide 9; với hai partition, xem mục 7, phần *Khi P2 không trả lời*).
- **Phase status table:** bảng bền ghi giao dịch đang ở bước nào. Đây là trí nhớ của coordinator. Nếu coordinator khởi động lại, nó đọc bảng để biết phải làm gì tiếp (sách giới thiệu bảng ở TC/C, Fig 10; xem notebook 8).

**Đồng hồ quay về đầu giao dịch.** Slide 18 kết thúc với A $0, C $1 (sau commit, mọi máy apply), khi cả hệ thống còn là một Raft group. Slide 20 chia nhóm đó thành các partition và chụp lại lúc **trước** giao dịch. Lede của slide này nói rõ: tx 7f3c **từ đầu**, giờ qua hai partition. Ta bắt đầu lại từ `A $1 · C $0`. Đây không phải tx 7f3c chạy lần hai.

**Bốn bước, gói 15 bước của sách.** Figure 29 của sách có 15 bước. Slide gom chúng thành bốn bước bấm. Bên trong mũi tên `P1 success` là toàn bộ slide 18, chỉ cho nửa trừ (command file, validate, e43, Raft commit, apply), cộng với read path ghi status và đẩy về coordinator. Bên trong `P2 success` là cùng mẫu đó với e88. Bảng đối chiếu đủ 15 bước nằm ở mục 7; đó là nội dung của slide "Figure 29, all 15 steps" trong bản 2 (đã bỏ ở bản 4).

**Bên trong mỗi partition vẫn là slide 18; ai chờ kết quả thì mới ở đây.** Bên gọi P1 là **Saga coordinator**. Nó gửi `A −$1` vào P1 qua reverse proxy ở cửa P1, rồi **giữ lời gọi và chờ**. Bên trong P1 vẫn chạy bất đồng bộ như slide 18: validate, e43, Raft commit, apply. Sau commit, read path của P1, đúng phía đọc của CQRS ở slide 15, dựng state và status `tx 7f3c · debit A: done` (Figure 29, bước 5), rồi **đẩy** status đó về coordinator qua **reverse proxy của P1**; proxy trả lời trên chính lời gọi đang chờ (bước 6). Coordinator không phải hỏi đi hỏi lại (**không poll**). Với nó, gửi `A −$1` là một lời gọi đồng bộ: gửi, chờ, nhận P1 success. Đó đúng là điều kiện sách đặt ra trước khi dùng lại TC/C hay Saga: *"once synchronous execution is adopted for every Event Sourcing node group"* (p.542).

**P1 success chưa phải giao dịch xong.** Status P1 đẩy về chỉ nói nửa trừ đã xong: `tx 7f3c · debit A: done`. Lúc đó A $0, nhưng C vẫn $0. Giao dịch chỉ xong khi coordinator ghi `tx done` và trả lời client.

**Đọc dải số dư dưới các làn:** `A $1 · C $0` (trước) → `A $0 · C $0` (một đô đang chuyển) → `A $0 · C $1` (P2 đã commit, Saga chưa đóng) → `A $0 · C $1 · done ✓` (xong). Hai khúc giữa không phải lỗi. Đó là cái giá của việc chia tài khoản ra hai nhóm, và là lý do phải có phase status table.

## 1. Slide này để làm gì

Trả lời câu hỏi slide 20 để lại: **ai bảo đảm trừ A trước khi cộng C**. Đây là lúc hai chặng gặp nhau: Saga của chặng 2 điều phối các Raft group của chặng 5.

## 2. Đọc hình

- Headline `Saga: one transfer across P1 and P2`. Lede: *`tx 7f3c` from the start, now across two partitions.*
- **Ba làn ngang**, thời gian chạy từ trái sang phải (mũi tên `time` ở góc dưới phải):
  - `Saga coordinator` (header tím, biểu tượng lục giác). Bên trong là `phase status table` với ba dòng `tx 7f3c`, `debit A`, `credit C`.
  - `P1 · holds A`, `Raft group 1`.
  - `P2 · holds C`, `Raft group 2`.
- **Dải số dư** dưới các làn: nhãn `Balances across time`, ô đầu `A: $1 · C: $0` (`initial balances`).

Diễn biến:
1. Chấm tím `record tx 7f3c` trên làn coordinator. Bảng ghi `created` / `pending` / `pending`.
2. Mũi tên `debit A −$1` xuống làn P1, tới thẻ `A −$1 · tx 7f3c`, nhãn xanh `e43 committed ✓`. Mũi tên nét đứt `P1 success` đi lên. Chấm `mark P1 done`. Bảng ghi `P1 done ✓`. Dải số dư thêm ô viền nét đứt tím `A: $0 · C: $0` (`$1 in flight`).
3. Mũi tên `credit C +$1` xuống làn P2, tới thẻ `C +$1 · tx 7f3c`, nhãn `e88 committed ✓`. Mũi tên nét đứt `P2 success` đi lên. Bảng ghi `P2 done ✓`. Dải số dư thêm ô `A: $0 · C: $1` (`P2 committed · pending close`).
4. Chấm `mark done`, mũi tên `reply` tới biểu tượng `Client`. Bảng ghi `tx done ✓`. Ô cuối của dải số dư đổi thành ô xanh `A: $0 · C: $1 · done ✓` (`transfer complete`).

Dải bước dưới hình: (1) `Record tx 7f3c in phase status first` · (2) `Debit A in P1 → record P1 done` · (3) `Then credit C in P2 → record P2 done` · (4) `Record done; reply A $0, C $1`.

## 3. Trình bày theo bước

| Bước | Trên màn hình | Nói |
|---|---|---|
| 1 | `record tx 7f3c`, `created`, ô bước 1 | "Ta đi lại tx 7f3c từ đầu, lần này qua cả hai partition: A một đô, C không. Client gửi giao dịch cho Saga coordinator. Việc đầu tiên coordinator làm là ghi một dòng vào phase status table, trước khi gửi bất cứ lệnh nào. Bảng này bền, và mỗi phase được ghi trước lần gửi kế tiếp." |
| 2 | Debit, `e43 committed ✓`, `P1 done ✓`, `A: $0 · C: $0`, ô bước 2 | "Trừ trước: coordinator gửi A trừ một đô tới P1. Bên trong P1 diễn ra đúng slide 18, chỉ với nửa trừ: validate, e43, Raft commit, rồi apply. Coordinator giữ lời gọi và chờ. Read path của P1, đúng phía đọc của CQRS ở slide 15, ghi 'debit A: done' rồi đẩy kết quả về chính coordinator, qua reverse proxy ở cửa P1. Coordinator không phải hỏi đi hỏi lại. Với nó, gửi A trừ một đô là một lời gọi đồng bộ: gửi, chờ, nhận P1 success. Sách nói đúng điều kiện này: mỗi nhóm trả lời đồng bộ thì mới dùng lại được TC/C hay Saga. Coordinator ghi P1 done vào bảng, trước khi gửi lệnh kế tiếp. Nhưng P1 success chưa phải giao dịch xong: lúc này A không, C không, một đô đang chuyển." |
| 3 | Credit, `e88 committed ✓`, `P2 done ✓`, `A: $0 · C: $1`, ô bước 3 | "Chỉ khi P1 đã done, coordinator mới gửi C cộng một đô tới P2. P2 lặp lại cùng mẫu, với event e88. Ngay khi e88 được apply, C đã có một đô, dù Saga chưa đóng giao dịch. Ai đọc số dư lúc này thấy A không, C một, trong khi bảng chưa ghi tx done. Saga không cô lập." |
| 4 | `mark done`, `reply`, `tx done ✓`, ô bước 4 | "Coordinator ghi giao dịch xong và trả kết quả cho client: A không, C một đô." |

Chốt: "Giữa bước 2 và bước 3 có một trạng thái trung gian thật. Ở bước 3, kết quả đã thấy được trước khi Saga đóng. Saga theo dõi chúng bằng một bảng bền, ghi trước mỗi lần gửi. Nó không giả vờ hai Raft group commit cùng một lúc. Đừng gọi Saga là atomic."

## 4. Giải thích sâu

- **Sách chỉ đi happy path (p.542).** Sách dùng Saga và chỉ giải thích đường suôn sẻ, không có rollback. Nhánh lỗi nằm ở mục 7 của notebook này (*Khi P2 không trả lời*), phần ngoài sách.
- **Ghi trước khi làm (bước 2).** Coordinator tạo một bản ghi trong phase status table để theo dõi giao dịch. Việc này xảy ra trước bước 3, lúc gửi `A −$1`. Bước 8 cũng vậy: ghi P1 thành công, rồi bước 9 mới gửi `C +$1`.
- **Vì sao bảng phải bền.** Ở phần TC/C, sách hỏi: dịch vụ khởi động lại giữa chừng thì sao? Khi đó lịch sử thao tác có thể mất hết. Lời giải của sách là lưu tiến độ trong một **database giao dịch** (Fig 10, notebook 8). Slide này dùng lại đúng bảng đó cho Saga.
- **Trừ trước, cộng sau (bước 3, 9).** Coordinator xét thứ tự và xử lý `A −$1` trước. Chỉ khi thao tác đầu thành công, nó mới chạy `C +$1`.
- **Vì sao dùng được Saga ở đây (p.542).** Sách nói: khi mọi nhóm event sourcing đã chạy **đồng bộ**, ta dùng lại được giải pháp giao dịch phân tán, TC/C hoặc Saga. Push status qua reverse proxy cho đúng điều đó. Figure 29 ghi rõ: sau khi event đồng bộ xong, read path của partition dựng lại state và trạng thái thực thi (bước 5, và 11 cho P2), rồi đẩy status về bên gọi của nó, là Saga coordinator (bước 6 và 12). Sách đi tới push qua ba nấc, Figure 25–27 (câu hỏi *"Sao coordinator không hỏi lại (pull)?"* ở mục 5). Sách không đặc tả giao thức push, correlation ID hay cách trả về đúng request khi có nhiều proxy; đó là phần phải thiết kế thêm nếu triển khai thật.
- **Khoảng hụt là chuyện sách đã nói.** Với TC/C, sách chỉ ra một đô biến mất vào cuối pha Try (Figure 11), và kết luận rằng trong lúc giao dịch phân tán chạy luôn có sai lệch dữ liệu. Figure 11 dựa trên ví dụ đơn giản của sách, trong đó Try trừ thẳng A. (Slide 8 dùng mô hình giữ chỗ nên không có khoảng hụt này **[Ngoài sách: mô hình giữ chỗ]**.) Saga ở đây trừ thật, nên khúc `A $0 · C $0` đúng là hiện tượng của Figure 11.

## 5. Câu hỏi có thể gặp

- **"Vậy Saga có atomic không?"** Không. Người khác có thể thấy A $0 trong khi C vẫn $0. Rồi họ thấy C $1 trong khi Saga chưa đóng. Saga bảo đảm **kết quả cuối** (hoàn tất, hoặc bù về như cũ; mục 7). Nó không bảo đảm không ai thấy trạng thái giữa chừng.
- **"P1 đã báo success rồi, sao chưa trả lời client?"** Vì P1 success chỉ nói nửa trừ đã commit. C vẫn $0. Coordinator còn phải gửi `C +$1`, chờ P2 success, ghi `tx done`. Chỉ `mark done` · `reply` mới là xong.
- **"Sao slide 18 có e43 và e44, ở đây chỉ có e43 và e88?"** Ở slide 18, mọi tài khoản còn chung một nhóm, nên một command sinh cả hai event trong cùng một log. Từ slide 20, A ở P1, C ở P2, mỗi partition có log và số thứ tự event riêng. P1 chỉ sinh e43 `A −$1`; nửa cộng thành e88 trong log của P2.
- **"Sao C đã có $1 mà giao dịch chưa xong?"** [Ngoài sách: suy luận] Vì P2 là một Raft group độc lập. e88 commit và được apply là số dư của C đổi ngay. P2 không chờ coordinator. Coordinator chỉ biết sau khi nhận push và ghi `tx done`.
- **"Sao không gửi `A −$1` và `C +$1` song song cho nhanh?"** Nếu cộng C trước mà trừ A thất bại (A không đủ tiền), ta đã tạo ra tiền từ không khí và phải đi thu hồi. Trừ trước, cộng sau thì thất bại ở bước đầu là vô hại (Table 4 của sách, notebook 8; slide 9). TC/C giữ chỗ ở slide 8 làm song song được, vì C chỉ nhận pending, chưa tiêu được. Saga ở đây cộng thật, nên phải tuần tự **[Ngoài sách: mô hình giữ chỗ]**.
- **"Phase status table để trong bộ nhớ của coordinator được không?"** Không. Coordinator khởi động lại là mất bộ nhớ, và một đô có thể biến mất (mục 7).
- **"Coordinator chết giữa chừng thì sao?"** [Ngoài sách: suy luận] Coordinator mới đọc bảng. Thấy P1 done mà P2 chưa, nó làm tiếp: gửi `C +$1` với cùng mã thao tác `tx 7f3c · credit C`. P2 chống trùng theo mã thao tác có trong log của nó, nên không cộng hai lần (sổ tay 18).
- **"P2 không trả lời thì sao?"** [Ngoài sách] Timeout là **chưa biết**, không phải thất bại. Coordinator gửi lại cùng mã `tx 7f3c · credit C`; P2 chống trùng nên không cộng hai lần. Chỉ khi P2 đã lưu một lời từ chối, coordinator mới bù bằng `tx 7f3c · refund A`. Chi tiết ở mục 7.
- **"Tiền đi đâu trong khúc giữa? Tổng A + C chỉ còn $0."** [Ngoài sách] Sổ sách thật thường ghi khoản đang chuyển vào một **tài khoản trung gian** (transit hay clearing account). Nhờ vậy ở mọi thời điểm tổng sổ vẫn cân: A $0 + đang chuyển $1 + C $0 = $1. Chapter 12 đơn giản hóa và để khoảng hụt hiện ra, giống Figure 11. Chỗ giữ của TC/C ở slide 8 là cùng ý: khoản đang chuyển có tên và có chỗ nằm, thay vì "biến mất".
- **"Reverse proxy đâu rồi?"** Figure 29 đặt một reverse proxy ở cửa mỗi partition. Slide này lược đi cho gọn. Lệnh của coordinator đi vào partition qua proxy; proxy giữ lời gọi của coordinator, và status đẩy về cũng đi ra qua proxy đó. Bên đang chờ ở proxy là **coordinator**, không phải client; client chỉ chờ coordinator. Slide 22 vẽ proxy ở cửa mỗi partition.
- **"Sao coordinator không hỏi lại (pull)?"** Sách xét ba nấc (Figure 25–27, p.539–542):
  1. **Pull** (Figure 25): bên ngoài định kỳ hỏi read-only state machine "xong chưa?". Không real-time, vì kết quả chỉ tới ở lần hỏi kế tiếp; hỏi dày thì đè tải lên wallet service.
  2. **Pull qua reverse proxy** (Figure 26): proxy nhận command, chuyển vào nhóm event sourcing, rồi poll hộ. Bên gọi gọn hơn, nhưng vẫn định kỳ, vẫn không real-time.
  3. **Push** (Figure 27): read-only state machine đẩy status về reverse proxy ngay khi nhận event; proxy trả lời trên lời gọi đang chờ. Không ai phải hỏi.

  Thiết kế cuối dùng nấc 3, và bên đang chờ chính là Saga coordinator (Figure 29, bước 5–6). Nếu coordinator tự poll, mỗi giao dịch thêm nhiều lượt hỏi thừa ở cả P1 lẫn P2; với hai triệu thao tác ví mỗi giây, con số đó rất lớn **[Ngoài sách: nhận xét]**. Phần tổng kết của sách gói lại: reverse proxy biến framework event sourcing bất đồng bộ thành đồng bộ với bên ngoài (p.545). Status chỉ được đẩy **sau commit**; event mới nằm trong `events.log` của leader thì chưa (notebook 18).
- **"Bước nào trên hình là bước mấy của Figure 29?"** Hình không ghi số bước của sách. Dùng bảng 15 bước ở mục 7.

## 6. Đừng nói sai

- Đừng gọi Saga là atomic, và đừng nói "Raft cho atomic giữa hai partition".
- Đừng nói "P1 success là chuyển tiền xong". Chỉ `mark done` · `reply` mới là xong.
- Đừng nói "coordinator gửi lệnh rồi mới ghi bảng". Bảng ghi trước, lệnh gửi sau.
- Đừng nói "client nói chuyện thẳng với P1, P2". Client nói với coordinator; coordinator là bên gọi của từng partition.
- Đừng nói "C chỉ có tiền khi Saga đóng giao dịch". C có $1 ngay khi e88 được apply.
- Đừng nói "phase status table nằm trong bộ nhớ của coordinator".
- Đừng nói "đây là tx 7f3c chạy lần hai" khi A lại về $1.
- Đừng nói "P2 timeout thì bù ngay". Timeout là chưa biết; gửi lại cùng mã thao tác trước.

## 7. Giải thích chi tiết

**Figure 29 đủ 15 bước, đối chiếu với slide.** Đọc theo ba nhịp: **1–2** mở giao dịch; **3–8** nửa trừ ở partition 1 (e43); **9–14** nửa cộng ở partition 2 (e88), lặp lại cùng mẫu; **15** trả kết quả.

| Bước Figure 29 | Việc | Bước bấm ở slide này | Slide giải thích kỹ |
|---|---|---|---|
| 1 | Client gửi giao dịch gồm `A −$1` và `C +$1` | 1 | 21 |
| 2 | Coordinator tạo bản ghi trong phase status table | 1 | 9, 21; notebook 8 (Fig 10) |
| 3 | Gửi `A −$1` tới partition 1, qua reverse proxy ở cửa P1 | 2 | 20 (partition theo tài khoản); 21, 22 (reverse proxy) |
| 4 | Leader P1 lưu command, validate, tạo e43; Raft đồng bộ; apply | 2 | 18 (apply: lời nói sau bước 3) |
| 5 | Read path P1 dựng state và trạng thái thực thi | 2 | 15; 21 (bước 2) |
| 6 | Read path P1 push status về coordinator, qua reverse proxy của P1 | 2 | 21 (bước 2); pull hay push: mục 5 |
| 7 | Coordinator nhận P1 success | 2 | 21 |
| 8 | Ghi P1 thành công vào bảng | 2 | 21 |
| 9 | Gửi `C +$1` tới partition 2 | 3 | 21 |
| 10 | Leader P2 lưu command, validate, tạo e88; Raft; apply | 3 | cùng mẫu bước 4 |
| 11–12 | Read path P2 dựng status và push | 3 | cùng mẫu bước 5–6 |
| 13 | Coordinator nhận P2 success | 3 | 21 |
| 14 | Ghi P2 thành công vào bảng | 3 | 21 |
| 15 | Giao dịch hoàn tất; trả kết quả | 4 | 21 |

Mẹo khi có người hỏi: tới bước 9, nói "giống hệt 3 tới 8, ở partition 2", rồi đi nhanh.

**Vì sao ghi bảng trước mỗi lần gửi [Ngoài sách: suy luận].** Coordinator có thể chết ở bất kỳ chỗ nào. Bảng là trí nhớ duy nhất của nó:
- Chết sau `record`: coordinator mới thấy tx 7f3c đã mở, chưa bước nào xong. Nó bắt đầu từ việc gửi debit.
- Chết sau khi nhận P1 success nhưng trước khi ghi P1 done: bảng chưa ghi P1 done. Coordinator mới gửi lại `tx 7f3c · debit A`. P1 tìm thấy mã thao tác đó trong log và trả lại kết quả cũ (sổ tay 18). Không trừ hai lần.
- Chết sau P1 done: làm tiếp bước credit.

Mỗi tình huống đều an toàn nhờ hai thứ: bảng bền, và **mã thao tác ổn định** cho từng thao tác, được bên nhận chống trùng.

**Nếu bảng chỉ nằm trong bộ nhớ của coordinator [Ngoài sách: suy luận].**
1. Coordinator gửi `tx 7f3c · debit A`, nhận P1 success, ghi "P1 done" vào bộ nhớ, rồi chết.
2. Coordinator mới khởi động với bộ nhớ trống. Nó không biết tx 7f3c tồn tại.
3. A đã mất một đô ở P1, còn C không bao giờ được cộng. Một đô biến mất, và không ai còn nhớ để đi tìm.

**Khúc giữa: A $0 · C $0.** Nó **có thật**: một truy vấn số dư lúc này thấy A đã mất một đô, C chưa có gì (khung giữa của slide 3). Nó **được theo dõi**: bảng ghi `P1 done`, P2 chưa. Và nó **được đóng lại**: hoặc P2 cộng xong (slide này), hoặc Saga bù A (phần *Khi P2 không trả lời* ngay dưới). Không có kết cục thứ ba được chấp nhận.

**Hai tầng, hai trách nhiệm.** Bên trong mỗi partition, Raft giữ thứ tự và độ bền của event. Giữa các partition, Saga giữ thứ tự "trừ trước, cộng sau" và nhớ tiến độ trong một bảng bền. Raft không biết A và C thuộc cùng một giao dịch. Saga không biết event nào đã commit trong từng nhóm; nó chỉ tin vào status được push về.

**Nối về chặng 2.** Slide 9 giới thiệu Saga với hai database, kèm phase status table; cách bảng giúp phục hồi nằm ở notebook 8. Thiết kế cuối dùng lại đúng hai thứ đó, chỉ thay "database" bằng "Raft group có event sourcing".

**Khi P2 không trả lời [Ngoài sách: toàn bộ phần này].** Sách chỉ vẽ đường suôn sẻ. Phần này trả lời câu hỏi khó nhất: P1 đã trừ, `A $0 · C $0`, mà P2 không trả lời. Đi đường tốt trước, rồi mới tới đường xấu.

*Quy tắc gốc: timeout là chưa biết, không phải thất bại.* Hết giờ chờ không cho biết P2 đã cộng C hay chưa: lệnh có thể chưa tới, hoặc đã cộng mà câu trả lời bị mất. Leader của P2 chết giữa chừng cũng vậy: với coordinator, nó chỉ là một timeout. Bảng ghi dòng `credit C` là `unknown`. Đây là chuyện leader chết của sổ tay 18, nhưng ở tầng trên.

*Đường tốt: gửi lại đúng thao tác cũ.* Coordinator gửi lại `tx 7f3c · credit C`, **cùng mã**, có thể sau một khoảng chờ, có thể tới leader mới của P2. P2 tra mã trong log của nó. Chưa có thì xử lý một lần như mọi command: e88 `C +$1`, Raft commit, apply, push. Có rồi thì trả lại kết quả cũ, không cộng lần hai. Coordinator ghi `P2 done ✓`, `tx done ✓`. Kết quả: `A $0 · C $1`, C được cộng đúng một lần. Khi chưa biết, đây luôn là việc làm đầu tiên.

*Đường xấu: chỉ bù sau một lời từ chối đã được lưu.* Giả sử P2 thật sự từ chối, ví dụ tài khoản C bị khóa. Ba việc, đúng thứ tự:
1. P2 **lưu** lời từ chối cho đúng mã đó, `tx 7f3c · credit C: rejected`, vào log được nhân bản của nó. Lời từ chối không đổi số dư nên không sinh event số dư; nhưng mọi bản sao đến muộn của lệnh cộng sẽ nhận cùng câu trả lời. Sách đã giải một cuộc đua giống hệt ở TC/C: cờ out-of-order của Figure 12 (notebook 8).
2. Coordinator **ghi quyết định** vào bảng, bền: `credit C: failed`, `tx 7f3c: compensating`. Rồi mới hành động.
3. Coordinator gửi lệnh hoàn `A +$1` tới P1 với **mã thao tác mới** `tx 7f3c · refund A`. P1 xử lý như mọi command: validate, event mới, Raft commit, apply, push. Kết quả: `A $1 · C $0`, giao dịch bị hủy. e43 **không bị xóa**: log của P1 có cả trừ lẫn hoàn, đúng chuyện đã xảy ra.

*Vì sao cần từng điều kiện.*

| Nếu bỏ điều kiện | Chuyện gì xảy ra |
|---|---|
| Bù ngay khi timeout | P2 thật ra đã cộng, chỉ mất câu trả lời. Hoàn A cho ra `A $1 · C $1`: một đô từ không khí. |
| P2 không lưu lời từ chối | Một bản sao lệnh cộng bị kẹt trên mạng. Coordinator hoàn A. C được mở khóa, bản sao tới muộn, P2 không thấy mã trong log, chấp nhận: lại `A $1 · C $1`. |
| Coordinator gửi lệnh hoàn rồi mới ghi bảng | Coordinator chết sau khi gửi. Bản mới đọc bảng, thấy `unknown`, gửi lại `credit C`. A đã được hoàn **và** C được cộng. |
| Lệnh hoàn dùng lại mã `tx 7f3c` trần | P1 đã có `tx 7f3c` (lệnh trừ) trong log, trả "đã xử lý rồi". A không bao giờ được hoàn. |

Hai bản ghi bền, một ở P2 và một ở coordinator, mỗi cái chặn một phía của cùng một lỗ hổng. Khi bảng đã ghi `compensating`, không coordinator nào quay lại gửi lệnh cộng nữa.

*Coordinator mới đọc bảng và làm gì.*

| Trong bảng | Coordinator mới làm gì |
|---|---|
| `P1 done`, `credit C: unknown` | gửi lại `tx 7f3c · credit C`; không bao giờ bù từ trạng thái này |
| `credit C: failed`, `tx 7f3c: compensating` | gửi (lại) `tx 7f3c · refund A`; P1 chống trùng theo mã, nên A không được hoàn hai lần |
| `tx done ✓`, hoặc đã hủy xong | không làm gì; chỉ trả kết quả nếu được hỏi |

Trong lúc chưa biết, client thường thấy "đang xử lý". Coordinator chỉ trả "thành công" hay "đã hủy" khi bảng đã có kết luận.

## 8. Dẫn dắt sang slide 22

- **Điều slide này để lại:** đã có đủ các mảnh. Saga coordinator cùng phase status table giữ thứ tự **giữa** P1 và P2; mỗi partition là một nhóm Raft; read path đẩy status về qua reverse proxy của partition đó. Nhưng ta mới xem chúng **theo thời gian**, từng bước của một giao dịch. Còn thiếu một bức tranh đặt mọi lớp cạnh nhau, và một lần kiểm tra bức tranh đó với mục tiêu đầu bài (việc của slide 23).
- **Con số để dành cho slide 23:** một transfer chéo partition tốn hai thao tác ví ở hai nhóm, và **ba** lần ghi vào phase status table theo Figure 29: tạo, P1 done, P2 done. Ô `tx done` trên hình là minh họa ngoài sách; khi tính tải ở slide 23, nó được coi là cùng một dòng với `P2 done`, không phải lần ghi thứ tư. Retry hay bù chỉ thêm lần ghi ở đường lỗi.
- **Câu nối gợi ý:** "Ta đã có đủ các mảnh. Ghép chúng thành một bản đồ, rồi kiểm tra bản đồ đó với mục tiêu đầu bài."
- **Khán giả sẽ thấy ở slide 22:** headline `Final architecture map`, lede *The book's final design: each partition has its own write side, read side and reverse proxy.* Đây là thiết kế cuối của sách, Figure 28. Khi slide mở, hình chỉ có hai khung nét đứt, `P1 · account A` và `P2 · account C`, mỗi khung có ô `reverse proxy` ở mép trái. Ba bước tự chạy, mỗi bước vẽ thêm một phần của bản đồ:
  1. `user` (điện thoại với `$1`) → `POST` → `Saga coordinator`, thẻ `tx 7f3c` với `1. A −$1`, `2. C +$1`. Đường `log state` xuống một database riêng, `phase status table`: `tx 7f3c: started`, `P1 debit: done ✓`, `P2 credit: done ✓`, trạng thái **sau** khi tx 7f3c của slide này chạy xong. Hai mũi tên lệnh đi **thẳng** tới reverse proxy: `A −$1` tới P1, `C +$1` tới P2. Không có router ở giữa.
  2. Cột `write (Raft)` trong mỗi partition. Hàng leader: `A −$1` → `validate` → `e43: A −$1` → `apply` → `state` `A: $0`. Hai follower: `F1: e43 ✓`, `F2: e43 ✓` → `A: $0`, nối với leader bằng nhãn `Raft`. P2 giống hệt, với `C +$1`, `e88: C +$1`, `C: $1`.
  3. Cột `read` trong mỗi partition: bánh răng `read view` dựng `status view` từ event của leader (`tx 7f3c`, `debit A: done ✓`, `@ e43`; ở P2 là `credit C: done ✓`, `@ e88`). Mũi tên `push latest status` vòng theo mép partition về **reverse proxy của chính partition đó**. Rồi `P1 done ✓`, `P2 done ✓` về coordinator, và `result` về user.

  Reverse proxy mà slide này lược đi sẽ hiện ra ở cửa mỗi partition. Chi tiết lưu trữ trong mỗi node (command file, `mmap`, RocksDB, snapshot lên object storage) không vẽ trên hình; lời nói ở bước 2 nhắc tới chúng. Sau ba bước là phần nhìn lại năm lần đổi kiến trúc. Số máy chưa có trên bản đồ; slide 23 mới tính.
