# Kịch bản trình bày — Scaling an online game to 1M CCU (40 slide: bìa, 25 slide nội dung, 5 slide chuyển mốc, phụ lục B1–B9)

Xuất tự động từ ghi chú trong `index.html` (`python3 tools/export_script.py`). Muốn sửa lời nói,
sửa trong `index.html` rồi chạy lại. Mỗi slide tự chạy các bước, 0,6 giây một bước; dải bước
bên phải đánh số khớp với marker trên hình. Nhấn A để chuyển sang bấm từng bước.
Mọi con số dung lượng trên slide là ước tính (tag est.) hoặc giả định (magenta, nghiêng), trừ số có nguồn.

## Phần 1 — Bìa, bối cảnh, giả định, mục tiêu (slide 1–5)

### Slide 1 — Scaling an online game to 1M CCU

*Ảnh: Background: 1 dot = 1 player, Binh in orange (drawn for this deck)*

Chào mọi người. Đây là deck thứ hai của series game online: làm sao một game bắn súng 5v5 của một studio Việt lớn từ vài trăm người chơi lên một triệu người online cùng lúc.

Cả buổi đi theo một người chơi, Bình, và bốn mốc CCU: 500, 10 nghìn, 100 nghìn, 1 triệu.

Luật duy nhất của buổi này: chỉ thêm một thành phần khi phép tính cho thấy thiết kế cũ gãy. Không vẽ kiến trúc "đẹp" từ đầu.

*[Chỉ hình nền]* Một triệu chấm xám, một chấm cam là Bình. Mọi thứ phía sau là để cú bấm "Chơi" của Bình vào trận nhanh và không văng.

> **→ Slide 2:** Vì sao phải học scale theo từng mốc? Vì không ai đoán đúng tải ngày ra mắt.

### Slide 2 — Real load can hit 50× the plan.

*Nguồn: Google Cloud blog 2016 (Pokémon GO); Epic Games postmortem 2018 (Fortnite) · Ảnh: Niantic / The Pokémon Company; Epic Games*

Pokémon GO gặp 50 lần tải kế hoạch, tức 10 lần kịch bản xấu nhất mà Google và Niantic đã ước. Thanh "Actual" trên slide vẽ đúng tỉ lệ 1:50.

Fortnite tăng từ peak 60 nghìn lên 3,4 triệu CCU chỉ trong vài tháng, và cuối tuần 3–4/2/2018 có sáu sự cố (phụ lục B3).

*[Chỉ đường cong]* Đường một ngày ra mắt chỉ là minh họa: tải vượt mức kế hoạch từ chiều, vùng đỏ là lúc hệ thống gãy.

Thông điệp: không ai biết trước hệ số tăng, nên phải biết hệ thống của mình gãy ở mốc nào và gãy ở đâu.

> **→ Slide 3:** CCU, stateful, stateless, shard, region là gì? Gắn tên vào buổi tối của Bình.

### Slide 3 — Binh's evening touches five systems.

*Nguồn: Teaching example: Trận Đồng, a 5v5 game (10 players/match) · Ảnh: Illustration generated for this deck (Codex, GPT Image)*

Một buổi tối của Bình đi qua năm hệ thống: dịch vụ login, social và presence (bạn bè, party), matchmaker, match server, và kết quả/xếp hạng.

CCU là số người đang kết nối cùng lúc, khác DAU (số người chơi trong ngày).

Match server giữ một trận đang sống, nên là stateful: tắt nó là mất trận. Bốn hệ thống còn lại là stateless: tắt một node thì không mất gì.

Shard (một phần dữ liệu) và region (một cụm hạ tầng theo địa lý) sẽ xuất hiện ở mốc 1 triệu. Ví dụ là game session-based; persistent world và game mobile async scale theo trục khác (phụ lục B2).

> **→ Slide 4:** Tính dung lượng bằng số nào? Trước khi tính phải công khai đầu vào.

### Slide 4 — Seven assumptions and one real number.

*Nguồn: Riot Games, “VALORANT's 128-Tick Servers”, 2020*

Mọi phép tính của buổi này dựng trên bảy giả định giảng dạy cộng một con số đo thật. Mỗi giả định có tag nhỏ ghi slide nào dùng nó.

Con số thật: Riot xếp khoảng 150 trận trên một host 36 core, ở 128 tick với ngân sách 2,34 ms mỗi frame. Lúc đầu một trận tốn khoảng một core.

Công thức chính của cả deck nằm ở dưới, kèm một ví dụ: 10 nghìn CCU chỉ cần khoảng 6 host. Kỹ sư có thể thay giả định của game mình vào và tính lại.

Màu: magenta nghiêng là giả định, chữ mực kèm tag là số có nguồn, chữ "est." xám là số suy ra.

> **→ Slide 5:** Thước đo cho mọi thiết kế sau là gì?

### Slide 5 — Fast to match, no drops, sane cost.

*Nguồn: Goals for this deck; targets are teaching choices*

Ba mục tiêu, mỗi mục có một ngưỡng cụ thể: vào trận dưới 30 giây; một lần crash hay deploy làm mất tối đa một trận; chi phí trên mỗi CCU không tăng khi game lớn.

Ba mục tiêu kéo nhau. Muốn Bình vào trận nhanh thì phải giữ sẵn server trống, mà server trống là tiền. Muốn không văng thì phải cô lập lỗi, mà cô lập lỗi thì thêm thành phần.

Mỗi mốc CCU sẽ được chấm lại trên bảng này. Từ đây bảng thu nhỏ ở góc phải trên, kèm một dòng lý do ô vừa đổi.

> **→ Slide 6:** Bắt đầu với thiết kế đơn giản nhất ở vài trăm người.

## Phần 2 — Mốc ~500 CCU (slide 6–7)

### Slide 6 — Slide 6

*Nguồn: Milestone 1 of 4*

Mốc đầu tiên: bản prototype. Câu hỏi: một máy chạy được bao nhiêu người?

### Slide 7 — One box tops out near 500 CCU.

*Nguồn: 1 core per match: VALORANT before optimisation (Riot 2020); 500 CCU is an estimate*

Prototype hợp lý là một binary Go làm hết mọi việc cộng một Postgres. Gần như toàn bộ CPU là để mô phỏng trận; login, sảnh và matchmaking chỉ là phần nhỏ.

*[Bước 2–3]* Nếu mỗi trận tốn khoảng một core như Valorant lúc đầu, một host 36 core chạy khoảng 36 trận, tức 360 người trong trận. Chia 0,7 ra khoảng 500 CCU. Đây là ước tính.

*[Bước 4]* Trận thứ 37 không còn core.

Ô "No drops" màu hổ phách vì một lần crash process là văng cả 36 trận. Mua máy to hơn (192 core) chỉ đẩy lên khoảng 2.700 CCU và vẫn là một điểm chết. Đây là điểm xuất phát hợp lý, không phải sai lầm.

> **→ Slide 8:** Lên 10 nghìn CCU thì 700 trận không còn vừa một máy.

## Phần 3 — Mốc 10K CCU (slide 8–11)

### Slide 8 — Slide 8

*Nguồn: Milestone 2 of 4*

10 nghìn CCU nhân 0,7 chia 10 là 700 trận đồng thời. Một host chỉ chứa 36. Phải nhiều máy, và câu hỏi là tách theo đường nào.

### Slide 9 — Split stateful matches from stateless services.

*Nguồn: VALORANT: one process per match, ~150/host (Riot 2020); host count is an estimate*

Phần stateful của game session-based nằm gọn trong một trận, sống và chết cùng trận. Vì vậy mỗi trận chạy thành một process riêng trên đội host, như Valorant làm.

Login, hồ sơ và sảnh thành service stateless, scale theo số request, đi HTTPS. Trận đi UDP thẳng tới fleet.

*[Bước 2]* 700 trận chia 36 trận một host là khoảng 20 host (ước tính); trên hình chỉ vẽ 3.

*[Bước 3–4]* Trước: một crash mất 36 trận. Sau: một crash mất đúng một trận. Đó là lý do ô "No drops" thành ✓. "Fast" và "Cost" tạm hổ phách: chưa có ai xếp trận vào host, và 20 host 1 core/trận là đắt.

> **→ Slide 10:** Ai quyết trận của Bình chạy ở host nào?

### Slide 10 — Many hosts need a matchmaker and allocator.

*Nguồn: GameServer lifecycle: Agones docs (Google); 0.33 new matches/s = 700 ÷ 35-min cycle (est.)*

Khi có hai chục host, cần hai vai trò mới. Matchmaker gom 10 người phù hợp. Allocator chọn một process trận đang ở trạng thái Ready, theo mô hình của Agones, rồi trả ip:port cho client.

Ready nghĩa là process đã khởi động xong và đang chờ; nhờ vậy Bình không phải đợi server boot.

Ở 10 nghìn CCU có 700 trận. Với chu kỳ 35 phút, mỗi giây chỉ có khoảng 0,33 trận mới. RPS nhỏ; cái khó của matchmaking là CPU để đánh giá pool, chưa phải throughput.

> **→ Slide 11:** Hai chục host 1 core/trận là đắt. Mua thêm host hay làm process nhẹ hơn?

### Slide 11 — Frame time is the biggest cost lever.

*Nguồn: Riot Games, “VALORANT's 128-Tick Servers”, 2020; host counts are estimates · Ảnh: Riot Games*

Ở 10 nghìn CCU có 700 trận. Mỗi trận một core thì cần khoảng 700 core, tức khoảng 20 host 36 core.

*[Bước 2]* Riot đo từng tối ưu: animation mỗi frame thứ tư giảm 75% chi phí animation, tắt animation ở buy phase giảm thêm 33%, bật lại hyperthreading được thêm 25%. Frame từ 50 ms xuống dưới 2 ms, trong ngân sách 7,8 ms của một tick 128 Hz.

*[Bước 3–4]* Frame nhẹ hơn nghĩa là khoảng 4 trận một core, tức 150 trận một host, còn khoảng 5 host.

Edge case: 168 instance trên một host đẩy frame lên khoảng 5,7 ms vì noisy neighbor, nên đóng gói quá dày cũng hỏng. Hãy đo chứ đừng đoán.

> **→ Slide 12:** Lên 100 nghìn: cái gì gãy tiếp?

## Phần 4 — Mốc 100K CCU (slide 12–15)

### Slide 12 — Slide 12

*Nguồn: Milestone 3 of 4*

Ở 100 nghìn, phần trận vẫn scale tuyến tính. Cái mới là kết nối thường trực: presence, party, chat.

### Slide 13 — At 100K, every API deploy drops every socket.

*Nguồn: Riot chat architecture 2015 (150 kB → 25 kB/session); 15 GB and the 8 GB pod limit are estimates · Ảnh: Riot Games*

Ở 100 nghìn CCU, mỗi người giữ một kết nối thường trực cho bạn bè, party và chat, như panel bạn bè của LoL.

Riot chat từng tốn hơn 150 kB mỗi phiên trước khi tối ưu xuống 25 kB. Nếu mỗi socket giữ 150 kB trạng thái thì 100 nghìn socket là khoảng 15 GB trong process API, gấp đôi giới hạn 8 GB của một pod (giả định).

*[Bước 4]* Vấn đề lớn hơn RAM: hai loại tải có vòng đời khác nhau nằm chung một process. Mỗi lần deploy API, cả 100 nghìn socket rơi, và cả 100 nghìn client reconnect cùng lúc. Vì vậy ô "No drops" thành ✗.

> **→ Slide 14:** Tách socket ra khỏi API như thế nào và tốn bao nhiêu?

### Slide 14 — A gateway tier holds 1M connections in ~1 GB.

*Nguồn: Eran Yanay, “Going Infinite: 1M websockets in Go”, GopherCon IL 2019; Pitaya (connector/backend) · Ảnh: Eran Yanay, GopherCon IL 2019*

Tầng gateway chỉ giữ kết nối, logic nằm ở backend phía sau, giống mô hình connector/backend của Pitaya (dùng etcd và NATS).

*[Bước 3]* Giờ deploy API không còn đụng tới socket: socket nằm ở gateway, nên ô "No drops" về lại ✓.

Ta thiết kế gateway cho đích 1 triệu luôn. Eran Yanay demo hơn 1 triệu WebSocket trong Go: cách ngây thơ (một goroutine và buffer riêng cho mỗi kết nối) khoảng 20 GB, dùng epoll và tái dùng buffer còn khoảng 600 MB.

*[Bước 4]* Dù vậy không dồn 1 triệu kết nối vào một node: rải ra 20–50 pod, mỗi pod 20–50 nghìn socket, để một lần deploy hay crash chỉ làm reconnect một phần nhỏ.

> **→ Slide 15:** Bạn của Bình gửi lời mời party thì tin đi đường nào, khi có nhiều pod?

### Slide 15 — A session directory routes messages to Binh.

*Nguồn: 3.3K heartbeats/s = 100K ÷ 30-s heartbeat (assumption) — estimate*

Khi Bình có thể ở bất kỳ pod gateway nào, hệ thống cần một bảng tra "player → pod", ví dụ trên Redis hoặc etcd.

*[Bước 1–3]* Lời mời của bạn vào pod A; pod A hỏi directory, được trả "Bình ở C"; pod A chuyển tin sang C, C đẩy xuống socket của Bình.

*[Bước 4]* Với heartbeat mỗi 30 giây, 100 nghìn CCU là khoảng 3.300 heartbeat mỗi giây, 1 triệu là 33 nghìn. Chúng phải được trả lời trong RAM của gateway, không chạm DB.

Phương án khác là pub/sub theo topic của từng user, sẽ gặp lại ở slide 25.

> **→ Slide 16:** Lên 1 triệu. Trước hết là phép tính: DB chịu bao nhiêu?

## Phần 5 — Mốc 1M CCU: dung lượng (slide 16–21) và sự cố (slide 22–29)

### Slide 16 — Slide 16

*Nguồn: Milestone 4 of 4 · part 1*

Mốc 1 triệu chia hai phần. Phần một: phép tính dung lượng cho DB, matchmaking, fleet và băng thông. Phần hai: các cơn bão và sự cố.

### Slide 17 — At 1M, shard player profiles by player ID.

*Nguồn: Epic Games 2018 (Fortnite @3.4M); Heroic Labs 2024 (Nakama @2M); per-CCU ratio, 1M loads and 10K/primary are estimates*

Lấy tỉ lệ của Fortnite ở 3,4 triệu CCU (124 nghìn request/s, 318 nghìn lượt đọc và 132 nghìn lượt ghi DB mỗi giây) chia theo đầu người, rồi nhân lên 1 triệu: khoảng 36 nghìn request, 94 nghìn lượt đọc và 39 nghìn lượt ghi mỗi giây. Đây là ước tính.

*[Bước 1]* Giả định một primary chịu khoảng 10 nghìn lượt ghi mỗi giây. 39 nghìn là gần 4 lần.

*[Bước 2–3]* Shard theo hash của player_id thành 4 phần, mỗi shard khoảng 10 nghìn. Request của Bình đi gateway → API → shard 3.

Đối chiếu: Nakama chạy economy 22,3 nghìn request/s ở 2 triệu CCU với p95 dưới 27 ms, vì ghi theo mốc chứ không ghi theo tick. Mọi thay đổi economy cần idempotency key (phụ lục B6).

> **→ Slide 18:** Có dữ liệu nào không nên nằm cạnh hồ sơ?

### Slide 18 — Move matchmaking state out of the profile DB.

*Nguồn: Epic Games, “Postmortem of Service Outage at 3.4M CCU”, 2018 · Ảnh: Text: Epic Games postmortem*

Ở Fortnite, matchmaking chiếm khoảng 15% truy vấn và 11% lượt ghi, toàn bộ trên một shard MongoDB. Ghi bị xếp hàng tới hơn 40 giây mỗi thao tác.

Vì sao dồn vào một shard? Vé tìm trận không thuộc về một người chơi nào, nên không shard theo player_id được.

*[Bước 2]* Hướng sửa Epic nêu: một kho in-memory có thể shard cho dữ liệu matchmaking tạm thời. Ta chia theo pool tìm trận: VN-ranked, VN-casual, SG-ranked; vé có TTL.

Lúc đăng postmortem, Epic chưa tìm ra root cause, nên nói đúng như vậy.

> **→ Slide 19:** Matchmaker có chịu được 1 triệu không?

### Slide 19 — 1M CCU is only ~333 tickets per second.

*Nguồn: Open Match 2: public preview (Google); ticket rate and pair counts are estimates*

700 nghìn người trong trận với chu kỳ 35 phút (2.100 giây) cho ra khoảng 333 vé mỗi giây, ghép thành khoảng 33 trận mỗi giây. Party còn làm số vé ít hơn. So với 39 nghìn lượt ghi DB mỗi giây ở slide 17, đây là tải nhỏ.

Cái khó là CPU để đánh giá chất lượng trận: số cặp phải so tăng theo bình phương kích thước pool. Chia theo region × mode × dải skill thành 12 pool, mỗi pool một worker, số cặp giảm cỡ trăm lần.

Open Match 2 gom các microservice của v1 thành một core image và đang ở public preview. Đội Go cũng có thể tự viết vòng ghép trên Redis. Backfill (thay người rời trận) để ngoài slide.

> **→ Slide 20:** Đội match host lớn tới đâu?

### Slide 20 — 70,000 matches need ~560 hosts.

*Nguồn: Riot 2020 (150/host); Agones FleetAutoscaler docs (30-s sync); host counts and buffer are estimates*

1 triệu CCU nhân 0,7 chia 10 ra 70 nghìn trận đồng thời. Xếp 150 trận một host như Riot là khoảng 467 host, cộng 20% headroom là khoảng 560. Tất cả là ước tính.

Nếu chưa tối ưu (1 core một trận) thì khoảng 1.950 host; theo mục tiêu lý thuyết 3 trận một core thì 650–780. Hai con số này chỉ để nói, không đưa lên slide.

*[Bước 7]* Đệm Ready: 33 trận mới mỗi giây nhân 60 giây khởi động là khoảng 2.000 process, cộng 33 mỗi giây nhân 30 giây chu kỳ sync của Agones là khoảng 1.000. Tổng khoảng 3.000 server chờ, khoảng 20 host. Thời gian khởi động 60 giây là giả định, hãy đo của game mình.

Vùng xám giữa hai đường là tiền trả cho máy chờ, nên ô "Cost" hổ phách. Dùng chính sách Schedule cho giờ cao điểm đã biết; với GameLift, chạy Spot kèm On-Demand dự phòng.

> **→ Slide 21:** Mạng ra của fleet lớn cỡ nào?

### Slide 21 — Bandwidth is fine per host, costly in total.

*Nguồn: Per-player 250–900 kbps: vendor range (Edgegap); fleet totals are estimates*

700 nghìn người nhân 250–900 kbps ra 175–630 Gbps. Dải 250–900 kbps là dải planning của vendor, không có số sơ cấp của Valorant, LoL hay CS2.

Mỗi host 150 trận chỉ 0,4–1,4 Gbps, tức 4–14% của NIC 10 Gbps: CPU mới là nút cổ chai, không phải card mạng. Chiều bị nghẽn là server gửi xuống người chơi.

Cộng cả tháng: 175–630 Gbps là khoảng 57–205 PB mỗi tháng. Tiền egress có thể ngang tiền máy, nên studio hay dùng bare metal và hợp đồng băng thông cam kết. Không nêu số tiền vì chưa tra giá.

> **→ Slide 22:** Phép tính đã ổn. Giờ là lúc mọi thứ cùng xảy ra một lúc.

### Slide 22 — Slide 22

*Nguồn: Milestone 4 of 4 · part 2*

Phần hai của mốc 1 triệu: các sự cố có postmortem công khai. Chúng không nằm ở game server mà ở tầng platform. Mỗi slide giữ một ô trên bảng ở trạng thái ✓ khi có bão.

### Slide 23 — A login queue turns storms into a steady flow.

*Nguồn: AccelByte login-queue docs; WoW Classic queue (2019); login rates and 2,000/s are estimates · Ảnh: Blizzard Entertainment*

Bình thường, phiên 2 giờ cho khoảng 140 lượt login mỗi giây. Sau bảo trì, 1 triệu người quay lại trong 5 phút là khoảng 3.300 lượt mỗi giây; mỗi login gọi 5–10 service bên trong, tức 17–33 nghìn request/s.

*[Bước 3–4]* Login queue (như AccelByte) kích hoạt khi tốc độ login vượt ngưỡng, nhận vào 2.000 lượt mỗi giây (giả định = sức của backend). Hàng chờ phình trong 5 phút đầu rồi xả hết sau khoảng 8 phút.

*[Bước 5]* Bình nhận vé có vị trí và thời gian chờ, như màn hình của WoW Classic. Người vừa rớt mạng được vào trước.

Hàng chờ là backpressure có chủ đích: chậm vài phút còn hơn sập. Client cần backoff có jitter.

> **→ Slide 24:** 5–10 lời gọi trong của mỗi login có thể kéo sập cả tầng không?

### Slide 24 — Isolate health checks; time out every dependency.

*Nguồn: Epic Games, “Postmortem of Service Outage at 3.4M CCU”, 2018 · Ảnh: Text: Epic Games postmortem*

Account Service của Fortnite chạy 40–100 nghìn request/s, đỉnh 160 nghìn. Khi Memcached nghẽn, Nginx chờ đến cạn worker, kể cả worker trả lời health check.

*[Bước 2]* Load balancer thấy health check fail nên rút mọi node: sập toàn bộ. Đây là lỗi cấu trúc, thêm máy không cứu được.

*[Bước 3–5]* Bên phải là cùng node đó sau khi sửa. Quy tắc trong Go: mọi lời gọi phụ thuộc có `context.WithTimeout` ngắn (và circuit breaker); health check chạy trên goroutine và pool riêng, không chung với traffic nghiệp vụ. Giá trị 50 ms chỉ là ví dụ.

> **→ Slide 25:** Deploy gateway và báo trạng thái online của Bình cho bạn bè có an toàn ở 1 triệu không?

### Slide 25 — Fan out through pub/sub, not a full mesh.

*Nguồn: Epic Games 2018 (XMPP full mesh, 101 nodes); Riot chat 2015; push rates are estimates*

Fortnite chạy XMPP full mesh 101 node với hơn 3 triệu kết nối. Một lần failover gây bão reconnect làm sập load balancer của Friends, và subnet của ELB hết IP nên không phục hồi được. Riot chat cũng coi replication full mesh là rào cản chính để scale tuyến tính: N node là N² đường nối.

*[Bước 2–3]* Thay bằng pub/sub phân vùng theo user, ví dụ NATS, 4 partition. Ước tính ở 1 triệu CCU: khoảng 1.900 lần đổi trạng thái mỗi giây × 20 bạn online, ra khoảng 38 nghìn push/s, mỗi partition khoảng 9,5 nghìn.

*[Bước 4]* Khi deploy gateway, client reconnect với exponential backoff có jitter: tải trải đều dưới ngưỡng accept thay vì một cột dựng đứng. Biểu đồ chỉ minh họa hình dạng.

Kênh lớn, ví dụ "vấn đề guild lớn" của Discord, cần xử lý riêng (phụ lục B8).

> **→ Slide 26:** Khi mở thêm Singapore, thành phần nào nhân theo region, thành phần nào giữ một bản?

### Slide 26 — Money and identity global; everything else regional.

*Nguồn: VN cables: VnExpress International 2026; the global/regional split is a design judgment · Ảnh: Map: TeleGeography*

Quy tắc thiết kế: thứ gì đúng-sai liên quan đến tiền hoặc danh tính thì toàn cục và nhất quán mạnh: account, ví, entitlement, đồ thị bạn bè và bản master của MMR. Ghi hiếm, đọc được cache.

Thứ gì tạm thời và nhạy độ trễ thì chạy theo region: gateway, presence, chat, ticket store, fleet, shard leaderboard.

*[Bước 3]* Trận của Bình nằm trọn trong dải VN; chỉ lệnh mua đi lên tầng global.

Region Việt Nam cần thiết vì 6 tuyến cáp quốc tế gặp khoảng 10 sự cố mỗi năm kể từ 2022. Đây là phán đoán thiết kế, không có nguồn từ một studio cụ thể.

> **→ Slide 27:** Hàng chục service tìm thấy nhau bằng gì, và cái đó có phải điểm chết chung không?

### Slide 27 — Split the control plane by blast radius.

*Nguồn: Roblox, “Return to Service 10/28–10/31, 2021”, 2022 · Ảnh: Roblox (Return to Service postmortem)*

"Control plane" ở đây là service discovery và config: cách các service tìm thấy nhau. Roblox dùng một cluster Consul cho toàn backend (18.000+ server, 170.000 container).

*[Bước 2]* Tranh chấp trên một Go channel khi bật streaming, cộng freelist BoltDB 7,8 MB bị ghi lại mỗi lần append (phụ lục B4), khiến ghi trên leader mất 2–3 giây. Monitoring cũng phụ thuộc Consul nên chẩn đoán chậm. Sau 73 giờ, Roblox mở lại traffic từng nấc khoảng 10% qua DNS.

*[Bước 3–4]* Bài học: registry riêng theo mức quan trọng (critical, game, tools), monitoring trên hạ tầng độc lập, và thiết kế được cold start.

Với dân Go: một channel nóng dưới fan-out lớn cũng là nút cổ chai.

> **→ Slide 28:** Nếu ngày ra mắt vượt mọi phép tính thì sao?

### Slide 28 — Shed features in order; keep login and rewards.

*Nguồn: VGC / PC Gamer (Arrowhead statements); thresholds and order are a proposal · Ảnh: Arrowhead / Sony Interactive*

Helldivers 2 đẩy hệ thống tới khoảng 5 lần mức thiết kế, giới hạn CCU 360 nghìn → 450 nghìn → 700 nghìn trong lúc tối ưu, và CEO nói thẳng vấn đề không giải bằng mua thêm server.

Vì tải thật có thể vượt mọi phép tính, cần một thang tắt tính năng theo ngưỡng tải đã quyết từ trước, triển khai bằng feature flag kiểm ở gateway. Ngưỡng và thứ tự trên slide là đề xuất, không có nguồn từ studio.

Hai thứ giữ đến cuối: login cho người chơi cũ (như Bình) và việc hoàn tất trận, trả thưởng.

Edge case: người chơi treo máy để giữ chỗ làm hàng chờ dài thêm, nên cần chính sách kick người treo máy.

> **→ Slide 29:** Làm sao biết mọi phép tính từ đầu buổi là đúng?

### Slide 29 — Test at 1.5–2× with bots that behave.

*Nguồn: Heroic Labs 2024 (Nakama 2M CCU test); Riot 2020 (hardware forecast within 1%) · Ảnh: Heroic Labs / AWS*

Nakama được test ở 2 triệu CCU bằng Artillery trên Fargate, 20–30 nghìn client ảo mỗi worker, ramp 50 phút, soak 4 giờ, ba kịch bản: ổn định, chat, economy. 2 triệu chính là 2 lần đích của ta.

Bot phải có hành vi như một buổi tối của người chơi (login → party → queue → play → reward → chat), không phải bot chỉ mở socket rồi ngồi im.

Riot load test bằng instance trận thật và dự đoán phần cứng sai dưới 1%. Heroic Labs nhấn mạnh benchmark của họ không gồm code game, nên phải test bằng code của chính mình.

Lưu ý: test 2× không che được 50× của slide 2; đó là lý do cần login queue và thang tắt tính năng.

> **→ Slide 30:** Ráp lại tất cả, cú bấm "Chơi" của Bình đi qua những đâu?

## Phần 6 — Tổng kết (slide 30–31)

### Slide 30 — Binh's click crosses eight components at 1M.

*Nguồn: All loads are estimates at 1M CCU from the slide-4 assumptions*

Đi lại cú bấm "Chơi" của Bình trên kiến trúc cuối:

- Qua login queue.
- Auth đọc hồ sơ trên shard của Bình.
- Gateway giữ socket.
- Session directory và pub/sub đưa trạng thái tới bạn bè.
- Matchmaker ghép trận.
- Allocator chọn server Ready và trả ip:port.
- Bình chơi trận, đi UDP thẳng tới match server.
- Kết quả ghi về shard hồ sơ.

Màu tab dưới mỗi tên là mốc đã thêm thành phần đó: xám ~500, xanh 10K, xanh ngọc 100K, mực 1M. Mỗi con số là tải ước tính ở 1 triệu CCU từ thẻ giả định của slide 4; "(fleet)" là tổng cả fleet.

> **→ Slide 31:** Bài học tổng quát là gì? Khép vòng với bảng mục tiêu.

### Slide 31 — Add a component only when the math breaks.

*Nguồn: Summary of slides 7–29 · Ảnh: Background: 1 dot = 1 player, Binh in orange (drawn for this deck)*

Mỗi mốc làm gãy một loại tài nguyên, và thành phần mới chỉ xuất hiện khi phép tính cho thấy bản cũ gãy: 500 gãy CPU, 10 nghìn gãy chỗ đặt trận, 100 nghìn gãy kết nối, 1 triệu gãy DB và các cơn bão.

Mọi case lớn (Fortnite, Roblox, Helldivers) đều gãy ở tầng platform, không ở game server. Đây là câu nên để khán giả mang về.

*[Bước 5]* Bảng mục tiêu của slide 5 giờ đã điền đủ. Ô chi phí ở mốc 1 triệu để hổ phách vì headroom, đệm Ready và tiền egress là cái giá phải trả cho hai ô kia.

Trên hình nền vẫn là một chấm cam giữa một triệu chấm xám: Bình.

> **→ Phụ lục:** bảng dung lượng đầy đủ và các case chi tiết, dùng khi có câu hỏi.

## Phụ lục B1–B9 (slide 32–40)

### Slide 32 (B1) — Full capacity table

*Nguồn: All values are estimates from the slide-4 assumptions (magenta = assumption); red = where that milestone breaks*

Tất cả là ước tính từ thẻ giả định của slide 4. Cột "Input" magenta nghiêng là giả định; ô đỏ là chỗ mốc đó gãy; cột cuối là slide dùng con số.

Kỹ sư có thể thay giả định của game mình vào và tự tính lại từng hàng.

### Slide 33 (B2) — Three game types, three scaling axes

*Nguồn: Star Citizen shard size: wiki (medium confidence); EVE Time Dilation: CCP · Ảnh: Riot Games; Cloud Imperium Games; Supercell*

Deck này là game session-based: trạng thái nằm gọn trong một trận.

Star Citizen giữ 350 người, sau đó khoảng 800 người trên một shard (nguồn wiki, độ tin trung bình). EVE dùng Time Dilation (làm chậm đồng hồ game) thay vì sập, với khoảng 4.070 người trong một hệ sao. WoW Classic: layering không tăng dung lượng realm.

Game mobile async scale như web backend.

### Slide 34 (B3) — Fortnite: six incidents in one weekend

*Nguồn: Epic Games, “Postmortem of Service Outage at 3.4M CCU”, 2018 · Ảnh: Epic Games*

Cuối tuần 3–4/2/2018: MCP (service hồ sơ và matchmaking) và MongoDB (9 shard), thread pool, Account Service, XMPP, giới hạn của cloud. Mỗi sự cố có một slide sửa tương ứng trong deck.

Giới hạn instance theo region. Subnet /24 chỉ có 251 IP dùng được, nên ELB không mở rộng được khi bão reconnect.

### Slide 35 (B4) — Roblox: a 7.8 MB write for every append

*Nguồn: Roblox, “Return to Service”, 2022*

File BoltDB bên trong Consul nặng 4,2 GB nhưng chỉ chứa 489 MB dữ liệu; freelist 7,8 MB bị ghi lại mỗi lần append, nên ghi trên leader mất 2–3 giây.

p50 ghi KV giảm từ khoảng 2 s xuống 300 ms sau khi tắt streaming. Cache phục vụ khoảng 1 tỉ request/s nên cold start rất khó.

### Slide 36 (B5) — Leaderboards on Redis sorted sets

*Nguồn: Redis sorted sets: ZADD O(log N), ZREVRANGE O(log N + M)*

Mỗi region giữ một ZSET; bảng toàn cục ghép top-K từ các shard bằng K-way merge, chạy định kỳ.

ZADD là O(log N), lấy top M là O(log N + M). Ngưỡng "10 triệu phần tử ≈ 300 MB" có độ tin thấp, đừng trích làm chuẩn.

### Slide 37 (B6) — Idempotent grants + outbox

*Nguồn: Standard transactional outbox pattern; no game-specific primary source*

Trao thưởng và ghi dòng outbox trong cùng một transaction; relay đẩy outbox lên bus; consumer khử trùng theo idempotency key.

Khi relay crash và gửi lại, consumer thấy key trùng và bỏ qua: Bình không nhận thưởng hai lần. Đây là pattern chuẩn, không có nguồn sơ cấp riêng cho game.

### Slide 38 (B7) — 2026: hosting vendors can vanish

*Nguồn: PCWorld 2026 (Hathora); the Multiplay date comes from a competitor — verify*

Hathora ngừng hosting game ngày 5/5/2026.

Thông tin Unity Multiplay đến từ một đối thủ cạnh tranh, cần kiểm lại.

Bài học: giữ build server di động được: cùng một container image chạy trên Agones ở GKE, trên bare metal, hay ở vendor khác.

### Slide 39 (B8) — Discord: one process per guild

*Nguồn: Discord engineering blog (2020) · Ảnh: Discord*

Discord đạt 12 triệu+ CCU và 26 triệu+ sự kiện/s năm 2020. Mỗi guild là một process; một tin nhắn thành N lượt push tới N session.

Guild rất lớn cần thêm tầng relay để chia fan-out. GenStage chịu hơn 1 triệu push mỗi phút.

### Slide 40 (B9) — Pokémon GO: 50× plan

*Nguồn: Google Cloud blog, “Bringing Pokémon GO to life on Google Cloud”, 2016*

Tải thật bằng 50 lần kế hoạch, tức 10 lần kịch bản xấu nhất. Load test 1,5–2× của slide 29 không che được mức này: đó là lý do có login queue và thang tắt tính năng.

Google nâng GKE để thêm hơn 1.000 node và chuyển sang global HTTP/S LB. Nhật ra mắt với tỉ lệ đăng ký gấp 3 lần Mỹ mà vẫn suôn sẻ. Không có số CCU tuyệt đối.
