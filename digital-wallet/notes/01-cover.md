# Slide 1 — Digital Wallet at Scale

> **Ý chính:** Cả buổi chỉ thiết kế backend cho **một** thao tác: chuyển tiền giữa hai ví. Muốn đạt 1 triệu giao dịch mỗi giây mà không mất một đồng nào, kiến trúc phải đổi 5 lần. Bìa hứa câu chuyện đó và giới thiệu ví dụ xuyên suốt: A có $1, C có $0, chuyển $1 từ A sang C.

**Chặng:** mở đầu (bìa không có tên phần ở footer) · **Nguồn:** Book: Digital Wallet, p.497–498 · **Bước bấm:** không có

---

## Hiểu nhanh trước khi nhìn hình

**Nói một câu:** Bài này giải đúng một bài toán: chuyển $1 từ A sang C. Lúc đầu A có $1, C có $0. Lúc xong, A có $0, C có $1. Tổng vẫn là $1.

**Vì sao kiến trúc phải đổi:** Mỗi thiết kế giải được một vấn đề. Rồi nó để lộ một vấn đề mới. Vấn đề mới đó là lý do có thiết kế tiếp theo. Sáu mục đánh số trên bìa là sáu chặng của câu chuyện; đi từ chặng 1 tới chặng 6 là năm lần đổi.

**Cách dẫn:** Đừng đọc sáu mục như sáu công nghệ rời nhau. Hãy hứa với người nghe rằng ở mỗi chặng mình trả lời ba câu:
- Cách này giải được gì?
- Nó hỏng ở đâu?
- Vì sao phải thêm mảnh tiếp theo?

Chưa cần giải thích Raft hay event log ở bìa.

## 1. Slide này để làm gì

Đặt kỳ vọng cho khán giả. Đây không phải bài liệt kê công nghệ. Đây là một **câu chuyện tiến hóa**: thiết kế trước hỏng ở đâu thì thiết kế sau sửa đúng chỗ đó.

Slide này cũng cài sẵn ví dụ duy nhất của cả bài: A → C, $1. Từ slide 3 tới bản đồ cuối ở slide 22, mọi sơ đồ đều quay về đúng ví dụ này. Slide 23, slide kết, chuyển sang đếm tải cho một triệu giao dịch mỗi giây.

## 2. Đọc hình

**Bên trái, phần chữ:**
- Dòng nhỏ trên cùng: *System Design Interview, Vol. 2 / Chapter 12*.
- Tiêu đề: **Digital Wallet at Scale**.
- Câu phụ: *How one wallet-to-wallet transfer reshapes the architecture, from sharded Redis to partitioned event sourcing.*
- Danh sách sáu chặng, có số trong vòng tròn:
  1. In-memory shards
  2. Distributed transactions
  3. Event sourcing
  4. Local files
  5. Raft replication
  6. Partitions + Saga
- Khung tên kiểu bản vẽ kỹ thuật, hai ô: *Presented by — Long Dinh* và *Built by — Agent Fabric*.
- Dòng phím tắt: → sang slide, ← lùi, R chạy lại các bước, A bật/tắt tự chạy bước, F toàn màn hình, N ghi chú, ? trợ giúp. Dòng này để người trình bày nhớ, không cần đọc.

**Bên phải, hình minh họa** (Antigravity vẽ, không có chữ):
- Điện thoại người gửi ở giữa bên trái; điện thoại người nhận ở góc dưới bên phải.
- Đồng xu màu xanh chạy qua **hai cụm server**. Mỗi cụm có một khối mang vương miện nhỏ, gợi ý leader của Raft.
- Ở giữa là một **vòng tròn lớn**, gợi ý event log chỉ ghi nối thêm (append-only).
- Một **ổ khóa cam đã mở** nằm cạnh điện thoại người gửi, gợi ý rằng ta sẽ bỏ kiểu khóa dài của 2PC.

**Footer:** chỉ có *Book: Digital Wallet, p.497–498* và số trang 01. Từ slide 2 trở đi, góc phải footer còn ghi **tên phần** đang nói (Scope, In-memory shards, Distributed transactions…) kèm bảy vạch nhỏ; vạch đậm là phần hiện tại. Phần đầu tiên là Scope (slide 2–5); sáu phần sau ứng với sáu chặng trên bìa.

## 3. Lời dẫn gợi ý

> "Hôm nay chúng ta thiết kế backend cho một ví điện tử, nhưng chỉ cho đúng một thao tác: chuyển tiền giữa hai ví trên cùng một nền tảng. Nghe đơn giản. Nhưng thêm ba đòi hỏi: một triệu giao dịch mỗi giây; không được mất hay tự sinh ra một đồng nào; và phải chứng minh được số dư ở bất kỳ thời điểm nào trong quá khứ. Với ba đòi hỏi đó, kiến trúc phải đổi năm lần. Sáu mục bên trái là sáu chặng mình sẽ đi qua. Ở góc phải phía dưới mỗi slide có tên phần, để các bạn biết mình đang ở đâu."

Rồi giới thiệu ví dụ:

> "Cả bài chỉ có một ví dụ: chuyển một đô từ A sang C. Lúc đầu A có một đô, C chưa có gì. Mọi người nhớ giúp mình con số này, vì slide nào cũng quay về đúng ví dụ đó để so các thiết kế với nhau."

Cuối cùng, một câu về khung tên: bộ slide được dựng bằng Agent Fabric; Claude viết nội dung và phần trình chiếu, Antigravity vẽ toàn bộ hình minh họa và sơ đồ.

## 4. Giải thích sâu

- **Vì sao chọn bài toán này.** Nó ép người thiết kế lo ba thứ cùng lúc:
  - **thông lượng**: 1 triệu giao dịch mỗi giây (TPS, transactions per second);
  - **tính đúng tuyệt đối**: tiền không tự sinh ra, không tự biến mất;
  - **khả năng kiểm toán**: giải thích được vì sao số dư lại là như vậy.

  Hầu hết hệ thống chỉ cần tối ưu một hoặc hai trong ba thứ đó.
- **Thứ tự của bộ slide.** Bộ slide đi theo đúng thứ tự của chương sách. Bản 23 slide này gọn hơn bản 35 slide: một số ý chi tiết không còn slide riêng mà nằm trong notebook:
  - cái giá của 2PC (khóa giữ lâu, coordinator chết sau prepare, *in doubt* **[Ngoài sách: thuật ngữ]**): notebook 7;
  - bốn khái niệm command, event, state, state machine: notebook 12 và 13;
  - ba loại dữ liệu trên một node, `mmap`, dirty page và flush: notebook 16;
  - leader Raft chết giữa chừng: notebook 18;
  - snapshot và replay từ snapshot: notebook 14;
  - ring buffer kiểu LMAX **[Ngoài sách]**: notebook 19;
  - pull hay push trạng thái: notebook 21;
  - Figure 29 đủ 15 bước, và Saga làm gì khi P2 không trả lời **[Ngoài sách]**: notebook 21.
- **Cách đọc một slide trong bản này.** Mỗi slide có bốn phần, luôn ở cùng chỗ:
  1. headline: câu chốt của slide;
  2. một dòng ngữ cảnh ngay dưới headline;
  3. một sơ đồ, có các huy hiệu số 1, 2, 3…;
  4. **dải bước** dưới sơ đồ: mỗi ô là một câu ngắn, đánh số khớp với huy hiệu trên sơ đồ.

  Footer bên trái ghi **Book:** (mục và trang trong Chapter 12). Khi slide có ý vượt ra ngoài sách, footer ghi thêm **Added:**. Nên nói với khán giả một lần: thấy chữ "Added" là phần bộ slide bổ sung.

## 5. Câu hỏi có thể gặp

- **"Có nói về nạp tiền, rút tiền, thanh toán cho cửa hàng không?"** Không. Interviewer giới hạn phạm vi chỉ còn chuyển tiền giữa hai ví (slide 2).
- **"Đây có phải kiến trúc của PayPal hay một ví thật nào đó?"** Không. Đây là một thiết kế trong bối cảnh phỏng vấn system design, dùng để luyện cách nghĩ về đánh đổi.
- **"Sáu chặng mà sao nói đổi năm lần?"** Chặng 1 là thiết kế đầu tiên. Mỗi lần sang chặng kế là một lần đổi: 1→2, 2→3, 3→4, 4→5, 5→6. Tổng cộng năm lần.
- **"Chữ 'Added' ở footer nghĩa là gì?"** Slide đó có một ý bộ slide thêm vào, không có trong Chapter 12. Trong notebook, các ý này được gắn **[Ngoài sách]**.

## 6. Đừng nói sai

- Đừng giới thiệu LMAX như "kiến trúc của chương này". Chapter 12 không nhắc LMAX. Bản này cũng không còn slide ring buffer; nếu ai hỏi, ý đó nằm trong notebook 19, gắn **[Ngoài sách]**.
- Thuật ngữ là `mmap` (memory-mapped file, tức file được ánh xạ vào bộ nhớ), không phải Nmap. Bìa chỉ ghi "Local files"; chi tiết `mmap` nằm ở notebook 16.
- Đừng nói "đây là kiến trúc của ví X". Đây là bài phỏng vấn.

## 7. Giải thích chi tiết

**Bài toán thật sự là gì.** Nghe "ví điện tử" dễ nghĩ tới cả một ứng dụng: nạp tiền, rút tiền, thanh toán, lịch sử giao dịch. Chapter 12 cố ý thu hẹp còn **một thao tác**: chuyển tiền giữa hai ví trên cùng nền tảng. Thu hẹp không làm bài dễ đi. Nó dồn hết độ khó vào đúng chỗ đáng học: làm sao để $1 đi từ A sang C mà vẫn đúng tuyệt đối, khi hệ thống phải chạy rất lớn.

**Ba lực kéo ngược chiều nhau.**
- **Nhanh.** 1 triệu giao dịch mỗi giây. Một máy không làm nổi, nên phải dùng nhiều máy.
- **Đúng.** Tiền không được tự sinh ra hay biến mất. Khi A ở máy này, C ở máy kia, giữ đúng trở nên khó.
- **Chứng minh được.** Phải dựng lại được số dư ở bất kỳ thời điểm nào. Muốn vậy phải lưu **lịch sử**, không chỉ lưu con số cuối cùng.

Mỗi thiết kế trong bài làm tốt một hai lực và để hở lực còn lại. Vì vậy kiến trúc phải đổi.

**Sáu chặng, mỗi chặng một câu.**
1. **In-memory shards** (slide 6): chia số dư ra nhiều máy Redis. Nhanh. Nhưng nếu service chết giữa lệnh trừ A và lệnh cộng C thì mất $1.
2. **Distributed transactions** (slide 7–10): 2PC, TC/C, Saga. Giữ được tính đúng, nhưng hoặc khóa lâu, hoặc phức tạp. Và vẫn không trả lời được câu hỏi "vì sao số dư là như vậy".
3. **Event sourcing** (slide 11–15): lưu mọi thay đổi thành một danh sách sự kiện không bao giờ sửa. Chạy lại danh sách đó là ra số dư ở bất kỳ thời điểm nào.
4. **Local files** (slide 16): đưa dữ liệu xuống đĩa của chính máy xử lý, để một máy làm được nhiều việc hơn.
5. **Raft replication** (slide 17–18): chép danh sách sự kiện sang nhiều máy, để một máy chết không làm mất dữ liệu.
6. **Partitions + Saga** (slide 19–23): một nhóm máy có giới hạn; chia tài khoản ra nhiều nhóm, và dùng Saga khi A và C nằm ở hai nhóm khác nhau. Rồi ghép mọi mảnh thành bản đồ cuối (slide 22). Slide kết (slide 23) đối chiếu bản đồ đó với năm yêu cầu của slide 2, và tính cỡ cho một triệu giao dịch mỗi giây.

Không cần đọc hết danh sách này trên bìa. Nó để người trình bày nắm mạch.

**Ví dụ xuyên suốt và các tên sẽ gặp.** A có $1, C có $0, chuyển $1 từ A sang C. Con số nhỏ là cố ý: mọi phép tính nhẩm được, nên khán giả dồn sức vào **cơ chế**, không vào số học. Về sau ví dụ này có thêm vài cái tên:
- `tx 7f3c`: mã của chính giao dịch A → C này. Trên slide, gặp lần đầu ở slide 11.
- `e43`, `e44`: hai sự kiện "A −$1" và "C +$1" mà tx 7f3c sinh ra trong nhóm Raft. Gặp ở slide 18. Ở slide 21, e43 nằm trong P1, còn nửa cộng là e88 trong P2.
- P1 và P2: hai partition, tức hai phần dữ liệu do hai nhóm máy giữ. A ở P1, C ở P2. Từ slide 16 tới 19, cả hệ thống còn là một nhóm Raft giữ mọi tài khoản; cặp P1, P2 chỉ xuất hiện từ slide 20.

Hãy nói ví dụ thật rõ ngay từ bìa. Đừng giới thiệu ba cái tên kia lúc này; chúng sẽ đến đúng lúc.

## 8. Dẫn dắt sang slide 2

- **Điều slide này để lại:** mới có lời hứa "kiến trúc đổi năm lần", nhưng chưa biết đổi để đạt cái gì. Phải chốt yêu cầu trước.
- **Câu nối gợi ý:** "Trong một buổi phỏng vấn system design, việc đầu tiên không phải là vẽ kiến trúc, mà là hỏi cho rõ yêu cầu. Hãy xem interviewer chốt với chúng ta những gì, vì mọi quyết định phía sau đều được đo bằng các yêu cầu đó."
- **Khán giả sẽ thấy ở slide 2:** năm thẻ yêu cầu xếp thành hàng. Thẻ thứ năm, *Reproducible*, có nền xanh nhạt và viền trên màu xanh, vì đó là yêu cầu sẽ thay đổi cả nửa sau của bài. Bên dưới là hai điện thoại A và C, với đồng $1 đi qua *Wallet platform*.
