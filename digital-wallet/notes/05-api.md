# Slide 5 — API: one endpoint

> **Ý chính:** Chỉ có một API: `POST /v1/wallet/balance_transfer`. Hai trường đáng chú ý: `amount` là **string**, để không bị sai số làm tròn; và `transaction_id` là **khóa chống trùng**. Nhờ `transaction_id`, gửi lại một request bị timeout là an toàn, với điều kiện server ghi id cùng kết quả **trong cùng transaction với lệnh trừ tiền** **[Ngoài sách]**.

**Chặng:** 0, Scope · **Nguồn:** Book: API design, p.501–502 · Added: how the server uses transaction_id · **Bước bấm:** 3

---

## Hiểu nhanh trước khi nhìn hình

**Một tình huống thật:** Client gửi lệnh A → C $1. Rồi client bị timeout: chờ mãi không thấy trả lời. Timeout chỉ có nghĩa là client **không nhận được câu trả lời**. Có thể tiền đã chuyển xong, chỉ là câu trả lời bị mất trên đường về. Nếu client gửi lại như một lệnh mới, server có thể trừ A lần thứ hai.

**Vai trò của `transaction_id`:** Đây là một mã duy nhất (uuid) do client tự sinh cho lần chuyển này. Client giữ nguyên mã đó mỗi khi gửi lại. Server nhớ mã nào đã xử lý và kết quả của nó. Gặp lại mã cũ, server trả lại kết quả cũ, không trừ tiền lần nữa. Kỹ thuật này gọi là **chống trùng** (deduplication), hay làm cho thao tác **idempotent**: gửi một lần hay nhiều lần đều ra cùng kết quả.

**Điều kiện để nó thật sự an toàn:** Server phải ghi mã và kết quả **trong cùng transaction** làm đổi số dư. Nếu ghi mã ở một bước riêng, sau lệnh trừ, thì một lần crash chen giữa hai bước là đủ để trừ hai lần **[Ngoài sách]**.

**`amount` là string:** Kiểu số thực `double` không biểu diễn chính xác phần lớn số thập phân. Truyền dạng chuỗi, như `"1.00"`, giữ nguyên giá trị. Khi xử lý, hệ thống chuyển sang kiểu số tiền chính xác.

## 1. Slide này để làm gì

Chốt đầu vào của hệ thống. Đồng thời cài sẵn hai ý sẽ quay lại về sau:
- tiền phải chính xác tuyệt đối;
- trong hệ phân tán, client **sẽ** phải gửi lại request, nên hệ thống phải chịu được việc nhận cùng một lệnh nhiều lần.

## 2. Đọc hình

**Dòng ngữ cảnh:** *`POST /v1/wallet/balance_transfer` moves balance from one wallet to another.*

**Bảng request bên trái:**

| Field | Type | Meaning trên slide |
|---|---|---|
| `from_account` | string | Debit account (tài khoản bị trừ) |
| `to_account` | string | Credit account (tài khoản được cộng) |
| `amount` | **string** (in đậm) | Not a double: no rounding |
| `currency` | string | ISO 4217 code (USD, VND…) |
| `transaction_id` | uuid | For deduplication (dòng này có nền nhạt) |

Dưới bảng là dòng **Response**: `{ "status": "success", "transaction_id": "…" }`. Sách viết hoa `Status` và `Transaction_id`; slide chuẩn hóa thành JSON viết thường.

**Sơ đồ bên phải có ba cột:** *Client* (biểu tượng điện thoại), *Wallet API* (một khối), và bảng *Processed IDs* với hai cột `id` và `status`.
- **Bước 1:** mũi tên từ Client tới Wallet API mang `POST /v1/wallet/balance_transfer` và `id: 0158…0002`. Từ Wallet API sang bảng là mũi tên xanh lá `record id`. Bảng hiện dòng `0158…0002 · success ✓`.
- **Bước 2:** đường trả lời từ Wallet API về Client bị đứt, có dấu ✕ đỏ, nhãn `response lost (timeout)`.
- **Bước 3:** mũi tên mới từ Client, nhãn `retry, same transaction_id`. Wallet API tra bảng bằng một mũi tên nét đứt, nhãn `already processed`. Mũi tên xanh lá về Client mang `{"status": "success"}`. Bên dưới có thẻ xanh `no second debit`.

Hình không vẽ bảng số dư. Nhãn `record id` chỉ có hai chữ. Khi nói, hãy thêm điều kiện mà nhãn không ghi: id và kết quả được ghi **cùng transaction với lệnh trừ** **[Ngoài sách]**.

**Dải bước dưới sơ đồ:**
1. Request carries a client-made `transaction_id`
2. Response lost: did the money move?
3. Retry, same id: original result, no second debit

**Footer:** *Book: API design, p.501–502* và *Added: how the server uses transaction_id*. Chữ "Added" báo rằng kịch bản gửi lại và cách server dùng mã là phần bổ sung. Sách chỉ định nghĩa `transaction_id` là *"ID used for deduplication"*.

## 3. Trình bày theo bước

Mặc định các bước tự chạy, cách nhau 0,6 giây. Nhấn A nếu muốn bấm từng bước.

| Bước | Hình và dải bước | Nói |
|---|---|---|
| 0 | Bảng request và sơ đồ trống | "Một endpoint, năm trường. Mình muốn nói kỹ hai trường: `amount` và `transaction_id`." Nói phần `amount` ở đây (xem §7). |
| 1 | POST mang `id: 0158…0002`, mũi tên `record id`, dòng `success ✓`; ô 1 hiện | "Client tự sinh một `transaction_id` và gửi kèm. Server ghi id đó cùng kết quả, **trong cùng transaction với lệnh trừ tiền**. Hoặc cả hai cùng có, hoặc cả hai cùng không." |
| 2 | Đường trả lời đứt, `response lost (timeout)`; ô 2 hiện | "Câu trả lời bị mất trên đường về. Client bị timeout. Giờ client không biết tiền đã chuyển hay chưa." |
| 3 | `retry, same transaction_id`, `already processed`, `{"status": "success"}`, `no second debit`; ô 3 hiện | "Client gửi lại với **đúng** id cũ. Server tra bảng, thấy id đã có cùng kết quả đã lưu. Nó trả lại kết quả đó và không trừ tiền lần hai." |

## 4. Giải thích sâu

- **Vì sao `amount` là string.** Sách dẫn lại Chapter 11 (Payment System) và nói công bằng: nhiều người vẫn dùng float hay double, và đó là *"a proper choice as long as we understand the potential risk of losing precision"*. Trong code, thường chuyển string sang kiểu decimal chính xác, hoặc lưu bằng số nguyên theo đơn vị nhỏ nhất như cent **[Ngoài sách]**.
- **Vì sao cần `transaction_id`.** Trong hệ phân tán, **timeout không có nghĩa là thất bại**. Client buộc phải thử lại. Thiếu khóa chống trùng, mỗi lần thử lại có thể trừ tiền thêm một lần.
- **Vì sao id phải ghi cùng transaction với lệnh trừ [Ngoài sách].** Nếu ghi id là một bước riêng, có hai lỗ hổng:
  - Server trừ A xong thì crash, **trước** khi kịp ghi id. Client gửi lại. Server không thấy id, nên trừ A lần nữa.
  - Lần gửi lại tới **trong lúc** request đầu còn đang chạy. Request đầu chưa ghi id, nên lần gửi lại cũng không thấy id. Hai request cùng trừ tiền.

  Cách đóng cả hai lỗ: ghi id và kết quả trong **cùng local transaction** làm đổi số dư, kèm một ràng buộc duy nhất (unique key) trên `transaction_id`. Crash thì mất cả hai hoặc còn cả hai. Request thứ hai cùng id đụng unique key, phải chờ hoặc bị từ chối, rồi đọc kết quả đã lưu. Một cách khác là để **một nơi duy nhất** xếp thứ tự mọi lệnh, như command queue ở slide 12.
- **Đây là quy tắc bộ slide dùng từ đầu tới cuối:** mỗi thao tác có một mã; kết quả được ghi cùng mã đó, bền, trong cùng bước làm đổi số dư. Ý này quay lại ở:
  - TC/C (notebook 8): mỗi database chỉ áp dụng một transfer id tối đa một lần, nên coordinator gửi lại được;
  - slide 12: `tx 7f3c` bị gửi lại thì không sinh event mới, chỉ trả lại kết quả cũ;
  - Raft (slide 18; phần leader chết nằm trong notebook 18): nếu leader chết trước khi command thành event, sách yêu cầu client gửi lại command; bản ghi chống trùng nằm trong log đã nhân bản nên leader mới cũng có **[Ngoài sách]**;
  - Saga qua hai partition (notebook 21, phần *Khi P2 không trả lời*): khi P2 không trả lời, coordinator gửi lại với **cùng mã thao tác** **[Ngoài sách]**.

## 5. Câu hỏi có thể gặp

- **"Ai sinh `transaction_id`, client hay server?"** Phía gửi request (client hoặc service gọi). Mã phải giữ nguyên qua mọi lần gửi lại. Nếu server sinh mã thì lần gửi lại sẽ có mã mới, và chống trùng mất tác dụng **[Ngoài sách: diễn giải]**.
- **"Sao không chuyển tiền xong rồi mới ghi id cho đơn giản?"** Vì crash có thể rơi đúng vào khoảng giữa: tiền đã trừ, id chưa có. Lần gửi lại không thấy id và trừ thêm. Ghi chung một transaction thì không có khoảng giữa đó **[Ngoài sách]**.
- **"Hai request cùng id tới gần như cùng lúc thì sao?"** Unique key trên `transaction_id` chỉ cho một transaction commit. Request kia chờ hoặc bị từ chối, rồi đọc kết quả đã lưu **[Ngoài sách]**.
- **"Lưu cả kết quả làm gì, chỉ lưu id không đủ sao?"** Lần gửi lại phải nhận **đúng** câu trả lời của lần đầu, kể cả khi lần đầu bị từ chối, ví dụ vì không đủ tiền. Chỉ có id thì server biết "đã thấy" nhưng không biết trả lời gì **[Ngoài sách]**.
- **"Server nhớ các id bao lâu?"** Sách không nói. Thực tế thường giữ trong một khoảng thời gian dài hơn chu kỳ gửi lại của client **[Ngoài sách]**.
- **"Có `currency` thì có hỗ trợ đổi ngoại tệ không?"** Không. Ngoại tệ nằm ngoài phạm vi (slide 2). `currency` chỉ ghi đơn vị của `amount`.

## 6. Đừng nói sai / phần ngoài sách

- **[Ngoài sách]** Kịch bản gửi lại trên sơ đồ là minh họa của bộ slide; footer ghi *Added: how the server uses transaction_id*. Việc ghi id cùng kết quả trong cùng transaction với lệnh trừ cũng là phần bổ sung.
- Đừng nói "server xử lý xong rồi ghi nhớ id". Câu đó tả hai lần ghi tách rời, và crash ở giữa sẽ gây trừ hai lần. Nói: "server ghi id và kết quả trong cùng transaction làm đổi số dư".
- Đừng nói bảng *Processed IDs* là "một bảng log riêng ghi sau". Nó phải commit cùng lệnh trừ tiền.
- Đừng nói "string nghĩa là lưu tiền dạng chữ trong database". String là định dạng truyền qua API.

## 7. Giải thích chi tiết

**Một endpoint, năm trường.** `POST /v1/wallet/balance_transfer` nhận `from_account`, `to_account`, `amount`, `currency`, `transaction_id`. Với ví dụ của bài: `from_account` là A, `to_account` là C, `amount` là `"1.00"`, `currency` là `USD`. Bốn trường này dễ hiểu. Hai trường đáng giảng kỹ là `amount` và `transaction_id`.

**`amount` là string.** Máy tính lưu `float` và `double` ở hệ nhị phân. Phần lớn số thập phân, như 0,1, không có dạng nhị phân chính xác. Vì vậy 0,1 + 0,2 cho ra 0,30000000000000004 chứ không phải 0,3. Một lần thì nhỏ. Hàng triệu giao dịch thì thành chênh lệch thật. Truyền `"1.00"` dạng chuỗi giữ nguyên giá trị. Server chuyển nó sang kiểu số tiền chính xác khi xử lý.

**`transaction_id` là khóa chống trùng.** Đi lại đúng kịch bản trên hình, với A = $1, C = $0:
1. Client sinh mã `0158…0002` và gửi lệnh A → C $1 kèm mã đó.
2. Server trừ A (A = $0), cộng C (C = $1), và ghi dòng `0158…0002 · success` vào bảng *Processed IDs*, tất cả trong cùng một transaction.
3. Câu trả lời bị mất. Client không biết tiền đã chuyển chưa.
4. Client gửi lại với **cùng** mã `0158…0002`.
5. Server tra bảng, thấy mã đã có. Nó trả lại `success`. A vẫn $0, C vẫn $1. Không có lần trừ thứ hai.

Không có mã thì ở bước 5 server coi đây là lệnh mới. A đã $0 nên lệnh bị từ chối vì không đủ tiền, và client nhận "thất bại" cho một lần chuyển đã thành công. Nếu A có nhiều tiền hơn, A bị trừ hai lần.

**Vì sao bước 2 phải là "cùng một transaction".** Hai lỗ hổng ở §4 có chung một gốc: "đã trừ tiền" và "đã ghi mã" là hai việc có thể lệch nhau. Ghi chung một transaction thì chúng không lệch được nữa **[Ngoài sách]**.

**Từ đây trở đi.** Mỗi khi bộ slide nói "gửi lại là an toàn", hãy nhớ điều kiện: bên nhận đã ghi mã thao tác cùng kết quả, trong cùng bước làm đổi số dư. Về sau mã này có tên khác. Ở slide 12 nó là `tx 7f3c`. Ở Saga qua hai partition (slide 21) nó là mã thao tác như `tx 7f3c · debit A`. Ý tưởng không đổi.

## 8. Dẫn dắt sang slide 6

- **Điều slide này để lại:** đã có yêu cầu, quy mô và API. Giờ là lúc thiết kế lần đầu.
- **Câu nối gợi ý:** "Có hợp đồng API rồi. Câu hỏi tự nhiên: thiết kế **đơn giản nhất** có thể là gì? Mình sẽ thử nó, và xem nó vỡ ở đâu."
- **Khán giả sẽ thấy ở slide 6:** hai wallet service, Zookeeper với bản đồ partition, và ba node Redis giữ A, B, C. Sau đó là một tia sét làm mất $1.
