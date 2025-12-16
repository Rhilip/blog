---
title: Proxifier的IPv6代理相关
date: 2017-11-01 22:19
categories:
 - VPS
tags: 
 - IPv6
 - proxifier
permalink: /archives/670/
---

Proxifier是与 [ProxyCap](http://www.proxycap.com/ "ProxyCap") 一样是一款及其优秀的代理软件。相比于国内的一些垃圾代理软件，如 `SSTap-beta` 等来说，在IPv6下支援情况良好。

> 题外话
 - 国内很多软件都很少考虑IPv6 Only环境下的使用。（即使有果爹的政策大棒，但是，依然。。。。。。
 - 关于Proxifier与ProxyCap的具体差别，可以参考他人文章： [简谈我眼中的proxycap和proxifier优缺点](http://webthen.net/thread-401-1-1.html "简谈我眼中的proxycap和proxifier优缺点")。虽然只是一家之言，但纠于两个软件均已稳定，仍可以作为重要参考。

故，在同时使用ProxyCap与Proxifier一段时间后，我推荐使用`Proxifier`作为系统上主要的代理软件~~（如果你配置了路由器策略，当我什么都没说）~~。即使Proxifier不支持UDP、ICMP代理，但是相对与ProxyCap较为繁琐的软件添加、没有较合适的破解版或中文版，入手感觉及其良好。

<!-- more -->

Proxifier的默认策略很少且很常规，就只有简单的`Localhost`和`Default`，一条配置本地策略，一条为默认策略。这显然是不够用的，而且不符合我们在IPv6-ONLY环境下的代理需求。需要对其进行相关改动。
![default.jpg](/images/2017/1292671450.jpg)

------------

# IPv6-ONLY环境下配置Proxifier

**请务必注意配置条目顺序**，Proxifier的规则默认是自上而下匹配的！！！
本处的介绍也是自上而下介绍的！！！
如果你什么都不想了解，也可以用我配置好的规则： [Proxifier_rule in IPv6-Only Environment](https://gist.github.com/Rhilip/53078271fe55cfb88c23d7e3f2435d25 "Proxifier_rule in IPv6-Only Environment")，直接下载并用Proxifier导入，然后勾选你需要启用的规则即可。

## 修改Localhost
Proxifier的Localhost默认值是`localhost; 127.0.0.1; %ComputerName%`，均代表本机。这里只需要添加 `::1` 这个代表IPv6的本地回环地址即可。

> 2018.02.22 补：整个127.0.0.0/8块均用来表示localloop，不过一般系统软件均只使用127.0.0.1，并不使用其他地址。但是如果你做过本地映射或者存在其他特殊需求，为了以防万一，需要添加对应的本地地址。

## 添加IPv4-LAN
教育网环境下，计费网关一般设置在本校的出口路由上，那么可以认为私有IPv4地址，即`10.0.0.0-10.255.255.255;172.16.0.0-172.31.255.255;192.168.0.0-192.168.255.255`这些内网地址段均在非计费流量中。在Localhost条目下添加一条有效规则，命名为`内网IPv4地址`，动作为`Direct`。
![IPv4-Lan.jpg](/images/2017/3502624649.jpg)

## 添加全部IPv6段
IPv6不计费，这部分流量我们不需要通过Proxifier代理，也需要设置动作为`Direct`。
在`内网IPv4地址`规则下添加一条有效规则，命名为`IPv6地址`，目标主机设置为`*:*:*:*:*:*:*:*;0:0:0:0:0:0:0:0-ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff`。
这里做过尝试。如果仅使用通配符形式匹配IPv6目标主机，可能会遗漏以下情况

1. 访问具有AAAA记录的域名时， 即在连接中显示为`domain:(80|443) *IPv6`的条目不会被正确匹配。
2. 访问IPv6以简写形式提供的主机时，即如果目标主机是`2001:41d0:2:b10a::1`这种缩写，而不是完整的`2001:da8:215:833:542f:a663:2059:2607`形式，也可能不会被正确匹配。

在上述两种情况下，如果中间没有匹配规则条目的话，一般情况下会回落到默认的`Default`规则中。所以不建议使用通配符形式来表示所有IPv6目标主机，而是建议使用所有IPv6 range的形式来表示。

> 2017.12.28补充：在修改本地DNS解析为某建议DNS服务器以及打上ipv6-hosts的情况下，建议修改Proxifier的名称解析设置，关闭`自动检测DNS选项`，并优先使用本地DNS进行域名解析，因为代理上配置的原因可能会把一个具有IPv6记录（AAAA记录）的域名解析为IPv4地址（A记录）。

## 添加校园网软件和代理软件

此处不做具体说明，请在应用程序中添加所有与之相关的软件即可。

## uTorrent

一般也不需要做太多处理。如果需要，可以添加一条代理所有IPv4地址，一条默认的直接连接的规则，如下即可。

![ut-proxy.jpg](/images/2017/1844296695.jpg)

但是需要注意的是，Proxifier的应用名匹配规则是`只需要程序名，同名程序（小写字母相同）都会走代理`。如果你双开ut的话，两个ut均会受到同一个规则影响。

## 其他需要代理的软件

视个人需要添加。相关的添加规则可参照官方英文文档：[Proxification Rules](https://www.proxifier.com/documentation/v3/rules.htm "Proxification Rules")，或直接百度。。

## Default

`Default`规则是在所有规则均未匹配到的情况下使用。如果修改`Default`规则的动作为Proxy的话，那么就相当于启用了全局代理。