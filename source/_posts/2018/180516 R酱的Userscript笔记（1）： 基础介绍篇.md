---
title: R酱的Userscript笔记（1）： 基础介绍篇
date: 2018-05-16 14:31:00
categories: userscript
tags: [Tampermonkey,userscirpt,greasymonkey,copyright]
permalink: /archives/898/
---

# 什么是Userscript

按照[eMule Fans](https://emulefans.com/userscript-on-various-browsers/)对Userscirpt的描述，用户脚本（UserScript）是一种强大的客户端（浏览器）Javascript脚本。下载了用户脚本保存在电脑里，通过浏览器的某些扩展程序（最常用的是Firefox的Greasemonkey扩展），就可以运行于相关页面上。用户脚本为用户增强浏览体验和控制。在安装之后，它们可可以任意修改HTML页面，请求其他站点的数据，自动为用户访问的网站添加功能，或使其更加易用、更加清新。
并依据描述，用户脚本（UserScript）一般后缀为 `.user.js` 。

# 用户脚本管理平台

要使用用户脚本，用户首先需要安装一个用户脚本管理器，最常见的是 Tampermonkey、Violentmonkey（经常被称为`暴力猴`）、Greasymonkey。你可以直接在你浏览器的插件商店中获取这些插件。

> 由于Greasymonkey的4.x版本的更新了自身API的调用方式，例如废弃了`GM_addStyle`等API，导致先前使用GM API的脚本全部失效，且这次更新没有提供对于旧接口的兼容和过渡。虽然Greasemonkey给开发者提供了相应的解决方案，但是该方案建立在修改旧脚本的基础之上，考虑到社区中已有大量油猴脚本，部分脚本的作者可能已经不再更新，Greasemonkey目前的做法无疑会给油猴脚本开发者、油猴脚本社区以及油猴脚本用户带来不必要的麻烦，这应该是软件开发过程中极力避免的问题。

由上所述，不建议使用Greasymonkey作为自己的用户脚本管理平台，而是使用Tampermonkey、Violentmonkey作为用户脚本管理平台，这些插件管理平台均使用 Greasymonkey 3.x 版本的API，对现有脚本的支持性良好。

另一方面，部分插件平台还扩展了一些自己的API方法，例如： Tampermonkey提供了`GM_addValueChangeListener` 。如果你脚本的受众可能使用其他用户脚本管理平台，请在使用GM_* API之前查看这个API是否被这个平台实现。否则可能你的脚本就不能运行了23333

常见平台的API文档你可以在以下页面翻阅：

- Greasymonkey： https://wiki.greasespot.net/Greasemonkey_Manual:API
- Tampermonkey： http://tampermonkey.net/documentation.php#api
- Violentmonkey：https://violentmonkey.github.io/api/gm.html
- scriptish：参阅wiki中GM_开头的页面，https://github.com/scriptish/scriptish/wiki

因为本人使用Tampermonkey进行脚本开发以及使用，所以接下去我会以Tampermonkey作为例子。
![tampermonkey.jpg](/images/2018/05/2643803066.jpg)

# 怎么获取Userscript

一般用户脚本都从一些脚本分享网站获取。由于现在网站页面ui变动较大，**一般请选择较为新的脚本，或者目前还在更新的脚本，以防止因为页面变动而脚本不再更新导致的无法使用情况。**

目前，对于中国用户来说 [GreasyFork](https://greasyfork.org/zh-CN) 可能是最好用、最熟悉的分享平台。
![greasyfork.jpg](/images/2018/05/4132698868.jpg)

当然除了GreasyFork，还有一些其他的脚本分享网站，例如：

- SleazyFork:  https://sleazyfork.org ，GreasyFork的里站，存储一些R18的脚本。
- Userscripts：原站点已经关闭，不过你可以使用他的镜像站点 http://userscripts-mirror.org/
- OpenUserJS： https://openuserjs.org/
- Github/Gist： 当然还有很多人在Github以及Gist上分享脚本。你可以用关键词 [.user.js](https://gist.github.com/search?l=javascript&q=%22user.js%22) 搜索。

国内还有一些转载脚本的站点，因为站点脚本可能不是最新的，所以在此就不做列举了。

<!--more-->

# Userscipt的版权/政策风险

这是一个问题，我也是直到有个人~~(小号)~~在GreasyFork Forum上针对我一个参与Userscirpt开讨论的时候才注意到。

> 讨论地址： https://greasyfork.org/zh-CN/forum/discussion/38137/x

经过这件事后，我们查阅了一些国内社区的讨论以及报道。最终认为**发布、使用用户脚本均不对原网站构成侵权**。~~（当然也存在部分脚本/插件被国内应用开发商举报下架的情况，在此就不展开说明了。）~~

以下为相关论据：

 - [购物比价插件有哪些法律问题？一个判例引发的思考 | 网络法律评论_搜狐财经_搜狐网](http://www.sohu.com/a/210691124_455313)
 - [第三方 Chrome 插件对网站是一种侵权吗？ - 知乎](https://www.zhihu.com/question/20248835)

此外，如果你的脚本中使用了其他人公开的用户脚本，请**注意他人的开源协议**。
