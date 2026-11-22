# Slide 17 — What must survive a crash?

> **Ý chính:** Trước khi nói tới Raft, sách hỏi: khi máy chết, **cái gì** bắt buộc phải sống sót? Mọi việc của node chỉ gồm **tính toán** và **dữ liệu**. Tính toán chạy lại được trên máy khác; dữ liệu mất là **mất vĩnh viễn**. Trong bốn loại dữ liệu, **state và snapshot dựng lại được từ event**. **Command không đủ**, vì biến command thành event không chắc deterministic (số ngẫu nhiên, I/O bên ngoài). Vậy **chỉ event cần độ tin cậy cao**. Cách bảo vệ: **chép event list** sang nhiều máy, **không mất event** và **cùng thứ tự trên mọi máy**, bằng **Raft**. Còn **quá nửa** số máy sống thì log trên chúng giống nhau: ba máy chịu được một máy chết, năm máy chịu được hai. Node cũ thành **leader**; hai **follower** giữ bản sao và **sẵn sàng lên thay**.

**Chặng:** 5 · Raft · **Nguồn (footer `Book:`):** Reliability analysis; Consensus, Fig 23, p.534–538 · **Bước bấm:** 3 (tự chạy, 0,6 giây mỗi bước; nhấn A để bấm từng bước)

---

## Hiểu nhanh trước khi nhìn hình

**Một câu hỏi trước Raft.** Slide 16 để lại lời của interviewer: node giờ là stateful, một điểm hỏng đơn. Trước khi chọn cách chữa, sách xác định **chữa cho cái gì**.

**Chưa có `tx 7f3c` trên slide này.** RocksDB ghi `A: $1`: trạng thái **trước** giao dịch. Leader nhận tx 7f3c ở slide 18.

**Bốn từ cần định nghĩa.**
- **Deterministic:** cùng đầu vào thì lần nào cũng ra cùng kết quả.
- **Đồng thuận** (consensus): nhiều máy thống nhất một event list duy nhất, kể cả khi có máy chết.
- **Quá nửa** (majority): với ba máy là hai, với năm máy là ba.
- **Ba vai trò của Raft:** **leader** nhận command và chép event đi; **follower** nhận và giữ bản sao; **candidate** là follower đang ứng cử làm leader mới. Mỗi lúc có tối đa một leader.

**Hai bước, hai luật.** Biến command thành event (validate) **có thể** không deterministic. Apply event vào state thì **bắt buộc** deterministic (slide 14). Chính chỗ lệch này làm command không đủ, còn event thì đủ.

## 1. Slide này để làm gì

Trả lời câu interviewer để lại ở slide 16, theo đúng thứ tự của sách: biết cần bảo vệ gì rồi mới chọn cách bảo vệ. Giới thiệu Raft và ba máy của nhóm, và trả lời câu khán giả hay hỏi: **follower để làm gì?** Slide 18 cho Raft chạy với tx 7f3c.

## 2. Đọc hình

- Headline `What must survive a crash?`. Lede: *The node now holds the only copy of its data. If its disk dies, what is lost?*
- Bên trái: khung `Event-sourcing node` với bốn thẻ: `commands.log` (`requests`), `events.log` (`changes`), hình trụ RocksDB `A: $1` (`state`), và chồng giấy `snapshot` `@ e40`.

Diễn biến:
1. Tia sét đỏ và chip `disk lost` rơi lên node. Bên phải hiện hai dòng: xanh `code → run it again on another node ✓`, đỏ `data → gone with the disk ✕`.
2. `commands.log`, RocksDB và snapshot mờ đi; `events.log` được viền đậm. Dưới mỗi thẻ hiện một nhãn: `may not yield same events` (command, xám), `must survive` (event, nâu vàng), `rebuilt from events ✓` (RocksDB và snapshot, xanh).
3. Header của node đổi thành `Leader` (nền tối, vương miện). Mũi tên nét đứt `copy events` đi sang `Follower 1` và `Follower 2`, mỗi panel có `events.log` với `e41`, `e42`. Dưới hai panel: ô `same events, same order` và ô xanh `works while 2 of 3 are up ✓`.

Dải bước dưới hình: (1) `The node dies: code restarts elsewhere, data does not` · (2) `Only events must survive; state rebuilds from them` · (3) `Raft copies events to two followers, in order`.

## 3. Trình bày theo bước

| Bước | Trên màn hình | Nói |
|---|---|---|
| 0 | Node với bốn thẻ | "Sách không nhảy ngay vào Raft. Trước tiên nó hỏi: cái gì bắt buộc phải sống sót khi máy chết? Trả lời được câu này thì mới biết phải nhân bản cái gì." |
| 1 | `disk lost`, hai dòng code / data | "Mọi thứ một node làm chỉ gồm hai phần: tính toán và dữ liệu. Tính toán thì dễ: chạy lại cùng đoạn code trên máy khác là xong. Dữ liệu thì mất là mất vĩnh viễn. Độ tin cậy của hệ thống gần như chính là độ tin cậy của dữ liệu. Với ví, mất event log là mất lịch sử tiền: không dựng lại được số dư, không kiểm toán được." |
| 2 | Bốn nhãn dưới bốn thẻ | "Bốn loại dữ liệu: command file, event file, state trong RocksDB, và snapshot. State và snapshot: luôn dựng lại được bằng cách replay event, như slide 14. Command: giữ command là đủ? Không, vì biến command thành event không chắc deterministic: có thể dùng số ngẫu nhiên, hay gọi I/O bên ngoài. Còn event là sự thật đã xảy ra, bất biến, và dựng lại được state. Nên chỉ event cần bảo đảm độ tin cậy cao." |
| 3 | `Leader`, `copy events`, hai follower | "Vậy chép event list sang nhiều máy, giữ hai điều: không mất event, và thứ tự giống nhau trên mọi máy. Thứ tự quan trọng vì, như slide 12, thứ tự quyết định kết quả. Sách dùng một thuật toán đồng thuận, cụ thể là Raft. Một leader nhận command và ghi event; hai follower giữ bản sao. Còn quá nửa số máy sống thì log trên chúng giống nhau. Ba máy chịu được một máy chết; năm máy chịu được hai." |
| sau 3 | Hai follower | "Vậy follower để làm gì? Hai việc. Một: giữ bản sao, để máy nào chết thì event vẫn còn. Hai: sẵn sàng lên thay. Leader chết thì Raft tự bầu một follower làm leader mới, và nhóm tiếp tục nhận lệnh. Đó là cách giữ yêu cầu 99,99% của slide 2." |

## 4. Giải thích sâu

- **Dữ liệu và tính toán (p.534–535).** Dữ liệu còn bền thì kết quả tính toán luôn lấy lại được, bằng cách chạy cùng code trên máy khác. Nên chỉ phải lo cho dữ liệu: *"if data is lost, it is lost forever."*
- **Bốn loại dữ liệu (p.535).** File-based command, file-based event, file-based state, state snapshot. State và snapshot tái tạo được bằng replay event list. Command thì không: sinh event có thể có số ngẫu nhiên hay I/O bên ngoài. Event là sự thật lịch sử, bất biến, dựng lại được state. Kết luận: *"Event data is the only one that requires a high-reliability guarantee."*
- **Hai bảo đảm khi nhân bản (p.536).** Không mất dữ liệu; thứ tự tương đối trong log giống nhau trên mọi node. Nhân bản dựa trên đồng thuận đáp ứng cả hai.
- **Raft (p.536–538, Figure 23).** Còn quá nửa số node online thì các append-only list trên chúng có cùng dữ liệu. Ba vai trò: leader, candidate, follower; tối đa một leader, và leader nhận command từ bên ngoài. Ba node chịu được một node hỏng; năm node chịu được hai.
- **Khi máy chết (p.538–539).** Leader chết: Raft tự chọn leader mới trong các node còn khỏe, và nhóm phục vụ tiếp. Follower chết: Raft gửi lại mãi cho tới khi nó khởi động lại hoặc có node mới thay. Chi tiết ở slide 18 và notebook 18.
- **Mọi node đều apply (p.538, Figure 24).** Follower cũng xử lý event list và cập nhật state của mình (sau commit, slide 18). Nên follower lên làm leader là có ngay số dư đúng.

## 5. Câu hỏi có thể gặp

- **"Follower ngồi không chờ leader chết à?"** Không. Nó giữ bản sao **và** apply event đã commit liên tục (slide 18), nên lên thay là chạy được ngay. Nó **không** nhận command và **không** validate; chỉ leader làm việc đó (slide 18).
- **"Sao không backup định kỳ, hay chép bất đồng bộ sang một máy dự phòng?"** **[Ngoài sách]** Bản sao chậm luôn thiếu đúng những event vừa báo thành công cho người dùng. Leader chết lúc đó là mất tiền đã xác nhận.
- **"Sao cần quá nửa, không chờ cả ba máy?"** **[Ngoài sách]** Chờ cả ba thì một máy chậm hay chết làm cả nhóm đứng: lại một điểm hỏng đơn, chỉ đổi chỗ. Quá nửa là điểm giữa.
- **"Sao là ba máy, không phải hai hay bốn?"** **[Ngoài sách: suy ra từ quy tắc quá nửa]** Hai máy cần cả hai, nên một máy chết là dừng. Bốn máy cần ba, vẫn chỉ chịu được một máy chết như ba máy. Nên số máy thường là lẻ.
- **"Nhân bản cũng đi qua mạng. Vậy slide 16 bỏ mạng để làm gì?"** **[Ngoài sách]** Slide 16 bỏ các lượt tới dịch vụ ở xa **trên đường xử lý từng lệnh**. Nhân bản là một lượt gửi **song song** tới các follower, chỉ chờ máy nhanh hơn. Đó là lượt mạng để an toàn, không phải để đi hỏi ai làm việc.
- **"Command không được nhân bản. Leader chết thì mất command à?"** Có thể. Sách kể đúng trường hợp này: leader chết trước khi command thành event. Client thấy timeout hoặc lỗi và gửi lại **cùng command** cho leader mới. Gửi lại an toàn nhờ chống trùng theo `transaction_id` (slide 5, notebook 18).
- **"Hình vẽ snapshot trong node. Không phải snapshot nằm ở HDFS sao?"** Đúng, sách nói snapshot thường lưu ở object storage như HDFS. Hình đặt nó trong khung để đủ bốn loại dữ liệu. Ở đâu thì kết luận cũng vậy: dựng lại được từ event.
- **"Slide 14 nói state machine phải deterministic. Sao giờ lại không?"** Hai bước khác nhau. Apply phải deterministic. Bước sinh event từ command thì không chắc; event ghi lại kết quả của bước đó, nên event đủ còn command thì không.
- **"Ba máy nên đặt ở đâu?"** **[Ngoài sách]** Ở các nơi không hỏng cùng lúc: khác rack, khác nguồn điện, thường là khác availability zone (notebook 16, phần mất điện).
- **"Bầu leader mới thế nào?"** Sách không đi vào chi tiết. Cơ chế candidate, term, phiếu bầu nằm ở notebook 18 **[Ngoài sách: cơ chế Raft]**.

## 6. Đừng nói sai

- Đừng nói "nhân bản cả bốn loại dữ liệu" hay "chép RocksDB sang follower". Chỉ event list được chép.
- Đừng nói "giữ command là đủ để khôi phục". Đó đúng là cái bẫy sách chỉ ra.
- Đừng nói "apply cũng có thể có số ngẫu nhiên". Chỉ bước sinh event là có thể không deterministic.
- Đừng nói "snapshot thay được event". Mất các event sau snapshot thì snapshot không cứu được.
- Đừng nói "ba máy chịu được hai máy chết", hay "Raft cần mọi máy sống".
- Đừng nói "follower nhận command", "follower validate", hay "follower chỉ ngồi chờ".
- Đừng nói "nhân bản không tốn mạng".
- Đừng kể tx 7f3c ở slide này. Nó vào leader ở slide 18.

## 7. Giải thích chi tiết

**Bốn loại dữ liệu, xét từng cái:**

| Thẻ trên hình | Nhãn ở bước 2 | Mất thì sao | Kết luận |
|---|---|---|---|
| `commands.log` | `may not yield same events` | chạy lại chưa chắc ra cùng event | không đủ để bảo vệ |
| `events.log` | `must survive` | sự thật bất biến; mất là mất hẳn | **chép nó** |
| RocksDB | `rebuilt from events ✓` | apply lại event là có | dựng lại được |
| `snapshot @ e40` | `rebuilt from events ✓` | chụp lại từ state | dựng lại được |

**Mất đĩa, đi bằng số.** Snapshot @ e40 ghi A $1, B $4, C $0, D $2. Sau đó là e41 `B −$1`, e42 `D +$1`: tx 51aa, B chuyển D một đô, đã báo thành công.
- **Không có bản sao.** Mất đĩa là mất `events.log`. Nếu snapshot còn sống ở object storage, dựng lại được B $4, D $2: tx 51aa đã báo thành công mà biến mất. Nếu snapshot cũng ở trên đĩa đó thì không còn gì.
- **Có bản sao event.** Follower 1 còn e41, e42 (bước 3). Nạp snapshot @ e40, replay e41, e42: A $1, B $3, C $0, D $3. Đúng từng đô.

**Vì sao command không đủ [Ngoài sách: ví dụ].** Giả sử ví cho chuyển khác loại tiền. Lúc validate, leader gọi dịch vụ tỷ giá (I/O bên ngoài) và ghi số tiền đã quy đổi vào event. Chạy lại command một giờ sau, tỷ giá đã khác, nên event khác và số dư khác. Event thì đã chốt giá trị đó, nên replay lần nào cũng ra cùng kết quả.

**Các cách giữ dữ liệu, so với nhau [Ngoài sách].**

| Cách | Leader chết thì mất gì | Một máy chậm thì sao |
|---|---|---|
| Backup định kỳ | mọi event sau lần backup cuối | không ảnh hưởng |
| Chép bất đồng bộ | event chưa kịp chép, dù đã báo thành công | không ảnh hưởng |
| Chờ mọi máy | không mất | cả nhóm đứng chờ |
| Chờ quá nửa (Raft) | không mất event đã commit | không ảnh hưởng, nếu còn quá nửa |

**Đếm quá nửa.** 3 máy cần 2, chịu được 1 máy chết; 5 máy cần 3, chịu được 2 (sách). 2 máy cần 2, chịu được 0; 4 máy cần 3, chịu được 1 **[Ngoài sách: suy ra]**.

**Vì sao quá nửa là đủ [Ngoài sách: cơ chế Raft].** Hai nhóm quá nửa bất kỳ trong ba máy luôn chung ít nhất một máy. Event đã được quá nửa lưu thì nằm trên ít nhất một máy của mọi nhóm quá nửa về sau. Leader mới cần phiếu của quá nửa, nên luôn đi qua một máy có event đó. Raft dùng điều này để leader mới không thiếu event đã commit (notebook 18).

**Vì sao thứ tự phải giống nhau.** Như slide 12, thứ tự quyết định kết quả. Thêm một lý do **[Ngoài sách]**: "state tại e40" phải là cùng một thứ trên mọi máy. Apply khác thứ tự thì state giữa chừng khác nhau; snapshot chụp ở cùng vị trí sẽ khác, và máy lên làm leader sẽ validate lệnh kế tiếp trên một số dư khác.

## 8. Dẫn dắt sang slide 18

- **Điều slide này để lại:** đã biết phải chép gì (event list) và chép bằng gì (Raft, quá nửa). Chưa thấy một lệnh thật đi qua nhóm, và chưa biết lúc nào event mới đáng tin.
- **Câu nối gợi ý:** "Giờ xem Raft làm việc với đúng giao dịch của ta: leader nhận tx 7f3c, và từ lúc nào event của nó mới đáng tin."
- **Khán giả sẽ thấy ở slide 18:** khung nét đứt `Raft group (3 nodes)` với ba panel `Leader`, `Follower 1`, `Follower 2`; mỗi panel có `events.log` đang dừng ở `e42 D +$1`. Bên phải là panel `Majority consensus`, ghi `majority = 2 of 3`. Ở bước 1, thẻ `tx 7f3c · A→C $1` đi vào leader. Ba bước, tự chạy.
