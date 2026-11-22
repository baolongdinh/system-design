# Slide 16 — Why local files?

> **Ý chính:** Chapter 12 đưa command, event và state về **ngay trên node xử lý**: hai file append-only cục bộ và RocksDB trong cùng tiến trình. Được: bớt các lượt mạng tới **dịch vụ ở xa** trên đường xử lý. Mất: node thành **stateful**, đĩa của nó giữ **bản duy nhất** của dữ liệu, và node thành **single point of failure**. Đó đúng là câu của interviewer trong sách. Lệnh đi theo vẫn là **cả giao dịch** `tx 7f3c` (A→C $1); RocksDB vẫn ghi `A: $1`, `C: $0`. Node giữ **ba loại dữ liệu cục bộ**: command file, event file và RocksDB. Hai file truy cập qua `mmap`: nhanh, nhưng **ghi vào bộ nhớ chưa phải ghi bền**. Cứu cái gì, và cứu bằng cách nào, là việc của slide 17.

**Phần:** Local files · **Footer:** Book: File-based command and event list; File-based state, Fig 20–21, p.529–532 · **Bước:** 3 · Ba loại dữ liệu, `mmap`, page cache và flush nằm trong notebook (mục 4, 5, 7); hình không vẽ chúng.

---

## Hiểu nhanh trước khi nhìn hình

**Chỉ đổi chỗ lưu, không đổi luật.** Command vẫn xếp hàng theo thứ tự. Event vẫn là sự thật bất biến. State vẫn được dựng từ event. Cái thay đổi là **vị trí**: thay vì gửi qua mạng tới Kafka và database, node nối vào file trên đĩa của chính nó, và đọc số dư từ RocksDB nằm trong cùng tiến trình.

**RocksDB** là một thư viện lưu key-value, nhúng trong chương trình, ghi xuống file trên đĩa cục bộ. Nó không phải một database server. Đọc số dư là gọi một hàm, không có lượt mạng nào.

**Một lượt mạng** (network round trip) là gửi yêu cầu sang máy khác rồi chờ trả lời.

**Đừng nói "không còn mạng".** Request vẫn đi vào và kết quả vẫn đi ra qua mạng. Việc sao chép event sang máy khác (slide 17–18) cũng đi qua mạng. Cái bỏ được là các lượt **đi hỏi dịch vụ ở xa** trong lúc xử lý từng lệnh.

**Ta theo cả giao dịch `tx 7f3c`.** Giống slide 11–15: A chuyển C $1 là **một** command. Từ slide này tới slide 19, chỉ có **một** nơi giữ mọi tài khoản: ở slide 16 là một node, từ slide 17 là một nhóm ba máy chạy Raft. Nên một command đọc được số dư của A và ghi được cho cả A lẫn C. Ở slide 18, nó sinh hai event: e43 `A −$1` và e44 `C +$1`. Chia tài khoản ra nhiều nhóm là chuyện của slide 20. Hãy nói câu đó ra, để khán giả khỏi lạc.

**Ba loại dữ liệu trên node, ba vai trò.**
- **Command file** (`commands.log`) giữ ý định, như "A chuyển C một đô". Nó có thể bị từ chối.
- **Event file** (`events.log`) giữ sự thật đã được chấp nhận. Event không bao giờ bị sửa.
- **RocksDB** giữ state: kết quả của việc apply event theo thứ tự. Mất RocksDB thì apply lại event là có lại số dư.

**Bốn từ cần định nghĩa.**
- **Page cache:** phần RAM hệ điều hành dùng để giữ bản sao các trang file vừa đọc hay vừa ghi. Một trang thường là 4 KB. Nó chỉ là bộ đệm, không phải một loại dữ liệu nữa.
- **`mmap`:** một cách mở file để chương trình thấy file như một mảng trong bộ nhớ. `mmap` chỉ nói **cách truy cập**. Nó không nói gì về độ bền.
- **Stateful:** node giữ dữ liệu mà không máy nào khác có. Thay máy khác vào là mất dữ liệu đó.
- **Single point of failure** (điểm hỏng đơn): một thành phần mà hỏng là cả hệ thống ngừng.

## 1. Slide này để làm gì

Mở phần Local files, phần đầu của deep dive về hiệu năng. Slide kéo đòn bẩy "thông lượng mỗi node" của slide 4. Nó cố ý tạo ra một vấn đề mới: node thành stateful, một điểm hỏng đơn. Slide 17 hỏi cái gì phải cứu; slide 18 cứu nó bằng Raft.

## 2. Đọc hình

Hai làn ngang, ngăn bởi một vạch đứt. Cả hai bắt đầu bằng cùng một thẻ command `tx 7f3c · A→C $1` ở mép trái.

**Làn trên, `Before: remote Kafka + remote database`:**
- Hộp `Event-sourcing node` với hai bánh răng `validate` và `apply`.
- Bên phải, vùng nét đứt `other machines`, chứa ô `Kafka` và hình trụ `Database` (`state`).
- Ba cặp mũi tên đi/về: `append + read command` (tới Kafka), `append + read events` (tới Kafka), `read + write balance` (tới Database).

**Làn dưới, `After: local files + RocksDB`:**
- Một hộp `Event-sourcing node` rộng hơn, chứa file `commands.log`, bánh răng `validate`, file `events.log`, bánh răng `apply`, và hình trụ `RocksDB` với `A: $1`, `C: $0`.
- Không có máy nào khác bên cạnh. Đó là chủ ý.

**Theo từng bước:**
1. Mỗi cặp mũi tên ở làn trên nhận một chip đỏ `network round trip`.
2. Làn dưới sáng các mũi tên nội bộ: `commands.log` → `validate`, `local append` (validate → `events.log`), `events.log` → `apply` → RocksDB, và `local read` (RocksDB → validate, nét đứt). Nhãn xanh `data stays next to processing`.
3. Tia sét đỏ rơi lên file **`events.log`**. Bên phải hộp hiện khung đỏ hai dòng: `stateful node: its disk holds the only copy` và `single point of failure`.

**Dải bước dưới hình:** *Today every step crosses the network* · *Local files + RocksDB beside the engine* · *New cost: the node is a single point of failure*.

Hình không vẽ page cache hay chip `mmap`. Ba loại dữ liệu và `mmap` chỉ được nói bằng lời, sau bước 3.

Footer: *Book: File-based command and event list; File-based state, Fig 20–21, p.529–532*.

## 3. Trình bày theo bước

Các bước tự chạy (0,6 giây một bước). Bấm A nếu muốn đi từng bước.

| Bước | Trên màn hình | Nói |
|---|---|---|
| 0 | Hai làn, cùng thẻ `tx 7f3c · A→C $1` | "Nói trước để khỏi lạc: từ slide này tới slide 19, cả hệ thống vẫn là một nơi giữ mọi tài khoản. Chia ra nhiều nhóm là chuyện của slide 20. Ta vẫn theo đúng giao dịch cũ: tx 7f3c, A chuyển C một đô." |
| 1 | Ba chip `network round trip` | "Thiết kế hiện tại. Chỉ một lệnh, node đã phải qua mạng ba lần: ghi và đọc command trên Kafka, ghi và đọc event trên Kafka, đọc và ghi số dư trên database. Mỗi ô đỏ là một lượt đi về qua mạng. State machine xử lý từng lệnh một, nên mỗi lượt chờ cộng thẳng vào thời gian của mọi lệnh phía sau." |
| 2 | `local append`, `local read`, `data stays next to processing` | "Chapter 12 làm ngược lại: đưa command, event và state về ngay trên node xử lý. Ghi là nối vào cuối file cục bộ; ghi tuần tự như vậy rất nhanh, kể cả trên ổ đĩa từ. Đọc số dư là hỏi RocksDB, một kho key-value chạy ngay trong tiến trình. Dữ liệu nằm sát chỗ xử lý." |
| 3 | Tia sét trên `events.log`, khung đỏ bên phải | "Nhưng có cái giá. Trước đây node không giữ gì; chết thì thay máy khác. Giờ dữ liệu nằm trên đĩa của chính node: node trở thành stateful, và đĩa của nó giữ bản duy nhất của event log. Sách gọi đúng tên: single point of failure. Máy này chết là hệ thống ngừng, và lịch sử tiền có thể mất theo." |
| sau 3 | Chỉ ba thứ trong làn dưới: `commands.log`, `events.log`, RocksDB | "Node giữ ba loại dữ liệu cục bộ. Command file: yêu cầu, có thể bị từ chối. Event file: thay đổi đã chấp nhận, chỉ nối thêm. RocksDB: số dư hiện tại. Hai file được truy cập qua `mmap`: ghi vào bộ nhớ, hệ điều hành đẩy xuống đĩa." Nếu được hỏi về page cache, dirty page, flush: mục 5 và 7. |

## 4. Giải thích sâu

- **Tối ưu thứ nhất.** Sách lưu command và event trên đĩa cục bộ thay vì một kho ở xa như Kafka: *"This avoids transit time across the network."*
- **Vì sao ghi append-only nhanh.** Đó là ghi tuần tự. Hệ điều hành tối ưu mạnh cho đọc ghi tuần tự, kể cả với ổ cứng từ. Sách dẫn ACM Queue: *"sequential disk access can be faster than random memory access in some cases."* Nhấn chữ *in some cases*: không phải đĩa nhanh hơn RAM; **cách truy cập** quyết định tốc độ.
- **Tối ưu thứ hai.** Sách giữ command và event mới trong RAM, vì chúng được xử lý ngay sau khi lưu; cache trong RAM thì khỏi phải đọc lại từ đĩa. Cơ chế làm được cả hai việc là `mmap`. Sách nói `mmap` vừa ghi được xuống đĩa vừa giữ nội dung mới trong RAM (p.530–531). Với file chỉ nối thêm, phần đuôi đang được ghi và đọc gần như luôn nằm trong RAM. Đây là câu về **tốc độ**, không phải về độ bền (mục 7).
- **State cục bộ.** Database quan hệ thường chạy trên server riêng, *"can only be accessed through networks"*. Sách chuyển state về đĩa cục bộ bằng SQLite hoặc RocksDB, và chọn RocksDB vì nó dùng LSM tree, tối ưu cho ghi; dữ liệu mới nhất được cache để đọc nhanh.
- **Ba loại dữ liệu là Figure 21 của sách.** Command và event là file cục bộ (Figure 20). State nằm trong RocksDB, một kho key-value dạng file cục bộ. Mỗi loại ghi một kiểu:

  | | `commands.log` | `events.log` | RocksDB |
  |---|---|---|---|
  | Chứa | ý định | sự thật đã chấp nhận | số dư hiện tại |
  | Kiểu ghi | nối vào cuối | nối vào cuối | cập nhật theo khóa |
  | Có thể bị từ chối? | có | không: đã chấp nhận thì phải apply | không áp dụng |
  | Dựng lại từ thứ khác? | không | không: đây là nguồn | có, từ event (và snapshot) |
  | Truy cập | qua `mmap` | qua `mmap` | engine riêng của RocksDB (LSM tree) |

- **Sách đếm bốn loại dữ liệu.** Phần Reliability analysis (p.534–536) kể command, event, state và **snapshot**. Snapshot là một file nhị phân lớn, thường lưu ở object storage như HDFS. Slide 17 vẽ đủ cả bốn và xét từng loại. Chi tiết snapshot ở notebook 14.
- **Cái giá, theo đúng lời interviewer:** *"a server is now stateful and becomes a single point of failure."* Dòng đỏ ở bước 3 là câu này.
- **Một nơi giữ mọi tài khoản.** Từ slide 16 tới 19, hệ thống chỉ có một chỗ xử lý: một node ở đây, một Raft group ba máy từ slide 17 (Figure 24 của sách). Vì vậy `tx 7f3c` vẫn là một command trọn vẹn, như slide 12–15.
- **Cái gì thật sự cần cứu.** Đó là câu hỏi mở của slide này. Slide 17 trả lời bằng phần Reliability analysis của sách; tia sét trên `events.log` là gợi ý trước.

## 5. Câu hỏi có thể gặp

- **"LSM tree là gì?"** **[Ngoài sách: tóm tắt]** Ghi mới vào một bảng trong bộ nhớ. Đầy thì đổ xuống đĩa thành file đã sắp xếp. Ở nền, các file được gộp dần. Ghi nhanh vì luôn tuần tự; đổi lại đọc phải tra nhiều tầng, nên cần cache.
- **"Bỏ Kafka thì các read-only state machine đọc event ở đâu?"** Đọc từ event list ngay trên node. Figure 24 vẽ read side trên mỗi node của nhóm Raft. Sao chép tin cậy là việc của Raft (slide 17–18).
- **"Vậy là bỏ command queue?"** Không. Hàng đợi đổi chỗ: từ Kafka thành `commands.log`. Vai trò đứng giữa phía nhận request và state machine một luồng (slide 12) không đổi.
- **"Thẻ ghi A→C $1. Một node xử lý cả hai tài khoản à?"** Đúng. Từ slide 16 tới 19, một nơi giữ mọi tài khoản, nên một command đọc số dư của A và sinh event cho cả A lẫn C (slide 18). Khi tài khoản bị chia ra nhiều nhóm (slide 20), giao dịch mới phải tách thành hai thao tác.
- **"Single point of failure nghĩa là mất dữ liệu thôi à?"** Hai thứ. Máy chết thì hệ thống **ngừng nhận lệnh**, trái với yêu cầu 99,99% của slide 2. Đĩa chết thì **mất dữ liệu**, và với ví, đó là mất lịch sử tiền.
- **"Sao không sao chép luôn RocksDB cho khôi phục nhanh?"** Slide 17 trả lời: state dựng lại được từ event. Máy nào apply cùng event theo cùng thứ tự cũng ra cùng số dư. Sao chép state là gửi thêm dữ liệu mà không thêm an toàn. Khôi phục nhanh là việc của snapshot, cũng dựng từ event (notebook 14).
- **"Sao không chạy nhiều pod stateless, mỗi pod ghi file của mình?"** **[Ngoài sách]** Khi đó mỗi pod có một event list **khác nhau** cho cùng tài khoản, và không ai biết bản nào đúng. Muốn nhiều máy mà vẫn đúng thì hoặc các bản sao giống hệt nhau (Raft, slide 17–18), hoặc mỗi nhóm máy giữ một tập tài khoản riêng (partition, slide 20).
- **"Đã có event file, giữ command file làm gì?"** Command file là hàng đợi, và là dấu vết của mọi yêu cầu đã đến, kể cả yêu cầu bị từ chối. Nó chốt thứ tự xử lý (slide 12). Nhưng command không đủ để tái tạo event, nên thứ được nhân bản là event (slide 17).
- **"Ghi một event vào vùng `mmap` là đã an toàn chưa?"** **[Ngoài sách]** Chưa chắc. `mmap` cho chương trình ghi thẳng vào trang của file trong page cache. Trang đó thành **dirty**: đã đổi trong RAM nhưng chưa nằm trên đĩa. Trang xuống đĩa theo một trong hai đường. Kernel tự ghi ở nền (*writeback*), nhưng không ai biết chính xác lúc nào xong. Hoặc chương trình gọi `msync`/`fsync` và chờ ổ đĩa xác nhận (*flush*). Câu ngắn để nhớ: **ghi vào bộ nhớ chưa phải ghi bền.**
- **"Ghi xong thì trong RAM có mấy bản của event?"** **[Ngoài sách]** Một. Vùng `mmap` **chính là** các trang page cache của file, chỉ được gắn vào bộ nhớ của chương trình. Không có bước chép từ bộ đệm của chương trình sang page cache. Đó là chỗ khác với `write()`.
- **"Tiến trình crash thì mất event vừa ghi không?"** **[Ngoài sách]** Không: kernel vẫn sống và vẫn ghi trang dirty xuống. Mất điện hoặc kernel sập trước khi flush thì có thể mất. Ổ đĩa hỏng thì mất trên máy này dù đã flush; đó là việc của Raft (slide 17–18). Bảng thời gian ở mục 7.
- **"`msync` khác `fsync` thế nào? Sao không `fsync` sau mỗi event?"** **[Ngoài sách]** `msync` flush một vùng địa chỉ đã ánh xạ. `fsync` flush dữ liệu và metadata của cả file. Flush từng event an toàn nhất, nhưng event nào cũng phải chờ ổ đĩa. Thường người ta gom nhiều event rồi flush một lần (*group commit*), để chia chi phí chờ cho cả lô.
- **"Không dùng `mmap` thì có an toàn hơn không?"** **[Ngoài sách]** Không. `write()` thông thường cũng chỉ ghi vào page cache, nên câu hỏi độ bền giống hệt. `mmap` là cách truy cập, không phải điều kiện để đúng tiền.
- **"RocksDB có dùng `mmap` không?"** Ở đây, `mmap` chỉ dành cho hai file log. RocksDB có engine lưu trữ riêng (LSM tree, cache riêng).
- **"Về sau mỗi node trong Raft group có bộ ba này không?"** Có. Mỗi node giữ event log của riêng nó; Raft giữ các log đó giống hệt nhau (slide 17–18). Sau commit, mỗi node tự apply ra RocksDB của riêng nó (slide 18).

## 6. Đừng nói sai

- Đừng nói "không còn lượt mạng nào". Vẫn còn request vào, kết quả ra, và về sau là sao chép Raft. Chỉ bỏ các lượt tới Kafka và database ở xa.
- Đừng nói "node bây giờ an toàn hơn". Nó nhanh hơn nhưng **mong manh hơn**: stateful, một điểm hỏng đơn.
- Đừng nói "đĩa nhanh hơn RAM". Sách chỉ nói truy cập tuần tự **có trường hợp** nhanh hơn truy cập RAM ngẫu nhiên.
- Đừng nói A đã về $0 hay C đã có $1. Trên hình, RocksDB vẫn ghi `A: $1`, `C: $0`.
- Đừng nói slide này đã có follower hay Raft. Hình chỉ có một node; bản sao là chuyện của slide 17.
- Đừng hứa "sẽ sao chép cả RocksDB". Slide 17 chỉ ra chỉ event cần bảo vệ.
- Đừng gọi `tx 7f3c` ở đây là "nửa trừ" hay "lệnh trừ A". Nó là cả giao dịch A→C $1; tách đôi chỉ xảy ra từ slide 20.
- Đừng nói "RocksDB là nguồn sự thật". Event log mới là nguồn; RocksDB dựng từ nó.
- Đừng gọi page cache là "bản lưu thứ tư" hay "bản sao an toàn". Nó là RAM.
- Đừng nói "`mmap` làm file bền", "`mmap` không bao giờ chạm đĩa" hay "zero-copy persistence". `mmap` làm nhanh. Độ bền đến từ flush theo chính sách và từ Raft.
- Đừng nói "ghi event vào vùng nhớ rồi chép sang page cache". Vùng `mmap` là chính các trang page cache.

## 7. Giải thích chi tiết

**Mỗi lệnh đi qua mạng nhiều lần, và các lần chờ nối đuôi nhau.** Đường đi của `tx 7f3c · A→C $1` ở hai thiết kế:

| # | Việc | Before (Kafka + DB ở xa) | After (file cục bộ + RocksDB) |
|---|---|---|---|
| 1 | Nhận command | qua mạng | qua mạng |
| 2 | Ghi command | gửi tới Kafka, chờ xác nhận | nối vào `commands.log` |
| 3 | Đọc command để xử lý | kéo từ Kafka về | đọc lại vùng nhớ vừa ghi |
| 4 | Đọc số dư A | truy vấn database | gọi RocksDB trong tiến trình |
| — | Validate `$1 ≥ $1` | tại chỗ | tại chỗ |
| 5 | Ghi event e43 `A −$1`, e44 `C +$1` | gửi tới Kafka | nối vào `events.log` |
| 6 | Đọc event để apply | kéo từ Kafka về | đọc lại vùng nhớ |
| 7 | Ghi số dư A và C | gửi tới database | gọi RocksDB |
| 8 | Sao chép e43, e44 | nằm trong cụm Kafka **[Ngoài sách]** | **chưa có**: đây là cái giá ở bước 3; Raft thêm vào ở slide 17–18, **qua mạng** |
| 9 | Báo kết quả | qua mạng | qua mạng |

Before có **sáu** lượt gọi tới dịch vụ ở xa (bước 2 tới 7). After không còn lượt nào như vậy. Slide chỉ vẽ ba cặp mũi tên.

**Vì sao chuyện này quyết định thông lượng.** State machine xử lý **từng lệnh một**. Lệnh sau phụ thuộc số dư lệnh trước để lại, nên nó không bắt đầu khi lệnh trước chưa xong. Thời gian chờ của mỗi lệnh chính là trần thông lượng.
- **[Ngoài sách: con số minh họa]** Một lượt mạng trong datacenter cỡ vài trăm micro giây. Một thao tác bộ nhớ cỡ vài trăm nano giây.
- Nếu mỗi lệnh chờ mạng tổng cộng 1 ms, một state machine tuần tự chỉ làm được 1 giây ÷ 1 ms = 1.000 lệnh mỗi giây, dù CPU gần như ngồi chơi. Đây là phép chia, không phải số đo.
- Đây đúng là đòn bẩy ở slide 4: 1.000 TPS mỗi node cần 2.000 node; 10.000 TPS mỗi node chỉ cần 200 node (Table 1 của sách).

**"Ghi thẳng xuống đĩa" chỉ đúng về đích đến.** Lúc xử lý lệnh, chương trình chủ yếu chạm vào RAM. Dữ liệu xuống đĩa thật ở nền (hệ điều hành ghi trang file xuống, RocksDB flush), hoặc khi chương trình chủ động flush. Lúc nào dữ liệu thật sự an toàn là câu hỏi của phần *`mmap`, page cache và flush* ở cuối mục này.

**Cái giá: node từ "không giữ gì" thành "giữ tất cả".**
- Trước đây node không giữ dữ liệu. Chết thì thay máy khác; dữ liệu nằm ở Kafka và database.
- Giờ command, event và state nằm trên **một ổ đĩa của một máy**. Node là **stateful** và giữ **bản duy nhất** của event log. Đĩa hỏng là mất tiền thật.
- Máy chết thì không ai khác nhận lệnh thay: hệ thống **ngừng**. Đó là nghĩa thứ hai của single point of failure, và nó đụng thẳng vào yêu cầu 99,99% (slide 2).
- Ta đổi tốc độ lấy một **điểm hỏng đơn**. Slide 17–18 trả món nợ, bằng cách gửi event sang máy khác. Lượt mạng đó là **sao chép để an toàn**, không phải đi hỏi một dịch vụ ở xa để làm việc.

**Vì sao tia sét nằm trên `events.log`.** Khung đỏ nói cả ổ đĩa giữ bản duy nhất; tia sét chỉ vào thứ đắt nhất trong đó. Mất RocksDB: số dư mất, nhưng apply lại các event là có lại `A: $1`, `C: $0`. Mất `events.log`: không còn gì để dựng lại số dư. Slide 17 đi lại lập luận này cho đủ bốn loại dữ liệu. Hiểu ngược (cứu state) thì tới slide 17–18, khi Raft chỉ sao chép event, người nghe sẽ thấy hai slide mâu thuẫn.

**Command có thể bị từ chối, event thì không.** Nếu A chỉ có $0 mà lệnh A→C một đô đến, command vẫn nằm trong command file, nhưng không có event nào. Kết quả từ chối vẫn được ghi lại cùng mã giao dịch (slide 18, notebook 18) **[Ngoài sách]**. Ngược lại, một event đã commit thì **mọi** node phải apply nó. Không node nào được xét lại.

**State là sản phẩm phụ.** Có hai hệ quả:
1. Mất RocksDB không mất tiền. Nạp snapshot gần nhất, apply lại các event sau nó, là có lại số dư (notebook 14).
2. RocksDB luôn **đi sau** event log. Không bao giờ có số dư nào trong RocksDB mà log không giải thích được.

**`mmap`, page cache và flush [Ngoài sách: kiến thức hệ điều hành].** Page cache giữ các trang file đang nóng: đuôi `commands.log`, đuôi `events.log`. Nhờ nó, đọc lại command hay event vừa ghi gần như miễn phí. Nhưng vì nó là RAM, phải hỏi tiếp: dữ liệu mới nằm trong RAM thì đã an toàn chưa? Đi theo e43 và e44, hai event mà slide 18 sẽ tạo:

```
trước khi ghi    e41, e42 nằm ở page 7; trang này clean (khớp với đĩa)
ghi e43, e44     cả hai rơi vào page 8; page 8 thành dirty, chỉ có trong RAM
tiến trình chết  kernel vẫn ghi page 8 xuống: e43, e44 còn
mất điện         trước khi flush: page 8 mất, e43, e44 có thể mất
msync/fsync      trả về: page 8 đã nằm trên đĩa của máy này
ổ đĩa hỏng       e43, e44 mất trên máy này: cần bản ở máy khác (Raft)
```

Trang **clean** là trang khớp với đĩa. Trang **dirty** là trang đã đổi trong RAM mà chưa ghi xuống. Số trang chỉ là ví dụ để kể.

**Chính sách độ bền là một lựa chọn [Ngoài sách].**

| Chính sách | Lúc nào e43 chắc chắn nằm trên đĩa | Cái giá |
|---|---|---|
| Không flush chủ động | không bao giờ chắc chắn | nhanh nhất; mất điện có thể mất cả loạt event |
| Flush từng event | ngay sau lần flush của nó | an toàn nhất; event nào cũng chờ ổ đĩa |
| Group commit | sau lần flush của cả lô | chia chi phí chờ; mỗi event chờ thêm tới lúc lô flush |

Điều này nối sang slide 18. Khi một máy xác nhận "đã lưu e43, e44", xác nhận đó chỉ chống được mất điện nếu nó đi **sau** lần flush theo chính sách, kể cả bản của chính leader. Ba bản chỉ nằm trong RAM của ba máy chung một nguồn điện thì không chống được mất điện toàn cụm.

**Hai chữ dễ lẫn [Ngoài sách].** *Unflushed* là chuyện của **đĩa**: trang chứa e43 chưa xuống đĩa. *Uncommitted* (slide 18) là chuyện của **Raft**: chưa đủ đa số máy lưu e43. Ngay sau khi ghi, e43 ở cả hai trạng thái. Flush xong chưa có nghĩa là commit, và commit chưa chắc là đã flush, nếu chính sách cho phép xác nhận sớm.

## 8. Dẫn dắt sang slide 17

- **Điều slide này để lại:** node nhanh hơn nhưng thành stateful, một điểm hỏng đơn. Nó giữ ba loại dữ liệu cục bộ, và sách còn kể thêm snapshot. Chưa rõ loại nào thật sự phải sống sót.
- **Câu nối gợi ý:** "Câu tiếp theo của interviewer: node giờ là single point of failure, làm sao cho hệ thống đáng tin? Trước khi trả lời, phải biết thứ gì bắt buộc phải sống sót."
- **Người nghe sẽ thấy ở slide 17:** headline `What must survive a crash?`. Khung `Event-sourcing node` với bốn thẻ: `commands.log` (`requests`), `events.log` (`changes`), RocksDB `A: $1` (`state`) và `snapshot` `@ e40`. Ở bước 1, tia sét và chip đỏ `disk lost` rơi lên node; bên phải hiện hai dòng `code → run it again on another node ✓` và `data → gone with the disk ✕`. Ba bước, tự chạy.
