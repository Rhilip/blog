---
title: 获取并设置GoodReads的APIKEY
date: 2019-09-25 03:51:00
categories: userscript
tags: []
permalink: /archives/1124/
---

> GoodReads 自2020年12月8日起不再提供公开API申请，故本文作废。
> 原文见 https://help.goodreads.com/s/article/Does-Goodreads-support-the-use-of-APIs


我们在 豆瓣资源下载大师 的 `7.5.9` 及之后版本中添加了对GoodReads评分获取的支持。
基于一些考虑，我们并没有内置APIKEY，如果你希望**开启豆瓣图书页面的GoodReads链接以及评分信息的展示**，请考虑自己申请APIKEY并填入，或使用文后提供的一些来自网络收集的apikey。
或如果你想分享你申请或者收集到的apikey，也可在评论区留言。

<!--more-->

以下为相关方法介绍：

1. 注册GoodReads帐号

   打开注册页面 <https://www.goodreads.com/user/sign_up>，使用你的邮箱信息注册帐号。注意注册页面有个谷歌验证码（reCAPTCHA），如果没有显示，则请考虑自己上网姿势是否正确。

   ![1569397560040.png](/images/2019/09/683554041.png)

2. 申请API应用

   打开API应用页面 https://www.goodreads.com/api/keys 申请Api Key，从上到下依次是“应用名”，“公司名称”，“应用链接”，“回调链接”，“支持链接”。后三个都是可以不用填写。前两个随意填写即可。

   ![1569397964516.png](/images/2019/09/4030797797.png)

   提交后页面就出现了只属于你自己的APIKEY信息，我们只要上面的key，下面的secret可以不用管它。

   ![1569398073769.png](/images/2019/09/250106408.png)

3. 填入豆瓣资源大师设置页面

   在豆瓣任意页面右上角点击“脚本设置”，在脚本基本功能启用项中，启用GoodReads图书评分，并在右侧输入框中把第二步得到的apikey粘贴进去。

   ![1569398188584.png](/images/2019/09/477096201.png)

   重新刷新页面，就可以看到页面中栏评分信息中出现了来自GoodReads的图书评分信息，单击 `xxxx人评价`就可以直接进入该豆瓣条目对应的GoodReads条目。
   ![1569398306745.png](/images/2019/09/2145103839.png)

## 一些可用的key

以下apikey来自网络收集，本人不对其是否可用进行保证。

- `gmaVsowZsITzZGWKQjQ3sQ`
- `Ht84o1Wo0CHLKIrI4GfR1g`
- `FJ5aUJlUc4pBadYJmcbaA`
- `epWEWVGxvwNoWcI1p3CzQ`
- `iSAfjzMo6QHWifwOfCQvQ`
- `HcuvAy1HVWamfQboaYl9g`
- `gQ8Ee1bJbfxTaNLwAJhiww`
- `udFVpMhBnhJutfVj6abfA`
- `NwNSlVu7xFWbuomMXJhrzA`
- `BVYrzrOuMKyw4m5tGrOqQ`
- `risKm8wwXsIcyEiTktvA`
- `i2RVLibRXKLkwrd7fjyT9g`
- `AkUVvf16LlPqePQEQojilg`
- `WbvapnRMJgIqxdqffAVwPg`
- `MC6Xd8O4bTPMrjDZ7uzRuQ`
- `c01oCrpVz1kP0bKjcjuwUg`
- `vWpLK9nsq7was0ZRwN5MxQ`
- `ekllRCatW1xsWqwHp9nrg`
- `LkgpABVldiPbwEDdpSnHpw`
- `b0gIucYZHfS9iMHGQkqDQ`
- `2bBHam7fukB6IoXohJ3B1`
- `zaTX6u6bYmPadLvnD2VkaA`