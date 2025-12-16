---
title: 基于qbittorrent完成回调和Pt-Gen简介生成的美剧发种机
date: 2020-05-19 09:31:00
categories: python
tags: [PT,Python,Autoseed,pt-gen,qbittorrent]
permalink: /archives/1238/
---

有些人可能对我有些了解，我在17年时候完成了本人的第一个 [Rhilip/Pt-Autoseed](https://github.com/Rhilip/Pt-Autoseed) 并之后持续运行到了2020年年初（自己的关掉了，仅剩下Ourbits还在使用该项目）。

受限制于当时才开始学习编程相关的背景，Pt-Autoseed被设计成一个需要持续性运行且需要Mysql数据库（虽然仅一张很普通的表）做进一步支撑的项目。后续 [rachpt/AutoSeed](https://github.com/rachpt/AutoSeed) 的出现，让我认识到其实bt软件的完成后回调也能做很多有意思的事情，但受限制于代码整体逻辑已经完成，且本人缺少维护时间，故对其重构只能不了了之。

2020年初的时候，慢摇大佬找到我，想让我给SJTU写一个0day美剧的发种机（不对，是19年年末的时候，只不过被我拖到了20年年初），鉴于我当时想把Pt-Autoseed给archive了的想法，故觉得“不如重新写一个简易些的”。就又有了这个可以水一篇Blog的项目： [Rhilip/SJTU-Autoseed](https://github.com/Rhilip/SJTU-Autoseed)

<!-- more -->

## 脚本介绍

整个脚本使用 Autoseed 对象进行运行，依次进行如下步骤：

1. 解析从qbittorrent完成回调传入或者手动输入的 `-i` 和 `-n` 参数；

2. 通过qbittorrent的API，获取对应info_hash的更完备信息；并检查tracker项，判断是否需要在SJTU站点发布；
3. 从qbittorrent的 `export_dir_fin` 和 `export_dir` 中检索种子，从`本地缓存`或者`豆瓣和Pt-Gen联合查询`得到种子简介主体；
4. 发布到SJTU站点。

具体实现感觉也没什么好说的，自己看代码吧，稍微改改应该就能应用到其他站点。

这里就贴一张运行结果：

![image-20200519172841859.png](/images/2020/ZprzT4UMyuK9EBI.png)

## 项目对比

与本人之前的项目 [Rhilip/Pt-Autoseed](https://github.com/Rhilip/Pt-Autoseed) 对比：

- 因为仅服务于单一站点单一类型，单文件run.py即可满足所有需求；

- 采用bt软件的完成后回调形式，不需要进程常驻，且不需要数据库的安装；

- 剧集简介多数情况下可以通过`豆瓣+Pt-Gen` 联合调用的形式生成，而不需要像原有项目一样在对应站点预先准备好第一集的资源，也不用担心换季之后简介出错。

和 [rachpt/AutoSeed](https://github.com/rachpt/AutoSeed) 对比：

- 仅基于bt软件的完成回调，但也可以通过 `python run.py -i xxxxx -n xxxxx` 的命令手动运行来补发。
- 其他都没 rachpt/AutoSeed 完备，但已经能满足站点发布0day美剧的要求。

