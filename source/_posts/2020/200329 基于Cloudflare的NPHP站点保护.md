---
title: 基于Cloudflare的NPHP站点保护
date: 2020-03-29 13:14:00
categories: knowledge
tags: [nexusphp,cloudflare,nginx,cloudflare firewall]
permalink: /archives/1222/
---

周所周知，国内多数基于NPHP构建的PT站点都是使用Cloudflare作为CDN，隐藏起自身服务器IP，防止直接面对IP的DDOS攻击。但部分攻击者同样可以使用CC的形式，恶意消耗服务器请求。（毕竟NPHP一上来就`dbconn()`，数据库可能撑不住）

本文通过综合运用Cloudflare Firewall规则以及Nginx规则，以达到阻拦大部分面对NPHP无脑CC的目的。

<!--more-->

## Cloudflare Firewall篇

首先我们考虑将攻击流量阻拦在Cloudflare Firewall侧，因为如果Cloudflare不能拦住攻击流量的话，那么即使本地服务器处理能力再大都没有太大用处。

一般来说，我们在面对CC攻击的时候，可能会直接开启开启 `Under Attack Mode`  （俗称“无脑5秒盾”），但因此会造成用户无法进行rss订阅，甚至影响BT软件与tracker服务器之间的通信（announce及scrape，表现为BT软件报错 503），造成用户流量无法正常统计。

但除了 `Under Attack Mode` 之外，Cloudflare还为我们提供了 Firewall Rules 的工具，可以基于自定义规则**（默认免费用户有五条激活规则上限）**，灵活的设置入站规则。

![image-20200329184838999.png](/images/2020/03/1041766503.png)

首先我们考虑怎么设置站点规则：

1. 我们有要求passkey认证的访问，如 announce.php， scrape.php， torrentrss.php，download.php 页面。我们可以要求访问用户强制提供passkey字段，否则直接 `block`。
2. 除此以外，多数网站的访问操作都是需要cookies认证的，当然也有torrentrss.php以及download.php页面这种既可以接受passkey，又可以接收cookies的。这种情况我们要求用户提供cookies信息，不然就 `js challenge`。
3. 当然，还有几个页面，例如 login.php， takelogin.php 等控制用户登录的访问。这些页面允许匿名访问，我们对其不要求任何信息，直接`js challenge`。

根据结果`action`类别，我们新增两条规则，分别如下：

1. 要求passkey认证，名字随意取（我这里就明确点写`Allow Tracker with Passkey And RSS with Passkey or cookies` 了 ）。含有的规则如下所示，并设置action是 `Allow`。（其实就是允许无头浏览器根据特征，访问对应页面）

   > 规则仅作示意，你可以对其进行拆分或者根据站点其他访问的要求进行补充，如`announce.php`的请求有更多的参数要求（ `peer_id=` ，`port=` ，`uploaded=`，`downloaded=`，`left=`），如`promotionlink.php` 页面要求`key=`参数

   ```
   (http.request.uri.path in {"/scrape.php" "/announce.php"} and http.request.uri.query contains "passkey=" and http.request.uri.query contains "info_hash=") or (http.request.uri.path in {"/torrentrss.php" "/download.php"} and (http.request.uri.query contains "passkey=" or (http.cookie contains "c_secure_uid=" and http.cookie contains "c_secure_pass=")))
   ```

   ![image-20200329195407300.png](/images/2020/03/4279458294.png)

2. 剩下页面访问全部要求cookies认证，否则直接`js challenge`。（就是普通浏览器根据cookies进行认证）

   ```
   (http.request.uri.path contains "/" and not http.cookie contains "c_secure_uid=" and not http.cookie contains "c_secure_pass=")
   ```

   ![image-20200329195459238.png](/images/2020/03/3462659525.png)

此外，我们还可以布设其他几条规则，分别如下：

1. 根据UA头，禁用掉一些bot。规则可以见该仓库 [SukkaW/cloudflare-block-bad-bot-ruleset](https://github.com/SukkaW/cloudflare-block-bad-bot-ruleset)

2. 使用Cloudflare内置的 Known Bots 以及 Threat Score。

   ![image-20200329195916068.png](/images/2020/03/3511102306.png)

   具体文档请见 [Firewall Rules language - Cloudflare Firewall Rules](https://developers.cloudflare.com/firewall/cf-firewall-language/)。例如官方对Threat Score的推荐就如下

   > A common recommendation is to challenge requests with a score above 10 and to block those above 50.

最后，因为Cloudflare按照次序依次匹配，所以你需要保证规则的顺序，把`Allow Tracker with Passkey And RSS with Passkey or cookies` 这条Allow放在第一条位置，因为我们始终要保证Tracker、RSS（以及无法进行js challenge的客户端需要访问的页面）能访问，并把`Challenge when no-cookies` 放在最后一条，因为这条涉及的范围最广。剩余根据你需求排在中间即可。

![image-20200329200221523.png](/images/2020/03/945451961.png)

## Nginx配置

因为免费版Cloudflare缺少对字段的正则匹配功能，以及Cloudflare的ratelimit是收费功能，所以除了让Cloudflare防火墙挡在第一层，我们本地的Nginx也可以在PHP运行之前拦截部分请求。

因为非本文重点，且设置Cloudflare Firewall基本已经拦截多数垃圾CC攻击，故此处仅贴出部分思路以及相关链接，有兴趣可以自己了解。

- 还原Cloudflare后Nginx记录的remote-ip [Cloudflare下Nginx获取用户真实IP地址 - R酱小窝 ~ 个人博客](https://blog.rhilip.info/archives/256/)
- 限制域名只能接收Cloudflare回源ip [Nginx设置只允许来自Cloudflare CDN的IP访问的方法](https://www.bnxb.com/nginx/27638.html) ，更严格些可以使用iptables限制整个机器的入站请求，并使用跳板机（堡垒机）登录源站。
- 对登录等匿名操作进行限流 [NGINX Rate Limiting](https://www.nginx.com/blog/rate-limiting-nginx/)
- 在Nginx侧对Tracker请求的`&passkey=` 字段进行更严格的正则匹配，因为passkey是使用MD5生成的，所以允许的字符仅在`abcdef0123456789`中，且长度固定为32。
- 根据Nginx Log动态ban请求异常（短时间数量过多），并上报Cloudflare。  
