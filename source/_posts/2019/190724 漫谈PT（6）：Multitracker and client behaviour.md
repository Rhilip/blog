---
title: 漫谈PT（6）：Multitracker and client behaviour
date: 2019-07-24 08:43:00
categories: knowledge
tags: [torrent,bittorrent,muti-tracker,bittorrent client,bep]
permalink: /archives/1108/
---

昨晚在群里和tjupt的 @zcqian 等人讨论关于Multitracker 以及BEP相关规定，也让我学习到很多，正好整理整理。作为这个鸽了好久的系列文章第6节发布。

顺带这篇文章讨论的东西有些脱离了PT架构了，不如系列名改成 “漫谈PT” 吧。

此文行文过程中尽可能从Bittorrent client开源源码中找到对应支持点，但因为本人没有学过C++的相应知识，对libtorrent以及libtransmission的理解可能仅在于表面的调用关系上，如果有纰漏还请指出，感谢。

![1563937196964.png](/images/2019/07/1198674997.png)

## Multitracker 在torrent种子中的实现 （BEP0012）

对于单tracker（一般pt站点）的种子，对其种子文件进行解码（以下解码均指Bencode2Json）可以看到如下结构。

```json
{
   "announce": "http://tracker1.example.com/announce",
   "info": {...}
}
```

而我们知道Bittorrent是P2P的形式，所以tracker数越多，可能获得的peers就越多。故 [BEP0012](http://www.bittorrent.org/beps/bep_0012.html) 规定了 `Multitracker Metadata Extension` ，为torrent种子引入`announce-list`键值。一个多tracker的种子解码结构一般如下：

```json
{
   "announce": "http://tracker1.example.com/announce",
   "announce-list": [
      [
         "http://tracker1.example.com/announce"
      ],
      [
         "http://tracker2.example.com/announce"
      ],
      [
         "udp://tracker3.example.com:6969/announce"
      ],
	  ...
   ],
   "info": {...}
}
```

在 BEP0012 中，对bittorrent client（以下简记client）如何处理进行了规定，即在顶层字典中出现 `announce-list` 字段时，该种子为Multitracker。`announce-list` 字段为**一个list，包含若干个tier，每个tier里面可能有一个或若干个tracker**，即结构为 `announce-list: List[List[Tracker]]`。

在此时，client会**忽略**顶层字典中的 `announce` 字段，所以在实践中我们一般会把原announce字段的值作为 `announce-list`的第一个tier中第一个tracker，并把其他tracker另起tier放入。

> uTorrent打开某Multitracker 时Tracker列表展示。每一行为一个tracker，并用空行作为Tracker的分割标识**（实际是tier的分割标识）**。**对每一个tier，ut每次只使用其中一个tracker。**

![Snipaste_2019-07-24_08-24-08.png](/images/2019/07/1672729113.png)

<!--more-->

还请注意我之前加粗的 `每个tier里面可能有一个或若干个tracker`。所以接下来我们看下 BEP0012 对3种不同情况的规定 [BEP 0012 - Order of Processing](http://www.bittorrent.org/beps/bep_0012.html#order-of-processing) ：

1. 所有tracker在不同的tier中

   ![1563931109473.png](/images/2019/07/2253727400.png)

   这种情况是最常见的一种情况，你从publit torrent站如Nyaa或者多tracker的PT站点下载下来的种子多是这种结构。在这种情况下，意味着某个tracker都是独立的，client会依次尝试所有tracker（按tier序）并进行announce连接，所有tracker使用独立的announce interval。

2. 所有tracker在同一tier中

   ![1563931573757.png](/images/2019/07/295364431.png)

   在这种情况下，原metadata里面规定的tracker顺序会被打乱（或者说被client忽略），并根据announce的测试情况对其重新排序，同一个tier里面的tracker共享一个announce interval。

| 次序           | tier序（该次序开始）       | client表现 |
| -------------- | -------------------------- | ------------------------------------------------------------ |
| 初始           | tracker1,tracker2,tracker3 | 打乱顺序                                                     |
| 第一次announce | tracker3,tracker1,tracker2 | 依次（3-1-2）尝试3个tracker，直到获得一个可用的tracker响应，如tracker2，使用其返回的信息，并将其洗到该tier头。 |
| 第二次announce | tracker2,tracker3,tracker1 | 按新顺序（2-3-1）依次尝试，直到获得一个可用的tracker响应，如tracker3，使用其返回的信息，并将其洗到该tier头。 |
| 第三次announce | tracker3,tracker2,tracker1 | 同理依次尝试。。。。。                                       |

3. 有多个tier，每个tier里面可能是一个也有可能是多个tracker

   ![1563935866274.png](/images/2019/07/4268094598.png)

   在这种情况下，client会按tier序依次tier，只有按照2中方法尝试该tier里面所有的tracker全部失败才会进入下一个tier。

总结来看，BEP0012 对Multitracker下顺序是按照tier序的，tier内各tracker是按“质量”（质量是通过announce-test确定的）排序的。当测试tier内有可以使用的tracker时，使用该tier，不然则进入下一个tier进行测试。此外，即使是有Multitrackerr的情况下，BEP0012的默认行为依然是只使用一个tracker，只不过有多余的tracker可以做备用。即文档开头所说的：

>The tiers of announces will be processed sequentially; all URLs in each tier must be checked before the client goes on to the next tier. URLs within each tier will be processed in a randomly chosen order; in other words, the list will be shuffled when first read, and then parsed in order. In addition, if a connection with a tracker is successful, it will be moved to the front of the tier.

## Private Torrent 对 Multitracker 的额外规定 （BEP0027）

直接引用，不做截图了：

>When multiple trackers appear in the *announce-list* in the metainfo file of a private torrent (see multitracker extension in [[4\]](http://www.bittorrent.org/beps/bep_0027.html#bep-12)), each peer MUST use only one tracker at a time and only switch between trackers when the current tracker fails. When switching between trackers, the peer MUST disconnect from all current peers and connect only to those provided from the new tracker.

即当PT种子中出现`announce-list`的时候，client一次只能使用一个tracker，而且只有当当前tracker无法使用时，才会切换到下一个tracker。并且切换到下一个tracker时，必须（MUST）断开与现有peers的连接，并只使用新tracker提供peerlist。

这么做的理由文档中也有说明，即为了防止泄露peers

> When a peer switches between trackers, the peer drops connections so that it cannot become an ongoing bridge between peers granted access from a private tracker and peers announcing to a public tracker. This partially mitigates the effect of an attacker modifying a metainfo file's *announce-list* and redistributing the metainfo file, e.g., via a public tracker web site.

**但是并不是所有的client都遵循BEP0027的相关规定。**

**甚至遗憾的是，我似乎并没有发现完全遵守BEP0027的client。**大毒瘤uTorrent没有，transmission没有遵循（观察），libtorrent（Qbt以及Deluge的后端）也没有遵循。所以这条规则看看就是了，不要当真。。。。。。

## Bittorrent Client 在Multitracker下的表现

本处分析常见的bittorrent在Multitracker下的表现，

1. **uTorrent （大毒瘤）** ( 参考自: [Multiple Tracker Handling - General - µTorrent Community Forums](https://forum.utorrent.com/topic/107013-multiple-tracker-handling/) )

   uTorrent被称为大毒瘤不是没有道理的，除了peer_id的XJB标之外。uTorrent在Multitracker下的表现也与BEP规定的不一致，不仅没有遵循BEP27，也没有遵循BEP12。

   uTorrent采用的是每个tier中取出一个tracker，如果一个tier中有多个tracker，则通过测试只取出一个可用的tracker。并对所有取出的tracker进行announce管理。即如下表归纳：

| d['announce-list']                      | uTorrent使用                                                 |
| --------------------------------------- | ------------------------------------------------------------ |
   | [ [tracker1], [backup1], [backup2] ]    | [tracker1, backup1, backup2]                                 |
   | [[ tracker1, tracker2, tracker3 ]]      | tracker1,tracker2,tracker3 中任意一个（和BEP12第二个示例表现相同） |
   | [ [ tracker1,   tracker2 ], [backup1] ] | [tracker1, backup1] 或 [tracker2, backup1]                   |

2. **Transmission**

   Transmission在Multitracker下的表现也不完全符合BEP12，以下为不同之处：

   - Transmission不遵循metadata中定义的`announce-list`信息，而是会对已知的tracker [重新组织](https://github.com/transmission/transmission/blob/10cdd7f790eed859ad333a6a7635a2d6a2d53447/libtransmission/announcer.c#L593-L772)（包括去重，合并相似tracker，优先udp类型tracker等）以形成新的tier_list来使用。 

   - 除了 [遍历tier](https://github.com/transmission/transmission/blob/10cdd7f790eed859ad333a6a7635a2d6a2d53447/libtransmission/announcer.c#L416-L431) 取其中一个拿来使用之外（和uTorrent表现相一致），Transmission还会为每个tier维护**单独的 upload, download, corrupt,{announce,min_announce,scrape}_interval 等信息**，其中 `upload,download,corrupt` 信息对所有tier应该是[同时增加](https://github.com/transmission/transmission/blob/develop/libtransmission/announcer.c#L969-L980)，且这些信息会在用户停止种子，并收到tracker关于`&event=stopped`的announce响应后后被 [重置](https://github.com/transmission/transmission/blob/develop/libtransmission/announcer.c#L1266-L1274) 为0。（这里产生了一个问题我可能会另起一个文章讲述，如果不鸽掉的话）

3. **libtorrent**

   libtorrent的[默认表现](https://github.com/arvidn/libtorrent/blob/7a2085063219ae36f7f21c911b3873237a06f690/src/torrent.cpp#L8764-L8861)完全符合BEP12中相关的规定。但是它额外提供了[两个配置项](https://www.libtorrent.org/reference-Settings.html)，如下图。

   ![1563950117046.png](/images/2019/07/748092428.png)

   当`announce_to_all_trackers`被启用时，同一个tier的所有tracker都会发送announce请求，但其全部都fail时会尝试进入下一个tier；而当`announce_to_all_tiers`被单独启用时，表现同uTorrent。这两个选项也可以同时打开，此时会往`announce_list`中所有的tracker发送请求。

   1. **qbittorrent**

      qbt允许你对这两值的配置。在未配置的情况下，这两个值分别为： 

      - announce_to_all_trackers： false
      - announce_to_all_tiers: true

      配置方法如下：

      - 找到 `qbittorrent.conf` 文件（如 `~/.config/qBittorrent/qBittorrent.conf` ）并打开；
      - 在`[BitTorrent]`下选项中找到 `Session/AnnounceToAllTrackers`，`Session/AnnounceToAllTiers` 并进行设置，如果没有对应选项，可自行添加；
      - 修改完成后保存并退出，并重新启动qbt服务。

	> 2019.08.25 补充图形界面方法
	![TIM截图20190825205430.png](/images/2019/08/4029620722.png)

   2. **Deluge**

      Deluge默认会直接使用你libtorrent的配置，但是其组件ItConfig允许你对这两个值进行自定义，如下图!![1563954624594.png](/images/2019/07/1451693980.png)

      

## Tracker 应对

Multitracker是一个很好的技术，它和DHT、PeX等用户交换技术一样，帮助peers脱离单一tracker失效导致种子失效问题，这也正是你从BT站下载下来的public torrent中一般都带有`announce-list`的原因。
但正如题图，Multitracker在当前client实现下出现很多问题，**在Private Torrent中尽量不要使用多Tracker设计。**如果只是为了通过多tracker获得peer的ip，那么尽可能合理的从请求url字段中`&ip=`，`&ipv4=`，`&ipv6=`以及请求头中IP相关字段获得，而不是考虑Multitracker。

因为多数client并没有遵循BEP21中关于Multitracker的相应规定，而且不同的client在面对Multitracker时表现并不一致，对需要统计用户upload以及download信息的Private Tracker来说，存在误统计的情况。
就假设一个开启Multitracker的NPHP站点来说，下载到的种子记录为`d['announce-list'] = [ [tracker1], [backup1], [backup2] ]`，那么uTorrent、Transmission、Qbittorrent（默认设置）会同时（比如刚开始或者强制刷新时，在正常刷新时可能因为tracker相应时间不同或者相应的interval值不同，存在时间差）对`announce-list`中的3个tracker进行announce操作。

```nginx
<IP> - - [24/Jul/2019:06:55:03 +0800] "GET /announce.php?passkey=<passkey>&info_hash=<info_hash>&peer_id=-TR2940-0s8ii7k56njs&port=52261&uploaded=0&downloaded=1511623221&left=0&numwant=80&key=75118110&compact=1&supportcrypto=1&ipv6=<ipv6> HTTP/1.0" 200 65 "-" "Transmission/2.94"
<IP> - - [24/Jul/2019:06:55:24 +0800] "GET /announce.php?passkey=<passkey>&info_hash=<info_hash>&peer_id=-TR2940-0s8ii7k56njs&port=52261&uploaded=0&downloaded=1511623221&left=0&numwant=80&key=75118110&compact=1&supportcrypto=1&ipv6=<ipv6> HTTP/1.0" 200 65 "-" "Transmission/2.94"
```

如果该站点tracker为一主两反代设计，那么主服务器会在相近时间内收到多条announce相同或相近请求（有些客户端会增加`&trackerid=`用于区分不同tracker），增加了处理压力。如果该站点tracker为多主设计，则可能导致不同tracker数据之间存在差异。

如果实在不行，必须使用Multitracker的话。可以考虑以下方法：

- 使用`d['announce-list'] = [[ tracker1, tracker2, tracker3 ]]`的格式构造，在这种格式下，目前常见的uTorrent, Transmission, Qbittorrent (默认情况), Deluge (未使用ItConfig调参) 的表现均一致。即只顺次使用tier0中第一个可用的tracker，并重新排序。

- 使用一个Cache Lock，在tracker收到第一个announce请求后，hit一个cache lock，并设置合适的过期时间，用作处理当前请求，处理完成后，可以考虑移除该lock或者等待lock自动过期。如果新来的请求hit了这个lock，那么直接返回一个空的peer_list。

