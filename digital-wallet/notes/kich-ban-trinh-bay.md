# Kịch bản trình bày — Digital Wallet at Scale (bản 4, 23 slide)

Xuất tự động từ ghi chú trong `index.html` (`python3 tools/export_script.py`). Muốn sửa lời nói,
sửa trong `index.html` rồi chạy lại. Mỗi slide tự chạy các bước, 0,6 giây một bước; dải chú thích
dưới hình đánh số khớp với các dòng ▸ Bước. Nhấn A để chuyển sang bấm từng bước.
Giải thích sâu và câu hỏi có thể gặp nằm trong notebook của từng slide (`notes/NN-*.md`).

## Mở đầu (slide 1)

### Slide 1 — Digital Walletat Scale

*Nguồn: Digital Wallet, p.497–498*

*[Mở bài, đứng cạnh slide, chưa cần chỉ vào hình]*

Chào mọi người. Hôm nay mình cùng các bạn thiết kế backend cho một ví điện tử, theo Chapter 12 của cuốn *System Design Interview*, tập 2.

Phạm vi rất hẹp. Không nạp tiền, không rút tiền, không thanh toán. Chỉ đúng một việc: **chuyển tiền từ ví này sang ví kia**.

Nghe đơn giản. Nhưng có ba yêu cầu đi kèm:

- một triệu giao dịch mỗi giây;
- không mất, không tự sinh ra đồng nào;
- dựng lại được số dư ở bất kỳ thời điểm nào trong quá khứ.

Vì ba yêu cầu đó, kiến trúc sẽ đổi năm lần. Mỗi thiết kế giải được một vấn đề, rồi để lộ vấn đề tiếp theo.

*[Chỉ danh sách sáu chặng bên trái]* Đây là sáu chặng: Redis chia shard, giao dịch phân tán, event sourcing, file cục bộ, nhân bản bằng Raft, rồi chia partition và nối bằng Saga. Ở các slide sau, góc phải dưới ghi tên phần đang nói, kèm một dãy vạch nhỏ, để mọi người biết mình đang ở đâu.

Cả bài chỉ dùng **một ví dụ**: A chuyển cho C **một đô**. Lúc đầu A có một đô, C có không. Mọi người nhớ giúp mình con số này; slide nào cũng quay về đúng ví dụ đó.

*[Chỉ khung tên góc dưới]* Bộ slide dựng bằng Agent Fabric: Claude viết nội dung và phần trình chiếu, Antigravity vẽ hình minh họa và sơ đồ.

*[Cho người trình bày: các bước trên mỗi slide tự chạy. Nhấn A để tự bấm từng bước, R để chạy lại, N để mở ghi chú.]*

> **→ Chuyển sang slide 2:** Trong phỏng vấn system design, việc đầu tiên không phải vẽ kiến trúc, mà là hỏi cho rõ yêu cầu. Xem interviewer chốt với ta những gì.

## Phần 1 — Phạm vi và yêu cầu (slide 2–5)

### Slide 2 — Scope: one operation, five requirements

*Nguồn: Step 1: design scope, p.498–499*

*[Để cả slide hiện ra, chỉ lần lượt từng thẻ từ trái sang phải]*

Sau vài câu hỏi qua lại, interviewer chốt năm điều.

Một: **chỉ chuyển tiền giữa hai ví**. Mọi tính năng khác nằm ngoài phạm vi.

Hai: **một triệu TPS**. TPS là số giao dịch mỗi giây; ở đây là một triệu lần chuyển tiền mỗi giây.

Ba: độ tin cậy **ít nhất 99,99%**, bốn số chín.

Bốn: **transactional**. Mỗi lần chuyển hoặc xong trọn vẹn, hoặc coi như chưa xảy ra. Không có chuyện chuyển được một nửa.

*[Chỉ thẻ thứ năm, nền màu khác]* Năm, và là điều mình muốn mọi người nhớ nhất: **reproducible**, tái lập được. Bất cứ lúc nào, ta cũng dựng lại được số dư trong quá khứ, bằng cách chạy lại dữ liệu từ đầu.

Vì sao cần điều này? Ngoài đời, người ta kiểm tra bằng cách đối soát với sao kê ngân hàng. Đối soát cho biết **có** chênh lệch. Nó không cho biết chênh lệch **sinh ra thế nào**. Muốn truy ra nguyên nhân, hệ thống phải tái lập được lịch sử.

*[Chỉ hình dưới]* Hình dưới là ví dụ của cả bài: một đô đi từ ví A, qua nền tảng ví, sang ví C.

Nói trước: chính yêu cầu thứ năm sẽ đưa ta tới event sourcing ở nửa sau bài. Ngoại tệ, tỷ giá và các tính năng ví khác thì không bàn.

> **→ Chuyển sang slide 3:** Trước khi tính quy mô, mình muốn nói thật chính xác "chuyển tiền đúng" nghĩa là gì. Đó là thước đo cho mọi thiết kế phía sau.

### Slide 3 — The rule every design must keep

*Nguồn: In-memory sharding p.503; Unbalanced balance p.513 · Ngoài sách: the in-flight frame*

Chuyển một đô từ A sang C thực ra là **hai cập nhật**: trừ A một đô, cộng C một đô. Hai cập nhật này phải hành xử như một.

*[Chỉ khung Before]* Ban đầu A có một đô, C có không. Tổng là một đô.

▸ **Bước 1** — *[khung giữa, viền đỏ nét đứt]* Cập nhật đầu tiên: trừ A. A còn không, C vẫn không. Tổng bằng **không**. Một đô đang "bay" giữa đường. Mình gọi đây là **khung giữa**. *[Ngoài sách: cách gọi "khung giữa"]*

▸ **Bước 2** — *[khung After, viền xanh]* Cập nhật thứ hai: cộng C. C có một đô, tổng về lại một đô. Đây là đích đến.

▸ **Bước 3** — *[hai mũi tên cong dưới khung giữa]* Từ khung giữa chỉ có hai lối ra. Mũi tên xanh sang khung After: **đi tiếp cho xong**, tức cộng C. Mũi tên đỏ quay về khung Before: **hoàn tác**, tức trả A một đô. Điều duy nhất không được phép là **dừng ở giữa**. *[Ngoài sách: cách đóng khung "đi tiếp hoặc hoàn tác"]*

Ba ý cần nhớ. **Atomic**: hai cập nhật cùng có hiệu lực, hoặc cùng không. **Bảo toàn**: chuyển xong, tổng A cộng C phải bằng lúc trước; sách gọi đây là quy tắc cơ bản của kế toán. Và **khung giữa là có thật**: khi A và C nằm trên hai máy, không có gì tự giấu nó đi.

Từ giờ, gặp thiết kế nào mình cũng hỏi: **nó làm gì với khung giữa?** Kẹt lại ở đó? Khóa lại để không ai thấy? Hay để lộ ra, nhưng biết đi tiếp hoặc lùi lại?

> **→ Chuyển sang slide 4:** Giữ quy tắc này trong đầu. Giờ tính quy mô: một triệu giao dịch mỗi giây thì cần bao nhiêu máy?

### Slide 4 — 1M transfers/s is 2M balance updates/s

*Nguồn: Back-of-the-envelope estimation, Table 1, p.499–500*

▸ **Bước 1** — *[phép nhân ở trên]* Mỗi lần chuyển tiền có một lần trừ và một lần cộng. Đó là hai cập nhật ở tầng lưu trữ. Vậy một triệu giao dịch mỗi giây là **hai triệu cập nhật mỗi giây**.

Sách tính hai lần. Lần đầu: một triệu chia một nghìn TPS mỗi node, ra một nghìn node. Rồi sách tự sửa: mỗi giao dịch là hai thao tác, nên cần **hai nghìn node**. Bài học nhỏ: khi ước lượng, đừng đếm request ở API; hãy đếm thao tác ở tầng lưu trữ.

▸ **Bước 2** — *[hàng 1,000 TPS, viền đậm]* Sách giả định một node database làm được khoảng một nghìn TPS. Vậy cần hai nghìn node. Mỗi biểu tượng rack trên hình là hai trăm node, nên hàng này có mười rack.

▸ **Bước 3** — *[hàng 100 và hàng 10,000]* Hai hàng còn lại. Một trăm TPS mỗi node: cần **hai mươi nghìn** node, một trăm rack. Mười nghìn TPS mỗi node: chỉ cần **hai trăm** node, đúng một rack. Thông lượng mỗi node tăng mười lần, số máy giảm mười lần.

*[Ngoài sách]* Con số một nghìn TPS là **giả định để tư duy**, không phải benchmark. Con số thật phụ thuộc phần cứng, schema, kích thước giao dịch, isolation level.

Bài học thật của slide là một **mục tiêu thiết kế**, và sách nói thẳng: phải tăng thông lượng của **từng node**. Ít máy hơn là ít tiền phần cứng hơn. *[Ngoài sách]* Cũng là ít thứ có thể hỏng hơn.

> **→ Chuyển sang slide 5:** Biết quy mô rồi. Giờ xem hợp đồng giữa client và hệ thống: API trông thế nào.

### Slide 5 — API: one endpoint

*Nguồn: API design, p.501–502 · Ngoài sách: how the server uses transaction_id*

*[Chỉ bảng bên trái]* Bài toán chỉ cần **một API**: `POST /v1/wallet/balance_transfer`. Request có năm trường: tài khoản bị trừ, tài khoản được cộng, số tiền, loại tiền theo chuẩn ISO 4217, và `transaction_id`. Hai trường cần nói kỹ.

*[Chỉ dòng amount]* Một: `amount` là **string**, không phải `double`. Số thực dấu phẩy động không biểu diễn chính xác phần lớn số thập phân: 0,1 cộng 0,2 không ra đúng 0,3. Với tiền, sai lệch đó sẽ lộ ra. Sách cũng công bằng: dùng double vẫn được, **nếu hiểu rõ rủi ro mất độ chính xác**.

*[Chỉ dòng transaction_id]* Hai: `transaction_id` là **khóa chống trùng**. Nhìn sang hình bên phải.

▸ **Bước 1** — Client gửi request kèm một `transaction_id` do chính nó tạo, ở đây là 0158…0002. Server ghi id này vào bảng Processed IDs, **cùng với kết quả**: success.

▸ **Bước 2** — Response bị mất trên đường về. Client bị timeout. Lúc này client **không biết** tiền đã chuyển hay chưa.

▸ **Bước 3** — Client gửi lại với **đúng id cũ**. Server tra bảng, thấy id đã xử lý, trả lại kết quả cũ, và **không trừ tiền lần hai**.

*[Ngoài sách: cách server dùng id]* Id phải được ghi **cùng một transaction** với lần trừ tiền. Nếu trừ tiền trước rồi mới ghi id, server chết ở giữa là tiền đã trừ mà không có id. Lần gửi lại không thấy id, và trừ thêm lần nữa.

Quy tắc "ghi kết quả cùng id, trong cùng bước đổi số dư" sẽ quay lại ở slide 12, và ở Saga qua hai partition (slide 21).

> **→ Chuyển sang slide 6:** Có API rồi. Câu hỏi tự nhiên tiếp theo: thiết kế đơn giản nhất có thể là gì?

## Phần 2 — Chia số dư ra Redis (slide 6)

### Slide 6 — Attempt 1: shard balances across Redis

*Nguồn: In-memory sharding solution, Fig 3, p.502–503*

Cách đơn giản nhất: số dư chỉ là một map từ tài khoản tới số tiền. Redis làm việc này rất tốt.

Một node Redis không chịu nổi một triệu TPS. Nên ta chia dữ liệu ra nhiều node, gọi là **shard**, theo hash của account. *[Chỉ khung Zookeeper]* Ba node: A ở Redis 1, B ở Redis 2, C ở Redis 3. Zookeeper giữ bản đồ đó: có bao nhiêu partition, node nào ở đâu.

*[Chỉ hai wallet service]* Phía trước là wallet service. Nó **stateless**: không giữ số dư hay tiến độ trên máy của nó. Thêm bản sao rất dễ. Nhưng nếu nó chết giữa hai lệnh, không ai nhớ nó đang làm gì.

▸ **Bước 1** — Wallet service 1 nhận lệnh A→C một đô. Nó tra bản đồ: A ở Redis 1, C ở Redis 3. *[Ngoài sách: nó tra bản sao đã cache, không hỏi Zookeeper mỗi request]*

▸ **Bước 2** — Nó trừ A một đô trên Redis 1. Thành công. A về không.

▸ **Bước 3** — *[tia sét]* Ngay lúc đó, wallet service 1 chết.

▸ **Bước 4** — *[đường đỏ nét đứt]* Lệnh cộng C **không bao giờ được gửi**. C vẫn không. Tổng A cộng C còn không. **Một đô biến mất**, và không đâu ghi rằng có giao dịch đang dở.

Phần đúng: service stateless scale ngang được, chia theo hash giúp tải đều. Hai ý này sống tới thiết kế cuối.

Phần sai: hai cập nhật nằm trên hai máy, và **không có gì bao chúng thành một đơn vị nguyên tử**. Đây là kẹt ở khung giữa của slide 3. Interviewer chốt: chạy được, nhưng chưa đúng.

> **→ Chuyển sang slide 7:** Làm sao để hai cập nhật trên hai máy thành một giao dịch? Đó là bài toán **distributed transaction**. Lời giải kinh điển đầu tiên: two-phase commit.

## Phần 3 — Giao dịch phân tán: 2PC, TC/C, Saga (slide 7–10)

### Slide 7 — Attempt 2a: two-phase commit (2PC)

*Nguồn: Database sharding Fig 4; Two-phase commit Fig 5, p.504–506*

Thay mỗi node Redis bằng một database có transaction. Người điều phối two-phase commit, gọi tắt **2PC**, là **wallet service**; sách gọi nó là coordinator. Mỗi database chỉ cần hỗ trợ bước **prepare**.

*[Chỉ ba làn và mũi tên time]* Sơ đồ chạy theo thời gian, từ trái sang phải. Ba làn: coordinator, database chứa A, database chứa C. *[Chỉ thanh đỏ dày]* Thanh đỏ dày là lúc **hàng dữ liệu bị khóa**. Để ý độ dài của nó.

▸ **Bước 1** — Coordinator ghi bình thường: trừ A một đô, cộng C một đô. Ngay lúc này, hàng của A và hàng của C bị khóa.

▸ **Bước 2** — Pha một, **prepare**. Coordinator hỏi từng database: "chắc chắn commit được không?". Mỗi database chuẩn bị đủ để dù có sự cố vẫn commit được.

▸ **Bước 3** — Cả hai trả lời **yes**. Chỉ cần một bên trả lời no, coordinator bảo tất cả **abort**.

▸ **Bước 4** — Pha hai, **commit**. Coordinator bảo mọi database commit. Commit xong, khóa mới được nhả.

Sách gọi 2PC là lời giải **cấp thấp**, vì prepare đòi chính database hỗ trợ trạng thái "đã chuẩn bị, chưa commit". Chuẩn X/Open XA dùng để phối hợp việc này giữa các database khác loại.

Điểm mạnh: 2PC atomic đúng nghĩa. Khung giữa bị **giấu** sau khóa; không ai thấy A đã trừ mà C chưa cộng. Điểm yếu: khóa giữ từ lần ghi đầu, qua prepare, qua bỏ phiếu, tới hết commit. Mỗi đoạn là một vòng đi về qua mạng.

**Cái giá của 2PC**, nhìn vào hai thanh khóa đỏ. Một: khóa giữ suốt hai lượt mạng; mọi giao dịch khác chạm A hay C phải xếp hàng chờ, ở một triệu giao dịch mỗi giây là nghẽn. Hai: coordinator chết ngay sau khi hai database trả lời yes thì chúng đã hứa commit nên không tự abort được, mà chưa có lệnh nên cũng không tự commit được; chúng giữ khóa và chờ *[Ngoài sách: trạng thái này gọi là in doubt]*. Sách gọi coordinator là single point of failure (Fig 6).

> **→ Chuyển sang slide 8:** Muốn khóa chỉ nằm trong từng local transaction thì đưa việc điều phối lên ứng dụng: TC/C.

### Slide 8 — Attempt 2b: Try-Confirm/Cancel (TC/C)

*Nguồn: TC/C, Fig 7–9, Table 4, p.507–514 · Ngoài sách: held / pending reservations; the book debits A in Try*

TC/C là Try-Confirm/Cancel. Nguyên tắc của nó: **Try chỉ giữ chỗ**, Confirm mới làm thật, Cancel nhả chỗ đã giữ. Mỗi pha là một local transaction riêng, commit xong là nhả khóa database. Người điều phối là **ứng dụng**, không phải database.

▸ **Bước 1** — *[panel trái, Try]* Coordinator bảo DB A **giữ** $1: số dư của A vẫn là $1, nhưng $1 đó bị đóng băng (*held*), A không tiêu được nữa. DB C ghi **pending +$1**: tiền sắp vào, C chưa tiêu được. Chưa đồng nào thật sự di chuyển; chỉ có chỗ được giữ.

▸ **Bước 2** — *[panel giữa, Confirm]* Cả hai Try thành công thì Confirm: A trừ $1 từ phần đã giữ, C chuyển $1 pending vào số dư. Confirm chỉ dùng phần đã giữ, nên không thể thất bại vì thiếu tiền. Tổng A + C luôn là $1.

▸ **Bước 3** — *[panel phải, Cancel]* Nếu C trả lời no ở Try, ví dụ C là tài khoản bị cấm nhận tiền: Cancel **nhả chỗ giữ** của A. C không có gì pending nên không phải làm gì. Không có gì phải hoàn, vì chưa có gì bị trừ.

**So với sách.** *[Ngoài sách: mô hình giữ chỗ]* Ví dụ của sách đơn giản hơn: Try **trừ thẳng** A −$1 và gửi NOP cho C (Table 4). Vì vậy hết Try, tổng A + C tạm thời là $0 (Fig 11), và Cancel phải **cộng trả** A một đô. Cách đó rất giống Saga. Mô hình giữ chỗ là cách TCC thường được làm trong thực tế: tiền không "biến mất", nó đang bị giữ.

Vì sao không cộng thẳng cho C ngay trong Try? Sách đã chỉ ra: C có thể tiêu $1 đó trước khi kịp Cancel. Ghi **pending**, tức chưa tiêu được, giải quyết đúng chỗ này.

Cái giá: mỗi bên phải có đủ ba thao tác Try, Confirm, Cancel, thêm cột held/pending, và coordinator phải lưu tiến độ.

*[Nếu được hỏi]* Coordinator ghi tiến độ vào một **phase status table** để khởi động lại còn biết làm tiếp; lệnh Cancel tới trước Try thì để lại một cờ out-of-order. Chi tiết trong notebook 8.

> **→ Chuyển sang slide 9:** TC/C đúng nhưng nhiều việc: ba thao tác cho mỗi bên, thêm cột giữ chỗ, lưu tiến độ, xử lý lệnh đến sai thứ tự. Saga đơn giản hơn: chạy từng bước theo thứ tự, hỏng thì bù.

### Slide 9 — Attempt 2c: Saga

*Nguồn: Saga, Fig 13, p.517–519*

Saga xếp các thao tác thành **một chuỗi**; mỗi thao tác là một local transaction, chạy lần lượt. Một bước hỏng thì **quay ngược** bằng các thao tác bù, gọi là *compensating transaction*. Vậy n thao tác thì phải chuẩn bị 2n.

▸ **Bước 1** — *[đường xanh trên cùng]* Suôn sẻ: trừ A một đô, rồi cộng C một đô, rồi báo thành công. Vẫn trừ trước, cộng sau. *[Chỉ bảng tím cạnh coordinator]* A không tự gọi C. Coordinator **ghi "A −$1 done"** vào **phase status table**, rồi mới gửi C +$1. Phase status table là một bảng nhỏ trong database có transaction, ghi mỗi bước đã tới đâu (sách giới thiệu nó ở TC/C, Fig 10). Không ghi thì coordinator chết giữa hai bước là quay lại một đô biến mất của slide 6.

▸ **Bước 2** — *[C +$1 rejected]* Database của C **từ chối** lệnh cộng. Đây là kết quả **đã biết**. Nhớ: **timeout không phải thất bại**; timeout là chưa biết. Thiết kế cuối xử lý trường hợp đó; xem notebook 21.

▸ **Bước 3** — *[hai ô đỏ, mũi tên reverse order]* Saga bù theo thứ tự ngược: bù C trước, rồi cộng trả A một đô, đúng Figure 13 của sách. *[Ngoài sách]* Bù C là no-op nếu C +$1 chưa commit, và từ đó C phải từ chối mọi C +$1 đến muộn của giao dịch này. Nếu không, A được hoàn mà C vẫn được cộng: tự sinh ra một đô.

▸ **Bước 4** — Client nhận lỗi. Tiền đã về chỗ cũ: A một đô, C không.

*[Chỉ khung Coordination models]* Ai điều khiển chuỗi? **Choreography**: các service tự nghe event của nhau; service nào cũng phải giữ state machine riêng, nhiều service là khó quản lý. **Orchestration**: một coordinator ra lệnh theo thứ tự và ghi từng bước vào bảng. Sách nói ví điện tử thường chọn cách này.

> **→ Chuyển sang slide 10:** Ta có ba cách điều phối một transfer xuyên nhiều nơi. Đặt cạnh nhau, chúng khác nhau thế nào?

### Slide 10 — 2PC, TC/C and Saga side by side

*Nguồn: 2PC vs TC/C, Table 3; TC/C vs Saga, Table 5, p.512–519 · Ngoài sách: TC/C reservations; 2PC “leans toward”*

*[Đọc bảng theo hàng, mỗi hàng một câu]* Mình đề nghị đọc bảng này **theo hàng**, đừng đọc theo cột.

*[Hàng Where it lives]* Logic nằm ở đâu? 2PC nằm trong database, cần prepare hay XA. TC/C và Saga nằm trong ứng dụng.

*[Hàng Locks, chữ đỏ]* Khác biệt lớn nhất. 2PC giữ khóa từ lần ghi đầu tới hết pha hai. TC/C và Saga chỉ khóa **bên trong từng local transaction nhỏ**.

*[Hàng Order]* 2PC: prepare tất cả, rồi commit tất cả. TC/C: **trong mỗi pha**, gọi các bên theo thứ tự nào cũng được, kể cả song song. Try giữ chỗ ở cả hai bên cùng lúc cũng được, vì chưa đồng nào di chuyển; tiền chỉ thật sự đổi chỗ ở Confirm. Saga thì **tuần tự**: trừ A xong mới cộng C.

*[Hàng Undo]* Hoàn tác thế nào? 2PC: abort trước khi commit. TC/C: **nhả chỗ giữ**, vì chưa có gì bị trừ thật. Saga: chạy một **bước bù**, một giao dịch ngược, vì bước trước đã commit thật.

*[Hàng In-between state]* Khung giữa của slide 3 trông thế nào? 2PC giấu nó trong database. TC/C để lộ nó dưới dạng **chỗ giữ**: $1 của A bị đóng băng, $1 của C đang pending, không ai tiêu được. Saga để lộ thật: A đã bị trừ mà C chưa được cộng. *[Ngoài sách: sách (Table 5) ghi cả TC/C và Saga đều có thể lộ trạng thái dở dang, vì ví dụ TC/C của sách trừ thẳng A ở Try; với mô hình giữ chỗ, TC/C chỉ lộ chỗ giữ]*

*[Hàng Coordinator crash, chữ đỏ]* Coordinator chết thì sao? Với 2PC, các bên kẹt *in doubt*, vẫn giữ khóa. Với TC/C và Saga, coordinator mới đọc **phase status table** rồi làm tiếp. Saga cũng cần bảng này.

*[Hàng Leans toward]* Chọn cái nào? Sách **không** chọn người thắng. Ít service hoặc không gắt về độ trễ, như bài chuyển tiền này: TC/C hay Saga đều được. Nhạy độ trễ, nhiều service: TC/C có lợi, vì mỗi pha gọi song song được. Theo xu hướng microservice: Saga. *[Ngoài sách: ô "Leans toward" của cột 2PC]*

Cả ba mới lo **điều phối** trừ và cộng. Chưa cách nào giữ một lịch sử bất biến, để replay và giải thích vì sao số dư của A là con số hiện tại.

> **→ Chuyển sang slide 11:** Đó chính là câu interviewer hỏi tiếp. Người dùng nhập sai, số tiền bị sai, thì truy nguyên nhân thế nào? Kiểm toán mọi thay đổi thế nào?

## Phần 4 — Event sourcing (slide 11–15)

### Slide 11 — A balance says what, not why

*Nguồn: Event sourcing: background, p.520*

Ta sang chặng ba. Đây là thay đổi tư duy lớn nhất của cả bài.

▸ **Bước 1** — *[bảng trái, Current balances]* Mọi thiết kế từ đầu tới giờ đều sửa số dư **tại chỗ**. Bảng này nói C có một đô. Nhưng ai đổi nó? Đổi lúc nào? Đổi như vậy có đúng không? Bảng không trả lời được, vì mỗi lần sửa là **giá trị cũ bị ghi đè**.

▸ **Bước 2** — *[bảng phải, Event history]* Làm ngược lại: không lưu số dư, mà lưu **từng thay đổi**, và không bao giờ sửa chúng. e104: A trừ một đô. e105: C cộng một đô. Cả hai thuộc tx 7f3c, lúc 10:02. Cột context và time cho biết do giao dịch nào, và lúc nào.

*[Chỉ ô derived]* Số dư giờ chỉ là thứ ta **tính ra**, bằng cách chạy lại các thay đổi **từ đầu**: A không, C một đô. Trước e104 còn những event cũ hơn, trong đó có lần A nhận một đô.

*[Chỉ ba câu hỏi ở dưới]* Ví điện tử phải chịu kiểm toán, và kiểm toán viên hỏi ba câu. Số dư tại **một thời điểm bất kỳ**? Số dư quá khứ và hiện tại có **đúng** không? Sửa code xong, logic có **còn đúng** không? Bảng bị ghi đè không trả lời được. Lịch sử bất biến cho phép tính lại và so sánh; slide 14 sẽ làm điều đó.

Kỹ thuật này gọi là **event sourcing**, xuất phát từ Domain-Driven Design. Nguồn sự thật giờ là chuỗi event; bảng số dư chỉ là một bản xem cho tiện.

> **→ Chuyển sang slide 12:** Event sourcing có bốn khái niệm: command, event, state và state machine. Bắt đầu với command: một ý định, xếp hàng theo thứ tự, và có thể bị từ chối.

### Slide 12 — Command queue: ordered intents, not facts

*Nguồn: Command p.521; Wallet service example, Fig 16, p.524 · Ngoài sách: duplicate check by transaction id*

*[Câu nhớ trước khi chỉ hình: hàng đợi là yêu cầu chờ xét; event log là thay đổi đã được chấp nhận. Không phải yêu cầu nào cũng thành event.]*

*[Chỉ hàng đợi; đầu hàng ở bên phải]* Command xếp trong một hàng đợi **FIFO**, vào trước ra trước; sách dùng Kafka. Đầu hàng là ô bên **phải**. Có ba lệnh đang chờ. Lúc đầu A có một đô.

▸ **Bước 1** — Lệnh đầu, tx 7f3c: A chuyển C một đô. A có một đô, hợp lệ. State machine sinh hai event, trừ A và cộng C, gắn nhãn 7f3c, nối vào **event log**. A còn không. *[Chỉ dòng seen trong State]* Cùng bước đó, State ghi thêm: **đã thấy tx 7f3c**.

▸ **Bước 2** — Lệnh thứ hai, tx 91ab: A chuyển B một đô. A đã về không, nên lệnh **bị từ chối**. Không event nào được ghi.

Dừng một chút. Nếu 91ab đến **trước**, chính nó thành công, và 7f3c mới bị từ chối. **Thứ tự quyết định kết quả.** Vì vậy sách nói trong event sourcing, mọi thứ phải có thứ tự.

▸ **Bước 3** — Lệnh thứ ba là 7f3c **lần nữa**: client timeout nên gửi lại. State machine tra dòng "seen", thấy 7f3c đã có, nên **không sinh event mới**, chỉ trả lại kết quả cũ. Chống trùng cần đúng một chỗ để tra như vậy. Đây là `transaction_id` của slide 5 đang làm việc. *[Ngoài sách: kiểm tra trùng ở bước validate]*

Hai dải trên hình rất khác nhau. **Command queue** chứa **ý định**, có thể bị từ chối. **Event log** chứa **sự thật** đã kiểm tra. *[Ngoài sách]* Thứ tự chỉ có **trong một hàng đợi do một state machine đọc**. Khi chia partition ở slide 20, giữa các partition không có thứ tự chung.

> **→ Chuyển sang slide 13:** Giờ theo trọn một lệnh hợp lệ đi hết **đường ghi**, đúng năm bước như Figure 17 của sách.

### Slide 13 — Write path: one command, five steps

*Nguồn: Wallet service example, Fig 17, p.524–525*

*[Chỉ nhanh các phần: hàng đợi, bánh răng validate, State, event list, bánh răng apply, đường nét đứt "one loop"]*

Lệnh A→C một đô đang ở đầu hàng. **Trước lệnh**: A một đô, C không. Khi các bước chạy xong, ô State là lúc **sau lệnh**: A không, C một.

*[Chỉ hai bánh răng và nét đứt one loop]* Hai bánh răng là **cùng một state machine**. "One loop": chạy đủ năm bước cho một command, rồi mới lấy command sau.

▸ **Bước 1** — State machine đọc command ở đầu hàng: A→C một đô.

▸ **Bước 2** — Nó đọc số dư cần thiết từ State: A có một đô.

▸ **Bước 3** — A đủ tiền, hợp lệ. Nó sinh **mỗi tài khoản một event**: e104 trừ A, e105 cộng C, rồi **nối vào cuối** event list. Event list chỉ nối thêm, không bao giờ sửa. *[Nếu có người hỏi: e102, e103 mờ phía trước là cặp trừ cộng của một lệnh trước đó.]*

▸ **Bước 4** — Cùng state machine đó đọc các event vừa ghi.

▸ **Bước 5** — Nó apply: A về không, C có một đô. **Chỉ sau bước này** nó mới đọc lệnh kế tiếp, A→B một đô.

*[Chỉ dải năm ô ở dưới]* Ba bước đầu là **validate**: đọc state, không sửa, đầu ra là event. Hai bước sau là **apply**: đọc event, sửa state. Vì sao phải là một state machine? *[Ngoài sách: suy luận]* Nếu hai worker chạy độc lập, worker validate có thể lấy A→B khi A vẫn ghi một đô, và duyệt lần trừ thứ hai. Một vòng lặp thì A→B thấy A bằng không, và bị từ chối.

Và **state chỉ là sản phẩm phụ của event list**: event được lưu trước, apply sau, nên mất bảng số dư vẫn dựng lại được từ event.

> **→ Chuyển sang slide 14:** Vì state chỉ là sản phẩm phụ, ta dựng lại được số dư ở **bất kỳ thời điểm nào**. Đây chính là yêu cầu reproducibility của slide 2.

### Slide 14 — Replay: rebuild any past balance

*Nguồn: Reproducibility, Fig 18, p.525–527*

*[Nói ngay]* Đây là **một ví dụ riêng**: A bắt đầu với **hai** đô. e1, e2 ở đây không phải hai event của tx 7f3c.

*[Chỉ event log, từ trái sang phải]* Ô genesis là trạng thái ban đầu: A hai đô, C và D không. Sau đó là ba giao dịch, mỗi giao dịch hai event: A chuyển C, A chuyển D, C chuyển D, mỗi lần một đô.

▸ **Bước 1** — *[vạch đỏ time T]* Số dư tại thời điểm T, ngay sau giao dịch đầu? Bắt đầu từ genesis, apply các event tới T. Kết quả: A một đô, C một đô, D không. Tổng vẫn hai đô. Câu hỏi thứ nhất của kiểm toán viên đã có lời đáp.

▸ **Bước 2** — Apply tiếp tới e6: A không, C không, D hai đô. So với bảng số dư trong database: **khớp**. Đó là câu hỏi thứ hai: tính lại từ lịch sử, rồi so.

▸ **Bước 3** — *[hai bánh răng code v1, code v2]* Câu hỏi thứ ba: đổi code rồi, logic còn đúng không? Chạy **cùng event list** qua code cũ và code mới. Hai kết quả **giống hệt**: code mới không đổi kết quả trên lịch sử này. Khác thì ta biết chỗ cần điều tra. Đây là bằng chứng, chưa phải chứng minh cho mọi trường hợp.

*[Chốt]* Vì sao lần replay nào cũng ra cùng kết quả? Vì hai điều kiện, thiếu một là hỏng: event **không bao giờ bị sửa**, và hàm apply **deterministic**. Sách kết luận: nhờ khả năng kiểm toán, event sourcing thường là lựa chọn mặc định cho wallet service.

*[Nếu có người hỏi: lần nào cũng replay từ đầu thì có chậm không? Sách dùng snapshot, tức state chụp lại định kỳ, để replay tiếp từ đó. Chi tiết ở notebook 14.]*

> **→ Chuyển sang slide 15:** Nhưng client bên ngoài vẫn chưa đọc được số dư. Event sourcing không chia sẻ state ra ngoài; nó **publish event**, ai cần gì thì tự dựng. Đó là **CQRS**.

### Slide 15 — CQRS: one writer, many readers

*Nguồn: CQRS, Fig 19, p.527–529*

*[Chỉ đường đứt dọc giữa WRITE SIDE và READ SIDE]* CQRS là *Command-Query Responsibility Segregation*: tách phần ghi khỏi phần đọc.

**Mạch dẫn:** Event log đã giúp ta giữ lịch sử để kiểm toán. Câu hỏi của slide này là làm sao phục vụ client đọc số dư mà không chen vào state machine ghi. Phía đọc nhận event và tự dựng view cho từng nhu cầu.

Bên trái là **write side**: **một** state machine ghi duy nhất. Nó đọc write state để validate, **nối event vào log trước**, rồi mới apply; mũi tên apply đi từ event log lên. e104 và e105 của lệnh A→C đã nằm trong log.

Bên phải là **read side**: nhiều state machine **chỉ đọc**. Mỗi cái tự đọc event log và dựng một **view** riêng: số dư cho client, lịch sử giao dịch, và view kiểm toán theo giờ để điều tra trừ tiền hai lần. Event sourcing không chia sẻ state; nó **publish event**, bên ngoài tự dựng.

▸ **Bước 1** — Phía ghi xử lý lệnh B→D một đô. Nó nối **cả cặp** e106 trừ B và e107 cộng D vào log, rồi apply: B ba đô, D ba đô.

▸ **Bước 2** — *[đường nét đứt async feed]* Mỗi state machine chỉ đọc tự theo log với nhịp riêng, **bất đồng bộ**.

▸ **Bước 3** — *[các tag cạnh view]* Nên mỗi view ở một chỗ khác nhau. View số dư ở e106, chậm một event. View lịch sử đã tới e107. View kiểm toán còn ở e101, chậm sáu.

▸ **Bước 4** — Consumer còn khỏe và đọc tiếp thì view nào cũng tới e107. Đó là **eventual consistency**: trễ khác nhau, nhưng cuối cùng khớp.

Độ trễ là **bản chất** của thiết kế, không phải lỗi: vừa chuyển xong mà hỏi ngay thì có thể chưa thấy số mới. Mỗi view lưu vị trí đã đọc để khi bị chậm hoặc khởi động lại có thể đọc tiếp.

> **→ Chuyển sang slide 16:** Hệ thống giờ **đúng** và **kiểm toán được**. Nhưng interviewer chỉ ra điểm yếu: xử lý từng event một, mà event nào cũng qua mạng tới Kafka và database ở xa. Phần **deep dive** bắt đầu: kéo đòn bẩy của slide 4, thông lượng của từng node.

## Phần 5 — File cục bộ (slide 16)

### Slide 16 — Why local files?

*Nguồn: File-based command and event list; File-based state, Fig 20–21, p.529–532*

*[Nói trước để khán giả khỏi lạc: từ slide này tới slide 19, cả hệ thống vẫn là **một** nhóm máy giữ mọi tài khoản. Chia ra nhiều nhóm là chuyện của slide 20.]*

**Nối từ CQRS:** Các read-only state machine vẫn dựng view từ event. Điểm đổi ở đây là nơi lưu command, event và state: thay Kafka và database ở xa bằng file cục bộ và RocksDB. Ở thiết kế Raft tiếp theo, mỗi node có bản event list của mình để read side theo dõi; không cần giả định Kafka còn đứng giữa. Câu hỏi mới là: nếu máy giữ file gặp sự cố, lịch sử tiền sẽ ra sao?

*[Chỉ thẻ tx 7f3c · A→C $1 bên trái]* Ta vẫn theo đúng giao dịch cũ: tx 7f3c, A chuyển C một đô.

▸ **Bước 1** — *[nửa trên, Before]* Thiết kế hiện tại. Chỉ một lệnh, node đã phải qua mạng ba lần: ghi và đọc command trên Kafka, ghi và đọc event trên Kafka, đọc và ghi số dư trên database. Mỗi ô đỏ là một lượt đi về qua mạng. State machine xử lý **từng lệnh một**, nên mỗi lượt chờ cộng thẳng vào thời gian của mọi lệnh phía sau.

▸ **Bước 2** — *[nửa dưới, After]* Chapter 12 làm ngược lại: đưa command, event và state về **ngay trên node xử lý**. Ghi là nối vào cuối file cục bộ; ghi tuần tự như vậy rất nhanh, kể cả trên ổ đĩa từ. Đọc số dư là hỏi RocksDB, một kho key-value chạy ngay trong tiến trình. Dữ liệu nằm sát chỗ xử lý.

▸ **Bước 3** — *[tia sét trên events.log, khung đỏ bên phải]* Nhưng có cái giá. Trước đây node không giữ gì; chết thì thay máy khác. Giờ dữ liệu nằm trên đĩa của chính node: node trở thành **stateful**, và đĩa của nó giữ **bản duy nhất** của event log. Sách gọi đúng tên: **single point of failure**. Máy này chết là hệ thống ngừng, và lịch sử tiền có thể mất theo.

Node giữ ba loại dữ liệu cục bộ: **command file** (yêu cầu, có thể bị từ chối), **event file** (thay đổi đã chấp nhận, chỉ nối thêm) và **RocksDB** (số dư hiện tại). Hai file được truy cập qua `mmap`: ghi vào bộ nhớ, hệ điều hành đẩy xuống đĩa. Khi sang Raft, event list được sao chép sang các node khác; read-only state machine có thể dựng view từ bản event list trên node của mình. *[Nếu được hỏi về page cache, dirty page, flush: notebook 16]*

> **→ Chuyển sang slide 17:** Câu tiếp theo của interviewer: node giờ là single point of failure, làm sao cho hệ thống đáng tin? Trước khi trả lời, phải biết thứ gì bắt buộc phải sống sót.

## Phần 6 — Nhân bản bằng Raft (slide 17–18)

### Slide 17 — What must survive a crash?

*Nguồn: Reliability analysis; Consensus, Fig 23, p.534–538*

**Nối từ slide 16:** File local làm node nhanh hơn, nhưng node cũng trở thành điểm hỏng đơn. Trước khi chọn cơ chế nhân bản, ta phải xác định dữ liệu nào không được phép mất.

Sách không nhảy ngay vào Raft. Trước tiên nó hỏi: **cái gì** bắt buộc phải sống sót khi máy chết? Trả lời được câu này thì mới biết phải nhân bản cái gì.

▸ **Bước 1** — *[tia sét trên node, hai dòng code và data]* Mọi thứ một node làm chỉ gồm hai phần: **tính toán** và **dữ liệu**. Tính toán thì dễ: chạy lại cùng đoạn code trên một máy khác là xong. Dữ liệu thì khác: mất là **mất vĩnh viễn**. Sách kết luận: độ tin cậy của hệ thống gần như chính là độ tin cậy của dữ liệu. Với ví, mất event log là mất lịch sử tiền: không dựng lại được số dư, không kiểm toán được.

▸ **Bước 2** — *[bốn thẻ dữ liệu, nhãn dưới mỗi thẻ]* Node có bốn loại dữ liệu: command file, event file, state trong RocksDB, và snapshot, tức state chụp lại định kỳ để replay khỏi phải chạy từ đầu. Xét từng cái. **State và snapshot**: luôn dựng lại được bằng cách replay event, như slide 14. **Command**: event sinh ra từ command, vậy giữ command là đủ? Không, vì biến command thành event không chắc deterministic: có thể dùng số ngẫu nhiên, hay gọi I/O bên ngoài. Chạy lại command chưa chắc ra đúng event cũ. Còn **event** là sự thật đã xảy ra, bất biến, và dựng lại được state. Nên chỉ event cần bảo đảm độ tin cậy cao.

▸ **Bước 3** — *[node thành Leader, hai Follower hiện ra]* Vậy chép event list sang nhiều máy. Khi chép phải giữ hai điều: **không mất event**, và **thứ tự event giống nhau trên mọi máy**. Thứ tự quan trọng vì, như slide 12, thứ tự quyết định kết quả. Sách dùng một thuật toán đồng thuận để chép, cụ thể là **Raft**. Ba máy thành một nhóm: một **leader** nhận command và ghi event; hai **follower** giữ bản sao. Raft bảo đảm: còn quá nửa số máy sống thì log trên chúng giống nhau. Ba máy chịu được một máy chết; năm máy chịu được hai.

Vậy follower để làm gì? Hai việc. Một: giữ bản sao, để máy nào chết thì event vẫn còn. Hai: sẵn sàng lên thay. Leader chết thì Raft tự bầu một follower làm leader mới, và nhóm tiếp tục nhận lệnh. Đó là cách giữ yêu cầu 99,99% của slide 2.

*[Nếu có người hỏi: sao không backup định kỳ, hay chép bất đồng bộ sang một máy dự phòng? Ngoài sách: bản sao chậm sẽ thiếu đúng những event vừa báo thành công cho người dùng. Còn chờ cả ba máy xác nhận thì một máy chậm làm cả nhóm đứng. Đa số là điểm giữa.]*

*[Nếu có người hỏi: nhân bản cũng đi qua mạng, vậy slide 16 bỏ mạng để làm gì? Ngoài sách: cái slide 16 bỏ là các lượt mạng tới dịch vụ ở xa trên đường xử lý từng lệnh. Nhân bản là một lượt gửi song song tới các follower.]*

> **→ Chuyển sang slide 18:** Giờ xem Raft làm việc với đúng giao dịch của ta: leader nhận tx 7f3c, và từ lúc nào event của nó mới đáng tin.

### Slide 18 — Raft: append versus commit

*Nguồn: Raft; Reliable solution, Fig 24, p.536–539*

*[Chỉ khung Raft group]* Ba máy của slide trước. Leader là cửa duy nhất nhận command; follower chỉ nhận event từ leader.

**Giữ đúng phạm vi hình:** Đây vẫn là **một nhóm** giữ cả A và C. Ba máy là ba bản sao của cùng log, không phải ba partition hay mỗi tài khoản một máy. Việc chia thành P1, P2 chỉ bắt đầu ở slide 20. Slide này chỉ trả lời khi nào event local đủ an toàn để sử dụng.

▸ **Bước 1** — *[thẻ tx 7f3c đi vào leader]* Lệnh tx 7f3c, A chuyển C một đô, tới leader. Leader làm đúng việc của slide 13: nối command vào commands.log, đọc RocksDB thấy A có một đô, hợp lệ, rồi sinh hai event: **e43 A −$1** và **e44 C +$1**, nối vào events.log của mình. Để ý: hai event vẽ **nét đứt**, nhãn *uncommitted*. Lúc này chúng mới có **một bản**, trên một máy. Nếu leader mất kết nối, hai follower có thể bầu leader mới không có e43, e44; các event chưa commit có thể bị bỏ khi máy cũ quay lại. Vì vậy chưa báo thành công. Và số dư **chưa đổi**: RocksDB vẫn ghi A một đô.

▸ **Bước 2** — Raft gửi e43, e44 sang hai follower. Follower 1 nhận. Follower 2 đang **chậm**, mũi tên còn trên đường.

▸ **Bước 3** — *[đường ack (stored), khung Majority consensus]* Follower 1 lưu xong và gửi xác nhận. Leader cộng Follower 1 là **2 trên 3**, quá nửa, nên e43, e44 được **commit**. *[Ngoài sách: cơ chế của Raft]* Đa số này tính cả bản của leader. Nếu leader hỏng sau mốc này, quy tắc bầu leader của Raft giữ lại các event đã commit. Follower 2 chậm không chặn commit; nó bắt kịp sau.

*[Chỉ tag stored trên Follower 1]* *[Ngoài sách]* Tag của Follower 1 là "stored", không phải "committed". Chỉ leader đếm phiếu, nên chỉ leader biết event đã commit. Follower 1 biết qua tin nhắn kế tiếp của leader.

Commit xong thì số dư mới đổi. **Mọi máy** trong nhóm, kể cả follower, apply e43, e44 vào RocksDB của mình, đúng thứ tự log: A về **không**, C có **một đô**. Cùng event list thì ra cùng state, nên máy nào lên làm leader cũng có đúng số dư này. Quy tắc từ đây: **chỉ apply event đã commit, và apply đúng thứ tự log**. Từ append tới commit là khoảng thời gian event chưa được tin, nên cũng chưa được báo thành công.

*[Nếu có người hỏi: một lệnh trừ A khác tới khi e43 chưa commit thì sao? Ngoài sách: leader validate theo số dư khả dụng, tức số dư đã commit trừ các khoản trừ đang chờ, nên lệnh đó bị từ chối. Leader chết, split brain, bản ghi qua mmap chưa xuống đĩa: notebook 18 và notebook 16.]*

> **→ Chuyển sang slide 19:** Hệ thống giờ nhanh, đúng, và chịu được một máy chết. Nhưng một nhóm Raft xử lý được bao nhiêu lệnh mỗi giây?

## Phần 7 — Mở rộng: partition và Saga (slide 19–23)

### Slide 19 — Capacity ceiling of one group

*Nguồn: Distributed event sourcing: the capacity of a single Raft group is limited, p.539*

*[Vẫn là nhóm Raft duy nhất, giữ mọi tài khoản. Nó đúng và chịu được một máy chết. Câu hỏi giờ là: nó chạy nhanh tới đâu?]*

**Nối từ slide 18:** Nhóm đã đúng và chịu được một máy chết. Nhưng mọi account vẫn cùng đi qua một nhóm Raft, nên tốc độ của cả hệ thống bị chặn bởi sức xử lý của nhóm đó.

▸ **Bước 1** — *[bốn ô trong khung one Raft group]* *[Ngoài sách: cách chia bốn chặng và tên "tốc độ phục vụ"]* Mỗi lệnh đi qua bốn chặng, đúng thứ tự. Một: nối command vào commands.log. Hai: validate, đọc state trong RocksDB. Ba: ghi bền event vào events.log; `fsync` là lệnh ép dữ liệu xuống đĩa. Bốn: chờ Raft quorum, hai trên ba máy xác nhận. Command được ghi **trước** khi validate, như slide 18 và Figure 29 bước 4 của sách.

*[Chỉ đồng hồ service rate C]* Cả nhóm có một **tốc độ phục vụ C**: số lệnh mỗi giây đo được. Chữ C ở đồng hồ là capacity, không phải ví C. Hình không ghi con số, vì con số đó phải đo, không suy ra được.

▸ **Bước 2** — *[hàng chờ bên trái, hai ô đỏ]* *[Ngoài sách: lý thuyết hàng đợi]* Nếu lệnh đến **liên tục** nhanh hơn C, hàng chờ chỉ có dài ra. Hai ô đỏ, tx 33ee và tx c4e2, là phần dồn thêm. Không có phép màu ở đây.

▸ **Bước 3** — *[hai ô dưới]* Bộ đệm lớn hơn chỉ **hoãn** lúc đầy, không làm nhóm nhanh hơn. Muốn tăng **tổng** thông lượng, phải có **nhiều nhóm độc lập**. Sách nói đúng như vậy: sức chứa của một Raft group có hạn; tới một quy mô nào đó phải chia dữ liệu.

*[Nếu có người hỏi: có làm một nhóm nhanh hơn được không, ví dụ ring buffer kiểu LMAX? Ngoài sách; xem notebook 19.]*

> **→ Chuyển sang slide 20:** Muốn vượt trần thì phải chia dữ liệu ra nhiều nhóm. Chia theo gì?

### Slide 20 — Partition by account

*Nguồn: Distributed event sourcing: distributed transaction, Fig 28, p.539–543 · Ngoài sách: the router box*

*[Lùi ra: từ một nhóm sang toàn hệ thống. Nói rõ: hình này là lúc **trước khi** tx 7f3c chạy, nên P1 vẫn ghi A một đô. Slide 21 chạy lại tx 7f3c từ đầu, trên cả hai partition.]*

**Nối từ slide 19:** Một nhóm có trần thông lượng, nên giờ ta chia tài khoản ra nhiều nhóm chạy song song. Đây là lần đầu câu chuyện xuất hiện P1 và P2; các slide trước chỉ có một nhóm giữ cả A và C.

Nhóm Raft duy nhất của slide 16–19 giờ tách thành nhiều nhóm. Mỗi nhóm là một **partition**: vẫn ba máy, vẫn Raft, nhưng chỉ giữ một phần các tài khoản.

**Đừng nhầm partition với máy:** Nhiều account có thể cùng ở P1; cả nhóm ba máy giữ bản sao của P1. Router chọn partition theo account ID, còn leader của partition xử lý lệnh và follower nhân bản log.

▸ **Bước 1** — *[partition router]* *[Ngoài sách: hộp router chỉ để minh họa; sách chỉ nói dữ liệu chia theo hash của key, và ở bản đồ cuối coordinator gửi thẳng tới partition]* Router tính `hash(account_id) % N`. Cùng một tài khoản luôn ra cùng một partition. A, B, D vào P1. Nên mọi lệnh của A, ở đây là A trừ một đô và A cộng năm đô, xếp hàng ở cùng một chỗ, theo đúng thứ tự. *[Chỉ ô P1]* Bên trong P1 mọi thứ y như slide 16 tới 18: command file, Raft, RocksDB.

▸ **Bước 2** — C và E vào P2. Các tài khoản khác rải sang P3 tới PN. Các partition chạy **song song**. Trong P1 có thứ tự; trong P2 có thứ tự. Nhưng **không có event log chung** cho cả hệ thống, nên không có thứ tự chung giữa A và C.

▸ **Bước 3** — *[ngoặc tím nối P1, P2 với ô cross-partition]* tx 7f3c lại cần cả hai. Một partition không thể tự xử lý cả giao dịch nữa, nên giao dịch tách thành **hai thao tác**, mỗi thao tác cho một tài khoản: trừ A ở P1, cộng C ở P2. Đó là hai lệnh `A −$1` và `C +$1` bên trái hình. Raft của P1 không biết P2 đã cộng hay chưa. Vậy **ai** giữ thứ tự giữa hai bước? Bài toán giao dịch phân tán của chặng 2 quay trở lại.

> **→ Chuyển sang slide 21:** Và ta dùng lại đúng công cụ của chặng 2: Saga, kèm phase status table.

### Slide 21 — Saga: one transfer across P1 and P2

*Nguồn: Distributed event sourcing, Fig 29 steps 1–15, p.542–545 · Ngoài sách: final tx done record, intermediate balances*

*[Ba làn: Saga coordinator, P1, P2. Dải Balances ở dưới cho số dư theo thời gian.]* Ta chạy lại tx 7f3c **từ đầu**, lần này trên hai partition: A một đô, C không.

**Nối từ slide 20:** Khi A và C ở hai nhóm khác nhau, Raft chỉ giữ thứ tự và độ bền **trong từng nhóm**. Cần thêm một thành phần nhớ tiến độ và quyết định bước nào chạy trước; đó là Saga coordinator. Đây là cùng ví dụ A chuyển C một đô được dựng lại trên kiến trúc mới, không phải trừ A lần thứ hai.

▸ **Bước 1** — Client gửi tx 7f3c cho Saga coordinator. Việc đầu tiên: **ghi** một dòng vào phase status table, trước khi gửi bất cứ lệnh nào. Sách nêu thứ tự tạo bản ghi rồi mới gửi lệnh; yêu cầu bảng bền và dùng database có transaction là lựa chọn triển khai dựa trên phần phase status table trước đó. Coordinator khởi động lại thì bộ nhớ mất hết; chỉ bảng còn lại.

▸ **Bước 2** — Trừ trước: coordinator gửi `A −$1` tới P1. Bên trong P1 diễn ra đúng slide 18, chỉ với nửa trừ: validate, e43, Raft commit, rồi apply. Coordinator **giữ lời gọi và chờ**. Read path của P1, đúng phía đọc của CQRS ở slide 15, ghi "debit A: done" rồi **đẩy** kết quả về chính coordinator, qua reverse proxy ở cửa P1 (Figure 29, bước 5–6). Coordinator không phải hỏi đi hỏi lại. Với nó, gửi `A −$1` là một lời gọi đồng bộ: gửi, chờ, nhận P1 success. Sách nói đúng điều kiện này: mỗi nhóm trả lời đồng bộ thì mới dùng lại được TC/C hay Saga. Coordinator **ghi P1 done**. *[Chỉ ô giữa của dải Balances]* Lúc này A không, C không: một đô **đang chuyển**.

▸ **Bước 3** — Chỉ khi P1 done, coordinator mới gửi `C +$1` tới P2. P2 lặp lại cùng mẫu với event e88, rồi báo P2 success; coordinator ghi P2 done. *[Ngoài sách]* Để ý: e88 apply xong là C **đã có một đô**, dù Saga chưa đóng giao dịch. Ai đọc lúc này thấy A không, C một. Saga **không cô lập**: kết quả từng bước lộ ra trước khi cả chuỗi kết thúc.

▸ **Bước 4** — Sau khi ghi P2 success, coordinator trả kết quả cho client: A không, C một đô. *[Ngoài sách: ô `tx done` trên hình là lần ghi trạng thái cuối được thêm để minh họa một cách triển khai; Figure 29 không nêu lần ghi riêng này.]*

Câu chốt: giữa bước 2 và bước 3 có một trạng thái trung gian thật. Saga **theo dõi** nó bằng bảng tiến độ; nó không giả vờ hai nhóm Raft commit cùng lúc. Đừng gọi Saga là atomic.

*[Nếu có người hỏi: P2 không trả lời thì sao? Ngoài sách: timeout là **chưa biết**, không phải thất bại. Coordinator gửi lại cùng mã thao tác `tx 7f3c · credit C`; P2 chống trùng nên không cộng hai lần. Chỉ khi P2 đã lưu một lời từ chối, coordinator mới bù bằng `tx 7f3c · refund A`. Chi tiết ở notebook 21.]*

*[Nếu có người hỏi về đủ 15 bước của Figure 29: xem notebook 21.]*

> **→ Chuyển sang slide 22:** Ta đã có đủ các mảnh. Ghép chúng thành một bản đồ, rồi kiểm tra bản đồ đó với mục tiêu đầu bài.

### Slide 22 — Final architecture map

*Nguồn: Distributed event sourcing: final design, Fig 28–29, p.539–545*

▸ **Bước 1** — *[user, Saga coordinator, phase status table, hai mũi tên command]* Client gửi giao dịch tới Saga coordinator. Coordinator ghi tiến độ vào **phase status table**, một database riêng, trước mỗi lần gửi. Rồi nó gửi lệnh **thẳng tới reverse proxy** của partition giữ tài khoản: `A −$1` tới P1 trước, xong mới `C +$1` tới P2. Sách chỉ nói dữ liệu chia theo hash của key; đi tới partition nào là tính từ tài khoản. *[Ngoài sách]* Coordinator không phải một máy: chúng chia partition theo mã giao dịch; slide cuối sẽ tính cần bao nhiêu.

▸ **Bước 2** — *[cột write của P1 và P2]* Mỗi partition là một **nhóm Raft**: một leader, hai follower. Reverse proxy là cửa vào duy nhất. Leader ghi command, validate, sinh event; Raft chép event sang hai follower; commit xong thì mọi máy apply vào state. Đúng những gì slide 16 tới 18 đã mổ xẻ. Bên trong mỗi máy là command file, event file qua mmap và RocksDB; snapshot được đẩy ra object storage.

▸ **Bước 3** — *[cột read, mũi tên push, mũi tên response]* Mỗi partition có **phía đọc của riêng nó**: read-only state machine dựng status view từ event log, như CQRS ở slide 15. Sách vẽ cả hai follower cũng có read path riêng; slide chỉ vẽ read path của leader, vì đó là đường báo kết quả. Ngay khi event đã commit, status được **đẩy về reverse proxy của chính partition đó**, và proxy trả response cho coordinator đang chờ. Coordinator ghi phase, rồi đi bước tiếp; xong cả hai thì trả kết quả cho client. Đây chính là 15 bước của Figure 29 ở slide 21, giờ nhìn trên toàn bản đồ.

**Nhìn lại.** Từ một map số dư trên Redis, ta đổi kiến trúc năm lần, lần nào cũng có lý do:

- Redis chia shard: không nguyên tử, mất một đô.
- 2PC, TC/C, Saga: điều phối được trừ và cộng, nhưng không giữ lịch sử để kiểm toán.
- Event sourcing với Kafka và database ở xa: kiểm toán được, nhưng chậm.
- File cục bộ: nhanh, nhưng một máy giữ bản duy nhất.
- Raft: nhân bản event log, nhưng một nhóm có trần.
- Partition và Saga: thêm nhóm để tăng tổng thông lượng; Saga nối các nhóm; reverse proxy trả kết quả đồng bộ.

Thiết kế cuối đúng trong mỗi nhóm, có thứ tự giữa các nhóm, và scale bằng cách thêm nhóm.

> **→ Chuyển sang slide 23:** Bản đồ đã đủ. Câu cuối cùng: nó có đạt mục tiêu ta đặt ra ở slide 2 không, nhất là một triệu giao dịch mỗi giây?

### Slide 23 — Capacity plan for 1M transfers/s

*Nguồn: Table 1, p.499–500; Fig 29, p.542–545; Wrap up, p.545 · Ngoài sách: sizing per layer, hot-account split*

**Nối từ slide 22:** Quay lại năm yêu cầu interviewer chốt ở slide 2, và đối chiếu với bản đồ vừa xem.

- **Chỉ chuyển tiền giữa hai ví:** một API, slide 5. Đạt.
- **Transactional:** Saga cùng phase status table, trừ trước cộng sau, hỏng thì bù; slide 21. Đạt, với trạng thái trung gian được theo dõi chứ không bị giấu.
- **Độ tin cậy 99,99%:** mỗi nhóm có ba bản sao Raft, chịu được một máy chết, leader mới tự lên; slide 17–18. Đạt về thiết kế; con số 99,99% vẫn phải đo khi vận hành.
- **Reproducible:** event log bất biến, replay ra lại mọi số dư; slide 14. Đạt.
- **Một triệu giao dịch mỗi giây:** chính là slide này. Kiến trúc này có chịu nổi không, và cần bao nhiêu máy?

Ý chính của cả slide: tầng nào cũng **chia partition**, không có log chung hay khóa chung. Nên một triệu giao dịch mỗi giây chỉ còn là một phép chia: **tải của tầng, chia cho sức của một nhóm**.

*[Chỉ khung nét đứt "assumption, not a benchmark"]* *[Ngoài sách: mọi con số trên slide là minh họa]* Ta cần một giả định cho sức của một nhóm. Giả sử một nhóm Raft ghi bền được mười nghìn thao tác mỗi giây, và chỉ chạy tới 70% để còn dư địa: **bảy nghìn thao tác mỗi giây mỗi nhóm**. Đo được số thật thì thay vào; cách tính không đổi.

▸ **Bước 1** — *[hàng wallet partitions]* Tầng ví, chia theo mã tài khoản. Mỗi giao dịch có một lệnh trừ và một lệnh cộng, nên một triệu giao dịch là **hai triệu thao tác ví mỗi giây**, đúng phép tính của sách ở slide 4. Hai triệu chia bảy nghìn: khoảng **286 nhóm Raft**. Các nhóm không chờ nhau, nên thêm nhóm là thêm thông lượng.

▸ **Bước 2** — *[hàng Saga]* *[Ngoài sách: phép sizing]* Tầng Saga, chia theo **mã giao dịch**. Theo Figure 29, mỗi giao dịch ghi phase status table **ba lần**: tạo, P1 done, P2 done. Nếu gần như cả một triệu giao dịch đi qua Saga, đó là ba triệu bản ghi mỗi giây. Slide giả định thêm **mỗi shard Saga cũng giữ được 7.000 lần ghi bền mỗi giây**; đây là một giả định độc lập, phải đo riêng. Ba triệu chia bảy nghìn, làm tròn lên là **429 shard**. Ghi theo mã giao dịch giúp rải tải, còn cách lưu, gom lô và thời gian giữ bản ghi là lựa chọn triển khai.

▸ **Bước 3** — *[thanh tổng]* Cộng lại: 286 nhóm ví và 429 shard Saga, tổng **715 shard**. Nếu mỗi shard có ba bản sao thì cần **2.145 replica slot**, không mặc nhiên là 2.145 máy vật lý. Số máy còn phụ thuộc sức máy, cách xếp replica theo vùng lỗi và tải của router, proxy, read path. Đây là sizing minh họa, không phải kết quả benchmark của sách.

▸ **Bước 4** — *[khung đỏ bên phải]* Còn đúng một thứ thêm nhóm không giải được: **tài khoản nóng**. Một tài khoản nằm gọn trong một nhóm, nên mọi lệnh của nó xếp một hàng, tối đa khoảng bảy nghìn thao tác mỗi giây. Một ví nhận tiền của rất nhiều người cùng lúc, ví dụ một merchant lớn, sẽ vượt mức đó. *[Ngoài sách]* Cách thường làm: chia tài khoản đó thành nhiều tài khoản con, M#1 tới M#8, nằm ở các partition khác nhau; số dư là tổng các tài khoản con.

**Chốt.** Chapter 12 cho hướng scale: mọi tầng đều chia partition, và thêm nhóm là thêm thông lượng. Con số thật thì phải đo: benchmark đầu cuối, kể cả giao dịch chéo partition, trước khi nói "đạt một triệu TPS".

*[Nếu có người hỏi: mỗi giao dịch chậm bao lâu? Ngoài sách: độ trễ cộng dồn hai lần Raft commit nối tiếp và các lần ghi tiến độ. Nó làm từng giao dịch chậm hơn, nhưng không chặn thông lượng, vì mỗi nhóm xử lý nhiều lệnh cùng lúc theo lô.]*

**Kết bài.** Bốn yêu cầu đầu đạt nhờ thiết kế: một API, Saga, Raft, event sourcing. Yêu cầu thứ năm, một triệu giao dịch mỗi giây, kiến trúc này có đường đi rõ ràng: thêm nhóm ví, thêm shard Saga, chia tài khoản nóng. Còn con số thật thì phải benchmark.

**Cảm ơn mọi người đã lắng nghe. Mình xin nhận câu hỏi.**
