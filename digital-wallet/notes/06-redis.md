# Slide 6 — Attempt 1: shard balances across Redis

> **Ý chính:** Lưu số dư trong nhiều node Redis, chia theo hash của tài khoản. Phía trước là một wallet service stateless. Thiết kế này nhanh và mở rộng được. Nhưng một lần chuyển là **hai lệnh ghi trên hai node**, và không có gì bao chúng lại thành một đơn vị. Service chết giữa hai lệnh là mất $1.

**Chặng:** 1, In-memory shards · **Nguồn:** Book: In-memory sharding solution, Fig 3, p.502–503 · **Bước bấm:** 4

---

## Hiểu nhanh trước khi nhìn hình

**Ba thành phần:**
- **Redis**: một kho key-value nằm trong RAM. Ở đây mỗi key là một tài khoản, value là số dư. Có ba node: Redis 1 giữ A ($1), Redis 2 giữ B ($5), Redis 3 giữ C ($0).
- **Zookeeper**: nơi lưu cấu hình, cụ thể là **partition map**: tài khoản nào nằm ở node nào. Ở đây A → Redis 1, C → Redis 3.
- **Wallet service**: nhận lệnh chuyển tiền và cập nhật Redis. Nó **stateless**: không giữ số dư, không ghi lại tiến độ. Vì vậy thêm bao nhiêu bản chạy song song cũng được.

**Chia tài khoản ra node thế nào:** `partition = hash(account) % 3`. Lấy tên tài khoản, băm (hash) ra một số, rồi chia lấy dư cho 3. Kết quả 0, 1 hay 2 cho biết node nào giữ tài khoản đó. Kỹ thuật này gọi là **sharding**: mỗi node giữ một phần dữ liệu.

**Điểm gãy:** Wallet service gửi `A −$1` tới Redis 1. Lệnh thành công, A = $0. Ngay sau đó service chết, trước khi gửi `C +$1` tới Redis 3. C vẫn $0. Tổng A + C từ $1 thành $0. Đây đúng là kẹt ở khung giữa của slide 3. Không có gì trong hình buộc bước còn lại phải chạy.

## 1. Slide này để làm gì

Cho khán giả thấy **tận mắt** thất bại của khung giữa (slide 3). Đây là động lực cho cả phần distributed transaction ở slide 7–10.

## 2. Đọc hình

**Dòng ngữ cảnh:** *Accounts spread by `hash(account) % N`; a stateless wallet service applies each transfer.*

**Luôn hiện (bước 0):**
- Góc trái trên: biểu tượng **Client** và vé lệnh `A→C $1`.
- Hai khối **Wallet service 1** và **Wallet service 2**.
- Góc phải trên: thẻ **Zookeeper**, tiêu đề phụ *partition map*. Ba dòng: `A → Redis 1`, `B → Redis 2` (chữ nhạt), `C → Redis 3`. Bên cạnh là công thức `partition = hash(account) % 3`.
- Hàng dưới: ba node **Redis 1** (`A: $1`), **Redis 2** (`B: $5`), **Redis 3** (`C: $0`).

**Theo bước:**
- **Bước 1:** mũi tên từ vé `A→C $1` vào Wallet service 1, huy hiệu 1. Hai dòng `A → Redis 1` và `C → Redis 3` trong thẻ Zookeeper được đóng khung.
- **Bước 2:** mũi tên xanh lá gấp khúc từ Wallet service 1 xuống Redis 1, nhãn `A −$1`, huy hiệu 2. Ô của Redis 1 đổi thành `A: $0`, viền xanh lá.
- **Bước 3:** tia sét đỏ đánh vào đáy Wallet service 1, nhãn `crashes here`, huy hiệu 3.
- **Bước 4:** đường đỏ nét đứt đi từ Wallet service 1 sang phải, về phía Redis 3, rồi bị chặn bởi dấu ✕. Nhãn `C +$1 never sent`, huy hiệu 4. Giữa hình hiện thẻ đỏ `A + C = $0 → $1 lost`.

Wallet service 2 không làm gì trong kịch bản. Nó có mặt để cho thấy service chạy được nhiều bản song song.

**Dải bước dưới sơ đồ:**
1. Find A and C in the Zookeeper map
2. `A −$1` on Redis 1 succeeds
3. The wallet service crashes
4. C is never credited: $1 lost

**Footer:** *Book: In-memory sharding solution, Fig 3, p.502–503*; góc phải ghi phần *In-memory shards*.

## 3. Trình bày theo bước

Mặc định các bước tự chạy, cách nhau 0,6 giây. Nhấn A nếu muốn bấm từng bước.

| Bước | Hình và dải bước | Nói |
|---|---|---|
| 0 | Toàn cảnh | "Số dư chỉ là một cái map từ tài khoản sang số tiền, nên key-value store là hợp. Một node Redis không chịu nổi một triệu TPS, nên ta chia tài khoản ra nhiều node theo hash. Zookeeper giữ bản đồ: tài khoản nào ở node nào. Wallet service đứng trước, stateless." |
| 1 | Vé vào Wallet service 1; dòng A và C trong map được đóng khung; ô 1 hiện | "Wallet service 1 nhận lệnh A sang C một đô, kiểm tra hợp lệ, rồi tra bản đồ: A ở Redis 1, C ở Redis 3." |
| 2 | `A −$1` xuống Redis 1, ô thành `A: $0`; ô 2 hiện | "Lệnh ghi thứ nhất thành công. A còn không." |
| 3 | Tia sét, `crashes here`; ô 3 hiện | "Đúng lúc đó node wallet service này chết." |
| 4 | `C +$1 never sent`, thẻ `A + C = $0 → $1 lost`; ô 4 hiện | "Lệnh cộng cho C không bao giờ được gửi. C vẫn là không. Tổng từ một đô thành không. Và không ở đâu ghi lại rằng có một lần chuyển đang làm dở." |

Sau bước 4, khen trước rồi chê:
- **Phần đúng:** wallet service stateless thì thêm máy là chịu thêm tải; chia theo hash thì tải đều. Hai ý này sống sót tới thiết kế cuối (slide 20 và 23).
- **Phần sai:** câu chốt của interviewer trong sách: thiết kế này chạy được, nhưng không đạt yêu cầu tính đúng; hai cập nhật phải nằm trong một giao dịch nguyên tử.

## 4. Giải thích sâu

- **Phần nào đúng.** Sách viết *"The wallet service is stateless. It is easy to scale horizontally."* Chia theo hash giúp tài khoản rải đều trên các node. Cả hai ý xuất hiện lại khi chia partition ở slide 20.
- **Phần nào sai.** Sách: thiết kế *"works, but it does not meet our correctness requirement"*. Wallet service cập nhật hai node Redis cho mỗi lần chuyển, và không có gì bảo đảm cả hai cùng thành công. *"The two updates need to be done in a single atomic transaction."*
- **Vấn đề thứ hai: độ bền.** Phần tổng kết của sách nhắc: dữ liệu trong phương án Redis này **không bền** (*"data isn't durable"*), vì nằm trong RAM. Redis có chế độ ghi xuống đĩa riêng, nhưng bật nó lên vẫn không biến hai node thành một giao dịch nguyên tử **[Ngoài sách]**.
- **Vì sao không phát hiện được lỗi.** Trạng thái "đã trừ A, chưa cộng C" chỉ nằm trong bộ nhớ của wallet service đã chết. Đây là manh mối cho về sau: tiến độ phải được **ghi xuống chỗ bền**. Ý này quay lại ở phase status table (notebook 8 và slide 9) và event log (slide 13).
- **Wallet service đọc bản đồ partition ở đâu [Ngoài sách].** Sách chỉ nói Zookeeper là *"highly-available configuration storage"*, nơi lưu số partition và địa chỉ các node Redis. Cách dùng thông thường: mỗi wallet service giữ một **bản sao** bản đồ trong bộ nhớ, và chỉ làm mới khi bản đồ thay đổi. Nó không hỏi Zookeeper cho từng lần chuyển. Hình không vẽ chi tiết này.

## 5. Câu hỏi có thể gặp

- **"Redis có `MULTI/EXEC` hay Lua script mà?"** Có, nhưng các cơ chế đó chỉ nguyên tử **trong một node**. A ở Redis 1, C ở Redis 3. Redis Cluster cũng không có transaction chéo node **[Ngoài sách]**.
- **"Thêm retry ở wallet service là xong?"** Retry cần biết đang làm dở cái gì. Thông tin đó đã chết theo tiến trình. Hơn nữa, retry lệnh trừ tiền mà không có khóa chống trùng (slide 5) thì có thể trừ hai lần.
- **"Mỗi lần chuyển đều hỏi Zookeeper thì nó có thành nút cổ chai không?"** Có, nếu làm vậy: một triệu lần chuyển mỗi giây là một triệu lượt đọc. Vì thế wallet service giữ bản sao bản đồ trong bộ nhớ và chỉ làm mới khi bản đồ đổi **[Ngoài sách]**.
- **"Bản sao cũ thì sao, lỡ bản đồ vừa đổi?"** Trong một khoảng ngắn, service có thể gửi nhầm tới node cũ. Cách xử lý thường gặp: node từ chối key không thuộc mình; service làm mới bản đồ rồi gửi lại **[Ngoài sách]**. Sách không đi vào chi tiết này.
- **"Sao không để A và C cùng một node?"** Với hàng trăm triệu tài khoản, cặp nào cũng có thể chuyển cho nhau. Không thể xếp chỗ để mọi cặp luôn nằm cùng node.
- **"Hash `% 3` hay `% 7`?"** Hình dùng 3 node cho gọn. Pseudocode trong sách dùng `partitionNumber = 7`. Dòng ngữ cảnh ghi `% N` cho trường hợp tổng quát.

## 6. Đừng nói sai

- Sách vẽ ví dụ chuyển từ A sang **B**. Slide dùng **A → C** để thống nhất với các slide khác. Bản chất không đổi.
- Đừng nói "wallet service hỏi Zookeeper cho mỗi giao dịch". Nói: "wallet service tra bản đồ partition, lấy từ Zookeeper". Chi tiết bản sao trong bộ nhớ là **[Ngoài sách]**.
- Đừng nói "Redis làm mất tiền". Redis làm đúng từng lệnh nó nhận. Tiền mất vì **không ai** giữ lời hứa gửi lệnh thứ hai.

## 7. Giải thích chi tiết

**Thiết kế đơn giản nhất.** Số dư chỉ là một map `account → balance`. Key-value store như Redis là lựa chọn tự nhiên, và nó rất nhanh vì dữ liệu nằm trong RAM. Một node Redis không chịu nổi 1 triệu TPS, nên ta chia dữ liệu ra nhiều node. Quy tắc chia là `hash(account) % N`: băm tên tài khoản ra một số, chia lấy dư cho số node. Với 3 node, A rơi vào Redis 1, B vào Redis 2, C vào Redis 3.

**Ai làm gì.**
- **Zookeeper** giữ bản đồ: có bao nhiêu partition, partition nào ở địa chỉ nào.
- **Wallet service** nhận lệnh, kiểm tra, tra bản đồ, rồi gửi hai lệnh ghi tới hai node Redis.
- **Redis** làm đúng lệnh nó nhận: trừ hoặc cộng một con số.

**Phần đúng, nên khen trước khi chê.**
- Wallet service stateless: thêm máy là chịu thêm tải; máy chết thì máy khác làm thay.
- Chia theo hash: tải rải đều, không node nào bị dồn.

Cả hai ý **sống sót tới thiết kế cuối**. Hãy nhấn mạnh để khán giả nhận ra khi gặp lại ở slide 20 và 23.

**Phần sai: đi lại đúng kịch bản trên hình.**
1. Lệnh A → C $1 tới Wallet service 1. Nó tra bản đồ: A ở Redis 1, C ở Redis 3.
2. Nó gửi `A −$1` tới Redis 1. Thành công. A = $0.
3. Wallet service 1 chết, **trước** khi gửi lệnh cộng C.
4. C không bao giờ được cộng. C = $0. Tổng từ $1 thành $0.

Đây là kẹt ở **khung giữa** của slide 3. Tệ hơn: **không ở đâu ghi lại** rằng có một lần chuyển đang làm dở. Wallet service 2 vẫn sống, nhưng nó không biết gì về lệnh này. Một tiến trình khác có khởi động lại cũng không biết phải cộng cho ai.

**Hai bài học dẫn tới các thiết kế sau.**
- Hai cập nhật trên hai máy phải được bao lại thành **một đơn vị nguyên tử**. Đó là động lực cho distributed transaction (slide 7–10).
- Tiến độ của lần chuyển phải được **ghi xuống chỗ bền**, không chỉ nằm trong RAM của một tiến trình. Ý này quay lại ở phase status table (notebook 8 và slide 9) và event log (slide 13).

Ngoài ra, sách còn nhắc: dữ liệu nằm trong RAM của Redis nên **không bền**. Một node Redis mất điện là mất số dư.

## 8. Dẫn dắt sang slide 7

- **Điều slide này để lại:** cần một cách để hai cập nhật trên hai máy cùng thành công hoặc cùng thất bại.
- **Câu nối gợi ý:** "Muốn có tính nguyên tử, bước đầu tiên là thay Redis bằng database quan hệ có transaction. Nhưng một database chỉ lo được transaction của chính nó. Nó không bao trọn được một lần chuyển nằm trên hai database. Đó là bài toán **distributed transaction**, và lời giải kinh điển đầu tiên là two-phase commit."
- **Khán giả sẽ thấy ở slide 7:** một sơ đồ theo thời gian có ba làn (Coordinator, Database A, Database C), với **thanh khóa màu đỏ cam** chạy dài trên hai làn database. Hãy bảo khán giả để ý độ dài của thanh này.
