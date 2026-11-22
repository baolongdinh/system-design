# Slide 19 — Capacity ceiling of one group

> **Ý chính:** Vẫn là **một** Raft group giữ mọi tài khoản. Mỗi command trong nhóm đi qua **bốn đoạn, theo thứ tự**: nối command vào `commands.log`, validate và đọc state, ghi bền event vào `events.log`, chờ Raft quorum. Cả nhóm có một **tốc độ phục vụ C**: số lệnh mỗi giây nó xử lý được. C phải **đo**, không suy ra được. Nếu lệnh đến **liên tục** nhanh hơn C, hàng chờ chỉ dài thêm. Bộ đệm lớn hơn chỉ **trì hoãn** lúc đầy. Muốn tăng **tổng** thông lượng thì phải có **nhiều nhóm độc lập**. Sách: *"The capacity of a single Raft group is limited."*

**Chặng:** 6 · Scale out + Saga · **Nguồn (footer `Book:`):** Distributed event sourcing: the capacity of a single Raft group is limited, p.539. Phần hàng chờ và tốc độ phục vụ là cách diễn đạt **[Ngoài sách]** · **Bước bấm:** 3 (tự chạy, 0,6 giây mỗi bước; nhấn A để bấm từng bước)

---

## Hiểu nhanh trước khi nhìn hình

**Một nhóm là một đường ống có trần.** Mọi lệnh, của mọi tài khoản, đi qua **một** leader, nối vào **một** log, chờ **một** vòng quorum. *Quorum* là đa số máy trong nhóm, ở đây 2 trên 3. Các tối ưu ở slide 16 (file cục bộ, RocksDB) làm mỗi lệnh rẻ hơn, nên C lớn hơn. Nhưng C vẫn là một con số hữu hạn. Hình cố ý **không ghi con số** cho C.

**Chữ C trên đồng hồ không phải tài khoản C.** Ở đây `C` là **service rate**, tốc độ phục vụ. Tài khoản C chỉ xuất hiện trong thẻ `A→C $1` ở đầu hàng chờ. Nói rõ một câu để khán giả khỏi lẫn.

**Mỗi thẻ là một transfer trọn vẹn.** Nhóm giữ mọi tài khoản, nên `A→C $1 · tx 7f3c` vào nhóm như **một** command, đúng như slide 18. Chia một transfer thành hai thao tác theo tài khoản là chuyện của slide 20.

**Hai tốc độ.** *Arrival rate* là số lệnh đến mỗi giây. *Service rate* C là số lệnh nhóm làm xong mỗi giây. Đến nhanh hơn làm thì hàng chờ dài ra. Chỉ vậy thôi.

**Notebook này giữ thêm một kỹ thuật tùy chọn** từ slide ring buffer trong bản 2 (đã bỏ ở bản 4): cách trao lệnh từ nhiều luồng mạng sang một luồng xử lý. Kỹ thuật đó là **[Ngoài sách]** và không nâng trần C. Nó nằm ở mục 5 và 7.

## 1. Slide này để làm gì

Mở chặng 6. Chuyển câu hỏi từ "một nhóm có đúng không" sang "một nhóm có **đủ** không". Chuẩn bị cho đòn bẩy thứ hai của slide 4: tăng **số nhóm** (slide 20).

## 2. Đọc hình

- Headline `Capacity ceiling of one group`. Lede: *Where is the throughput limit?*
- Bên trái: hàng `Command queue (FIFO)` với vạch `arrival rate`. Lúc đầu có hai thẻ: `A→C $1 · tx 7f3c` ở đầu hàng, `D→B $2 · tx 62bd` sau nó.
- Bên phải: khung bo tròn `one Raft group`. Không có tên P1: đây vẫn là nhóm duy nhất của slide 16–18.

Diễn biến:
1. Trong khung hiện bốn đoạn, theo thứ tự từ trái sang phải:
   - `commands.log append` (`mmap`)
   - `validate + state check` (`RocksDB`)
   - `events.log durable write` (`fsync`)
   - `Raft quorum` (ba chấm, `2 of 3 ack`)

   Phía trên khung là đồng hồ `service rate C` (`measured ops/s`), thang từ `0` tới `C`, kim chạm vùng đỏ, tag `ceiling (max)`.
2. Hàng chờ dài thêm hai thẻ đỏ ở cuối: `B→A $2 · tx 33ee` và `E→A $5 · tx c4e2`. Tag đỏ `arrivals > C → backlog grows`.
3. Dưới hàng chờ: hộp `a bigger buffer only delays the moment it fills`. Bên phải: hộp xanh `more independent groups → more total throughput`.

Dải bước dưới hình: (1) `Four stages per command, in order` · (2) `Arrivals faster than service → backlog grows` · (3) `Only more independent groups raise the total`.

## 3. Trình bày theo bước

| Bước | Trên màn hình | Nói |
|---|---|---|
| 1 | Bốn đoạn, đồng hồ, ô bước 1 | "Vẫn là nhóm Raft duy nhất, giữ mọi tài khoản. Mỗi lệnh đi qua bốn đoạn, đúng thứ tự ta đã thấy: nối command vào command log, validate và đọc state, ghi bền event, rồi chờ Raft quorum. Cả nhóm có một tốc độ phục vụ C, số lệnh mỗi giây đo được. Hình không ghi con số, vì con số đó phải đo. Và chữ C trên đồng hồ là tốc độ, không phải tài khoản C trong thẻ A sang C." |
| 2 | Hàng chờ dài ra, tag đỏ, ô bước 2 | "Nếu lệnh đến liên tục nhanh hơn C, hàng chờ chỉ có dài ra. Không có phép màu nào ở đây." |
| 3 | Hộp bộ đệm, hộp xanh, ô bước 3 | "Một bộ đệm lớn hơn chỉ trì hoãn lúc đầy, không làm nhóm nhanh hơn. Muốn tăng tổng thông lượng, phải có nhiều nhóm độc lập. Sách nói đúng như vậy: sức chứa của một Raft group là có hạn; tới một quy mô nào đó, phải chia dữ liệu." |

## 4. Giải thích sâu

- **Câu của sách (p.539).** Sức chứa của một Raft group có hạn. Tới một quy mô nào đó, phải chia dữ liệu (*shard*) và làm giao dịch phân tán.
- **Lời interviewer dẫn vào phần này.** Một server không đủ cho 1 triệu TPS; làm sao cho hệ thống scale hơn?
- **Thứ tự bốn đoạn theo sách (Figure 29, bước 4).** Leader nhận command, lưu vào command list, **rồi** validate. Hợp lệ thì đổi thành event, rồi Raft đồng bộ. Đường ống vẽ đúng chuỗi đó, giống bước 1 của slide 18.
- **Vì sao một nhóm có trần.** Chỉ leader quyết định (slide 18). Mọi event của nhóm nối vào một log, theo một thứ tự. Mỗi event phải được đa số lưu bền trước khi apply. Không đoạn nào chia được cho nhiều leader cùng làm, vì thứ tự trong log là một.
- **Bốn đoạn, bốn loại chi phí [Ngoài sách: phân tích]:**

| Đoạn | Tốn gì | Tối ưu đã có |
|---|---|---|
| `commands.log append` | ghi tuần tự vào file | nối thêm (slide 16), `mmap` (sổ tay 16) |
| `validate + state check` | CPU, đọc RocksDB (thường đã nằm trong cache) | state cục bộ (slide 16) |
| `events.log durable write` | ghi trang, chờ `fsync` theo chính sách | nối thêm, gom lô (sổ tay 16) |
| `Raft quorum` | một vòng mạng tới follower, chờ follower ghi bền | đa số, follower chậm không chặn (slide 18) |

- **Đây là đòn bẩy của slide 4.** Chặng 4–5 tăng thông lượng **mỗi nhóm**. Slide này nói đòn bẩy đó có trần, nên chặng 6 tăng **số nhóm**.

## 5. Câu hỏi có thể gặp

- **"Sao không tăng C bằng cách gom lô, chạy song song?"** [Ngoài sách] Gom lô (nhiều event một lần `fsync`, nhiều entry một lượt Raft) và pipeline (gửi entry kế tiếp trước khi entry trước được xác nhận) đều làm C lớn hơn, và nên làm. Nhưng C vẫn hữu hạn: vẫn một log, một thứ tự, một leader.
- **"Sao ghi command trước khi validate? Command sai cũng bị ghi à?"** Đúng, sách làm vậy (Figure 29, bước 4). Command bị từ chối vẫn nằm trong `commands.log`, nhưng không sinh event nào (slide 18, notebook 18). `commands.log` ghi thứ tự **đến**. `events.log` ghi những gì **đã xảy ra** với số dư.
- **"Đặt hàng đợi to hơn để hấp thụ tải được không?"** Được cho các đợt tăng ngắn. Không được cho tải **liên tục** lớn hơn C: hàng đợi to chỉ đầy chậm hơn. Khi đầy, phải báo bên gửi chậm lại (*backpressure*) hoặc từ chối nhanh.
- **"Hàng chờ dài thì chậm một chút, có sao đâu?"** [Ngoài sách: lý thuyết hàng đợi] Khi tải tiến gần C, thời gian chờ tăng rất nhanh, không tăng đều. Vì vậy slide 23 chỉ cho mỗi nhóm chạy tới khoảng 70% C, để còn dư địa.
- **"Mua máy mạnh hơn thì sao?"** C tăng, nhưng có giới hạn phần cứng. Vòng quorum vẫn phải đi qua mạng tới máy khác. Scale dọc có trần; scale ngang bằng nhiều nhóm thì không có trần rõ ràng ở tầng này.
- **"Nhiều luồng mạng nhận lệnh, chỉ một luồng được quyết định. Trao lệnh giữa hai bên bằng gì cho rẻ?"** [Ngoài sách: kỹ thuật tùy chọn] Một cách là **ring buffer** trong RAM: một mảng vòng có số ô cố định, cấp phát sẵn. Nhiều luồng ghi vào, **một** luồng chủ (*owner thread*) đọc ra. Ý tưởng lấy từ Chapter 13 (Stock Exchange) và thư viện LMAX Disruptor. Chapter 12 không yêu cầu nó. Cách hoạt động ở mục 7.
- **"Ring buffer có làm nhóm nhanh hơn C không?"** [Ngoài sách] Gần như không, nếu nút thắt nằm ở `fsync` hay quorum. Ring chỉ làm rẻ chỗ trao tay giữa các luồng. Ring nhanh **không chứng minh** hệ thống đạt một triệu TPS.
- **"Ring đầy thì sao? Máy chết khi lệnh còn trong ring thì sao?"** [Ngoài sách] Ring đầy thì backpressure; **không bao giờ ghi đè** ô chưa xử lý. Ring chỉ ở RAM, nên máy chết thì lệnh trong ring mất. Chưa lệnh nào trong đó được báo thành công, nên bên gọi thấy timeout và gửi lại cùng mã (sổ tay 18).

## 6. Đừng nói sai

- Đừng đưa một con số cụ thể cho C ("một nhóm làm được X nghìn TPS"). Hình cố ý không có số.
- Đừng nói "bộ đệm lớn giải quyết quá tải".
- Đừng nhầm `C` (service rate) với tài khoản C.
- Đừng đọc đường ống thành "validate trước, rồi ghi `commands.log` và `events.log` cùng lúc". Command được nối vào `commands.log` **trước** khi validate; event được ghi **sau** khi validate.
- Đừng gọi thẻ `E→A $5` là `tx 91ab`. `tx 91ab` là lệnh A→B $1 bị từ chối ở slide 12; thẻ này là `tx c4e2`.
- Đừng gọi khung này là P1, và đừng tách thẻ `A→C $1` thành "A −$1". Đây là nhóm Raft duy nhất, nhận cả transfer; P1 và hai thao tác theo tài khoản chỉ có từ slide 20.
- Đừng nói "Chapter 12 dùng ring buffer" hay "kiến trúc LMAX của Chapter 12". Ring buffer là lựa chọn triển khai ngoài sách.
- Đừng nói "ring là log bền", hay "ring đầy thì ghi đè ô cũ".

## 7. Giải thích chi tiết

**Hai tốc độ, một hàng chờ [Ngoài sách].** Gọi tốc độ đến là λ, tốc độ phục vụ là C.
- λ < C: hàng chờ lúc dài lúc ngắn, nhưng không tăng mãi.
- λ = C: không còn dư địa. Mọi đợt tăng ngắn đều để lại hàng chờ.
- λ > C liên tục: mỗi giây hàng chờ dài thêm λ − C lệnh. Sau một phút, nó dài thêm 60 × (λ − C).

**Ví dụ chạy tay, số giả định để nhẩm.** Tải đến là 1,2 × C:
- Mỗi giây dư ra 0,2 × C lệnh.
- Bộ đệm chứa được C lệnh (một giây làm việc) thì đầy sau 5 giây.
- Gấp đôi bộ đệm thì đầy sau 10 giây. Kết cục như nhau: đầy, rồi phải từ chối hoặc làm chậm bên gửi.

**Vì sao trần nằm ở cả nhóm, không ở một đoạn.** Bốn đoạn nối tiếp nhau trên đường đi của mỗi lệnh. Đoạn chậm nhất quyết định C. Làm nhanh một đoạn thì đoạn khác thành nút thắt:
- Validate rất nhanh (dữ liệu trong RAM) nhưng `fsync` chậm: C bị flush giới hạn.
- Flush gom lô tốt nhưng follower ở xa: C bị vòng quorum giới hạn.

Vì vậy slide 23 nói phải đo **cả** Raft group, không đo riêng RocksDB hay riêng ổ đĩa.

**Vì sao không chia một nhóm cho nhiều leader.** Nhóm giữ thứ tự cho các tài khoản của nó. Hai leader cùng nối vào một log thì phải thống nhất thứ tự với nhau ở từng event, tức là lại cần đồng thuận cho chính việc chia. Cách duy nhất để có nhiều người quyết định song song là cho họ **những tài khoản khác nhau**: mỗi nhóm một tập tài khoản, một log, một leader. Đó là partition, slide 20.

**Kỹ thuật tùy chọn: ring buffer ở cửa vào [Ngoài sách: toàn bộ phần này].**

*Vì sao cần chỗ trao tay.* Luồng mạng làm việc song song được: đọc socket, giải mã, xác thực. Luồng chủ làm việc phải tuần tự: validate, nối log. Nếu luồng mạng gọi thẳng vào state machine thì phải khóa số dư.

*Ring hoạt động thế nào.* Lấy một ring 8 ô làm ví dụ:
- Có một bộ đếm số thứ tự chỉ tăng. Vị trí ô = số thứ tự chia lấy dư cho 8. Số 125 dùng lại ô của 117.
- Mỗi luồng mạng **giành** một số thứ tự (một phép tăng nguyên tử), ghi lệnh vào ô của số đó, rồi đánh dấu ô đã sẵn sàng.
- Luồng chủ đọc ô `next` theo đúng số thứ tự, nối lệnh vào `commands.log`, rồi validate như slide 18. Nếu ô `next` chưa sẵn sàng, nó chờ, kể cả khi ô sau đã sẵn sàng.
- Luồng mạng không được giành số vượt quá `next + 8`. Đó là lúc ring đầy: backpressure.

*Thứ tự được chốt ở đâu.*
- Không có hàng đợi bền phía trước: thứ tự là thứ tự **giành số** trong ring. Nó chỉ thành **bền** khi luồng chủ nối lệnh vào `commands.log`.
- Có Kafka hay một hàng đợi bền phía trước: thứ tự đúng là **offset** của hàng đợi. Ring chỉ giữ được thứ tự đó khi mỗi nhóm có **một** luồng đọc hàng đợi và ghi vào ring theo đúng offset (một bên ghi, một bên đọc, gọi là SPSC). Ba luồng cùng đọc rồi cùng ghi vào ring thì thứ tự có thể đảo: luồng đọc offset 11 có thể giành số trước luồng đọc offset 10. Với ví, đảo hai lệnh của cùng một tài khoản có thể đổi kết quả validate.
- Thứ tự **event** cuối cùng vẫn do Raft log của nhóm chốt (slide 18).

*So sánh ba chỗ giữ lệnh:*

| | Ring (RAM) | `commands.log` | Kafka / hàng đợi bền |
|---|---|---|---|
| Bền khi máy chết | không | có, theo chính sách flush | có |
| Kích thước | cố định | lớn, theo đĩa | lớn |
| Đầy thì | backpressure | hiếm khi đầy | backlog tăng trong hàng |
| Có trong Chapter 12 | không | có (command list) | có (thiết kế slide 12) |
| Dùng để | trao tay rẻ giữa các luồng | chốt thứ tự bền, dấu vết | hàng đợi bền trước node |

*Mỗi nhóm một ring.* Một ring chung cho mọi nhóm nghĩa là một luồng chủ cho mọi nhóm: lại một trần duy nhất. Nếu dùng, mỗi nhóm có ring và luồng chủ của riêng nó. Chỉ nên thêm ring khi benchmark cho thấy chỗ trao tay thật sự là nút thắt.

**Nối với slide 4.** Table 1 của sách: cùng 2 triệu thao tác mỗi giây, 1.000 TPS mỗi node cần 2.000 node; 10.000 TPS mỗi node cần 200 node. Slide này nói con số "mỗi node" có trần. Phép chia tổng tải cho C quay lại ở slide 23. Lưu ý đơn vị: ở slide này một lệnh là cả một transfer, vì nhóm giữ mọi tài khoản. Từ slide 20, mỗi lệnh là một thao tác ví cho một tài khoản, nên slide 23 chia 2 triệu thao tác ví mỗi giây cho số thao tác một nhóm làm được.

## 8. Dẫn dắt sang slide 20

- **Điều slide này để lại:** một nhóm có trần, nên phải chia thành nhiều nhóm. Nhưng chia theo gì, mà vẫn giữ thứ tự lệnh của từng tài khoản?
- **Câu nối gợi ý:** "Đòn bẩy thật sự là nhiều nhóm. Chia tài khoản ra sao để chạy song song mà không đảo thứ tự của một ví?"
- **Khán giả sẽ thấy ở slide 20:** máy quay lùi ra. Cột `Incoming commands` bên trái, hộp `partition router` với quy tắc `hash(account_id) % N`, và các partition `P1 · holds A, B, D`, `P2 · holds C, E`, `P3`, `PN`. Ba bước, tự chạy.
