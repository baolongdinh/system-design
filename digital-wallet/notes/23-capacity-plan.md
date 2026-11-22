# Slide 23 — Capacity plan for 1M transfers/s

> **Ý chính:** **Slide cuối của bài.** Mở bằng việc **đối chiếu bản đồ ở slide 22 với năm yêu cầu của slide 2**: chỉ chuyển tiền (một API, slide 5), transactional (Saga, slide 21), độ tin cậy 99,99% (Raft, slide 17–18; đạt về thiết kế, con số vẫn phải đo), reproducible (replay event log, slide 14). Bốn yêu cầu đó đã có lời giải. Yêu cầu thứ năm, **1 triệu transfer/s**, là phần còn lại của slide. Tầng nào cũng **chia partition**: không có log chung, không có khóa chung. Nên 1 triệu transfer/s chỉ còn là một phép chia: **tải của tầng ÷ sức của một nhóm**. Sách chỉ cho hai thứ: **1 triệu transfer/s là tới 2 triệu thao tác/s** (slide 4; với 1.000 TPS mỗi node database là 2.000 node), và kết luận **"a few thousand nodes"** (vài nghìn node). Mọi con số khác trên slide là **[Ngoài sách]** và dựa trên một giả định về sức của một nhóm. Raft trả giá theo **lô**, không theo từng lệnh: leader gom các event đang chờ, ghi **một lần `fsync`**, gửi sang follower trong **một vòng mạng**, và commit cả lô cùng lúc. Raft vẫn có vòng mạng đó; cái slide 16 bỏ đi là các lượt gọi Kafka và database ở xa **cho từng lệnh**. Lô ≈ 1 ms × ~100 lệnh → **~100.000 thao tác/s mỗi nhóm**; chỉ chạy tới **70% → 70.000 thao tác/s mỗi nhóm**. Tầng ví, chia theo **account id**: 2.000.000 ÷ 70.000 ≈ **29 nhóm Raft**. Với 29 nhóm, 28 trên 29 giao dịch có A và C ở hai nhóm khác nhau, nên gần như giao dịch nào cũng qua Saga. Tầng Saga, chia theo **tx id**: 1.000.000 × **3 bản ghi phase** (Figure 29: tạo, P1 done, P2 done) = **3.000.000 lần ghi/s**. Shard Saga cũng là một log chỉ nối thêm, gom lô được, nên slide dùng **cùng giả định** 70.000 (vẫn phải đo riêng): ≈ **43 shard**. Tầng này ghi nhiều hơn nhưng **dễ chia hơn** tầng ví: không có khóa nóng. Tổng ≈ **72 nhóm × 3 bản sao ≈ 216 replica slot**; đó **không mặc nhiên là 216 máy**. Vì sao ít hơn 2.000 node của sách nhiều thế: slide 4 đã nói đòn bẩy là thông lượng mỗi node; file cục bộ cộng gom lô kéo con số đó lên khoảng **một trăm lần**, nên số máy giảm theo **[Ngoài sách: suy luận]**. Router, reverse proxy, tiến trình coordinator **không giữ state**: thêm instance. Chỉ một thứ thêm nhóm không sửa được: **tài khoản nóng**, kẹt ở sức của một nhóm (≤ 70.000). Cách sửa: **chia thành tài khoản con** `M#1 … M#8`, số dư là tổng (8 × 70.000 ≈ 560.000). Rồi **benchmark đầu-cuối** trước khi nói "đạt 1 triệu". Kết bài, cảm ơn, mở hỏi đáp (mục 8).

**Chặng:** 6 · Scale out + Saga · **Headline:** `Capacity plan for 1M transfers/s` · **Lede:** *Back to the goal: every layer is partitioned, so 1M transfers/s becomes a count of groups.* · **Nguồn (footer `Book:`):** Table 1, p.499–500; Fig 29, p.542–545 (câu "a few thousand nodes" ở Wrap up, p.545 không ghi trên footer; dùng khi bị hỏi, mục 5) · **Footer `Added:`** batching, sizing, hot-account split · **Bước bấm:** 4 (tự chạy, 0,6 giây mỗi bước; nhấn A để bấm từng bước). Khung giả định nét đứt hiện sẵn từ đầu, không phải một bước.

---

## Hiểu nhanh trước khi nhìn hình

**Mở bằng một lần đối chiếu, không có trên hình.** Lời đầu tiên quay về năm yêu cầu interviewer chốt ở slide 2, rồi soi từng cái vào bản đồ vừa xem ở slide 22. Hình của slide này không vẽ bảng đó: nói nó khi mới có khung giả định, trước bước 1.

| Yêu cầu ở slide 2 | Thiết kế trả lời bằng | Slide | Kết luận |
|---|---|---|---|
| Chỉ chuyển tiền giữa hai ví | một API, `POST /v1/wallet/balance_transfer` | 5 | Đạt |
| Transactional | Saga cùng phase status table: trừ trước, cộng sau, hỏng thì bù | 21 | Đạt, với trạng thái trung gian **được theo dõi**, không bị giấu |
| Độ tin cậy 99,99% | mỗi nhóm có ba bản sao Raft: chịu được một máy chết, leader mới tự lên | 17–18 | Đạt **về thiết kế**; con số 99,99% vẫn phải đo khi vận hành |
| Reproducible | event log bất biến; replay ra lại mọi số dư | 14 | Đạt |
| 1 triệu transfer/s | tầng nào cũng chia partition | **slide này** | Có đường đi rõ; con số thật phải benchmark |

Thứ tự đọc khác thứ tự thẻ ở slide 2: yêu cầu quy mô được để cuối, vì phần còn lại của slide trả lời nó. Bốn dòng đầu chỉ trỏ về slide đã xem, không thêm ý mới; nói nhanh, mỗi dòng một câu.

**Đây là phép chia, không phải kết quả đo.** Khung nét đứt ghi `assumption, not a benchmark`. Cả slide dựa trên một con số: một nhóm Raft làm được khoảng 100.000 thao tác bền mỗi giây nhờ gom lô, chạy 70% thì còn **70.000 mỗi nhóm**. Đo được số thật thì thay vào; số nhóm đổi, cách tính không đổi (công thức ở mục 5).

**Vì sao một nhóm làm được cỡ 100.000 [Ngoài sách: phép nhẩm].** Đây là ý mới duy nhất của khung giả định; nói chậm.
- Mỗi lần commit, nhóm Raft trả hai khoản gần như cố định: **một lần `fsync`** xuống đĩa, và **một vòng mạng** từ leader sang follower rồi về. Cỡ một mili giây, dù lần đó chở một lệnh hay một trăm lệnh.
- Nên leader không commit từng lệnh. Nó **gom** các event đang chờ thành một **lô**, `fsync` một lần, gửi một lần, và cả lô được commit cùng lúc.
- Nhẩm: lô ≈ 1 ms, chứa ~100 lệnh → ~100.000 lệnh mỗi giây mỗi nhóm. Không gom lô, mỗi lệnh tự trả 1 ms: chỉ khoảng 1.000 lệnh mỗi giây, đúng phép chia ở sổ tay 16.
- **Raft vẫn có vòng mạng.** Slide 16 không bỏ nó. Cái slide 16 bỏ là các lượt gọi Kafka và database ở xa **cho từng lệnh**. Vòng mạng của Raft còn đó, nhưng trả **một lần cho cả lô**.
- Phần còn lại không nghẽn: validate đọc số dư từ RocksDB đã nằm trong bộ nhớ, cùng tiến trình; ghi event chỉ cỡ 10–20 MB mỗi giây.

**Cái gì của sách, cái gì của slide.** Nói rõ ranh giới này khi trình bày.

| | Của sách (Chapter 12) | **[Ngoài sách]** |
|---|---|---|
| Tải | 1 triệu transfer/s → tới 2 triệu TPS (p.499–500, slide 4). Figure 29: mỗi transfer ghi phase status ba lần | × 1 triệu = 3 triệu lần ghi phase/s |
| Sức một đơn vị | Table 1: 100 / 1.000 / 10.000 TPS mỗi node, là bảng tra theo giả định; sách chọn 1.000 TPS cho một node database quan hệ | lô ≈ 1 ms × ~100 lệnh → ~100.000 thao tác bền/s mỗi nhóm Raft, chạy 70% → 70.000; cùng giả định, đo riêng, cho một shard Saga |
| Kết quả | 2.000 node (slide 4); "a few thousand nodes" (p.545) | 29 nhóm ví, 43 shard Saga, 72 nhóm, 216 replica slot |
| Cách scale | tăng sức mỗi node; chia partition; Saga giữa các partition | gom lô; chia Saga theo tx id; tài khoản con cho tài khoản nóng |

**Năm từ cần định nghĩa.**
- **Thao tác bền (durable op):** một lệnh đã ghi bền và được đa số trong nhóm Raft xác nhận. Ở tầng ví, đó là một lần đổi số dư, như `A −$1`. Ở tầng Saga, đó là một bản ghi phase, như `tx 7f3c: P1 done`.
- **Lô (batch):** nhiều lệnh đang chờ được ghi bền và commit chung một lần: một `fsync`, một vòng mạng Raft. Giá của lần đó chia cho cả lô.
- **Nhóm, shard:** một đơn vị chia tải, chạy Raft với ba bản sao. Ở tầng ví gọi là nhóm (partition), ở tầng Saga gọi là shard. Hàng tổng trên hình gọi chung cả hai là `groups`.
- **Replica slot:** chỗ cho **một bản sao** của một nhóm. 72 nhóm × 3 = 216 slot. Một máy có thể chứa nhiều slot, nên số slot không phải số máy.
- **Khóa nóng (hot key):** một khóa, ví dụ một tài khoản, nhận nhiều lệnh hơn sức một nhóm. Mọi lệnh của nó vẫn phải xếp một hàng trong đúng một nhóm.

**Đọc slide theo một câu lặp lại.** Mỗi hàng bên trái đọc từ trái sang phải: `tải` → `÷ 70,000` → `số nhóm`. Ba hàng, cùng một phép chia. Khung đỏ bên phải là chỗ phép chia đó không cứu được.

## 1. Slide này để làm gì

Slide cuối của bài. Nó trả lời câu hỏi slide 22 để lại: bản đồ vừa xem có đạt mục tiêu ta đặt ra ở slide 2 không?

- **Trước hết, đối chiếu năm yêu cầu** (bảng ở phần *Hiểu nhanh*). Bốn yêu cầu đã có lời giải trong thiết kế, mỗi cái trỏ về một slide đã xem. Chỉ còn yêu cầu quy mô.
- **Rồi trả lời yêu cầu còn lại** (slide 2, slide 4): thiết kế cuối có chịu được một triệu transfer mỗi giây không, và cần cỡ bao nhiêu máy? Slide cho thấy **không tầng nào là nút thắt không giải được**. Tầng nào cũng chia được, nên câu trả lời là một số nhóm. Rồi nói thẳng giới hạn duy nhất còn lại (tài khoản nóng) cùng cách sửa.
- **Cuối cùng, kết bài và mở hỏi đáp** (mục 8).

## 2. Đọc hình

- Headline `Capacity plan for 1M transfers/s`. Lede: *Back to the goal: every layer is partitioned, so 1M transfers/s becomes a count of groups.* Chữ *Back to the goal* là móc cho phần đối chiếu năm yêu cầu; trên hình không có danh sách yêu cầu.
- **Trên cùng bên trái, khung nét đứt** (hiện sẵn): tag `assumption, not a benchmark`, dòng `scale target: 1,000,000 transfers/s`, rồi hai dòng giả định: `batch ≈ 1 ms (1 fsync + 1 round trip) × ~100 commands → ~100,000 ops/s per group` và `run at 70% → 70,000 ops/s per group` (số cuối in đậm).
- **Hai phần ba bên trái: ba hàng ngang**, mỗi hàng đọc `tải → ÷ 70,000 → kết quả`.
  1. Hàng viền xanh đậm, vòng số 1: `wallet partitions · by account id`. Tải `2,000,000 ops/s`, dòng phụ `1M × 2 (debit + credit)`. Mũi tên `÷ 70,000 per group`. Thẻ kết quả có ba ô Raft nhỏ (một leader, hai follower): `≈ 29 Raft groups`.
  2. Hàng viền tím, vòng số 2: `Saga coordinators + phase status · by tx id`. Tải `3,000,000 appends/s`, dòng phụ `1M × 3 phase records`. Mũi tên `÷ 70,000 per shard`. Thẻ kết quả có lục giác của coordinator: `≈ 43 shards`. Hai ghi chú: `• no hot key: every tx id is different` và `• append + batch → fewer shards`.
  3. Hàng tổng, vạch xanh lá, vòng số 3: thanh `≈ 72 groups × 3 replicas ≈ 216 replicas`, và ghi chú `• routers, reverse proxies, coordinator processes are stateless: add instances`.
- **Một phần ba bên phải: khung viền đỏ**, vòng số 4, tiêu đề `what more groups cannot fix`.
  - Hộp `one Raft group · merchant M`: thẻ `account M` (`single balance`) và ô đỏ `≤ 70,000 ops/s` (`capped at 1 group`).
  - Mũi tên xanh lá `fix: split into sub-accounts`.
  - Hộp xanh lá `sub-accounts across 8 partitions`: bốn ô `M#1`, `M#2`, `M#3`, `M#8`, đại diện cho tám tài khoản con. Dòng `balance = sum(M#1 … M#8)`, dòng `8 partitions → 8 × 70,000 ≈ 560,000 ops/s`, và `split load across independent groups`.
  - Ô cuối: `then benchmark end to end`.

Diễn biến (lúc đầu chỉ có khung giả định; mỗi bước thêm một phần và giữ lại):
1. Hàng wallet.
2. Hàng Saga và hai ghi chú.
3. Hàng tổng.
4. Khung đỏ bên phải.

Dải bước dưới hình: (1) `Wallet: 2M ops/s ÷ 70,000 per group ≈ 29 Raft groups` · (2) `Saga: 3M phase records/s by tx id ≈ 43 shards` · (3) `≈ 72 groups × 3 replicas ≈ 216 replica slots` · (4) `More groups cannot fix a hot account: split it`.

## 3. Trình bày theo bước

**Mở slide, đối chiếu mục tiêu** (khung nét đứt đã hiện, chưa có hàng nào): "Quay lại năm yêu cầu interviewer chốt ở slide 2, và đối chiếu với bản đồ vừa xem. Chỉ chuyển tiền giữa hai ví: một API, slide 5. Đạt. Transactional: Saga cùng phase status table, trừ trước cộng sau, hỏng thì bù; slide 21. Đạt, với trạng thái trung gian được theo dõi chứ không bị giấu. Độ tin cậy 99,99%: mỗi nhóm có ba bản sao Raft, chịu được một máy chết, leader mới tự lên; slide 17 và 18. Đạt về thiết kế; con số 99,99% vẫn phải đo khi vận hành. Reproducible: event log bất biến, replay ra lại mọi số dư; slide 14. Đạt. Còn một triệu giao dịch mỗi giây: chính là slide này. Kiến trúc này có chịu nổi không, và cần bao nhiêu máy?"

**Rồi vào phép chia** (chỉ khung nét đứt): "Ý chính của cả slide: tầng nào cũng chia partition, không có log chung hay khóa chung. Nên một triệu giao dịch mỗi giây chỉ còn là một phép chia: tải của tầng, chia cho sức của một nhóm. Ta cần một giả định cho sức của một nhóm. Một nhóm Raft không trả giá theo từng lệnh, mà theo từng lô: leader gom các event đang chờ, ghi một lần fsync, gửi sang follower trong một vòng mạng, và cả lô được commit cùng lúc. Raft vẫn có vòng mạng đó; cái slide 16 bỏ đi là các lượt gọi tới Kafka và database ở xa cho từng lệnh. Giả sử mỗi lô mất khoảng một mili giây và chứa khoảng một trăm lệnh: một nhóm làm được khoảng một trăm nghìn thao tác mỗi giây. Phần còn lại không nghẽn: validate đọc RocksDB đã nằm trong bộ nhớ, và ghi event chỉ cỡ chục MB mỗi giây. Chỉ chạy tới 70% để còn dư địa: bảy mươi nghìn thao tác mỗi giây mỗi nhóm. Đo được số thật thì thay vào; cách tính không đổi."

| Bước | Trên màn hình | Nói |
|---|---|---|
| 1 | Hàng wallet, ô bước 1 | "Tầng ví, chia theo mã tài khoản. Mỗi giao dịch có một lệnh trừ và một lệnh cộng, nên một triệu giao dịch là hai triệu thao tác ví mỗi giây. Đây đúng là phép tính của sách ở slide 4. Hai triệu chia bảy mươi nghìn: khoảng 29 nhóm Raft. Các nhóm không chờ nhau, nên thêm nhóm là thêm thông lượng. Với 29 nhóm, 28 trên 29 giao dịch có A và C ở hai nhóm khác nhau, nên gần như giao dịch nào cũng đi qua Saga." |
| 2 | Hàng Saga, hai ghi chú, ô bước 2 | "Tầng Saga, chia theo mã giao dịch. Theo Figure 29, mỗi giao dịch ghi phase status table ba lần: tạo, P1 done, P2 done. Gần như cả một triệu giao dịch đi qua Saga, nên đó là ba triệu bản ghi mỗi giây. Mỗi shard Saga cũng là một log chỉ nối thêm, gom lô như trên, nên slide dùng cùng giả định bảy mươi nghìn lần ghi mỗi giây mỗi shard. Đây vẫn là một giả định, phải đo riêng. Ba triệu chia bảy mươi nghìn, làm tròn lên: 43 shard. Tầng này dễ chia: không có khóa nóng, vì mỗi mã giao dịch chỉ một giao dịch dùng, nên chia theo mã là tải chia đều. Còn cách lưu, gom lô, và giữ bản ghi tới khi giao dịch xong là lựa chọn triển khai." |
| 3 | Thanh tổng, ô bước 3 | "Cộng lại: 29 nhóm ví và 43 shard Saga, tổng 72 nhóm. Mỗi nhóm ba bản sao: 216 replica slot, không mặc nhiên là 216 máy vật lý. So với hai nghìn node của sách ở slide 4: sách giả định một node database chỉ làm một nghìn TPS. Slide 4 đã nói đòn bẩy là thông lượng của từng node; file cục bộ cộng gom lô kéo con số đó lên khoảng một trăm lần, nên số máy giảm theo. Số máy còn phụ thuộc sức máy, cách xếp replica theo vùng lỗi, và tải của router, proxy, read path. Router, reverse proxy và tiến trình coordinator không giữ state, nên thiếu thì thêm instance. Đây là sizing minh họa, không phải kết quả benchmark của sách." |
| 4 | Khung đỏ bên phải, ô bước 4 | "Còn đúng một thứ thêm nhóm không giải được: tài khoản nóng. Một tài khoản nằm gọn trong một nhóm, nên mọi lệnh của nó xếp một hàng, tối đa khoảng bảy mươi nghìn thao tác mỗi giây. Một ví nhận tiền của rất nhiều người cùng lúc, ví dụ một merchant lớn, sẽ vượt mức đó. Cách thường làm, ngoài sách: chia tài khoản đó thành nhiều tài khoản con, M#1 tới M#8, nằm ở các partition khác nhau; số dư là tổng các tài khoản con. Tám nhóm: khoảng năm trăm sáu mươi nghìn thao tác mỗi giây." |

Câu so với hai nghìn node ở bước 3 là **[Ngoài sách: suy luận]**: sách không tính lại số node sau khi đổi sang file cục bộ. Bị hỏi vặn thì dùng câu trả lời ở mục 5.

Chốt: "Chapter 12 cho hướng scale: mọi tầng đều chia partition, và thêm nhóm là thêm thông lượng. Con số thật thì phải đo: benchmark đầu-cuối, kể cả giao dịch chéo partition, trước khi nói 'đạt một triệu TPS'."

Nếu có người hỏi mỗi giao dịch chậm bao lâu: "Ngoài sách: độ trễ cộng dồn hai lần Raft commit nối tiếp, ở P1 rồi P2, và ba lần ghi tiến độ ở shard Saga. Mỗi lần cỡ một lô, tức vài mili giây. Nó làm từng giao dịch chậm hơn, nhưng không chặn thông lượng, vì mỗi nhóm xử lý nhiều lệnh cùng lúc theo lô. Gom lô to hơn thì thông lượng tăng nhưng mỗi lệnh chờ lâu hơn; đó là núm vặn giữa độ trễ và thông lượng." Chi tiết ở mục 7.

Rồi kết bài, cảm ơn và mở hỏi đáp: lời ở mục 8.

## 4. Giải thích sâu

**Phần của sách: chỉ ba chỗ.**
- **Phép nhân đôi (p.499–500, slide 4).** Mỗi lệnh chuyển gồm hai thao tác: trừ một tài khoản, cộng tài khoản kia. Muốn 1 triệu transfer mỗi giây, hệ thống phải xử lý tới 2 triệu TPS. Sách giả định một node database làm 1.000 TPS, nên cần 2.000 node. Table 1: 100 TPS mỗi node cần 20.000 node; 1.000 cần 2.000; 10.000 cần 200. Đây là bảng tra theo giả định, không phải số đo.
- **Figure 29 (p.542–545).** Coordinator ghi vào phase status table **ba lần**: tạo bản ghi (bước 2), P1 thành công (bước 8), P2 thành công (bước 14). Bước 15 chỉ nói giao dịch hoàn tất và trả kết quả. **Không có lần ghi `tx done` riêng.**
- **Wrap up (p.545).** Sau phép ước lượng, sách kết luận cần **vài nghìn node** (*"a few thousand nodes"*). Sách không tách con số đó theo tầng, cũng không nói mỗi node làm được bao nhiêu trong thiết kế cuối. Phép ước lượng duy nhất của sách là phép ở slide 4, với 1.000 TPS mỗi node.

Thêm một câu của sách, dùng ở phần tùy chọn bên dưới: ở TC/C (Fig 10), sách nói phase status **thường được lưu trong database chứa tài khoản bị trừ** (notebook 8).

**Phần ngoài sách: một giả định, ba phép chia [Ngoài sách].**
- **Raft trả giá theo lô.** Mỗi lần commit, nhóm trả hai khoản gần như cố định: một lần `fsync` trên đĩa, và một vòng mạng tới follower (follower ghi bền rồi trả lời; đủ đa số là commit). Hai khoản đó gần như không đổi dù lần commit chở một lệnh hay một trăm lệnh, vì mỗi lệnh chỉ vài trăm byte. Nên leader gom các event đang chờ, ghi và gửi một lần, commit cả lô. Đây là *group commit* ở sổ tay 16 và "gom lô" ở sổ tay 19, áp dụng cho cả `fsync` lẫn vòng Raft.
- **Phép nhẩm của khung giả định.** Lô ≈ 1 ms (một `fsync` cộng một vòng mạng), chứa ~100 lệnh: 100 ÷ 0,001 giây = **~100.000 thao tác/s mỗi nhóm**. Hai số 1 ms và 100 lệnh đều là giả định.
- **Đính chính hay gặp: Raft vẫn có vòng mạng.** Slide 16 bỏ các lượt gọi Kafka và database ở xa **cho từng lệnh** (sổ tay 16 đếm sáu lượt mỗi lệnh). Nó không bỏ việc sao chép: Raft vẫn phải gửi event sang follower và chờ đa số (slide 17–18). Khác biệt là vòng mạng đó trả **một lần mỗi lô**, không phải mỗi lệnh.
- **Phần khác không nghẽn.** Validate đọc số dư từ RocksDB trong cùng tiến trình, phần đang dùng nằm trong bộ nhớ: không có lượt mạng (slide 16). Ghi event: ~100.000 event × 100–200 byte ≈ 10–20 MB/s, ghi tuần tự, thấp hơn nhiều so với sức ghi tuần tự của một ổ đĩa. Trần của nhóm là nhịp `fsync` và vòng mạng; gom lô chia nhịp đó cho cả trăm lệnh.
- **So với không gom lô.** Mỗi lệnh tự trả 1 ms thì một nhóm chỉ làm khoảng 1.000 lệnh mỗi giây (cùng phép chia ở sổ tay 16), trùng cỡ con số sách giả định cho một node database. Chỉ trùng cỡ; sách không lập luận như vậy. Gom lô là thứ nhân con số đó lên khoảng một trăm.
- **Chạy 70%.** 100.000 × 0,7 = **70.000**. Vì sao 70%: slide 19 cho thấy thời gian chờ tăng rất nhanh khi tải gần trần C. Phần dư 30% để gánh lúc một node hỏng và leader của nó dồn sang node khác, và để gánh các đợt tăng ngắn.
- **Giả định cho shard Saga.** Slide dùng **cùng con số** 70.000 cho một shard phase status. Một shard cũng là một nhóm Raft nhỏ ghi một log chỉ nối thêm, gom lô theo đúng cách trên, nên con số này hợp lý để nhẩm. Nhưng nó vẫn là **giả định**: việc của shard Saga khác việc của nhóm ví, nên phải đo riêng.
- **Tầng ví, chia theo account id.** 1.000.000 × 2 = 2.000.000 thao tác/s. 2.000.000 ÷ 70.000 = 28,6, làm tròn lên **29 nhóm**.
- **Tầng Saga, chia theo tx id.** 1.000.000 × 3 = 3.000.000 lần ghi/s. 3.000.000 ÷ 70.000 = 42,9, làm tròn lên **43 shard**.
- **Tổng.** 29 + 43 = **72 nhóm**. 72 × 3 = **216 replica slot**.
- **Vì sao tính như cả triệu giao dịch đều đi Saga.** Tài khoản rải đều trên 29 nhóm thì hai tài khoản rơi cùng nhóm với xác suất 1/29: 28 trên 29 giao dịch, khoảng 96,6 %, đi chéo partition. Phần nhỏ cùng nhóm (khoảng 3,4 %) không cần Saga, chỉ làm tải nhẹ đi.

**Vì sao tầng Saga ghi nhiều hơn mà lại dễ chia hơn tầng ví [Ngoài sách: nhận định].** Điểm 1 và 2 đến từ việc chia theo tx id. Điểm 3 và 4 là lựa chọn triển khai.
1. **Không có khóa nóng.** Mỗi tx id chỉ thuộc một giao dịch, nên `hash(tx_id)` rải tải đều trên các shard. Tầng Saga không có "merchant" nào. Tầng ví thì có: một tài khoản có thể nhận rất nhiều lệnh mỗi giây (bước 4).
2. **Một giao dịch chỉ chạm một shard.** Ba bản ghi của tx 7f3c cùng mang một tx id, nên nằm cùng một shard. Không bao giờ cần điều phối giữa hai shard Saga. Ngược lại, một transfer chạm hai nhóm ví; chính vì thế mới cần Saga.
3. **Chỉ nối vào cuối log, gom lô.** Một bản ghi phase là một dòng ngắn: tx id, phase, thời điểm. Shard gom nhiều dòng vào một lần fsync và một vòng Raft, đúng phép nhẩm lô ở khung giả định. Đó là lý do slide dùng cùng 70.000 cho shard Saga, và là ý của ghi chú `append + batch → fewer shards`: không gom lô thì cần gấp cả trăm lần số shard. Bản ghi phase còn nhẹ hơn lệnh ví, vì không phải đọc số dư hay validate. Nên đo thật có thể ra cao hơn và cần ít hơn 43 shard; chưa đo thì chưa nói.
4. **Bản ghi chỉ cần sống tới khi giao dịch xong.** Sau `P2 done`, không ai cần dòng đó để phục hồi nữa. Bảng đang dùng chỉ chứa các giao dịch đang chạy dở: nhỏ, nằm gọn trong RAM, snapshot nhỏ, khởi động lại nhanh. Lịch sử để kiểm toán vẫn nằm trong event log của các nhóm ví. Cần giữ bản ghi phase lâu thì đẩy sang kho lạnh, ngoài đường ghi nóng.

**Hai cách giảm tải tầng Saga [Ngoài sách: tùy chọn].**
- **Không ghi `tx done` riêng.** Figure 29 không có lần ghi đó: ghi P2 thành công là đủ, rồi trả lời. Ô `tx done` ở slide 21 là minh họa một cách triển khai; phép tính của slide này coi nó là cùng một dòng với `P2 done`. Thêm một lần ghi riêng là thêm một phần ba tải tầng Saga mà không thêm thông tin nào.
- **Ghi "started" cùng lần nối với lệnh trừ ở P1.** Theo lời khuyên của sách ở TC/C (phase status thường nằm cùng database với tài khoản bị trừ), bản ghi "tx 7f3c đã bắt đầu" có thể đi **trong cùng một lần nối** với lệnh `A −$1` ở P1, không thêm lần fsync hay vòng Raft nào. Tầng Saga còn hai bản ghi mỗi giao dịch: 2.000.000 ÷ 70.000 ≈ **29 shard** thay vì 43. Cái giá: coordinator khởi động lại phải tìm giao dịch dở ở cả P1, không chỉ ở shard của nó. Chỉ làm khi benchmark cho thấy tầng Saga thật sự đắt.

**Router, reverse proxy, tiến trình coordinator: không đếm theo shard.** Chúng không giữ state bền. State của ví nằm trong nhóm Raft; state của Saga nằm trong shard phase status. Một tiến trình coordinator chết thì tiến trình khác đọc shard và làm tiếp (notebook 21). Thiếu sức thì thêm instance. Chúng không có trong 216 slot, nhưng có trong số máy thật.

## 5. Câu hỏi có thể gặp

- **"Bốn triệu, hay ba triệu, lần ghi mỗi giây thì database nào chịu nổi?"** Không database nào phải chịu cả con số đó. Ba triệu lần ghi (Figure 29: ba bản ghi mỗi giao dịch) được chia theo tx id ra khoảng 43 shard. Mỗi shard chỉ gánh khoảng 70.000 lần ghi mỗi giây, đúng cỡ một nhóm ví. Con số bốn triệu đến từ việc đếm thêm một lần ghi `tx done` riêng; Figure 29 không có lần ghi đó, nên ta không đếm. Mà có đếm thì vẫn chỉ là thêm shard (4.000.000 ÷ 70.000 → 58 shard): phép chia không đổi **[Ngoài sách: phép tính]**.
- **"Một nhóm Raft làm được một trăm nghìn thao tác mỗi giây thật không? Raft phải qua mạng mà."** **[Ngoài sách]** Phải qua mạng, đúng: mỗi lần commit có một vòng mạng tới follower và một lần `fsync`. Nhưng giá đó trả **theo lô**, không theo lệnh: một lô cỡ một mili giây chở khoảng một trăm lệnh. Cái slide 16 bỏ là các lượt gọi Kafka và database ở xa cho từng lệnh, không phải vòng mạng của Raft. Con số 100.000 là phép nhẩm, không phải số đo. Đo ra lô 2 ms, hay chỉ 50 lệnh mỗi lô, thì C = 50.000: đọc bảng ngay dưới. Lô cũng không cần chờ đầy: cách làm thường gặp là leader gửi những gì đang chờ ngay khi lô trước xong, nên lúc vắng lô tự nhỏ (độ trễ thấp), lúc đông lô tự to (thông lượng cao).
- **"Sao không dùng một database lớn cho phase status table?"** **[Ngoài sách]** Ba lý do.
  1. **Một máy có trần:** CPU, đĩa, fsync. Ba triệu lần ghi bền mỗi giây vượt xa một máy, cùng lý do slide 4 không dùng "một database thật to".
  2. **Một database chung là một log chung:** mọi giao dịch xếp hàng ở cùng một chỗ. Đó đúng là thứ cả nửa sau của bài đã gỡ ra.
  3. **Điểm hỏng đơn:** database đó chết thì không giao dịch nào chạy được, dù 29 nhóm ví vẫn khỏe.

  Và không có lý do gì để gom: hai giao dịch khác nhau không bao giờ cần đọc bản ghi phase của nhau. Chính sách cũng không đặt bảng ở một chỗ chung: ở TC/C, bảng nằm cùng database với tài khoản bị trừ, tức là đã rải theo dữ liệu.
- **"Đổi giả định 100.000 thì sao?"** **[Ngoài sách]** Chỉ đổi số, không đổi cách tính:

  ```
  mỗi nhóm   = C × u        C: thao tác bền/s một nhóm đo được; u: mức tải cho phép (0,7)
  nhóm ví    = ⌈ 2.000.000 ÷ (C × u) ⌉
  shard Saga = ⌈ 3.000.000 ÷ (C × u) ⌉
  slot       = (nhóm ví + shard Saga) × 3
  ```

  Nhẩm nhanh: slot ≈ 15.000.000 ÷ (C × u).

  | C đo được | C × 0,7 | Nhóm ví | Shard Saga | Tổng nhóm | Replica slot (× 3) |
  |---|---|---|---|---|---|
  | 10.000 | 7.000 | 286 | 429 | 715 | 2.145 |
  | 50.000 | 35.000 | 58 | 86 | 144 | 432 |
  | 100.000 | 70.000 | 29 | 43 | 72 | 216 |
  | 200.000 | 140.000 | 15 | 22 | 37 | 111 |

  Đọc theo lô 1 ms: hàng 10.000 là lô chỉ chứa khoảng mười lệnh; hàng 50.000 là lô chậm gấp đôi hoặc chỉ nửa số lệnh; hàng 200.000 là lô to gấp đôi. Shard Saga đo được khác nhóm ví (ví dụ nhanh hơn vì không phải validate) thì dùng hai C khác nhau cho hai tầng.
- **"29 nhóm có phải 29 máy không?"** Không. Mỗi nhóm có ba bản sao, nên 29 nhóm là 87 replica slot. Ba bản sao của **cùng một** nhóm phải nằm ở ba **vùng lỗi** khác nhau: ba máy, ba rack hay ba zone, để một sự cố không lấy mất đa số. Bản sao của **các nhóm khác nhau** có thể chung một máy lớn. Khi đó chúng chia nhau cùng ổ đĩa và cùng fsync, nên con số 100.000 phải đo đúng trong cách xếp đó. Số máy thật do sức máy, luật vùng lỗi, và tải của router, proxy, read path quyết định.
- **"Sách nói 2.000 node, rồi 'vài nghìn node'. Sao mình chỉ ra 216?"** **[Ngoài sách: suy luận]** Vì mẫu số khác nhau cỡ một trăm lần.
  - Sách chia 2 triệu TPS cho **1.000 TPS mỗi node** database quan hệ (slide 4): 2.000 node. Câu "vài nghìn node" ở phần tổng kết đi theo đúng giả định đó.
  - Slide 4 cũng nói đòn bẩy là thông lượng của từng node: Table 1 cho thấy 10.000 TPS mỗi node thì chỉ còn 200 node.
  - Phần deep dive kéo đòn bẩy đó: file cục bộ bỏ các lượt gọi ở xa cho từng lệnh (slide 16), và gom lô chia giá của `fsync` và vòng Raft cho cả trăm lệnh. Một nhóm lên cỡ 100.000 thao tác mỗi giây: khoảng một trăm lần.
  - Số máy giảm theo: tầng ví còn 2.000.000 ÷ 70.000 ≈ 29 nhóm thay vì 2.000 node. Rồi slide đếm thêm những thứ Table 1 không đếm: × 3 bản sao, chạy 70%, cộng tầng Saga. Ra 216 replica slot.
  - Đơn vị cũng khác: sách đếm node database đơn, không nhân bản; slide đếm replica slot. Sách không tính lại số node sau khi đổi thiết kế, nên đừng nói sách sai. Cả hai bên đều là phép nháp; con số thật do benchmark quyết định.
- **"Sao chia Saga theo tx id, không theo tài khoản?"** **[Ngoài sách]** Mọi bản ghi phase của một transfer thuộc về một tx id, trong khi transfer đó chạm hai tài khoản ở hai nhóm ví. Chia theo tx id thì toàn bộ tiến độ của một Saga nằm trong một shard: các lần ghi giữ đúng thứ tự, và coordinator khởi động lại tìm thấy đủ ở một chỗ. Tx id lại rải đều, nên tầng này không có tài khoản nóng.
- **"Sao thêm nhóm không cứu được tài khoản nóng?"** Router dùng `hash(account_id)` (slide 20): mọi lệnh của M luôn vào một nhóm, và trong nhóm đó chúng xếp một hàng theo log. Có 29 hay 290 nhóm thì M vẫn ở một nhóm. Thêm nhóm chia được **tài khoản**; nó không chia được **một số dư**.
- **"Chia tài khoản con thì cộng, trừ, xem số dư thế nào?"** **[Ngoài sách]** Chapter 12 không bàn tài khoản nóng. Đây là một thiết kế bổ sung, không chỉ là đổi hàm hash. Cách thường gặp:
  - **Cộng vào M:** chọn một tài khoản con theo tx id, ví dụ `hash(tx_id) % 8`, nên lệnh cộng rải đều trên tám nhóm.
  - **Xem số dư:** cộng tám số dư con. Thường đọc từ một view CQRS (slide 15), không hỏi tám nhóm mỗi lần.
  - **Trừ từ M** (merchant rút tiền): chọn một tài khoản con đủ tiền. Không con nào đủ thì gom tiền về trước bằng chuyển nội bộ; mỗi lần chuyển đó lại là một Saga.
  - **Quy tắc không âm** áp dụng cho từng tài khoản con.
  - **Đối soát:** sổ sách phải biết tám tài khoản con là của cùng một merchant.
  - Một cách khác: gom nhiều lệnh cộng nhỏ thành một lệnh.
- **"Saga thêm hai lần Raft commit nối tiếp. Có chặn thông lượng không?"** Làm từng giao dịch chậm hơn thì có. Chặn thông lượng thì không: các nhóm gom lô và chạy song song. Phép tính ở mục 7.
- **"Vậy gom lô thật to, một nghìn lệnh mỗi lô, cho ít nhóm hơn?"** **[Ngoài sách]** Được thông lượng, mất độ trễ. Mỗi lệnh phải chờ lô của nó đóng rồi mới được commit; lô to thì chờ lâu, và lô chở nhiều dữ liệu hơn thì `fsync` và vòng mạng cũng dài hơn. Một transfer chéo partition đi qua năm bước nối tiếp, mỗi bước cỡ một lô (mục 7), nên phần chờ đó nhân lên năm lần. Cỡ lô là núm vặn giữa độ trễ và thông lượng; chọn bằng benchmark, theo mục tiêu độ trễ của sản phẩm.
- **"Vậy đã chứng minh đạt 1 triệu chưa?"** Chưa. Slide chỉ cho cỡ, dựa trên giả định. Muốn khẳng định phải benchmark đầu-cuối (mục 7).

## 6. Đừng nói sai

- Đừng nói "cả năm yêu cầu đều đã đạt". Bốn yêu cầu đạt về thiết kế; yêu cầu quy mô mới có đường đi và một phép chia, chưa có số đo.
- Đừng nói "hệ thống đã đạt 99,99%". Raft cho một thiết kế chịu được một máy chết; con số 99,99% phải đo khi vận hành.
- Khi đọc dòng transactional, đừng nói "Saga làm giao dịch atomic". Đạt nghĩa là kết quả cuối xong trọn hoặc được bù; trạng thái giữa chừng vẫn thấy được (slide 21).
- Đừng nói "hệ thống đạt 1M TPS", và đừng đưa ra con số thông lượng đo được nào. Mọi con số trên slide là giả định.
- Đừng nói "sách tính ra 29 nhóm" hay "43 shard". Sách chỉ cho 2 triệu thao tác mỗi giây, 1.000 TPS mỗi node để tính nhẩm, và "vài nghìn node".
- Đừng nói "100.000 thao tác/s mỗi nhóm là số đo", hay "là số của sách". Đó là phép nhẩm từ một giả định: lô ≈ 1 ms, ~100 lệnh mỗi lô.
- Đừng nói "file cục bộ bỏ hết lượt mạng, nên Raft không tốn mạng". Raft vẫn có một vòng mạng tới follower cho mỗi lô. Slide 16 chỉ bỏ các lượt gọi Kafka và database ở xa cho từng lệnh.
- Đừng nói "mỗi lệnh chỉ mất 10 micro giây" (1 ms chia 100). 100.000 mỗi giây là thông lượng của nhóm; mỗi lệnh vẫn chờ cả lô, cỡ mili giây.
- Đừng nói "shard Saga chắc chắn chạy được 70.000 vì nhóm ví chạy được". Đó vẫn là giả định, phải đo riêng.
- Đừng nói "tầng Saga là nút thắt", hay "cần một database chịu ba triệu lần ghi mỗi giây". Ba triệu được chia ra khoảng 43 shard.
- Đừng nói "mỗi giao dịch ghi bốn lần vào phase status table". Figure 29 có ba lần; không có lần ghi `tx done` riêng.
- Đừng nói "29 máy" hay "216 máy". 216 là replica slot; số máy do cách xếp và các thành phần không state quyết định.
- Đừng nói "sách sai, chỉ cần 216 chứ không phải vài nghìn". Sách chia cho 1.000 TPS mỗi node database; slide chia cho 70.000 mỗi nhóm, một giả định ngoài sách. Khác nhau vì mẫu số khác nhau; cả hai đều là phép nháp.
- Đừng nói "thêm nhóm giải quyết tài khoản nóng". Phải chia tài khoản con.
- Đừng nói "độ trễ cộng dồn làm giảm thông lượng". Nó làm chậm từng giao dịch, không giới hạn số giao dịch mỗi giây.
- Đừng nói "một Saga coordinator với một bảng đứng trước 29 nhóm". Coordinator và bảng chia theo tx id.

## 7. Giải thích chi tiết

**Đối chiếu năm yêu cầu, khi bị hỏi vặn.** Mỗi dòng của bảng ở *Hiểu nhanh* có một giới hạn cần nói thật:
- **Chỉ chuyển tiền.** Một endpoint; `transaction_id` là khóa chống trùng, nên gửi lại sau timeout là an toàn (slide 5). Nạp, rút, thanh toán vẫn ngoài phạm vi.
- **Transactional.** Saga không atomic và không cô lập: người khác có thể thấy `A $0 · C $0`, rồi thấy C có $1 trước khi Saga đóng (slide 21). "Đạt" nghĩa là giao dịch nào cũng kết thúc ở một trong hai kết cục: xong trọn, hoặc được bù về như cũ. Nhánh bù khi P2 không trả lời là **[Ngoài sách]**, ở sổ tay 21.
- **Độ tin cậy 99,99%.** Raft giữ được event khi một trong ba máy của nhóm chết, vì còn đa số (hai trên ba), và tự bầu leader mới (slide 17–18, sổ tay 18). Nhưng 99,99% là con số vận hành. Nó còn phụ thuộc thời gian bầu leader, việc coordinator và phase status table cũng được nhân bản (sổ tay 22), và cách xếp bản sao theo vùng lỗi (mục 5). Chỉ đo mới biết.
- **Reproducible.** Event log bất biến, hàm apply deterministic: replay ra lại số dư ở bất kỳ thời điểm nào (slide 14); snapshot trên object storage giúp không phải replay từ đầu (sổ tay 14). Với nhiều partition, mỗi partition replay log của chính nó **[Ngoài sách: suy luận]**.
- **1 triệu transfer/s.** Phần còn lại của slide này.

**Tải theo từng tầng, cho một giây ở mục tiêu 1M transfer/s [Ngoài sách: phép tính minh họa, giả định 70.000 mỗi nhóm]:**

| Tầng | Chia theo | Việc cho mỗi transfer | Mỗi giây | Đơn vị | Cần |
|---|---|---|---|---|---|
| Nhóm ví (Raft) | account id | 2 thao tác: debit, credit | 2.000.000 | nhóm 3 bản sao, 70.000/s | ≈ 29 nhóm |
| Shard phase status | tx id | 3 bản ghi: created, P1 done, P2 done | 3.000.000 | shard 3 bản sao, 70.000/s (giả định, đo riêng) | ≈ 43 shard |
| Tiến trình coordinator | tx id | 1 luồng Saga: 2 lệnh gửi, 2 lần nhận push | ~1.000.000 luồng | instance không state | thêm instance |
| Router | không | 2 lần định tuyến | ~2.000.000 | instance không state | thêm instance |
| Reverse proxy | partition | 2 lời gọi giữ chờ, 2 lần trả | ~2.000.000 | instance không state bền | thêm instance |
| **Tổng phần có state** | | | | | **≈ 72 nhóm × 3 ≈ 216 replica slot** |

Hàng ví chỉ đúng khi tải **rải đều** trên các tài khoản. Tài khoản nóng phá giả định đó. Hàng Saga thì luôn rải đều, vì không có tx id nào nóng.

**Tài khoản nóng, nói kỹ hơn [Ngoài sách].**
- **Vì sao `≤ 70,000`.** Đó là sức của cả nhóm. Thực tế nhóm của M còn giữ nhiều tài khoản khác, nên phần dành cho M còn ít hơn.
- **Ví dụ nhẩm** (số giả định): một merchant nhận 200.000 lệnh cộng mỗi giây lúc cao điểm, ví dụ một đợt flash sale. Một nhóm không đủ: cần ít nhất ⌈200.000 ÷ 70.000⌉ = 3 nhóm. Tám tài khoản con trên tám partition: 8 × 70.000 ≈ 560.000, đủ và còn dư. Cần hơn nữa thì thêm tài khoản con.
- **Tài khoản con phải nằm ở các partition khác nhau.** Router đọc `hash(account_id)`, nên phải chọn mã sao cho tám mã rơi vào tám partition khác nhau, hoặc ghi chỗ đặt vào cấu hình của router.
- **Phát hiện sớm.** Theo dõi tải theo từng tài khoản. Tài khoản nào tiến gần sức một nhóm thì tách trước, đừng chờ nhóm của nó quá tải.

**Độ trễ cộng dồn, nhưng không chặn thông lượng [Ngoài sách].** Đường đi của một transfer chéo partition chạy tuần tự:

```
shard Saga: ghi created           (1 lô: fsync + 1 vòng mạng)
+ P1: Raft commit A −$1 + push    (1 lô, rồi push)
+ shard Saga: ghi P1 done         (1 lô)
+ P2: Raft commit C +$1 + push    (1 lô, rồi push)
+ shard Saga: ghi P2 done         (1 lô)
→ trả lời client
```

Hai lần Raft commit nối tiếp ở nhóm ví (P1 rồi P2), cộng ba lần ghi tiến độ ở shard Saga. Mỗi bước tốn cỡ một lô: chờ lô của nó đóng, một `fsync`, một vòng mạng, tức vài mili giây. Năm bước nối tiếp, cộng push và các lượt gửi, nên tổng là vài lần như thế; ví dụ dưới đây lấy 20 ms cho tròn. Mỗi giao dịch vì thế chậm hơn một lệnh trong một nhóm. Nhưng thông lượng không bị chặn. Một nhóm không làm xong giao dịch này rồi mới nhận giao dịch sau; nó gom lệnh của rất nhiều giao dịch vào cùng một lần fsync và một vòng Raft.

**Núm vặn: cỡ lô.** Lô to hơn: mỗi `fsync` và mỗi vòng mạng chở nhiều lệnh hơn, thông lượng mỗi nhóm tăng, cần ít nhóm hơn. Nhưng mỗi lệnh chờ lô của nó lâu hơn, và chờ năm lần nối tiếp. Lô nhỏ hơn thì ngược lại. Không có cỡ lô "đúng"; chọn bằng benchmark, theo mục tiêu độ trễ.

Định luật Little cho con số: **số giao dịch đang chạy dở = thông lượng × độ trễ**. Ví dụ giả định, độ trễ đầu-cuối 20 ms: 1.000.000 × 0,02 = **20.000 giao dịch đang chạy dở** cùng lúc. Đó là việc của các tiến trình coordinator và reverse proxy: giữ 20.000 lời gọi đang chờ. Chúng thêm instance được. Độ trễ gấp đôi thì số đang chạy dở gấp đôi; thông lượng không đổi.

**Vì sao "đo cả Raft group".** Đo riêng RocksDB hay riêng ổ đĩa đều cho số đẹp hơn thực tế. Trần C của một nhóm là trần của cả chuỗi: nối command, validate, ghi event bền, quorum (slide 19), cộng phần push, với gom lô bật như khi chạy thật. Chỉ số đo trên cả chuỗi đó mới dùng được làm mẫu số. Với shard Saga cũng vậy: đo nối, fsync và quorum, với gom lô bật.

**Benchmark đầu-cuối phải đo gì [Ngoài sách].**
1. C của một nhóm ví, đo trên cả chuỗi, với gom lô bật và cách xếp bản sao lên máy như thật. Ghi cả độ trễ ở vài cỡ lô, để thấy núm vặn.
2. C của một shard Saga, đo riêng, với gom lô bật.
3. Cả hệ thống ở 70%: gần hết giao dịch đi chéo partition, có tài khoản nóng theo phân bố thật, có push status và read path.
4. Trong lúc chạy: tắt một node, đổi leader, cho retry xảy ra. Thông lượng phải đứng vững; đó là lý do giữ 30% dư.

Rồi mới thay số đo vào công thức ở mục 5.

**Nối với slide 4.** Slide 4 cho đòn bẩy: tăng sức mỗi node thì giảm số node. Sách giả định 1.000 TPS mỗi node database, nên cần 2.000 node. Slide này kéo đòn bẩy đó: file cục bộ (slide 16) bỏ lượt gọi ở xa cho từng lệnh, gom lô chia giá `fsync` và vòng Raft cho cả lô. Một nhóm lên cỡ 100.000, khoảng một trăm lần, nên tầng ví từ 2.000 node xuống 29 nhóm **[Ngoài sách: suy luận]**. Rồi ba điều chỉnh: đơn vị là **nhóm ba bản sao**, mẫu số có **dư địa** (70%), và đếm cả **tầng Saga**, không chỉ tầng ví.

## 8. Kết buổi

- **Điều buổi trình bày để lại:** một thiết kế mà mỗi thành phần đều có lý do tồn tại, vì mỗi thành phần sinh ra để trả một món nợ của thiết kế trước (slide 22 đã nhìn lại năm lần đổi). Và một cách trả lời câu hỏi quy mô: tải của từng tầng chia cho sức của một nhóm, rồi đo.
- **Câu kết gợi ý** (sau bước 4 và câu chốt về benchmark): "Kết bài. Bốn yêu cầu đầu đạt nhờ thiết kế: một API, Saga, Raft, event sourcing. Yêu cầu thứ năm, một triệu giao dịch mỗi giây, kiến trúc này có đường đi rõ ràng: thêm nhóm ví, thêm shard Saga, chia tài khoản nóng. Còn con số thật thì phải benchmark. Cảm ơn mọi người đã lắng nghe. Mình xin nhận câu hỏi."
- **Đừng kể lại năm lần đổi kiến trúc ở đây.** Phần nhìn lại đã nói ở slide 22. Câu kết ở slide này chỉ trả lời một câu: có đạt mục tiêu không.
- **Mở phần hỏi đáp:** "Mình xin nhận câu hỏi." Nếu khán giả còn ngại, gợi ý ba chỗ hay bị hỏi nhất. Sổ tay đã có câu trả lời:
  - `mmap` có bền không, lúc nào e43 thật sự nằm trên đĩa → sổ tay 16.
  - Timeout có phải thất bại không, gửi lại có bị trừ hai lần không → sổ tay 18 và 21.
  - Vì sao push chứ không poll, vì sao read side có kho riêng → sổ tay 21 và 15.
- **Câu hỏi hay gặp lúc kết, và chỗ trả lời:**
  - "Vậy đạt một triệu TPS chưa?" → Chưa có số đo; slide này chỉ cho cỡ. Mục 5, và mục 7 (benchmark phải đo gì).
  - "99,99% lấy đâu ra, đạt chưa?" → Đạt về thiết kế, chưa đo (mục 7, phần đối chiếu năm yêu cầu).
  - "Saga có atomic không? Lỗi giữa chừng thì sao?" → Không atomic; nhánh bù ở sổ tay 21 **[Ngoài sách]**.
  - "Coordinator có phải điểm hỏng đơn mới không?" → sổ tay 22, mục 5.
  - "Sao không dùng 2PC cho đơn giản?" → sổ tay 7 và 10.
  - "Một merchant rất lớn thì sao?" → bước 4 của slide này; tài khoản con ở mục 5.
- **Khi có người muốn xem đúng Figure 29 của sách, từng bước:** dùng bảng 15 bước ở sổ tay 21. Bản 4 không còn slide riêng cho hình này.
- **Khi câu hỏi chỉ vào một khối của kiến trúc:** lùi một slide, về bản đồ ở slide 22; bảng "mỗi khái niệm nằm ở lớp nào" ở sổ tay 22, mục 4.
