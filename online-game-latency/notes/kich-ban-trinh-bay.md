# Kịch bản trình bày — Xử lý và tối ưu độ trễ trong game online (24 slide + phụ lục A1–A8)

Xuất tự động từ ghi chú trong `index.html` (`python3 tools/export_script.py`). Muốn sửa lời nói,
sửa trong `index.html` rồi chạy lại. Mỗi slide tự chạy các bước, 0,6 giây một bước; dải bước
đánh số bên phải (hoặc dưới) hình khớp với các dòng ▸ Bước. Nhấn A để chuyển sang bấm từng bước.
Mọi tổng ms là ước tính minh họa từ giả định của deck (tick 64, snapshot 20/s, 60 FPS, RTT 40 ms).

## Mở đầu (slide 1)

### Slide 1 — Two players, one moment, three machines.

*Hình: Illustration: Antigravity*

Giới thiệu cảnh: An đang ngắm, Bình chạy ngang khoảng trống, cả hai nối tới một server ở Singapore cách khoảng 20 ms mỗi chiều.

Mỗi máy có một "phiên bản" riêng của cùng một khoảnh khắc: máy An, máy Bình và server. Nhiệm vụ của netcode là làm cho ba phiên bản đó đủ khớp để người chơi thấy công bằng.

▸ **Bước 1** — hai đường mạng: mỗi người cách server 20 ms. **Bước 2** — vòng sáng quanh súng của An: phát bắn mà cả buổi sẽ đi theo.

Hứa với khán giả: cuối buổi mình sẽ đo được phát bắn này tốn bao nhiêu ms, tốn ở đâu, và cắt được bao nhiêu. Chưa nêu tên kỹ thuật nào ở slide này.

> **→ Slide 2:** Trước khi nói về cơ chế, cần gọi tên những thứ đang có trên cảnh này.

## Phần 1 — Bối cảnh: từ vựng, bốn mục tiêu, vì sao game bắn súng (slide 2–4)

### Slide 2 — Five words to read every diagram today.

*Nguồn: Valve Developer Wiki (Source defaults); CS2 official servers = 64 tick · Hình: Map & tokens: Antigravity*

Đi qua năm từ ngay trên cảnh, mỗi bước một thẻ.

▸ **Authoritative server** là nguồn sự thật duy nhất. **RTT** là thời gian đi và về của một gói tin, ở đây 40 ms. **Tick** là nhịp server tính lại thế giới, 64 lần mỗi giây như server CS2 chính thức, tức 15,6 ms một tick. **Snapshot** là "ảnh chụp" trạng thái server gửi về client, 20 lần mỗi giây theo mặc định cổ điển của Source. **Frame** là nhịp vẽ màn hình của client, 60 FPS tức 16,7 ms.

Nói rõ: RTT 40 ms là **giả định** của buổi này, cỡ tuyến tốt Việt Nam → Singapore theo số liệu giai thoại, không phải số đo. Mọi tổng ms về sau là ước tính minh họa, trên slide có tag "est.".

Mọi sơ đồ sau chỉ dùng năm từ này.

> **→ Slide 3:** Có từ vựng rồi. Giờ cần thước đo: chấm điểm một thiết kế netcode bằng gì?

### Slide 3 — Good netcode must win four goals.

*Nguồn: Riot Games, “Peeking into VALORANT’s Netcode” (also starts from goals)*

Bốn mục tiêu được viết thành điều **người chơi quan sát được**, để lúc chấm điểm không ai cãi nhau về định nghĩa. Tức thì: An bấm là thấy mình nhúc nhích. Mượt: Bình trên màn hình An di chuyển không giật. Công bằng: ngắm trúng là trúng. Không gian lận: client không tự khai được "tôi bắn trúng".

Riot cũng mở bài thiết kế netcode Valorant bằng một danh sách mục tiêu như vậy.

Nhấn rằng các mục tiêu kéo nhau ngược chiều: muốn tức thì thì dễ phải tin client, mà tin client thì mất "không gian lận".

▸ **Bước 5** — bảng nhỏ này sẽ nằm ở góc trên phải suốt buổi. Mỗi thiết kế được chấm một hàng, mỗi kỹ thuật lật một ô.

> **→ Slide 4:** "Tức thì" là bao nhiêu ms? Độ trễ bao nhiêu thì người chơi cảm thấy?

### Slide 4 — Shooters are the least forgiving genre.

*Nguồn: Claypool & Claypool, CACM 2006; NIKT survey (~100 ms); Riot Games · Hình: Images: Valve, Epic Games, Xbox Game Studios, Riot Games*

Claypool & Claypool (CACM 2006) xếp hành động trong game theo độ chính xác và deadline. Game góc nhìn thứ nhất nhạy nhất với độ trễ, game toàn cảnh như RTS ít nhạy nhất.

▸ **Bước 1** — ngưỡng khoảng 100 ms cho bắn súng góc nhìn thứ nhất. Con số này đến từ một bản tổng hợp thứ cấp, nên nói "cỡ 100 ms". Không nêu ngưỡng 500 ms hay 1.000 ms cho hai vùng kia vì chưa kiểm chứng.

▸ **Bước 2** — Riot ghi nhận trong playtest rằng chênh 10–20 ms đã đổi kết quả một pha đấu súng.

Vì thế giải được bài toán cho game bắn súng là giải được phần lớn các thể loại khác. Cả deck dùng game bắn súng làm ví dụ.

> **→ Slide 5:** Thử thiết kế đầu tiên, cách nghĩ quen của dân backend: client chỉ là terminal, server quyết hết.

## Phần 2 — Bốn kỹ thuật netcode, chấm trên scorecard (slide 5–13)

### Slide 5 — Dumb client: every keypress waits a round trip.

*Nguồn: Model after Gabriel Gambetta, “Client-Server Game Architecture”*

Đây là kiến trúc request/response quen thuộc: client gửi phím, server tính, client vẽ kết quả.

▸ **Bước 1–5** — An bấm W, chờ tới frame kế tiếp mới gửi, 20 ms lên server, chờ tick kế tiếp, 20 ms quay về, rồi chờ thêm một frame nữa mới vẽ.

Về tính đúng đắn thì hoàn hảo: server quyết mọi thứ nên không ai gian lận được, ô "Cheat-proof" xanh. Nhưng An phải đợi ít nhất một RTT cộng thời gian chờ tick và chờ frame, khoảng 40–72 ms theo ước tính của mình, rồi nhân vật mới nhúc nhích. Ô "Instant" đỏ.

Gambetta minh họa cùng hiện tượng ở mức khoảng 200 ms mỗi hành động khi lag 100 ms. Ô Smooth và Fair để trống vì mình chưa xét đến người chơi khác.

> **→ Slide 6:** Đảo ngược lại thì sao: để client tự quyết?

### Slide 6 — Trusting the client feels instant but invites cheats.

*Nguồn: Gabriel Gambetta, “Client-Server Game Architecture” (never trust the client)*

Nếu để client tự tính và báo kết quả ("tôi đã bắn trúng Bình"), An thấy phản hồi ngay và phát bắn trúng đúng như An thấy. Instant và Fair đều xanh.

▸ **Bước 3–4** — nhưng server không còn cách nào phân biệt một client thật với một client bị sửa gửi "trúng đầu" từ xa qua tường. Hai chip đến server trông y hệt nhau.

Hai hàng scorecard giờ đỏ ở hai chỗ khác nhau: thiết kế 1 đỏ ở Instant, thiết kế 2 đỏ ở Cheat-proof. Đó chính là không gian trade-off.

> **→ Slide 7:** Có cách nào lấy được cả "tức thì" lẫn "không gian lận" không?

### Slide 7 — Predict your own input; let the server judge.

*Nguồn: After Gabriel Gambetta, “Client-Side Prediction and Server Reconciliation”*

Client chạy luôn luật di chuyển cho input của chính An, nên An thấy mình nhúc nhích ngay trong frame hiện tại: 0 ms chờ mạng. Ô Instant xanh.

Cùng lúc, input vẫn được gửi lên server, và server vẫn là trọng tài: ô Cheat-proof vẫn xanh.

Khác biệt cốt lõi với slide 6: client gửi **input** ("tôi bấm W"), không gửi **kết quả** ("tôi đã ở x=11"). Điều kiện là client phải biết luật di chuyển giống hệt server. Fiedler mô tả đây là bước tiến của thế hệ game kiểu Quake.

> **→ Slide 8:** Nhưng An bấm liên tục. Khi An đã bấm ba lần mà server mới xác nhận lần đầu, client tin ai?

### Slide 8 — Number inputs, replay the unconfirmed ones.

*Nguồn: Gabriel Gambetta, “Client-Side Prediction and Server Reconciliation”*

Với RTT 40 ms, An bấm lần hai, lần ba trước khi server kịp trả lời lần một. Đây là trường hợp bình thường, không phải sự cố.

Mỗi input được đánh số thứ tự. Client giữ các input chưa được xác nhận trong một hàng đợi.

▸ Khi server báo "đã xử lý tới #1, x=11", client đặt lại vị trí về x=11 rồi chạy lại #2 và #3. Nếu luật giống nhau, kết quả trùng dự đoán, x=13, nên màn hình không giật.

Với dân Go: giống một log có sequence number và offset đã commit; replay phần sau offset. Trường hợp server tính khác dự đoán gây rubber-banding là edge case, nằm ở phụ lục A2.

> **→ Slide 9:** Prediction lo được chuyển động của An. Còn Bình trên màn hình của An thì sao?

### Slide 9 — Other players arrive in steps, not motion.

*Hình: Map: Antigravity*

An không biết Bình sẽ bấm phím gì, nên không dự đoán được Bình. Client chỉ biết vị trí Bình khi snapshot đến, 20 lần mỗi giây, mỗi lần cách nhau 50 ms.

Vẽ thẳng các vị trí đó lên màn hình thì Bình nhảy cóc: đứng yên 50 ms rồi nhảy một nấc.

Thêm jitter, một hiện tượng bình thường trên Internet, thì có snapshot đến trễ 20 ms và nấc nhảy dài hơn. Ô Smooth đỏ.

Đây là hành vi mặc định khi chưa làm gì, không phải sự cố.

> **→ Slide 10:** Làm sao hết nhảy cóc mà không phải đoán tương lai?

### Slide 10 — Render 100 ms in the past to look smooth.

*Nguồn: Valve Developer Wiki: Interpolation (default 2 × 1/20 s); Glenn Fiedler, Snapshot Interpolation (~3× send interval) · Hình: Map: Antigravity*

Client cố tình vẽ Bình lùi lại một khoảng đệm, để lúc nào cũng có hai snapshot hai bên mà nội suy giữa chúng. Ô Smooth xanh.

Source mặc định 100 ms, tức 2 lần chu kỳ 50 ms (`cl_interp 0.1`). Fiedler khuyên khoảng 3 lần chu kỳ gửi để chịu được hai gói mất liên tiếp.

▸ **Bước 4** — cái giá: Bình mà An thấy là Bình của quá khứ, cũ cỡ 100 ms đệm cộng 20 ms đường truyền. Hình "bóng mờ" này là chữ ký của deck và sẽ dùng ngay ở slide sau.

Overwatch khi tăng lên khoảng 60 Hz được báo chí ghi là giảm nội suy từ khoảng 60 xuống 20 ms. Đây là nguồn thứ cấp, chỉ nói miệng.

> **→ Slide 11:** Vẽ quá khứ thì ảnh hưởng gì tới phát bắn của An?

### Slide 11 — Same instant, three truths: An's shot misses.

*Hình: Illustrations: Antigravity*

Cùng một thời điểm, ba máy thấy ba sự thật.

▸ **Bước 1** — An thấy Bình ở vị trí cũ, ngoài khoảng trống, và ngắm trúng. **Bước 2** — server biết Bình đã chạy tiếp khoảng 120 ms. **Bước 3** — nếu server chấm phát bắn theo vị trí hiện tại, An ngắm trúng mà vẫn trượt. **Bước 4** — còn Bình thấy mình sắp tới chỗ nấp.

Không có ai gian lận ở đây. Lỗi nằm ở chỗ server và client đang nói về hai thời điểm khác nhau. Ô Fair đỏ.

> **→ Slide 12:** Làm sao server chấm theo đúng thế giới An đã thấy?

### Slide 12 — Server rewinds to what An saw.

*Nguồn: Valve Developer Wiki: Lag Compensation (sv_maxunlag 1 s); Gabriel Gambetta, Lag Compensation · Hình: Inset: Valve Developer Wiki*

Server lưu lịch sử vị trí người chơi theo từng tick. Source giữ tối đa 1 giây (`sv_maxunlag`) và chỉ tua lại người chơi, không tua cả thế giới.

▸ **Bước 2** — lệnh bắn của An mang thời điểm và hướng ngắm. **Bước 3** — server lấy thời điểm đó trừ độ trễ nội suy để biết An đã nhìn thấy khung nào. **Bước 4** — server dựng lại hitbox ở khung đó rồi kiểm tra tia: trúng trên màn hình An thì cũng trúng trên server. Ô Fair xanh.

Ảnh nhỏ là ảnh của Valve: hitbox đỏ là vị trí client thấy, xanh là vị trí server dựng lại. Hệ quả phụ "Bình chết sau tường" là edge case, nằm ở phụ lục A1.

> **→ Slide 13:** Tua lại theo lời client có mở lại lỗ hổng gian lận của slide 6 không?

### Slide 13 — Still inputs only: four goals green.

*Nguồn: Valve Developer Wiki: Lag Compensation (rewind window capped at 1 s)*

Dù tua lại theo góc nhìn của An, server vẫn chỉ nhận **input** ("bắn lúc t, hướng θ") và tự quyết kết quả dựa trên lịch sử của chính nó. Client không bao giờ nói "tôi trúng".

Vì vậy cột Cheat-proof vẫn xanh. Chỉ cần nói thêm một câu: server giới hạn cửa sổ tua lại, ví dụ 1 s ở Source, để client không khai thời điểm quá xa trong quá khứ.

▸ **Bước 3–6** — hàng cuối sáng lần lượt: prediction và reconciliation cho Instant, interpolation cho Smooth, lag compensation cho Fair, server authority cho Cheat-proof.

Đến đây bốn kỹ thuật đã giữ cả bốn ô xanh. Câu hỏi tiếp theo không còn là "có đúng không" mà là "tốn bao lâu".

> **→ Slide 14:** Cả chuỗi từ cú click của An tới lúc Bình thấy mình trúng đạn tốn bao nhiêu ms, và đoạn nào đáng cắt?

## Phần 3 — Ngân sách độ trễ và hai đòn bẩy tick/FPS (slide 14–17)

### Slide 14 — One shot costs ~190 ms; the biggest piece is ours.

*Nguồn: Budget method after Riot Games, “Peeking into VALORANT’s Netcode”; values are illustrative estimates*

Ghép mọi mảnh đã gặp ở slide 5–12 lại: từ cú click của An tới lúc Bình thấy mình trúng đạn tốn khoảng 190 ms theo giả định của mình. Mỗi đoạn chờ lấy giá trị trung bình là nửa chu kỳ: nửa frame 8 ms, nửa tick 8 ms, nửa chu kỳ snapshot 25 ms.

▸ **Bước 1–7** — frame của An, mạng lên, chờ tick, chờ lượt gửi snapshot, mạng xuống, đệm nội suy, frame của Bình. **Bước 8** — đoạn dài nhất là đệm nội suy, 100 ms.

Chỉ khoảng 40 ms là "mạng". Phần còn lại là lựa chọn thiết kế: đệm nội suy, nhịp gửi snapshot, nhịp tick, FPS. Đó là tin tốt, vì mình kiểm soát được chúng.

Riot cũng lập ngân sách theo đúng kiểu này cho Valorant: RTT cộng buffering ở server theo tick cộng buffering ở client theo frame. Bảng tính chi tiết ở phụ lục A8.

> **→ Slide 15:** Đoạn dài nhất phụ thuộc vào gì? Đệm tỉ lệ với chu kỳ gửi snapshot.

### Slide 15 — Faster snapshots shrink the buffer, at a price.

*Nguồn: Valve interp formula; Respawn via Edgegap blog (×3 cost); Riot: 2.34 ms per server frame*

Theo công thức của Source, đệm bằng tỉ lệ chia cho tần suất gửi. Gửi 64 lần mỗi giây thì đệm còn khoảng 31 ms, chờ lượt gửi còn khoảng 8 ms, tổng xuống khoảng 103 ms. Lên 128 Hz cho cả tick và gửi thì còn khoảng 80 ms. Đều là ước tính minh họa.

▸ Kim đồng hồ: cái giá là CPU và băng thông tăng gần tuyến tính theo tần suất. Respawn nói 60 so với 20 Hz là khoảng ba lần chi phí, trích qua blog của Edgegap. Riot phải ép frame server xuống 2,34 ms để ba trận 128-tick chạy chung một core.

Gợi ý chọn tick theo thể loại: 20–30 Hz cho MOBA hay sinh tồn, 60 cho action, 64–128 cho bắn súng chiến thuật. Đây là đề xuất tổng hợp, không phải tiêu chuẩn.

> **→ Slide 16:** Hai đoạn chờ frame ở hai đầu thanh có co được không?

### Slide 16 — Client frame rate is latency too.

*Nguồn: Frame time = 1000 / FPS; values are illustrative estimates*

Lên 144 FPS thì mỗi frame chỉ còn 6,9 ms, nên mỗi đoạn chờ frame giảm từ khoảng 8 xuống khoảng 3,5 ms, ở cả hai đầu thanh: máy An và máy Bình.

Thanh ví dụ còn khoảng 71 ms. Con số này trùng với số của Riot ở slide sau chỉ là ngẫu nhiên, vì hai phép đo khác nhau.

Backend không điều khiển được FPS của người chơi, nhưng cần biết khoản này để không đổ hết lỗi cho mạng hay cho server.

> **→ Slide 17:** Một studio thật đã đi con đường tick + FPS này thế nào? Riot với Valorant.

### Slide 17 — Riot cut peeker's advantage 141 → ~101 ms.

*Nguồn: Riot Games, “Peeking into VALORANT’s Netcode”, 2020; PC Gamer interview (35 ms goal) · Hình: Figure: Riot Games*

Peeker's advantage là lợi thế của người lao ra từ góc: họ thấy đối thủ trước khi đối thủ thấy họ, vì độ trễ. Riot lấy mức nền khoảng 141 ms.

▸ **Cột 2** — phần netcode (Riot Direct, server 128-tick, giảm buffering) cắt khoảng 40 ms, tức 28%. Con số 101 ms là phép trừ của mình, Riot chỉ nêu mức giảm. **Cột 3** — chỉ khi client chạy 144 FPS mới xuống khoảng 71 ms, giảm 49%.

Đừng nói "128-tick đưa 141 xuống 71": đó là lỗi của bản nháp cũ. RTT 35 ms cho 70% người chơi là **mục tiêu** Riot nêu trước ra mắt, không phải số đo.

Riot kết bài bằng việc thừa nhận peeker's advantage không thể về 0, và dùng thêm đòn bẩy thiết kế game như map và hình phạt độ chính xác khi di chuyển.

> **→ Slide 18:** Còn hai đoạn "Network" trên thanh: cắt bằng cách nào, với người chơi Việt?

## Phần 4 — Hạ tầng: region, đường truyền, server, đo đạc (slide 18–22)

### Slide 18 — For Vietnam, in-country servers beat fragile cables.

*Nguồn: VnExpress International, 2026-08-27; GearUP guide (anecdotal ping) · Hình: Map: TeleGeography*

Quốc tế của Việt Nam đi qua 6 tuyến cáp biển, trung bình khoảng 10 sự cố mỗi năm kể từ 2022. Tháng 8/2026 có 4 tuyến lỗi cùng lúc, và sửa có khi mất hàng tháng (VnExpress).

▸ **Bước 3** — ping Việt Nam → Singapore 30–40 ms trên tuyến tốt và 60–100 ms trên tuyến xấu chỉ là số giai thoại, nói kèm chữ "theo báo cáo người chơi".

▸ **Bước 4** — đề xuất: region chính trong nước (TP.HCM, Hà Nội), Singapore làm hub SEA. Đo theo từng ISP (Viettel, VNPT, FPT) vì peering quan trọng hơn khoảng cách địa lý. Mỗi 10 ms RTT bớt được là bớt 10 ms trên thanh.

> **→ Slide 19:** Có nhiều region rồi thì ai quyết một trận chạy ở đâu?

### Slide 19 — Ping every region, then match by latency.

*Nguồn: Model: AWS GameLift UDP ping beacons; Azure PlayFab QoS beacons*

Client ping UDP tới beacon của từng region nhiều lần rồi lấy median. AWS GameLift có UDP ping beacon vì ICMP cho kết quả kém chính xác (nhiều mạng hạ ưu tiên hoặc chặn ICMP); PlayFab dùng QoS beacon ở cổng 3075.

Bảng ping đi kèm vé tìm trận. Matchmaker áp ngưỡng độ trễ tối đa, rồi nới dần nếu chờ lâu: đánh đổi ping lấy thời gian xếp hàng.

Ngưỡng 60 ms nới lên 100 ms sau 20–30 giây là mặc định hợp lý, không có nguồn benchmark. Các số RTT trên hình là ví dụ.

Cảnh báo: nếu khai ping cho location không có fleet, request có thể fail.

> **→ Slide 20:** Người chơi ở xa mọi region thì sao?

### Slide 20 — Get packets onto a private backbone early.

*Nguồn: Quartz (NA only); Riot Tech Blog 2021 (500 Gb/s); Steamworks SDR docs · Hình: Images: Riot Games, Valve*

▸ **Bước 1–2** — đường Internet công cộng đi qua nhiều nhà mạng, nhiều hop. Đường thứ hai đưa gói tin lên một PoP gần người chơi ngay từ đầu, rồi chạy trên backbone riêng tới server.

Riot Direct là backbone riêng của Riot từ 2014. Số 31% → 80% người chơi LoL dưới 80 ms là con số Quartz đưa, chỉ cho Bắc Mỹ; không tìm thấy bài sơ cấp của Riot nêu "31%", nên nói rõ nguồn là báo chí.

▸ **Bước 3** — Riot Direct từng hấp thụ một đợt DDoS 500 Gb/s nhắm vào server Valorant. Valve SDR ẩn IP server và tự chọn relay; chính Valve thừa nhận nếu server ở xa relay thì đường relay có thể chậm hơn.

Studio cỡ vừa nên mua lớp này (Global Accelerator, Cloudflare Spectrum, hoặc SDR nếu phát hành trên Steam) thay vì tự xây.

> **→ Slide 21:** Mạng xong rồi. Còn server: nó có tự thêm độ trễ không?

### Slide 21 — A late tick is latency you added.

*Nguồn: playvalorant.com (patch 5.07 notes); Go Blog (GC guide); pkg.go.dev · Hình: Gopher: Renee French (CC BY 4.0)*

Đoạn "Tick wait" trên thanh giả định server luôn xong đúng hạn. Tick nào vượt ngân sách 15,6 ms là thêm một đoạn chờ trên thanh, nên vòng lặp tick phải có thời gian ổn định.

Riot đo "% frame đạt ngân sách 128 Hz" và đạt từ 99,3% trở lên sau patch 5.07. Đây là cách đo nên copy: một con số theo phân phối, không phải trung bình.

▸ **Bước 2–3** — với Go, rủi ro chính ở đuôi là GC. Mẹo: cấp phát buffer sẵn và tái dùng slice (`s = s[:0]`); dùng `sync.Pool` cho gói tin; kiểm escape bằng `-gcflags=-m`; đặt `GOMEMLIMIT`; batch UDP bằng `ReadBatch`/`WriteBatch` của `x/net`.

Green Tea GC giảm khoảng 10% thời gian GC với nhiều workload. Nói thêm rằng chưa có case study công khai về GC của game server Go, nên đây là kỷ luật kỹ thuật chứ không phải số đo.

> **→ Slide 22:** Cắt thanh trên giấy rồi. Làm sao biết cải tiến có tác dụng với người chơi thật?

### Slide 22 — Averages hide the players who lag.

*Nguồn: AWS GameLift & Microsoft PlayFab: measure with UDP, not ICMP; values are examples*

Đo RTT bằng UDP từ phía client, không dùng ICMP, như AWS và Microsoft khuyến nghị.

▸ **Bước 1–2** — trung bình 38 ms trông ổn, nhưng p95 là 85 và p99 là 140 ms (số ví dụ). Báo cáo theo phân vị p50/p95/p99, kèm jitter và % mất gói, cắt theo region × ISP × nền tảng. Riot cũng đặt mục tiêu theo phân phối ("% người chơi dưới X ms").

▸ **Bước 3** — p95 của một ISP tăng vọt thường là tín hiệu sớm của sự cố cáp, nên biến nó thành alert.

Trong CI, dùng `tc netem` để mô phỏng tuyến Việt Nam → Singapore lúc đứt cáp: thêm delay, jitter và loss.

> **→ Slide 23:** Bộ kỹ thuật của game bắn súng có dùng được cho mọi thể loại không? Quay lại trục thể loại của slide 4.

## Phần 5 — Thể loại khác và tổng kết (slide 23–24)

### Slide 23 — Fighting games roll back; strategy games lockstep.

*Nguồn: ggpo.net; Infil, SF6 netcode review; Gaffer On Games · Hình: Images: Capcom, Xbox Game Studios*

Trên trục slide 4: đối kháng nằm ở đầu nhạy nhất, RTS ở đầu ít nhạy nhất. Mỗi đầu có công cụ riêng.

▸ **Rollback** — game đối kháng cần phản hồi theo từng frame. GGPO (2009) cho mỗi máy chạy ngay input của mình và đoán input của đối thủ. Khi đoán sai thì nạp lại trạng thái đã lưu và mô phỏng lại tới hiện tại, với điều kiện simulation tất định hoàn toàn. Street Fighter 6 thêm 0, 1 hoặc 2 frame input delay theo ping để bớt số frame phải rollback, và delay không giảm lại trong trận.

▸ **Lockstep** — RTS gửi lệnh thay vì trạng thái (hàng trăm unit, gửi trạng thái thì quá nặng) và dùng playout buffer để mọi máy chạy cùng lệnh ở cùng lượt. Fiedler nhắc rằng không thể buffer để thoát mọi vấn đề.

Chi tiết trade-off giữa delay và rollback nằm ở phụ lục A5.

> **→ Slide 24:** Nhìn lại scorecard của slide 3 và thanh ngân sách của slide 14: mình đã đi được tới đâu?

### Slide 24 — Four techniques for fairness, three levers for speed.

*Nguồn: All totals are illustrative estimates; Riot: peeker's advantage can't reach zero · Hình: Illustration: Antigravity*

Nhìn lại scorecard: prediction và reconciliation cho "tức thì", interpolation cho "mượt", lag compensation cho "công bằng", server authority cho "không gian lận".

▸ **Bước 1–4** — nhìn lại thanh: ba đòn bẩy (nhịp gửi và tick, FPS, vị trí server) kéo ví dụ từ khoảng 190 xuống khoảng 71 ms. Hai đoạn mạng có sọc: phần đó chỉ co khi đặt server gần người chơi và đi backbone tốt.

Riot cũng thừa nhận không thể về 0.

Mời khán giả nhớ lại cảnh slide 1 và trả lời: phát bắn của An tốn bao lâu, tốn ở đâu, và đoạn nào mình kiểm soát được.

> **→ Phụ lục:** các edge case và bảng tính, chỉ mở khi có câu hỏi.

## Phụ lục A1–A8 (chỉ mở khi có câu hỏi)

### Slide A1 — Fair to the shooter means unfair-looking to the target.

*Nguồn: Valve Developer Wiki: Lag Compensation (1 s cap) · Hình: Illustration: Antigravity*

Lag compensation công bằng với người bắn. Vì vậy người bị bắn có thể chết sau khi đã vào chỗ nấp trên màn hình của mình: server tua về lúc Bình còn ngoài khoảng trống.

Source giới hạn tua lại 1 s. Có thể chặn cửa sổ hẹp hơn, hoặc ưu tiên nạn nhân khi người bắn có ping cao.

Con số "Overwatch giới hạn khoảng 220 ms" chưa kiểm chứng với nguồn sơ cấp, đừng trích.

### Slide A2 — Every glitch has a mechanism.

*Nguồn: Epic Games support (Rocket League rubber-banding); Gambetta; Fiedler · Hình: Image: Psyonix / Epic Games*

Rubber-banding liên quan trực tiếp đến buffer input của server và việc client bị kéo về vị trí server khi dự đoán sai, theo trang hỗ trợ của Epic cho Rocket League.

Teleport xảy ra khi mất gói vượt quá phần bộ đệm nội suy che được. Desync là hệ quả của simulation không tất định, nên game lockstep và rollback dùng số học dấu phẩy cố định và checksum trạng thái.

### Slide A3 — Sub-tick: precise input, same 64 Hz world.

*Nguồn: Valve, CS2 announcement; Charlie Intel (64 Hz official servers) · Hình: Image: Valve*

Sub-tick đóng dấu thời gian input bên trong khoảng tick, nhưng simulation và broadcast vẫn ở 64 Hz.

Valve không công bố số đo độ trễ nào cho sub-tick, và cộng đồng chia rẽ về hiệu quả. Đừng nói "sub-tick bằng 128 tick".

Ẩn dụ cho dân Go: event time so với processing time trong stream processing.

### Slide A4 — Compression: 17.4 Mbps → ~15 kbps at rest.

*Nguồn: Glenn Fiedler, Snapshot Compression (901 cubes @ 60 Hz) · Hình: Image: Glenn Fiedler*

Các số của Fiedler cho mô phỏng 901 khối lập phương ở 60 Hz: chưa nén khoảng 17,4 Mbps. Smallest-three đưa quaternion từ 128 xuống 29 bit, lượng tử hóa đưa vị trí từ 96 xuống 50 bit.

Delta encoding so với snapshot client đã ack là một bậc độ lớn nữa; khi cảnh đứng yên chỉ còn khoảng 15 kbps. Mục tiêu của ông là dưới 256 kbps.

Ảnh nhỏ là một khung trong video của Fiedler lúc các khối đang bay: 242 kbps, đã dưới mục tiêu 256 kbps. Con số 15 kbps là lúc cảnh đứng yên.

### Slide A5 — Input delay hides frames; rollback fixes the rest.

*Nguồn: Infil, SF6 netcode review; Epic Games support (Rocket League input buffer)*

Số frame cần che xấp xỉ nửa RTT chia 16,67 ms. Phần đầu che bằng input delay (cả hai bên cùng chậm D frame), phần còn lại sửa bằng rollback.

SF6 tăng D theo ping: 0 frame dưới 100 ms, 1 frame từ 100 đến 199 ms, 2 frame từ 200 ms. Rocket League có buffer input ở server; khi buffer rỗng thì server lặp lại input cuối.

### Slide A6 — Send only what each player can see.

*Nguồn: Epic Games, Replication Graph (Fortnite) · Hình: Image: Epic Games*

Fortnite bắt đầu với 100 người chơi và khoảng 50.000 actor được replicate. Kiểm tra từng actor với từng client là quá đắt.

Replication Graph chia thế giới thành lưới; mỗi client chỉ nhận actor trong các ô lân cận, nên bỏ được việc kiểm tra từng cặp actor–client. Bớt dữ liệu gửi cũng là bớt thời gian chờ ở server.

### Slide A7 — UDP first; WebTransport for browsers.

*Nguồn: Glenn Fiedler (UDP vs TCP); web.dev Baseline (WebTransport, Safari 26.4)*

TCP giao gói theo thứ tự: mất gói 2 thì gói 3, 4, 5 phải chờ gói 2 được gửi lại (head-of-line blocking). Với snapshot, gói cũ đã vô nghĩa khi gói mới tới, nên snapshot không đi TCP.

UDP giao gói nào tới thì dùng gói đó. Trình duyệt không mở được UDP thô; WebTransport cho datagram kiểu UDP và đạt Baseline vào 3/2026 khi Safari 26.4 hỗ trợ.

### Slide A8 — Budget derivation, segment by segment.

*Nguồn: Estimates from the deck's assumptions; each wait = half its period*

Mọi số là ước tính từ giả định của deck (tick 64, snapshot 20/s, 60 FPS, RTT 40 ms), mỗi đoạn chờ lấy nửa chu kỳ, đệm nội suy lấy 2 chu kỳ gửi như mặc định Source.

Cột "128 Hz" tăng cả tick lẫn tần suất gửi lên 128; cột "144 FPS" giữ 128 Hz và đổi FPS của cả hai client. Ô màu là đoạn vừa co so với cột trước. Không cột nào đụng tới hai đoạn mạng: phần đó là việc của slide 18–20.
