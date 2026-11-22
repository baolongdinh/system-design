# Slide 18 — Raft: append versus commit

> **Ý chính:** Ba máy của slide 17 là **một Raft group giữ mọi tài khoản**. Leader là cửa duy nhất nhận command. Lệnh `tx 7f3c` (A→C $1) vào leader: nối vào `commands.log`, validate trên RocksDB (A có $1, đủ), rồi sinh **hai event** e43 `A −$1` và e44 `C +$1`, nối vào `events.log` của leader. Lúc này chúng **uncommitted**: một bản, trên một máy, và RocksDB **chưa đổi**. Raft gửi cả hai sang hai follower. Khi **đa số, 2 trên 3** (tính cả bản của leader) đã lưu, e43 và e44 được **commit**. Chỉ leader đếm xác nhận, nên tag của Follower 1 là `stored`, không phải `committed`. Follower chậm không chặn commit. Commit xong thì số dư mới đổi: **mọi máy**, kể cả follower, apply e43, e44 vào RocksDB của mình theo thứ tự log, **A $0, C $1**. Cùng event list thì cùng state. Quy tắc: **chỉ apply event đã commit, theo đúng thứ tự log**, và chưa commit thì chưa báo thành công. Trong khoảng từ append tới commit, lệnh kế tiếp phải được xét trên **số dư khả dụng = số dư đã commit trừ các khoản trừ đang chờ** **[Ngoài sách]**.

**Chặng:** 5 · Raft · **Nguồn (footer `Book:`):** Raft; Reliable solution, Fig 24, p.536–539 · **Bước bấm:** 3 (tự chạy, 0,6 giây mỗi bước; nhấn A để bấm từng bước)

---

## Hiểu nhanh trước khi nhìn hình

**Ba từ cần định nghĩa.**
- **Raft group:** một nhóm máy (ở đây là ba) cùng giữ một event log giống hệt nhau. Một máy làm **leader**, các máy còn lại làm **follower**.
- **Append:** leader nối e43, e44 vào log của chính nó. Mới có một bản, nên có thể mất.
- **Commit:** đa số máy trong nhóm đã lưu e43, e44. Từ lúc này, mất một máy không làm mất chúng.

Hai mốc này cách nhau ít nhất một lượt mạng tới follower và một lần ghi xuống đĩa (notebook 16).

**Một lệnh, bốn nhịp trên leader:** nhận → nối vào command file → validate → sinh event. Đây là việc của slide 13, giờ chạy trên leader với file cục bộ của slide 16. Hình chỉ vẽ thẻ lệnh, bánh răng `validate` với chip `A has $1 ✓`, và hai event mới. `commands.log` và RocksDB nằm trong lời nói; slide 16 đã vẽ chúng.

**Vì sao một lệnh sinh hai event.** Từ slide 16 tới 19, một nhóm giữ mọi tài khoản. Leader đọc được số dư của A, và ghi được cho cả A lẫn C trong cùng một log. Nên tx 7f3c vẫn là **một** command, như slide 12–15. Chỉ từ slide 20, khi A và C nằm ở hai nhóm khác nhau, giao dịch mới tách thành hai thao tác.

**Chỉ một người quyết định.** Chỉ state machine trên **leader** validate command và tạo event. Follower **không** validate. Chúng nhận event từ leader, lưu lại, và về sau apply. Vì vậy event log của ba máy giống hệt nhau: cùng nội dung, cùng thứ tự.

**Hình không vẽ state.** Suốt ba bước, RocksDB vẫn ghi `A: $1`, `C: $0`, vì chưa máy nào apply e43, e44. A thành $0 và C thành $1 chỉ **sau commit**, trong lời nói ngay sau bước 3.

**Sau commit: mọi máy apply.** Mọi máy trong nhóm, **kể cả follower**, apply e43 rồi e44 vào RocksDB của mình, đúng thứ tự log: A về **$0**, C có **$1**. Tổng vẫn $1. Raft giữ event list trên ba máy giống nhau; event sourcing bảo đảm cùng event list thì ra cùng state. Nên máy nào lên làm leader cũng có đúng số dư này. Apply là chức năng thứ hai của **cùng** state machine đã validate (slide 13), và chỉ lấy đầu vào từ event log.

**Thành công chỉ được báo sau commit.** Slide này chỉ chốt *khi nào* được báo. Kết quả đi về bên gọi *bằng đường nào* là chuyện của slide 21: read side ghi status và đẩy về Saga coordinator đang chờ. Slide này không có reverse proxy.

**Hai con số của A cùng lúc [Ngoài sách].**
- **Số dư đã commit:** con số trong RocksDB, `A: $1`. Cả nhóm đã đồng ý con số này.
- **Số dư khả dụng:** số dư đã commit trừ các khoản trừ đang chờ commit. Sau e43: $1 − $1 = **$0**.

Hai con số không mâu thuẫn. Một là sự thật cả nhóm đã đồng ý. Một là phần tiền leader đã hứa đi.

**Notebook này gộp ba slide đã bỏ:** "One command becomes an event" (slide 17 cũ, bỏ ở bản 4b: command file, validate, lời từ chối, số dư khả dụng), phần apply của "Commit → state → status" (slide 19 của bản 4b; phần báo kết quả chuyển sang notebook 21) và "leader fails" của bản 2 (timeout là "chưa biết", không phải "thất bại"). Phần đó ở mục 5 và mục 7.

## 1. Slide này để làm gì

Dùng công cụ của slide 17 để trả món nợ của slide 16. Cho thấy một lệnh thật đi qua nhóm, và đặt ranh giới rõ nhất của chặng: **lúc nào e43, e44 trở thành event có thể tin cậy.** Đồng thời tách hai thời điểm khán giả hay gộp làm một: **tạo event** (bước 1) và **event được tin** (bước 3). Cuối cùng chốt ai đổi số dư: sau commit, mọi máy apply, A $0, C $1.

## 2. Đọc hình

- Headline `Raft: append versus commit`. Lede: *The leader turns `tx 7f3c` into e43 and e44. When can we trust them?*
- Khung nét đứt `Raft group (3 nodes)` chứa ba panel: `Leader` (header tối, vương miện), `Follower 1`, `Follower 2`. Mỗi panel có một `events.log` đang dừng ở `e42 D +$1`, với dấu `>` chỉ ô kế tiếp.
- Bên phải: panel `Majority consensus`, dòng `majority = 2 of 3`, ba vòng tròn `L` (Leader), `F1`, `F2` (Follower).

Diễn biến:
1. Thẻ `tx 7f3c · A→C $1` đi xuống leader, qua bánh răng `validate` với chip xanh `A has $1 ✓`. Log của leader có thêm `e43 A −$1` và `e44 C +$1`, viền nét đứt, tag đỏ `uncommitted`.
2. Mũi tên nét đứt `replicate e43, e44` từ leader. Nhánh tới Follower 1 đã tới: F1 có e43, e44 nét đứt, tag `uncommitted`. Nhánh tới Follower 2 còn đang bay: nhãn `in flight`, tag đỏ `slow`. Log của F2 vẫn dừng ở e42.
3. Mũi tên xanh `ack (stored)` từ Follower 1 về leader. e43, e44 trên leader có dấu ✓ và tag `committed`. e43, e44 trên Follower 1 có dấu ✓ và tag `stored`. Panel đa số: ✓ `Leader`, ✓ `F1`, `…` cho F2, và `quorum reached ✓`.

Dải bước dưới hình: (1) `The leader validates tx 7f3c → e43, e44, uncommitted` · (2) `Raft sends both to the followers` · (3) `2 of 3 stored → e43, e44 committed`.

## 3. Trình bày theo bước

| Bước | Trên màn hình | Nói |
|---|---|---|
| 0 | Ba panel, panel đa số | "Ba máy của slide trước. Leader là cửa duy nhất nhận command; follower chỉ nhận event từ leader." |
| 1 | Thẻ tx 7f3c, `validate`, `A has $1 ✓`, e43, e44 nét đứt, `uncommitted` | "Lệnh tx 7f3c, A chuyển C một đô, tới leader. Leader làm đúng việc của slide 13: nối command vào commands.log, đọc RocksDB thấy A có một đô, hợp lệ, rồi sinh hai event: e43 A trừ một đô và e44 C cộng một đô, nối vào events.log của mình. Để ý: hai event vẽ nét đứt, nhãn uncommitted. Lúc này chúng mới có một bản, trên một máy; leader chết ngay bây giờ là chúng có thể mất. Và số dư chưa đổi: RocksDB vẫn ghi A một đô." |
| 2 | `replicate e43, e44`, F2 `slow` | "Raft gửi e43, e44 sang hai follower. Follower 1 nhận. Follower 2 đang chậm, mũi tên còn trên đường." |
| 3 | `ack (stored)`, `committed`, `stored`, `quorum reached ✓` | "Follower 1 lưu xong và gửi xác nhận. Leader cộng Follower 1 là hai trên ba, quá nửa, nên e43, e44 được commit. Đa số này tính cả bản của leader. Follower 2 chậm không chặn commit; nó bắt kịp sau. [Chỉ tag stored trên F1] Tag của Follower 1 là stored, không phải committed. Chỉ leader đếm phiếu, nên chỉ leader biết event đã commit. Follower 1 biết qua tin nhắn kế tiếp của leader." |

Chốt sau bước 3 (hình không đổi, chỉ nói): "Commit xong thì số dư mới đổi. Mọi máy trong nhóm, kể cả follower, apply e43, e44 vào RocksDB của mình, đúng thứ tự log: A về không, C có một đô. Cùng event list thì ra cùng state, nên máy nào lên làm leader cũng có đúng số dư này. Quy tắc từ đây: chỉ apply event đã commit, và apply đúng thứ tự log. Từ append tới commit là khoảng thời gian event chưa được tin, nên cũng chưa được báo thành công."

Nếu có người hỏi lệnh trừ A khác tới khi e43 chưa commit: "Leader validate theo số dư khả dụng, tức số dư đã commit trừ các khoản trừ đang chờ, nên lệnh đó bị từ chối. Phần này ngoài sách." Leader chết, split brain, bản ghi qua `mmap` chưa xuống đĩa: mục 5 và 7, và notebook 16.

## 4. Giải thích sâu

- **Leader nhận command, sinh event, Raft chép đi (p.538, Figure 24).** Leader nhận command từ bên ngoài, đổi thành event, nối vào event list cục bộ. Raft chép các event mới sang follower.
- **Lưu command trước, validate sau.** Sách mô tả đúng chuỗi này ở Figure 29, bước 4 (p.542): leader nhận command, lưu vào command list, validate; hợp lệ thì đổi thành event; event chỉ được thực thi sau khi Raft đồng bộ xong. Bước 1 của slide là nửa đầu của câu đó; bước 3 và phần apply ngay sau nó là nửa sau.
- **So với slide 13.** Năm bước của slide 13 không đổi. Bước 1 của slide này là ba bước đầu: đọc command, đọc số dư, validate và nối event. Hai bước sau (đọc event, apply) chỉ chạy sau commit, do **cùng** state machine làm.
- **Ai quyết định.** Chỉ state machine trên leader. Mỗi lúc có tối đa một leader (p.537), nên với mọi tài khoản của nhóm, luôn chỉ có **một** nơi được quyền quyết định.
- **Mọi node đều apply (p.538, Figure 24).** Mọi node, kể cả follower, xử lý event list và cập nhật state. Raft giữ event list của leader và follower giống nhau; event sourcing bảo đảm state giống nhau khi event list giống nhau. Với tx 7f3c: sau commit, cả ba máy apply e43, e44 và cùng ra `A: $0`, `C: $1`.
- **Leader chết (p.538–539).** Raft tự chọn leader mới trong các node còn khỏe. Sách mô tả một trường hợp: leader chết **trước khi** command thành event. Khi đó client thấy timeout hoặc lỗi, và phải gửi lại cùng command cho leader mới. Các trường hợp khác (e43, e44 đã có, hoặc đã commit) là phần bổ sung ở mục 5 và 7.
- **Follower chết (p.539).** Request gửi tới nó thất bại; Raft gửi lại mãi tới khi nó quay lại hoặc có node mới thay. Đa số vẫn còn thì commit vẫn chạy.
- **Vì sao chỉ chép event.** Đó là kết luận của slide 17 (notebook 17): state và snapshot dựng lại được từ event; command không đủ để tái tạo event.
- **Hai phần ngoài sách.** Ghi lại lời từ chối cùng mã giao dịch vào log được nhân bản, để mọi replica nhớ câu trả lời đó. Và số dư khả dụng: sách không mô tả lớp "khoản trừ đang chờ".

## 5. Câu hỏi có thể gặp

- **"Vậy có ba state machine cùng quyết định à?"** Không. Chỉ leader validate và tạo event. Follower chỉ lưu event nhận được rồi apply.
- **"Vì sao ghi command xuống rồi lại đọc ra? Trông thừa."** Hai bên khác nhau làm hai việc đó, ở hai thời điểm khác nhau. Phía nhận request (nhiều luồng mạng) nối command vào file. State machine (một luồng) lấy ra khi tới lượt. Ghi để **chốt thứ tự** và có dấu vết; đọc để **xử lý tuần tự**. Đọc lại gần như miễn phí, vì đuôi file nằm trong page cache (notebook 16). Bảng thời gian ở mục 7.
- **"Validate đã biết A sẽ còn $0, sao không sửa RocksDB luôn?"** Vì e43, e44 chưa commit. Nếu sửa ngay rồi leader chết trước commit, RocksDB sẽ ghi một lần chuyển mà cả nhóm chưa đồng ý. Hơn nữa, apply **chỉ lấy đầu vào từ event log** (bảng ở mục 7). Nhờ vậy lúc chạy thật, lúc replay và lúc follower apply là cùng một đoạn code.
- **"Có lúc nào A đã $0 mà C vẫn $0 không?"** **[Ngoài sách]** Trong một nhóm thì không cần có. e43, e44 sinh từ cùng một command, nằm liền nhau trong log, và được commit cùng nhau. State machine có thể apply cả hai trong một lần ghi RocksDB (*write batch*), và validate chạy trong cùng vòng lặp nên không bao giờ thấy nửa chừng. Khoảnh khắc "A đã trừ, C chưa cộng" của slide 3 chỉ quay lại khi A và C ở hai nhóm khác nhau (slide 20–21).
- **"Một lệnh trừ A khác tới ngay sau, trước khi e43 commit, thì sao?"** **[Ngoài sách]** Nếu validate chỉ đọc RocksDB, lệnh thứ hai cũng thấy `A: $1` và cũng qua. A bị tiêu hai lần một đô. Có hai cách chặn:
  1. **Lớp pending trong RAM.** Leader giữ danh sách các event nó đã tạo mà chưa commit. Validate lấy RocksDB trừ các khoản trừ trong danh sách đó: $1 − e43 = $0. Lệnh thứ hai bị từ chối. Khi e43 được apply sau commit, nó rời danh sách và vào RocksDB trong **cùng một bước** của cùng vòng lặp. Không có lúc nào e43 vắng mặt ở cả hai chỗ.
  2. **Chờ commit rồi mới xét lệnh kế tiếp của cùng tài khoản.** Đơn giản hơn, nhưng chậm hơn: mỗi lệnh của A phải chờ trọn một vòng Raft.
- **"e44 đang chờ cộng cho C một đô. C tiêu được đô đó chưa?"** **[Ngoài sách]** Chưa. Số dư khả dụng chỉ trừ các khoản **trừ** đang chờ; khoản **cộng** đang chờ không được tính. Nếu e44 chưa commit mà leader chết, đô đó có thể không bao giờ tới C. C chỉ tiêu được nó sau commit.
- **"Lệnh đã bị từ chối, sao còn phải giữ kết quả?"** **[Ngoài sách]** Vì client có thể gửi lại cùng lệnh khi bị timeout (phần leader chết bên dưới). Nếu lần từ chối không được ghi lại, lần gửi lại được xét như lệnh mới. Giả sử trong lúc đó A vừa nhận thêm một đô: lần gửi lại **qua**, và A bị trừ. Nhưng client đã nhận "từ chối" và có thể đã bỏ cuộc. Cùng một mã, hai kết quả, và tiền lệch. Notebook 21 (mục 7, phần *Khi P2 không trả lời*) dùng đúng quy tắc này ở tầng Saga: P2 phải lưu lời từ chối trước khi coordinator được phép bù.
- **"Follower 2 chậm có làm chậm commit không?"** Không. Đa số là đủ. Raft gửi lại mãi cho tới khi follower quay lại hoặc được thay.
- **"F1 đã lưu e43, e44, sao chưa apply ngay?"** **[Ngoài sách: cơ chế Raft]** Vì F1 không biết các máy khác đã lưu chưa. Chỉ leader đếm xác nhận. F1 biết commit khi tin kế tiếp của leader mang vị trí commit mới. Nếu F1 apply ngay khi tự lưu, nó có thể apply một entry về sau không được commit và bị ghi đè.
- **"Bản của leader có được tính ngay không?"** **[Ngoài sách]** Chỉ khi chính leader đã lưu e43, e44 theo chính sách độ bền; ghi qua `mmap` có thể mới là trang dirty (notebook 16). Kịch bản ở mục 7.
- **"Leader chết thì sao? Bầu leader mới thế nào?"** **[Ngoài sách: cơ chế Raft]** Follower nào lâu không nghe nhịp tim (*heartbeat*) của leader thì thành **candidate**. Nó tăng số nhiệm kỳ (*term*), tự bầu cho mình và xin phiếu các máy khác. Mỗi máy bầu tối đa một lần mỗi term. Ai có đa số phiếu thì thành leader của term đó. Trong lúc bầu, nhóm tạm không nhận ghi.
- **"Leader chết thì client thấy gì?"** Chỉ thấy **timeout**, dù leader chết trước hay sau commit. Vì vậy: **timeout là "chưa biết kết quả", không phải "thất bại"**. Client gửi lại **cùng mã** `tx 7f3c` (`transaction_id` của slide 5), không bao giờ dùng mã mới. Mã mới là một giao dịch mới, và A sẽ bị trừ thêm lần nữa. Ở thiết kế cuối, bên gọi từng partition là Saga coordinator; nó làm đúng việc này với mã thao tác (notebook 21).
- **"Leader chết trước commit thì e43, e44 mất chắc rồi?"** **[Ngoài sách]** Không chắc. Nếu chúng đã nằm trên F1, F2 không thể thắng bầu cử: F1 từ chối bầu cho một log ngắn hơn log của mình. F1 lên làm leader, và e43, e44 được commit về sau. Vì vậy leader mới phải tra lần gửi lại với **mọi entry trong log, đã commit hay đang chờ** (mục 7).
- **"Gửi lại thì có bị chuyển hai lần không?"** **[Ngoài sách]** Không, nếu leader mới chống trùng theo mã. Nó tìm thấy `tx 7f3c` trong log, nên không tạo cặp event thứ hai. Nếu e43, e44 đã commit, bên gọi nhận lại kết quả cũ `tx 7f3c: done` mà read side đã ghi (slide 15).
- **"Tập chống trùng lưu ở đâu?"** **[Ngoài sách]** Trong **log được nhân bản**. Mỗi event mang mã giao dịch của nó; lời từ chối cũng được ghi cùng mã. Mọi replica dựng ra cùng một tập. Một bảng trên đĩa riêng của leader cũ thì vô dụng: leader mới là máy khác. Snapshot cũng phải chụp tập mã đã apply (notebook 14).
- **"Khóa chống trùng là `tx 7f3c` được không?"** Ở slide này được: một giao dịch là một command, và khóa là `transaction_id`. Từ slide 20, giao dịch tách thành hai thao tác, mỗi thao tác cần mã riêng: `tx 7f3c · debit A`, `tx 7f3c · credit C` **[Ngoài sách: cách đặt mã]**. Nhánh lỗi ở notebook 21 còn có lệnh hoàn `tx 7f3c · refund A`, cũng thuộc tx 7f3c và cũng vào nhóm giữ A. Nếu khóa vẫn là `tx 7f3c` trần, lệnh hoàn bị coi là bản trùng của lệnh trừ, và A không bao giờ được hoàn.
- **"Leader cũ sống lại thì có hai leader không? Split brain?"** **[Ngoài sách]** Leader cũ bị cô lập vẫn tưởng mình là leader, nhưng không gom được đa số, nên không commit được gì. Khi nối lại, nó thấy term mới hơn và lui xuống làm follower. Hai phía không thể cùng có đa số.
- **"Hai trên ba máy chết thì sao?"** **[Ngoài sách]** Mất đa số thì nhóm không commit được event mới, nên ngừng nhận ghi. Nhóm **dừng** chứ không **sai**.

## 6. Đừng nói sai

- Đừng nói "sau bước 1, A = $0". RocksDB vẫn `A: $1`, `C: $0` cho tới khi e43, e44 commit và được apply.
- Đừng nói "chỉ leader apply". Mọi node apply event đã commit, cùng thứ tự. Và đừng nói "apply lấy kết quả từ validate": apply chỉ đọc event log.
- Đừng nói "e43, e44 đã an toàn" ở bước 1. Chúng nét đứt, một bản, chưa qua Raft.
- Đừng nói "mọi command đều thành event". Lệnh không đủ tiền bị từ chối và không sinh event; nhưng lời từ chối vẫn được ghi cùng mã.
- Đừng nói "commit là bên gọi đã nhận success". Success chỉ đi ra sau commit, khi read side đã ghi status và báo về (slide 21).
- Đừng tả một client đứng chờ ở reverse proxy ở slide này. Reverse proxy và đường đẩy status chỉ xuất hiện ở slide 21, và bên đang chờ là Saga coordinator.
- Đừng nói "đa số đã nhận nên chắc chắn không mất". Chỉ đúng khi mỗi xác nhận đi sau lần lưu theo chính sách độ bền (notebook 16).
- Đừng nói "follower cũng validate". Follower không xét lại event.
- Đừng nói "F1 đã commit". Tag của F1 là `stored`; nó biết commit ở tin kế tiếp của leader.
- Đừng nói "đa số là hai follower". 2 trên 3 gồm cả bản của leader.
- Đừng nói "validate chỉ cần đọc RocksDB". Khi có Raft, câu đúng là số dư **khả dụng**: đã commit trừ các khoản trừ đang chờ. Và đó là phần ngoài sách.
- Đừng nói "timeout là thất bại", hay "chết trước commit thì e43, e44 chắc chắn mất".
- Đừng nói "Raft chống chuyển hai lần". Raft giữ event; chống trùng là việc của mã giao dịch trong log.
- Đừng gọi nhóm này là P1, hay gọi tx 7f3c là "nửa trừ". Một nhóm giữ mọi tài khoản; partition chỉ có từ slide 20.

## 7. Giải thích chi tiết

**Đi lại bước 1 với số cụ thể.** Trước khi bấm: `commands.log` của leader có tx 51aa (B→D $1). `events.log` có e41 `B −$1`, e42 `D +$1`. RocksDB có `A: $1`, `B: $3`, `C: $0`, `D: $3`.
1. `tx 7f3c · A→C $1` tới leader.
2. Thẻ được nối vào cuối `commands.log`, sau tx 51aa. Thứ tự của lệnh trong nhóm đã được chốt.
3. Validate tính số dư khả dụng của A: RocksDB ghi $1, chưa có khoản trừ nào đang chờ, nên khả dụng là $1. So `$1 ≥ $1`: hợp lệ. Nếu A chỉ có $0, lệnh dừng ở đây và lời từ chối được ghi cùng mã.
4. Sinh e43 `A −$1`, e44 `C +$1`, nối vào `events.log` ngay sau e42. Nét đứt, chưa commit. RocksDB không đổi. **[Ngoài sách]** Lớp pending ghi nhận e43. Nếu ngay sau đó có `tx 91ab · A→B $1` (lệnh của slide 12), validate thấy $1 − $1 = $0 khả dụng và từ chối. Kết quả `tx 91ab: rejected` được ghi lại.

**Vì sao phải ghi command rồi mới đọc ra.** Trên hình chỉ có một lệnh và state machine đang rảnh, nên trông như ghi xong đọc ngay. Khi tải cao thì khác:

```
thời điểm   phía nhận (nhiều luồng)            state machine (một luồng)
t1          nối tx 51aa                         xử lý tx 51aa
t2          nối tx 7f3c, nối thêm vài lệnh      vẫn đang xử lý tx 51aa
t3          nối lệnh mới                        đọc tx 7f3c → validate
```

Không có hàng đợi thì các luồng nhận request phải tranh nhau gọi thẳng vào state machine. Muốn an toàn, chúng phải khóa số dư, và ta quay lại bài toán khóa của 2PC (slide 7).

**Vì sao chưa đổi số dư.** Thứ tự an toàn là **event được commit trước, state đổi sau**.
- Leader chết trước khi e43, e44 commit: chúng có thể mất. Nếu RocksDB đã ghi A = $0, state sẽ nói một điều mà nhóm chưa bao giờ đồng ý.
- Leader chết sau commit: e43, e44 nằm trên đa số máy. Máy nào cũng apply được chúng.

**Thứ tự của cả chặng, cho một lệnh:**

| Việc | Ở đâu |
|---|---|
| Command được nối vào `commands.log` | slide 18, bước 1 |
| Validate trên số dư khả dụng | slide 18, bước 1 |
| e43, e44 được nối vào `events.log` của leader | slide 18, bước 1 |
| Raft gửi e43, e44 sang follower | slide 18, bước 2 |
| Đa số lưu: commit | slide 18, bước 3 |
| Mọi node apply: A = $0, C = $1 | slide 18, lời nói sau bước 3 |
| Read side ghi status, báo về bên gọi (chỉ sau commit) | slide 15 (read side); slide 21 (đẩy về Saga coordinator) |

**Apply luôn đọc từ event log.** Cùng một đoạn code apply chạy trong bốn tình huống:

| Tình huống | Apply lấy e43, e44 từ đâu |
|---|---|
| Leader xử lý lệnh bình thường | event log của leader, sau commit |
| Follower (không validate) | event log của follower, sau khi biết commit |
| Khởi động lại, replay từ snapshot (notebook 14) | event log, phần đuôi sau snapshot |
| Read side dựng status view (slide 15) | event log |

Còn một lý do nữa: validate xảy ra **trước** commit. Apply từ kết quả validate là apply một thứ cả nhóm chưa đồng ý. **[Ngoài sách]** Trên leader, trong cùng bước apply, e43 rời lớp pending; số dư đã commit và số dư khả dụng của A lại bằng nhau: $0.

**Vì sao thứ tự giống nhau trên mọi máy [Ngoài sách: cơ chế Raft].** Khi gửi e43, leader gửi kèm vị trí và term của entry ngay trước nó (e42). Follower chỉ nối e43 nếu log của nó khớp với leader tới e42. Không khớp thì leader lùi lại, gửi các entry còn thiếu trước.

**Vì sao bản của leader cũng phải chờ lưu bền [Ngoài sách].** Giả sử leader tính phiếu của mình khi e43, e44 trên leader mới là một trang dirty:
1. F1 lưu và xác nhận. Leader tính "mình + F1 = 2 trên 3", commit, có thể đã báo thành công.
2. Leader mất điện trước khi trang đó xuống đĩa. Nó khởi động lại **không có** e43, e44.
3. F2, cũng chưa có chúng, xin phiếu. Log của leader cũ giờ không dài hơn log của F2, nên nó bầu cho F2. F2 có hai phiếu và thắng.
4. Leader mới F2 không có e43, e44. Raft bắt log của F1 khớp với leader, nên chúng bị ghi đè trên F1.

Một lần mất điện đã xóa hai event **đã commit**. Vì vậy mỗi bản sao, kể cả bản của leader, chỉ được tính khi đã lưu theo chính sách độ bền.

**Leader chết: ba thời điểm, một kết quả [Ngoài sách, trừ dòng đầu].** Client gửi `tx 7f3c`, chờ, hết giờ. Nó không biết mình ở dòng nào:

| Leader chết lúc | Leader mới có e43, e44 không | Lần gửi lại `tx 7f3c` | Cuối cùng |
|---|---|---|---|
| Trước khi gửi e43, e44 cho ai (gồm trường hợp của sách: command chưa thành event) | không: chỉ leader cũ có chúng | log mới không có mã này: xử lý như lần đầu | A $0, C $1 |
| F1 đã có e43, e44, chưa commit | có: F1 thắng bầu cử, e43, e44 chờ commit | tìm thấy mã trong log dù còn đang chờ: không có cặp event thứ hai | A $0, C $1 |
| Sau commit, trước khi trả lời | chắc chắn có | tìm thấy mã: không có event mới; read side trả lại `tx 7f3c: done` | A $0, C $1 |

Ở cả ba dòng, tiền chỉ chuyển **một lần**. Điều kiện: client gửi lại cùng mã, và leader mới tra mã đó với **mọi** entry trong log của nó trước khi xử lý.

**Đi lại dòng thứ hai từng bước [Ngoài sách].**
1. Đúng lúc bước 2 của slide: F1 đã lưu e43, e44, F2 chưa. Leader chết trước khi đếm đủ xác nhận. Client hết giờ chờ.
2. Bầu cử: F1 từ chối bầu cho F2, F2 bầu cho F1. F1 thành leader; e43, e44 nằm trong log, chưa commit. Lớp pending của F1, dựng lại từ log, có e43: A chỉ còn $0 khả dụng.
3. Client gửi lại `tx 7f3c` tới F1. F1 tra mã với mọi entry trong log và thấy e43, e44. Nó không validate lại, không tạo cặp event thứ hai.
4. F1 commit e43, e44 cùng entry đầu tiên của nhiệm kỳ mới, rồi apply: `A: $0`, `C: $1`. Chỉ từ lúc này `tx 7f3c: done` mới được báo cho bên gọi.

**Nếu chống trùng chỉ tra phần đã apply [Ngoài sách].** Ở dòng thứ hai, e43, e44 nằm trong log nhưng chưa apply, nên bị bỏ sót. Có hai kết cục, cả hai đều sai:
- Có lớp pending: A chỉ còn $0 khả dụng, nên lần gửi lại bị **từ chối vì không đủ tiền**. Client nhận "thất bại". Rồi e43, e44 commit: A $0, C $1. Tiền đã chuyển mà client nghe "thất bại"; người dùng chuyển lại bằng giao dịch mới khi A có tiền, và C nhận hai lần.
- Không có lớp pending: lần gửi lại qua validate, tạo cặp event thứ hai. A bị trừ hai lần.

## 8. Dẫn dắt sang slide 19

- **Điều slide này để lại:** một nhóm Raft giờ nhanh, đúng, và chịu được một máy chết: e43, e44 đã commit, mọi máy apply ra A $0, C $1. Nhưng mọi tài khoản vẫn đi qua **một** leader, **một** log, **một** vòng quorum. Nhóm đó xử lý được bao nhiêu lệnh mỗi giây?
- **Câu nối gợi ý:** "Hệ thống giờ nhanh, đúng, và chịu được một máy chết. Nhưng một nhóm Raft xử lý được bao nhiêu lệnh mỗi giây?"
- **Khán giả sẽ thấy ở slide 19:** headline `Capacity ceiling of one group`. Bên trái, hàng `Command queue (FIFO)` với vạch `arrival rate` và hai thẻ `A→C $1 · tx 7f3c`, `D→B $2 · tx 62bd`, đi vào khung `one Raft group`. Ở bước 1 hiện bốn đoạn nối tiếp (`commands.log append`, `validate + state check`, `events.log durable write`, `Raft quorum`) và đồng hồ `service rate C`. Ba bước, tự chạy.
