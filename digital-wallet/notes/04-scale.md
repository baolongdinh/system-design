# Slide 4 — 1M transfers/s is 2M balance updates/s

> **Ý chính:** Mỗi lần chuyển tiền là hai cập nhật, một trừ và một cộng. Vì vậy 1 triệu lần chuyển mỗi giây là tới 2 triệu cập nhật mỗi giây ở tầng lưu trữ. Số node cần dùng tỉ lệ nghịch với số giao dịch một node làm được, nên **mục tiêu thiết kế là tăng thông lượng của từng node**.

**Chặng:** 0, Scope · **Nguồn:** Book: Back-of-the-envelope estimation, Table 1, p.499–500 · **Bước bấm:** 3

---

## Hiểu nhanh trước khi nhìn hình

**Đọc con số:** Lần chuyển A → C $1 gồm `A −$1` và `C +$1`. Đó là hai cập nhật. Nhân lên: 1.000.000 lần chuyển mỗi giây × 2 = 2.000.000 cập nhật mỗi giây.

**Từ cập nhật ra số máy:** TPS ở đây là số giao dịch một node (một máy database) làm được mỗi giây. Sách giả định một node làm được 1.000 TPS. Vậy cần 2.000.000 ÷ 1.000 = **2.000 node**.

**Bài học của slide:** Số node tỉ lệ nghịch với TPS mỗi node. Node nhanh gấp 10 lần thì cần ít hơn 10 lần. Đây chỉ là phép tính nháp (back-of-the-envelope) để thấy hai đòn bẩy: làm mỗi node nhanh hơn, hoặc chia tải ra nhiều node. Nó chưa chứng minh kiến trúc cuối đạt mục tiêu.

## 1. Slide này để làm gì

Biến một con số lớn (1M TPS) thành một **đòn bẩy thiết kế** cụ thể: thông lượng của mỗi node. Phần đào sâu ở slide 16–19 chính là để kéo đòn bẩy này.

## 2. Đọc hình

**Dòng ngữ cảnh:** *Each transfer debits one account and credits another.*

**Hàng trên cùng: một phép tính ba ô** (bước 1):
`1,000,000 transfers/s` × `2 updates each (debit + credit)` = `2,000,000 updates/s`. Ô kết quả có nền xám và số màu xanh.

**Chú giải** ngay dưới phép tính, luôn hiện: `1 rack glyph = 200 nodes`, tức mỗi biểu tượng rack nhỏ là 200 node.

**Ba hàng so sánh** (Table 1 của sách):

| Hàng | Nhãn trái | Biểu tượng rack | Nhãn phải | Hiện ở bước |
|---|---|---|---|---|
| giữa | `1,000 TPS per node` | 10 | `2,000 nodes` (xanh) | 2, viền đậm |
| trên | `100 TPS per node` | 100 (5 hàng × 20) | `20,000 nodes` (đỏ) | 3 |
| dưới | `10,000 TPS per node` | 1 | `200 nodes` (xanh lá) | 3 |

Hàng 1,000 TPS có viền đậm vì đó là giả định của sách. Hai hàng còn lại hiện cùng lúc ở bước 3 để so sánh.

**Dải bước dưới sơ đồ:**
1. One debit + one credit per transfer
2. Book: 1,000 TPS per node → 2,000 nodes
3. 10× per-node TPS → 10× fewer nodes

**Footer:** *Book: Back-of-the-envelope estimation, Table 1, p.499–500*. Slide này không có dòng Added.

## 3. Trình bày theo bước

Mặc định các bước tự chạy, cách nhau 0,6 giây. Nhấn A nếu muốn bấm từng bước.

| Bước | Hình và dải bước | Nói |
|---|---|---|
| 1 | Phép tính `1,000,000 × 2 = 2,000,000`; ô 1 hiện | "Mỗi lần chuyển là một lần trừ và một lần cộng. Tầng lưu trữ thấy gấp đôi số request: hai triệu cập nhật mỗi giây." |
| 2 | Hàng `1,000 TPS per node` → `2,000 nodes`, viền đậm; ô 2 hiện | "Sách giả định một node database làm được khoảng một nghìn TPS. Chia ra, cần khoảng hai nghìn node." |
| 3 | Hàng `100 TPS` → `20,000 nodes` và hàng `10,000 TPS` → `200 nodes`; ô 3 hiện | "Nếu mỗi node chỉ làm được một trăm TPS thì cần hai mươi nghìn node. Làm được mười nghìn TPS thì chỉ cần hai trăm. Nhìn số rack: một trăm, mười, một. Tăng thông lượng mỗi node gấp mười là giảm số máy mười lần." |

## 4. Giải thích sâu

- **Sách tính hai lần, và đó là điểm đáng nhắc.**
  - Lần đầu: 1.000.000 ÷ 1.000 = **1.000 node**.
  - Sau đó sách tự sửa: mỗi lần chuyển gồm hai thao tác, nên phải xử lý tới 2 triệu TPS, tức **2.000 node**.

  Bài học: khi ước lượng, đếm thao tác ở tầng lưu trữ, không đếm request ở API.
- **1.000 TPS/node là giả định để tư duy.** Sách viết một database quan hệ trên một node thông thường làm được *"a few thousand"* giao dịch mỗi giây, có dẫn một benchmark, rồi chọn 1.000 cho dễ tính. Đây **không phải** một kết quả đo chung.
- **Vì sao "tăng TPS mỗi node" là mục tiêu.** Sách nói: phần cứng giữ nguyên, node càng xử lý được nhiều thì tổng số node càng ít, chi phí phần cứng càng thấp. Bộ slide thêm ba lý do **[Ngoài sách]**:
  - ít máy thì ít máy có thể hỏng;
  - ít máy thì vận hành đơn giản hơn;
  - ít partition thì ít lần chuyển phải đi qua hai máy, tức ít "khung giữa giữa các máy" (slide 3).

## 5. Câu hỏi có thể gặp

- **"Thực tế một node Postgres hay MySQL làm được bao nhiêu TPS?"** Tùy rất nhiều thứ: phần cứng, kích thước giao dịch, index, mức cô lập (isolation level), đĩa **[Ngoài sách]**. Câu trả lời đúng là "phải đo trước khi chọn kích thước cluster". Đừng đưa ra một con số cụ thể.
- **"Sao không dùng một database thật to?"** Một máy có giới hạn vật lý: CPU, đĩa, tranh chấp khóa. Ở 2 triệu cập nhật mỗi giây, ta buộc phải phân tán. Và phân tán làm xuất hiện bài toán khung giữa của slide 3.
- **"Có phải lúc nào cũng đúng 2 triệu cập nhật mỗi giây?"** Sách viết *"up to 2 million TPS"*, tức tối đa. Đây là ước lượng nháp để chọn cỡ hệ thống, không phải số đo.

## 6. Đừng nói sai / phần ngoài sách

- **[Ngoài sách]** Câu "thông lượng thật phụ thuộc phần cứng, schema, isolation level" là bổ sung của notebook. Slide không ghi câu này.
- Đừng nói "sách khẳng định cần đúng 2.000 node". Đó là kết quả của một giả định.
- Đừng nói "1.000 TPS là benchmark của database quan hệ". Sách nói "vài nghìn", rồi chọn 1.000 cho dễ tính.

## 7. Giải thích chi tiết

**Đếm đúng thứ cần đếm.** API nhận 1 triệu request mỗi giây. Nhưng mỗi request, như A → C $1, là hai cập nhật: `A −$1` và `C +$1`. Vì vậy tầng lưu trữ thấy **2 triệu cập nhật mỗi giây**. Sách cũng tính sai lần đầu rồi tự sửa: ra 1.000 node, sau đó nhân đôi thành 2.000. Khi ước lượng, hãy đếm ở nơi bị nghẽn (tầng lưu trữ), không đếm ở cửa vào.

**Con số 1.000 là để tính nhẩm.** Sách nói một node database quan hệ thường làm được "vài nghìn" TPS, rồi chọn 1.000 cho tròn. Khi trình bày, nói rõ điều này để không ai mang con số đi so với hệ thống của mình.

**Đọc ba hàng như một đường cong.** Số node tỉ lệ nghịch với TPS mỗi node:
- 100 TPS/node → 20.000 node (100 biểu tượng rack)
- 1.000 TPS/node → 2.000 node (10 biểu tượng rack)
- 10.000 TPS/node → 200 node (1 biểu tượng rack)

Mỗi bậc nhanh gấp 10 thì số máy giảm 10 lần. Biểu tượng rack giúp khán giả **thấy** chênh lệch đó mà không cần đọc số.

**Hai đòn bẩy để đạt 1M TPS.**
- **Làm mỗi node nhanh hơn.** Nửa sau của bài làm đúng việc này. Event sourcing xử lý từng lệnh tuần tự trên dữ liệu cục bộ, ghi file chỉ nối thêm (append-only). Nhờ vậy một node làm được nhiều việc hơn rất nhiều (slide 16–19).
- **Chia tải ra nhiều node.** Partition theo tài khoản ở slide 20.

Slide 23 làm lại đúng kiểu phép tính này, nhưng với đơn vị là một nhóm Raft thay vì một node.

**Khi chuyển sang slide sau, nhắc một ý.** Càng chia nhiều node, A và C càng dễ nằm ở hai node khác nhau. Với 2.000 node và tài khoản chia đều, gần như mọi lần chuyển đều chạm hai node **[Ngoài sách: suy luận]**. Khung giữa của slide 3 sẽ xảy ra liên tục.

## 8. Dẫn dắt sang slide 5

- **Điều slide này để lại:** đã biết quy mô, nhưng chưa biết client gửi gì vào hệ thống.
- **Câu nối gợi ý:** "Biết hệ thống phải lớn cỡ nào rồi. Giờ xem hợp đồng giữa client và hệ thống: một lệnh chuyển tiền gồm những gì. Có hai trường trong đó sẽ quay lại nhiều lần."
- **Khán giả sẽ thấy ở slide 5:** bảng năm trường của API bên trái, và bên phải là kịch bản gửi lại với cùng `transaction_id`: Client, Wallet API và bảng *Processed IDs*.
