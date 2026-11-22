# Slide 20 — Partition by account

> **Ý chính:** Nhóm Raft duy nhất của slide 16–19 giờ tách thành nhiều partition P1 … PN, mỗi partition vẫn ba máy, vẫn Raft. Router dùng `hash(account_id) % N` để mọi lệnh của **cùng một tài khoản** luôn vào **cùng một partition**: A, B, D vào P1; C và E vào P2; các tài khoản khác rải tới P3 … PN. Mỗi partition là một Raft group riêng, có thứ tự lệnh, event log và state riêng. Các partition chạy **song song**. Thứ tự chỉ có **bên trong** một partition: **không có event log chung** cho cả hệ thống. Vì A (P1) và C (P2) giờ ở hai partition khác nhau, giao dịch tx 7f3c **tách thành hai thao tác theo tài khoản**: `tx 7f3c · debit A` (A −$1, vào P1) và `tx 7f3c · credit C` (C +$1, vào P2). Câu hỏi quay lại: **ai giữ thứ tự giữa hai bước?** Hình chụp **trước** khi tx 7f3c chạy, nên A vẫn $1.

**Chặng:** 6 · Scale out + Saga · **Nguồn (footer `Book:`):** Distributed event sourcing: distributed transaction, Fig 28, p.539–543; quy tắc hash và Zookeeper ở phần In-memory sharding (p.503) · **Bước bấm:** 3 (tự chạy, 0,6 giây mỗi bước; nhấn A để bấm từng bước)

---

## Hiểu nhanh trước khi nhìn hình

**Ba từ cần định nghĩa.**
- **Partition:** một phần dữ liệu, ở đây là một tập tài khoản. Mỗi partition do một Raft group giữ.
- **Router:** thành phần đọc mã tài khoản trong lệnh và gửi lệnh tới đúng partition.
- **`hash(account_id) % N`:** lấy hash của mã tài khoản, chia lấy dư cho N (số partition). Kết quả là số partition. Cùng một mã luôn cho cùng một kết quả.

**Máy quay lùi ra.** Từ slide 16 tới 19, cả hệ thống là **một** Raft group giữ **mọi** tài khoản. Giờ nhóm đó tách thành N partition P1 … PN. Mỗi partition vẫn ba máy, vẫn Raft, vẫn command file và RocksDB như slide 16–18, nhưng chỉ giữ một tập tài khoản. P1 **không phải** nhóm cũ: nó chỉ giữ A, B, D.

**Đồng hồ quay về trước tx 7f3c.** Slide 18 kết thúc với A $0, C $1 (sau commit, mọi máy apply), trong nhóm duy nhất. Slide này lại cho P1 `state A: $1, B: $3`, P2 `C: $0, E: $4`, và lệnh `A −$1 · tx 7f3c` vẫn đang ở cột bên trái. Đó không phải lỗi. Hình chụp **trước** khi tx 7f3c chạy. Lede không nói điều này, nên người trình bày phải **nói ra**. Slide 21 sẽ đi lại tx 7f3c từ đầu, lần này qua cả hai partition.

**Một transfer thành hai thao tác.** Ở slide 18, tx 7f3c là **một** command: leader validate một lần và sinh hai event e43 `A −$1`, e44 `C +$1` trong cùng một log. Giờ A ở P1, C ở P2, và không leader nào đọc được cả hai số dư. Nên từ slide này, giao dịch tách thành hai thao tác, mỗi thao tác cho một tài khoản, mỗi thao tác một mã riêng: `tx 7f3c · debit A` (A −$1 → P1) và `tx 7f3c · credit C` (C +$1 → P2). Đó là hai thẻ `A −$1` và `C +$1` ở cột bên trái. Mã riêng để mỗi partition chống trùng đúng thao tác của nó **[Ngoài sách: mã thao tác]**.

**Song song mà không lộn thứ tự.** Hai lệnh của A (`A −$1` rồi `A +$5`) luôn vào cùng P1, nên luôn được xử lý theo đúng thứ tự trong log của P1. Lệnh của C vào P2 và chạy song song với P1. Cái giá: giữa A và C **không có thứ tự chung**, vì không có log nào chứa cả hai.

## 1. Slide này để làm gì

Kéo đòn bẩy thứ hai của slide 4: tăng **số nhóm**. Đồng thời làm hiện lại bài toán giao dịch phân tán của chặng 2, lần này giữa hai Raft group.

## 2. Đọc hình

- Headline `Partition by account`. Lede: *Many groups run in parallel without reordering one account.*
- **Bên trái:** cột `Incoming commands`: `A −$1` (`tx 7f3c`), `A +$5`, `B −$1`, `C +$1`, `E +$2`. Thẻ `A −$1` và thẻ `C +$1` là hai nửa của tx 7f3c: `tx 7f3c · debit A` và `tx 7f3c · credit C`.
- **Ở giữa:** hộp `partition router`, ô xanh `hash(account_id) % N`, và ba dòng: `accounts A, B, D → P1`, `accounts C, E → P2`, `other accounts → P3 … PN`. Chữ phụ: `deterministic partition key`.
- **Bên phải:** các hộp partition, mỗi hộp có ba ô `command order` · `event log` · `state`:
  - `P1 · holds A, B, D`: `A −$1, A +$5` · `e41, e42 …` · `A: $1, B: $3`.
  - `P2 · holds C, E`: `C +$1, E +$2` · `e87 …` · `C: $0, E: $4`.
  - `P3` và `PN`, ba ô màu xám, có dấu `…` ở giữa.

Diễn biến:
1. Vòng số 1 trên lệnh `A −$1`; ô `hash(account_id) % N` sáng; tag trên cùng `same account → same partition`.
2. Vòng số 2 trên lệnh `B −$1`; tag xanh `parallel` cạnh P3 và PN; tag `no global event log` giữa P2 và P3.
3. Ngoặc nét đứt màu tím nối P1 và P2 sang hộp `cross-partition`: `tx 7f3c spans P1 (A) and P2 (C)`, ô đỏ `who orders them?`.

Dải bước dưới hình: (1) `hash(account) % N: A, B, D → P1` · (2) `C → P2; partitions run in parallel` · (3) `tx 7f3c spans P1 and P2: who orders it?`.

## 3. Trình bày theo bước

| Bước | Trên màn hình | Nói |
|---|---|---|
| 0 | Toàn cảnh | "Máy quay lùi ra: từ một nhóm sang toàn hệ thống. Nhóm Raft duy nhất của slide 16 tới 19 giờ tách thành nhiều nhóm. Mỗi nhóm là một partition: vẫn ba máy, vẫn Raft, nhưng chỉ giữ một phần các tài khoản. Lưu ý: hình chụp trước khi tx 7f3c chạy, nên A vẫn còn một đô. Slide sau sẽ đi lại tx 7f3c từ đầu, qua cả hai partition." |
| 1 | Lệnh của A, `hash(account_id) % N`, ô bước 1 | "Router lấy hash của mã tài khoản, chia lấy dư cho N. A, B, D luôn vào P1. Mọi lệnh của A luôn vào cùng một partition, nên hai lệnh của A không bao giờ bị đảo. Bên trong P1, mọi thứ y như slide 16 tới 18: command file, Raft, RocksDB. Chỉ khác là P1 giữ ít tài khoản hơn." |
| 2 | `parallel`, `no global event log`, ô bước 2 | "Lệnh của C vào P2. Các tài khoản khác rải sang P3 tới PN, và các partition chạy song song. Bên trong P1 có thứ tự, bên trong P2 có thứ tự. Nhưng không có event log chung cho cả hệ thống, nên cũng không có thứ tự chung giữa A và C." |
| 3 | Ngoặc tím, `who orders them?`, ô bước 3 | "Giao dịch 7f3c lại cần cả hai. Một partition không tự xử lý được cả giao dịch nữa, nên nó tách thành hai thao tác, mỗi thao tác cho một tài khoản: trừ A ở P1, cộng C ở P2. Đó là hai lệnh A trừ một đô và C cộng một đô bên trái hình. Raft của P1 không biết P2 đã cộng hay chưa. Vậy ai giữ thứ tự giữa hai bước? Đây là bài toán giao dịch phân tán của chặng 2 quay trở lại." |

## 4. Giải thích sâu

- **Lý do phải chia (p.539).** Sức chứa của một Raft group có hạn (slide 19). Tới một quy mô nào đó, phải chia dữ liệu và làm giao dịch phân tán.
- **Quy tắc chia của sách (p.542).** Sách chia dữ liệu theo hash của khóa, ví dụ chia cho 2. Slide tổng quát thành N. Đây cũng là quy tắc đã dùng cho Redis ở slide 6.
- **Ai giữ bản đồ.** Ở phần Redis, sách lưu số partition và địa chỉ các node ở một chỗ tập trung, dùng Zookeeper. Router ở đây cần đúng loại thông tin đó.
- **Mỗi partition là một hệ event sourcing đầy đủ:** command order, event log nhân bản bằng Raft, state, snapshot, read path. Giống shard Redis ở slide 6, nhưng mỗi shard giờ đúng, kiểm toán được và chịu lỗi.
- **Điều kiện để dùng lại Saga (p.542).** Khi mỗi nhóm event sourcing trả lời đồng bộ, ta dùng lại được TC/C hoặc Saga. Slide 21 cho thấy cách: read path của mỗi partition đẩy status về Saga coordinator đang chờ, qua reverse proxy của partition đó (Figure 29, bước 5–6).

## 5. Câu hỏi có thể gặp

- **"Ở slide 18 A đã $0 rồi, sao ở đây A lại $1?"** Hình chụp **trước** khi tx 7f3c chạy. Từ slide 16 tới 19, tx 7f3c chạy trọn trong một nhóm duy nhất (e43, e44). Giờ ta lùi lại để đi cả giao dịch qua hai partition ở slide 21, bắt đầu từ `A $1 · C $0`.
- **"Sao không gửi nguyên tx 7f3c cho P1 như ở slide 18?"** Vì P1 không giữ C. Leader của P1 không đọc được số dư của C, và không ghi được event của C vào log của P2. Mỗi partition chỉ quyết định cho tài khoản của nó, nên giao dịch phải tách thành `tx 7f3c · debit A` cho P1 và `tx 7f3c · credit C` cho P2.
- **"Vậy mỗi pod giữ một event list khác nhau à?"** Tùy hai pod quan hệ thế nào. Cùng một Raft group thì **giống hệt nhau**. Khác partition thì **khác nhau**. Xem sơ đồ ở mục 7.
- **"Có một log tổng của cả hệ thống để audit không?"** Không. Event trừ A nằm ở log P1, event cộng C ở log P2. Thứ nối hai nửa của tx 7f3c là phase status table của coordinator (slide 21). [Ngoài sách] View audit toàn hệ thống phải gom event từ nhiều partition, vì giữa các partition không có thứ tự chung.
- **"Ánh xạ sang Kubernetes thế nào?"** [Ngoài sách] Mỗi partition thường là **một StatefulSet ba pod**. Mỗi pod có ổ lưu riêng (persistent volume) giữ bản sao event list. Ba pod trong một StatefulSet là ba bản sao của **cùng** một list. Các StatefulSet khác nhau là các partition **khác nhau**.
- **"N đổi thì sao? `hash % N` thay đổi hết."** [Ngoài sách] Đúng: đổi N thì gần như mọi tài khoản đổi partition. Thực tế người ta chia sẵn một số lượng lớn partition logic cố định rồi gán chúng cho các nhóm, hoặc dùng consistent hashing. Thêm nhóm khi đó chỉ phải chuyển một phần dữ liệu.
- **"Chuyển tiền giữa hai tài khoản cùng partition thì sao?"** [Ngoài sách: suy luận] Ví dụ B và D cùng ở P1 (tx 51aa). Một state machine xử lý được cả hai event trong cùng một log, không cần Saga, giống tx 7f3c ở slide 18 khi mọi tài khoản còn chung một nhóm. Nhưng khi có nhiều partition, trường hợp này hiếm (notebook 23: khoảng 1 trên 29).

## 6. Đừng nói sai

- Đừng nói "toàn hệ thống có một thứ tự toàn cục". Chỉ có thứ tự trong từng partition.
- Đừng nói "Raft điều phối P1 và P2". Raft của mỗi nhóm không biết nhóm kia.
- Đừng chạy pod stateless rồi cho mỗi pod tự ghi file cục bộ. Khi đó mỗi pod có một list khác nhau cho cùng tài khoản, và không ai biết bản nào đúng.
- Đừng đọc các ô của P1, P2 như trạng thái sau slide 18, và đừng nói "tx 7f3c chạy lần hai". Đây là ảnh chụp trước giao dịch.
- Đừng nói "P1 là nhóm ta đã mổ xẻ ở slide 16–19". Nhóm đó giữ mọi tài khoản; P1 là một phần của nó sau khi chia, chỉ giữ A, B, D.
- Đừng nói "slide 16–19 chỉ theo nửa trừ". Ở đó tx 7f3c chạy trọn trong một nhóm; tách thành hai thao tác là chuyện của slide này.
- Đừng nói "router đưa A, B vào P1". Router đưa **A, B, D** vào P1, khớp với hộp `P1 · holds A, B, D`.

## 7. Giải thích chi tiết

**Đi theo năm lệnh bên trái.** Với P1 giữ A, B, D và P2 giữ C, E:

| Lệnh | `hash % N` đưa tới | Xếp sau lệnh nào |
|---|---|---|
| `A −$1` (`tx 7f3c · debit A`) | P1 | các lệnh trước đó của P1 |
| `A +$5` | P1 | sau `A −$1`, luôn luôn |
| `B −$1` | P1 | sau `A +$5` trong P1 |
| `C +$1` (`tx 7f3c · credit C`) | P2 | các lệnh trước đó của P2 |
| `E +$2` | P2 | sau `C +$1` trong P2 |

Hai lệnh của A không bao giờ bị đảo, vì cùng vào một log. Còn `A −$1` và `C +$1` thì **không so sánh được**: chúng ở hai log khác nhau, chạy trên hai nhóm máy khác nhau.

**Mỗi pod giữ event list giống hay khác?** Ví dụ, sau khi tx 7f3c chạy xong ở slide 21:

```
Partition 1 (giữ A, B, D)
  pod p1-a (leader)   [ … e41, e42, e43: A −$1 ]
  pod p1-b (follower) [ … e41, e42, e43: A −$1 ]   ← giống hệt p1-a
  pod p1-c (follower) [ … e41, e42, e43: A −$1 ]

Partition 2 (giữ C, E)
  pod p2-a (leader)   [ … e87, e88: C +$1 ]
  pod p2-b (follower) [ … e87, e88: C +$1 ]
  pod p2-c (follower) [ … e87, e88: C +$1 ]
```

e43 và e88 chỉ xuất hiện khi coordinator gửi lệnh trừ và lệnh cộng ở slide 21. Trên slide này, P1 mới tới `e41, e42 …` và P2 mới tới `e87 …`. Khác slide 18: ở đó e43, e44 nằm chung một log; giờ e43 nằm ở log của P1, còn nửa cộng là e88 ở log của P2.

**Ba điều rút ra:**
1. **Không có event list chung.** Không list nào chứa cả `A −$1` lẫn `C +$1`. Chỉ phase status table của coordinator biết "tx 7f3c gồm trừ A ở P1 và cộng C ở P2".
2. **Không có thứ tự toàn cục.** Quy tắc "trừ trước, cộng sau" không thể do Raft bảo đảm. Phải có một thành phần nằm ngoài cả hai nhóm.
3. **Tài khoản phải luôn đi đúng partition.** Một lệnh của A lạc sang P2 nghĩa là event của A bị rải ra hai log, và không ai còn biết số dư thật của A. Bản đồ tài khoản → partition phải giống nhau ở mọi router, và khớp với tập tài khoản mỗi partition giữ.

**Một tài khoản, một người quyết định.** Nhiều partition chạy song song. Nhưng với **một** tài khoản cụ thể, luôn chỉ có **một** state machine được quyền quyết định: leader của partition chứa nó. Đây là cách đạt thông lượng lớn mà không cần khóa phân tán. Cái giá đi kèm là **tài khoản nóng**: một tài khoản nhận quá nhiều lệnh vẫn bị giới hạn bởi C của **một** nhóm (slide 23).

**Vấn đề cũ quay lại.** Ở chặng 2, A và C nằm ở hai database, nên cần 2PC, TC/C hoặc Saga. Giờ A và C nằm ở hai Raft group, và câu hỏi y hệt: ai bảo đảm trừ A xong mới cộng C, và nếu nửa sau hỏng thì sao? Sách trả lời bằng chính công cụ cũ: Saga (hoặc TC/C), kèm phase status table.

## 8. Dẫn dắt sang slide 21

- **Điều slide này để lại:** tx 7f3c chạm hai partition, và không nhóm nào tự biết nhóm kia đã làm gì.
- **Câu nối gợi ý:** "Ta dùng lại đúng công cụ của chặng 2: Saga, kèm phase status table. Và ta đi lại tx 7f3c từ đầu, lần này qua cả hai partition."
- **Khán giả sẽ thấy ở slide 21:** ba làn ngang `Saga coordinator` (có `phase status table` với ba dòng `tx 7f3c`, `debit A`, `credit C`), `P1 · holds A`, `P2 · holds C`; trục `time`; và dải `Balances across time` bắt đầu ở `A: $1 · C: $0`. Bốn bước, tự chạy.
