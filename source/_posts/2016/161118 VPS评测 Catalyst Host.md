---
title: VPS评测·Catalyst Host
date: 2016-11-18 23:08:00
categories:
 - VPS
tags: 
 - catalyst
 - bench.sh
permalink: /archives/277/
---

昨天翻LEB（相关文章链接：[Exclusive Offer From Catalyst Host – Low End Box](https://lowendbox.com/blog/exclusive-offer-from-catalyst-host/)）的时候突然发现推了一款 Bandwidth 为 10TB，年付只要$12的VPS。。。

提供商是Catalyst Host: [http://catalysthost.com/](http://portal.catalysthost.com/aff.php?aff=121)
提供的测试页面: http://lgdal.catalysthost.com/

<!-- more -->

## 一、本地ping
再三确认自己没有看错后，尝试ping了下提供的测试ip。万幸在我校IPv6已经崩坏到如此境地的情况下，居然能ping通。而且延迟也是在可以接受的范围内（毕竟DC的地址位置在Dallas，美国中海岸），偶尔有丢包的情况。。

```
C:\Users\Rhilip>ping 2602:ffd1:0:1::5bd1:4372

正在 Ping 2602:ffd1:0:1::5bd1:4372 具有 32 字节的数据:
来自 2602:ffd1:0:1::5bd1:4372 的回复: 时间=176ms
来自 2602:ffd1:0:1::5bd1:4372 的回复: 时间=176ms
来自 2602:ffd1:0:1::5bd1:4372 的回复: 时间=176ms
来自 2602:ffd1:0:1::5bd1:4372 的回复: 时间=178ms

2602:ffd1:0:1::5bd1:4372 的 Ping 统计信息:
 数据包: 已发送 = 4，已接收 = 4，丢失 = 0 (0% 丢失)，
往返行程的估计时间(以毫秒为单位):
 最短 = 176ms，最长 = 178ms，平均 = 176ms
```

## 二、VPS网络情况
在等待了一段时间后（我以为是延迟），发tk开机。测试：

```
[root@ ~]# wget -qO- bench.sh | bash
----------------------------------------------------------------------
CPU model : Intel(R) Xeon(R) CPU E5-2620 0 @ 2.00GHz
Number of cores : 1
CPU frequency : 2000.139 MHz
Total amount of ram : 128 MB
Total amount of swap : 64 MB
System uptime : 0days, 8:55:24
Load average : 0.00, 0.00, 0.00
OS : CentOS 6.7
Arch : x86_64 (64 Bit)
Kernel : 2.6.32-042stab102.9
----------------------------------------------------------------------
Node Name IPv4 address Download Speed
CacheFly 205.234.175.175 88.8MB/s
Linode, Tokyo, JP 106.187.96.148 12.9MB/s
Linode, Singapore, SG 139.162.23.4 7.44MB/s
Linode, London, UK 176.58.107.39 11.7MB/s
Linode, Frankfurt, DE 139.162.130.8 7.74MB/s
Linode, Fremont, CA 50.116.14.9 32.1MB/s
Softlayer, Dallas, TX 173.192.68.18 97.7MB/s
Softlayer, Seattle, WA 67.228.112.250 45.0MB/s
Softlayer, Frankfurt, DE 159.122.69.4 13.8MB/s
Softlayer, Singapore, SG 119.81.28.170 10.3MB/s
Softlayer, HongKong, CN 119.81.130.170 836KB/s
----------------------------------------------------------------------
Node Name IPv6 address Download Speed
Linode, Atlanta, GA 2600:3c02::4b 46.9MB/s
Linode, Dallas, TX 2600:3c00::4b 93.1MB/s
Linode, Newark, NJ 2600:3c03::4b 30.9MB/s
Linode, Singapore, SG 2400:8901::4b 6.64MB/s
Linode, Tokyo, JP 2400:8900::4b 12.4MB/s
Softlayer, San Jose, CA 2607:f0d0:2601:2a::4 30.7MB/s
Softlayer, Washington, WA 2607:f0d0:3001:78::2 46.1MB/s
Softlayer, Paris, FR 2a03:8180:1301:8::4 18.8MB/s
Softlayer, Singapore, SG 2401:c900:1101:8::2 9.50MB/s
Softlayer, Tokyo, JP 2401:c900:1001:16::4 10.9MB/s
----------------------------------------------------------------------
I/O speed(1st run) : 393 MB/s
I/O speed(2nd run) : 282 MB/s
I/O speed(3rd run) : 364 MB/s
Average I/O speed : 346.333 MB/s
```

该[测试报告](http://test.91yun.org/report.php?id=c20e4b22c3c720b16849d41b8e3b1294)使用 [秋水逸冰](https://teddysun.com/) » [一键测试脚本bench.sh](https://teddysun.com/444.html) 生成
————————————————
另外，本地单线程测试了下下载速度，能稳定在1M/s( 10Mbps )，再加上流量充裕，纯粹当个IPv6中转代理什么的看起来挺不错。

只可惜是openvz构架的，装不了锐速（不是openvz构架的怎么可能卖这么便宜吗？对不对23333