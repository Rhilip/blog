---
title: 蒲公英（NPUBits）站点 Banner分析
date: 2018-07-15 05:34:00
categories: python
tags: [Python,data-analysis,echart,npubits,sqlite3]
permalink: /archives/951/
---

无所事事的时候看到这站内的这个帖子，正好最近在~~做~~（学习）数据分析的工作，同时我对主帖子中的一些问题表示关注，所以顺带水一片博文进行分析。

![TIM截图20180711200228.jpg](/images/2018/07/3483496870.jpg)

首先对从那些地方能获取到数据要进行分析：用户在论坛发帖提交Banner会留下记录，管理员使用Banner更换系统进行自动更换时会在“普通”日志中留下记录，已经展示过的Banner有集中展示页面。

>  所有数据基于**站内公开数据**，数据最后更新~~(爬取)~~于`2018/07/11 17:00`，未统计早期（2015年1月至11月）Banner信息

> **本文仅限NPUBits内部论坛以及本人博客（ https://blog.rhilip.info ）发布，禁止转载。**

<!--more-->

## 近一年Banner更新间隔

这一节主要分析log页面。系统在日志页留下的记录一般如下：

![banner_change_log.jpg](/images/2018/07/2907071100.jpg)

> 2018-07-06 00:00:01	Site BANNER was auto changed to [神啊，请赐予败犬幸福！](https://npupt.com/forums.php?action=viewtopic&forumid=28&topicid=5439) on schedule. July 6, 2018, 12:00 am

记录中会留下实际更换时间，更换的Banner关联的主题以及计划更换时间。因为实际更换时间与计划基本一致，且换算到小时为单位时误差可以忽略，所以简单的抓取实际更换时间即可，下面为示例代码：

```python
import arrow
import requests

from bs4 import BeautifulSoup
from collections import Counter

# 抓取并分析log.php页面中关于`Site BANNER was auto changed to`相关内容，分析近一年banner更新时间
time_td = []
for p in range(0,5):
    page = requests.get("https://npupt.com/log.php?action=dailylog&search=all&query=Site%20BANNER%20was%20auto%20changed%20to&page={}".format(p),cookies=cookies)  # 携带cookies请求
    bs = BeautifulSoup(page.text,"lxml")
    time_td += list(map(lambda x:x.get_text(strip=True),bs.select("table#table1 > tr > td[align='center']")[1:]))

a = time_td
b = a[1:] + [a[-1]] # 错项以便于相减
"""
a                           b
'2018-07-11 14:00:01',     '2018-07-07 00:00:01',
'2018-07-07 00:00:01',     '2018-07-06 00:00:01',
'2018-07-06 00:00:01',     '2018-07-04 00:00:02',
.....                      .....
'2017-07-12 18:00:01',     '2017-07-11 18:00:05',
'2017-07-11 18:00:05',     '2017-07-10 18:00:01',
'2017-07-10 18:00:01'      '2017-07-10 18:00:01',
"""

detla_second = list(map(lambda x:(arrow.get(x[0]) - arrow.get(x[1])).total_seconds(),zip(a,b)))
detla_hour = list(map(lambda x:int(x/3600),detla_second))
Counter(detla_hour)
```

统计结果如下

| 小时 | 计数 | 小时 | 计数 | 小时 | 计数 | 小时 | 计数 |
|-----:|-----:|-----:|-----:|-----:|-----:|-----:|-----:|
| 0 | 10 | 24 | 49 | 48 | 16 | 72 | 3 |
| 1 | 4 | 25 | 4 | 49 | 1 | 76 | 1 |
| 2 | 1 | 26 | 4 | 50 | 0 | 79 | 1 |
| 3 | 2 | 27 | 1 | 51 | 1 | 88 | 2 |
| 4 | 3 | 28 | 0 | 52 | 0 | 90 | 1 |
| 5 | 0 | 29 | 3 | 53 | 0 | 94 | 1 |
| 6 | 1 | 30 | 1 | 54 | 0 | 96 | 1 |
| 7 | 1 | 31 | 4 | 55 | 2 | 110 | 1 |
| 8 | 4 | 32 | 2 | 56 | 3 | 111 | 1 |
| 9 | 2 | 33 | 1 | 57 | 2 | 113 | 1 |
| 10 | 2 | 34 | 0 | 58 | 0 | 153 | 1 |
| 11 | 3 | 35 | 5 | 59 | 0 | 156 | 1 |
| 12 | 8 | 36 | 5 | 60 | 1 | 157 | 1 |
| 13 | 2 | 37 | 1 | 61 | 1 | 204 | 1 |
| 14 | 4 | 38 | 2 | 62 | 0 | 206 | 1 |
| 15 | 6 | 39 | 1 | 63 | 2 | 240 | 1 |
| 16 | 4 | 40 | 1 | 64 | 0 |
| 17 | 1 | 41 | 0 | 65 | 0 |
| 18 | 2 | 42 | 0 | 66 | 0 |
| 19 | 1 | 43 | 1 | 67 | 2 |
| 20 | 0 | 44 | 1 | 68 | 2 |
| 21 | 3 | 45 | 1 | 69 | 0 |
| 22 | 1 | 46 | 4 | 70 | 0 |
| 23 | 27 | 47 | 12 | 71 | 3 |

通过统计，在这一年中（NexusPHP的日志只保留最近一年的相关历史）共使用了250次Banner（**可能存在重复情况，此处暂不做考虑**），这些Banner最短停留时间为`4s`（2017/11/7  8:00:07 - 2017/11/7  8:00:11），排除掉这个极端数据的话，停留时间最短一般为`5分钟`，停留时间最长的一次 Banner则有10天（2017/7/27  8:00:03 - 2017/8/6  8:00:09）。此外，一次 Banner 平均停留时间为  `35.69小时`（约128487s）。而从更换时间上看，多数情况下是在0点，8点，18点进行自动更换的。

![banner_sur_4s.jpg](/images/2018/07/3816779648.jpg)

这样看来，多数投稿的Banner其实并不能展示**两天**（滑稽。超过1/3的投稿作品只能在首页停留1天，当然也同样存在1/3的投稿作品能活过1天的时间线一直生存到第二天。。

![NPU近1年Banner使用时间.jpg](/images/2018/07/3731651496.jpg)

## Banner 历史

这一节主要分析bannerthank页面。这个页面是用来展示站内已经使用的Banner信息，页面结构如下：

![page_bannerthank.jpg](/images/2018/07/623965254.jpg)

通过对页面的分析，可以从中获取很多信息。我将这些信息分成4种类型：

- Banner相关： 递增id、替换时间、关联链接、获得“赞”数量、获得“沙砾”数量
- 发布者相关： 用户id、用户名称、用户等级
- 图片信息：图片链接、图片上传时间、图片标识符（md5）、~~图片类型（后续人工分类）~~

同样写一个简单爬虫，并使用sqlite3数据库对相关数据进行存储，并下载对应Banner进行后续分析。

代码示例如下：

```python
import os
import sqlite3

# 建立工作目录
path = r"f:/npu_banner_ana"
if not os.path.isdir(path):
    os.mkdir(path)

# 建立相关数据库
db_file = os.path.join(path,"banner.db")
db_conn = sqlite3.connect(db_file)
db_c = db_conn.cursor()
db_c.execute("CREATE TABLE banner ( " +
    "b_id          INT  UNIQUE, " +  # banner_id
    "b_date       DATE, " +         # banner替换时间
    "b_link       TEXT, " +         # banner相关论坛帖链接
    "up_id        INT, " +          # 上传者id
    "up_name      TEXT, " +         # 上传者名称（爬取时）
    "up_level     TEXT, " +         # 上传者等级（爬取时）
    "img_link     TEXT, " +         # 图片链接
    "img_hash     TEXT, " +         # 图片标识符
    "img_update   DATETIME,"  +     # 图片上传时间
    "img_type     TEXT, " +         # 图片种类（筛分图片类型用）
    "thanks_count INT, " +          # 收到“赞"个数
    "thanks_bonus INT " +           # 收到“沙砾"个数
");")
db_conn.commit()

# 抓取并分析bannerthank.php页面
for p in range (0,29):
    page = requests.get("https://npupt.com/bannerthanks.php?page={}".format(p),cookies=cookies)
    bs = BeautifulSoup(page.text, "lxml")
    tr_list = bs.select("div#main > table > tr")[1:]
    for tr in tr_list:
        tr_text = tr.get_text(" ",strip=True)   # 胖虎 2018-07-11 收到11个赞 共计560个沙粒
        tr_text_re = re.search("^(.+?) (\d{4}-\d{2}-\d{2}) 收到(\d+)个赞 共计(\d+)个沙粒", tr_text)
        user_another = tr.find("a",href=re.compile("^userdetails\.php\?id="),class_="username")
        img_another = tr.find("img",style="width:1000px")
        form_another = img_another.parent
        img_link_re = re.search("(\d{14})(.{32})\.",img_another["src"])
    
        b_id = tr.find("a",class_="bannerthanksdetail")["data-id"]
        b_date = tr_text_re.group(2)
        b_link = "https://npupt.com/" + form_another["href"]

        up_id = re.search("id=(\d+)", user_another["href"]).group(1)
        up_name = tr_text_re.group(1)
        up_level = user_another["class"][0][:-5]

        img_link = "https://npupt.com/" + img_another["src"]  # 'attachments/201806/20180605133206938f6d7c98bc83da8a29235771e34c64.jpg'
        img_hash = img_link_re.group(2)
        img_upload = re.sub("(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})",r"\1-\2-\3 \4:\5:\6",img_link_re.group(1))
        img_type = ""  # 图片类型不能由此处判断，留空
        
        thanks_count = tr_text_re.group(3)
        thanks_bonus = tr_text_re.group(4)

        t = (b_id,b_date,b_link,up_id,up_name,up_level,img_link,img_hash,img_upload,img_type,thanks_count,thanks_bonus)
        db_c.execute('INSERT INTO banner VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',t)
    db_conn.commit()
    print("Page {} success, with {} records".format(p,len(tr_list)))

# !!!! 因为前面抓取的脚本较为粗糙，需要对数据库中相关数据进行一些简单处理，这里不再唠述。

record = db_c.execute("SELECT * from banner").fetchall()  # 获得所有记录

# 下载图片 
img_dir = os.path.join(path,"banner")
os.mkdir(img_dir)
for link in set(map(lambda x:x[6],record)):
    r = requests.get(link)
    file_name = link.split("/")[-1]
    with open(os.path.join(img_dir,file_name), "wb") as f:
        f.write(r.content)
    print("Download {} Success~".format(link))
```

### 记录条数

根据前面爬虫数据可知，目前站内共使用了579次Banner悬挂，但部分记录已经被删除，实际共爬取下573条记录。根据文件hash值（md5值）判断，共有550个不重复的Banner文件。而根据文件来判断，则一共下载共572个Banner文件。

```python
# 记录示例
"""
(579,
 '2018-07-11',
 'https://npupt.com/forums.php?action=viewtopic&forumid=28&topicid=5744',
 30664,
 '胖虎',
 'VIP',
 'https://npupt.com/attachments/201806/20180605133206938f6d7c98bc83da8a29235771e34c64.jpg',
 '938f6d7c98bc83da8a29235771e34c64',
 '2018-06-05 13:32:06',
 '',
 12,
 570)
"""

# 初步结论
len(record)                           # 573， banner记录条数
len(set(map(lambda x:x[6],record)))   # 572， 共572个具体文件 （通过图片文件名判断）
len(set(map(lambda x:x[7],record)))   # 550， 不重复的banner记录条数（通过图片hash值判断）
```

### 更换频次

对 `b_date` 字段进行简单分析，首先以一个月为单位进行处理获取banner更新频率，示例SQL如下：

```sql
Select strftime('%Y-%m',b_date) as date_ym, count(*) from banner group by date_ym
```

| 2015 | 更换次数 | 2016 | 更换次数 | 2017 | 更换次数 | 2018 | 更换次数 |
|:------------:|---------------:|:------------:|---------------:|:------------:|---------------:|:------------:|---------------:|
|  |  | 2016-01 | 13 | 2017-01 | 12 | 2018-01 | 24 |
|  |  | 2016-02 | 10 | 2017-02 | 3 | 2018-02 | 23 |
|  |  | 2016-03 | 15 | 2017-03 | 14 | 2018-03 | 22 |
|  |  | 2016-04 | 18 | 2017-04 | 25 | 2018-04 | 15 |
|  |  | 2016-05 | 21 | 2017-05 | 22 | 2018-05 | 25 |
|  |  | 2016-06 | 13 | 2017-06 | 31 | 2018-06 | 19 |
|  |  | 2016-07 | 8 | 2017-07 | 10 | 2018-07 | 5 |
|  |  | 2016-08 | 13 | 2017-08 | 8 |  |  |
|  |  | 2016-09 | 9 | 2017-09 | 17 |  |  |
| 2015-10 | 1 | 2016-10 | 21 | 2017-10 | 19 |  |  |
| 2015-11 | 14 | 2016-11 | 12 | 2017-11 | 18 |  |  |
| 2015-12 | 40 | 2016-12 | 28 | 2017-12 | 25 |  |  |
| 年均 | 18 | 年均 | 15 | 年均 | 17 | 年均 | 10 |

从年均数据上看，每月平均更换Banner数量均在 16 以上（2018年7月因只过了半个月冲稀了数量）。此外，寒暑假对更换的影响仍然存在，但这一现象在18年寒假表现得并不是很明显（因为春节系列Banner更换）。

![Banner月度更换次数.png](/images/2018/07/2515987995.png)

### 投稿用户等级分布

对用户信息进行分析

```sql
Select up_id,up_name,up_level,count(*) from banner group by up_id;
Select up_level,count(*) from banner group by up_level;
Select up_name,count(*) as c from banner group by up_name order by c desc;
```

总共有115位用户为站点贡献了所有的Banner。这其中，按照用户现在的等级来进行分类的话，普通用户投稿的比例其实并没有想象中的那么多，只占据了一半不到。站内多数作品仍然是美工组（多数为Retiree或者VIP级别）投稿使用或复用。

![不同级别用户投稿数.png](/images/2018/07/3523941291.png)

而从单个用户被采纳的Banner数量来看（此表只列出采纳数大于5的用户数量）。`桐壶`以及`胖虎`两位dalao为站内贡献了绝大多数的Banner。多数人投稿的Banner仅被采纳了1次（或仅进行了一次投稿）。采纳Banner数量大于5的用户仅有30位，列表如下。

| 用户名 | 采纳数 | 用户名 | 采纳数 | 用户名 | 采纳数 |
|:------------:|-------:|:-----------:|-------:|:----------------:|-------:|
| 桐壶 | 112 | Gulnaz | 11 | Edge | 5 |
| 胖虎 | 64 | zbx123 | 9 | Fade | 5 |
| 黄昏的尘土 | 20 | 扑克脸8888 | 9 | Gaussian | 5 |
| Miss老杨 | 18 | Jooooo啊 | 8 | Holiday0 | 5 |
| 云端的林公子 | 18 | Mask小丑 | 8 | IamNobody | 5 |
| 咴咴君 | 17 | 卯月 | 8 | QSQS | 5 |
| lovelive | 16 | 徐某 | 8 | Twinkle | 5 |
| pokerpoke | 13 | Tres | 7 | dongwanqing | 5 |
| Wangxiaozzz | 12 | 404 | 5 | 发种姬是Loli控 | 5 |
| Grimace.RS | 11 | 404Notfound | 5 | 吃葡萄不吐橘子皮 | 5 |

![Banner采纳数量.png](/images/2018/07/95466333.png)

### 图片基本信息

使用python的PIL库读取图片文件的宽高信息。代码示例如下：

```python
from PIL import Image

img_type_list = []
img_size_list = []

for f in os.listdir(img_dir):
    file_path = os.path.join(img_dir,f)
    file_type = file_path.lower().split(".")[-1]  # png or jpg
    img = Image.open(file_path)
    img_height, img_width = img.size
    img_size = "{}x{}".format(*img.size)

    img_type_list.append(file_type)
    img_size_list.append(img_size)

Counter(img_type_list)
Counter(img_size_list)
```

通过统计，常用的图片上传格式为jpg （计数 543，占比 94.7 % ）以及png（计数 29，占比 5.06 % ），而常见尺寸为 `1280x230` 以及 `1400x312` 。（Ps. 我还用过 `1400x320` 的分辨率），详细统计数据见下图

![Banner图片尺寸 (px).png](/images/2018/07/2331986424.png)

### 用户奖励情况

通过提取数据库信息获取用户对Banner的奖励情况

```sql
Select thanks_count,thanks_bonus,thanks_bonus/thanks_count as thank_avg from banner
```

经过整理得到下列信息，通过Banner点赞系统，用户共点击了51743次赞，共送出了588w沙砾，平均下来每个Banner都能获得1w左右的沙砾。而目前获得沙砾最多的是来自@[**GJP**](https://npupt.com/userdetails.php?id=45119) 制作的纪念性Banner （[链接](https://npupt.com/forums.php?action=viewtopic&topicid=1830&page=last#pid47046)），此外第二名也是一个纪念陈士橹院士的Banner。

|  | total | avg. | min | max |
|:-----------:|--------:|---------:|----:|------:|
| thanks_count | 51743 | 90.30192 | 2 | 880 |
| thanks_bonus | 5880263 | 10262.24 | 0 | 97950 |
| thank_avg | 60733 | 105.9913 | 0 | 1670 |

考虑到用户可以通过接口获取具体的点赞数量，但这部分数据并不好进行解析（目录树不清晰，用户名以及可能存在的奖励信息在同一子树下），DOM结构分别如下

```html
<span class="nowrap"><a class="User_Name username" data-userid="46398" href="userdetails.php?id=46398"><b>zbw</b></a></span>  <!-- 用户纯点赞 -->
<span class="nowrap"><a class="InsaneUser_Name username" data-userid="36708" href="userdetails.php?id=36708"><b>Undertaker</b></a></span><span class="label label-success label-sm">10</span>  <!-- 用户点赞并赠送沙砾 -->
```

所以对这块的清洗需要进行一些取巧的操作，以获取 `id=579` 为例

```python
thank_details_page = requests.get("https://npupt.com/bannerthanks.php?action=detail&id=579",cookies=cookies)
thank_details_bs = BeautifulSoup(details_page.text,"lxml")
print(thank_details_bs.get_text(" ",strip=True))
""" # 无法从中提取结构化数据
zbw ywsun longbricks 10 catmint copying xiaoguai 克烈尔辣舞赛文 zxt Chubby triple 50 fanwei92 500 Undertaker 10 Tsar 10 Alex007 100 wjy1999 729398205 噬魂 200 啄木鸟的树 1120140351 KlausQ 薛溯 10 国大 yfh xiaoerhei ashingmj1975 zwq961008 星影朗歌 惨绿青年 274883269wjy CrazyDog Lemonation Travise 臣妾很忙O_o yourtears Hiang YMRhaha 10 neversayn3 redeemerp HDBenben
"""

for tag in thank_details_bs.find_all("a",class_="username"):  # 处理
    tag.string = "{}_Name".format(tag.get_text(strip=True))
print(thank_details_bs.get_text(" ",strip=True))
"""
zbw_Name ywsun_Name longbricks_Name 10 catmint_Name copying_Name xiaoguai_Name 克烈尔辣舞赛文_Name zxt_Name Chubby_Name triple_Name 50 fanwei92_Name 500 Undertaker_Name 10 Tsar_Name 10 Alex007_Name 100 wjy1999_Name 729398205_Name 噬魂_Name 200 啄木鸟的树_Name 1120140351_Name KlausQ_Name 薛溯_Name 10 国大_Name yfh_Name xiaoerhei_Name ashingmj1975_Name zwq961008_Name 星影朗歌_Name 惨绿青年_Name 274883269wjy_Name CrazyDog_Name Lemonation_Name Travise_Name 臣妾很忙O_o_Name yourtears_Name Hiang_Name YMRhaha_Name 10 neversayn3_Name redeemerp_Name HDBenben_Name
"""

# 使用re库进行正则提取并整理
t_gp = re.findall("(.+?)_Name (?:(\d+) )?",thank_details_bs.get_text(" ",strip=True))
t_gp_format = list(map(lambda x:(x[0], (int(x[1]) if len(x[1]) > 0 else 0)), t_gp))
print(t_gp_format)
"""
[('zbw', 0),
 ('ywsun', 0),
 ('longbricks', 10),
 ('catmint', 0),
 ('copying', 0),
 ('xiaoguai', 0),
 ('克烈尔辣舞赛文', 0),
 ('zxt', 0),
 ('Chubby', 0),
 ('triple', 50),
 ('fanwei92', 500),
 ('Undertaker', 10),
 ('Tsar', 10),
 ('Alex007', 100),
 ('wjy1999', 0),
 ('729398205', 0),
 ('噬魂', 200),
 ('啄木鸟的树', 0),
 ('1120140351', 0),
 ('KlausQ', 0),
 ('薛溯', 10),
 ('国大', 0),
 ('yfh', 0),
 ('xiaoerhei', 0),
 ('ashingmj1975', 0),
 ('zwq961008', 0),
 ('星影朗歌', 0),
 ('惨绿青年', 0),
 ('274883269wjy', 0),
 ('CrazyDog', 0),
 ('Lemonation', 0),
 ('Travise', 0),
 ('臣妾很忙O_o', 0),
 ('yourtears', 0),
 ('Hiang', 0),
 ('YMRhaha', 10),
 ('neversayn3', 0),
 ('redeemerp', 0)]
"""
```

批量爬取的整段方法如下

```python
db_c.execute("CREATE TABLE thank ( " +
    "b_id          INT, " +         # banner_id
    "thanks_user  TEXT, " +         # 点赞人名称
    "thanks_bonus INT " +           # 点赞沙砾数量
");")
db_conn.commit()

bid_raw_list = db_c.execute("Select b_id from banner").fetchall()
bid_list = [x[0] for x in bid_raw_list]  # 获取所有存在的Banner_id

for bid in bid_list:
    thank_details_page = requests.get("https://npupt.com/bannerthanks.php?action=detail&id={}".format(bid), cookies=cookies)
    thank_details_bs = BeautifulSoup(thank_details_page.text,"lxml")
    for tag in thank_details_bs.find_all("a",class_="username"):  # 清洗
        tag.string = "{}_Name".format(tag.get_text(strip=True))
    t_gp = re.findall("(.+?)_Name (?:(\d+) )?",thank_details_bs.get_text(" ",strip=True))
    t_gp_format = list(map(lambda x:(bid, x[0], (int(x[1]) if len(x[1]) > 0 else 0)), t_gp))
    db_c.executemany("INSERT INTO thank VALUES (?,?,?)", t_gp_format)
    db_conn.commit()
```

爬取完成后的数据存入数据表`thank`。并使用以下SQL语句进行提取分析绘图

```sql
Select thanks_user,sum(thanks_bonus) as total_bonus,count(*) as total_thanks from thank group by thanks_user;
```

![Banner排行榜.jpg](/images/2018/07/165670853.jpg)

默存大是土豪！默存大是土豪！默存大是土豪！共计 147次点赞共送出了 653,010沙砾，平均每次送出 4442沙砾。远远甩开其他管理组成员打赏总额。

```sql
Select thanks_bonus,count(*) from thank where thanks_user="默存" group by thanks_bonus;
```

![默存大大点赞分布.png](/images/2018/07/1828884248.png)

### Banner类别

因为这块在Banner相关的任何位置均无法准确定位类别，所以我人工将其划分为以下各类：`电影（含动漫电影）、动漫、剧集、游戏、体育、节日（含西元节日、法定节假日、传统节日、二十四节气等）、站内活动、时事（含人物纪念）、校园活动、其他（纯标语或难以归于以上各类）`，统计并更新数据库，如果有分类不准确的情况还请谅解。

~~（我已经对这种机械性分类劳动表示厌烦了~~

![Banner采用数量_按类别.png](/images/2018/07/3413243793.png)

经过分类统计显示，动漫类Banner实际上并不算很多，站内很大一部分Banner更换计划实际是被节日类占用，而将投稿类别与悬挂时间相联系起来的话，其实平均悬挂时间均差不多，站务组并没有特别偏向某一题材作品，而是按照真实的投稿比例进行展示。 

![Banner悬挂总时长_按类别.png](/images/2018/07/161502616.png)

![Banner悬挂时长与采用数关系.png](/images/2018/07/703938173.png)

> 统计时悬挂时长不足一天的计数为0天，悬挂1-2天的计数为1天，以此推论。

## 投稿信息

这一节主要分析论坛美工作品区，爬虫抓取投稿时间以及热度（回复/查看）并使用数据库存储，代码示意如下：

```python
db_c.execute("CREATE TABLE topic (" +
    "f_id     INT  UNIQUE" +         # 主题递增编号
    "              PRIMARY KEY," +
    "f_title  TEXT," +               # 主题名
    "f_date   DATE," +               # 发布时间
    "f_link   TEXT," +               # 链接
    "f_poster TEXT," +               # 发布者
    "f_reply  INT," +                # 回复
    "f_see    INT" +                 # 查看
");"
)
db_conn.commit()

for p in range(0,27):
    page = requests.get("https://npupt.com/forums.php?action=viewforum&forumid=28&page={}".format(p),cookies=cookies)
    bs = BeautifulSoup(page.text,"lxml")
    tr_list = bs.select("table#forumtable7 > tr")
    for tr in tr_list:
        title_another = tr.find("a",href=re.compile("\?action=view.+topicid=\d+"))
        if title_another:
            f_link = "https://npupt.com/forums.php" + title_another["href"]
            f_id = re.search("topicid=(\d+)",f_link).group(1)
            f_title = title_another.get_text(strip=True)
            tr_pat = re.search(" ([^ ]+?) (\d{4}-\d{2}-\d{2}) ([,\d]+)/([,\d]+)",tr.get_text(" ",strip=True))
            f_poster = tr_pat.group(1)
            f_date = tr_pat.group(2)
            f_reply = tr_pat.group(3).replace(",","")
            f_see = tr_pat.group(4).replace(",","")
            tu = (f_id,f_title,f_date,f_link,f_poster,f_reply,f_see)
            db_c.execute("INSERT INTO topic VALUES (?,?,?,?,?,?,?)",tu)
    db_conn.commit()
    
# 对数据库进行简单整理
```

以同样的方法获取Banner提交频次（此处一并统计较少的非Banner主题帖发布情况，后同）

```sql
Select strftime('%Y-%m',f_date) as date_ym, count(*) from topic group by date_ym
```

![美工作品区月发帖数目.png](/images/2018/07/194201936.png)

通过统计可得，2016年平均月投稿12.58贴，2017年为16.08贴，而2018年至今为19.14贴（7月按12贴计算）。而综合下来平均月投稿数量为15.06贴，用户投稿（贴）数量确实是在逐渐增加。但通过前面与更换频次的结果对比，特别是考虑站内部分固定更换的Banner情况存在，其实很难保证用户投稿的所有Banner均能够进行有效的展示。

而从主题回复以及查看的情况来看，除E姐的石头门以及re0的特效Banner之外，其他主题贴内容基本不与动漫相关。~~（可见死宅们果然是每隔几个月就换老婆的）~~

> 主题贴回复排行榜（前10名）

| 帖子id | 发布时间 | 名称 | 发布者 | 回复数 | 查看数 |
|-------:|------------|-----------------------------------------------------------------------------------------------------------------------------------------|-------------|-------:|-------:|
| 1983 | 2015/12/4 | [【终于填了坑但还是没重新做】Steins;Gate -   大家好我是来考古的](https://npupt.com/forums.php?action=viewtopic&forumid=28&topicid=1983) | 卯月 | 62 | 3596 |
| 1990 | 2015/12/5 | [第一次做banner，被夸的话……会害羞的！](https://npupt.com/forums.php?action=viewtopic&forumid=28&topicid=1990) | 咴咴君 | 51 | 1530 |
| 3236 | 2016/12/4 | [Five years   later...](https://npupt.com/forums.php?action=viewtopic&forumid=28&topicid=3236) | 一色彩羽 | 46 | 2628 |
| 3200 | 2016/12/2 | [Re :   Start](https://npupt.com/forums.php?action=viewtopic&forumid=28&topicid=3200) | 卯月 | 46 | 4400 |
| 3354 | 2016/12/26 | [二十四节气第二波](https://npupt.com/forums.php?action=viewtopic&forumid=28&topicid=3354) | 桐壶 | 45 | 29613 |
| 2480 | 2016/5/13 | [（第二次投稿，完了停不下来了）山寨一大波游戏](https://npupt.com/forums.php?action=viewtopic&forumid=28&topicid=2480) | Wangxiaozzz | 45 | 3950 |
| 5665 | 2018/5/21 | [RNG夺得MSI冠军！！！！RNG牛逼！！！UZI牛逼！！！！！！！](https://npupt.com/forums.php?action=viewtopic&forumid=28&topicid=5665) | Twinkle | 42 | 2264 |
| 4098 | 2017/7/2 | [做了个黑暗剑的banner，传播一下秦流感](https://npupt.com/forums.php?action=viewtopic&forumid=28&topicid=4098) | 布鲁斯韦天 | 40 | 2435 |
| 2505 | 2016/5/19 | [做点特别的东西纪念这段６６６天的异地恋](https://npupt.com/forums.php?action=viewtopic&forumid=28&topicid=2505) | WIRY95 | 40 | 1672 |
| 3819 | 2017/5/17 | [权力的游戏第七季_2017.07.16北美开播_预告一下~](https://npupt.com/forums.php?action=viewtopic&forumid=28&topicid=3819) | 桐壶 | 38 | 7283 |

> 主题贴查看排行榜（前10名）

| 帖子id | 发布时间 | 名称 | 发布者 | 回复数 | 查看数 |
|--------|------------|---------------------------------------------------------------------------------------------------------------------------|------------|-------:|-------:|
| 1830 | 2015/11/9 | [Banner自由投稿说明](https://npupt.com/forums.php?action=viewtopic&forumid=28&topicid=1830) | XE | 34 | 46410 |
| 3354 | 2016/12/26 | [二十四节气第二波](https://npupt.com/forums.php?action=viewtopic&forumid=28&topicid=3354) | 桐壶 | 45 | 29613 |
| 3405 | 2017/1/9 | [加油！蒲公英](https://npupt.com/forums.php?action=viewtopic&forumid=28&topicid=3405) | Gaussian | 2 | 11089 |
| 3819 | 2017/5/17 | [权力的游戏第七季_2017.07.16北美开播_预告一下~](https://npupt.com/forums.php?action=viewtopic&forumid=28&topicid=3819) | 桐壶 | 38 | 7283 |
| 4292 | 2017/9/9 | [悬赏征集Banner&侧边栏，为我妹妹疯狂打call](https://npupt.com/forums.php?action=viewtopic&forumid=28&topicid=4292) | IU是我妹妹 | 35 | 6775 |
| 4381 | 2017/9/30 | [萌新的初次尝试请指教](https://npupt.com/forums.php?action=viewtopic&forumid=28&topicid=4381) | Gulnaz | 16 | 6139 |
| 2868 | 2016/9/11 | [新手来一波黑暗系](https://npupt.com/forums.php?action=viewtopic&forumid=28&topicid=2868) | 北城之光 | 10 | 5646 |
| 4713 | 2017/11/29 | [【工大姑娘】----梦之翼网络文化工作室品牌栏目宣传](https://npupt.com/forums.php?action=viewtopic&forumid=28&topicid=4713) | MrCzx | 30 | 5200 |
| 4894 | 2017/12/30 | [【跳一跳】根本停不下来~](https://npupt.com/forums.php?action=viewtopic&forumid=28&topicid=4894) | 胖虎 | 15 | 4680 |
| 2725 | 2016/7/8 | [暑假快乐！](https://npupt.com/forums.php?action=viewtopic&forumid=28&topicid=2725) | 卯月 | 19 | 4655 |



## 后记

受限于我已经毕业、忙于实习的现状，这篇文章从准备写作到目前（其实是2天）已经前前后后占用了很多空闲时间~~（拿来休息看动漫推游戏）~~，所以这次的统计其实到后面也并不是很理想。

身为其他站点管理（在NPU这边**挂职锻炼**23333），其实是很羡慕站内美工区Banner投稿数量、主题众多的现状。同时，管理Banner更换的管理们也很热心，即使是部分我觉得其实并不算美观或规范的作品也能得到管理组成员的帖子打赏或者悬挂。在这里不是抨击管理不注意筛选，而是应该看到管理组成员鼓励普通用户发布自己制作Banner的用心；当然，也更应该看到在投稿数量日渐增加~~（其实并没有很明显）~~的情况下，管理组为作品筛选实际已经在做的一些工作。

此外，就统计结果综合来看，动漫类Banner在更换过程中，其实并没有得到很区别的对待，由于特定日期Banner情况的存在，节日类主题Banner实际在悬挂过程更为常见。而关于时事类题材作品（对展示时间有特定需求的作品应在当天上线展示），在投稿说明以及彩羽的回复中，都有向志愿者团队发信帮忙的提醒。毕竟人无完人，负责对Banner更换志愿者也有自己的学习、工作任务，不可能24小时关注着论坛区。

最后，文章PDF版本以及数据库情况均附在内（，Python源代码因文章中已经基本给出，不再另附），如有需要请自取研究~

## 其他相关

所用工具： Python 3 （爬虫、分析）、Sqlite （数据库）、Echart （作图展示）

统计+执笔： Rhilip

PDF版及数据库（不含源代码及图片文件）：[npu_banner_ana.zip](/images/2018/07/3872371721.zip)

相关论坛帖：

[美工作品/Banner自由投稿说明](https://npupt.com/forums.php?action=viewtopic&forumid=28&topicid=1830)

[建议申诉/关于美工专栏的一些意见建议](https://npupt.com/forums.php?action=viewtopic&topicid=5971&page=p54407)

[美工作品/2015年1月至11月间蒲公英的banner](https://npupt.com/forums.php?action=viewtopic&forumid=28&topicid=1154)

[美工作品/特定日期banner汇总](https://npupt.com/forums.php?action=viewtopic&forumid=28&topicid=1259)



自力更生、艰苦创业~

![TIM截图20180713213939.jpg](/images/2018/07/1436504898.jpg)





