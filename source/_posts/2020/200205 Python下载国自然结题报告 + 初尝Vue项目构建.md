---
title: Python下载国自然结题报告 + 初尝Vue项目构建
date: 2020-02-05 14:09:00
categories: knowledge
tags: [Python,nsfc,国自然,vue,结题报告,nsfc_conclusion_downloader,cors]
permalink: /archives/1181/
---

前段时间，我导师布置任务，让我根据一些关键词主题以及接下去的工作任务查找国自然的一些项目，看看其他人的科研经验。

然而假期嘛~ 所以直到前几天老师打电话催问的时候，我才想起来做。

为了体现工作量，我认真找了下相关课题，并准备把 [科学基金共享服务网（科技成果信息系统）](http://output.nsfc.gov.cn/) 上其结题报告下载了下来。在此期间，从Google、GitHub等处均搜索了相关方法，感觉都不是很好，所以自己写了个脚本。

其实本文章原本是想介绍本人写的 [Rhilip/NSFC_conclusion_downloader](https://github.com/Rhilip/NSFC_conclusion_downloader) 仓库，顺带解释下我前段时间摸鱼的原因。~~（然而这种脚本就是随手写写的，所以是真的摸鱼了~~

但是昨天不知道想了些什么，突然觉得是不是可以把这个做成一个网页工具，供给其他人员在线使用。毕竟整体逻辑特别简单，于是便开始编写，顺带又突然想试试Vue，就上手了开发，现两个项目地址分别如下：

- Python版： [Rhilip/NSFC_conclusion_downloader](https://github.com/Rhilip/NSFC_conclusion_downloader)
- Vue版： [Rhilip/NSFC_downloader_Vue](https://github.com/Rhilip/NSFC_downloader_Vue) （不再维护，仅作示例）

然而Vue版就最终完成的程度来看（连Vue入门加测试写了一天半），实际效果并不如我的想象，所以在写完并测试完最后一个component之后就扔到GitHub上**存档**了。主要的原因是浏览器的CORS策略影响太大，后面我会在Vue版开发过程介绍中详细说明。

<!--more-->

## Python版开发说明

在Github上使用`NSFC`以及`国自然`等关键词搜索，得到的基本都是基于科基网的搜索爬虫。

唯一有下载结题报告的仅搜索到 [LizhuangTan/NSFC-Report](https://github.com/LizhuangTan/NSFC-Report) 。但其仅仅处理了PNG格式的图片文件下载，并没有涉及到PDF合成（毕竟要交给老师）。此外，对部分异常情况处理不够完善。例如，该项目不能妥善处理报告页数超过100页的情况。

综上，决定自己写一个简易的，并整理形成了相关代码上传。其完整逻辑如下：

>1. 通过 `http://output.nsfc.gov.cn/baseQuery/data/conclusionProjectInfo/{ratifyNo}` 接口确定该项目是否存在。
>2. 通过 `while循环` 遍历 `http://output.nsfc.gov.cn/report/{ratifyNo[:2]}/{ratifyNo}_{i}.png` 下载该项目所有PNG，直到请求代码为404（即文件不存在）。
>3. 使用 `img2pdf` 库生成对应PDF文件。

对比来看，核心逻辑基本相同，但是主要是使用`while True`循环，更能完整下载全部内容；此外，对比repo会遍历`range(1,100)`，没有提前退出的逻辑，本项目在请求响应代码为404时就使用break跳出循环，减少服务器压力。

这也也是在整个下载过程中很有意思的一件事情，因为虽然科基网在加载图片形式结题报告时候会有相关的请求，但是请求并没有返回图片一共有多少页，只能通过

-------

使用：

1. 下载并安装Python3以及pip。

2. 下载项目，并安装 Python依赖 （requests,img2pdf）。

   ```bash
   git clone https://github.com/Rhilip/NSFC_conclusion_downloader.git
   cd NSFC_conclusion_downloader
   pip install -r requirements.txt
   ```

3. 在命令窗口执行以下命令，即可下载 对应项目 **批准号** 为 `31270544` 的结题报告，并自动合并成PDF文件。

   ```bash
   python3 nsfc_downloader.py --ratify '31270544'
   
   
   (venv) .\NSFC_conclusion_downloader>python3 nsfc_downloader.py
   usage: nsfc_downloader.py [-h] --ratify RATIFY [--tmp_path TMP_PATH]
                             [--out_path OUT_PATH]
   ```

![image-20200205220726188.png](/images/2020/02/3249796573.png)

## Vue 版开发说明

目前回过头来看，这个写的确实有点异想天开了，可能单独的UserScript在实际使用上更为良好。浏览器CORS策略限制导致以下原因：

1. 无法通过请求 接口 `http://output.nsfc.gov.cn/baseQuery/data/conclusionProjectInfo/{ratifyNo}` 获得项目具体信息。
2. 虽然`<img>`元素可以加载不同源的src，但是`HTMLImageElement`对象并没有直接的办法获取到其加载元素的metadata信息。

这两个最终都在repo中使用无CORS的API接口转发解决了，但使得整个项目偏离了我原先的预期，所以简单开发后就存档了，下面就开发过程做简单说明。也说明了我在前期调查的不够，即虽然对上述第一点有预期，但是完全没有考虑到第二点的情况。

整个项目分成4步，第一步输入项目批准号，并将其绑定在 `App.vue`  上，第二步请求官方（转发）接口，并使用组件 `ratifyInfo.vue` 进行展示，第三步通过`<img>`的onload以及onerror属性确定报告总共有多少页并使用组件 `conclusionImages.vue`进行展示，第四步 组件 `combinePdf.vue` 下载单页PNG图片，并使用jsPDF库进行合并。

整体展示如下：

![FotoJet.png](/images/2020/02/255110392.png)

Vue项目结构如下：

```
src
│  App.vue
│  main.js
│
├─assets
│      logo.jpg
│
└─components
        combinePdf.vue
        conclusionImages.vue
        ratifyInfo.vue
```

下面讲一下在初次进行Vue项目构建中的一些想法和遇到的问题，也算不偏题，顺带希望有Vue，Javascript开发经验的人员加以指导。

1. 主组件以及子组件数据分离以及通信，主组件设置以下data属性：

   - `current` ：用于页面切换。
   - `ratify`, `ratifyData`, `ratifyImageList`：用于记录项目信息，其中 `ratifyData`, `ratifyImageList` 由子组件通过$emit钩子更新，并通过`v-bind`属性传递给子组件。
   - `disable_next`： 通过该值让下一步按钮启用或禁用，子组件同样可以通过钩子更新。

   ratify相关属性均使用$emit钩子更新的原因在于避免如下报错 （[Vue Error: Avoid Mutating a Prop Directly - Michael Thiessen](https://michaelnthiessen.com/avoid-mutating-prop-directly/)）：

   ```
   Error message: Avoid mutating a prop directly since the value will be overwritten whenever the parent component re-renders. Instead, use a data or computed property based on the prop's value.
   ```

2. `ratifyInfo.vue` 使用axois请求早就准备好的无CORS接口`https://cors.rhilip.info/?apiurl=`，并渲染结果。这个子组件问题不大，主要是数据处理以及Vue的Render函数使用。而 接口返回的 `projectType` 字段，也通过内置Map准备好对应关系。

3. `conclusionImages.vue` 这个是我写的过程中觉得**最有意思的**，通过`<img>`标签的`onload`以及`onerror`属性确定报告总共有多少页，并获得图片的相关信息（`src`, `naturalWidth`, `naturalHeight`）。

   ```vue
   <template>
       .....
       <img :alt="index" :src="img" @load="loadNextImage" @error="abortImageLoad" style="max-width: 100%" ref="load_img">
       .....
   </template>
   
   <script>
     export default {
         ....
         methods: {
         loadNextImage () {
           this.imgs.push(`http://output.nsfc.gov.cn/report/${this.ratify_prefix}/${this.ratify}_${this.current}.png`);
         },
         abortImageLoad () {
           this.imgs.pop();
         },
         ....
       },
       ....
     }
   ```
   

4. 如何将已经通过官网加载的image标签的图片，生成pdf是在所有写的过程中最头疼的一个问题。虽然最终使用axois同样通过请求无CORS的转发接口获得图片metadata信息，但是有些过程中的尝试还是值得写一些的：

   1. 直接通过jsPDF的库方法`pdf.addImage`添加图片src，会遇到CORS报错，使得不能添加。

   2. `HTMLImageElement`转成`Buffer`，或者`Blob`，`Uint8Array`等对象，然后喂给jsPDF库。（注意，如果直接通过 `pdf.addImage(HTMLImageElement)`，其实质和第一条一样还是会有XHR请求生成）

      这一步的考虑是因为在`conclusionImages.vue` 组件中，我们可以通过`vm.$refs`方法钩子获得原始的html图片节点。

      但是这样要求生成PDF的步骤在 `conclusionImages.vue` 组件中完成，因为其他组件只能通过通信的信息从主组件中获得原始图片节点信息，此外因为 整体 App 的设计 (`v-if`流程控制)，在进入原定的第四步时，生成的图片节点已经销毁，无法继续访问。

      而转换过程需要`<canvas>`的帮忙，实例代码可以见 [ImageData conversion extensions](https://wicg.github.io/img-conversion/)

      但是同样会遇到CORS报错，因为canvas同样不允许外源引用：

      ```
      Uncaught DOMException: Failed to execute 'toDataURL' on 'HTMLCanvasElement': Tainted canvases may not be exported.
      ```

   （所以，我就是在这一点上试了半天，最终还是放弃了。。）