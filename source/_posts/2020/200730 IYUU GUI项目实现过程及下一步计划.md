---
title: IYUU GUI项目实现过程及下一步计划
date: 2020-07-30 02:31:00
categories: javascript
tags: [PT,typescript,iyuu,electron,element]
permalink: /archives/1250/
---

## 为什么会有写IYUU GUI的想法

6月末，有人提出来能否将PTPP与IYUUAutoReseed相结合（[ronggang/PT-Plugin-Plus#552](https://github.com/ronggang/PT-Plugin-Plus/issues/552)），但当初我的意见偏于不结合，原因在该issue中页较为明确的提及。那时候一方面顾及大卫本人（@ledccn， IYUUAutoReseed的开发者）自己有开发web页面的想法，另一方面，是因为PTPP和IYUU确实在结合上存在一些问题（PTPP所倡导的权限管理与IYUU不相匹配、站点名映射关系、PTPP在下载器应用上也仅限于种子推送）。

![image-20200722204518516.png](/images/2020/07/3719265177.png)

但相关想法一直存着。也正好最近稍微空下来写。7月9号的时候，我和大卫提起来要帮他写一个IYUU GUI出来。就这样项目启动了。

## 初步验证阶段

首先是用啥语言写，我最早的想法是用Python+PyQt5，原因基本上是因为我前期拿Python+thinker写过GUI程序，稍微有点经验。但简单尝试过PyQt5之后，我有点无奈的放弃了，因为布局构造太！麻！烦！了！更不要说后面一堆emit操作。

正当我想要放弃的时候，我突然想起了electron——使用 JavaScript，HTML 和 CSS 同样可以构建跨平台的桌面应用程序。也正好本人有过使用Vue写过几个小项目的经历以及参与PTPP项目的经历，使用electron来编写桌面应用程序似乎是一条可行之路。

> 这里再扯句B/S构架和C/S构架相关的想法。
>
> 项目要请求的API包括iyuu本身、各个下载器以及部分站点种子详情页面来构造下载链接，如果我们纯在浏览器上完成，那么一定会遇到CORS问题，这个是不可以避免的。那如果我们中间加一个服务器来合并中转请求那？可以是可以，但是这个与本项目最初的想法不一样，PHP版的IYUUAutoReseed在配置上已经过于麻烦，如果还需要用户有docker或者linux的基础搭建一个服务器来合并中转请求，是不是又加大了相关难度？
>
> ![image-20200722214622082.png](/images/2020/07/5418216.png)

## 脚手架选择

将Vue和electron结合的脚手架主要有以下两个： [SimulatedGREG/electron-vue](https://github.com/SimulatedGREG/electron-vue) 以及 [nklayman/vue-cli-plugin-electron-builder](https://github.com/nklayman/vue-cli-plugin-electron-builder)。两者各有不同，我最初尝试了 SimulatedGREG/electron-vue（尝试结果可见 [Rhilip/IYUU-GUI@old-test](https://github.com/Rhilip/IYUU-GUI/tree/old-test)），但最终选择了vue-cli-plugin-electron-builder 作为项目脚手架进行项目编写。其主要原因如下：

1. electron-vue 内置的electron版本过低（为2.0.4），虽然可以通过强行升级的形式升级到更高版本（比如8.x或者9.x），但毕竟不是官方的支持，且部分底层依赖修改起来较为麻烦。
2. electron-vue 没有原生对typescript的支持，事实证明了，通过使用typescript的interface抽象，使得在下载器标准化上写起来更为顺手，即使不同类型下载器内部的实现不同，但是外部暴露的方式和调用的方法能够统一起来，也便于后续继续扩展。
3. electron-vue 已经停止开发维护了。

更详细的对比如下：

- 项目构建

  ```bash
  # electron-vue 基于vue init模板建立项目
  yarn global add @vue/cli @vue/cli-init
  vue init simulatedgreg/electron-vue my-project
  cd my-project
  
  # vue-cli-plugin-electron-builder 直接使用vue add作为项目插件
  yarn global add @vue/cli
  vue create my-project
  cd my-project
  # vue add @vue/typescript # 增加typescript支持
  vue add electron-builder
  ```

  从项目构建的角度上看，electron-vue 使用vue init命令作为模板构建，需要额外的@vue/cli-init库支持，此外也限制了整个项目必须基于该模板。而vue-cli-plugin-electron-builder较为方便，使用的是vue add命令，作为vue-cli的插件构建，在项目构建上更为灵活。

- 项目结构

  从项目结构上来说，electron-vue在src目录下，存在main和renderer两个目录，分别控制main process和renderer process，暴露出更多信息方便对两个进程进行控制。而vue-cli-plugin-electron-builder在src下，除`background.(ts|js)`外，其他文件均为renderer process使用，相对暴露更少的参数信息，更多的则通过对根目录下的`vue.config.js`进行配置。

- 代码调试 debug

  可能是因为代码结构不一样，在实际开发过程中，即使是对view的更改，也会导致基于electron-vue项目的进程重启，导致devtools面板丢失信息。而vue-cli-plugin-electron-builder在这方面处理的较为良好，除非是对于`background.(ts|js)`以及store等底层模块进行修改，一般情况下，对view的修改不会导致main process重启，对于debug来说较为方便。

在经过一番测试后，我抛弃了一开始使用的electron-vue脚手架，使用vue-cli-plugin-electron-builder脚手架来构建这个IYUU GUI项目。且因为electron 9.x在使用xhr时候存在不可避免的CORS问题（[electron/electron#23664](https://github.com/electron/electron/issues/23664)），最终将electron的版本确定在8.x上。

## 下载器构建

与较为冗杂，且在下载器上只考虑种子推送的PTPP相比，IYUU还要求实现从下载器中获取种子信息的功能，特别是种子的info_hash信息，以及保存位置。所以考虑使用typescript的interface进行接口统一，在继承接口的前提下，完成各具体下载器的思想。其接口如下：

```typescript
export interface TorrentClient {
    config: TorrentClientConfig;

    ping: () => Promise<boolean>;

    getAllTorrents: () => Promise<Torrent[]>
    getTorrentsBy: (filter: TorrentFilterRules) => Promise<Torrent[]>
    getTorrent: (id: any) => Promise<Torrent>;

    addTorrent: (url: string, options?: Partial<AddTorrentOptions>) => Promise<boolean>;
    pauseTorrent: (id: any) => Promise<boolean>;
    resumeTorrent: (id: any) => Promise<boolean>;
    removeTorrent: (id: any, removeData?: boolean) => Promise<boolean>;
}
```

在下载器的具体实现上，参考了原来PTPP时候写的一些逻辑以及 `@scttcper/qbittorrent` 等系列实现。但有些稍许还是可以再做讲述，例如：

- 因为electron的renderer process同样实现了部分node模块，所以我们可以使用`Buffer.from(req.data, 'binary').toString('base64')`的方法，快速将通过axios请求得到的文件（binaryarray）转换成base64形式发送给下载器（Transmission和Deluge）

- 通过工厂函数，依据字典中的type属性，生成对应的下载器类型。同样的方法，在生成站点下载链接的时候也一并使用。

  ```typescript
  export default function (config: TorrentClientConfig): TorrentClient {
      switch (config.type) {
          case "qbittorrent":
              return new Qbittorrent(config)
          case "transmission":
              return new Transmission(config)
          case "deluge":
              return new Deluge(config)
      }
  }
  ```


- 而下载链接方式生成，则采用同样的方法，根据站点信息，调用不同的构造函数，值得注意的是，因为对于下载链接的构造，特殊站点需要进行网络请求，所以此工厂函数，使用async/await修饰符的形式，将异步方法转为同步形式：

  ```typescript
  export default async function (reseedInfo: TorrentInfo, site: EnableSite) {
      switch (site.site) {
          case 'hdchina':
              return await HdChinaDownload(reseedInfo, site)
          case 'hdcity':
              return await HDCityDownload(reseedInfo, site)
          case 'hdsky':
              return await HDSkyDownload(reseedInfo, site)
          default:
              return await defaultSiteDownload(reseedInfo, site)
      }
  }
  ```

## 下一步打算

本人对IYUU GUI项目的定位为：如果没使用过IYUU的人，想要尝试或者想要了解，又苦于没有相关基础，直接上手官方PHP版较为困难，使用本项目可以对整个IYUU的实现及功能进行了解，能为后续进阶使用提供机会。

所以目前来看，整个项目的基本骨架已经完成。就目前来看，一些远期的计划有：

- 对于IYUU GUI的文档（Wiki）做相应完善
- 对PHP版的转种任务进行支持，这一块在原来内测期间有过打算，但因为时间较为紧张，且内测快结束时，本人现实中突然有新的事情发生，最终不了了之。
- 对其他类型客户端进行支持。本人在IYUU GUI中，除了实现Qbittorrent以及Transmission的客户端外，还实现了Deluge客户端。目前远期来看，还有支持rtorrent的打算，但是之前在内测期间，发现其过于麻烦（直接的种子推送还简单，比较麻烦的时HTTPRPC部分），所以一时也没来得及支持。
- 定时任务：这块之前在内测群里面，有人建议过，但是我觉得有些繁琐且没有必要，后续再做思考吧。
