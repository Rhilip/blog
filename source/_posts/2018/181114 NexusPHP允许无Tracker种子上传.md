---
title: NexusPHP允许无Tracker种子上传
date: 2018-11-14 13:56:09
categories: PHP
tags: [nexusphp,tracker,announce,torrent]
permalink: /archives/1036/
---


在某些NexusPHP构架的PT站点上传无tracker地址的种子时会提示`目录缺少值,至少要填写一个tracker`。

长期以来，这个缺陷一直被要求up者在做种时任意填写一个字段使该tracker地址非空。

不过经过分析，发现这个只需要改一行代码就行。

照例，上NexusPHP的源代码：[ZJUT/NexusPHP/takeupload.php#L140](https://github.com/ZJUT/NexusPHP/blob/master/takeupload.php#L140) ，是的，只要修改这一行为下列即可~

```php
list($info) = dict_check($dict, "info");
```

## 完整Patch

![TIM截图20181114172045.png](/images/2018/11/222148554.png)

> 后面都是瞎写的，就不用点开看了233333

<!--more-->

------

## 原理分析



NP对上传种子的处理方法在`takeupload.php`页面，在这个页面使用了方法`dict_check($d, $s)`对种子文件的有效性进行了检测。但是在140行，此时系统还未对种子进行处理，仅对用户上传的种子进行检查。在原有中，除了获取info信息之外，还对announce信息进行了检查。

但是很有意思的是，后面并没有对提取出来的announce信息进行检查。

![1542200860628.png](/images/2018/11/2564690865.png)

那么直接删除会不会对用户有影响那，即不对用户上传种子的announce字段存在与否进行检查会不会导致种子不能保存以及下载的种子中无法添加passkey字段那？

不，在190行会自动写入一个需要的announce值。

```php
$dict['value']['announce']=bdec(benc_str( get_protocol_prefix() . $announce_urls[0]));  // change announce url to local
```

故第198行的再次检测并不会导致错误。

此外查阅`download.php`信息： [ZJUT/NexusPHP/download.php#L92](https://github.com/ZJUT/NexusPHP/blob/master/download.php#L92) 

![1542201102678.png](/images/2018/11/1511128578.png)

可以看到这里无论如何都会重新改写announce信息，而且$dict是一个PHP的array对象，所以对其多级键值对的定义并不会导致其报错。

## 历史

在我已经半鸽的 `漫谈 PT 构架` 文章中，我提及NexusPHP是在TBSource的基础上修改的。 翻阅其源码，可以看到其对announce字段是有要求的。
![1542201624966.png](/images/2018/11/3309409393.png)

但是NP不需要！不需要！所以直接放心改吧~



