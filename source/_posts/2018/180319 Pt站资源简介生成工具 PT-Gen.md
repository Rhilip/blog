---
title: Pt站资源简介生成工具 PT-Gen
date: 2018-03-19 21:17
categories:
 - PT
 - [Coding, Python]
tags: 
 - ptgen
permalink: /archives/800/
---

**此工具已不公开维护，请考虑直接使用以下API地址调用：**
 - https://api.rhilip.info/tool/movieinfo/gen （无CORS验证反代）
 - http://api.ourhelp.club/infogen （有CORS验证，仅供OurBits使用）

或者使用 https://www.bfdz.ink/tools/ptgen 作为替代。

------------

嘛，此类工具已经很多了，比如前有领头的 [movieinfogen](http://movieinfogen.sinaapp.com/) 后又有别人在movieinfogen暂时失效时间写的替代 [http://huancun.org/](http://huancun.org/) ，此外还有各种各样的脚本可供生成相关的简介。
就比如我在BYRBT内部论坛分享的整篇 [资源简介美化——电影、剧集、动漫简介生成](https://bt.byr.cn/forums.php?action=viewtopic&forumid=9&topicid=11823) ，就比较完整的介绍了这类工具的使用。

这篇博文介绍的也是类似工具。也没什么别的大的功能，毕竟大家都大同小异。只不过就以下功能罢了。

- 支持使用Douban链接来生成电影、剧集简介（movieinfogen格式）
- 支持使用Bangumi链接来生成动漫信息（BYR推荐 Story、Staff、Cast格式）
- 支持使用Steam链接来生成游戏信息
- 豆瓣、Bangumi不用登陆（因此也导致部分资源不可查询）
- 支持在豆瓣上有imdb号的资源
- 支持豆瓣搜索


唯一有点不同的是，在提供展示页面的基础上，还提供无CORS的API接口，可以直接调用。

DEMO： https://rhilip.github.io/PT-help/ptgen
API： https://api.rhilip.info/tool/movieinfo/gen
DOCS: https://github.com/Rhilip/PT-help/blob/master/modules/infogen/README.md

这个后端API我早就写了，当时在研究用户脚本，面对Javascript的异步问题解决方法不是很懂，转而想用后端生成的形式。
主文件就一个`gen.py`，不受其他Flask环境依赖。你也可以复制该脚本，在任何其他脚本中使用`Gen(url).gen()`调用。
这几天补个了前端页面而已。**顺带水一篇博文~**

<!-- more -->

## 更新日志

 - 2017-10-14 API初版上线，初版支持Douban以及Bangumi简介生成
 - 2018-03-17 上线前端页面
 - 2018-04-17 增加Steam信息生成
 - 2018-06-22 增加前端豆瓣搜索（通过豆瓣API）支持
 - 2019-02-23 修改CDN为jsDelivr
 - 2019-04-10 1. 增加数据库缓存以及后台自动更新过期信息 2. 上线IMDb格式，如果输入IMDb链接但要输出原格式，请勾选 通过豆瓣查询 3. 增加API请求频率限制，以`X-RATELIMIT-*`响应头展示。 4. 改由 OurBits 提供技术以及服务器支持，原API地址仅作反代转发
 - 2019-05-13 添加豆瓣APIKEY的支持，应对豆瓣公开API关闭的情况
 - 2019-06-04 优化后端更新方法，从最后更新在两个月以外的随机5个改为时间顺序前5个，同时防止因为豆瓣对应记录被移除导致的卡更新情况。


## 展示

- 豆瓣搜索
![douban_search.jpg](/images/2018/798501736.jpg)

- 豆瓣信息
![douban.jpg](/images/2018/2176764395.jpg)

- Bangumi信息
![bgm.jpg](/images/2018/318637092.jpg)

- Steam信息
![steam.jpg](/images/2018/4257925728.jpg)

> 扩展

[【图片】电影介绍生成工具发布【pt吧】_百度贴吧](https://tieba.baidu.com/p/3653107906)
[资源简介生成工具 （R酱版）【pt吧】_百度贴吧](https://tieba.baidu.com/p/5760905760)