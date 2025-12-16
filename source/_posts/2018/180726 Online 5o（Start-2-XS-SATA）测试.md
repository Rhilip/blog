---
title: Online 5o（Start-2-XS-SATA）测试
date: 2018-07-26 02:44:00
categories: vps
tags: [online]
permalink: /archives/978/
---

~~走过路过不要错过，Online的5o传家宝开售了~~

首先需要明确滴是，这款机子馁并不是特价机，初始10刀安装费。（且Online前三个月不能使用Paypal付款，需要外币信用卡）

## 1.购买

网址：https://console.online.net/en/order/server

![TIM截图20180726095630.jpg](/images/2018/07/1107557302.jpg)

目前多数状态下没货~

至于Online的注册、付款以及开机不是本文重点，请另行搜索~

## 2.测试

- **整体测试**

  仅从整体看，IO受限较大。据群里其他人开机测试结果来看，基本也是40-60左右，仅有少部分能开到鸡血100。 

![bench.jpg](/images/2018/07/1671493247.jpg)

- **国内测速**

![speed_china.jpg](/images/2018/07/403239838.jpg)

- **Speedtest测速**

```bash
root@sd-91960:~# wget down.46.tn/tool/speedtest.py && python speedtest.py --share
```

![7500672394.png](/images/2018/07/4225048644.png)

- **Smarttool硬盘信息**

盘是HGST的2.5机械-> [HGST官网信息](https://www.hgst.com/products/hard-drives/travelstar-z7k500) <-，那么IO在60还是能理解的。开机时间1.3W小时，也是中流水平。。

![smartctl.jpg](/images/2018/07/1908160311.jpg)

## 3.评价

如果说sys的5o arm机受限于CPU太弱了，那么online的就是受限于硬盘io，在较高强度的PT环境下直接能把io给卡死了。*io限速大法好*

此外硬盘空间较小，刷起来较为吃力，需要经常性更换种子，清理空间。

当然5o这种价格也就不要想着什么都齐全，性价比还行。推荐对网速不是要求很高的购买吧~

~~毕竟，有钱dalao们都上Andy了~~