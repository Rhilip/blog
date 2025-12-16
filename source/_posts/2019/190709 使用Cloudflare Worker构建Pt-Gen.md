---
title: 使用Cloudflare Worker构建Pt-Gen
date: 2019-07-09 12:21:00
categories: javascript
tags: [cloudflare,pt-gen,travis-ci,worker,wrangler]
permalink: /archives/1095/
---

![FotoJet.png](/images/2019/07/4012272964.png)

最早的时候，Pt-Gen是作为Pt-help的一个子项，使用flask内置的web server提供服务，后来BFDZ将其单独提取出来（[BFDZ/PT-Gen](https://github.com/BFDZ/PT-Gen)），但是仍然存在部署较为困难的问题。

过去近1年的Pt-Gen的运行中，我曾经迁移过多次宿主机。目前托给ourhelp组的Pt-Gen服务器更是远在欧洲大陆。此外因为网络的问题，也导致部分时间段与豆瓣服务器无法连接，导致Pt-Gen服务的SLA特别差。

近期，我得知八蠢想要构建基于AWS lambda的Pt-Gen，也正好最近看到了有关Cloudflare Worker的一些介绍。正好这也是Cf-worker的用途之一——“构建完全依赖于 Web API 的“无服务器”应用程序”。

然而，与AWS lambda不同的是，cf-worker只支持Javscript。于是将原来Pt-Gen改成javascript的格式并使用Travis CI进行自动构建。

> 项目地址： https://github.com/Rhilip/pt-gen-cfworker
> 项目Demo地址： https://ptgen.rhilip.workers.dev/

## Cloudflare Worker介绍

> 文档： https://workers.cloudflare.com/docs

Cloudflare Worker是Cloudflare推出的serverless服务，可以使用Javascript以及WebAssembly语言进行编程，其最简单的代码示例如下：

```javascript
// 1. Register a FetchEvent listener that sends a custom
//    response for the given request.
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

// 2. Return a custom request object
async function handleRequest(request) {
  return new Response("hello world")
}
```

并提供了相应的CLI工具 [Wrangler](https://github.com/cloudflare/wrangler) 进行APP构建。此外，还提供了很简洁的调试界面。

**最为良心的Cloudflare Worker是可以免费使用的（免费计划一天最多100,000次请求）**

<!--more-->

## 部署基于Cloudflare Worker的Pt-Gen

和原项目相比，Pt-Gen-cfworker并不需要你在VPS上搭建复杂~~（并不）~~的Python3+uwsgi工具链，只需要你有Cloudflare帐号就可以。

本教程并不介绍Cloudflare帐号的注册方法（请自己搜索），仅分有无Node.js环境对不同用户部署方法进行介绍。

### 1. 无Node环境直接部署

因为项目主文件 [index.js](https://github.com/Rhilip/pt-gen-cfworker/blob/master/index.js) 加载了两个npm库用于解析页面，所以并不能直接使用。不过在项目的build分支中，我使用Travis CI自动构建了 可以用于CF-Worker的 [script.js](https://github.com/Rhilip/pt-gen-cfworker/blob/build/script.js) 。

所以进入Cloudflare的Worker面板，并创建新的Worker。

![1562672828876.png](/images/2019/07/2591219312.png)

![1562672876451.png](/images/2019/07/1417315508.png)

在Worker代码的编辑器里面，首先修改左上角的Worker名称，这个名称会影响到后面生成的Worker域名（除非你使用已经在CF中注册的其他域名）。然后将 build分支的 [script.js](https://github.com/Rhilip/pt-gen-cfworker/blob/build/script.js) 文件**全部**复制到左侧的代码框中替换Cloudflare默认的代码块。

最后点击Run，如果右侧出现如下图的JSON块说明部署成功。之后你就可以直接使用worker域名进行访问。

如我这边部署的域名是`https://ptgen.rhilip.workers.dev/`。
则获取豆瓣的信息则请求地址如下： `https://ptgen.rhilip.workers.dev/?url=https://movie.douban.com/subject/1297880/`。请求链接格式和Python写的Pt-Gen相同，既可以使用`&url=.....` ，也可以使用`&site=....&sid=....`。且返回字段格式尽可能与原repo相同。

![1562673031084.png](/images/2019/07/1494080402.png)

![1562673307172.png](/images/2019/07/3901039727.png)

### 2. Node环境下使用Wrangler部署

如果你本地有Node环境，或者希望对Pt-Gen-cfworker有改进的需要，你可以自己构建Worker文件。

> Wrangler 文档： https://github.com/cloudflare/wrangler

> 2019.08.31 请参照最新官方文档进行设置，本处步骤基于版本 `1.0.2`，其中`wrangler config`命令的使用已经与最新版本不同。

1. 安装Wrangler并注册全局信息

```bash
npm i @cloudflare/wrangler -g
wrangler config "${CF_EMAIL}" "${CF_API_KEY}"
```

其中 `${CF_EMAIL}` 为你的Cloudflare帐号，而 `${CF_API_KEY}` 你可以在你帐号的Profile页面中找到Global API Key。

2. 取得项目源代码并配置Wrangler信息

```bash
git clone https://github.com/Rhilip/pt-gen-cfworker.git
cp wrangler.toml.sample wrangler.toml
sed -i "s/CF_ACCOUNT_ID/${CF_ACCOUNT_ID}/g" wrangler.toml
npm install
```

使用git clone或者zip包下载项目源代码后，需要编辑`wrangler.toml`文件的相关键值，并将`account_id`值改成你在Worker界面右侧API栏中看到的值，`name` 值会影响到部署时的`<project-name>`值，默认为ptgen。如果你不愿部署在`<project-name>.<subdomain>.workers.dev`域名下，你可以再参照Wrangler文档，添加`zone_id`，`route`等信息，本处不再累述。

3. 部署到`workers.dev`上

```bash
#wrangler build     # 构造
#wrangler preview   # 构造并预览
wrangler publish    # 构造并发布
```

如果配置好wrangler信息并使用 `wrangler publish`，会直接部署，并 提示如下信息

```bash
$ wrangler publish
⬇️ Installing wasm-pack...
⬇️ Installing wranglerjs...

 Built successfully.
 Successfully published your script.
 Successfully made your script available at ptgen.rhilip.workers.dev
✨ Success! Your worker was successfully published. ✨
```

而如果使用`wrangler preview`则会在构建完后，弹出`https://cloudflareworkers.com/`开头的网页。此时你可以使用console等方法对脚本进行调试。

除了使用`wrangler`，本人还在`package.json`中设置了alias，你也可以使用 `npm {build,preview,publish}` （在IDE中）快速调用。

## Travis-CI 自动构建

本项目使用Travis-CI对主分支的更新进行自动构建生成build分支信息。

相关配置文件写在 [.travis.yml](https://github.com/Rhilip/pt-gen-cfworker/blob/master/.travis.yml) 中。请自行查阅，并在Travis-CI中对以下环境变量进行设置：

![1562674697192.png](/images/2019/07/3885747407.png)

