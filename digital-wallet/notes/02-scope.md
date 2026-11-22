# Slide 2 — Scope: one operation, five requirements

> **Ý chính:** Phạm vi chỉ có chuyển tiền giữa hai ví, kèm năm yêu cầu. Yêu cầu "lạ" nhất, và quyết định nhiều nhất về sau, là **reproducibility**: dựng lại được số dư ở bất kỳ thời điểm nào bằng cách chạy lại (replay) dữ liệu từ đầu.

**Chặng:** 0, Scope · **Nguồn:** Book: Step 1: design scope, p.498–499 · **Bước bấm:** không có

---

## Hiểu nhanh trước khi nhìn hình

**Bối cảnh:** Interviewer chỉ yêu cầu một việc: chuyển tiền giữa hai ví trên cùng một nền tảng. Không có ngân hàng ở giữa. Mỗi lần chuyển, như A → C $1, được tính là một giao dịch trong mục tiêu 1 triệu TPS (giao dịch mỗi giây).

**Năm yêu cầu bằng lời thường:**
1. Chỉ chuyển tiền giữa hai ví.
2. Chịu được 1 triệu lần chuyển mỗi giây.
3. Hệ thống chạy được ít nhất 99,99% thời gian.
4. Mỗi lần chuyển hoặc xong trọn vẹn, hoặc như chưa từng xảy ra.
5. Dựng lại được số dư trong quá khứ.

**Yêu cầu thứ năm nghĩa là gì:** Không chỉ lưu "A đang có $0". Phải lưu đủ lịch sử để trả lời "lúc 14:03 hôm qua A có bao nhiêu?". Các kỹ thuật phía sau lần lượt trả lời từng yêu cầu trong năm yêu cầu này.

## 1. Slide này để làm gì

Chốt "hợp đồng" với interviewer trước khi thiết kế. Mọi quyết định ở các slide sau đều được đo bằng năm yêu cầu này.

## 2. Đọc hình

**Headline:** *Scope: one operation, five requirements*. **Dòng ngữ cảnh:** *Balance transfers between two wallets on one payment platform.*

**Năm thẻ yêu cầu**, từ trái sang phải. Mỗi thẻ có một biểu tượng, một dòng đậm và một dòng giải thích:

| Thẻ | Dòng giải thích trên slide | Nghĩa |
|---|---|---|
| **Balance transfer** | Between two wallets, nothing else | Chỉ chuyển tiền; mọi tính năng ví khác nằm ngoài phạm vi |
| **1,000,000 TPS** | One million transfers per second | Một triệu lần chuyển mỗi giây |
| **99.99% reliability** | At least four nines | Bốn số chín |
| **Transactional** | All of a transfer, or none of it | Trọn vẹn hoặc không gì cả |
| **Reproducible** | Rebuild any past balance by replay | Dựng lại số dư cũ bằng cách chạy lại dữ liệu |

Thẻ thứ năm có **nền xanh nhạt và viền trên màu xanh**, khác bốn thẻ kia. Đó là yêu cầu then chốt.

**Sơ đồ bên dưới** (Antigravity vẽ): điện thoại **A** bên trái, điện thoại **C** bên phải. Một mũi tên đi từ A sang C, giữa đường là đồng xu **$1**. Dưới đồng xu là một khối **Wallet platform**, nối với đồng xu bằng một nét chấm. Ý của hình: A và C ở trên **cùng một nền tảng ví**; tiền đi qua nền tảng đó, không qua ngân hàng nào.

**Footer:** *Book: Step 1: design scope, p.498–499*; góc phải ghi phần *Scope*. Slide không có dải bước và không có bước bấm.

## 3. Lời dẫn gợi ý

Chỉ lần lượt từng thẻ, từ trái sang phải.

> "Sau vài câu hỏi qua lại, interviewer chốt năm điều. Bốn điều đầu khá quen: chỉ chuyển tiền giữa hai ví; một triệu giao dịch mỗi giây; độ tin cậy bốn số chín; và tính giao dịch, tức mỗi lần chuyển hoặc trọn vẹn, hoặc như chưa từng xảy ra."

Dừng ở thẻ thứ năm, thẻ có nền xanh:

> "Điều thứ năm mới thú vị: reproducibility, khả năng tái lập. Interviewer giải thích thế này. Người ta kiểm tra tính đúng bằng cách đối soát với sao kê ngân hàng. Nhưng đối soát chỉ cho biết là **có** chênh lệch. Nó không cho biết chênh lệch đó **sinh ra như thế nào**. Vì vậy họ muốn hệ thống luôn dựng lại được số dư trong quá khứ, bằng cách chạy lại dữ liệu từ đầu."

Rồi nói phần nằm ngoài phạm vi, vì slide không ghi:

> "Ngoại tệ, tỷ giá và mọi tính năng ví khác thì không bàn. Mình nói trước: chính yêu cầu thứ năm sẽ dẫn chúng ta tới event sourcing ở nửa sau bài."

## 4. Giải thích sâu

- **Vì sao reproducibility quan trọng.** Với một ví điện tử, câu hỏi thực tế không chỉ là "số dư bây giờ là bao nhiêu". Còn có:
  - "Số dư lúc 14:03 hôm qua là bao nhiêu?"
  - "Vì sao số dư này sai?"
  - "Sau khi deploy code mới, logic còn đúng không?"

  Một bảng số dư bị ghi đè liên tục không trả lời được ba câu này. Đây là hạt giống của **event sourcing** (slide 11–15). Slide 11 sẽ đặt lại đúng ba câu hỏi đó.
- **"Transactional" chỉ nói kết quả, chưa nói cơ chế.** Sách đưa yêu cầu này trước khi chọn cách làm. Về sau có ba cách:
  - 2PC che các bước chưa commit, nên không ai thấy trạng thái dở dang (slide 7).
  - TC/C chia thành nhiều giao dịch nhỏ, mỗi cái commit ngay. Try chỉ giữ chỗ: $1 của A bị đóng băng, C có $1 pending, chưa ai tiêu được. Tổng số dư A + C không hụt; Confirm áp dụng chỗ giữ, Cancel nhả nó (slide 8) **[Ngoài sách: mô hình giữ chỗ; ví dụ đơn giản của sách trừ thẳng A ở Try, nên tổng lệch tạm thời]**.
  - Saga cũng commit từng bước nhỏ, nhưng làm thật ngay. Trong lúc chạy, tổng A + C lệch tạm thời. Bù lại, nó có logic hoàn tất hoặc bù trừ (slide 9).

  Với cả ba cách, quy tắc chung là: không được báo thành công khi mới làm xong một nửa.
- **99,99% là "reliability" hay "availability"?** Sách viết *"Reliability is at least 99.99%"*. Trong đoạn hội thoại, ứng viên hỏi về availability 99,99% và interviewer đồng ý. Trên slide ghi *99.99% reliability*, đúng như bản tóm tắt của sách.
- **Vì sao bỏ ngoại tệ và các tính năng khác.** Để tập trung vào phần khó nhất: chuyển tiền đúng ở quy mô lớn. Phí, hoàn tiền hay ngoại tệ đều chỉ là biến thể của cùng bài toán: ghi nhiều tài khoản như một đơn vị.

## 5. Câu hỏi có thể gặp

- **"Đối soát (reconciliation) không đủ sao?"** Vẫn cần đối soát. Nhưng nó chỉ phát hiện sai lệch **sau khi** sự việc xảy ra. Reproducibility giúp **truy ra nguyên nhân**.
- **"99,99% là bao nhiêu thời gian chết?"** Khoảng 52–53 phút mỗi năm **[Ngoài sách: phép quy đổi]**. Slide không ghi con số này để khỏi lạc đề.
- **"Có cần exactly-once hay strong consistency ở mọi nơi không?"** Sách không đòi hỏi vậy. Yêu cầu chỉ là transactional guarantee cho phép chuyển tiền, cộng thêm reproducibility.
- **"Currency có nghĩa là hỗ trợ đổi ngoại tệ không?"** Không. Ngoại tệ nằm ngoài phạm vi. Trường `currency` ở slide 5 chỉ để ghi đơn vị của số tiền.

## 6. Đừng nói sai

- Đừng nói sách đòi "exactly-once" hay "strong consistency" ở mọi nơi. Sách chỉ đòi transactional guarantee và reproducibility.
- Slide không ghi "vì sao cần reproducibility" và "cái gì nằm ngoài phạm vi". Người trình bày phải nói hai ý này bằng lời; đừng tìm chúng trên hình.
- Đừng nói "không có ngân hàng nào tham gia" theo nghĩa hệ thống không bao giờ đối soát với ngân hàng. Ý của hình chỉ là: lần chuyển A → C diễn ra bên trong một nền tảng.

## 7. Giải thích chi tiết

**Vì sao phải chốt phạm vi trước.** Một hệ thống thanh toán thật có hàng chục luồng: nạp, rút, hoàn tiền, phí, ngoại tệ. Không cắt thì bài sẽ lan man. Interviewer chốt "chỉ chuyển tiền giữa hai ví". Từ đó mọi lựa chọn đều có một thước đo rõ ràng.

**Đọc mỗi yêu cầu như một ràng buộc kỹ thuật.** Mẹo: với mỗi thẻ, nói một câu "điều này buộc ta phải…".
- **Balance transfer** buộc ta xử lý đúng **hai** tài khoản trong một thao tác: A bị trừ, C được cộng. Đây là gốc của quy tắc ở slide 3.
- **1,000,000 TPS** buộc ta dùng nhiều máy. Mà nhiều máy thì A và C sẽ thường nằm trên hai máy khác nhau. Slide 4 tính cụ thể bao nhiêu máy.
- **99,99%** buộc hệ thống không được dừng chỉ vì một máy chết. Ràng buộc này về sau dẫn tới Raft (slide 18).
- **Transactional** buộc mỗi lần chuyển kết thúc ở một trong hai trạng thái: A $0 và C $1 (xong), hoặc A $1 và C $0 (như chưa từng chuyển). Không có trạng thái thứ ba được báo là kết quả.
- **Reproducible** buộc ta lưu **lịch sử** đủ để tính lại số dư ở bất kỳ thời điểm nào. Chỉ lưu số dư hiện tại thì không làm được.

**Vì sao reproducibility là yêu cầu "lạ".** Hầu hết hệ thống chỉ cần biết **bây giờ** là bao nhiêu. Ví điện tử thì bị kiểm toán. Kiểm toán hỏi về **quá khứ**. Ví dụ: hôm qua lúc 14:03, A có $1 hay $0? Nếu bảng chỉ có dòng "A = $0" thì không ai trả lời được, và cũng không ai biết $1 đi đâu. Yêu cầu này nghe như phụ. Nhưng nó là lý do cả nửa sau của bài chuyển sang event sourcing, bắt đầu từ slide 11.

**Hình A, C và Wallet platform để làm gì.** Nó nhắc khán giả rằng cả hai ví ở trên cùng một nền tảng. Không có ngân hàng, không có bên thứ ba. Mọi khó khăn phía sau đều nằm **bên trong** nền tảng đó: khi nền tảng phải chia ra nhiều máy, A và C rơi vào hai máy khác nhau.

## 8. Dẫn dắt sang slide 3

- **Điều slide này để lại:** "transactional" vẫn còn là một từ trừu tượng. Cần biến nó thành một quy tắc cụ thể để kiểm tra từng thiết kế.
- **Câu nối gợi ý:** "Trước khi tính bao nhiêu máy, mình muốn nói thật chính xác 'chuyển tiền đúng' nghĩa là gì. Đó sẽ là thước đo cho mọi thiết kế phía sau."
- **Khán giả sẽ thấy ở slide 3:** ba khung Before / In between / After với số dư A và C, và dòng tổng A + C ở đáy mỗi khung. Hãy bảo khán giả chú ý **khung giữa**, khung viền đỏ nét đứt.
