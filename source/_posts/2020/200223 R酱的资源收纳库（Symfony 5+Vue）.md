---
title: R酱的资源收纳库（Symfony 5+Vue）
date: 2020-02-23 12:35:00
categories: PHP
tags: [vue,share,symfony,github action,archive]
permalink: /archives/1196/
---

> ** 网址： https://share.rhilip.info/#/ **

> update 2020.07.20: 因OneDrive于2020年7月初大量杀号，所以两个站点均已关闭。
> update 2020.08.04: 使用备用的OneDrive域开始恢复，之前的分享只剩下一个账号还活着，其他看情况，能补就补吧。。资源仓库（ https://archive.rhilip.info/ ）应该是不再开了，也没精力再做整理了。

在2019年初，随着接触到OneDrive和Google Drive后，我开始使用这两个在线服务存储发种姬发布过的种子资源。并在之后使用过 [donwa/OneIndex](https://github.com/donwa/oneindex) 搭建过在线目录程序，当时的网址是 <https://seedbox.rhilip.info/oneindex> ，因为经常性出现白屏，于19年中旬就关闭了。（说起来也比较有意思，虽然该域名连DNS解析都已经停了，但目前在Google给我发送的搜索结果表现中仍然存在且高居榜首）

也正如我在 [R酱の资源仓库](https://archive.rhilip.info/) 中的说明一样，我依次尝试 PyOne、CuteOne、OLAINDEX 之后，开始采用OneDrive分享链接的形式进行资源分享。这种方法很好，通过 **脚本自动生成分享链接（见前文 [如何批量生成OneDrive分享链接 ](https://blog.rhilip.info/archives/1173/)）+git自动同步** 的形式，我可以很方便的将最新的资源通过OneDrive形式进行分享。

![image-20200223185600543.png](/images/2020/02/3037889272.png)

这样也存在一些不足，比如说，分享更新不及时，往往都是塞满一个OD盘之后才开始建立分享，然后进行链接整理；管理起来也略显麻烦，有些不是很适合归类的难以进行发布。

所以，前段时间，我觉得需要另写一套工具，来实现整个 **资源下载+OD或GD上传备份+OD分享+资源展示** 链条。那么结果就是一个新的网站 [R酱的资源收纳库](https://share.rhilip.info/)。其整个技术栈如下：

- 前端 Vue + Vue Route ， 前端项目开源在 [Rhilip/od_share_frontend](https://github.com/Rhilip/od_share_frontend) 并使用Github Action进行自动构建
- 后端 API ： Symfony 5 ， transfer： Python Scirpt + Rclone

<!--more-->

## 资源准备

资源下载主要使用的工具是Deluge和Aria2，在资源下载完成后，将其移入watch dir，然后交由定时脚本Autorclone发送到Google Drive中的特定目录。早前（19年下半年），我基本都是手动登录Deluge，然后使用种子的移动+删除进行操作，但是Deluge Webui在删除大量种子的时候会出现卡顿，其一没注意便容易出现爆盘的问题），所以之后使用定时脚本的方式进行移动，脚本示例如下：

```python
from deluge_client import DelugeRPCClient

config = {
    'host': 'localhost',
    'port': 58846,
    'username': 'username',
    'password': 'password'
}

remove_to = '/path/to/move/to'

client = DelugeRPCClient(
            config['host'],
            config['port'],
            config['username'],
            config['password'],
            decode_utf8=True,
        )

# 暂停所有非PT的种子
seeding_torrents = client.call('core.get_torrents_status', {'state':'Seeding'} , ['private'])
for hash_, value in seeding_torrents.items():
    if not value['private']:
        client.call('core.pause_torrent', [hash_])

# 将所有暂停的种子存储目录移到remove_to，并从Deluge中移除
paused_torrents = client.call('core.get_torrents_status', {'state':'Paused'}, ['save_path'])

for hash_, value in paused_torrents.items():
    if value['save_path'] != remove_to:
         client.call('core.move_storage', [hash_], remove_to)
         client.call('core.remove_torrent', hash_, False)

```

> Q: 为什么不使用Deluge的AutoRemove Plus插件？
> A: AutoRemove插件只能实现资源的移除，不能进行 move_storage 操作。
>
> Q: 为什么不使用Deluge的Execute插件？
> A: Execute插件的相关实现仍需要具体编写bash或者python脚本，不如直接定时脚本方便。且Deluge的RPC相关方法实现，已经能满足要求。

## 后端 Symfony 5 构建

> 资源转存和OD构建分享链接见前文，此次仅对相关脚本进行更新，**且相关后端均没有开源打算，故不再进行说明。**

因为之前Vue学习使用的体验，这次项目使用前后端分离的形式进行搭建。然后在众多后端API架构（Python和PHP）中挑选，最终选择Symfony 5进行构建。选择的原因大体是因为：

1. Python项目使用uwsgi部署特别麻烦~~（被Pt-Help坑惨了，之后Pt-Help也开始使用gunicorn进行部署）~~
2. 众多PHP框架中，我个人比较推崇Symfony，且最早在写RidPT的时候便尝试过Symfony 4.5，但之后不了了之。此次项目较为简单，不需要考虑用户状态管理，且Symfony升级到5没有使用过。

目前项目抛出以下路由，基本能满足要求。

```
GET /items/{id}    # 获取items的详细信息
GET /search/{key}  # 进行搜索，当key不存在的时候列出最新入库的资源
GET /status        # 使用OD帐号状态
```

然而在实际搭建过程中仍然遇到一些问题：

1. 用来搭建restful的FOSRestBundle目前没有支持Symfony 5，所以只能自己简单的使用Controller+Route进行限制。但索性API并不需要完整的restful支持。
2. Doctrine并不支持SQL的 `MATCH () AGAINS ()`方法，需要采用 `beberlei/doctrineextensions` 库对其进行扩展。此外Doctrine默认生成的数据库字段需要进行小幅更改。

## 前端Vue构建

1. 由于之前测试过 Vue+iView，所以本次也采用同样采用相同的方式进行构建，并使用Vue-Route构建单页面应用。

![d8CvSQEGZot6blw.png](/images/2020/02/2317277491.png)

2. Github Action测试，也算是第一次尝试使用Action。（之前仅有一个项目使用Travis CI进行构建）

   Action动作中包括node及yarn依赖安装，构建并部署。相对也都简单，几乎没有什么可以说明的。。。。。

## 接下去打算

- 将目前 Archive.rhilip.info 下的资料转移到目前前端框架中，考虑使用Vuepress进行构建。
- 后端支持分页以及流量限制。 
