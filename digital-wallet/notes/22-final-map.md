# Slide 22 — Final architecture map

> **Ý chính:** Đây là thiết kế cuối của sách, **Figure 28**, vẽ lại bằng ngôn ngữ của bộ slide, với đúng tx 7f3c chạy qua (luồng của Figure 29). Bên trái: **user**, **Saga coordinator**, và **phase status table**, một database riêng nối với coordinator. Bên phải: hai partition giống hệt nhau, `P1 · account A` và `P2 · account C`. **Không có khối router**: coordinator gửi lệnh **thẳng tới reverse proxy** của partition giữ tài khoản, `A −$1` tới P1, `C +$1` tới P2. Mỗi partition có ba phần: **reverse proxy** ở cửa, lối vào duy nhất; **phía write**, một nhóm Raft (leader validate và sinh event, Raft chép event sang hai follower, cả ba máy apply); **phía read**, read-only state machine dựng **status view** từ event log. Status view **đẩy status mới nhất** về **reverse proxy của chính partition đó**, và proxy trả `P1 done ✓` hay `P2 done ✓` cho coordinator đang chờ. Raft giữ thứ tự **trong** một nhóm; Saga giữ thứ tự **giữa** các nhóm. Thêm nhóm để tăng tổng thông lượng; **benchmark** quyết định bao nhiêu nhóm. Slide khép lại phần thiết kế bằng một lần **nhìn lại** năm lần đổi kiến trúc. Slide cuối, slide 23, đem bản đồ này đối chiếu với mục tiêu của slide 2.

**Chặng:** 6 · Scale out + Saga · **Nguồn (footer `Book:`):** Distributed event sourcing: final design, Fig 28–29, p.539–545. Bản vẽ theo cấu trúc của Figure 28, không phải bản sao nguyên hình; các giá trị trên hình (tx 7f3c, e43, e88, số dư, các dòng của bảng và của status view) là ví dụ của bài. Reverse proxy và push ở Figure 26–27; snapshot trong object storage (p.532–534). Việc chia coordinator theo tx id là **[Ngoài sách]** (sổ tay 23) · **Bước bấm:** 3 (tự chạy, 0,6 giây mỗi bước; nhấn A để bấm từng bước)

---

## Hiểu nhanh trước khi nhìn hình

**Không có khối nào mới trên slide này.** Mỗi khối đã có một slide riêng. Hình cuối là bản đồ của sách, để khán giả **tự kể lại** đường đi của tx 7f3c:

user → Saga coordinator ghi `tx 7f3c: started` → `A −$1` thẳng tới reverse proxy của P1 → leader P1: validate, e43, Raft, apply → read view của P1 dựng status view → push về proxy của P1 → `P1 done ✓` về coordinator, ghi `P1 debit: done` → `C +$1` tới proxy của P2 → P2 lặp lại cùng mẫu với e88 → push về proxy của P2 → `P2 done ✓`, ghi `P2 credit: done` → `result` về user.

**Ba điểm hình giữ đúng như sách.**
- **Không có router.** Coordinator gửi lệnh thẳng tới reverse proxy của partition giữ tài khoản. Sách chỉ nói dữ liệu được chia theo hash của key. Khối router ở slide 20 là **[Ngoài sách]**.
- **Phía read nằm trong từng partition.** Không có khối CQRS chung cho cả hệ thống. Mỗi partition có phía write và phía read của riêng nó.
- **Phase status table là một database riêng**, nối với coordinator bằng đường `log state`, không nằm trong khối coordinator.

Slide không đánh lại 15 bước của Figure 29. Bảng đủ 15 bước nằm ở sổ tay 21; bảng ở mục 7 dưới đây ghi số bước của sách cạnh từng phần của bản đồ.

**Ba dòng dưới hình là bản tóm tắt cả nửa sau:**
1. Saga coordinator sắp thứ tự các bước chéo partition.
2. Mỗi Raft group sắp thứ tự và commit event của nó.
3. View của từng partition đẩy status về.

**Sau ba bước là phần nhìn lại, chưa phải lời kết.** Lời nói của slide đi lại năm lần đổi kiến trúc, mỗi lần một lý do (bảng "món nợ" ở mục 7). Chưa cảm ơn, chưa mở hỏi đáp: slide 23 còn kiểm tra bản đồ này với năm yêu cầu của slide 2, rồi mới kết bài.

**Hai từ cần nhắc lại.**
- **Reverse proxy:** máy chủ đứng ở cửa partition, lối vào duy nhất của nó. Nó nhận lệnh của Saga coordinator, chuyển vào leader, và giữ lời gọi của coordinator mở cho tới khi phía read đẩy status về (sổ tay 21).
- **Object storage:** kho lưu file lớn nằm ngoài các node, ví dụ HDFS. Snapshot được đưa lên đó. Hình không vẽ nó; lời nói ở bước 2 nhắc tới.

## 1. Slide này để làm gì

Gom mọi mảnh của slide 15–21 vào bản đồ cuối của sách, để mỗi mũi tên trên đó đều đã có nghĩa với khán giả. Rồi nhìn lại năm lần đổi kiến trúc đã dẫn tới bản đồ này. Bản đồ là thứ slide 23, slide cuối, đem ra đối chiếu với mục tiêu đầu bài: có đạt năm yêu cầu của slide 2 không, nhất là một triệu giao dịch mỗi giây.

## 2. Đọc hình

- Headline `Final architecture map`. Lede: *The book's final design: each partition has its own write side, read side and reverse proxy.*
- **Khi slide mở**, hình chỉ có hai khung nét đứt: `P1 · account A` ở trên, `P2 · account C` ở dưới. Mỗi khung có ô `reverse proxy` ở mép trái, lối vào duy nhất của partition.
- **Cột trái:**
  - `user`: điện thoại với `$1`. Mũi tên `POST` sang coordinator; mũi tên `result` quay về.
  - `Saga coordinator` (header tím, biểu tượng lục giác). Thẻ bên trong: `tx 7f3c`, `1. A −$1`, `2. C +$1`, tức kế hoạch hai bước: trừ trước, cộng sau.
  - Đường nét đứt `log state` xuống hình trụ tím `phase status table`, ba dòng: `tx 7f3c: started`, `P1 debit: done ✓`, `P2 credit: done ✓`. Đây là trạng thái **sau** khi tx 7f3c chạy xong. Ba dòng là ba lần ghi bảng của Figure 29 (bước 2, 8, 14).
- **Giữa coordinator và partition:** hai mũi tên lệnh màu xanh dương, `A −$1` thẳng vào proxy của P1, `C +$1` vào proxy của P2. Hai mũi tên xanh lá đi ngược lại: `P1 done ✓`, `P2 done ✓`. Không có hộp nào đứng giữa.
- **Cột `write (Raft)` trong mỗi partition:**
  - Hàng leader: thẻ lệnh `A −$1` → bánh răng `validate` → ô event `e43: A −$1` → bánh răng `apply` → thẻ `state` `A: $0`. Ở P2: `C +$1` → `validate` → `e88: C +$1` → `apply` → `C: $1`.
  - Hai hàng follower: `F1: e43 ✓` → `A: $0` và `F2: e43 ✓` → `A: $0`; ở P2 là `F1: e88 ✓`, `F2: e88 ✓` → `C: $1`. Nhãn vàng `Raft` nối event của leader với event của hai follower. Follower không có thẻ lệnh và không validate: nó nhận event leader đã tạo.
- **Cột `read` trong mỗi partition:** đường nét đứt teal từ event của leader sang bánh răng `read view` (read-only state machine), rồi tới thẻ `status view`: `tx 7f3c`, `debit A: done ✓`, `@ e43` ở P1; `tx 7f3c`, `credit C: done ✓`, `@ e88` ở P2. `@ e43` nghĩa là view đã xử lý tới event e43.
- **Mũi tên `push latest status`:** từ status view, vòng theo mép trên của P1 (mép dưới của P2), về đúng reverse proxy của partition đó. P1 không báo về proxy của P2, và ngược lại.

Diễn biến (khung partition và reverse proxy có sẵn; mỗi bước vẽ thêm một phần của bản đồ):
1. Vòng số 1: `user`, `POST`, `Saga coordinator`, `log state`, `phase status table`, và hai mũi tên lệnh `A −$1`, `C +$1`.
2. Vòng số 2: cột `write (Raft)` của P1 và P2: hàng leader, hai hàng follower, nhãn `Raft`.
3. Vòng số 3: cột `read` của P1 và P2, hai mũi tên `push latest status`, hai mũi tên `P1 done ✓`, `P2 done ✓`, rồi `result` về user.

Dải bước dưới hình: (1) `Saga coordinators order cross-partition steps` · (2) `Each Raft group orders and commits its events` · (3) `Per-partition views push status back`.

Hình là một bản đồ, không phải dòng thời gian. Hai mũi tên lệnh hiện cùng lúc ở bước 1, nhưng `C +$1` chỉ được gửi sau khi coordinator đã nhận `P1 done ✓` và ghi `P1 debit: done` (slide 21).

## 3. Trình bày theo bước

| Bước | Trên màn hình | Nói |
|---|---|---|
| 1 | User, Saga coordinator, phase status table, hai mũi tên lệnh, ô bước 1 | "Client gửi giao dịch tới Saga coordinator. Coordinator ghi tiến độ vào phase status table, một database riêng, trước mỗi lần gửi. Rồi nó gửi lệnh thẳng tới reverse proxy của partition giữ tài khoản: A trừ một đô tới P1 trước, xong mới C cộng một đô tới P2. Không có router ở giữa. Sách chỉ nói dữ liệu chia theo hash của key; đi tới partition nào là tính từ tài khoản. Phần này ngoài sách: coordinator không phải một máy, nó được chia partition theo mã giao dịch; slide cuối sẽ tính cần bao nhiêu." |
| 2 | Cột `write (Raft)` của P1 và P2, ô bước 2 | "Mỗi partition là một nhóm Raft: một leader, hai follower. Reverse proxy là cửa vào duy nhất. Leader ghi command, validate, sinh event e43; Raft chép event sang hai follower; commit xong thì cả ba máy apply: A còn không đô. Tới lượt P2, nó làm đúng như vậy với e88: C có một đô. Đúng những gì slide 16 tới 18 đã mổ xẻ. Bên trong mỗi máy là command file, event file qua mmap và RocksDB; snapshot được đẩy ra object storage. Hình không vẽ các thứ đó." |
| 3 | Cột `read`, hai mũi tên `push latest status`, `P1 done ✓`, `P2 done ✓`, `result`, ô bước 3 | "Mỗi partition có phía đọc của riêng nó: read-only state machine dựng status view từ event log, như CQRS ở slide 15. Ngay khi event đã commit, status được đẩy về reverse proxy của chính partition đó, và proxy trả P1 done cho coordinator đang chờ. Coordinator ghi phase, rồi mới đi bước tiếp. P2 cũng đẩy về proxy của P2 và trả P2 done. Xong cả hai thì coordinator trả kết quả cho client. Sách vẽ cả hai follower cũng có phía đọc riêng; slide chỉ vẽ của leader, vì đó là đường báo kết quả. Đây chính là 15 bước của Figure 29 ở slide 21, giờ nhìn trên toàn bản đồ. Sách không nêu giao thức push hay correlation ID." |

Sau bước 3, đọc lại ba ô của dải bước, rồi nói phần nhìn lại:

> "**Nhìn lại.** Từ một map số dư trên Redis, ta đổi kiến trúc năm lần, lần nào cũng có lý do. Redis chia shard: không nguyên tử, mất một đô. 2PC, TC/C, Saga: điều phối được trừ và cộng, nhưng không giữ lịch sử để kiểm toán. Event sourcing với Kafka và database ở xa: kiểm toán được, nhưng chậm. File cục bộ: nhanh, nhưng một máy giữ bản duy nhất. Raft: nhân bản event log, nhưng một nhóm có trần. Partition và Saga: thêm nhóm để tăng tổng thông lượng; Saga nối các nhóm; reverse proxy trả kết quả đồng bộ. Thiết kế cuối đúng trong mỗi nhóm, có thứ tự giữa các nhóm, và scale bằng cách thêm nhóm."

Sáu dòng là sáu chặng của bìa; giữa chúng là năm lần đổi. Không cảm ơn ở đây. Chuyển thẳng sang slide 23 (mục 8).

## 4. Giải thích sâu

- **Đối chiếu với Figure 28.** Hình giữ đúng cấu trúc của sách:
  - user ↔ coordinator; phase status table là database riêng, nối với coordinator;
  - hai partition, partition 1 giữ A, partition 2 giữ C; reverse proxy ở cửa mỗi partition, lệnh đi vào và response đi ra qua nó; không có router;
  - trong mỗi partition, phía write là một Raft node group: leader `commands → bánh răng → events → bánh răng → state`, hai follower `events → bánh răng → state`, Raft nối event của leader với event của follower (slide gọi hai bánh răng là `validate` và `apply`); phía read là read-only state machine dựng view;
  - mũi tên đẩy status mới nhất về reverse proxy chạy dọc mép partition, như nhãn *"Push the latest status to reverse proxy in real-time"* của sách.

  Sách ghi "TCC/Saga coordinator"; slide ghi Saga coordinator, vì sách kể luồng bằng Saga. Hai chỗ slide đơn giản hóa:
  1. **Chỉ vẽ read path của leader.** Figure 28 cho mỗi node, cả leader lẫn hai follower, một read-only state machine riêng; chỉ read path của leader đẩy status về proxy. Slide bỏ hai read path của follower vì chúng không nằm trên đường trả kết quả.
  2. **Chi tiết lưu trữ trong mỗi node chỉ nói, không vẽ:** command file, event file qua `mmap`, state trong RocksDB, snapshot lên object storage. Chúng đến từ các phần trước của sách (slide 16; snapshot ở sổ tay 14). Figure 28 cũng chỉ vẽ ô Commands, Events và hình trụ state.

  Các giá trị cụ thể (tx 7f3c, e43, e88, số dư, các dòng của bảng và của status view) là ví dụ của bài, không có trong Figure 28.
- **Wrap-up của sách (p.545)** đi lại đúng thứ tự các lần đổi thiết kế:
  - Redis: dữ liệu không bền.
  - Database với 2PC, TC/C, Saga: khó kiểm toán dữ liệu.
  - Event sourcing với database và hàng đợi ở ngoài: chưa đủ nhanh. Sách cải thiện bằng cách lưu command, event và state trên node cục bộ.
  - Một node là một điểm hỏng đơn. Sách dùng Raft để nhân bản event list ra nhiều node.
  - Cuối cùng, sách thêm reverse proxy để biến framework event sourcing bất đồng bộ thành đồng bộ cho bên ngoài, và dùng TC/C hoặc Saga để điều phối giữa các nhóm.
- **Figure 29, bước 5–6 (P2: bước 11–12).** Sau khi event đồng bộ xong, framework của partition 1 đồng bộ dữ liệu sang **read path của partition 1** bằng CQRS; read path dựng lại state và trạng thái thực thi. Rồi nó đẩy status về bên gọi, là Saga coordinator. Phần pull và push (Figure 26–27) cho thấy status đi về **reverse proxy**. Trên hình: đường nét đứt sang `read view`, thẻ `status view`, mũi tên `push latest status`, rồi `P1 done ✓`. Vậy mỗi partition có read path riêng, đứng sau proxy riêng.
- **Mỗi khái niệm nằm ở lớp nào:**

| Khái niệm | Trên bản đồ | Slide / sổ tay |
|---|---|---|
| Saga, trừ trước cộng sau, bù | khối `Saga coordinator`, thẻ `1. A −$1`, `2. C +$1` | 9, 21; nhánh bù ở sổ tay 21 |
| Phase status table, bền, ghi trước khi gửi | hình trụ `phase status table`, nối qua `log state` | 9, 21; phục hồi ở sổ tay 8 |
| Chia coordinator theo tx id (ngoài sách) | không vẽ; hình có một khối `Saga coordinator`, dải bước ghi số nhiều | 23 (slide sau) |
| Partition theo tài khoản | khung `P1 · account A`, `P2 · account C`; lệnh đi thẳng tới proxy, không có router | 20 |
| Reverse proxy, push status | ô `reverse proxy` ở cửa mỗi partition; `push latest status`; `P1 done ✓`, `P2 done ✓` | 21; pull hay push ở sổ tay 21 |
| Command khác event, validate | hàng leader: thẻ lệnh → `validate` → ô event | 12, 13, 18 |
| File cục bộ, `mmap`, flush, RocksDB | không vẽ; nói ở bước 2 | 16; sổ tay 16 |
| Raft commit, chỉ apply entry đã commit | cột `write (Raft)`: hàng leader, `F1`, `F2`, nhãn `Raft` | 17, 18 |
| Retry cùng mã thao tác, chống trùng trong log | không vẽ; nằm giữa coordinator và partition | sổ tay 18, sổ tay 21 |
| Snapshot | không vẽ; nói ở bước 2 (object storage) | sổ tay 14 |
| CQRS, read path | cột `read` của mỗi partition: `read view` → `status view` | 15, 21 |

## 5. Câu hỏi có thể gặp

- **"Hệ thống này đạt 1M TPS chưa?"** Chưa có phép đo nào chứng minh. Sách đưa ra hướng: tăng thông lượng mỗi nhóm bằng file cục bộ và `mmap`, tăng tổng thông lượng bằng partition. Muốn khẳng định phải benchmark toàn hệ thống, kể cả transfer chéo partition. Đây đúng là câu hỏi của slide sau: nói ngắn rồi chuyển sang slide 23. Slide đó tính cỡ hệ thống **[Ngoài sách: giả định gom lô, khoảng 100.000 thao tác bền/s mỗi nhóm, chạy 70% → 70.000]**: khoảng 29 nhóm ví và 43 shard Saga, tức 72 nhóm, khoảng 216 replica slot; không mặc nhiên là 216 máy.
- **"Coordinator có phải điểm hỏng đơn mới không?"** [Ngoài sách] Có thể, nếu chỉ chạy một bản. Phase status table phải bền và được nhân bản. Mỗi partition của coordinator phải có bản dự phòng đọc được bảng để làm tiếp (slide 21, sổ tay 21). Ở một triệu giao dịch mỗi giây, bảng nhận ba triệu lần ghi mỗi giây (ba bản ghi theo Figure 29, đúng ba dòng trên hình), nên nó được chia theo tx id: khoảng 43 shard theo giả định của slide 23. Coordinator chạy như các tiến trình không state, thêm instance khi thiếu. Hình vẽ một khối `Saga coordinator` cho gọn; dải bước ghi số nhiều, `Saga coordinators`.
- **"Router đâu rồi? Slide 20 có router mà."** Sách không có khối router. Figure 28 cho coordinator gửi lệnh thẳng tới partition giữ tài khoản; sách chỉ nói dữ liệu được chia theo hash của key, và giả định chia làm hai partition. Khối router ở slide 20 là cách bộ slide vẽ phép tính `hash(account_id) % N`, và được ghi là **[Ngoài sách]**. Phép tính đó vẫn cần: đi tới partition nào là tính từ mã tài khoản. Ai tính, coordinator hay một thư viện nó dùng, sách không nói **[Ngoài sách]**.
- **"Reverse proxy nằm ở đâu?"** Ở cửa của **mỗi** partition: ô `reverse proxy` ở mép trái hộp P1 và hộp P2, có sẵn ngay khi slide mở. Lệnh của coordinator đi thẳng vào proxy. Status từ status view đi ngược ra qua chính proxy đó (`push latest status`), rồi proxy trả `P1 done ✓` hay `P2 done ✓` cho coordinator.
- **"Phía read là một dịch vụ chung cho cả hệ thống à?"** Không. Mỗi partition có cột `read` riêng, dựng từ event log của chính nó; status view của P1 chỉ biết `debit A`, của P2 chỉ biết `credit C`. [Ngoài sách] Một view audit toàn hệ thống, nếu cần, là tầng gom thêm ở ngoài, không nằm trên đường trả status.
- **"Follower có phía read không?"** Có, trong sách. Figure 28 vẽ mỗi follower cũng có read-only state machine và view riêng; chỉ read path của leader đẩy status về proxy. Slide lược hai read path đó cho gọn. [Ngoài sách: suy luận] Chúng dùng được cho truy vấn đọc, như xem số dư, để chia tải; sách không nói rõ chúng làm gì.
- **"Sao hình vẽ hai lệnh cùng lúc? Có gửi song song không?"** Không. Bản đồ cho thấy mọi đường đi, không cho thấy thời gian. `C +$1` chỉ được gửi sau khi coordinator nhận `P1 done ✓` và ghi `P1 debit: done`. Thứ tự theo thời gian là slide 21.
- **"Sao bảng vẫn ghi `tx 7f3c: started` khi đã xong?"** Figure 29 chỉ có ba lần ghi bảng: tạo bản ghi (bước 2), P1 thành công (bước 8), P2 thành công (bước 14). Có dòng `P2 credit: done` là biết giao dịch xong. Ô `tx done ✓` ở slide 21 là phần minh họa ngoài sách; khi tính tải ở slide 23, nó được coi là cùng một lần ghi với P2 done.
- **"Sao P2 là e88 mà không phải e44 như slide 18?"** Mỗi partition đánh số event trong log riêng của nó. e44 là số ở slide 18, khi mọi tài khoản còn chung một log; từ slide 20, P2 có log riêng, và event cộng C của nó là e88, giống slide 21.
- **"Snapshot có nằm trên đĩa của node không?"** Không. Mỗi node tạo snapshot, nhưng file snapshot được đưa lên object storage, như sách nói (sổ tay 14). Lý do: snapshot dùng để dựng lại một replica khi đĩa của nó hỏng; để snapshot trên chính đĩa đó thì mất luôn đúng lúc cần. Hình không vẽ snapshot.
- **"Có ring buffer hay LMAX trong thiết kế này không?"** [Ngoài sách] Không bắt buộc. Đó là một lựa chọn tối ưu ở cửa vào của mỗi nhóm, ngoài Chapter 12 (sổ tay 19). Thiết kế đúng mà không cần nó.
- **"Lỗi giữa chừng thì sao?"** Sách chỉ mô tả đường suôn sẻ. Nhánh lỗi nằm ở sổ tay 18 (leader chết) và sổ tay 21, phần *Khi P2 không trả lời* **[Ngoài sách]**.

## 6. Đừng nói sai

- Đừng nói "Raft cho atomic giữa các partition". Raft chỉ có nghĩa trong một nhóm; Saga điều phối giữa các nhóm và không atomic.
- Đừng nói "router chia lệnh tới partition" khi chỉ vào hình này. Hình không có router; coordinator gửi lệnh thẳng tới reverse proxy của partition giữ tài khoản.
- Đừng nói "phase status table nằm trong coordinator". Nó là một database riêng, nối với coordinator.
- Đừng nói "coordinator gửi `A −$1` và `C +$1` cùng lúc", dù hai mũi tên hiện cùng ở bước 1. Trừ trước, cộng sau.
- Đừng nói "`mmap` làm hệ thống bền". `mmap` làm nhanh; Raft cùng chính sách flush làm bền.
- Đừng nói "kiến trúc LMAX" hay "Chapter 12 dùng ring buffer".
- Đừng đánh lại 15 bước trên slide này. Bảng 15 bước ở sổ tay 21.
- Đừng nói "có một khối CQRS chung nhận event của mọi partition". View là của từng partition, và mỗi partition có read path riêng.
- Đừng nói "chỉ leader có read path". Sách vẽ cả follower; slide lược đi.
- Đừng nói "bản đồ không có reverse proxy". Mỗi partition có một proxy ở cửa vào.
- Đừng đọc e43 và e88 trên hình này như hai event của cùng một log. e43 ở log của P1, e88 ở log của P2.
- Đừng nói "snapshot nằm trên đĩa cục bộ của node". Snapshot được đưa lên object storage.
- Đừng nói "chỉ có một Saga coordinator", dù hình vẽ một khối. Coordinator được chia partition theo tx id **[Ngoài sách]**.

## 7. Giải thích chi tiết

**Kể lại tx 7f3c trên bản đồ, một lần cuối** (cột Figure 29 là số bước của sách, để tra khi có người hỏi; đừng đọc to):

| Bước | Figure 29 | Trên bản đồ | Chuyện gì xảy ra | A | C |
|---|---|---|---|---|---|
| 1 | 1 | `user` → `POST` → Saga coordinator | client gửi "chuyển $1 từ A sang C" | $1 | $0 |
| 2 | 2 | `log state` → phase status table | ghi `tx 7f3c: started`, bền | $1 | $0 |
| 3 | 3 | mũi tên `A −$1` → reverse proxy của P1 | `tx 7f3c · debit A` tới nhóm giữ A | $1 | $0 |
| 4 | 4 | cột `write (Raft)` của P1 | leader: command file → validate → e43 → flush → Raft commit; leader, F1, F2 apply | **$0** | $0 |
| 5 | 5–6 | cột `read` của P1, `push latest status` | read view dựng `debit A: done ✓ @ e43`; đẩy về proxy của P1 | $0 | $0 |
| 6 | 7–8 | `P1 done ✓` → coordinator → bảng | coordinator nhận P1 success, ghi `P1 debit: done` | $0 | $0 |
| 7 | 9 | mũi tên `C +$1` → reverse proxy của P2 | `tx 7f3c · credit C` tới nhóm giữ C | $0 | $0 |
| 8 | 10 | cột `write (Raft)` của P2 | cùng mẫu, event e88 | $0 | **$1** |
| 9 | 11–12 | cột `read` của P2, `push latest status` | read view dựng `credit C: done ✓ @ e88`; đẩy về proxy của P2 | $0 | $1 |
| 10 | 13–14 | `P2 done ✓` → coordinator → bảng | ghi `P2 credit: done`, lần ghi bảng thứ ba và cuối của Figure 29 | $0 | $1 |
| 11 | 15 | `result` → user | giao dịch xong, trả kết quả | $0 | $1 |

**Ba điều khán giả nên mang về:**
1. **Hai tầng, hai trách nhiệm.** Bên trong partition, Raft giữ thứ tự và độ bền của event. Giữa các partition, Saga giữ thứ tự trừ trước, cộng sau. Không tầng nào làm được việc của tầng kia.
2. **Trạng thái trung gian vẫn tồn tại.** Giữa bước 4 và bước 8, A $0 và C $0. Thiết kế không giấu nó như 2PC. Nó **theo dõi** trạng thái đó bằng phase status table, và **đóng** nó bằng hoàn tất hoặc bù.
3. **"Success" có nghĩa chính xác.** Ở mỗi partition: event đã commit, và read path của partition đó đã xử lý nó (`@ e43`, `@ e88`). Ở cả giao dịch: coordinator đã ghi dòng cuối, `P2 credit: done`, rồi trả `result`.

**Mỗi chặng trả một món nợ và để lại một món nợ:**

| Thiết kế | Giải được | Để lại |
|---|---|---|
| Redis shard (slide 6) | nhanh, đơn giản | không bền, không nguyên tử |
| Database + 2PC / TC/C / Saga (slide 7–10) | điều phối được debit và credit | không audit được lịch sử |
| Event sourcing qua Kafka và DB ở xa (slide 11–15) | audit, replay, CQRS | chậm: nhiều lượt mạng mỗi lệnh |
| File cục bộ, `mmap`, state cục bộ (slide 16) | một nhóm rất nhanh | một máy giữ dữ liệu; ghi `mmap` chưa bền |
| Raft, chống trùng theo mã (slide 17–18) | tin cậy: một máy chết không mất event | một nhóm có trần |
| Partition, Saga, reverse proxy và push status (slide 19–21) | tăng tổng thông lượng, điều phối chéo partition, trả kết quả đồng bộ | số nhóm phải đo (slide 23 chỉ ước lượng); tài khoản nóng phải tách tài khoản con |

## 8. Dẫn dắt sang slide 23

- **Điều slide này để lại:** một bản đồ đủ. Mỗi khối có lý do tồn tại, và đường đi của tx 7f3c chạy trọn trên đó. Nhưng chưa ai hỏi bản đồ này có giữ được lời hứa của đầu bài không: năm yêu cầu của slide 2 chưa được đối chiếu, và yêu cầu khó nhất, một triệu giao dịch mỗi giây, chưa có con số nào. Bản đồ cũng chưa nói cần bao nhiêu nhóm, bao nhiêu coordinator.
- **Câu nối gợi ý:** "Bản đồ đã đủ. Câu cuối cùng: nó có đạt mục tiêu ta đặt ra ở slide 2 không, nhất là một triệu giao dịch mỗi giây?"
- **Đừng kết bài ở đây.** Chưa cảm ơn, chưa mở hỏi đáp. Lời kết, lời cảm ơn và gợi ý cho phần hỏi đáp nằm ở sổ tay 23, mục 8. Có người hỏi luôn "đạt 1M TPS chưa?" thì nói "đó đúng là slide tiếp theo", rồi chuyển.
- **Khán giả sẽ thấy ở slide 23, slide cuối:** headline `Capacity plan for 1M transfers/s`, lede *Back to the goal: every layer is partitioned, so 1M transfers/s becomes a count of groups.* Lời nói mở bằng việc đối chiếu năm yêu cầu của slide 2 với bản đồ này; phần đó không vẽ trên hình. Trên hình, khung nét đứt `assumption, not a benchmark` hiện sẵn (`scale target: 1,000,000 transfers/s`, `batch ≈ 1 ms (1 fsync + 1 round trip) × ~100 commands → ~100,000 ops/s per group`, `run at 70% → 70,000 ops/s per group`). Lời nói giải thích vì sao một nhóm làm được cỡ đó: Raft trả giá theo **lô**, không theo từng lệnh **[Ngoài sách]**. Rồi bốn bước tự chạy:
  1. `wallet partitions · by account id`: `2,000,000 ops/s` `÷ 70,000 per group` → `≈ 29 Raft groups`.
  2. `Saga coordinators + phase status · by tx id`: `3,000,000 appends/s` (`1M × 3 phase records`) `÷ 70,000 per shard` → `≈ 43 shards`, kèm `no hot key` và `append + batch → fewer shards`.
  3. `≈ 72 groups × 3 replicas ≈ 216 replicas`, kèm ghi chú router, reverse proxy, tiến trình coordinator không giữ state. Router ở đây là khối **[Ngoài sách]** của slide 20; bản đồ này không vẽ nó.
  4. Khung đỏ `what more groups cannot fix`: `account M` kẹt ở `≤ 70,000 ops/s`, tách thành `M#1 … M#8` (`8 × 70,000 ≈ 560,000 ops/s`), rồi `then benchmark end to end`.

  Hai khối của bản đồ này được đếm: các hộp partition thành hàng 1; khối `Saga coordinator` cùng `phase status table` thành hàng 2.
